# `@semantic-md/core`

框架无关的 Markdown 解析、语义 AST 验证、diagnostics、Patch 和流式 Session。

```bash
pnpm add @semantic-md/core
```

一次性解析：

```ts
import { parseMarkdownWithDiagnostics } from "@semantic-md/core";

const { document, diagnostics } = parseMarkdownWithDiagnostics("# Hello");
```

流式解析：

```ts
import { createStreamingMarkdownSession } from "@semantic-md/core";

const session = createStreamingMarkdownSession({ mode: "balanced" });
session.push("# Stream");
session.push("ing");
const document = session.finish().snapshot;
```

`push()` 只接收新增文本，流结束时调用 `finish()`。自定义语义节点还需传入由
`@semantic-md/protocol` 定义的 Protocol。

参阅[公共 API](../../docs/api.md)和[流式模型](../../docs/streaming.md)。
