import { kaiwuRequest } from '@/kaiwu';
export interface Slot {
  date: string;
  start: string;
  end: string;
}
export interface VisibleSlot extends Slot {
  id?: string;
}
const base = '/purchase-desk-api/api/v1/bookings';
export const listBookings = (date: string, signal?: AbortSignal) =>
  kaiwuRequest<VisibleSlot[]>(base + '?date=' + encodeURIComponent(date), { signal });
export const createBooking = (slot: Slot) =>
  kaiwuRequest<VisibleSlot>(base, { method: 'POST', body: JSON.stringify(slot) });
export const cancelBooking = (id: string) =>
  kaiwuRequest<void>(base + '/' + encodeURIComponent(id), { method: 'DELETE' });
