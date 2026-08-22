---
title: "把 AI 输出当作不可信输入：Semantic UI 的安全边界"
description: "从 HTML、URL、属性、组件到 Action，拆解模型生成内容进入业务 UI 前的安全分层。"
tags: [AI Security, Markdown, Frontend, TypeScript]
series: "Semantic Markdown 设计与实现"
order: 4
---

# 把 AI 输出当作不可信输入：Semantic UI 的安全边界

只要一段内容来自模型，就不能因为它“看起来像 Markdown”而默认可信。

模型可能复述用户提交的恶意内容，可能在检索结果中读到提示注入，也可能因为协议理解错误
而生成危险 URL、事件属性或不存在的操作。即使模型本身没有恶意，输入链路中的任意一环
都可能把攻击文本带到浏览器。

因此 Semantic Markdown 从一开始就遵循一个原则：模型输出只是一份不可信的数据文档，
永远不是待执行代码。

## 先建立威胁模型

假设模型输出了这些内容：

```md
<img src=x onerror="stealCookies()">

[领取奖励](javascript:stealCookies())

:status[已完成]{class="admin" onclick="deleteAll()" value="success"}

:action[立即执行]{name="delete-all"}
```

需要分别回答四个问题：

1. HTML 会不会被注入 DOM？
2. 链接协议会不会执行脚本？
3. Directive 属性能不能进入组件样式和事件？
4. 一个看起来像 Action 的节点能不能直接改变业务状态？

如果只在最后增加一个 HTML sanitizer，后两个问题仍然没有答案。安全边界必须贯穿 Parser、
Protocol、AST、Renderer 和宿主应用。

## 第一层：只生成数据 AST，不编译模型代码

Core 基于 Markdown Parser 得到语法树，但不会把内容交给 `eval`、JSX 编译器或 Vue
Template Compiler。HTML 节点会被转换为普通 TextNode：

```text
模型输出 HTML
      ↓
Markdown AST 中的 html 节点
      ↓
Semantic AST 中的 text 节点
      ↓
React/Vue 正常文本转义
```

React Renderer 没有使用 `dangerouslySetInnerHTML`，Vue Renderer 也不使用 `v-html`。
即使文本中出现 `<script>` 或 `onerror`，最终也只是用户能够看到的一串字符。

这层设计牺牲了任意 HTML 的表现力，但换来一个很清晰的保证：AI 内容不能通过 HTML
进入执行路径。

## 第二层：URL 在进入 Link/Image AST 前校验

Markdown 链接本身也可能成为执行入口：

```md
[click](javascript:alert(1))
```

Core 在构造 LinkNode 和 ImageNode 前调用 URL 策略。当前默认允许：

- `http:` 和 `https:`。
- `/path`、`./path`、`../path` 等相对地址。
- `#anchor` 和 `?query`。
- 没有显式协议的普通相对值。

`javascript:`、`data:` 等其他显式协议会被拒绝。检测前还会移除 ASCII 控制字符和空白，
避免 `java\nscript:` 一类简单混淆。

不安全链接不会得到可用的 `url`，Renderer 只展示链接子内容；不安全图片则只展示 alt
文本，同时产生 `UNSAFE_URL` Diagnostic。

这里需要区分“不会执行脚本”和“没有任何网络风险”。HTTP 图片仍可能用于跟踪用户 IP、
请求巨大资源或访问浏览器所在网络能够到达的地址。因此生产版最好允许宿主分别提供 Link
和 Image Policy，并默认通过业务图片代理加载远程资源。

## 第三层：语义属性先过滤，再进入 Schema

Directive 看起来像组件属性，但它们不能直接展开到 React/Vue 元素上。

验证器先检查属性名，只允许以字母或下划线开头、由字母数字及 `-/_` 组成的名称，并按
大小写无关方式拒绝：

```text
style
class
className
innerHTML
srcdoc
所有 on* 属性
```

剩余属性才会进入 Protocol Schema。Schema 可以限制枚举、数字范围、必填项和字符串结构。
校验失败时，可信 `attributes` 为空，节点进入 invalid 状态并附带 Diagnostic。

重要的是，业务组件拿到的是 Schema 输出，而不是把模型原始属性原样透传到 DOM。

例如模型可以提供：

```md
:::risk{level="high" code="PAYMENT_DUPLICATE"}
...
:::
```

组件可以根据可信枚举自行选择 CSS：

