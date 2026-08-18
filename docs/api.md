# Public API

## `@semantic-md/protocol`

### `defineProtocol(config)`

定义带类型的 Protocol。`version` 不能为空，节点名必须以字母开头且只能包含字母、
数字、`-` 和 `_`。节点定义字段见[协议参考](./protocol.md)。

### `generateProtocolPrompt(protocol)`

返回可加入模型 instructions 的文本，包含节点语法、属性类型、枚举、使用条件、约束
和示例。业务角色、语言及回答目标仍由调用方补充。

### 验证与查询

- `validateSemanticNode(input, protocol)`：过滤危险属性并执行节点 Schema 的
  `safeParse`，返回属性和结构化 diagnostics，不抛出普通校验错误。
- `getNodeDefinition(protocol, name)`：按名称查询节点定义。
- `new SemanticRegistry(protocol)`：提供 `get`、`has` 和 `names` 查询。
- `InferNodeAttributes<Protocol, Name>`：从节点 Schema 推导属性类型。

其他公开类型包括 `SemanticProtocol`、`SemanticNodeDefinition`、`SchemaLike`、
`FallbackStrategy` 和验证结果类型。

## `@semantic-md/core`

### 一次性解析

```ts
parseMarkdown(source, options?): MarkdownDocument
parseMarkdownWithDiagnostics(source, options?): {
  document: MarkdownDocument;
  diagnostics: Diagnostic[];
}
```

`options.protocol` 注册业务语义，`options.mode` 可为 `conservative`、`balanced` 或
`optimistic`。还导出 `normalizeDocument`、`diffAst`、`sanitizeUrl` 和完整 AST/Patch
类型。

### 流式 Session

```ts
const session = createStreamingMarkdownSession({
  protocol,
  mode: "balanced",
  batchInterval: 16,
});
```

```ts
interface StreamingMarkdownSession {
  push(chunk: string): ParseUpdate;
  finish(): ParseUpdate;
  reset(): void;
  getSnapshot(): MarkdownDocument;
  getDiagnostics(): Diagnostic[];
  subscribe(listener: (update: ParseUpdate) => void): () => void;
}
```

`push()` 只接收新增的 Markdown 文本，不能传 SSE JSON。正常流结束时必须调用
`finish()`；之后继续 `push()` 会抛错，需先 `reset()`。`batchInterval` 只合并订阅通知，
每次 `push()` 仍立即返回 `ParseUpdate`。

`ParseUpdate` 包含 `version`、`patches`、`snapshot`、`diagnostics` 和 `streamStatus`。

## `@semantic-md/react`

### `<SemanticMarkdown>`

主要 props：

- `protocol`：必填 Protocol。
- `content`：完整或正在增长的 Markdown 字符串。
- `document`：已经解析的 `MarkdownDocument`；提供时优先于 `content`。
- `components`：节点名到业务 React 组件的映射。
- `markdownComponents`：覆盖标准 Markdown 节点组件。
- `streamingMode`：默认 `balanced`。
- `locale`：默认 `zh-CN`。
- `showPendingState`：默认 `true`。
- `onDiagnostic`、`onAction`、`onReference`：诊断和受控交互回调。

### `useSemanticMarkdown(options?)`

返回 `document`、`patches`、`diagnostics`、`status`、`push`、`finish` 和 `reset`。
流式场景将返回的 `document` 传给 `<SemanticMarkdown>`。

还导出 `renderNode`、`SemanticMarkdownContext`、`useSemanticMarkdownContext` 和组件
相关类型。

## `@semantic-md/vue`

Vue `<SemanticMarkdown>` 与 React 组件使用相同数据契约；props 使用 Vue 命名方式，
事件为 `diagnostic`、`action` 和 `reference`。

`useSemanticMarkdown(options?)` 返回 refs：`document`、`patches`、`diagnostics`、
`status`，以及 `push`、`finish`、`reset`。在 `<script setup>` 中将这些 refs 解构为
顶层变量后，template 会自动解包。

还导出 `renderNode`、`semanticMarkdownContextKey`、`useSemanticMarkdownContext` 和组件
相关类型。

完整接入示例见[自定义 Protocol 接入指南](./custom-protocol.md)。
