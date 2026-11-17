import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { startMock } from './mock-server.mjs';
it('可选择演示成员进入项目，未实现的业务接口返回 501', async () => {
  const server = await startMock();
  try {
    const choice = await fetch(server.url + '/__mock/role', {
      method: 'POST',
      body: new URLSearchParams({ role: 'role-member' }),
      redirect: 'manual',
    });
    assert.equal(choice.status, 303);
    const cookie = choice.headers.get('set-cookie').split(';')[0];
    const access = await fetch(server.url + '/api/current/projects/mock-project/access', {
      headers: { cookie },
    });
    assert.equal(access.status, 200);
    assert.deepEqual((await access.json()).data.permissions, []);
    const { projectCode } = JSON.parse(readFileSync('docs/kaiwu-project-blueprint.json'));
    const missing = await fetch(server.url + '/' + projectCode + '-api/unimplemented');
    assert.equal(missing.status, 501);
    assert.equal((await missing.json()).messageKey, 'mock.notImplemented');
  } finally {
    server.stop();
  }
});
