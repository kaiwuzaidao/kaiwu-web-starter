# 产品前端

开发与移交约定见 AGENTS.md。主要命令见 README.md。

`src/kaiwu/` 是平台交付的只读接入层，`pnpm check:product` 核对其版本校验和。业务改动放在页面、适配组件或 service；接入层升级时由模板维护者同时更新源码和版本基线。
