# @semantic-md/example-protocol

Playground 共用的内部示例 Protocol。它提供节点定义、模拟 Markdown 场景和推导出的
属性类型，不作为业务项目必须依赖的公共 SDK 发布。

## 目录职责

```text
src/protocol.ts   Protocol 节点、Schema、模型说明与安全约束
src/scenarios.ts  可复现的模拟 Markdown 内容、场景 key 与中文名称
src/types.ts      从 Protocol 推导出的节点属性类型
src/index.ts      包导出入口
```

React 和 Vue 组件不放在本包中。它们分别位于：

```text
apps/playground-react/src/semantic-components
apps/playground-vue/src/semantic-components
```

这样可以保证 Protocol 和场景文本与框架无关，并让两个 Playground 消费同一份语义。

## 主要导出

- `demoProtocol`：Playground 使用的完整 Protocol。
- `scenarios`：场景 key 到 Markdown 文本的映射。
- `scenarioLabels`：场景 key 到中文显示名称的映射。
- `getScenario(name)`：解析场景名并返回安全的默认场景。
- `ScenarioName`：所有场景 key 的联合类型。
- `*Attributes`：通过 `InferNodeAttributes` 推导的节点属性类型。

行业场景和 directive 示例见[行业场景与视觉设计](../../docs/industry-scenarios.md)。

## 新增节点

新增一个业务语义节点时，需要同步检查：

1. 在 `src/protocol.ts` 定义 kind、Schema、fallback、模型说明、约束和示例。
2. 在 `src/types.ts` 导出推导后的属性类型。
3. 在 React/Vue Playground 注册同名组件。
4. 在 `src/scenarios.ts` 增加至少一个完整、可流式分片的示例。
5. 如新增独立场景，将它加入 `scenarios` 和 `scenarioLabels`。
6. 验证完整解析 diagnostics 为零，并检查 Pending 和窄屏状态。

Protocol 属性只表达业务数据，不允许模型传入 `style`、`class`、事件处理器或 HTML。
视觉设计和业务 action 始终由受信任的宿主组件负责。

## 本地验证

从仓库根目录运行：

```bash
pnpm typecheck
pnpm test
pnpm build
```

启动 `pnpm dev` 后，可在 React/Vue Playground 中切换场景，或通过
`GET /api/scenarios` 查看服务端公开的场景列表。
