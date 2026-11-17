# Kaiwu 产品前端

产品在独立业务仓里用一句需求驱动自己的 AI 编程工具，先做能点击的 Mock，确认后把同一次提交交给后端。需要 Git、Node 22、pnpm 10。首次建仓前用 `git var GIT_AUTHOR_IDENT` 检查本机提交身份。

## 新建业务前端

在本仓打开 AI 工具，输入“做一个设备预约前端，让员工能看到投影仪的忙闲并预约时段，交付能操作的本地地址”。AI 默认从空白项目开始，实现页面、Mock、权限与可执行场景。

想先试用现成的双人预约演示，可直接执行：

```sh
node scripts/kaiwu-init.mjs --code equipment-booking --name 设备预约 --example booking
cd ../equipment-booking-web
pnpm install --frozen-lockfile
pnpm dev
```

打开终端给出的地址，访问 `/__mock/`，选择员工甲。在另一个独立浏览器会话选择员工乙。预约同一时段时一人成功，另一人看到冲突提示；甲取消后，乙可以重订。刷新页面保留数据，重启 Mock 服务恢复初始状态。自建业务时省略 `--example booking`。

## 联调及移交

- `pnpm dev:real` 同时把 `/api`、业务 API 和服务路由代理到 Gateway。默认目标为 `http://127.0.0.1:8088`，可用 `KAIWU_GATEWAY` 覆盖。使用真实项目 ID；从同源平台工作台进入以传递会话。开发者独立调试可使用现有会话桥的一次性内存引导令牌。
- 产品维护 `kaiwu/*.yml`、业务规则、验收场景、页面和 service。角色授权、菜单、字典和配置直接供演示服务读取。演示业务的真实 API 由业务后端实现。
- 用 `pnpm test:scenarios` 核验权限、数据范围、时段边界；`pnpm verify` 检查类型、清单、规则引用和生产资源。
- 首次纳管使用 Kaiwu CLI 的 `project adopt 本仓目录` 查看计划，再加 `--apply`。日常清单修改使用 `project sync 本仓目录`。规则与场景见 `docs/`。
- 前后端并排时，权限门禁同时核对后端注解。新后端尚未实现的业务权限会逐项列出；产品可在原目录执行 pnpm verify:mock 验收页面和 Mock 契约。开发实现接口并加上对应注解后，再执行 pnpm verify 验收三端权限。
- 产品从验收提交创建 `handoff/<批次>`，按 MR 模板合入 `dev`；`main` 记录发布版本，发布修复回流 `product`。后端可调整字段、加载状态和错误提示。交互、布局或流程变化需要产品复验。

本机运行 `pnpm test:browser` 会启动独立的 Mock 服务并在 Chromium 中验收。首次运行需安装浏览器（`pnpm exec playwright install chromium`）。`pnpm test:proxy` 默认用本地回显服务核对路径和项目头；设置 `KAIWU_GATEWAY` 后会对该网关核对公开接口、匿名会话和两类项目路径的实际响应。

若代理测试的业务路径返回 HTML，请将 `KAIWU_GATEWAY` 指向实际网关服务，或核对入口的业务 API 转发规则。
