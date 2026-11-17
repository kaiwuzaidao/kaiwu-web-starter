import { before, after, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { startMock } from './mock-server.mjs';
const { projectCode } = JSON.parse(readFileSync('docs/kaiwu-project-blueprint.json'));
let server;
const cookies = {};
before(async () => {
  server = await startMock();
  for (const role of ['employee-a', 'employee-b']) {
    const res = await fetch(server.url + '/__mock/role', {
      method: 'POST',
      body: new URLSearchParams({ role }),
      redirect: 'manual',
    });
    assert.equal(res.status, 303);
    cookies[role] = res.headers.get('set-cookie').split(';')[0];
  }
});
after(() => server?.stop());
async function call(role, method, path = '', body) {
  const res = await fetch(server.url + '/' + projectCode + '-api/api/v1/bookings' + path, {
    method,
    headers: { cookie: cookies[role] ?? '', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: (await res.json()).data };
}
const a = 'employee-a',
  b = 'employee-b';
const book = (role, date, start = '10:00', end = '11:00') =>
  call(role, 'POST', '', { date, start, end });
it('S01 创建并读取自己的预约', async () => {
  const date = '2030-01-01';
  const result = await book(a, date);
  assert.equal(result.status, 200);
  assert.deepEqual((await call(a, 'GET', '?date=' + date)).data, [result.data]);
  assert.equal((await call('anonymous', 'GET', '?date=' + date)).status, 401);
});
it('S02 相邻时段和无效输入', async () => {
  const date = '2030-01-02';
  assert.equal((await book(a, date)).status, 200);
  assert.equal((await book(b, date, '11:00', '12:00')).status, 200);
  assert.equal((await book(a, date, '12:00', '12:00')).status, 400);
  assert.equal((await book(b, '2030-02-30')).status, 400);
});
it('S03 并发时只有一笔有效预约', async () => {
  const date = '2030-01-03';
  const results = await Promise.all([book(a, date), book(b, date, '10:30', '11:30')]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  assert.equal((await call(a, 'GET', '?date=' + date)).data.length, 1);
});
it('S04 忙闲可见，明细仅本人可见', async () => {
  const date = '2030-01-04';
  const { data } = await book(a, date);
  const path = '/' + data.id;
  assert.deepEqual((await call(b, 'GET', '?date=' + date)).data, [
    { date, start: '10:00', end: '11:00' },
  ]);
  assert.equal((await call(b, 'GET', path)).status, 404);
  assert.equal((await call(b, 'DELETE', path)).status, 404);
  assert.equal((await call(a, 'GET', path)).status, 200);
});
it('S05 取消释放', async () => {
  const date = '2030-01-05';
  const { data } = await book(a, date);
  assert.equal((await call(a, 'DELETE', '/' + data.id)).status, 200);
  assert.equal((await book(b, date)).status, 200);
});
