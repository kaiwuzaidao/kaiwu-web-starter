import { randomUUID } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync, rmSync } from 'node:fs';
import { resolve, dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const {
  values: { code, name, dir, example },
} = parseArgs({
  options: {
    code: { type: 'string' },
    name: { type: 'string' },
    dir: { type: 'string' },
    example: { type: 'string' },
  },
});
if (
  !existsSync(join(root, '.kaiwu-starter')) ||
  !/^[a-z][a-z0-9-]{1,63}$/.test(code ?? '') ||
  code === 'system' ||
  (example !== undefined && !['booking', 'purchase'].includes(example)) ||
  !name?.trim() ||
  name.length > 100 ||
  /[\x00-\x1f]/.test(name)
)
  throw Error(
    '用法：node scripts/kaiwu-init.mjs --code 项目编码 --name 项目名称 [--dir 新目录] [--example booking]',
  );
const target = resolve(dir ?? join(root, '..', code + '-web'));
if (!relative(root, target).startsWith('..' + sep) || existsSync(target))
  throw Error('目标必须是起步仓以外的新目录：' + target);
const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);
const legacy = example === 'purchase';
const booking = example === 'booking';
const bookingPrefix = 'templates/booking/';
const outputFiles = new Set(files.filter((file) => !file.startsWith('templates/')));
if (booking) {
  for (const file of files.filter((file) => file.startsWith(bookingPrefix))) {
    outputFiles.add(file.slice(bookingPrefix.length));
  }
}
const port =
  8400 +
  (((Array.from(code).reduce((hash, ch) => (31 * hash + ch.charCodeAt(0)) | 0, 0) % 100) + 100) %
    100);
const exampleFiles = new Set(['src/services/requests.ts', 'mock-support/requests.ts']);
mkdirSync(target);
try {
  for (const file of outputFiles) {
    if (['.kaiwu-starter', 'scripts/kaiwu-init.mjs', 'tests/init.test.mjs'].includes(file))
      continue;
    if (
      !legacy &&
      (exampleFiles.has(file) ||
        file.startsWith('src/pages/Requests/') ||
        file.startsWith('kaiwu/workflows/purchase_request/'))
    )
      continue;
    const overlay = join(root, 'templates/blank', file);
    const bookingFile = join(root, bookingPrefix, file);
    const source =
      booking && existsSync(bookingFile)
        ? bookingFile
        : !legacy && existsSync(overlay)
          ? overlay
          : join(root, file);
    const dest = join(target, file);
    mkdirSync(dirname(dest), { recursive: true });
    let data = readFileSync(source, 'utf8');
    if (file === 'docs/kaiwu-project-blueprint.json') {
      const blueprint = JSON.parse(data);
      Object.assign(blueprint, {
        projectName: name,
        projectCode: code,
        projectId: '',
        adoptionId: randomUUID(),
        ...(!example && { modules: [], designSummary: '' }),
      });
      data = JSON.stringify(blueprint, null, 2) + '\n';
    } else if (file === 'README.md' && legacy) {
      data = readFileSync(join(root, 'templates/legacy/README.md'), 'utf8');
    } else if (file === 'kaiwu/configs.yml') {
      data = data.replace('采购工作台', () => JSON.stringify(name));
    } else if (file !== 'pnpm-lock.yaml') {
      data = data.replaceAll('purchase-desk', code);
      if (
        file === 'scripts/dev.sh' ||
        file === 'scripts/dev-real.cjs' ||
        file.startsWith('deploy/server/')
      )
        data = data.replaceAll('8498', String(port));
    }
    writeFileSync(dest, data, { mode: statSync(source).mode & 0o777 });
  }
  execFileSync('git', ['init', '-q', '-b', 'product'], { cwd: target });
  execFileSync('git', ['add', '-A'], { cwd: target });
  // 把起步仓的有效 Git 身份带入独立的新仓；环境中显式指定的 author/committer 仍由 Git 优先处理。
  for (const key of ['user.name', 'user.email']) {
    const configured = spawnSync('git', ['config', '--get', key], { cwd: root, encoding: 'utf8' });
    if (configured.status === 0)
      execFileSync('git', ['config', '--local', key, configured.stdout.trim()], { cwd: target });
  }
  try {
    execFileSync('git', ['commit', '-qm', '初始化业务前端'], { cwd: target });
  } catch (cause) {
    throw new Error('初始化提交失败。请核对 Git 的 user.name、user.email 和提交错误后重试。', {
      cause,
    });
  }
  for (const branch of ['dev', 'main']) execFileSync('git', ['branch', branch], { cwd: target });
} catch (error) {
  rmSync(target, { recursive: true, force: true });
  throw error;
}
console.log(
  '已创建业务前端：' +
    target +
    '\n在新目录执行 pnpm install --frozen-lockfile && pnpm dev，浏览器打开 /__mock/。',
);
