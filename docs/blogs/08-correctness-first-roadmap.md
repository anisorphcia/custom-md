---
title: "正确性优先的 0.1.0：构建 AI 流式解析器的取舍与路线图"
description: "复盘 Semantic Markdown 从架构原型到 0.1.0 的工程选择、已经成立的保证、技术债与生产化路线。"
tags: [Engineering, Streaming, Parser, Open Source, Roadmap]
series: "Semantic Markdown 设计与实现"
order: 8
---

# 正确性优先的 0.1.0：构建 AI 流式解析器的取舍与路线图

开发一个流式解析器，最容易展示的是 Demo：模型不断输出文本，卡片逐步出现，React 和 Vue
页面看起来都很顺畅。

真正困难的是 Demo 之后的问题：任意 Chunk 边界是否会改变最终结果？一个节点进入稳定区后
Diagnostic 会不会消失？组件从 Pending 变成 Stable 时会不会重新挂载？未闭合代码围栏会
不会让性能持续恶化？协议版本升级后，旧内容还能不能安全展示？

Semantic Markdown `0.1.0` 的选择是先建立正确性和边界，再逐步追求更彻底的增量性能。

这篇文章不只总结已经完成的能力，也公开当前实现还没有解决的问题，以及从 Developer
Preview 走向生产可用版本的路线。

## 首先决定不做什么

项目启动时，一个诱人的方向是重新实现一套“天生支持流式”的 Markdown Parser。这样可以
完全控制状态机、节点 ID 和增量 Patch，看起来也最符合技术叙事。

但 CommonMark 和 GFM 的歧义远比标题、加粗和代码块复杂。列表松紧、缩进、引用、表格、
链接定义和行内标记之间存在大量边界条件。首个版本如果同时重写语法规范、设计业务协议和
适配两个框架，很难证明最终结果可信。

因此 0.1.0 明确采用成熟的 Unified/Remark 生态完成规范解析，在它之上增加：

- Directive 业务语义。
- 框架无关 AST 转换。
- Stable/Pending/Invalid 状态。
- Confirmed/Provisional 置信度。
- 稳定前缀和活动尾部。
- Diagnostics、Fallback 与安全策略。
- React/Vue Adapter。

这意味着项目没有重写 CommonMark，也不应该宣传成一套全新的 Markdown 语法引擎。它的
创新点位于 AI 流式状态、业务协议和安全渲染链路。

## 为什么 `finish()` 可以重新解析全文

纯粹的增量系统通常希望从第一个字符到最后一个字符都只处理变化范围。但在 0.1.0 中，
`finish()` 会对完整源文本执行一次规范解析。

这是一个有意的正确性协调点。

流式阶段允许局部结构暂时变化。例如一行表头在分隔行到达前只是 Paragraph，未闭合的
`**important` 可以暂时成为 Provisional Strong，打开的 Container 可能持续吸收后续
Markdown。要求每个中间状态都与“假设此刻已经结束”的完整解析完全一致，会失去提前展示
的价值。

更实用的契约是：

```text
流式期间：尽早可读，状态明确，变化范围可观察
流结束时：与完整字符串解析的语义结果一致
```

最终完整解析把复杂语法的裁决交回成熟 Parser，也为流式算法提供了明确的正确性基准。未来
即使边界扫描和局部 Diff 被大幅优化，这个基准仍然值得保留。

## 从“每个 Chunk 更新一次”到 Core 统一 Batching

早期实现中，React Hook 和 Vue Composable 各自收到一个网络 Chunk 就立即调用 Session，
并分别维护更新状态。这带来三个问题：

1. 高频小 Chunk 造成大量重复解析和框架更新。
2. 两个 Adapter 容易产生不同的 timer 和生命周期语义。
3. Core 的异步更新缺少统一出口。

现在 batching 被收敛到 Core Session：

```text
多个网络 Chunk
      ↓
Session pendingChunks
      ↓ 约 16ms 或显式 flush
合并文本
      ↓
一次解析、Diff 和 onUpdate
```

React 与 Vue 只消费 `onUpdate`，不再各自实现缓冲器。`batchInterval: 0` 保留给同步消费和
测试，`finish()` 会直接吸收尚未 flush 的内容。

这次调整的价值不只是性能。它把“一个 Session 对应一份文档和一个消费方”的所有权写进了
API，减少了重入、订阅清理和多监听器异常隔离等额外复杂度。

## Reset 与 Dispose 必须是两件事

流式 UI 很容易在生命周期边界丢数据：组件刚挂载就收到 Chunk，Strict Mode 重放 Effect，
切换 Protocol 时旧 timer 仍在运行，用户重置后上一个请求继续写入。

0.1.0 为 Session 定义了明确语义：

- `reset()` 面向仍然存在的消费方。它取消缓存、清空文档，并发送 `idle` 更新；version
  继续递增。
