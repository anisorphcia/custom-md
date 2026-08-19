# 架构 Review 与优化路线

本文从分层边界、流式算法、状态语义、类型系统、安全和可演进性六个方面评估
Semantic Markdown。它描述当前实现的优化方向，不代表已经实现的公共 API；实际能力
以 [API 文档](./api.md)和代码导出为准。

## 总体结论

框架的宏观方向合理，不需要推翻重建：

- Core 不依赖 React、Vue、DOM 或具体传输协议。
- Protocol 承载业务语义，Parser 不硬编码业务节点。
- React/Vue 消费同一份框架无关 AST。
- `finish()` 保证最终 AST 与完整字符串解析语义等价。
- 不可信 Markdown 只生成数据 AST，不执行 JSX、Vue Template、HTML 或模型 Action。
- fallback、diagnostic 和 pending/provisional/stable 状态适合处理 AI 输出的不确定性。

目前的主要短板是：增量设计尚未贯穿输入调度、边界扫描、diagnostics、AST diff 和
框架渲染整条链路。当前实现适合作为正确性优先的 MVP，继续承载长文本和高频流式输出
前，应优先完成下述优化。

## P0：流式主链路

### 1. 在输入侧合并 Chunk

实施状态：核心链路已完成，资源限制待补充。Core Session 统一缓存 chunk，React/Vue
通过单一 `onUpdate` 回调消费批量更新；相关行为由 Core 和两个 Adapter 的测试覆盖。
React 首次挂载会复用初始 Session，只在 Protocol、streaming mode 或 batch interval
变化时替换 Session，首次 passive Effect 前写入的 chunk 不会因 Session 替换而丢失。

此前 React/Vue hook 每收到一个网络 chunk，就立即调用 Session `push()`、解析、生成
Patch 并更新框架状态。优化后的 batching 统一放在 Core Session，React/Vue 只通过
Session 的 `onUpdate` 接收更新，不分别维护 timer 和 buffer。

目标链路：

```text
多个网络 chunk
    ↓
Core Session `pendingChunks`
    ↓ 每帧或每 16ms
合并后的 Markdown chunk
    ↓
Session push
    ↓
一次解析、diff 和框架更新
```

目标 Session API：

```ts
session.push(chunk): void; // 将文本加入队列
session.flush(): ParseUpdate | undefined;
session.finish(): ParseUpdate; // 吸收缓存并产生最终更新
session.reset(): void; // 清空并发送 idle 更新
session.dispose(): void; // 静默释放 timer、buffer 和回调
```

实现要求：

- 默认按约 16ms 或 `requestAnimationFrame` 合并。
- 支持 `batchInterval: 0`，用于同步消费和测试。
- `finish()` 必须吸收所有缓存；为避免结束时重复解析，不必先发出中间 streaming 更新。
- `reset()` 清理 timer 和 buffer，并通过 `onUpdate` 发送 idle 更新。
- 组件卸载和 Protocol 变化时调用 `dispose()`，静默释放旧 Session。
- 设置最大等待时间和最大 buffer 大小，避免低频流延迟过高或 buffer 无限增长。
- 明确 Core 和 hook 的 `push()` 不再同步返回本次解析结果，这是公共 API 语义变化。

#### Session 更新与释放生命周期

实施状态：已完成。一个 Session 对应一份流式文档和一个消费方，Core 通过构造参数中的
`onUpdate` 交付异步批量更新，不再提供一对多 `subscribe()`。

目标语义：

- `onUpdate` 依次接收 `streaming`、`finished` 和主动 reset 产生的 `idle` 更新。
- `reset()` 取消 timer 和未处理 chunk，发送携带空 snapshot、空 diagnostics 以及清理
  patches 的 idle 更新；同一个 Session 内的 `version` 继续单调递增。
- `dispose()` 是静默、幂等且不可逆的终止操作：释放 timer、buffer、解析状态与回调，
  不发送 idle 更新；dispose 后不允许继续 push、flush、finish 或 reset。
- React/Vue 在组件卸载或配置变化时 dispose 旧 Session；调用方主动 reset 时则统一依赖
  `onUpdate` 刷新状态。
- 回调中的多个业务副作用由调用方自行组合，Core 不承担 listener 分发和异常隔离职责。

单回调保留 Core 内部 batching 所需的异步结果出口，同时删除 listener Set、订阅快照、
重入通知队列和取消订阅管理，使 Session 的所有权与当前 Adapter 使用方式一致。

### 2. 增量计算稳定边界

当前 `findStableBoundary(source)` 每次从文档开头扫描。虽然 Session 保存了
`stableBoundary`，但扫描过程没有利用它，累计成本可能接近 O(n²)。

