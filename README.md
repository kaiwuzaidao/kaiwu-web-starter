# Kaiwu 产品前端

用同一套页面完成产品演示和后端联调。仓库附带一套可运行的采购申请示例。

## 新建业务前端

产品人员可以克隆本仓库，在仓库目录打开自己的 AI 编程工具，输入一句需求。例如：“做一个物资领用前端，可以登记物资和正整数数量，刷新后还看得到。请新建业务前端，用 Mock 跑起来并给我演示地址。”本地演示只需 Node、pnpm 和 Git。

默认建立空白业务前端。例如运行 `node scripts/kaiwu-init.mjs --code inventory --name 库存管理`，再进入旁边新建的 `inventory-web`。需要采购样例时，初始化命令加 `--example purchase`。新仓当前分支为 `product`。产品可以直接把新仓交给自己的 AI 工具。使用 Node 20+、pnpm 10 和 Git。首次建仓使用当前 Git 姓名和邮箱，提交前可用 `git var GIT_AUTHOR_IDENT` 核对。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

打开开发服务器打印的地址，在域名后访问 `/__mock/`。空白项目选择「演示成员」进入首页。使用采购样例时，选择申请人 A 创建、编辑、提交采购申请，回到身份页选择经理处理，再切换成员工 B 查看自己的数据。重启服务或在身份页重置会恢复种子数据。

## 审批台

在身份页选择审批经理，再打开 `/__mock/approvals`。超过 10 万元的申请经经理同意后仍为待审批，切换到流程演示的总经理完成最后一级，业务页面会显示已批准。业务页面的直接批准操作保留单级金额权限校验。

`kaiwu/workflows/purchase_request/binding.yml` 支持 `single`、`serial` 和 `amount-tiered`。前两种只填 `params.approverRoles`，串行按数组顺序分配。金额分级另填 `amountField: amount`、以元为单位的字符串阈值和 `escalationRoles`。已提交的单据沿用提交时的节点顺序。启用真实流程服务后，先用 `project adopt` 或 `project sync --apply` 同步采购菜单。示例已声明 `workflow:definition:manage` 和 `workflow:document:manage`，只给负责导入的项目管理员使用；申请人、经理、总经理的默认角色均无这两项权限。由开发在 Workflow 为 `purchase_request` 配置真实业务回调 URL、目标服务、有效期和独立密钥，部署配置通过环境或 Secret 注入。然后用 `./kaiwu workflow sync <前端仓> [--apply]` 独立导入流程。业务后端负责发起和回调。

## 联调及移交

- `pnpm dev:real` 同时把 `/api`、业务 API 和服务路由代理到 Gateway。默认目标为 `http://127.0.0.1:8088`，可用 `KAIWU_GATEWAY` 覆盖。使用真实项目 ID；从同源平台工作台进入以传递会话。开发者独立调试可使用现有会话桥的一次性内存引导令牌。
- 产品维护 `kaiwu/*.yml`、业务规则、验收场景、页面和 service。角色授权、菜单、字典和配置直接供演示服务读取。采购示例的真实业务 API 由业务后端实现。
- 用 `pnpm test:scenarios` 核验权限、数据范围、状态与金额边界；`pnpm verify` 检查类型、清单、规则引用和生产资源。
- 首次纳管使用 Kaiwu CLI 的 `project adopt 本仓目录` 查看计划，再加 `--apply`。日常清单修改使用 `project sync 本仓目录`。规则与场景见 `docs/`。
- 前后端并排时，权限门禁同时核对后端注解。新后端尚未实现的业务权限会逐项列出；产品可在原目录执行 pnpm verify:mock 验收页面和 Mock 契约。开发实现接口并加上对应注解后，再执行 pnpm verify 验收三端权限。
- 产品从验收提交创建 `handoff/<批次>`，按 MR 模板合入 `dev`；`main` 记录发布版本，发布修复回流 `product`。后端可调整字段、加载状态和错误提示。交互、布局或流程变化需要产品复验。

本机运行 `pnpm test:browser` 会启动独立的 Mock 服务并在 Chromium 中验收。首次运行需安装浏览器（`pnpm exec playwright install chromium`）。`pnpm test:proxy` 默认用本地回显服务核对路径和项目头；设置 `KAIWU_GATEWAY` 后会对该网关核对公开接口、匿名会话和两类项目路径的实际响应。
