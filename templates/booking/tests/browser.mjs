import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { startMock } from './mock-server.mjs';
const server = process.env.KAIWU_DEMO_URL ? undefined : await startMock();
const url = new URL(process.env.KAIWU_DEMO_URL ?? server.url);
assert(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname));
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.KAIWU_TEST_CHROMIUM });
  async function enter(name) {
    const page = await browser.newPage();
    await page.goto(new URL('/__mock/', url).href);
    await page.getByRole('button', { name }).click();
    await page.getByText('进入设备预约', { exact: true }).click();
    await page.getByText('当天暂无预约').waitFor();
    return page;
  }
  const a = await enter('员工甲'),
    b = await enter('员工乙');
  await a.getByRole('button', { name: '确认预约' }).click();
  await a.getByRole('button', { name: '取消预约' }).waitFor();
  await a.reload();
  await a.getByRole('button', { name: '取消预约' }).waitFor();
  await b.getByRole('button', { name: '确认预约' }).click();
  await b.getByText('时段已被占用，请重新选择').waitFor();
  await b.getByText('已占用', { exact: true }).waitFor();
  assert.equal(await b.getByRole('button', { name: '取消预约' }).count(), 0);
  await a.getByRole('button', { name: '取消预约' }).click();
  await a.getByText('当天暂无预约').waitFor();
  await b.getByRole('button', { name: '确认预约' }).click();
  await b.getByRole('button', { name: '取消预约' }).waitFor();
  console.log('双人预约、冲突、取消和重新预约通过');
} finally {
  await browser?.close();
  server?.stop();
}
