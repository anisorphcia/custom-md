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
`replace`；状态完成使用 `stabilize`。React/Vue Adapter 订阅 Session 更新，所以输入
合并会同时减少解析、diff 和框架更新次数。
