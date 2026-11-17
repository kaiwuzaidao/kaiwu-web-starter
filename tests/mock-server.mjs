import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
export async function startMock() {
  let logs = '';
  const probe = createServer();
  await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  const url = 'http://127.0.0.1:' + port;
  const child = spawn(process.execPath, [require.resolve('@umijs/max/bin/max.js'), 'dev'], {
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', MOCK: '', BROWSER: 'none' },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: process.platform !== 'win32',
  });
  function stop() {
    if (process.platform === 'win32') child.kill();
    else {
      try {
        process.kill(-child.pid, 'SIGTERM');
      } catch (error) {
        if (error.code !== 'ESRCH') throw error;
      }
    }
    child.stdout.destroy();
    child.stderr.destroy();
  }
  for (const stream of [child.stdout, child.stderr])
    stream.on('data', (s) => {
      logs = (logs + s).slice(-8000);
    });
  try {
    const deadline = Date.now() + 120000;
    while (true) {
      if (child.exitCode !== null || Date.now() > deadline) throw Error('本地服务未启动 ' + logs);
      try {
        const panel = await fetch(url + '/__mock/');
        if (
          (await panel.text()).includes('选择演示身份') &&
          panel.headers.get('content-type')?.includes('text/html') &&
          (await fetch(url + '/api/search')).status === 401
        )
          break;
      } catch {}
      await new Promise((r) => setTimeout(r, 400));
    }
    return { url, stop };
  } catch (error) {
    stop();
    throw error;
  }
}
