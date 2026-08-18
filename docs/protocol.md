# Semantic Protocol 参考

本文定义 Protocol 的语法和验证规则。完整接入步骤见
[自定义 Protocol 接入指南](./custom-protocol.md)。

## 语法

Inline：

```md
:increase[增长 12.5%]{value=12.5 unit="percent"}
```

Leaf/Block：

```md
::chart{source="quarterly-revenue"}
```

Container：

```md
:::risk{level="high" code="PAYMENT_DUPLICATE"}
容器中仍然是标准 Markdown。
:::
```

属性名必须以字母或下划线开头，只包含字母、数字、`-` 和 `_`。禁止样式、class、
事件、HTML 注入和表达式属性。

`defineProtocol` 保留具体 nodes 类型，因此可以通过 `InferNodeAttributes` 推导组件
属性。`validateSemanticNode` 的输出包括过滤、Schema 校验后的 attributes 和结构化
diagnostics。未知节点不抛异常，由 Renderer 按 fallback 处理。

Fallback 包括 `children`、`raw`、`remove`、`blockquote` 和 `error-component`。
`generateProtocolPrompt` 输出节点名、kind、语法、属性类型、必填项、枚举和示例。

## 节点定义字段

- `kind`：`inline`、`block` 或 `container`。
- `schema`：提供 `safeParse` 的属性 Schema；当前示例使用 Zod。
- `fallback`：节点未知、无组件或校验失败时的展示策略。
- `renderPending`：流式语法未闭合时是否允许提前渲染。
- `description`、`usage`、`constraints`、`antiExamples`、`childrenDescription`、
  `outputPriority`、`examples`：供 `generateProtocolPrompt` 生成模型指令。

节点名必须以字母开头，只包含字母、数字、`-` 和 `_`。Protocol `version` 不能为空。

## Fallback

- `children`：保留可见子内容，也是未知节点的默认策略。
- `raw`：显示原始 Directive 文本。
- `remove`：不渲染该节点。
- `blockquote`：以引用块展示子内容。
- `error-component`：交给 renderer 的错误组件展示。

Fallback 是必要的容错边界；模型输出和历史内容都不能假设永远符合当前 Protocol。
