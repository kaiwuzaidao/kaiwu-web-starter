# 业务前端开发约定

- 本仓库只属于 `purchase-desk`，使用 `@umijs/max + Ant Design 5 + ProComponents`。
- 权限码必须与后端 `@RequirePermission`、`kaiwu/menus.yml`（在本仓库）的 BUTTON 完全一致，
  由 `pnpm check:perm` 校验，**改完必须跑**。同一模块下新增 action（如 `:export`）
  不需要改契约文件；**新增模块**必须把 `permissionPrefix` 登记进
  `docs/kaiwu-project-blueprint.json` 的 `modules`，并补上本仓 `kaiwu/menus.yml` 的 BUTTON。后端接手后用对应注解实施同一项权限。
  该文件是本仓库与后端仓库共享的模块契约，不得删除。
- 用户可见且需要翻译或运营配置的状态/枚举走 `useDict` 与
  `@/components/ManagedDictSelect|ManagedDictText`，
  数据来自平台字典管理（global 字典 + 本项目覆盖项合并），禁止页面硬编码
  选项或 value→label 映射；未知值原样显示。新增枚举先在 kaiwu/dicts.yml 登记
  `{module}.{resource}_status` 之类的 dictCode，再在页面引用。
  `pnpm check:dict` 会拦住页面里的硬编码 `valueEnum` 和非法 dictCode；
  pnpm check:product 逐个核对本仓清单。
- 运行期可变且需要运营调整的展示参数默认走平台「参数配置」，用
  `@/kaiwu` 读取；领域不变量可以留在版本化代码中：

  ```tsx
  import { useProjectConfig, useProjectConfigNumber } from '@/kaiwu';

  const notice = useProjectConfig('order.notice.text', '');       // 必须给兜底值
  const pageSize = useProjectConfigNumber('order.page.size', 20);
  ```

  配置在平台侧随时可改，因此只能在组件内读取，不要提到模块作用域当常量缓存；平台不可达
  时返回 fallback，页面不得因取配置失败而崩。密钥类不走配置中心。
  **只用于展示**：限额、阈值、开关等参与校验的配置必须由后端读取并校验，前端读了再传回
  后端等于没有校验。
- 界面文案走 `src/locales/{locale}.ts`，用 `useIntl().formatMessage({ id })` 渲染。
  只对 `docs/kaiwu-project-blueprint.json` 的 `supportedLocales` 要求 key 完整；默认只启用
  `zh-CN`，增加语言后再补齐该语言。菜单名用 umi 的
  `menu.{name}` 约定，与 `config/config.ts` 里的 `name` 对应。
- **不要添加语言切换器、不要写 localStorage、不要认浏览器语言**：本前端嵌在 Kaiwu 平台内，
  语言由 `ProjectAccessProvider` 依据平台账户偏好设置，自建语言状态会造成平台与内嵌页面
  显示不同语言。
- 字典标签的多语言由平台按 `Accept-Language` 下发，页面照常用
  `useManagedDictionary` / `ManagedDictText` 即可，不要在前端做 value→多语言映射。
  字典项的译文在平台「字典管理」里维护。
- 请求必须携带平台 Access Token 和权威 `projectId`，后端授权才是安全边界。
- 页面请求统一放在 `src/services`，公共能力按
  `components/hooks/providers/services/utils/pages` 分层，禁止恢复单文件大壳层。
- 导出失败必须捕获并 `message.error` 提示——导出超限由后端返回 400，不提示会让用户
  以为按钮失灵。
- Secret 不得写入源码、构建参数、日志或提交。
- 产品在 product 迭代，以 handoff/<批次> 快照提交 MR 到 dev，发布修复由 main 回流 product。后端联调可改字段、错误提示和空态，改已验收的布局或交互须产品复验。
- 不得把凭据或敏感个人信息写进 `console`（约束 `logging.no-sensitive-data`，MUST）：
  控制台会被录屏、被前端监控 SDK 采集、被截图发进工单。只输出标识、长度或掩码值，
  由 `pnpm check:log` 把关。
- 约束强度以 `docs/kaiwu-constraints.json` 为准；只有 WARN/DEFAULT 可通过
  `docs/kaiwu-constraint-waivers.json` 有期限偏离，MUST 不可豁免。

有 `.kaiwu-starter` 标记时，在新目录创建用户自己的业务前端，命令为 `node scripts/kaiwu-init.mjs --code <编码> --name <名称>`。默认从空白业务开始。只在用户需要内置示例时选择 README 中的示例参数。根据产品描述在新仓编写页面、service、Mock、清单、规则和可执行场景，产品阶段运行 `pnpm verify:mock` 与 `pnpm test:scenarios`，开发接手后运行 `pnpm verify` 核对服务端注解，用 `pnpm dev` 启动并交付本机演示地址。

页面可自选 React UI 库，统一从 `@/kaiwu` 导入接入能力。权限判断写成 `useCan('模块:资源:动作')`，直接使用布尔返回值。组件传递的具体权限码放在 JSX 属性或业务模块声明中，供门禁对照菜单。

`src/kaiwu/` 是平台交付的只读接入层，`pnpm check:product` 核对其版本校验和。业务改动放在页面、适配组件或 service；接入层升级时由模板维护者同时更新源码和版本基线。
