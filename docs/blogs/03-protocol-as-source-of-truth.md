---
title: "一份 Protocol，连接 Prompt、校验、类型与组件"
description: "用一个协议统一模型输出说明、运行时验证、TypeScript 类型和 UI 降级策略。"
tags: [AI, Protocol, Zod, TypeScript, Prompt Engineering]
series: "Semantic Markdown 设计与实现"
order: 3
---

# 一份 Protocol，连接 Prompt、校验、类型与组件

在一个典型 AI 应用里，同一套业务语义往往会被重复描述很多次：Prompt 告诉模型该输出
哪些字段，后端 Schema 校验数据，TypeScript 再声明一遍类型，前端组件又默认某些字段和
枚举存在。

这些副本一旦漂移，就会产生很难发现的问题：模型按照旧 Prompt 输出，Schema 已经升级；
组件支持 `medium`，Prompt 却只列出 `low/high`；属性改名后历史内容直接渲染失败。

Semantic Markdown 把 Protocol 设计成这条链路的单一事实来源。

## 从一个风险节点开始

```ts
import { defineProtocol } from "@semantic-md/protocol";
import { z } from "zod";

export const appProtocol = defineProtocol({
  version: "1.0.0",
  nodes: {
    risk: {
      kind: "container",
      schema: z.object({
        level: z.enum(["low", "medium", "high"]),
        code: z.string().optional(),
      }),
      fallback: "blockquote",
      renderPending: true,
      description: "Call out a material business risk.",
      usage: "A concrete downside or failure mode needs attention.",
      childrenDescription: "Evidence, impact and mitigation in Markdown.",
      outputPriority: "recommended",
      constraints: [
        "One container describes one distinct risk.",
        "Do not present speculation as established fact.",
      ],
      examples: [
        ':::risk{level="high" code="PAYMENT_DUPLICATE"}\nDetails\n:::',
      ],
    },
  },
});
```

这段定义同时包含机器可校验的 Schema，以及模型可理解的使用说明。视觉属性不属于
Protocol：没有颜色、class、栅格或点击函数，只有业务语义。

## 三种节点，覆盖三类表达

Protocol 支持三种 Directive：

```md
:status[等待复核]{value="pending"}

::chart{source="quarterly-revenue"}

:::risk{level="high"}
风险说明仍然可以包含 **标准 Markdown**。
:::
```

- Inline 嵌入普通段落，`[]` 提供可读标签。
- Block 是没有子内容的独立语义对象。
- Container 包含一段完整 Markdown，适合卡片、告警、证据和报告段落。

Parser 会检查实际语法 kind 是否与 Protocol 一致。使用 Inline 语法输出一个只允许
Container 的节点，不会悄悄当作合法结构通过。

## 同一份定义生成模型 Prompt

`generateProtocolPrompt(protocol)` 会遍历节点定义，生成：

- Protocol 版本和可用节点名。
- Inline、Block 或 Container 的正确语法。
- 属性类型、必填项和枚举值。
- 节点的使用条件和可见内容说明。
- 约束、正确示例和反例。
- 禁止事件属性、样式、表达式和危险 URL 的通用规则。

服务端可以这样组合 instructions：

```ts
const instructions = [
  "请使用简体中文回答。",
  "输出必须是可直接渲染的 Markdown。",
  "仅在业务条件成立时使用语义节点。",
  generateProtocolPrompt(appProtocol),
].join("\n\n");
```

自动生成部分负责“节点怎么写”，业务 Prompt 继续负责角色、语言、事实来源、回答目标和
风格。把两类指令分开，可以避免 Protocol 变成一个无所不包的超长系统提示。

## 从文本属性到可信属性

Directive 属性最初都是文本：

```md
:increase[增长 12.5%]{value=12.5 unit="percent"}
```

因此数字 Schema 通常使用 `z.coerce.number()`。验证器先过滤危险属性名，再把剩余属性
交给 Schema 的 `safeParse`。普通校验失败不会抛出异常，而是返回：

```ts
{
  valid: false,
  attributes: {},
  diagnostics: [
    {
      code: "INVALID_ATTRIBUTE_TYPE",
      severity: "error",
      message: "value: Expected number, received nan"
    }
  ]
}
```

AST 同时保留 `rawAttributes`、校验后的 `attributes` 和 `validationErrors`。这让调试界面
可以解释失败原因，而 Renderer 只把成功转换后的属性交给业务组件。

## Fallback 是协议的一部分

模型输出和历史文档不可能永远符合当前版本。一个成熟协议必须定义失败时用户看到什么。

