# AI Semantic Markdown Monorepo 可执行需求文档

> [!WARNING]
> 这是项目启动阶段的历史需求和验收输入，不代表当前公共 API。实现过程中已经取消
> 独立的 `@semantic-md/stream` 包，并扩展了示例 Protocol。请以根目录
> `README.md`、`docs/` 和各 package 的当前导出为准。

## 1. 文档目的

本需求用于指导编码 AI 从零完成一个可运行、可测试、可扩展的 Monorepo 项目。

项目需要实现一个面向 AI 流式输出场景的 Semantic Markdown SDK：调用者可以注册自定义语义结构，AI 输出标准 Markdown 与自定义结构，SDK 对内容进行增量解析、校验和跨框架渲染，并在 Playground 中通过 SSE 模拟完整流程。

本需求中的“必须”均属于首个可交付版本的验收要求；“后续”内容不进入首个版本。

---

## 2. 产品定位

项目不是普通的 Markdown 转 HTML 工具，也不是 MDX 执行器，而是：

> 一个面向 AI 流式输出的语义化 Markdown 协议、增量解析器和 React/Vue 跨框架渲染 SDK。

完整链路：

```text
调用者定义语义协议
        ↓
SDK 生成或提供 AI 可理解的语法说明
        ↓
AI 输出标准 Markdown + 自定义语义节点
        ↓
后台通过 SSE 按任意长度分片发送
        ↓
前端增量解析标准 Markdown 和自定义节点
        ↓
生成框架无关 AST 与 Patch
        ↓
React/Vue Adapter 渲染业务组件
```

---

## 3. 核心目标

项目必须实现以下目标：

1. 支持标准 Markdown 的完整解析和流式增量解析。
2. 支持调用者注册自定义 Inline、Block、Container 语义节点。
3. 支持自定义节点参数校验、默认值、降级策略和渲染组件。
4. 支持 SSE、ReadableStream、AsyncIterable 和手动 `push` 输入。
5. 支持流式过程中提前渲染标题、列表、引用、代码块、表格和自定义结构，而不是等待整个文档结束。
6. 对存在歧义的斜体、加粗、行内代码、链接等结构，使用 Pending/Provisional 节点实现提前展示和必要的局部回退。
7. 核心解析层与 React、Vue 解耦。
8. React 与 Vue Demo 使用同一份协议、同一份输入和同一份核心 AST。
9. 最终流式解析结果必须与一次性解析完整文本的结果语义等价。
10. AI 输出必须按不可信内容处理，禁止执行任意 JavaScript、JSX、Vue Template、事件属性或危险 URL。

---

## 4. 非目标

首个版本不实现：

- 所见即所得 Markdown 编辑器。
- 任意 JSX、MDX 或 Vue Template 编译执行。
- AI 自动执行业务操作。
- 完整低代码页面生成。
- 任意 CSS、className 或 style 注入。
- Mermaid、数学公式、图表引擎。
- Svelte、Angular、Web Components 适配。
- WebSocket 通信。
- 真正调用第三方大模型。
- 服务端流式 SSR Hydration。

---

## 5. 技术栈与工程约束

### 5.1 基础技术栈

- 包管理器：pnpm。
- Monorepo：pnpm workspace。
- 任务编排：Turborepo。
- 语言：TypeScript，开启 `strict`。
- 包构建：tsup。
- 前端构建：Vite。
- React Demo：React + TypeScript。
- Vue Demo：Vue 3 + TypeScript + Composition API。
- 后台 Demo：Node.js + Express + TypeScript。
- 单元测试：Vitest。
- React 组件测试：React Testing Library。
- Vue 组件测试：Vue Test Utils。
- 端到端测试：Playwright。
- 属性测试/随机分片测试：fast-check。
- 代码规范：ESLint + Prettier，或统一使用 Biome；项目内只能保留一套格式化方案。

### 5.2 Markdown 基础依赖

首个版本优先基于以下生态实现，不重新编写完整 CommonMark 解析器：

- unified
- remark-parse
- remark-gfm
- remark-directive
- mdast 相关类型和工具

流式层允许对“当前未完成的活动块”进行局部重解析，但不得在每个字符到达时重新解析整个文档。

### 5.3 编码约束

- 禁止使用显式 `any`。
- 禁止使用 `@ts-ignore` 规避类型错误。
- 必须优先使用 `unknown`、类型守卫和泛型。
- Core 包不得依赖 React 或 Vue。
- React 包不得依赖 Vue，Vue 包不得依赖 React。
- 不得在框架包中复制解析逻辑。
- 不得使用 `dangerouslySetInnerHTML` 或 Vue 的 `v-html` 渲染 AI 内容。
- 公共 API 必须从各包的 `src/index.ts` 统一导出。
- 所有包必须通过 `pnpm typecheck`、`pnpm test` 和 `pnpm build`。