- `dispose()` 面向被卸载或替换的 Session。它静默、幂等且不可逆，释放 timer、buffer、
  快照和回调。
- `finish()` 正常结束当前文档；之后不能继续 push，除非 reset。

React Adapter 还专门处理了首次 Passive Effect 前写入 Chunk，以及 Strict Mode Effect
重放后重新创建已释放 Session 的情况。

这些细节不适合放在产品首页，却决定了 SDK 在真实应用里是否稳定。

## Diagnostics 也有生命周期

活动尾部会被反复解析。一条错误可能先出现在 Active Diagnostics 中，随后随着空行到达而
进入稳定前缀。如果只返回“本次活动尾部”的 Diagnostics，这条错误就会从调用方视图消失。

Session 现在分别维护：

```ts
stableDiagnostics;
activeDiagnostics;
```

稳定区间的诊断按身份去重并累计，活动尾部每次解析后替换。reset 清空两组状态，finish
则以完整规范解析的 Diagnostics 作为最终结果。

这说明流式系统中的错误不仅要“被发现”，还需要定义出现、稳定、去重、清理和最终协调的
生命周期。

## 测试重点不是快照数量，而是不变量

0.1.0 的测试覆盖 Core、Protocol、React、Vue 和演示服务。比单纯统计用例数量更重要的，
是几条明确不变量：

- 任意 Chunk 边界下，finish 结果与完整解析语义等价。
- Chunk batching 不丢内容、不改变顺序。
- 未 flush 的最后一段内容不会在 finish 时遗漏。
- 已稳定节点 ID 不因尾部追加而改变。
- 组件从 Pending 进入 Stable 时不重新挂载。
- 非法节点、属性、URL 和 HTML 不进入执行路径。
- Diagnostic 从 Active 进入 Stable 后不会消失或重复。
- reset 会发布空文档，dispose 不发布幽灵更新。

随机分片属性测试会用多组 Chunk 大小切分同一文档，并比较规范化 AST。这比只固定测试几个
“看起来合理”的网络分片更接近真实流式输入。

当前仓库还定义了 React/Vue Playground 的 Playwright 路径，覆盖正常流式场景和 malformed
恢复。持续集成环境仍需要确保浏览器依赖已经安装，并把这些端到端用例真正纳入发布门禁。

## 当前最重要的性能债

正确性基线建立后，下一步不是继续增加语法糖，而是让“增量”贯穿整条链路。

### 1. 稳定边界仍从文档开头扫描

Session 保存了 `stableBoundary`，但 `findStableBoundary(source)` 每次仍从 source 开头
开始。多次更新的累计扫描成本可能接近 O(n²)。

短期可以从已经稳定的 offset 开始扫描；长期需要有状态 Scanner，保存：