第一阶段先跳过已经稳定的前缀：

```ts
const relativeBoundary = findStableBoundary(source.slice(stableBoundary));
const nextBoundary = stableBoundary + relativeBoundary;
```

这个改动可以消除稳定前缀的重复扫描，但很长的未闭合代码块或 Container 仍会导致
active tail 被反复扫描。

第二阶段实现有状态的增量扫描器：

```ts
interface BoundaryScannerState {
  scanOffset: number;
  lastSafeBoundary: number;
  partialLine: string;
  fence?: {
    marker: "`" | "~";
    length: number;
  };
  containerDepth: number;
}
```

需要区分：

- `stableBoundary`：已经解析并冻结的位置。
- `scanOffset`：边界扫描器已经检查到的位置。

未闭合结构可能尚未稳定，但扫描器已经记住 fence/container 状态。新 chunk 到达时只
处理新增字符；闭合符到达后，再解析 `stableBoundary` 到新安全边界之间的内容。

### 3. 修复 Streaming Diagnostics 生命周期

实施状态：已完成。Session 分别维护 stable 和 active diagnostics；稳定区间只追加并按
诊断身份去重，active tail 每次重新解析后替换。`reset()` 清空两组状态，`finish()` 以
完整规范解析的 diagnostics 为最终结果。

优化前，稳定区间解析产生的 diagnostics 没有累计，返回结果只保留 active tail 的
diagnostics；错误进入稳定区后，可能从调用方视图中消失。

建议分别保存：

```ts
let stableDiagnostics: Diagnostic[] = [];
let activeDiagnostics: Diagnostic[] = [];
```

每次更新返回：

```ts
diagnostics: [...stableDiagnostics, ...activeDiagnostics]
```

同时定义 diagnostic 的去重与生命周期规则，避免 active → stable 时重复上报。

### 4. 让 AST Diff 感知稳定前缀

当前 `diffAst` 从 root 开始遍历完整 AST，并通过 `JSON.stringify` 比较普通字段。即使
只有 active tail 变化，也会重新访问所有稳定节点。

目标是利用 Session 已知的变化范围：

```text
stable nodes       不比较
new stable range   insert / stabilize
active tail        局部 diff
finish             允许一次完整协调
```

短期可以利用引用相等、节点状态或稳定节点 ID 跳过子树；长期应让增量解析过程直接产生
局部 Patch，而不是每次对两个完整 snapshot 做通用 diff。

## P1：Protocol 与公共 API

### 5. 分离 Schema 验证与 Prompt 元数据

Protocol 的验证接口只要求 Schema 提供 `safeParse`，但 Prompt 生成器会读取 Zod 的
`_def`、`typeName`、`shape` 和 `innerType` 等内部字段。这使得表面上的 `SchemaLike`
抽象仍然绑定 Zod 私有实现，并增加升级风险。

可选方案：

1. Protocol 显式声明供模型阅读的属性元数据。
2. 为不同 Schema 库提供 adapter，例如 `zodProtocolAdapter`。

示意：

```ts
metric: {
  schema: z.object({ value: z.coerce.number() }),
  attributes: {
    value: {
      type: "number",
      required: true,
      description: "Metric value supplied by the source",
    },
  },
}
```

Prompt 不应依赖第三方 Schema 的私有对象结构。

### 6. 让组件类型从 Protocol 端到端推导

当前 `SemanticComponentMap` 是 `Record<string, SemanticComponent>`，组件属性仍以
`Record<string, unknown>` 暴露。调用方需要手动转换，TypeScript 也不能检查错误节点名
或组件遗漏。

建议提供：

```ts
defineSemanticComponents(appProtocol, {
  status(props) {
    // props.attributes 自动推导为 status Schema 输出
  },
  risk(props) {
    // 自动推导 level/code
  },
});
```

底层类型可以基于：

```ts
type SemanticComponentMap<P extends SemanticProtocol> = {
  [K in keyof P["nodes"]]?: Component<
    SemanticComponentProps<InferNodeAttributes<P, K>>
  >;
};
```

### 7. 定义 Protocol 版本兼容策略

当前 Protocol 和 SSE meta 都包含版本，但 renderer 没有校验模型使用的版本是否与客户
端一致。需要明确：

- 模型、服务端和 renderer 分别使用什么版本。
- 版本不匹配时 warning、拒绝还是 fallback。
- 节点及属性的新增、弃用、删除和重命名规则。
- 历史 Markdown 使用新组件渲染时的迁移策略。

没有兼容规则时，`version` 只是标签，无法承担协议治理职责。

### 8. 将 Action 纳入类型化 Protocol

当前 Action 使用字符串名称和 `Record<string, unknown>` 属性，宿主应用不能获得判别
联合类型。建议为 Action 定义 Schema，并从 Protocol 推导请求类型：

```ts
actions: {
  regenerate: z.object({ targetId: z.string() }),
  openDetail: z.object({ targetId: z.string() }),
}
```

类型化不替代权限检查。任何 Action 仍只能由受信任组件请求，并由宿主应用授权执行。

## P2：性能、安全与工程质量

### 9. 复用 Markdown Processor

`parseMarkdownFragment()` 每次重新执行：

```ts
unified().use(remarkParse).use(remarkGfm).use(remarkDirective)
```

Processor 配置固定，可以在模块级构造并复用，减少高频解析中的对象和插件初始化成本。
实施前应验证 Unified Processor 在当前解析方式下可安全复用。

### 10. 收敛 React/Vue Renderer 的公共决策

两个 renderer 的节点分派、fallback、安全链接和 Semantic Component 判断逻辑高度相似，
长期可能发生行为漂移。

不必强行抽象 React Element 和 Vue VNode 的创建，但可以共享框架无关决策：

```ts
resolveSemanticRender(node, protocol)
resolveLinkRender(node, urlPolicy)
getNodeRenderDescriptor(node)
```

React/Vue Adapter 只负责把统一决策转换为各自的渲染节点。

### 11. 为不可信输入设置资源上限

除禁止脚本和危险属性外，还应防止异常模型输出造成 CPU 或内存消耗：

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

达到限制时应返回结构化 diagnostic，并定义停止解析、截断或纯文本 fallback 策略。

### 12. 区分 Link 与 Image 安全策略

HTTP/HTTPS 图片不会直接执行脚本，但浏览器加载远程图片仍可能暴露 IP、触发追踪、
请求巨大资源或访问用户网络可达地址。建议允许宿主分别注入：

```ts
urlPolicy: {
  link(url) {},
  image(url) {},
}
```

更保守的默认值可以禁止远程图片，或者要求通过业务图片代理。

### 13. 扩展 Benchmark 与性能回归保护

当前 benchmark 主要覆盖 100KB 文档和固定 256 字符分片，无法定位各阶段成本。建议
增加以下矩阵：

- 1、16、256 字符 chunk。
- 长段落、长未闭合代码块、长 Container、大表格和大量 Inline Directive。
- boundary scan、parse、diff、React/Vue render 分项计时。
- 峰值内存、实际 parse 次数和框架 commit 次数。

建议持续记录：

```text
总输入长度
网络 chunk 数
合并后的 push 数
扫描字符总数
解析次数
diff 节点总数
框架 commit 次数
首内容时间
最终完成时间
峰值内存
```

性能测试应设置可解释的回归阈值，而不只是打印一次运行结果。

## 推荐实施顺序

### 第一阶段：修正当前流式链路

1. Core Session 输入 batching，React/Vue 通过单一回调消费批量更新（已完成）。
2. 累积并去重 stable diagnostics（已完成）。
3. 收敛为单 `onUpdate`，明确 reset 通知和 dispose 生命周期（已完成）。
4. 从 `stableBoundary` 开始扫描。

### 第二阶段：实现真正增量化

1. 有状态 Boundary Scanner。
2. active-tail 局部 diff。
3. Processor 复用。
4. 建立性能 benchmark 矩阵和回归阈值。

### 第三阶段：强化 SDK 类型与协议治理

1. 泛型 Semantic Component Map。
2. Schema adapter 或显式 Prompt 元数据。
3. 类型化 Action。
4. Protocol 版本兼容策略。

### 第四阶段：生产安全与长期维护

1. 输入和 AST 资源上限。
2. 可注入的 Link/Image Policy。
3. 收敛 React/Vue 公共渲染决策。

## 验收原则

优化不能破坏以下现有保证：

- 任意 chunk 边界下，`finish()` 结果与完整字符串解析语义等价。
- 已稳定节点 ID 不因尾部追加而改变。
- 非法节点、属性、URL 和未闭合结构不会执行不可信代码。
- React/Vue 对同一 AST 和 Protocol 产生一致的语义结果。
- batching 不丢 chunk、不改变顺序，`finish()` 不遗漏尚未 flush 的内容。
- 增量扫描结果与从头执行边界扫描一致。
- 局部 Patch 应用后的 AST 与 Session snapshot 一致。

每项性能优化都应同时具备正确性测试、最坏场景测试和可重复 benchmark，避免以复杂度
换取缺乏证据的微小收益。