---

## 6. Monorepo 目录结构

```text
semantic-markdown/
├── apps/
│   ├── playground-server/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── routes/
│   │   │   │   ├── stream.ts
│   │   │   │   └── scenarios.ts
│   │   │   ├── services/
│   │   │   │   ├── chunker.ts
│   │   │   │   ├── sseWriter.ts
│   │   │   │   └── streamSimulator.ts
│   │   │   └── types.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── playground-react/
│   │   ├── src/
│   │   │   ├── App.tsx
│   │   │   ├── main.tsx
│   │   │   ├── components/
│   │   │   ├── semantic-components/
│   │   │   ├── hooks/
│   │   │   └── styles/
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── playground-vue/
│       ├── src/
│       │   ├── App.vue
│       │   ├── main.ts
│       │   ├── components/
│       │   ├── semantic-components/
│       │   ├── composables/
│       │   └── styles/
│       ├── package.json
│       └── vite.config.ts
│
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   ├── ast/
│   │   │   ├── parser/
│   │   │   ├── streaming/
│   │   │   ├── patches/
│   │   │   ├── diagnostics/
│   │   │   ├── security/
│   │   │   └── index.ts
│   │   ├── tests/
│   │   └── package.json
│   │
│   ├── protocol/
│   │   ├── src/
│   │   │   ├── defineProtocol.ts
│   │   │   ├── validator.ts
│   │   │   ├── registry.ts
│   │   │   ├── prompt.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── tests/
│   │   └── package.json
│   │
│   ├── stream/
│   │   ├── src/
│   │   │   ├── readableStream.ts
│   │   │   ├── asyncIterable.ts
│   │   │   ├── sse.ts
│   │   │   └── index.ts
│   │   ├── tests/
│   │   └── package.json
│   │
│   ├── react/
│   │   ├── src/
│   │   │   ├── SemanticMarkdown.tsx
│   │   │   ├── renderNode.tsx
│   │   │   ├── hooks/
│   │   │   ├── context.ts
│   │   │   └── index.ts
│   │   ├── tests/
│   │   └── package.json
│   │
│   ├── vue/
│   │   ├── src/
│   │   │   ├── SemanticMarkdown.vue
│   │   │   ├── renderNode.ts
│   │   │   ├── composables/
│   │   │   ├── context.ts
│   │   │   └── index.ts
│   │   ├── tests/
│   │   └── package.json
│   │
│   └── example-protocol/
│       ├── src/
│       │   ├── protocol.ts
│       │   ├── scenarios.ts
│       │   ├── types.ts
│       │   └── index.ts
│       └── package.json
│
├── docs/
│   ├── requirements.md
│   ├── architecture.md
│   ├── protocol.md
│   ├── streaming.md
│   └── api.md
│
├── tests/
│   └── e2e/
│       ├── react.spec.ts
│       └── vue.spec.ts
│
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── vitest.workspace.ts
├── playwright.config.ts
├── .gitignore
└── README.md
```

---

## 7. Workspace 包职责

### 7.1 `@semantic-md/core`

负责：

- 标准 Markdown 解析。
- 自定义 Directive AST 转换。
- 流式增量解析。
- 节点状态管理。
- 稳定节点 ID。
- AST Patch 生成。
- 诊断信息。
- URL 安全策略。
- 最终一致性校验。

不得包含：

- React 组件。
- Vue 组件。
- DOM 操作。
- SSE 连接代码。
- Demo 业务样式。

### 7.2 `@semantic-md/protocol`

负责：

- 自定义节点协议定义。
- 节点 Registry。
- 参数 Schema 校验。
- Fallback 策略。
- Prompt 说明生成。
- TypeScript 类型推导。

首个版本可以使用 Zod 作为 Schema 实现，但协议 API 必须封装 Zod，不得让 Core 解析器直接依赖业务 Zod Schema。

### 7.3 `@semantic-md/stream`

负责：

- 将 `ReadableStream` 转换为解析器输入。
- 将 `AsyncIterable<string>` 转换为解析器输入。
- 提供 SSE EventSource 适配工具。
- 提供流结束、取消和异常处理。

该包只负责输入适配，不负责建立后台业务协议。

### 7.4 `@semantic-md/react`

负责：

- 将 Core AST 渲染为 React 元素。
- 标准 Markdown 节点组件映射。
- 自定义语义组件注册。
- `useSemanticMarkdown` Hook。
- 只更新 Patch 影响的节点。
- 提供渲染上下文。

