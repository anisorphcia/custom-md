# Architecture

## 依赖方向

```text
example-protocol ──> protocol
                         │
                         v
stream adapters ──────> core <──── React adapter
                         ^
                         └──────── Vue adapter

Express server ── SSE ──> React/Vue Playgrounds
```

`@semantic-md/core` 不依赖 DOM、React、Vue 或 SSE。`@semantic-md/protocol` 封装
Schema 的 `safeParse` 能力，Core 不需要知道 Zod 的业务类型。框架包不包含解析逻辑。

## 数据流

1. 调用方用 `defineProtocol` 注册语义节点。
2. Server 将场景文本按可复现策略切片并发出 SSE `delta`。
3. Browser 将每个 `delta.text` 推入 Streaming Session。
4. Session 冻结稳定前缀，只解析活动尾部并产生 AST Patch。
5. React/Vue 使用节点 ID 作为 key，渲染标准节点或开发者组件。
6. `done` 触发 `finish()`，完整规范解析与流式快照协调。

## 安全边界

Parser 只产生数据 AST。HTML 被转换为普通 TextNode；URL 在进入 Link/Image AST
前进行协议校验；语义属性先过滤危险名称再进入 Schema。只有受信任的 Renderer
组件能调用 `requestAction` 和 `resolveReference`。