| Fallback | 行为 | 适合场景 |
|---|---|---|
| `children` | 保留可见子内容 | Inline 标签和未知节点 |
| `raw` | 显示原始 Directive 文本 | 调试、开发者工具 |
| `remove` | 不展示该节点 | 无独立阅读价值的装饰节点 |
| `blockquote` | 把子内容降级成引用块 | 风险、说明、报告卡片 |
| `error-component` | 显示明确错误占位 | 编辑器和协议调试界面 |

以风险节点为例，即使客户端尚未安装新版卡片组件，用户仍能通过引用块读到风险内容。
协议升级不应轻易导致信息消失。

## Pending 是否值得提前渲染

`renderPending` 是 Protocol 对流式体验的声明。

对于状态标签，属性没有完整闭合前提前渲染可能带来跳变，可以保持关闭。对于风险容器，
开始标记和关键属性一旦有效，内部正文继续增长时通常可以提前展示，因此可以启用。

这不是全局 Parser 策略，而是每种业务语义自己的体验选择。

## 类型推导已经走到哪里

`defineProtocol` 保留具体节点和 Schema 类型，因此可以推导属性：

```ts
type AppProtocol = typeof appProtocol;
type RiskAttributes = InferNodeAttributes<AppProtocol, "risk">;
```

业务组件可以使用 `RiskAttributes`，避免手写第二份接口。

当前版本的 `SemanticComponentMap` 仍是 `Record<string, SemanticComponent>`，组件收到的
通用 `attributes` 默认是 `Record<string, unknown>`，因此还需要在组件处显式关联推导类型。
下一步可以提供 `defineSemanticComponents(protocol, components)`，让节点名和属性从
Protocol 端到端推导，并检查错误 key。

这也是一个很好的 API 设计原则：不要因为底层已经能推导类型，就宣称整条用户链路已经
完全类型安全。

## Schema 抽象与当前现实

Core 只依赖 `SchemaLike.safeParse`，并不直接导入业务 Zod Schema。这为未来支持其他
校验库留下了接口。

但当前 Prompt 生成器为了提取字段、枚举和可选性，会读取 Zod 的 `_def` 等内部结构。
因此运行时验证已经基本解耦，Prompt 元数据仍与 Zod 3 的实现细节绑定。

更稳妥的后续方案有两个：

1. 在 Protocol 中显式声明供模型阅读的属性元数据。
2. 为 Zod、Valibot 等 Schema 库提供独立 adapter。

这能让“可验证 Schema”和“模型说明”保持关联，又不依赖第三方库的私有对象布局。

## Version 不应只是一串字符串

Protocol 当前要求 `version` 非空，并会把它放进 Prompt 和 Playground SSE metadata。
但 Renderer 尚未检查服务端 Protocol 版本是否与客户端一致。

真正进入生产后，需要定义：

- 新增可选属性是否向后兼容。
- 新增节点如何被旧客户端降级。
- 删除、重命名和枚举缩减如何迁移。
- 版本不一致时是记录 warning、拒绝渲染还是继续 fallback。
- 历史 Markdown 使用新组件渲染时采用哪个版本。

只有建立这些规则，`version` 才能从标签变成协议治理工具。

## Protocol 的设计方法

一个好节点应该表达业务事实，而不是视觉指令。设计时可以连续问四个问题：

1. 什么条件成立时模型才能使用它？
2. 哪些属性来自明确事实，哪些绝不能由模型猜测？
3. 即使组件缺失，哪些内容仍必须对用户可见？
4. 这个节点是否会触发动作；如果会，最终授权由谁负责？

例如医疗结果需要保留数值、单位、参考区间和采样时间；不应该允许模型指定红色背景，也
不应该让它直接输出诊断或治疗操作。

## 结语

Protocol 的价值不只是“注册自定义标签”。它把 Prompt、校验、类型、流式渲染策略和错误
降级放在同一个可审阅、可测试的定义里。

这让 AI 输出从一段只能相信的文本，变成一份可以验证、可以观察、可以逐步演进的内容协议。

下一篇会继续讨论这条链路最重要的前提：为什么模型输出必须始终被当作不可信输入，以及
HTML、URL、属性、Action 和资源消耗分别应该在哪一层设防。

---

本文对应的主要实现位于
[Protocol 定义](../../packages/protocol/src/types.ts)、
[属性验证](../../packages/protocol/src/validator.ts)和
[Prompt 生成器](../../packages/protocol/src/prompt.ts)。
