---
title: "从模型 Token 到业务 UI：一次完整 SSE 链路拆解"
description: "从服务端模型流、SSE 事件到浏览器 Session 和 React/Vue 渲染的完整接入过程。"
tags: [SSE, AI SDK, Streaming, React, Vue]
series: "Semantic Markdown 设计与实现"
order: 6
---

# 从模型 Token 到业务 UI：一次完整 SSE 链路拆解

前几篇分别讨论了 Protocol、流式 Parser、安全边界和跨框架 Renderer。但在真实产品中，
它们不会孤立运行：服务端需要请求模型，模型产生事件流，HTTP 层需要转发，浏览器还要处理
取消、异常、半包和结束状态。

这一篇沿着 Playground 的完整链路，拆解一段模型文本如何最终变成 React 或 Vue 业务组件。

## 先明确传输层与解析层的边界

Core 的稳定输入契约只有一个：

```ts
session.push(markdownTextChunk);
```

它不认识 SSE event、OpenAI Responses event、WebSocket message 或某个前端 AI SDK 的对象。
调用方必须先从传输事件中提取“新增的纯文本”，再交给 Session。

```text
模型事件 → 服务端协议 → 浏览器传输解析 → 纯文本 Chunk → Core Session
```

这个边界看似增加了一点接入代码，却带来很重要的解耦：Core 不需要追随每一家模型 SDK 和
网络协议的版本变化，应用也可以自由替换 SSE、Fetch Stream、WebSocket 或
`AsyncIterable<string>`。

## 第一步：服务端使用同一份 Protocol 生成指令

服务端导入与前端相同的 Protocol：

```ts
import { demoProtocol } from "@semantic-md/example-protocol";
import { generateProtocolPrompt } from "@semantic-md/protocol";

const instructions = [
  "请使用简体中文回答。输出必须是可直接渲染的 Markdown。",
  "仅在有助于表达时使用 Semantic Markdown 节点。",
  "语义节点必须直接输出，禁止用代码块包裹。",
  generateProtocolPrompt(demoProtocol),
].join("\n\n");
```

这一点非常重要：如果模型和 Renderer 使用的不是同一份 Protocol，语法、枚举和组件版本
会自然漂移。

当前 Playground 会在 SSE metadata 中发送 `protocolVersion`，但客户端尚未强制比较。
生产接入应在这里增加版本不匹配告警或降级策略。

Prompt 应在服务端生成。把完整协议和模型凭据放在浏览器不仅暴露实现细节，也让攻击者更
容易绕过业务输入限制。

## 第二步：只转发模型的文本增量

OpenAI 兼容 Responses API 会产生多种事件。服务端只关心输出文本增量：

```ts
const stream = await client.responses.create({
  model,
  instructions,
  input: prompt,
  stream: true,
});

for await (const event of stream) {
  if (event.type === "response.output_text.delta") {
    writer.event("delta", { text: event.delta });
  }
}
```

Playground 使用四类 SSE 消息：

```text
meta     流 ID、来源、模型、Protocol 版本
delta    新增 Markdown 文本
done     正常完成和总字符数
failure  结构化错误代码与安全错误信息
```

一个简化响应如下：

```text
event: meta
data: {"streamId":"...","protocolVersion":"1.0.0"}

event: delta
data: {"text":":::risk{level=\"high\"}\n"}

event: delta
data: {"text":"支付渠道需要复核。\n:::"}

event: done
data: {"totalChars":42}
```

Writer 使用 `JSON.stringify` 构造 data 行，避免手工拼接对象。响应同时设置：

```text
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache, no-transform
X-Accel-Buffering: no
```

并定期发送 heartbeat comment，减少长时间没有文本时被中间层断开的概率。

## 第三步：服务端也需要生命周期管理

流式接口不是调用一次 `await` 就结束。它至少需要处理：

- 客户端主动关闭连接。
- 模型 API 超时。
- Key、Base URL 或模型未配置。
- 用户问题为空或超过长度限制。
- 上游额度和速率限制。
- 已关闭 Response 上继续写数据。

Playground 为每个请求创建 `AbortController`。Response close 时中止上游请求，并在 finally
中清理 heartbeat 和事件监听器。SSE Writer 会检查 `writableEnded` 和 `destroyed`，避免
向关闭连接继续写入。

示例服务还包含每 IP、每分钟的简单内存限流以及 8,000 字符问题长度限制。这些足够用于
本地演示，但生产环境应使用共享限流存储、身份维度配额、并发限制和更完善的审计。

## 第四步：浏览器正确处理 SSE 半包

Fetch 返回的 `ReadableStream` Chunk 同样不等于一条完整 SSE 消息。一个网络 Chunk 可能
包含半条 event，也可能同时包含多条 event。

客户端需要保留 buffer：

