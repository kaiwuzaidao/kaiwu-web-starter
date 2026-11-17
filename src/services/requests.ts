import { kaiwuRequest } from '@/kaiwu';
/**
 * 基础路径为本项目 API 前缀下的 /api/v1/requests。ID 全程按字符串传输。
 * GET / 接受 current、size、status，按创建倒序返回可见记录和总数。
 * GET /:id 返回详情。POST / 与 PUT /:id 接受 Fields，返回保存后的单据。
 * DELETE /:id 删除草稿。POST /:id/{submit,approve,reject} 返回流转后的单据。
 * 金额为人民币元字符串，最多两位小数。400 表示输入无效，403 表示无权操作，
 * 404 表示记录不可见，409 表示状态已变化。拒绝场景见 docs/acceptance-scenarios.md。
 */
export interface PurchaseRequest {
  id: string;
  title: string;
  amount: string;
  ownerId: string;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
  needsEscalation: boolean;
}
export type Fields = Pick<PurchaseRequest, 'title' | 'amount'>;
const base = '/purchase-desk-api/api/v1/requests';
export function listRequests(page: number, status: string) {
  return kaiwuRequest<{ records: PurchaseRequest[]; total: number }>(
    base + '?' + new URLSearchParams({ current: String(page), size: '10', status }),
  );
}
export function getRequest(id: string) {
  return kaiwuRequest<PurchaseRequest>(base + '/' + encodeURIComponent(id));
}
export function saveRequest(data: Fields, id?: string) {
  return kaiwuRequest<PurchaseRequest>(id ? base + '/' + encodeURIComponent(id) : base, {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(data),
  });
}
export function removeRequest(id: string) {
  return kaiwuRequest<void>(base + '/' + encodeURIComponent(id), { method: 'DELETE' });
}
export function transition(id: string, action: 'submit' | 'approve' | 'reject') {
  return kaiwuRequest<PurchaseRequest>(base + '/' + encodeURIComponent(id) + '/' + action, {
    method: 'POST',
  });
}
