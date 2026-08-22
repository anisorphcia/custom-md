# Semantic Markdown Blog 系列

这组文章面向正在构建 AI 问答、Copilot、行业助手和生成式工作台的产品与工程团队。
八篇文章从产品动机出发，逐步介绍流式解析、Protocol、安全边界、跨框架渲染、SSE
接入、行业组件设计，以及从 `0.1.0` 走向生产可用的工程路线。

## 系列目录

1. [不要让 AI 写 JSX：我们为流式答案设计了一层 Semantic Markdown](./01-why-semantic-markdown.md)
2. [稳定前缀与活动尾部：流式 Markdown 如何边生成边渲染](./02-streaming-parser.md)
3. [一份 Protocol，连接 Prompt、校验、类型与组件](./03-protocol-as-source-of-truth.md)
4. [把 AI 输出当作不可信输入：Semantic UI 的安全边界](./04-security-boundary.md)
5. [一份 AST，同时服务 React 和 Vue](./05-one-ast-react-vue.md)
6. [从模型 Token 到业务 UI：一次完整 SSE 链路拆解](./06-token-to-ui-sse.md)
7. [语义组件不是换主题色：四个行业场景的信息设计](./07-industry-semantic-components.md)
8. [正确性优先的 0.1.0：构建 AI 流式解析器的取舍与路线图](./08-correctness-first-roadmap.md)

## 推荐发布方式

- 前四篇按顺序发布，建立“为什么做、如何流式、如何定义协议、如何保证安全”的完整认知。
- 第五、六篇面向工程接入，适合配合 Playground 录屏或动图发布。
- 第七篇面向产品、设计与行业解决方案团队，适合使用医疗、农业、制造和安全四组截图。
- 第八篇适合作为阶段性工程复盘，公开已经成立的保证、当前技术债和后续里程碑。
- 所有文章统一使用 `risk` 节点作为贯穿案例，读者可以从概念一路追踪到组件实现。

文章描述的是仓库当前 `0.1.0` 实现。涉及性能和生产能力时，均明确区分已经实现的保证
与后续演进方向。
