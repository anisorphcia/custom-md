# Streaming Model

Session 保留完整源文本，但普通 `push()` 不重新解析已经稳定的节点。

`push(chunk)` 先缓存新增文本。默认约 16ms 后，Session 将窗口内的 chunk 合并并执行
一次 `streamingUpdate()`；`batchInterval: 0` 用于需要同步 flush 的场景。调用方也可以
用 `flush()` 立即处理缓存。`finish()` 会吸收尚未 flush 的文本并执行一次最终规范解析。

```text
stable nodes | active tail
```

安全边界推进后，原活动片段只解析一次并加入 stable nodes。剩余尾部可以局部重解析，
用于尽早展示标题、列表、引用、代码、表格候选和 Directive。`finish()` 执行完整解析，
并通过稳定 offset/type ID 产生尽可能小的协调 Patch。

## 状态与置信度

- `pending`：源结构仍可能增长。
- `stable`：块已经越过稳定边界或流已结束。
- `invalid`：协议或属性验证失败。
- `confirmed`：当前结构有明确语法依据。
- `provisional`：未闭合强调、行内代码或 Inline Directive 的乐观展示。

`conservative` 不建立 Provisional 行内节点；`balanced` 和 `optimistic` 允许活动尾部
提前展示。未闭合结构在 `finish()` 时回退为文本并报告 Diagnostic。

文本后缀优先产生 `append-text`；新节点使用 `insert`；候选段落确认成表格使用
`replace`；状态完成使用 `stabilize`。React/Vue Adapter 通过 Session 的 `onUpdate`
接收更新，所以输入合并会同时减少解析、diff 和框架更新次数。

## 更新、Reset 与 Dispose

一个 Session 对应一个更新消费方。Core 完成异步 flush 后调用构造参数中的
`onUpdate(update)`；需要 UI、日志或性能统计等多个副作用时，由调用方在这个回调内组合。
回调自身的同步异常属于消费方错误，不由 Core 分发或隔离。

`reset()` 会取消 timer 和尚未解析的 chunk，清空 snapshot 与 diagnostics，并通过
`onUpdate` 发送 `streamStatus: "idle"` 更新。reset 更新包含从旧 snapshot 到空文档的
patches；同一个 Session 的 `version` 始终单调递增。

组件卸载或 Session 配置变化时，React/Vue Adapter 调用静默的 `dispose()`。dispose
释放 timer、buffer、解析状态和更新回调，不发送 idle 更新；该操作可重复调用，但
dispose 后 Session 不可再次使用。
