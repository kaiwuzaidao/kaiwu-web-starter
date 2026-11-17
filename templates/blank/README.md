# 业务前端

运行 `pnpm install --frozen-lockfile` 和 `pnpm dev`，打开开发服务器的 `/__mock/` 选择演示成员。首页和平台能力已就绪。

增加业务模块时，同步维护 `src/business/modules.ts`、页面、service、`mock-support/business.ts`、`kaiwu/*.yml`、蓝图、业务规则及验收场景。产品阶段运行 `pnpm verify:mock`、`pnpm test:scenarios` 和 `pnpm test:browser`。

产品在 product 分支迭代。定稿后从确认的提交发起 handoff 合并请求，开发使用 Kaiwu CLI 的 `project adopt <前端仓> [--apply]` 纳管。联调运行 `pnpm dev:real`，通过 Gateway 接入真实接口。

后端接手后，在前后端并排的目录结构中运行 `pnpm verify` 核对接口权限。
