---
title: "不要让 AI 写 JSX：我们为流式答案设计了一层 Semantic Markdown"
description: "为什么 AI 应用需要一种既可读、可流式，又可验证和安全降级的语义输出协议。"
tags: [AI, Markdown, TypeScript, Semantic UI]
series: "Semantic Markdown 设计与实现"
order: 1
---

# 不要让 AI 写 JSX：我们为流式答案设计了一层 Semantic Markdown

大模型很擅长写 Markdown。

它可以一边生成，一边输出标题、段落、列表、代码和表格；即使回答只完成了一半，用户
通常也能读懂已经出现的内容。这正是 Markdown 成为 AI 对话界面默认格式的重要原因。

但当 AI 产品从“聊天窗口”走向真正的业务工作台时，Markdown 很快会遇到边界：一个
财务指标应该显示同比和环比，一个风险应该突出等级和证据，一条引用应该打开内部资料，
一个操作按钮应该交给宿主应用授权执行。这些都不是加粗文字或引用块能够稳定表达的。

于是问题出现了：如何让模型输出业务 UI，又不让模型直接生成并执行代码？

我们的答案是 Semantic Markdown。

## Markdown、JSON 和 MDX 各自缺了什么

先看一个常见的风险提示：

```md
> 高风险：支付渠道的幂等校验尚未完成，可能产生重复扣款。
```

它对人类可读，但程序很难可靠地区分“高风险”是标题、等级还是普通文本，也无法知道风险
代码、证据和交互目标。

可以让模型输出 JSON：

```json
{
  "type": "risk",
  "level": "high",
  "code": "PAYMENT_DUPLICATE",
  "content": "支付渠道的幂等校验尚未完成……"
}
```

JSON 适合结构化调用，却不适合长篇、混合格式、逐 Token 展示的回答。只要括号或引号没有
闭合，整个对象就可能暂时不可用；在一个回答里混合解释、代码、表格和多个业务对象也会让
Schema 迅速膨胀。

另一条路是让模型生成 JSX、MDX 或 Vue Template。这确实足够灵活，但也把模型输出从
“数据”变成了“待执行代码”。事件处理器、表达式、组件属性和运行时权限随之进入攻击面。
对于不稳定且不可完全信任的模型输出，这是一个代价过高的交换。

我们希望保留 Markdown 的可读性和流式体验，同时只增加一层受约束的业务语义。

## Semantic Markdown 长什么样

同一条风险可以写成：

```md
:::risk{level="high" code="PAYMENT_DUPLICATE"}
支付渠道的幂等校验尚未完成，可能产生重复扣款。

建议在渠道验收前补充并发重试测试。
:::
```

这仍然是纯文本。它可以被保存、复制、审阅，也能在不认识 `risk` 的环境里保留核心内容。
区别在于，应用知道这是一个名为 `risk` 的 Container 节点，并且可以验证 `level` 和
`code`，再将它渲染成受信任的业务组件。

协议由开发者定义：

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
      constraints: ["Do not present speculation as established fact."],
    },
  },
});
```

这里没有允许模型传入任意组件名、CSS 或事件函数。模型只能使用 Protocol 中声明的节点和
属性；真正的布局、样式、可访问性和交互仍由宿主应用控制。

## 从模型输出到业务组件

完整链路可以概括为五步：

1. 开发者用 Protocol 声明业务语义。
2. SDK 根据 Protocol 生成模型可读的语法说明。
3. 模型输出标准 Markdown 和少量受约束的 Directive。
4. Core 将文本解析为框架无关 AST，并校验语义属性。
5. React 或 Vue Renderer 将合法节点交给开发者组件。

```text
Protocol → Model Prompt → Markdown Stream → Validated AST → Trusted Component
```

如果模型把 `level` 写成协议不存在的 `critical`，节点会被标记为 `invalid`，Renderer
按照 Fallback 展示其中的可见内容。如果当前应用没有注册 `risk` 组件，也仍然可以降级为
引用块。错误不会把整篇回答变成空白页。

## 为什么不直接要求模型调用工具

工具调用解决的是“让模型请求执行一个结构化动作”；Semantic Markdown 解决的是“让一篇
面向人阅读的回答同时携带可渲染业务语义”。二者并不冲突。

例如，模型可以在回答里输出风险卡片和资料引用，但真正的退款、删除、重试等操作仍应进入
受控的工具或业务授权链路。Semantic Markdown 中的 Action 只负责展示一个由用户主动点击
的入口，不代表模型已经执行了操作。

这条边界非常关键：回答可以丰富，权限不能外包给生成内容。

## 它不是低代码页面生成器

Semantic Markdown 有意限制自己的能力：

- 它不是所见即所得编辑器。
- 它不执行 JSX、Vue Template 或任意 HTML。
- 它不让模型控制 class、style 和事件处理器。
- 它不试图用一段回答描述整套应用页面。
- 它不绑定 SSE、WebSocket 或某一家 AI SDK。

它更像一层位于“自然语言”与“业务组件”之间的窄协议。正因为边界窄，Protocol 才能被
校验、测试、版本化和安全降级。

## 哪些场景值得使用

当回答中出现以下需求时，这种模式会很有价值：

- 财报、运营报告中的指标、趋势和管理层指引。
- 医疗、制造、农业中的结构化观测与谨慎解释。
- 安全事件、线上事故和研发交付中的状态与证据。
- 企业知识库中的内部引用和来源定位。
- 需要由宿主应用授权的“查看详情”“重新生成”等轻交互。

如果应用只展示简单聊天文本，成熟的 Markdown Renderer 已经足够。Semantic Markdown
真正解决的是“回答开始进入业务流程”之后的问题。

## 结语

我们没有尝试让模型成为前端工程师，而是让模型继续做它最擅长的事：输出清晰、连续、
人类可读的文本。开发者只为那些值得进入业务 UI 的内容增加一层可验证语义。

这带来一个更稳妥的分工：模型负责表达，Protocol 负责约束，Core 负责解析和校验，宿主
组件负责最终体验与权限。

下一篇将深入最棘手的部分：当 `:::risk`、代码围栏甚至一对 `**` 还没有生成完时，界面
如何尽早渲染，同时在流结束后回到正确的最终 AST。

---

本文是“Semantic Markdown 设计与实现”系列第一篇。项目架构和当前实现可参阅
[Semantic Markdown 仓库 README](../../README.md)。
