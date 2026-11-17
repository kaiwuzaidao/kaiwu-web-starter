# 设备预约演示

在本仓运行 `pnpm install --frozen-lockfile` 和 `pnpm dev`，打开终端给出的地址，在 `/__mock/` 选择员工甲，进入「设备预约」。用另一个独立浏览器会话选择员工乙。两个人可查看投影仪的忙闲，各自管理自己的预约。演示数据留在当前开发服务内，重启后清空。

产品交接前运行 `pnpm verify:mock`、`pnpm test:scenarios` 和 `pnpm test:browser`，规则和验收场景在 `docs/`。首次使用浏览器测试先运行 `pnpm exec playwright install chromium`。条件具备后用配套 CLI 预览 `project adopt <本仓>`，再应用并领取业务后端。照 `src/services/bookings.ts` 和场景实现服务端授权、事务与持久化，通过 `pnpm dev:real` 联调。
