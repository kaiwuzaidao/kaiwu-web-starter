import { useEffect, useState } from 'react';
import { useIntl } from '@umijs/max';
import { Alert, Button, Card, Space, Typography } from 'antd';
import { useCan } from '@/kaiwu';
import { cancelBooking, createBooking, listBookings, type VisibleSlot } from '@/services/bookings';

export default function Bookings() {
  const intl = useIntl();
  const label = (key: string) => intl.formatMessage({ id: 'booking.' + key });
  const canRead = useCan('equipment:booking:list');
  const canCreate = useCan('equipment:booking:create');
  const canCancel = useCan('equipment:booking:cancel');
  const [date, setDate] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  });
  const [start, setStart] = useState('10:00'),
    [end, setEnd] = useState('11:00');
  const [slots, setSlots] = useState<VisibleSlot[]>([]);
  const [revision, refresh] = useState(0);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setSlots([]);
    if (!canRead || !date) {
      setLoading(false);
      return;
    }
    setLoading(true);
    listBookings(date, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setSlots(data);
      })
      .catch((e: Error) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [date, revision, canRead]);
  async function submit(operation: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await operation();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
      refresh((v) => v + 1);
    }
  }
  if (!canRead) return null;
  return (
    <Card title={label('title')}>
      <Space direction="vertical" size="middle">
        <label>
          {label('date')}{' '}
          <input
            type="date"
            value={date}
            disabled={busy}
            onChange={(e) => {
              setDate(e.target.value);
              setError('');
            }}
          />
        </label>
        {canCreate && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit(() => createBooking({ date, start, end }));
            }}
          >
            <Space wrap>
              <label>
                {label('start')}{' '}
                <input
                  required
                  type="time"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </label>
              <label>
                {label('end')}{' '}
                <input required type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
              </label>
              <Button type="primary" htmlType="submit" disabled={!date || busy || loading}>
                {label('submit')}
              </Button>
            </Space>
          </form>
        )}
        {error && <Alert type="error" role="alert" message={error} />}
        <Button
          onClick={() => {
            setError('');
            refresh((v) => v + 1);
          }}
          disabled={busy}
        >
          {label('refresh')}
        </Button>
        {loading ? (
          <Typography.Text>{label('loading')}</Typography.Text>
        ) : slots.length ? (
          <ul>
            {slots.map((slot) => (
              <li key={slot.start}>
                <Space>
                  {slot.start}–{slot.end}
                  {slot.id && canCancel ? (
                    <Button
                      disabled={busy}
                      onClick={() => void submit(() => cancelBooking(slot.id!))}
                    >
                      {label('cancel')}
                    </Button>
                  ) : (
                    label('occupied')
                  )}
                </Space>
              </li>
            ))}
          </ul>
        ) : (
          !error && <Typography.Text>{label('empty')}</Typography.Text>
        )}
      </Space>
    </Card>
  );
}