### 7.5 `@semantic-md/vue`

负责：

- 将 Core AST 渲染为 Vue VNode。
- 标准 Markdown 节点组件映射。
- 自定义语义组件注册。
- `useSemanticMarkdown` Composable。
- 只更新 Patch 影响的节点。
- 提供渲染上下文。

### 7.6 `@semantic-md/example-protocol`

负责：

- React/Vue/Server 共用的 Demo 协议。
- Demo 文档场景。
- 自定义节点名称和属性类型。
- 不包含 React 或 Vue 组件。

---

## 8. 自定义语法规范

### 8.1 Inline Directive

```md
:increase[增长 12.5%]{value=12.5 unit="percent"}
```

用于：

- 指标。
- 状态。
- 人员实体。
- 引用。
- 标签。
- Tooltip。

### 8.2 Leaf/Block Directive

```md
::chart{source="quarterly-revenue"}
```

首个版本只解析为业务节点，不实现真实图表。

### 8.3 Container Directive

```md
:::risk{level="high" code="PAYMENT_DUPLICATE"}
订单可能发生重复支付。

请检查幂等记录和支付流水。
:::
```

容器内部允许继续包含标准 Markdown 和 Inline Directive。

### 8.4 属性规则

- 属性名称只允许字母、数字、`-` 和 `_`，且不能以数字开头。
- 字符串建议使用双引号。
- 数字允许直接书写。
- 布尔值允许 `true` 和 `false`。
- 不支持函数、表达式、对象字面量和 JavaScript。
- 不允许直接传递 `style`、`class`、`className`、`onClick` 等危险属性。

---

## 9. Demo 协议

`@semantic-md/example-protocol` 必须注册以下节点。

### 9.1 `increase`

```ts
{
  kind: "inline",
  schema: {
    value: number,
    unit: "percent" | "currency" | "count",
    period?: string
  },
  fallback: "children",
  renderPending: true
}
```

### 9.2 `decrease`

与 `increase` 相同，用于下降指标。

### 9.3 `status`

```ts
{
  kind: "inline",
  schema: {
    value: "pending" | "success" | "warning" | "failed"
  },
  fallback: "children"
}
```

### 9.4 `risk`

```ts
{
  kind: "container",
  schema: {
    level: "low" | "medium" | "high",
    code?: string
  },
  fallback: "blockquote"
}
```

### 9.5 `citation`

```ts
{
  kind: "inline",
  schema: {
    id: string,
    page?: number
  },
  fallback: "children"
}
```

点击后只在 Demo 日志区显示引用信息，不打开外部页面。

### 9.6 `action`

```ts
{
  kind: "inline",
  schema: {
    name: "regenerate" | "open-detail",
    targetId?: string
  },
  fallback: "children"
}
```

Action 只能渲染为按钮，点击后写入前端日志；禁止解析阶段自动执行。

---

## 10. 框架无关 AST

Core 必须输出统一 AST。至少支持以下节点：

```ts
type MarkdownNode =
  | RootNode
  | TextNode
  | ParagraphNode
  | HeadingNode
  | EmphasisNode
  | StrongNode
  | DeleteNode
  | InlineCodeNode
  | CodeBlockNode
  | BlockquoteNode
  | ListNode
  | ListItemNode
  | LinkNode
  | ImageNode
  | ThematicBreakNode
  | TableNode
  | TableRowNode
  | TableCellNode
  | SemanticNode
  | UnknownNode;
```

公共基础字段：

```ts
type NodeStatus = "pending" | "stable" | "invalid";

type NodeConfidence = "confirmed" | "provisional";

interface BaseNode {
  id: string;
  type: string;
  status: NodeStatus;
  confidence: NodeConfidence;
  range: {
    start: number;
    end: number;
  };
}
```

语义节点：

```ts
interface SemanticNode extends BaseNode {
  type: "semantic";
  name: string;
  kind: "inline" | "block" | "container";
  attributes: Record<string, unknown>;
  rawAttributes: Record<string, string>;
  children: MarkdownNode[];
  validationErrors: Diagnostic[];
}
```

所有节点 ID 在追加内容时必须保持稳定，除非节点类型发生必要回退或替换。

---

## 11. 流式解析模型

### 11.1 Session API

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

创建方式：

```ts
const session = createStreamingMarkdownSession({
  protocol,
  mode: "balanced",
  batchInterval: 16,
});
```

### 11.2 模式

```ts
type StreamingMode = "conservative" | "balanced" | "optimistic";
```

- `conservative`：只渲染已确认结构。
- `balanced`：块级结构尽早渲染；高歧义行内结构短暂缓冲。
- `optimistic`：斜体、加粗、行内代码、自定义节点等允许建立 Provisional 节点，后续必要时回退。

