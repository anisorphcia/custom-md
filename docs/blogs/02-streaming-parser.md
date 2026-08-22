---
title: "稳定前缀与活动尾部：流式 Markdown 如何边生成边渲染"
description: "拆解 Semantic Markdown 的流式 Session、节点状态、Patch 和最终一致性设计。"
tags: [Markdown, Streaming, Parser, AST, TypeScript]
series: "Semantic Markdown 设计与实现"
order: 2
---

# 稳定前缀与活动尾部：流式 Markdown 如何边生成边渲染

一次性解析 Markdown 并不神秘：拿到完整字符串，交给 Parser，得到 AST，再渲染成页面。

AI 输出改变了这个前提。前端收到的不是完整文档，而是无法预测边界的文本增量：

```text
"# 支"
"付事故\n\n:::ri"
"sk{level=\"hi"
"gh\"}\n渠道"
```

Chunk 可能切在一个汉字后，也可能切在 Directive 名称、属性引号或代码围栏中间。网络
分片不理解 Markdown 语法，而 Markdown Parser 通常假设输入已经结束。

要做好流式渲染，需要同时满足两个看似冲突的目标：尽早展示已经生成的内容，以及最终
结果必须与完整文本解析一致。

## 最简单的方案为什么不够

一种实现方式是每收到一个 Chunk，就把所有文本重新解析一次：

```ts
source += chunk;
document = parseMarkdown(source);
```

它容易保证正确，却会不断访问已经确定的开头。假设模型逐字符输出长度为 n 的文档，累计
处理量可能接近 `1 + 2 + ... + n`。文档越长，前面完全不再变化的内容被重复计算得越多。

另一种方式是等待流结束后再解析。它性能简单，却失去了 AI 应用最重要的体验之一：用户
无法边生成边阅读。

Semantic Markdown 选择了中间路线：冻结已经稳定的前缀，只重新解析仍可能变化的尾部。

## 稳定前缀与活动尾部

Session 将当前源文本理解为两段：

```text
┌──────────────────────────────┬──────────────────────┐
│ stable prefix                │ active tail          │
│ 已越过安全边界，不再重新解析 │ 可能增长或改变解释   │
└──────────────────────────────┴──────────────────────┘
```

安全边界主要来自：

- 空行。
- 已换行的 ATX 标题。
- 已闭合的代码围栏。
- 已闭合的语义 Container。
- 独立 Block Directive 和部分明确的块级结构。

边界推进后，Session 只解析新稳定的区间并追加到 `stableNodes`。安全边界之后的文本作为
活动尾部重新解析。这样，前面的大部分 AST 可以保持不变，当前正在生长的段落、列表、代码
块或 Directive 仍能及时展示。

这不是完整的增量 CommonMark Parser，而是一种正确性优先、工程复杂度可控的局部重解析
策略。

## Chunk 先合并，再解析

真实模型可能在一个浏览器帧内产生许多很小的 Chunk。如果每个 Chunk 都触发解析、Diff
和框架状态更新，即使只处理活动尾部，也会制造大量无意义工作。

因此 `push()` 默认只把文本加入队列，约 16ms 后统一处理：

```ts
const session = createStreamingMarkdownSession({
  protocol,
  batchInterval: 16,
  onUpdate(update) {
    render(update.snapshot);
  },
});

session.push("# 支");
session.push("付事故");
session.push("\n");
```

三个网络 Chunk 可以只产生一次解析和一次 UI 更新。需要立即读取时可以调用 `flush()`；
测试或同步场景也可以设置 `batchInterval: 0`。

`finish()` 会直接吸收尚未 flush 的 Chunk，不需要先产生一次中间更新再产生完成更新。

## 结构状态和解析置信度是两件事

AST 为节点记录两组信息。

第一组是状态：

- `pending`：仍位于活动区域，后续输入可能让它继续增长。
- `stable`：已经越过安全边界，或流已经结束。
- `invalid`：语义节点未知、属性无效或语法 kind 与协议不符。

第二组是置信度：

- `confirmed`：当前文本已经为该结构提供明确语法依据。
- `provisional`：Parser 正在乐观解释尚未闭合的行内结构。

例如：

```md
这是 **非常重要
```

完整 Markdown Parser 通常会把未闭合的 `**` 当作普通文本。流式场景中，我们知道模型
很可能还没有输出结束符，于是可以暂时构造一个 `pending + provisional` 的 Strong 节点。

