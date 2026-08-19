# `@semantic-md/react`

Semantic Markdown 的 React renderer 和流式 hook。

```bash
pnpm add @semantic-md/protocol @semantic-md/react zod react react-dom
```

```tsx
import { defineProtocol } from "@semantic-md/protocol";
import { SemanticMarkdown } from "@semantic-md/react";
import type { SemanticComponentMap } from "@semantic-md/react";
import { z } from "zod";

const protocol = defineProtocol({
  version: "1.0.0",
  nodes: {
    status: {
      kind: "inline",
      schema: z.object({ value: z.enum(["pending", "done"]) }),
      fallback: "children",
    },
  },
});

const components: SemanticComponentMap = {
  status: ({ attributes, children }) => (
    <span data-status={String(attributes.value)}>{children}</span>
  ),
};

export function Answer() {
  return (
    <SemanticMarkdown
      content={':status[已完成]{value="done"}'}
      protocol={protocol}
      components={components}
    />
  );
}
```

流式场景使用 `useSemanticMarkdown({ protocol })`，逐段调用 `push(text)`。Core Session
会合并高频输入并通知 Hook，结束时调用 `finish()`，再将 `document` 传给
`<SemanticMarkdown>`。

参阅[自定义 Protocol 接入指南](../../docs/custom-protocol.md)和
[公共 API](../../docs/api.md)。
