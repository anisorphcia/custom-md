# 自定义 Protocol 接入指南

本文面向 SDK 调用方，完整说明如何定义业务语义、指导模型输出，并在 React 或 Vue
中渲染自定义组件。Playground 中的 `@semantic-md/example-protocol` 只是参考实现，业务
项目不需要依赖它。

## 接入流程

一次完整接入包含四部分：

1. 用 `defineProtocol` 声明模型可以输出的节点及其属性。
2. 用 `generateProtocolPrompt` 从同一份 Protocol 生成模型指令。
3. 编写与节点同名的 React 或 Vue 组件，并提供业务样式。
4. 将模型输出的纯文本 chunk 交给 SDK，渲染生成的文档。

Protocol 是单一事实来源：属性校验、TypeScript 类型和模型语法说明都应由它推导，
不要分别维护三份规则。

## 1. 安装依赖

React：

```bash
pnpm add @semantic-md/protocol @semantic-md/react zod
```

Vue 3：

```bash
pnpm add @semantic-md/protocol @semantic-md/vue zod
```

## 2. 定义业务 Protocol

以下示例定义一个行内状态和一个风险容器：

```ts
// src/semantic/protocol.ts
import { defineProtocol } from "@semantic-md/protocol";
import { z } from "zod";

export const appProtocol = defineProtocol({
  version: "1.0.0",
  nodes: {
    status: {
      kind: "inline",
      schema: z.object({
        value: z.enum(["pending", "success", "warning", "failed"]),
      }),
      fallback: "children",
      description: "Render the current workflow status.",
      usage: "A named task has an explicitly known current state.",
      childrenDescription: "A short, human-readable status label.",
      outputPriority: "optional",
      constraints: ["Do not infer a status that the source does not establish."],
      examples: [':status[等待复核]{value="pending"}'],
      antiExamples: [':status[状态不错]{value="good"}'],
    },
    risk: {
      kind: "container",
      schema: z.object({
        level: z.enum(["low", "medium", "high"]),
        code: z.string().optional(),
      }),
      fallback: "blockquote",
      renderPending: true,
      description: "Call out a material business risk.",
      usage: "A concrete downside, dependency, or failure mode needs attention.",
      childrenDescription: "Markdown describing evidence, impact, and mitigation.",
      outputPriority: "recommended",
      constraints: [
        "One container describes one distinct risk.",
        "Do not present speculation as established fact.",
      ],
      examples: [
        ':::risk{level="high" code="PAYMENT_DUPLICATE"}\n存在重复扣款风险。\n:::',
      ],
    },
  },
});

export type AppProtocol = typeof appProtocol;
```

三种节点对应三种输出语法：

```md
:status[等待复核]{value="pending"}

::chart{source="quarterly-revenue"}

:::risk{level="high" code="PAYMENT_DUPLICATE"}
容器内仍然可以使用标准 Markdown。
:::
```

- `inline`：嵌入段落，`[]` 是可见子内容。
- `block`：没有子内容的独立块。
- `container`：包含 Markdown 子内容的块，以 `:::` 闭合。
- `schema`：校验模型输出的属性；推荐对数字使用 `z.coerce.number()`，因为 Markdown
  属性最初来自文本。
- `fallback`：未知或校验失败时的降级方式，可选 `children`、`raw`、`remove`、
  `blockquote` 或 `error-component`。
- `renderPending`：流式输入尚未闭合时，是否提前渲染该节点。
- `description` 到 `antiExamples`：用于生成模型指令，不参与视觉渲染。

节点属性不允许 `style`、`class`、事件处理器或 HTML 注入。组件本身是受信任代码，
仍可正常使用 CSS class 和样式表。

## 3. 生成并发送模型 Prompt

`generateProtocolPrompt` 会根据节点 Schema 和说明生成语法、属性、约束与示例。应在
服务端将它加入模型的 system/developer instructions，而不是让浏览器自行拼接：

```ts
// server/ai.ts
import { generateProtocolPrompt } from "@semantic-md/protocol";
import { appProtocol } from "../src/semantic/protocol";

const instructions = [
  "请使用简体中文回答。输出必须是可直接渲染的 Markdown。",
  "仅在符合业务条件时使用 Semantic Markdown 节点，不要解释协议本身。",
  "语义节点必须直接输出，禁止用反引号或代码块包裹。",
  generateProtocolPrompt(appProtocol),
].join("\n\n");

// 将 instructions 和用户输入传给所使用的模型 API。
```

自动生成的部分负责“节点怎么写”，调用方补充的指令负责语言、角色、业务目标和输出
风格。Protocol 中应写清楚节点“何时使用”和“何时不能使用”，以避免模型为了展示
组件而滥用语义节点。

## 4. React：注册组件并渲染

组件表的 key 必须与 Protocol 节点名一致。组件会收到校验后的 `attributes`、子节点、
流式状态以及受控交互 context。

```tsx
// src/semantic/components.tsx
import type { InferNodeAttributes } from "@semantic-md/protocol";
import type {
  SemanticComponentMap,
  SemanticComponentProps,
} from "@semantic-md/react";
import type { AppProtocol } from "./protocol";

type StatusAttributes = InferNodeAttributes<AppProtocol, "status">;

function Status(props: SemanticComponentProps) {
  const attributes = props.attributes as StatusAttributes;
  return (
    <span className={`status status--${attributes.value}`} data-status={props.status}>
      {props.children}
    </span>
  );
}

function Risk({ attributes, children, status }: SemanticComponentProps) {
  return (
    <aside className="risk" data-level={String(attributes.level)} data-status={status}>
      {children}
    </aside>
  );
}

export const semanticComponents: SemanticComponentMap = { status: Status, risk: Risk };
```

