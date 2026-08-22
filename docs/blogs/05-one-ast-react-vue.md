---
title: "一份 AST，同时服务 React 和 Vue"
description: "Semantic Markdown 如何保持 Core 框架无关，并用对称 Adapter 接入 React 与 Vue。"
tags: [React, Vue, AST, SDK Design, TypeScript]
series: "Semantic Markdown 设计与实现"
order: 5
---

# 一份 AST，同时服务 React 和 Vue

跨框架 SDK 很容易陷入一种表面复用：React 和 Vue 拥有相似 API，底层却各自解析一次
Markdown、实现一套安全策略、维护一套 Fallback。短期开发很快，长期一定发生行为漂移。

Semantic Markdown 采用另一种分层：Core 只产生框架无关数据 AST，React 和 Vue Adapter
只负责把同一语义映射为各自的元素系统。

这条边界决定了跨框架能力是否真正成立。

## Core 不知道 DOM、React 和 Vue

一个语义节点在 Core 中只是普通数据：

```ts
interface SemanticNode {
  id: string;
  type: "semantic";
  name: string;
  kind: "inline" | "block" | "container";
  status: "pending" | "stable" | "invalid";
  confidence: "confirmed" | "provisional";
  attributes: Record<string, unknown>;
  rawAttributes: Record<string, string>;
  validationErrors: Diagnostic[];
  children: MarkdownNode[];
  range: { start: number; end: number };
}
```

其中没有 `ReactNode`、`VNode`、DOM Element 或 CSS。Core 负责：

- Markdown 与 Directive 解析。
- Protocol 属性验证。
- URL 安全处理。
- 节点状态、置信度和稳定 ID。
- Snapshot、Diagnostics 与 Patch。
- 流式 Session 生命周期。

同一份文档送给不同 Renderer 时，语义判断已经完成，Adapter 不需要重新理解 Markdown。

## Renderer 是一个小型解释器

React 和 Vue 都对 `MarkdownNode` 做穷尽分派。

标准节点采用默认 HTML 语义：

```text
paragraph      → p
heading        → h1...h6
strong         → strong
codeBlock      → pre > code
list           → ul / ol
table          → table
```

调用方还可以通过 `markdownComponents` 替换标准节点。例如把 Heading 映射到设计系统的
Typography，把 Link 映射到应用路由组件。

语义节点则查询 Protocol 和 `components`：

```ts
const definition = getNodeDefinition(protocol, node.name);
const component = components[node.name];

const canRender =
  component &&
  node.status !== "invalid" &&
  (node.status !== "pending" || definition?.renderPending);
```

只有组件存在、节点有效，并且 Pending 策略允许时，Renderer 才调用业务组件。否则统一
进入 Fallback。

这段“是否允许渲染”的决策在 React 和 Vue 中保持一致，是跨框架语义一致性的关键。

## React：组件、children 与 Context

React 组件接收校验后的属性、状态、置信度、原始节点和受控 Context：

```tsx
function Risk({
  attributes,
  status,
  children,
  context,
}: SemanticComponentProps) {
  return (
    <aside
      className="risk-card"
      data-level={String(attributes.level)}
      data-status={status}
    >
      {children}
      <button
        type="button"
        onClick={() => context.resolveReference("risk-policy")}
      >
        查看制度
      </button>
    </aside>
  );
}
```

`SemanticMarkdownContext` 同时允许更深层的业务组件通过 Hook 获取 locale、Action、
Reference 和 Diagnostic 能力。

一次性内容可以直接传 `content`：

```tsx
<SemanticMarkdown
  content={answer}
  protocol={appProtocol}
  components={{ risk: Risk }}
/>
```

流式场景推荐先通过 `useSemanticMarkdown()` 得到 `document`，再交给 Renderer。这样
Session batching、状态和最终协调只发生一次。

## Vue：相同契约，原生 VNode

Vue Adapter 使用 `h()` 和 `createVNode()` 生成原生 VNode。语义组件收到相同 props，
Container 子内容通过默认 slot 传入：

```ts
const Risk = defineComponent({
  props: sharedSemanticProps,
  setup(props, { slots }) {
    return () =>
      h(
        "aside",
        {
          class: "risk-card",
          "data-level": props.attributes.level,
          "data-status": props.status,
        },
        slots.default?.(),
      );
  },
});
```

`semanticMarkdownContextKey` 通过 Vue provide/inject 暴露同一份渲染 Context。