默认使用 `balanced`。

### 11.3 增量解析原则

实现采用“已稳定前缀 + 活动尾部区域”模型：

```text
已稳定节点区 | 当前活动 Block | 尚未解析字符
```

要求：

1. 已稳定节点不得在每个 chunk 到达时重新解析。
2. 当前活动 Block 可以局部重解析。
3. 当前 Block 结束后转为稳定节点并进入稳定前缀。
4. 表格、列表、引用等多行结构可以保持为活动节点并增量增加子节点。
5. `finish()` 时执行一次完整规范解析，并与当前 AST 进行协调。
6. `finish()` 后的 AST 必须与一次性 `parseMarkdown(fullText)` 语义等价。

---

## 12. 标准 Markdown 流式规则

### 12.1 ATX 标题

收到行首 `# `、`## ` 等后立即创建 Pending Heading。

```text
Chunk 1: "# "
Chunk 2: "财务"
Chunk 3: "分析\n"
```

渲染过程：

```text
空标题容器 → “财务” → “财务分析” → stable
```

不得等待整篇文档结束。

### 12.2 列表

收到行首 `- `、`* `、`1. ` 后立即建立 List/ListItem Pending 节点。

新列表项到达时，只插入新 Item，不重建已存在 Item。

### 12.3 引用

收到行首 `> ` 后立即建立 Pending Blockquote。

### 12.4 围栏代码块