```tsx
function Risk({ attributes, children }: SemanticComponentProps) {
  return (
    <aside className="risk-card" data-level={String(attributes.level)}>
      {children}
    </aside>
  );
}
```

class 是开发者写在可信组件里的，不是模型写进页面的。

## 第四层：非法内容也要安全降级

安全系统不能假设失败内容可以全部删除。对于报告、医疗说明或事故通报，直接丢掉非法节点
可能掩盖重要信息。

Protocol 因此把 Fallback 作为节点定义的一部分。风险容器可以降级为 Blockquote，状态
标签可以只展示 children，调试场景可以展示安全转义后的原始 Directive。

例如：

```md
:::risk{level="critical"}
支付渠道尚未完成验收。
:::
```

即使 `critical` 不在枚举中，用户仍能看到“支付渠道尚未完成验收”，应用同时收到
`INVALID_ATTRIBUTE_TYPE`。这是一种兼顾内容可用性和结构可信度的失败方式。

未知节点同样不会执行，也不会默认消失。Renderer 在缺少定义时优先保留可见子内容。

## 第五层：Action 是请求，不是命令

模型可以建议一个操作入口，但不能通过 Markdown 自动执行操作。

Action 节点只有在满足以下条件时才能产生业务请求：

1. Protocol 允许这个节点和属性。
2. 开发者注册了受信任组件。
3. 用户与该组件发生交互。
4. 组件通过 `requestAction()` 向宿主应用上报。
5. 宿主应用再次验证权限、目标和当前状态。

```tsx
function Action({ attributes, children, context }: SemanticComponentProps) {
  return (
    <button
      type="button"
      onClick={() =>
        context.requestAction({
          name: String(attributes.name),
          targetId: String(attributes.targetId),
        })
      }
    >
      {children}
    </button>
  );
}
```

`requestAction` 这个命名是有意的：它表达“请求宿主处理”，而不是“Parser 执行命令”。

当前 Action 类型仍然是字符串名称和 `Record<string, unknown>` 属性。后续适合把 Action
Schema 也纳入 Protocol，生成判别联合类型，但类型化永远不能替代运行时鉴权。

## Diagnostics 不应变成执行侧信道

Parser 会产生未知节点、非法属性、未闭合结构和不安全 URL 等 Diagnostics。这些数据适合
记录日志、展示开发调试面板或进入可观测系统。

但 Diagnostic 中可能包含模型原始片段。生产环境不应无条件把它写入公开日志，也不应把
用户输入和完整模型 Prompt 长期开启调试输出。诊断链路同样需要脱敏、采样和访问控制。

## 仍需补上的生产级防线

当前安全策略主要阻断代码执行和危险属性，但“不执行脚本”不等于“可以无限消费资源”。
恶意或异常模型输出还可能通过超长文本、极深结构、大量属性或长期不闭合的代码围栏消耗
CPU 和内存。

生产化时应该增加类似限制：

```ts
limits: {
  maxSourceLength: 1_000_000,
  maxChunkLength: 100_000,
  maxActiveTailLength: 100_000,
  maxNodes: 50_000,
  maxDepth: 100,
  maxAttributesPerNode: 50,
  maxDiagnostics: 1_000,
}
```

达到限制后要定义明确策略：停止解析、截断、回退纯文本，还是关闭当前流。限制事件也应该
通过结构化 Diagnostic 暴露，而不是让页面在内存耗尽后崩溃。

还需要继续完善：

- Link 与 Image 独立 URL Policy。
- Protocol 版本不匹配处理。
- Action 运行时 Schema 和权限接口。
- Diagnostic 脱敏策略。
- 对复杂 Markdown 的节点数、深度和解析时间预算。

## 结语

AI 内容安全不是一个布尔开关，而是一组相互衔接的边界：内容不编译、URL 先校验、属性先
过滤、Schema 再验证、失败可降级、Action 只能由可信宿主授权。

这组边界让模型可以参与 UI 表达，却不能拥有 UI 运行时的权限。

下一篇将转向跨框架设计：在不复制 Parser 的前提下，同一份 AST 和 Protocol 如何被 React
与 Vue 消费，以及稳定 ID、组件表和 Context 如何保持两端语义一致。

---

本文对应的主要实现位于
[URL 策略](../../packages/core/src/security/url.ts)、
[Protocol 验证器](../../packages/protocol/src/validator.ts)、
[React Renderer](../../packages/react/src/renderNode.tsx)和
[Vue Renderer](../../packages/vue/src/renderNode.ts)。
