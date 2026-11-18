# Kaiwu 产品前端起步仓

用 AI 在独立业务仓里搭建可操作的 React 前端。产品先用 Mock 确认页面、规则和角色，开发接手同一个前端仓，接入真实 API。

[开源版本 v0.3.0](https://github.com/kaiwuzaidao/kaiwu-web-starter/releases/tag/v0.3.0) · [Kaiwu 平台入口](https://github.com/kaiwuzaidao/kaiwu) · [AI 协作开发指南](https://github.com/kaiwuzaidao/kaiwu/blob/v0.3.0/docs/AI-DEVELOPMENT.md)

```mermaid
flowchart LR
  A["生成独立前端仓"] --> B["本地 Mock 演示与产品验收"]
  B --> C["交接已验收的提交"]
  C --> D["纳管并生成配套后端"]
  D --> E["实现业务 API 并联调"]
```

默认开发服务仅监听 127.0.0.1。启动后访问终端本机地址下的 `/__mock/`。

```sh
node -v  # 22.x
pnpm -v  # 10.x
git var GIT_AUTHOR_IDENT
```

## 新建业务前端

本地演示需要 Git、Node.js 22 和 pnpm 10。首次建仓前用 `git var GIT_AUTHOR_IDENT` 检查 Git 提交身份。两条路线都从同一个起步仓开始。

```sh
git clone --branch v0.3.0 --depth 1 https://github.com/kaiwuzaidao/kaiwu-web-starter.git
cd kaiwu-web-starter
```

### 路线 A · 用一句需求从空白开始

在起步仓打开能运行本机命令的 AI 编码工具，复制以下提示词，再按你的业务调整。

```text
按本仓 AGENTS.md 初始化一个空白业务前端。员工能看到投影仪的空闲时段，预约或取消自己的时段，两人选中重叠时段时要有明确的冲突提示。实现本地 Mock、业务规则和验收场景，跑完对应检查后给我演示地址与操作步骤。
```

也可以在起步仓手动执行 `node scripts/kaiwu-init.mjs --code equipment-booking --name 设备预约`，再进入同级新建的 `../equipment-booking-web` 开发。默认只生成骨架，业务页面和 Mock 按需求补齐。

### 路线 B · 直接试用双人设备预约

在起步仓执行以下命令。生成目录如已存在，换一个未使用的项目编码，并进入相应的生成目录。

```sh
node scripts/kaiwu-init.mjs --code equipment-booking --name 设备预约 --example booking
cd ../equipment-booking-web
pnpm install --frozen-lockfile
pnpm dev
```

在终端给出的地址打开 `/__mock/`。用两个独立浏览器会话分别选择员工甲和乙，先预约一个时段，再用另一身份提交重叠时段。第二次提交会提示冲突。获订者取消后，另一人可以重订。刷新保留演示数据，重启服务或点「重置演示数据」恢复初始状态。

## 联调及移交

保留产品验收用的提交号、演示身份、操作步骤和预期结果。产品在 `product` 分支迭代，从验收提交创建 `handoff/<批次>`，按交接模板提交到 `dev`。前端页面、`src/services/`、`kaiwu/*.yml`、业务规则和验收场景一起移交。

平台启动并登录后，在 Kaiwu 入口仓运行下面两条命令。示例假设业务前端和入口仓在同一父目录。

```sh
./kaiwu project adopt ../equipment-booking-web
./kaiwu project adopt ../equipment-booking-web --apply
```

先看预览，再应用纳管、同步清单并取回配套后端。实际预约的鉴权、事务和持久化由业务后端实现。原前端运行 `pnpm dev:real` 代理平台和业务请求到 Gateway，默认地址为 `http://127.0.0.1:8088`，可用 `KAIWU_GATEWAY` 覆盖。联调使用真实项目 ID，并从同源工作台进入以传递会话。开发者也可使用会话桥的一次性内存引导令牌。

日常使用 `./kaiwu project sync ../equipment-booking-web` 预览清单差异。维护在本仓 `kaiwu/` 下的菜单、字典、参数、角色权限、数据范围、定时任务与项目多语言不仅可在本地 Mock、后端联调间共用，上线后还支持通过平台「配置移交」在测试与生产环境间以 6 类 YAML 快照和三方基线比对可控同步。改变已验收的布局或交互时，请产品复验。

| 阶段 | 在业务前端仓运行 |
| --- | --- |
| 产品验收 | `pnpm verify:mock` 检查类型、规则、清单、接入层和生产构建。用 `pnpm test:scenarios` 验证 HTTP 行为，用 `pnpm test:browser` 验证 Chromium 交互。首次运行浏览器测试需执行 `pnpm exec playwright install chromium`。 |
| 后端接手 | `pnpm verify` 检查前端门禁。配套后端位于默认相邻目录，或通过 `KAIWU_SERVICE_DIR` 指定时，可以逐码核对后端注解。查看输出确认三端比较实际执行。 |
| 定位代理 | `pnpm test:proxy` 默认验证路径和项目头转发。设置 `KAIWU_GATEWAY` 后可核对真实响应。业务路径返回 HTML 时，检查网关地址和业务 API 转发规则。 |

开发约定见 [AGENTS.md](AGENTS.md)。生成后的业务仓在 `docs/` 维护自己的规则、验收场景和项目蓝图。
