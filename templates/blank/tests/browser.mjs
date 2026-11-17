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
  await page.goto(new URL('/__mock/', url).href);
  await page.getByRole('button', { name: '演示成员' }).click();
  await page.getByText('欢迎使用项目工作台').waitFor();
  await page.getByText('项目暂未开放业务功能，请联系项目管理员。').waitFor();
  console.log('空白项目身份选择和首页通过');
} finally {
  await browser?.close();
  server?.stop();
}
