# @semantic-md/core

Framework-independent Markdown parsing, semantic AST validation, diagnostics, and streaming sessions.

```bash
pnpm add @semantic-md/core
```

```ts
import { createStreamingMarkdownSession } from "@semantic-md/core";

const session = createStreamingMarkdownSession();
session.push("# Streaming");
const document = session.finish().snapshot;
```

See the [repository documentation](https://github.com/anisorphcia/custom-md#readme).
