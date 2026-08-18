# `@semantic-md/protocol`

定义可校验的 Semantic Markdown 节点，并生成供模型输出使用的 Protocol Prompt。

```bash
pnpm add @semantic-md/protocol zod
```

```ts
import { defineProtocol, generateProtocolPrompt } from "@semantic-md/protocol";
import { z } from "zod";

export const protocol = defineProtocol({
  version: "1.0.0",
  nodes: {
    metric: {
      kind: "inline",
      schema: z.object({ value: z.coerce.number() }),
      fallback: "children",
      description: "Render a numeric business metric.",
      usage: "A reliable numeric metric is present in the source.",
      examples: [':metric[收入 1200 万元]{value=1200}'],
    },
  },
});

export const protocolPrompt = generateProtocolPrompt(protocol);
```

将 `protocolPrompt` 加入服务端模型 instructions，并将同一个 `protocol` 传给 Core 和
React/Vue renderer。

参阅[自定义 Protocol 接入指南](../../docs/custom-protocol.md)和
[协议参考](../../docs/protocol.md)。
