import { useIntl } from '@umijs/max';
import { useEffect, useState } from 'react';
import {
  App,
  Button,
  Descriptions,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Typography,
} from 'antd';
import { PageContainer } from '@ant-design/pro-components';
import { useCan, useDict } from '@/kaiwu';
import {
  listRequests,
  getRequest,
  saveRequest,
  removeRequest,
  transition,
  type PurchaseRequest,
  type Fields,
} from '@/services/requests';

export default function RequestsPage() {
  const intl = useIntl();
  const t = (key: string) => intl.formatMessage({ id: 'purchase.' + key });
  const { message } = App.useApp();
  const list = useCan('purchase:request:list'),
    save = useCan('purchase:request:save'),
    del = useCan('purchase:request:delete'),
    submit = useCan('purchase:request:submit'),
    approve = useCan('purchase:request:approve'),
    large = useCan('purchase:request:approve-large'),
    reject = useCan('purchase:request:reject');
  const statuses = useDict('purchase.request_status');
  const [page, setPage] = useState(1),
    [status, setStatus] = useState(''),
    [version, reload] = useState(0);
  const [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [data, setData] = useState<{ records: PurchaseRequest[]; total: number }>({
    records: [],
    total: 0,
  });
  const [editing, setEditing] = useState<{ id?: string } | null>(null),
    [detail, setDetail] = useState<PurchaseRequest>();
  const [form] = Form.useForm<Fields>();
  useEffect(() => {
    let active = true;
    if (!list) return;
    setLoading(true);
    setError('');
    listRequests(page, status)
      .then((result) => {
        if (active) {
          setData(result);
          if (page > 1 && !result.records.length)
            setPage(Math.max(1, Math.ceil(result.total / 10)));
        }
      })
      .catch((e) => {
        if (active) setError(String(e.message));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, status, version, list]);
  async function run(action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      reload((v) => v + 1);
    } catch (e) {
      message.error(e instanceof Error ? e.message : t('failed'));
    } finally {
      setBusy(false);
    }
  }
  function edit(row?: PurchaseRequest) {
    form.setFieldsValue({ title: row?.title ?? '', amount: row?.amount ?? '' });
    setEditing({ id: row?.id });
  }
  const label = (value: string) => statuses.find((s) => s.value === value)?.label ?? value;
  return (
    <PageContainer title={t('page')}>
      {list && (
        <Space wrap style={{ marginBottom: 16 }}>
          <Select
            aria-label={t('filter')}
            placeholder={t('all')}
            allowClear
            value={status || undefined}
            options={[...statuses]}
            onChange={(v) => {
              setStatus(v ?? '');
              setPage(1);
            }}
            style={{ minWidth: 140 }}
          />
          {save && (
            <Button type="primary" onClick={() => edit()}>
              {t('create')}
            </Button>
          )}
        </Space>
      )}
      {error && (
        <p role="alert">
          {error} <Button onClick={() => reload((v) => v + 1)}>{t('retry')}</Button>
        </p>
      )}
      <Table<PurchaseRequest>
        rowKey="id"
        loading={loading || busy}
        dataSource={list ? data.records : []}
        scroll={{ x: 680 }}
        pagination={{
          current: page,
          pageSize: 10,
          total: list ? data.total : 0,
          showSizeChanger: false,
          onChange: setPage,
        }}
        columns={[
          {
            title: t('title'),
            dataIndex: 'title',
            render: (_, r) => (
              <Button
                type="link"
                onClick={() => run(async () => setDetail(await getRequest(r.id)))}
              >
                {r.title}
              </Button>
            ),
          },
          { title: t('amount'), dataIndex: 'amount' },
          {
            title: t('status'),
            dataIndex: 'status',
            render: (_, r) => (
              <>
                {label(r.status)}{' '}
                {r.status === 'PENDING' && r.needsEscalation && (
                  <Typography.Text type="secondary">{t('escalated')}</Typography.Text>
                )}
              </>
            ),
          },
          {
            title: t('actions'),
            render: (_, r) => (
              <Space wrap>
                {r.status === 'DRAFT' && save && (
                  <Button onClick={() => edit(r)}>{t('edit')}</Button>
                )}
                {r.status === 'DRAFT' && del && (
                  <Popconfirm
                    title={t('confirmDelete')}
                    onConfirm={() => run(() => removeRequest(r.id))}
                  >
                    <Button danger>{t('delete')}</Button>
                  </Popconfirm>
                )}
                {r.status === 'DRAFT' && submit && (
                  <Button onClick={() => run(() => transition(r.id, 'submit'))}>
                    {t('submit')}
                  </Button>
                )}
                {r.status === 'PENDING' && approve && (!r.needsEscalation || large) && (
                  <Button onClick={() => run(() => transition(r.id, 'approve'))}>
                    {t('approve')}
                  </Button>
                )}
                {r.status === 'PENDING' && reject && (
                  <Popconfirm
                    title={t('confirmReject')}
                    onConfirm={() => run(() => transition(r.id, 'reject'))}
                  >
                    <Button>{t('reject')}</Button>
                  </Popconfirm>
                )}
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title={editing?.id ? t('editTitle') : t('create')}
        open={!!editing}
        onCancel={() => setEditing(null)}
        confirmLoading={busy}
        onOk={() => form.submit()}
        forceRender
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) =>
            run(async () => {
              await saveRequest(values, editing?.id);
              setEditing(null);
            })
          }
        >
          <Form.Item
            label={t('title')}
            name="title"
            rules={[{ required: true, whitespace: true, max: 120 }]}
          >
            <Input maxLength={120} />
          </Form.Item>
          <Form.Item
            label={t('currency')}
            name="amount"
            rules={[
              {
                required: true,
                pattern: /^(?!0(?:\.0{1,2})?$)(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/,
                message: t('amountInvalid'),
              },
            ]}
          >
            <Input inputMode="decimal" />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={t('detail')}
        open={!!detail}
        footer={null}
        onCancel={() => setDetail(undefined)}
      >
        {detail && (
          <Descriptions
            column={1}
            items={[
              { key: 'id', label: t('id'), children: detail.id },
              { key: 'title', label: t('title'), children: detail.title },
              { key: 'amount', label: t('amount'), children: detail.amount },
              { key: 'status', label: t('status'), children: label(detail.status) },
            ]}
          />
        )}
      </Modal>
    </PageContainer>
  );
}
