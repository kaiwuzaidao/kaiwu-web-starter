import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';

const { projectCode } = JSON.parse(readFileSync('docs/kaiwu-project-blueprint.json'));
async function portOf(server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return server.address().port;
}
const realGateway = process.env.KAIWU_GATEWAY;
const echo =
  !realGateway &&
  createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ path: req.url, identity: req.headers['x-project-id'] }));
  });
const gatewayUrl = realGateway || 'http://127.0.0.1:' + (await portOf(echo));
const probe = createServer(),
  port = await portOf(probe);
await new Promise((resolve) => probe.close(resolve));
const child = spawn(process.execPath, ['scripts/dev-real.cjs'], {
  env: {
    ...process.env,
    HOST: '127.0.0.1',
    BROWSER: 'none',
    PORT: String(port),
    KAIWU_GATEWAY: gatewayUrl,
  },
  stdio: 'ignore',
  detached: process.platform !== 'win32',
});
const base = 'http://127.0.0.1:' + port;
async function get(origin, path) {
  const response = await fetch(new URL(path, origin), {
    headers: { 'x-project-id': 'test-project' },
    signal: AbortSignal.timeout(4000),
  });
  const { timestamp, requestId, ...body } = await response.json();
  return { status: response.status, body };
}
try {
  const paths = [
    '/api/auth/me',
    '/' + projectCode + '-api/probe',
    '/' + projectCode + '-svc/workflow/probe',
  ];
  if (realGateway) paths.unshift('/api/public/i18n/catalog?locale=zh-CN');
  for (const path of paths) {
    const direct = realGateway
      ? await get(gatewayUrl, path)
      : { status: 200, body: { path, identity: 'test-project' } };
    if (realGateway && path.startsWith('/api/public/')) {
      assert.equal(direct.status, 200);
      assert.equal(direct.body.data?.locale, 'zh-CN');
    }
    if (realGateway && path === '/api/auth/me') {
      assert.equal(direct.status, 401, '真实 Gateway 应拒绝匿名读取当前用户');
      assert.equal(direct.body.messageKey, 'gateway.authenticationRequired');
    }
    if (realGateway) assert(direct.status < 500, '真实 Gateway 上游不可用');
    let actual;
    for (let attempt = 0; attempt < 200; attempt++) {
      if (child.exitCode !== null) throw Error('联调服务提前退出');
      try {
        actual = await get(base, path);
        break;
      } catch {
        await delay(250);
      }
    }
    assert.deepEqual(actual, direct, path);
    console.log(path, actual.status);
  }
  assert(!(await (await fetch(base + '/__mock/')).text()).includes('选择演示身份'));
  console.log(
    realGateway
      ? '真实 Gateway 与 dev:real 三类路由响应一致，身份面板已禁用。'
      : '回显网关验证三类路由与项目头转发，身份面板已禁用。',
  );
} finally {
  if (child.exitCode === null) {
    if (process.platform === 'win32') child.kill();
    else process.kill(-child.pid, 'SIGTERM');
  }
  if (echo) {
    echo.closeAllConnections();
    echo.close();
  }
}
