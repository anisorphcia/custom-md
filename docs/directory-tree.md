# Directory Tree

```text
.
├── apps
│   ├── playground-react
│   │   ├── src
│   │   │   ├── semantic-components/index.tsx
│   │   │   ├── styles/app.css
│   │   │   ├── App.tsx
│   │   │   ├── main.tsx
│   │   │   └── vite-env.d.ts
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vite.config.ts
│   ├── playground-server
│   │   ├── src
│   │   │   ├── routes
│   │   │   │   ├── scenarios.ts
│   │   │   │   └── stream.ts
│   │   │   ├── services
│   │   │   │   ├── chunker.ts
│   │   │   │   ├── sseWriter.ts
│   │   │   │   └── streamSimulator.ts
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   ├── tests
│   │   │   ├── chunker.test.ts
│   │   │   └── server.test.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   └── playground-vue
│       ├── src
│       │   ├── semantic-components/index.ts
│       │   ├── styles/app.css
│       │   ├── App.vue
│       │   ├── env.d.ts
│       │   └── main.ts
│       ├── index.html
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
├── docs
│   ├── api.md
│   ├── architecture.md
│   ├── directory-tree.md
│   ├── protocol.md
│   ├── requirements.md
│   └── streaming.md
├── packages
│   ├── core
│   │   ├── benchmarks/streaming.bench.ts
│   │   ├── src
│   │   │   ├── ast/types.ts
│   │   │   ├── diagnostics/codes.ts
│   │   │   ├── parser/parseMarkdown.ts
│   │   │   ├── patches
│   │   │   │   ├── diff.ts
│   │   │   │   └── types.ts
│   │   │   ├── rendering/types.ts
│   │   │   ├── security/url.ts
│   │   │   ├── streaming/session.ts
│   │   │   └── index.ts
│   │   ├── tests
│   │   │   ├── chunks.property.test.ts
│   │   │   └── core.test.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   ├── example-protocol
│   │   ├── src
│   │   │   ├── index.ts
│   │   │   ├── protocol.ts
│   │   │   ├── scenarios.ts
│   │   │   └── types.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   ├── protocol
│   │   ├── src
│   │   │   ├── defineProtocol.ts
│   │   │   ├── index.ts
│   │   │   ├── prompt.ts
│   │   │   ├── registry.ts
│   │   │   ├── types.ts
│   │   │   └── validator.ts
│   │   ├── tests/protocol.test.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   ├── react
│   │   ├── src
│   │   │   ├── hooks/useSemanticMarkdown.ts
│   │   │   ├── context.ts
│   │   │   ├── index.ts
│   │   │   ├── renderNode.tsx
│   │   │   ├── SemanticMarkdown.tsx
│   │   │   └── types.ts
│   │   ├── tests/react.test.tsx
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   ├── stream
│   │   ├── src
│   │   │   ├── asyncIterable.ts
│   │   │   ├── index.ts
│   │   │   ├── readableStream.ts
│   │   │   └── sse.ts
│   │   ├── tests/stream.test.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   └── vue
│       ├── src
│       │   ├── composables/useSemanticMarkdown.ts
│       │   ├── context.ts
│       │   ├── index.ts
│       │   ├── renderNode.ts
│       │   ├── SemanticMarkdown.ts
│       │   ├── SemanticMarkdown.vue
│       │   └── types.ts
│       ├── tests/vue.test.ts
│       ├── package.json
│       ├── tsconfig.json
│       └── vitest.config.ts
├── tests/e2e
│   ├── react.spec.ts
│   └── vue.spec.ts
├── .env.example
├── .gitignore
├── ai-semantic-markdown-monorepo-requirements.md
├── biome.json
├── package.json
├── playwright.config.ts
├── pnpm-workspace.yaml
├── README.md
├── tsconfig.base.json
├── turbo.json
└── vitest.workspace.ts
```
