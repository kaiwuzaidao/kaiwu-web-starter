import { readFileSync } from 'node:fs';
import { safeLoad, JSON_SCHEMA } from 'js-yaml';
import type { PurchaseRequest, Fields } from '../src/services/requests';
import { signed, ok, fail, escapeHtml, type Actor, type Request, type Response } from './shared';
type Row = Omit<PurchaseRequest, 'needsEscalation'>;
const rows = new Map<string, Row>();
let seq = 0;
const prefix = 'purchase:request:';
const root = '/purchase-desk-api/api/v1/requests';
function cents(amount: string) {
  const [whole, fraction = ''] = amount.split('.');
  return BigInt(whole + fraction.padEnd(2, '0'));
}
function validAmount(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/.test(value) &&
    cents(value) > BigInt(0)
  );
}
interface ApprovalPolicy {
  approverRoles: string[];
  escalationRoles: string[];
  threshold?: string;
}
function binding(): ApprovalPolicy {
  const flow = safeLoad(readFileSync('kaiwu/workflows/purchase_request/binding.yml', 'utf8'), {
    schema: JSON_SCHEMA,
  });
  const params = flow?.params;
  const validRoles = (roles: unknown): roles is string[] =>
    Array.isArray(roles) &&
    roles.length > 0 &&
    roles.every((r) => typeof r === 'string' && /^[a-z][a-z0-9-]{1,63}$/.test(r));
  if (
    !validRoles(params?.approverRoles) ||
    !['single', 'serial', 'amount-tiered'].includes(flow.pattern) ||
    (flow.pattern !== 'serial' && params.approverRoles.length !== 1)
  )
    throw Error('采购审批参数无效');
  const tiered = flow.pattern === 'amount-tiered';
  if (
    tiered &&
    (params.amountField !== 'amount' ||
      !/^(0|[1-9][0-9]{0,9})(\.[0-9]{1,2})?$/.test(params.threshold) ||
      typeof params.threshold !== 'string' ||
      !validRoles(params.escalationRoles))
  )
    throw Error('金额分级参数无效');
  const policy = {
    approverRoles: params.approverRoles,
    escalationRoles: tiered ? (params.escalationRoles as string[]) : [],
    threshold: tiered ? (params.threshold as string) : undefined,
  };
  if (policy.approverRoles.length + policy.escalationRoles.length > 5) throw Error('最多五级审批');
  return policy;
}
const tasks = new Map<string, { roles: string[]; stage: number; escalated: boolean }>();
function enqueue(row: Row, policy: ApprovalPolicy) {
  const escalated = policy.threshold !== undefined && cents(row.amount) > cents(policy.threshold);
  tasks.set(row.id, {
    roles: [...policy.approverRoles, ...(escalated ? policy.escalationRoles : [])],
    stage: 0,
    escalated,
  });
}
function view(row: Row, policy?: ApprovalPolicy): PurchaseRequest {
  const task = tasks.get(row.id);
  if (task) return { ...row, needsEscalation: task.escalated };
  const threshold = (policy ?? binding()).threshold;
  return {
    ...row,
    needsEscalation: threshold !== undefined && cents(row.amount) > cents(threshold),
  };
}
function add(fields: Fields, ownerId: string, status: Row['status'] = 'DRAFT', policy = binding()) {
  const id = '9000000000000' + String(++seq).padStart(6, '0');
  const row = { ...fields, id, ownerId, status };
  if (status === 'PENDING') enqueue(row, policy);
  rows.set(id, row);
  return row;
}
export function reset() {
  const policy = binding();
  rows.clear();
  tasks.clear();
  seq = 0;
  for (let i = 0; i < 12; i++)
    add(
      { title: '办公用品申请 ' + (i + 1), amount: '500.00' },
      '10001',
      i < 10 ? 'PENDING' : 'DRAFT',
      policy,
    );
  for (const amount of ['50000.00', '80000.00', '100000.00', '120000.00'])
    add({ title: '设备采购 ' + amount, amount }, '10001', 'PENDING', policy);
  add({ title: '员工 B 的草稿', amount: '32.50' }, '10002');
}
reset();
function canRead(user: Actor, row: Row, policy = binding()) {
  // PR-04 员工只读本人；审批角色可见全项目。
  return (
    row.ownerId === user.id ||
    [
      ...policy.approverRoles,
      ...policy.escalationRoles,
      ...(tasks.get(row.id)?.roles ?? []),
    ].includes(user.role)
  );
}
function fields(req: Request): Fields | undefined {
  const title = req.body?.title;
  const amount = req.body?.amount;
  if (
    typeof title !== 'string' ||
    !title.trim() ||
    title.trim().length > 120 ||
    !validAmount(amount)
  )
    return;
  return { title: title.trim(), amount };
}
function record(
  action: string,
  handler: (row: Row, req: Request, res: Response, user: Actor) => unknown,
) {
  return signed((req, res, user) => {
    const row = rows.get(req.params.id);
    if (!row || !canRead(user, row)) return fail(res, 404, '申请不存在');
    if (!user.permissions.has(prefix + action)) return fail(res, 403, '没有操作权限');
    return handler(row, req, res, user);
  });
}
function draft(row: Row, res: Response, user: Actor) {
  // PR-01 / PR-02 仅本人草稿可修改、删除或提交。
  if (row.ownerId !== user.id) {
    fail(res, 403, '只能操作自己的申请');
    return false;
  }
  if (row.status !== 'DRAFT') {
    fail(res, 409, '仅草稿可执行此操作');
    return false;
  }
  return true;
}
function complete(
  row: Row,
  user: Actor,
  res: Response,
  action: 'approve' | 'reject',
  panel = false,
) {
  // PR-05 / PR-06 逐级处理当前候选角色的待办，禁止自审与重复处理。
  if (row.ownerId === user.id || !user.permissions.has(prefix + action))
    return fail(res, 403, '不能审批这条申请');
  if (row.status !== 'PENDING') return fail(res, 409, '申请当前不在审批中');
  const task = tasks.get(row.id);
  if (!task || task.roles[task.stage] !== user.role)
    return fail(res, 403, '当前节点未分配给该角色');
  // PR-03 业务页面不允许经理直接批准大额单。审批台可以完成自己的节点，交给下一位审批人。
  if (
    action === 'approve' &&
    !panel &&
    task.escalated &&
    !user.permissions.has(prefix + 'approve-large')
  )
    return fail(res, 403, '需要总经理审批');
  if (action === 'reject') row.status = 'REJECTED';
  else if (++task.stage === task.roles.length) row.status = 'APPROVED';
  return panel ? res.redirect(303, '/__mock/approvals') : ok(res, view(row));
}
export const approvals = {
  'GET /__mock/approvals': signed((_req, res, user) => {
    const items = [...rows.values()]
      .filter((row) => {
        const task = tasks.get(row.id);
        return (
          row.status === 'PENDING' &&
          row.ownerId !== user.id &&
          task?.roles[task.stage] === user.role
        );
      })
      .map(
        (row) =>
          '<li>' +
          escapeHtml(row.title) +
          '，' +
          escapeHtml(row.amount) +
          ' 元<form method="post" action="/__mock/approvals/' +
          row.id +
          '">' +
          (user.permissions.has(prefix + 'approve')
            ? '<button name="action" value="approve">同意本级</button>'
            : '') +
          (user.permissions.has(prefix + 'reject')
            ? '<button name="action" value="reject">驳回</button>'
            : '') +
          '</form></li>',
      );
    return res
      .type('html')
      .send(
        '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>演示审批台</title><h1>演示审批台</h1><p>' +
          escapeHtml(user.name) +
          '</p>' +
          (items.length ? '<ul>' + items.join('') + '</ul>' : '<p>没有待办</p>') +
          '<a href="/__mock/">切换身份</a></html>',
      );
  }),
  'POST /__mock/approvals/:id': signed((req, res, user) => {
    const action = req.body?.action,
      row = rows.get(req.params.id);
    if (!row || !canRead(user, row)) return fail(res, 404, '申请不存在');
    if (action !== 'reject' && action !== 'approve') return fail(res, 400, '审批动作无效');
    return complete(row, user, res, action, true);
  }),
};
export const requests = {
  ['GET ' + root]: signed((req, res, user) => {
    if (!user.permissions.has(prefix + 'list')) return fail(res, 403, '没有查看权限');
    const page = Number(req.query.current ?? 1),
      size = Number(req.query.size ?? 10);
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      !Number.isSafeInteger(size) ||
      size < 1 ||
      size > 100
    )
      return fail(res, 400, '分页参数无效');
    const policy = binding();
    const filtered = [...rows.values()]
      .reverse()
      .filter(
        (row) =>
          canRead(user, row, policy) && (!req.query.status || req.query.status === row.status),
      );

    return ok(res, {
      records: filtered.slice((page - 1) * size, page * size).map((row) => view(row, policy)),
      total: filtered.length,
    });
  }),
  ['GET ' + root + '/:id']: record('list', (row, _req, res) => ok(res, view(row))),
  ['POST ' + root]: signed((req, res, user) => {
    if (!user.permissions.has(prefix + 'save')) return fail(res, 403, '没有新增权限');
    const data = fields(req);
    return data
      ? ok(res, view(add(data, user.id)))
      : fail(res, 400, '请填写标题和有效人民币金额（最多两位小数）');
  }),
  ['PUT ' + root + '/:id']: record('save', (row, req, res, user) => {
    if (!draft(row, res, user)) return;
    const data = fields(req);
    if (!data) return fail(res, 400, '标题或金额无效');
    Object.assign(row, data);
    return ok(res, view(row));
  }),
  ['DELETE ' + root + '/:id']: record('delete', (row, _req, res, user) => {
    if (draft(row, res, user)) {
      rows.delete(row.id);
      return ok(res);
    }
  }),
  ['POST ' + root + '/:id/submit']: record('submit', (row, _req, res, user) => {
    if (draft(row, res, user)) {
      enqueue(row, binding());
      row.status = 'PENDING';
      return ok(res, view(row));
    }
  }),
  ['POST ' + root + '/:id/approve']: record('approve', (row, _req, res, user) =>
    complete(row, user, res, 'approve'),
  ),
  ['POST ' + root + '/:id/reject']: record('reject', (row, _req, res, user) =>
    complete(row, user, res, 'reject'),
  ),
};
