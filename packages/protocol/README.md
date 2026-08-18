# @semantic-md/protocol

Define validated semantic Markdown nodes and generate protocol instructions for AI output.

```bash
pnpm add @semantic-md/protocol zod
```

```ts
import { defineProtocol } from "@semantic-md/protocol";
import { z } from "zod";

export const protocol = defineProtocol({
  version: "1.0.0",
  nodes: {
    metric: {
      kind: "inline",
      schema: z.object({ value: z.coerce.number() }),
      fallback: "children",
    },
  },
});
```

See the [repository documentation](https://github.com/anisorphcia/custom-md#readme).
