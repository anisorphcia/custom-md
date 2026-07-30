# Public API

## `@semantic-md/protocol`

- `defineProtocol(config)`
- `validateSemanticNode(input, protocol)`
- `generateProtocolPrompt(protocol)`
- `getNodeDefinition(protocol, name)`
- `SemanticRegistry`
- `InferNodeAttributes<Protocol, Name>`

## `@semantic-md/core`

- `parseMarkdown(source, options?)`
- `parseMarkdownWithDiagnostics(source, options?)`
- `createStreamingMarkdownSession(options?)`
- `normalizeDocument(document)`
- `diffAst(previous, next)`
- `sanitizeUrl(url)`

Session：

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

## `@semantic-md/stream`

- `consumeReadableStream(stream, session, options?)`
- `consumeAsyncIterable(iterable, session, options?)`
- `connectSemanticSse(url, session, callbacks?)`

## Framework adapters

React 导出 `<SemanticMarkdown>`、`useSemanticMarkdown`、`renderNode` 和 context hook。
Vue 导出对应组件、composable、VNode renderer 和 context composable。