流式输入由 `useSemanticMarkdown()` Composable 管理，返回 `document`、`patches`、
`diagnostics`、`status` refs，以及 `push/flush/finish/reset`。

框架 API 符合各自习惯，但核心数据契约保持一致。

## 稳定 key 比“少生成几个 VNode”更重要

每次 Session 更新都会得到新的 snapshot，Adapter 也会重新遍历文档并创建元素描述。当前
实现并不是拿 Patch 直接修改某个 React Element 或 Vue VNode。

真正保证组件连续性的是节点 ID：只要节点起始 offset 和类型不变，key 就不变。框架的
Reconciler 可以复用已经挂载的组件实例。

项目专门测试了一个语义组件从 Pending 进入 Stable 的过程：组件 mount 一次，状态变化时
不会 unmount。这对以下体验很重要：

- 用户正在聚焦卡片里的按钮。
- 组件内部维护展开/折叠状态。
- Pending 到 Stable 有连续动画。
- 引用组件保存已经加载的资料状态。

Patch 仍然有价值。它可以进入调试视图、性能统计、日志或未来的增量 Store；只是推广时应
准确表述为“Core 产生局部变化描述”，而不是“当前 Renderer 已完全由 Patch 驱动”。

## Fallback 必须跨框架一致

同一节点不能在 React 中保留 children、在 Vue 中静默删除。两端都支持五种 Fallback：

- `children`
- `raw`
- `remove`
- `blockquote`
- `error-component`

链接安全策略也必须一致：不安全 Link 只展示 children，不安全 Image 只展示 alt。

目前这些决策分别实现在两个 `renderNode` 文件中，代码结构高度对称。短期易读，长期存在
漂移风险。下一步适合把框架无关判断抽成共享描述：

```ts
resolveSemanticRender(node, protocol);
resolveLinkRender(node, urlPolicy);
getNodeRenderDescriptor(node);
```

Adapter 仍各自创建 React Element 或 Vue VNode，但不再复制业务决策。

## 自定义组件类型仍有提升空间

Protocol 已经能通过 `InferNodeAttributes` 推导单个节点属性，但组件表目前仍是：

```ts
type SemanticComponentMap = Record<string, SemanticComponent>;
```

这意味着 TypeScript 不能自动发现拼错的节点名，也不能让每个组件自动得到不同属性类型。

理想 API 可以是：

```ts
const components = defineSemanticComponents(appProtocol, {
  risk({ attributes }) {
    // 自动推导 level 和 code
  },
  status({ attributes }) {
    // 自动推导 value 枚举
  },
});
```

React 和 Vue 可以共享类型推导模型，再分别约束具体组件类型。

## Vue 侧的一个现实细节

当前 Vue 组件测试虽然通过，但测试日志会出现“组件对象被响应式化”以及未声明 props 向
原生元素透传的警告。应用侧可以通过完整声明 props、`markRaw` 组件表或 `shallowRef`
避免额外响应式开销。

SDK 后续也应该在类型、文档和组件接收方式上收紧这条路径。跨框架一致不只意味着结果
一样，也意味着两端都符合各自框架的性能和开发体验惯例。

## 为什么不把两个 Renderer 强行合成一个

React Element 与 Vue VNode 的创建方式、children/slot 模型、Context 注入和组件类型系统
并不相同。把所有代码抽象成一个“万能 Renderer”往往只会引入更复杂的适配 DSL。

更合适的边界是：

- Core 共享数据和解析。
- 共享纯粹的渲染决策。
- Adapter 保留框架原生元素创建方式。
- 业务组件遵循各自生态习惯。

跨框架的目标不是消除所有重复，而是确保真正重要的语义只定义一次。

## 结语

Semantic Markdown 的 React/Vue 支持并不是两套相似的 Markdown Renderer，而是同一份
Protocol、同一份 Core AST、同一套安全与降级语义之上的两个薄 Adapter。

这种分层让新的前端框架适配成为可控工作：实现节点到目标元素系统的映射，而不是重新实现
Parser、Streaming Session 和安全边界。

下一篇我们会把这些模块放回真实网络链路，从模型 Responses API 的文本增量开始，经过
SSE、浏览器解析、Session batching，一直走到 React/Vue 业务组件。

---

本文对应的主要实现位于
[React Renderer](../../packages/react/src/renderNode.tsx)、
[React Hook](../../packages/react/src/hooks/useSemanticMarkdown.ts)、
[Vue Renderer](../../packages/vue/src/renderNode.ts)和
[Vue Composable](../../packages/vue/src/composables/useSemanticMarkdown.ts)。
