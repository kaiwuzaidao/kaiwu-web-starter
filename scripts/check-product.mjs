import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { frontendPermissions } from './frontend-permissions.mjs';
import { join } from 'node:path';
import { readManifest } from '../mock-support/manifest.cjs';
const read = (p) => readFileSync(p, 'utf8');
function sources(dir, accept = () => true) {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      if (entry.name.startsWith('.')) return [];
      const path = join(dir, entry.name);
      return entry.isDirectory() ? sources(path, accept) : accept(path) ? [read(path)] : [];
    })
    .join('\n');
}
assert.deepEqual(readdirSync('mock'), ['index.ts']);
assert.match(read('mock/index.ts'), /\.\.\.fallback,?\s*};/);
const runtime = sources('src', (p) => /\.tsx?$/.test(p));
assert.doesNotMatch(runtime, /__mock|kaiwu_mock_role|from\s+['"][^'"]*mock-support/);
assert.doesNotMatch(
  sources('src/kaiwu'),
  /from\s+['"](?:antd|@ant-design\/|@\/(?:pages|components|theme)\/)/,
);
assert.match(
  read('src/app.tsx'),
  /export\s*\{\s*rootContainer\s*\}\s*from\s*['"]@\/kaiwu['"]|<ProjectAccessProvider>/,
);
const blueprint = JSON.parse(read('docs/kaiwu-project-blueprint.json'));
const prefixes = new Set(blueprint.modules.map((m) => m.permissionPrefix));
const workflowAdmin = new Set(['workflow:definition:manage', 'workflow:document:manage']);
const menus = new Set(),
  routes = new Set();
function collect(items) {
  for (const item of items) {
    if (item.type === 'BUTTON') {
      assert(
        /^[a-z][a-z0-9-]*:[a-z0-9-]+:[a-z0-9_-]+$/.test(item.permission),
        '无效 BUTTON 权限码 ' + item.permission,
      );
      assert(
        workflowAdmin.has(item.permission) ||
          prefixes.has(item.permission?.split(':').slice(0, 2).join(':')),
        '未登记权限前缀 ' + item.permission,
      );
      assert(!menus.has(item.permission), '重复权限 ' + item.permission);
      menus.add(item.permission);
    }
    if (item.path) routes.add(item.path);
    collect(item.children ?? []);
  }
}
collect(readManifest('menus'));
if (sources('kaiwu', (path) => path.endsWith('/binding.yml')).trim()) {
  for (const code of workflowAdmin) assert(menus.has(code), '流程导入需要声明权限 ' + code);
}
for (const role of readManifest('roles')) {
  for (const p of role.permissions ?? []) assert(menus.has(p), '角色引用未知权限 ' + p);
  for (const path of role.routes ?? []) assert(routes.has(path), '角色引用未知菜单 ' + path);
}
const dicts = new Set(readManifest('dicts').map((d) => d.dictCode));
readManifest('configs');
for (const p of frontendPermissions('src').keys()) {
  if (!/^(access:(member|role)|file:record):/.test(p)) assert(menus.has(p), '清单缺权限 ' + p);
}
for (const [, d] of runtime.matchAll(
  /(?:\b(?:useDict|useManagedDictionary)\(\s*|dictCode=\s*)["']([^"']+)["']/g,
))
  assert(dicts.has(d), '清单缺字典 ' + d);
const rules = read('docs/business-rules.md'),
  scenarios = read('docs/acceptance-scenarios.md'),
  handlers = sources('mock-support') + '\n' + sources('mock'),
  tests = read('tests/scenarios.test.mjs');
const ids = (s, re) => new Set(s.match(re) ?? []);
const ruleIds = ids(rules, /\b[A-Z][A-Z0-9]*-\d+\b/g);
if (blueprint.modules.length) assert(ruleIds.size > 0, '业务模块需要规则');
assert.deepEqual(ids(handlers, /\b[A-Z][A-Z0-9]*-\d+\b/g), ruleIds, 'Mock 与规则编号不一致');
assert.deepEqual(ids(scenarios, /\b[A-Z][A-Z0-9]*-\d+\b/g), ruleIds, '场景与规则编号不一致');
const scenarioIds = ids(scenarios, /\bS\d{2,}\b/g);
if (blueprint.modules.length || ruleIds.size) assert(scenarioIds.size > 0, '业务规则需要验收场景');
assert.deepEqual(
  new Set([...tests.matchAll(/\bit\(\s*['"](S\d{2,})\b/g)].map((m) => m[1])),
  scenarioIds,
  '验收文档与可执行场景不一致',
);