如果后续出现闭合符，它会变成确认结构；如果流直接结束，`finish()` 会让它回退为文本，
并报告 `UNTERMINATED_INLINE_MARK`。

这让“现在看起来像什么”和“最后确定是什么”可以同时被表达。

## 表格为什么会发生 Replace

GFM 表格是流式解析中很有代表性的歧义：

```md
| Name | Value |
```

只有第一行时，它只是一个普通段落。直到分隔行到达：

```md
| --- | ---: |
```

Parser 才能确认前一行是表头。AST 因此会从 Paragraph 变成 Table，产生 `replace`
Patch。后续数据行通常只需要 `insert`。

Semantic Markdown 定义了六种 Patch：

```text
insert        新节点出现
update        节点普通字段发生变化
append-text   文本只追加后缀
replace       节点结构解释发生变化
remove        节点消失
stabilize     节点从 Pending 进入 Stable
```

当前 React/Vue Adapter 接收的是完整 snapshot，并依靠稳定 key 完成框架协调；Patch 同时
暴露给调用方用于调试、观测和未来的局部更新扩展。它还不是直接驱动 Renderer 的指令流。

## 稳定 ID 为什么重要

节点 ID 由源文本起始 offset 和节点类型构成，例如：

```text
n-42-semantic
n-86-text
```

当尾部继续增长时，稳定节点的起始位置不会改变，因此 ID 也不会改变。React 的 key 和
Vue 的 VNode key 可以复用原有组件实例，避免一个风险卡片从 Pending 变成 Stable 时被
卸载再挂载。

这不仅影响性能，也影响组件内部状态、焦点、动画和用户交互的连续性。

## `finish()` 是正确性的协调点

流式阶段允许保守或乐观解释，但流结束后不应留下“可能正确”的结果。`finish()` 会对完整
源文本执行一次规范解析，并用最终 AST 协调之前的流式快照。

项目使用随机 Chunk 边界属性测试验证：无论同一段文本被切成怎样的 Chunk，结束后的
规范化 AST 都应与一次性解析完整字符串相同。

```ts
const streamed = session.finish().snapshot;
const complete = parseMarkdown(source);

expect(normalizeDocument(streamed)).toEqual(
  normalizeDocument(complete),
);
```

这个保证比“每个中间帧永远不会变化”更现实：AI 输出天生是不完整的，关键是中间状态可用、
变化范围可控、最终状态确定。

## 三种模式的当前边界

公共 API 提供 `conservative`、`balanced` 和 `optimistic`。当前实现中，
`conservative` 不构造 Provisional 行内节点，`balanced` 与 `optimistic` 都允许提前展示，
后二者尚未形成不同的策略。

因此现阶段更准确的理解是“保守”和“允许乐观行内解析”两档。未来可以根据结构风险、活动
尾部长度或 UI 稳定性，把 balanced 与 optimistic 真正区分开。

## 下一步：从局部重解析走向真正增量扫描

当前设计已经避免重复解析稳定节点，但稳定边界扫描仍会从文档开头开始，通用 AST Diff
也会遍历完整快照。很长的未闭合代码块或 Container 会让活动尾部持续增长。

下一阶段的优化方向包括：

- 保存代码围栏、Container 深度和扫描 offset 的有状态 Boundary Scanner。
- 只扫描新增字符，而不是重新扫描完整 source。
- 让 Diff 感知稳定前缀，跳过引用相同的子树。
- 复用固定配置的 Unified Processor。
- 为源文本、活动尾部、节点数和深度设置资源上限。

重要的是，这些优化不能破坏最终一致性和稳定 ID。对流式解析器而言，可证明的正确性应该
始终先于漂亮但缺少证据的性能数字。

## 结语

流式 Markdown 的难点不在于“反复调用 Parser”，而在于如何显式表达不完整、如何冻结
已经确定的结构，以及如何让最终结果回到规范语义。

稳定前缀、活动尾部、状态与置信度、Patch 和 `finish()` 共同构成了 Semantic Markdown
的核心状态机。下一篇我们将把视角从 Parser 转向 Protocol：一份协议如何同时约束模型、
校验属性、生成类型并控制组件降级。

---

本文对应的主要实现位于
[Streaming Session](../../packages/core/src/streaming/session.ts)和
[Markdown Parser](../../packages/core/src/parser/parseMarkdown.ts)。