样式由业务项目提供，Protocol 属性本身不能注入样式：

```css
.status {
  display: inline-flex;
  border-radius: 999px;
  padding: 0.125rem 0.5rem;
}

.status--success {
  color: #166534;
  background: #dcfce7;
}

.risk {
  border-inline-start: 4px solid #dc2626;
  padding: 0.75rem 1rem;
  background: #fef2f2;
}
```

在应用入口正常导入该 CSS，或使用项目已有的 CSS Modules、CSS-in-JS 或组件库。

已有完整字符串时直接渲染：

```tsx
import { SemanticMarkdown } from "@semantic-md/react";
import { appProtocol } from "./semantic/protocol";
import { semanticComponents } from "./semantic/components";

export function Answer({ content }: { content: string }) {
  return (
    <SemanticMarkdown
      content={content}
      protocol={appProtocol}
      components={semanticComponents}
      onDiagnostic={(diagnostic) => console.warn(diagnostic)}
      onAction={(action) => console.log(action)}
      onReference={(id) => console.log(id)}
    />
  );
}
```

流式输出使用 `useSemanticMarkdown`。传输层可以是 SSE、Fetch、WebSocket 或任意 AI
SDK；调用方只需提取新增的纯文本：

```tsx
import { SemanticMarkdown, useSemanticMarkdown } from "@semantic-md/react";

function StreamingAnswer() {
  const stream = useSemanticMarkdown({ protocol: appProtocol });

  async function run() {
    stream.reset();
    for await (const textChunk of readTextChunksFromYourTransport()) {
      stream.push(textChunk);
    }
    stream.finish();
  }

  return (
    <>
      <button onClick={run}>生成</button>
      <SemanticMarkdown
        document={stream.document}
        protocol={appProtocol}
        components={semanticComponents}
      />
    </>
  );
}
```

`push()` 会先缓存文本，并按 Session 的 `batchInterval` 合并解析。必须在正常流结束时
调用 `finish()`，它会吸收剩余缓存并执行最终规范解析。不要把 SSE 的完整 JSON 事件
传给 `push()`，只传其中的文本增量；需要立即处理缓存时可以调用 `flush()`。

## 5. Vue：注册组件并渲染

Vue 使用相同的 Protocol。组件接收 `attributes`、`status`、`confidence`、`node` 和
`context` props，容器子内容通过默认 slot 获取：

```ts
// src/semantic/components.ts
import type { SemanticComponentMap } from "@semantic-md/vue";
import { defineComponent, h, type PropType } from "vue";

const Status = defineComponent({
  props: {
    attributes: {
      type: Object as PropType<Record<string, unknown>>,
      required: true,
    },
    status: { type: String, required: true },
  },
  setup(props, { slots }) {
    return () =>
      h(
        "span",
        { class: ["status", `status--${String(props.attributes.value)}`] },
        slots.default?.(),
      );
  },
});

const Risk = defineComponent({
  props: {
    attributes: {
      type: Object as PropType<Record<string, unknown>>,
      required: true,
    },
    status: { type: String, required: true },
  },
  setup(props, { slots }) {
    return () =>
      h(
        "aside",
        {
          class: "risk",
          "data-level": String(props.attributes.level),
          "data-status": props.status,
        },
        slots.default?.(),
      );
  },
});

export const semanticComponents: SemanticComponentMap = { status: Status, risk: Risk };
```

```vue
<script setup lang="ts">
import { SemanticMarkdown, useSemanticMarkdown } from "@semantic-md/vue";
import { appProtocol } from "./semantic/protocol";
import { semanticComponents } from "./semantic/components";

const { document, push, finish } = useSemanticMarkdown({ protocol: appProtocol });
// 每个文本增量调用 push(text)，结束时调用 finish()。
</script>

<template>
  <SemanticMarkdown
    :document="document"
    :protocol="appProtocol"
    :components="semanticComponents"
    @diagnostic="console.warn"
  />
</template>
```

## 6. 交互、引用与诊断

自定义组件不能执行模型提供的代码。需要交互时，由受信任组件显式请求，再由宿主应用
决定如何处理：

```tsx
function Action({ attributes, children, context }: SemanticComponentProps) {
  return (
    <button
      onClick={() =>
        context.requestAction({
          name: String(attributes.name),
          attributes,
        })
      }
    >
      {children}
    </button>
  );
}
```

- `context.requestAction(...)` 对应 React 的 `onAction`、Vue 的 `action` 事件。
- `context.resolveReference(id)` 对应 React 的 `onReference`、Vue 的 `reference` 事件。
- Schema 错误、未知节点和解析恢复信息通过 diagnostic 回调/事件提供。

## 7. 接入检查清单

- Protocol 与组件表使用相同节点名。
- 每个节点都有合适的 fallback，不能假设模型输出永远有效。
- Prompt 使用 `generateProtocolPrompt(appProtocol)` 生成，避免手抄语法漂移。
- 模型只输出 Markdown 文本，传输事件由调用方转换为 text chunk。
- 流结束时调用 `finish()`。
- 组件只信任 Schema 校验后的属性，业务 action 仍由应用授权和执行。
- 至少测试一个正常示例、一个错误属性、一个未知节点和随机文本分片场景。

完整字段和底层 API 可继续参阅[协议说明](./protocol.md)、[公开 API](./api.md)和
[流式策略](./streaming.md)。
