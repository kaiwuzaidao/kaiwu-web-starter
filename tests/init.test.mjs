import { it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

function run(cwd, script, args = [], error, env = process.env) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8', env });
  const output = result.stderr + result.stdout;
  if (error) {
    assert.notEqual(result.status, 0, output);
    assert.match(output, error);
  } else assert.equal(result.status, 0, output);
}

it('初始化默认空白、按需采购，两种项目的权限和规则门禁均可执行', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'kaiwu-init-'));
  try {
    for (const example of [false, true]) {
      const dest = join(tmp, example ? 'sample' : 'blank');
      run(
        process.cwd(),
        'scripts/kaiwu-init.mjs',
        [
          '--code',
          'inventory',
          '--name',
          '库存管理',
          '--dir',
          dest,
          ...(example ? ['--example', 'purchase'] : []),
        ],
        undefined,
        {
          ...process.env,
          GIT_AUTHOR_NAME: 'Product Tester',
          GIT_AUTHOR_EMAIL: 'tester@example.org',
          GIT_COMMITTER_NAME: 'Product Tester',
          GIT_COMMITTER_EMAIL: 'tester@example.org',
        },
      );
      assert.equal(
        spawnSync('git', ['log', '-1', '--format=%an <%ae>'], {
          cwd: dest,
          encoding: 'utf8',
        }).stdout.trim(),
        'Product Tester <tester@example.org>',
      );
      symlinkSync(resolve('node_modules'), join(dest, 'node_modules'), 'junction');
      const read = (path) => readFileSync(join(dest, path), 'utf8');
      const write = (path, content) => writeFileSync(join(dest, path), content);
      const bp = JSON.parse(read('docs/kaiwu-project-blueprint.json'));
      assert.equal(bp.projectCode, 'inventory');
      assert.ok(bp.adoptionId);
      assert.equal(bp.modules.length, example ? 1 : 0);
      for (const path of [
        'src/pages/Requests',
        'src/services/requests.ts',
        'mock-support/requests.ts',
        'kaiwu/workflows/purchase_request',
      ])
        assert.equal(existsSync(join(dest, path)), example, path);
      assert.equal(existsSync(join(dest, 'templates')), false);
      run(dest, 'scripts/check-product.mjs');
      if (example) {
        const menus = read('kaiwu/menus.yml');
        for (const perm of ['workflow:definition:manage', 'workflow:document:manage']) {
          assert.ok(menus.includes(perm));
          assert.ok(!read('kaiwu/roles.yml').includes(perm));
          write('kaiwu/menus.yml', menus.replace(perm, 'purchase:request:unused'));
          run(dest, 'scripts/check-product.mjs', [], /流程导入需要声明权限/);
        }
        write('kaiwu/menus.yml', menus);
        write('src/business/probe.tsx', "permissions.has('purchase:request:unknown')");
        for (const check of ['check-permission-consistency', 'check-product'])
          run(dest, 'scripts/' + check + '.mjs', [], /purchase:request:unknown/);
        continue;
      }
      for (const p of [
        'kaiwu/menus.yml',
        'kaiwu/roles.yml',
        'kaiwu/dicts.yml',
        'src/business/modules.ts',
        'src/business/messages.ts',
        'mock-support/personas.ts',
        'docs/business-rules.md',
        'README.md',
      ])
        assert.doesNotMatch(read(p), /采购|purchase|\/requests/);
      const fixture = 'src/business/probe.tsx';
      for (const bad of [
        "permissions.has('wrong:item:list')",
        "permissions.includes('wrong:item:list')",
        "useCan('wrong:item:list')",
        "hasPermission('wrong:item:list')",
        '<Can permission={"wrong:item:list"} />',
        'useCan()',
      ]) {
        write(fixture, bad);
        const problem = bad === 'useCan()' ? /useCan 必须传入/ : /wrong:item:list/;
        for (const check of ['check-permission-consistency', 'check-product'])
          run(dest, 'scripts/' + check + '.mjs', [], problem);
      }
      write(fixture, "import {useCan} from '../kaiwu/index';");
      run(dest, 'scripts/check-kaiwu-sdk.mjs', [], /通过 @\/kaiwu/);
      write(fixture, '');
      bp.modules = [{ moduleCode: 'items', permissionPrefix: 'stock:item' }];
      write('docs/kaiwu-project-blueprint.json', JSON.stringify(bp));
      run(dest, 'scripts/check-product.mjs', [], /业务模块需要规则/);
      write('docs/business-rules.md', 'INV-01 库存不能为负');
      write('mock-support/business.ts', read('mock-support/business.ts') + '\n// INV-01\n');
      write('docs/acceptance-scenarios.md', 'S01 负库存操作被拒绝 INV-01');
      run(dest, 'scripts/check-product.mjs', [], /可执行场景不一致/);
      write(
        'tests/scenarios.test.mjs',
        "import {it} from 'node:test';\nit('S01 拒绝负库存',()=>{});\n",
      );
      run(dest, 'scripts/check-product.mjs');
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

it('设备预约示例沿用调用方项目编码，独立于空白与历史项目', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'kaiwu-booking-'));
  try {
    const dest = join(tmp, 'studio-web');
    run(
      process.cwd(),
      'scripts/kaiwu-init.mjs',
      ['--example', 'booking', '--code', 'studio', '--name', '工作室', '--dir', dest],
      undefined,
      {
        ...process.env,
        GIT_AUTHOR_NAME: 'CI',
        GIT_AUTHOR_EMAIL: 'ci@example.org',
        GIT_COMMITTER_NAME: 'CI',
        GIT_COMMITTER_EMAIL: 'ci@example.org',
      },
    );
    const read = (file) => readFileSync(join(dest, file), 'utf8');
    const blueprint = JSON.parse(read('docs/kaiwu-project-blueprint.json'));
    assert.equal(blueprint.projectName, '工作室');
    assert.equal(blueprint.projectCode, 'studio');
    assert.equal(blueprint.modules[0].permissionPrefix, 'equipment:booking');
    assert.ok(blueprint.adoptionId);
    for (const file of ['mock-support/business.ts', 'src/services/bookings.ts']) {
      assert.match(read(file), /\/studio-api\/api\/v1\/bookings/);
    }
    assert.equal(existsSync(join(dest, 'src/pages/Requests')), false);
    symlinkSync(resolve('node_modules'), join(dest, 'node_modules'), 'junction');
    run(dest, 'scripts/check-product.mjs');
    run(dest, 'scripts/check-permission-consistency.mjs');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
