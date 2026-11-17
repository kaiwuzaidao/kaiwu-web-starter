import { before, after, it } from 'node:test';
import assert from 'node:assert/strict';
import { startMock } from './mock-server.mjs';
import { readFileSync } from 'node:fs';
const code = JSON.parse(readFileSync('docs/kaiwu-project-blueprint.json')).projectCode;
let server, url;
const base = '/' + code + '-api/api/v1/requests';
const cookies = {};
async function call(role, path = '', method = 'GET', body) {
  const res = await fetch(url + base + path, {
    method,
    headers: { cookie: cookies[role], 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: (await res.json()).data };
}
async function add(amount = '50000.00') {
  const r = await call('a', '', 'POST', { title: '验收用采购单', amount });
  assert.equal(r.status, 200);
  return r.data.id;
}
async function pending(amount) {
  const id = await add(amount);
  assert.equal((await call('a', '/' + id + '/submit', 'POST')).status, 200);
  return id;
}
before(async () => {
  server = await startMock();
  url = server.url;
  for (const [key, role] of Object.entries({
    a: 'applicant-a',
    b: 'employee-b',
    m: 'manager-m',
    d: 'director',
  })) {
    const res = await fetch(url + '/__mock/role', {
      method: 'POST',
      body: new URLSearchParams({ role }),
      redirect: 'manual',
    });
    assert.equal(res.status, 303);
    cookies[key] = res.headers.get('set-cookie').split(';')[0];
  }
});
after(() => server?.stop());
it('S01 新增、编辑、提交', async () => {
  const id = await add();
  assert.equal(
    (await call('a', '/' + id, 'PUT', { title: '更新', amount: '55000.00' })).data.title,
    '更新',
  );
  assert.equal((await call('a', '/' + id + '/submit', 'POST')).data.status, 'PENDING');
  assert.equal((await call('a', '/' + id)).data.amount, '55000.00');
});
it('S02 提交后禁止编辑删除', async () => {
  const id = await pending('30.00');
  for (const method of ['PUT', 'DELETE'])
    assert.equal((await call('a', '/' + id, method, { title: '更新', amount: '1' })).status, 409);
});
it('S03 审批金额边界与重复操作', async () => {
  for (const [amount, status] of [
    ['50000.00', 200],
    ['100000.00', 200],
    ['100000.01', 403],
  ]) {
    const id = await pending(amount);
    assert.equal((await call('m', '/' + id + '/approve', 'POST')).status, status);
    assert.equal((await call('m', '/' + id)).data.status, status === 403 ? 'PENDING' : 'APPROVED');
    if (status === 403)
      assert.equal((await call('m', '/' + id + '/reject', 'POST')).data.status, 'REJECTED');
    else assert.equal((await call('m', '/' + id + '/approve', 'POST')).status, 409);
  }
});
it('S04 隔离员工数据并拒绝直接审批', async () => {
  const id = await add();
  for (const [path, method] of [
    ['', 'GET'],
    ['', 'PUT'],
    ['', 'DELETE'],
    ['/submit', 'POST'],
  ])
    assert.equal((await call('b', '/' + id + path, method)).status, 404);
  assert(!(await call('b')).data.records.some((r) => r.id === id));
  assert.equal((await call('m', '/' + id + '/submit', 'POST')).status, 403);
  const submitted = await pending('23');
  for (const action of ['approve', 'reject'])
    assert.equal((await call('a', '/' + submitted + '/' + action, 'POST')).status, 403);
});
it('S05 删除、筛选与翻页', async () => {
  const id = await add();
  assert.equal((await call('a', '/' + id, 'DELETE')).status, 200);
  assert.equal((await call('a', '/' + id)).status, 404);
  const first = (await call('a', '?status=PENDING&current=1&size=10')).data;
  const next = (await call('a', '?status=PENDING&current=2&size=10')).data;
  assert.equal(first.records.length, 10);
  assert(next.records.length);
  assert.equal(first.total, next.total);
  assert(first.records.every((row) => row.status === 'PENDING'));
  assert(next.records.every((row) => !first.records.some((r) => r.id === row.id)));
});
it('未实现接口隔离与退出', async () => {
  for (const prefix of ['/api', '/' + code + '-api', '/' + code + '-svc']) {
    for (const suffix of ['', '/', '/missing']) {
      const res = await fetch(url + prefix + suffix);
      assert.equal(res.status, 501);
      assert.equal((await res.json()).messageKey, 'mock.notImplemented');
    }
  }
  const res = await fetch(url + '/api/auth/logout', {
    method: 'POST',
    headers: { cookie: cookies.a },
  });
  assert.match(res.headers.get('set-cookie'), /kaiwu_mock_role=;/);
});

it('S06 金额分级审批台逐级回写同一单据', async () => {
  const id = await pending('100000.01');
  const approve = async (key) =>
    (
      await fetch(url + '/__mock/approvals/' + id, {
        method: 'POST',
        headers: { cookie: cookies[key] },
        body: new URLSearchParams({ action: 'approve' }),
        redirect: 'manual',
      })
    ).status;
  assert.equal(await approve('d'), 403);
  assert.equal(await approve('m'), 303);
  assert.equal((await call('a', '/' + id)).data.status, 'PENDING');
  assert.equal(await approve('m'), 403);
  assert.equal(await approve('d'), 303);
  assert.equal((await call('a', '/' + id)).data.status, 'APPROVED');
});
