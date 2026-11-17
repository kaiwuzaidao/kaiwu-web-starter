import { approvals, requests } from './requests';
export { reset } from './requests';
export const handlers = { ...requests, ...approvals };
export const panelLink = { path: '/__mock/approvals', label: '进入当前身份的审批台' };