```ts
interface BoundaryScannerState {
  scanOffset: number;
  lastSafeBoundary: number;
  partialLine: string;
  fence?: { marker: "`" | "~"; length: number };
  containerDepth: number;
}
```

新 Chunk 到达时只扫描新增字符。即使一个代码围栏尚未闭合，Scanner 也不需要重新检查其中
已经看过的几万字符。

### 2. 通用 AST Diff 会访问完整树

`diffAst()` 从 root 开始递归，并通过 `JSON.stringify` 比较普通字段。稳定前缀即使完全
不变，也会被再次访问。

短期可以利用引用相等和稳定节点跳过子树；长期更适合由增量解析过程直接产生局部 Patch，
只协调新稳定区间和活动尾部。

### 3. Markdown Processor 每次重新创建

Parser 每次 Fragment 解析都会重新执行 Unified 插件配置。配置本身固定，理论上可以复用
Processor，但需要先验证当前调用方式是否具备安全的无状态复用条件。

### 4. 活动尾部没有资源上限

一个长期不闭合的代码围栏或 Container 会让 Active Tail 持续增长并反复解析。进入生产前
必须限制 source、单 Chunk、活动尾部、节点数、深度、属性数和 Diagnostic 数量。

性能优化的验收不应只看一次平均耗时，还应记录扫描字符总数、解析次数、Diff 节点数、框架
Commit、峰值内存、首内容时间和最终完成时间。

## Protocol 与类型系统还没有完全闭环

Protocol 已经能从 Schema 推导节点属性，但 Renderer 的组件表仍然是
`Record<string, SemanticComponent>`。调用方需要手动关联属性类型，TypeScript 也不能
检查拼错的节点名。

此外还有三项协议治理工作：

1. Prompt 生成器仍读取 Zod `_def` 等内部结构，需要显式元数据或 Schema Adapter。
2. Action 还是字符串名称和通用属性，需要纳入 Protocol 并生成判别联合类型。
3. Protocol version 还只是标签，需要兼容规则和客户端版本检查。

这些问题不影响当前 Demo，但会在大型业务协议、多团队协作和历史内容迁移时迅速放大。

## 安全边界还要覆盖资源和隐私

0.1.0 已经拒绝 HTML 执行、危险属性和非 HTTP/HTTPS 显式 URL，也只允许受信任组件请求
Action。

生产安全还需要继续扩展：

- 为不可信输入设置 CPU、内存和结构复杂度上限。
- Link 与 Image 使用不同策略。
- 远程图片默认经过代理，避免跟踪和内网资源访问。
- Diagnostic 和 Prompt 日志执行脱敏、采样与访问控制。
- Action 由宿主再次进行身份、权限、目标和状态校验。

安全不是 0.1.0 做完的一项功能，而是协议和运行时持续演进的约束。

## 推荐的四阶段路线图

### 第一阶段：完成流式主链路修正

- 从 stable boundary 开始增量扫描。
- 补齐低频流最大等待时间和 pending buffer 上限。
- 清理 Vue 组件响应式化和属性透传警告。
- 确保 Playwright 在 CI 中稳定执行。

### 第二阶段：实现真正增量化

- 有状态 Boundary Scanner。
- Active Tail 局部 Diff。
- Processor 安全复用。
- 建立性能矩阵和可解释的回归阈值。

### 第三阶段：强化类型和协议治理

- `defineSemanticComponents()` 端到端类型推导。
- Prompt 元数据与 Schema 私有结构解耦。
- 类型化 Action。
- Protocol 兼容和迁移策略。

### 第四阶段：生产安全与长期维护

- 输入和 AST 资源上限。
- 可注入的 Link/Image Policy。
- 抽取 React/Vue 共享渲染决策。
- 发布 CI、兼容测试、变更记录与长期 Benchmark。

这个顺序有一个核心原则：先修正整条热路径，再扩展公共 API；先建立兼容和资源边界，再扩大
节点生态。

## 每次优化都不能破坏什么

路线图不是简单的功能列表。无论实现怎样变化，都应该保留以下验收原则：

```text
1. 任意 Chunk 边界下，最终 AST 与完整解析语义等价。
2. 已稳定节点 ID 不因尾部追加而变化。
3. 非法输入永远不会执行模型代码。
4. React/Vue 对同一 AST 产生一致语义结果。
5. Batching 不丢 Chunk、不改变顺序。
6. 局部 Patch 应用后的结果与 Session snapshot 一致。
7. 性能优化同时具备正确性测试和最坏场景测试。
```

如果一项优化只能提高漂亮的平均数字，却让最终一致性难以证明，它不应该进入核心链路。

## 如何准确介绍 0.1.0

现阶段可以有把握地说：

- 它提供协议驱动的 AI Markdown 语义扩展。
- 它支持稳定前缀与活动尾部的流式解析策略。
- 它在 finish 时保证与完整解析语义收敛。
- 它把不可信模型输出转换为数据 AST，不执行生成代码。
- 它让 React 和 Vue 消费同一份 Core AST。
- 它提供 Diagnostics、Fallback、稳定 ID 和 Patch 描述。

暂时不应该说：

- 完整支持所有 CommonMark/GFM 结构。
- 已经实现严格 O(n) 的增量解析。
- Renderer 已由 Patch 直接驱动，只访问变化节点。
- 三种 Streaming Mode 已经具备三套不同策略。
- 不需要任何额外加固即可处理任意生产输入。

坦诚边界不会削弱一个开源项目，反而能让真正关心架构的使用者知道它解决了什么、接下来要
解决什么，以及哪些保证不会在优化中被牺牲。

## 结语

Semantic Markdown `0.1.0` 最重要的成果不是完成了多少节点，而是建立了一条可以继续演进
的主干：Protocol 约束模型，Core 解析不可信文本，Session 管理流式不确定性，React/Vue
渲染可信组件，finish 提供最终正确性基准。

它现在是一套正确性优先的 Developer Preview，而不是已经完成所有性能和治理工作的终点。

接下来的工作会更像真正的基础设施建设：有状态扫描、局部 Diff、资源预算、端到端类型、
协议兼容和持续性能回归。每一步都应该在已有不变量之上推进，而不是为了“更增量”重新引入
不可解释的状态。

对于 AI UI 基础设施，这或许是最值得坚持的取舍：先让结果可信，再让它更快；先明确权限，
再增加表达力；先建立边界，再扩大生态。

---

本文对应的详细评审和路线记录位于
[架构 Review 与优化路线](../architecture-review.md)，核心实现可参阅
[Streaming Session](../../packages/core/src/streaming/session.ts)、
[AST Diff](../../packages/core/src/patches/diff.ts)和
[Protocol 类型](../../packages/protocol/src/types.ts)。