收到完整开头围栏，例如 ```` ```ts ```` 后立即建立 Pending CodeBlock。

代码块未闭合时：

- 代码内容持续追加。
- 内部 Markdown 标记不参与解析。
- Pending 时只使用普通 `<pre><code>` 渲染。
- 代码块稳定后才允许执行高成本高亮；MVP 可以不实现高亮，但必须保留状态接口。

### 12.5 斜体和加粗

斜体和加粗存在歧义，必须支持 Provisional 节点。

例如收到：

```md
这是 *重要
```

在 `optimistic` 模式下可以建立：

```ts
{
  type: "emphasis",
  status: "pending",
  confidence: "provisional",
  children: [{ type: "text", value: "重要" }]
}
```

后续收到闭合 `*` 后转为 confirmed/stable；如果流结束仍未闭合，回退为普通文本。

`balanced` 模式允许短暂缓冲后再创建 provisional 节点，但不能等待整个文档结束。

### 12.6 行内代码

收到单个反引号和后续内容后，可以创建 Pending InlineCode；流结束未闭合时回退为普通文本。

### 12.7 链接

显示文本可以提前展示，但 URL 未闭合并通过安全校验前不得生成可点击链接。

### 12.8 表格

仅收到第一行时不能确定为表格：

```md
| 名称 | 数值 |
```

必须暂存该候选行，收到分隔行后确认：

```md
| --- | ---: |
```

确认后立即将候选段落替换为 Table，并渲染表头。后续每收到一行，追加一个 TableRow。不得等待表格结束后才整体渲染。

### 12.9 自定义 Inline Directive

收到 `:increase[` 后创建 Pending SemanticNode。

- `children` 内容持续追加。
- 属性只在形成完整 `key=value` 后加入 `rawAttributes`。
- 未完整属性不得进入最终 `attributes`。
- Schema 校验成功后更新类型化属性。
- 调用者可通过 `renderPending` 决定是否提前使用自定义组件。

### 12.10 自定义 Container Directive

收到 `:::risk{...}` 开头行后立即建立 Pending Container。

内部内容继续按 Markdown 解析；收到闭合 `:::` 后转为 stable。

---

## 13. AST Patch 协议

解析器必须输出局部 Patch：

```ts
type AstPatch =
  | {
      type: "insert";
      parentId: string;
      index: number;
      node: MarkdownNode;
    }
  | {
      type: "update";
      nodeId: string;
      changes: Record<string, unknown>;
    }
  | {
      type: "append-text";
      nodeId: string;
      value: string;
    }
  | {
      type: "replace";
      nodeId: string;
      node: MarkdownNode;
    }
  | {
      type: "remove";
      nodeId: string;
    }
  | {
      type: "stabilize";
      nodeId: string;
    };
```

`ParseUpdate`：

```ts
interface ParseUpdate {
  version: number;
  patches: AstPatch[];
  snapshot: MarkdownDocument;
  diagnostics: Diagnostic[];
  streamStatus: "idle" | "streaming" | "finished" | "error";
}
```

MVP 可以在内部通过局部 AST 比较生成 Patch，但外部 API 必须符合上述格式。

---

## 14. 协议定义 API

示例：

```ts
import { z } from "zod";
import { defineProtocol } from "@semantic-md/protocol";

export const demoProtocol = defineProtocol({
  version: "1.0.0",
  nodes: {
    increase: {
      kind: "inline",
      schema: z.object({
        value: z.coerce.number(),
        unit: z.enum(["percent", "currency", "count"]),
        period: z.string().optional(),
      }),
      fallback: "children",
      renderPending: true,
    },
    risk: {
      kind: "container",
      schema: z.object({
        level: z.enum(["low", "medium", "high"]),
        code: z.string().optional(),
      }),
      fallback: "blockquote",
      renderPending: true,
    },
  },
});
```

Fallback 类型：

```ts
type FallbackStrategy =
  | "raw"
  | "children"
  | "remove"
  | "blockquote"
  | "error-component";
```

协议必须提供：

```ts
validateSemanticNode(node, protocol)
generateProtocolPrompt(protocol)
getNodeDefinition(protocol, name)
```

---

## 15. Prompt 生成

`generateProtocolPrompt` 根据协议生成 AI 可使用的说明，至少包含：

- 节点名称。
- 使用场景。
- 完整语法。
- 属性名称和类型。
- 必填属性。
- 合法枚举值。
- 正确示例。
- 禁止事项。

Demo 页面必须展示生成后的 Prompt，便于开发者复制。

---

## 16. React 公共 API

### 16.1 组件

```tsx
<SemanticMarkdown
  content={content}
  protocol={demoProtocol}
  components={semanticComponents}
  markdownComponents={markdownComponents}
  streamingMode="balanced"
  onDiagnostic={handleDiagnostic}
  onAction={handleAction}
/>
```

### 16.2 Hook

```ts
const {
  document,
  patches,
  diagnostics,
  status,
  push,
  finish,
  reset,
} = useSemanticMarkdown({
  protocol: demoProtocol,
  streamingMode: "balanced",
});
```

### 16.3 自定义组件 Props

```ts
interface SemanticComponentProps<TAttributes> {
  node: SemanticNode;
  attributes: TAttributes;
  status: NodeStatus;
  confidence: NodeConfidence;
  children: React.ReactNode;
  context: SemanticRenderContext;
}
```

---

## 17. Vue 公共 API

### 17.1 组件

```vue
<SemanticMarkdown
  :content="content"
  :protocol="demoProtocol"
  :components="semanticComponents"
  :markdown-components="markdownComponents"
  streaming-mode="balanced"
  @diagnostic="handleDiagnostic"
  @action="handleAction"
/>
```

### 17.2 Composable

```ts
const {
  document,
  patches,
  diagnostics,
  status,
  push,
  finish,
  reset,
} = useSemanticMarkdown({
  protocol: demoProtocol,
  streamingMode: "balanced",
});
```

### 17.3 组件 Props

Vue 自定义组件接收与 React 相同语义的数据字段：

- `node`
- `attributes`
- `status`
- `confidence`
- `context`

子内容通过默认 slot 传入。

---

## 18. 渲染上下文

统一上下文：

```ts
interface SemanticRenderContext {
  locale: string;
  requestAction(action: SemanticActionRequest): void;
  resolveReference(id: string): void;
  reportDiagnostic(diagnostic: Diagnostic): void;
}
```

AI 不能直接调用这些方法；只有开发者注册的 React/Vue 组件可以使用。

---

## 19. SSE 后台 Demo

### 19.1 服务地址

- Server 默认端口：`4100`。
- React 默认端口：`5173`。
- Vue 默认端口：`5174`。

### 19.2 接口

```http
GET /api/stream
```

Query 参数：

```ts
interface StreamQuery {
  scenario?: string;
  speed?: number;
  chunkMode?: "char" | "word" | "fixed" | "random" | "syntax-boundary";
  chunkSize?: number;
  seed?: number;
}
```

示例：

```text
/api/stream?scenario=full&speed=60&chunkMode=random&seed=1
```

### 19.3 SSE Header

```http
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache, no-transform
Connection: keep-alive
X-Accel-Buffering: no
```

后台需要支持 CORS，允许两个本地 Playground 访问。

### 19.4 SSE 事件

#### `meta`

```text
event: meta
data: {"streamId":"...","scenario":"full","protocolVersion":"1.0.0"}

```

#### `delta`

```text
event: delta
data: {"seq":1,"text":"# "}

```

#### `diagnostic`

仅用于 Demo 模拟后台诊断，可选：

```text
event: diagnostic
data: {"level":"info","message":"simulation started"}

```

#### `done`

```text
event: done
data: {"seq":120,"totalChars":1024}

```

#### `error`

```text
event: error
data: {"code":"SIMULATION_ERROR","message":"..."}

```

### 19.5 心跳与断开

- 每 15 秒发送一次 SSE 注释心跳：`: heartbeat\n\n`。
- 浏览器关闭连接后必须停止定时器和输出任务。
- 不得继续向已关闭 Response 写入数据。

---

## 20. 分片模拟器

后台必须支持以下模式。

### 20.1 `char`

每次发送一个字符。

### 20.2 `word`

按单词、空格和中文字符边界分片。

### 20.3 `fixed`

按固定字符长度分片。

### 20.4 `random`

按 1 到 `chunkSize` 的随机长度分片；通过 `seed` 保证测试可复现。

### 20.5 `syntax-boundary`

故意在 Markdown 和自定义语法的危险位置断开，例如：

```text
"**重" + "要**"
"```t" + "s\n"
":increase[增长 12" + ".5%]{value=" + "12.5}"
"| ---" + " | ---: |"
```

该模式用于验证增量解析器。

---

## 21. Playground 场景

后台至少提供以下场景。

### 21.1 `basic`

包含：

- 普通段落。
- 标题。
- 加粗。
- 斜体。
- 链接。
- 列表。

### 21.2 `code`

包含多个语言代码块，并在反引号中间故意分片。

### 21.3 `table`

包含 GFM 表格，表头、分隔行和数据行分别流式输出。

### 21.4 `semantic`

包含所有 Demo 自定义节点。

### 21.5 `malformed`

包含：

- 未闭合斜体。
- 未闭合代码块。
- 非法自定义属性。
- 未注册自定义节点。
- 危险 URL。
- 未闭合 Container。

用于测试错误恢复和 Fallback。

### 21.6 `full`

组合所有标准 Markdown 和自定义节点，作为主演示场景。

### 21.7 `long`

生成较长文档，用于测试性能和局部更新。

---

## 22. 主演示 Markdown 内容

`full` 场景至少覆盖以下内容：

````md
# 2026 年第二季度经营分析

本报告用于演示 **标准 Markdown** 与 *自定义语义节点* 的流式渲染。

## 核心指标

- 营业收入：:increase[增长 12.5%]{value=12.5 unit="percent" period="year-over-year"}
- 运营成本：:decrease[下降 3.2%]{value=3.2 unit="percent" period="year-over-year"}
- 当前状态：:status[等待复核]{value="pending"}

:::risk{level="high" code="PAYMENT_DUPLICATE"}
检测到部分订单可能存在 **重复支付** 风险。

请检查：

1. 请求幂等键。
2. 支付流水号。
3. 订单状态更新时间。
:::

## 数据表

| 指标 | 本季度 | 同比 |
| --- | ---: | ---: |
| 收入 | 2400 万元 | 12.5% |
| 成本 | 1680 万元 | -3.2% |

## 示例代码

```ts
export function createIdempotencyKey(orderId: string): string {
  return `payment:${orderId}`;
}
```

详细数据参见 :citation[经营报告第 32 页]{id="report-q2" page=32}。

:action[重新生成报告]{name="regenerate" targetId="report-q2"}
````

---

## 23. React Playground 页面

React Demo 页面必须包含以下区域：

1. 顶部控制栏。
2. 渲染结果区。
3. 原始流文本区。
4. AST 查看区。
5. Patch 日志区。
6. Diagnostic 区。
7. Prompt 查看区。
8. Action/引用事件日志区。

控制项：

- 场景选择。
- 分片模式选择。
- 输出速度。
- StreamingMode。
- 开始。
- 停止。
- 重置。
- 是否显示 Pending 节点状态。
- 是否自动滚动。

要求：

- 使用 `EventSource` 连接后台。
- 收到 `delta` 后调用 Core Session 的 `push(text)`。
- 收到 `done` 后调用 `finish()` 并主动关闭 EventSource。
- 组件卸载时关闭连接。
- 页面展示当前连接状态和解析状态。
- Pending 节点通过轻微占位或状态标识体现，但不得频繁闪烁。

---

## 24. Vue Playground 页面

Vue Demo 功能和 React Demo 必须保持一致。

要求：

- 使用同一后台接口。
- 使用同一 `@semantic-md/example-protocol`。
- 使用同一场景和分片参数。
- 使用 `@semantic-md/vue`，禁止复用 React 组件。
- 页面控制项、调试区域和行为与 React Demo 基本一致。

不要求两个 Demo 的 CSS 完全相同，但语义节点的视觉含义必须一致。

---

## 25. 安全要求

### 25.1 默认禁止原始 HTML

输入中的 HTML 默认作为文本处理，不转换成真实 DOM。

### 25.2 URL 校验

只允许：

- `https:`
- `http:`
- 相对路径。

默认禁止：

- `javascript:`
- `data:`
- `vbscript:`
- 其他未知协议。

危险链接只能降级为不可点击文本，并产生 Diagnostic。

### 25.3 自定义属性

默认拒绝：

- `style`
- `class`
- `className`
- 所有 `on*` 事件属性。
- `innerHTML`
- `srcdoc`

### 25.4 Action

- 解析器不得执行 Action。
- Renderer 只能通过 `context.requestAction` 上报。
- Demo 只记录日志。

### 25.5 未知节点

默认使用 `children` Fallback，确保文本不丢失。

---

## 26. Diagnostic 结构

```ts
interface Diagnostic {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
  range?: {
    start: number;
    end: number;
  };
  nodeId?: string;
  raw?: string;
}
```

至少支持以下 code：

- `UNKNOWN_SEMANTIC_NODE`
- `INVALID_ATTRIBUTE_TYPE`
- `MISSING_REQUIRED_ATTRIBUTE`
- `UNTERMINATED_DIRECTIVE`
- `UNTERMINATED_CODE_FENCE`
- `UNTERMINATED_INLINE_MARK`
- `UNSAFE_URL`
- `FORBIDDEN_ATTRIBUTE`
- `STREAM_PARSE_RECOVERY`

---

## 27. 性能要求

1. 默认以约 16ms 为一个更新批次，合并高频小 chunk。
2. 每次更新只重解析当前活动尾部区域。
3. 已稳定前缀不得反复解析。
4. 稳定节点 ID 不变。
5. React/Vue 渲染时使用节点 ID 作为 key。
6. 代码块 Pending 时不执行高成本高亮。
7. 长文档场景下，追加尾部文本不得引起全部节点组件重新挂载。
8. 解析器必须支持至少 100KB Markdown 的正常演示。

MVP 不要求严格性能数值，但必须提供 benchmark 脚本或测试日志，证明不是每个字符全量解析整个文档。

---

## 28. 测试要求

### 28.1 Core 单元测试

覆盖：

- 完整 Markdown 解析。
- 标题流式追加。
- 列表流式追加。
- 代码块流式追加。
- 表格确认与逐行追加。
- 斜体/加粗 Provisional 与回退。
- InlineCode 回退。
- 自定义 Inline 节点。
- 自定义 Container 节点。
- 非法属性。
- 未知节点。
- 危险 URL。
- `finish()` 一致性。

### 28.2 随机分片测试

对每个场景执行：

```ts
parseMarkdown(fullContent)
```

与：

```ts
session.push(randomChunk1)
session.push(randomChunk2)
...
session.finish()
```

最终 AST 规范化后必须深度相等。

使用 fast-check 生成：

- 每字符分片。
- 固定长度分片。
- 随机长度分片。
- 在语法字符前后分片。

### 28.3 Patch 测试

验证：

- 文本追加优先产生 `append-text`。
- 新节点产生 `insert`。
- 表格候选转表格产生 `replace`。
- 节点完成产生 `stabilize`。
- 不产生无意义的全树 replace。

### 28.4 React 测试

验证：

- 标准 Markdown 渲染。
- 自定义组件渲染。
- Pending 状态 Props。
- Action 上报。
- 未知节点 Fallback。
- 稳定节点不重复卸载。

### 28.5 Vue 测试

覆盖与 React 相同的语义行为。

### 28.6 Server 测试

验证：

- SSE Header。
- meta/delta/done 事件顺序。
- chunkMode 行为。
- seed 可复现。
- 客户端断开后停止输出。

### 28.7 Playwright E2E

React 和 Vue 分别验证：

- 可以连接 SSE。
- 标题在流式过程中提前出现。
- 代码块在未闭合时已经可见。
- 表格在分隔行到达后出现，并逐行增加。
- 自定义 increase/risk 节点被对应组件渲染。
- 完成后状态变为 finished。
- malformed 场景不会导致页面崩溃。

---

## 29. 根目录脚本

根 `package.json` 至少提供：

```json
{
  "scripts": {
    "dev": "turbo run dev --parallel",
    "dev:server": "pnpm --filter playground-server dev",
    "dev:react": "pnpm --filter playground-react dev",
    "dev:vue": "pnpm --filter playground-vue dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "test:e2e": "playwright test",
    "typecheck": "turbo run typecheck",
    "lint": "turbo run lint",
    "format": "prettier --write ."
  }
}
```

包名可根据实际 npm scope 调整，但 workspace 依赖必须使用 `workspace:*`。

---

## 30. 环境变量

React/Vue：

```env
VITE_SSE_BASE_URL=http://localhost:4100
```

Server：

```env
PORT=4100
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
```

必须提供 `.env.example`。

---

## 31. 文档要求

根 README 必须包含：

1. 产品简介。
2. 架构图。
3. 环境要求。
4. 安装命令。
5. 启动命令。
6. React 使用示例。
7. Vue 使用示例。
8. 自定义协议示例。
9. SSE Demo 使用方式。
10. 测试命令。
11. 当前限制。

额外文档：

- `docs/architecture.md`：模块依赖和数据流。
- `docs/protocol.md`：自定义语法与 Schema。
- `docs/streaming.md`：Pending、Stable、Provisional、Patch 策略。
- `docs/api.md`：公共 API。

---

## 32. 开发阶段

### 阶段 1：Monorepo 与静态解析

完成：

- Workspace 初始化。
- Core 完整 Markdown 解析。
- Protocol 定义和校验。
- 统一 AST。
- 静态 React/Vue Renderer。

验收：完整字符串在 React/Vue 中渲染一致。

### 阶段 2：流式 Core

完成：

- Session API。
- 活动尾部解析。
- Pending/Stable/Provisional。
- Patch。
- 标题、列表、代码块、表格、强调、自定义节点流式处理。

验收：随机分片测试通过。

### 阶段 3：SSE Server

完成：

- 场景数据。
- Chunker。
- SSE 接口。
- 心跳、取消和错误处理。

验收：命令行和浏览器可持续接收事件。

### 阶段 4：React/Vue Playground

完成：

- 两个 Demo。
- 控制栏。
- 渲染、原始文本、AST、Patch、Diagnostic、Prompt、事件日志。

验收：两个 Demo 能使用相同参数连接同一后台并展示一致结果。

### 阶段 5：测试、文档和质量收尾

完成：

- 单元测试。
- 属性测试。
- 组件测试。
- E2E。
- README 和 docs。
- Lint、Typecheck、Build 全通过。

---

## 33. AI 编码执行规则

编码 AI 必须遵循：

1. 按阶段实现，但最终一次性交付完整仓库。
2. 每完成一个包，先运行该包的 typecheck 和 test。
3. 不得通过删除测试或降低断言绕过问题。
4. 不得用全量重新渲染伪装 Patch 能力。
5. 不得将 React/Vue Renderer 实现为 HTML 字符串注入。
6. 不得省略 malformed 场景、安全校验和随机分片测试。
7. 对暂时无法完整实现的优化，必须保留正确 API 和可运行的保守实现，并在 README 的限制中说明。
8. 所有 TODO 必须说明原因和后续方案，不允许留下无解释的空实现。
9. 提交结果前必须运行：

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

10. 最终输出必须包含：

- 完整目录树。
- 关键架构说明。
- 启动命令。
- 测试结果。
- 已实现能力。
- 已知限制。

---

## 34. 最终验收标准

项目只有同时满足以下条件才算完成：

- `pnpm install` 成功。
- `pnpm dev` 能同时启动 Server、React、Vue。
- React 与 Vue 都能接收 SSE。
- 标题在行结束前已经按标题结构展示。
- 代码块在闭合围栏前已经按代码块展示。
- 表格在表头分隔行到达后立即出现，后续数据行逐行增加。
- 斜体、加粗、行内代码支持 Pending/Provisional，并能在未闭合时正确回退。
- 自定义 Inline/Container 节点能在流式过程中展示。
- React/Vue 使用同一个协议和 Core AST。
- 未知节点、非法属性和危险 URL 不会造成崩溃或安全执行。
- 流式最终 AST 与完整解析 AST 等价。
- 随机分片测试通过。
- malformed 场景不丢文本、不重复文本、不打乱文本顺序。
- 所有 TypeScript、测试、构建和 E2E 命令通过。

---

## 35. 首版本已知合理限制

以下限制可以接受，但必须写入 README：

1. Markdown 某些语法天然需要向后观察，流式阶段只能提供 Provisional 结果，不能保证从第一个标记开始就永久稳定。
2. 表格必须等到分隔行出现后才能确认，但不需要等整个表格结束。
3. Setext Heading、复杂嵌套列表和极端 CommonMark 歧义可以先使用保守策略。
4. `finish()` 允许进行一次完整规范解析和最小协调，以保证最终正确性。
5. MVP 可以不提供代码高亮，但必须区分 Pending 和 Stable CodeBlock。

---

## 36. 一句话产品说明

> 让 AI 以可读 Markdown 输出内容，同时携带可校验、可流式解析、可由 React/Vue 自定义渲染的业务语义。
