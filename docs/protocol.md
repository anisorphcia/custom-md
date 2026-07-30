# Semantic Protocol

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
