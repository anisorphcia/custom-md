# 项目结构

本文只说明稳定的目录职责，不逐项复制文件树，避免目录变更后文档失真。

```text
.
├── apps/                  # 可运行的 Playground 与演示服务
├── packages/              # 可发布 SDK 包和内部示例 Protocol
├── docs/                  # 使用、协议、架构与 API 文档
├── tests/e2e/             # React/Vue 端到端测试
├── .changeset/            # 公共包版本与发布记录
├── README.md              # SDK 使用者入口
└── CONTRIBUTING.md        # 仓库开发、质量检查与发布流程
```

## Apps

- `apps/playground-server`：Express 演示服务，提供模拟分片、场景列表和 OpenAI 兼容
  Responses API 的 SSE 路由。
- `apps/playground-react`：React 流式渲染、调试信息及业务语义组件示例。
- `apps/playground-vue`：使用同一 Protocol 和 Core AST 的 Vue 3 示例。

Apps 均为 private，不作为 SDK 发布。其代码用于展示接入方式，不是调用方必须复制的
运行时架构。

## Packages

- `packages/protocol`：定义、查询和校验语义节点，并生成供模型使用的 Protocol Prompt。
- `packages/core`：框架无关的 Markdown AST、解析、安全处理、Patch 和流式 Session。
- `packages/react`：React renderer、`<SemanticMarkdown>` 和流式 hook。
- `packages/vue`：Vue renderer、`<SemanticMarkdown>` 和流式 composable。
- `packages/example-protocol`：Playground 共用的内部示例，不公开发布，也不包含 React
  或 Vue 组件。

依赖方向见[架构文档](./architecture.md)，公共导出见[API 文档](./api.md)，后续演进计划
见[架构 Review 与优化路线](./architecture-review.md)。