```ts
const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = "";

while (true) {
  const chunk = await reader.read();
  if (chunk.done) break;

  buffer += decoder.decode(chunk.value, { stream: true });
  const { events, rest } = extractSseEvents(buffer);
  buffer = rest;

  for (const event of events) {
    handleEvent(event);
  }
}
```

不要直接对每个网络 Chunk 调用 `JSON.parse`，也不要把整个 SSE `data:` 行推给 Markdown
Session。只有 `delta.data.text` 是 Markdown 新增文本。

对于简单 GET 模拟流，浏览器可以使用原生 `EventSource`；真实 AI 请求通常需要 POST
问题和认证信息，因此 Playground 使用 `fetch()` 读取响应流。

## 第五步：Session 吸收高频文本增量

React 中的核心接入可以缩减为：

```tsx
const stream = useSemanticMarkdown({ protocol: appProtocol });

async function run() {
  stream.reset();

  for await (const text of readTextChunks()) {
    stream.push(text);
  }

  stream.finish();
}

return (
  <SemanticMarkdown
    document={stream.document}
    protocol={appProtocol}
    components={semanticComponents}
  />
);
```

Vue 的流程相同，只是 `document` 等状态是 refs。

Session 会在内部合并约 16ms 内的 Chunk。调用方不需要为 React 和 Vue 分别实现 timer，
也不需要在网络层猜测怎样的 Chunk 大小最适合 Parser。

当收到 `done` 时必须调用 `finish()`。网络流自然结束但没有收到 `done`，应该视为异常，
因为上游可能在 Directive 或代码围栏尚未闭合时中断。

## 第六步：区分停止、重置与完成

几个相似动作有不同语义：

### `finish()`

正常结束当前文档，吸收缓存并执行最终规范解析。之后继续 `push()` 会抛错，除非先 reset。

### `reset()`

用户开始新一轮生成。它取消待处理 timer 和 Chunk，清空 AST 与 Diagnostics，并发送一个
`idle` 更新。Session version 继续单调递增。

### `dispose()`

组件卸载或配置变化时释放 Session。它静默、幂等且不可逆，不发送额外 UI 更新。

### Abort 网络请求

只停止 Fetch 或 EventSource，并不会自动决定当前 Markdown 是“正常完成”还是“被取消”。
应用需要明确产品语义：保留已经生成的 Pending 内容、调用 `finish()` 将其规范化，还是
直接 reset 清空。

把这几个生命周期混在一起，很容易出现旧 timer 更新新会话、取消后继续写入或最后一个
Chunk 丢失的问题。

## 第七步：同时观察原始流、AST、Patch 和 Diagnostic

Playground 没有只展示最终卡片，而是并排展示：

- Renderer 结果。
- 原始 Markdown 流。
- 当前 AST snapshot。
- 最近的 Patch。
- Diagnostics。
- Action 与 Reference 事件日志。

这是一种很实用的协议开发工具。看到组件不对时，可以快速判断问题来自：

- 模型没有遵循 Prompt。
- SSE 文本提取错误。
- Directive 尚未闭合。
- Schema 校验失败。
- Renderer 没注册组件。
- Fallback 或 Pending 策略不符合预期。

相比只在浏览器控制台打印字符串，多层可视化能显著降低语义协议的调试成本。

## 更换传输协议时什么不需要变化

如果未来改用 WebSocket，接入只需保证消息最终变成有序文本增量：

```ts
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === "delta") stream.push(message.text);
  if (message.type === "done") stream.finish();
};
```

如果 SDK 返回 `AsyncIterable<string>`：

```ts
for await (const text of modelTextStream) {
  stream.push(text);
}
stream.finish();
```

Protocol、Parser、AST、组件和安全策略都不需要变化。这正是让传输层停留在框架外的价值。

## 结语

一个可靠的 AI 流式 UI，不是把 `response.body` 直接拼到 `innerHTML`。完整链路需要明确：
谁生成协议、谁提取文本、谁处理半包、谁管理结束状态、谁验证属性，以及谁最终拥有业务
操作权限。

Semantic Markdown 把网络协议收敛为纯文本 Chunk，把不稳定文本收敛为可观察 AST，再把
合法语义交给受信任组件。每层只做一件事，替换模型或传输方式时不会牵动整个前端架构。

下一篇将离开基础设施层，讨论语义组件的产品价值：为什么医疗、农业、制造和安全场景不能
只用同一张卡片换四种颜色。

---

本文对应的示例实现位于
[OpenAI SSE 路由](../../apps/playground-server/src/routes/openai.ts)、
[SSE Writer](../../apps/playground-server/src/services/sseWriter.ts)、
[React Playground](../../apps/playground-react/src/App.tsx)和
[Vue Playground](../../apps/playground-vue/src/App.vue)。
