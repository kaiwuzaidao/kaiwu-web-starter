import { signed, ok, fail } from './shared';
type Booking = { id: string; owner: string; date: string; start: string; end: string };
const bookings = new Map<string, Booking>();
let sequence = 0;
export const panelLink: { path: string; label: string } | undefined = undefined;
export function reset() {
  bookings.clear();
}
const base = '/purchase-desk-api/api/v1/bookings';
function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}
function validTime(value: unknown): value is string {
  return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}
const view = ({ id, date, start, end }: Booking, own: boolean) => ({
  date,
  start,
  end,
  ...(own && { id }),
});
export const handlers = {
  ['GET ' + base]: signed((req, res, user) => {
    if (!user.permissions.has('equipment:booking:list')) return fail(res, 403, '无查看权限');
    if (!validDate(req.query.date)) return fail(res, 400, '请选择有效日期');
    return ok(
      res,
      [...bookings.values()]
        .filter((b) => b.date === req.query.date)
        .sort((a, b) => a.start.localeCompare(b.start))
        .map((b) => view(b, b.owner === user.id)),
    );
  }),
  // EQ-01 同一 Mock 进程内检查与写入同步完成。
  ['POST ' + base]: signed((req, res, user) => {
    if (!user.permissions.has('equipment:booking:create')) return fail(res, 403, '无预约权限');
    const { date, start, end } = req.body ?? {};
    if (!validDate(date) || !validTime(start) || !validTime(end) || start >= end)
      return fail(res, 400, '请选择有效日期和起止时间');
    if ([...bookings.values()].some((b) => b.date === date && b.start < end && start < b.end))
      return fail(res, 409, '时段已被占用，请重新选择');
    const id = String(++sequence);
    const booking = { id, owner: user.id, date, start, end };
    bookings.set(id, booking);
    return ok(res, view(booking, true));
  }),
  // EQ-02 详情与取消均按当前会话判断归属。
  ['GET ' + base + '/:id']: signed((req, res, user) => {
    if (!user.permissions.has('equipment:booking:list')) return fail(res, 403, '无查看权限');
    const booking = bookings.get(req.params.id);
    return booking?.owner === user.id ? ok(res, view(booking, true)) : fail(res, 404, '未找到预约');
  }),
  // EQ-03 取消释放时段。
  ['DELETE ' + base + '/:id']: signed((req, res, user) => {
    if (!user.permissions.has('equipment:booking:cancel')) return fail(res, 403, '无取消权限');
    if (bookings.get(req.params.id)?.owner !== user.id) return fail(res, 404, '未找到预约');
    bookings.delete(req.params.id);
    return ok(res);
  }),
};
