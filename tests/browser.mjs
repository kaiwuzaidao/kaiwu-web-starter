import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { startMock } from './mock-server.mjs';
const server = process.env.KAIWU_DEMO_URL ? undefined : await startMock();
const url = new URL(process.env.KAIWU_DEMO_URL ?? server.url);
assert(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), '请选择本地演示服务');
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.KAIWU_TEST_CHROMIUM });
  const page = await browser.newPage();
  async function choose(name) {
    await page.goto(new URL('/__mock/', url).href);
    await page.getByRole('button', { name }).click();
    await page.getByText('进入采购申请', { exact: true }).click();
  }
  const title = '采购验收 ' + Date.now();
  await choose('申请人 A');
  await page.getByRole('button', { name: '新增申请' }).click();
  await page.getByLabel('标题', { exact: true }).fill(title);
  await page.getByLabel('人民币金额（元）').fill('789.99');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /确\s*定/ })
    .click();
  const row = page.getByRole('row').filter({ hasText: title });
  await row.getByRole('button', { name: /提\s*交/ }).click();
  await row.getByText('待审批').waitFor();
  await choose('审批经理');
  assert.equal(await page.getByRole('button', { name: '新增申请' }).count(), 0);
  await row.getByRole('button', { name: /批\s*准/ }).click();
  await row.getByText('已批准').waitFor();
  await choose('员工 B');
  await page.getByText('员工 B 的草稿').waitFor();
  assert.equal(await row.count(), 0);
  console.log('浏览器三身份创建、提交、批准和数据隔离通过');
} finally {
  await browser?.close();
  server?.stop();
}
