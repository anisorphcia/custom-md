# 行业场景与视觉设计

本文说明 Playground 中的行业示例，以及如何把 Semantic Markdown 从“带颜色的富文本”
扩展成具有业务信息结构的文档界面。示例 Protocol 和场景文本位于
`packages/example-protocol`，React/Vue 组件分别位于对应 Playground。

## 场景总览

| 场景 key | 场景 | 主要 Directive | 文档设计隐喻 |
| --- | --- | --- | --- |
| `finance` | 财经 · 财报速览 | `financialMetric`、`guidance` | 研究报告与指标卡 |
| `medical` | 医疗 · 检验随访 | `clinicalResult` | 医院检验单 |
| `agriculture` | 农业 · 田间观测 | `fieldObservation` | 农艺师田间记录 |
| `manufacturing` | 制造 · 设备点检 | `machineInspection` | 设备铭牌与点检工单 |
| `security` | 安全 · 威胁调查 | `threatFinding` | 调查终端与证据链 |
| `incident` | 科技 · 线上事故 | `incident`、`risk` | 事故通报 |
| `research` | 科研 · 实验证据 | `evidence` | 研究证据卡 |
| `delivery` | 研发 · 项目交付 | `milestone` | 项目里程碑 |

运行 Playground 后，可以从“场景”下拉框选择示例，也可以直接请求模拟 SSE：

```text
GET /api/stream?scenario=medical&speed=20&chunkMode=syntax-boundary
GET /api/stream?scenario=agriculture&speed=20&chunkMode=syntax-boundary
GET /api/stream?scenario=manufacturing&speed=20&chunkMode=syntax-boundary
GET /api/stream?scenario=security&speed=20&chunkMode=syntax-boundary
```

## 医疗：检验随访

`clinicalResult` 将检验项目、数值、单位、参考区间和采样时间作为结构化属性，解释与
限制条件放在容器子内容中：

```md
:::clinicalResult{test="糖化血红蛋白" value=7.2 unit="%" reference="4.0–6.0" flag="high" collectedAt="2026-08-16 08:30"}
该指标高于本次报告参考区间，建议结合既往趋势由专业人员复核。
:::
```

属性：

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `test` | string | 检验项目名称 |
| `value` | number | 报告中的原始数值 |
| `unit` | string | 报告中的单位 |
| `reference` | string | 检验报告参考区间 |
| `flag` | `normal \| high \| low` | 相对本次参考区间的标记 |
| `collectedAt` | string | 采样或检验时间 |

组件采用检验单式分栏：主要读数、单位、参考区间和异常标记拥有不同的信息层级，而
不是只用红绿颜色区分。医疗解释必须保留数据来源和时间，不得由单项指标推导诊断，
也不得直接生成用药调整建议。

## 农业：田间观测

`fieldObservation` 用于表达一次可追溯的现场观测：

```md
:::fieldObservation{field="河西 7 号田" crop="夏玉米" stage="大喇叭口期" soilMoisture=16 condition="watch" observedAt="2026-08-19 06:45"}
西南角轻度卷叶，建议复测根层含水率并核查滴灌末端压力。
:::
```

属性：

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `field` | string | 地块标识 |
| `crop` | string | 作物 |
| `stage` | string | 生育期 |
| `soilMoisture` | number | 0–100 的实测土壤含水率 |
| `condition` | `optimal \| watch \| urgent` | 明确的处置状态 |
| `observedAt` | string | 观测时间 |

组件采用田间记录本结构，并把含水率渲染为环形仪表。实测数据、天气预测和操作建议应
保持分离，不能把模型估计值伪装成传感器或人工测量结果。

## 制造：设备点检

`machineInspection` 表达一个设备在某次点检中的明确读数和运行状态：

```md
:::machineInspection{asset="CNC-102" line="A-03" reading=86 unit="°C" state="attention" checkedAt="2026-08-19 07:40"}
主轴温度达到班组关注线，交班后应检查冷却液循环。
:::
```

属性：

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `asset` | string | 设备编号 |
| `line` | string | 生产线或工位 |
| `reading` | number | 实测读数 |
| `unit` | string | 读数单位 |
| `state` | `normal \| attention \| stop` | 运行、复核或停机状态 |
| `checkedAt` | string | 点检时间 |

组件采用工业铭牌、数字读数区和点检记录区。`stop` 只能来自明确的停机、锁定或安全
要求，Protocol 不允许模型自行发明设备阈值。

## 网络安全：威胁调查

`threatFinding` 表达安全调查证据链中的一个观察节点：

```md
:::threatFinding{incidentId="IR-2026-0819" severity="high" phase="lateral-movement" asset="prod-db-07" observedAt="2026-08-19 02:14 CST"}
检测到异常服务账号访问，相关凭据已轮换并隔离源主机。
:::
```

属性：

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `incidentId` | string | 事件编号 |
| `severity` | `critical \| high \| medium \| low` | 已确认的严重级别 |
| `phase` | enum | 攻击阶段或 `contained` |
| `asset` | string | 相关资产 |
| `observedAt` | string | 带时区的观察时间 |

支持的攻击阶段为 `initial-access`、`execution`、`persistence`、
`lateral-movement`、`exfiltration` 和 `contained`。组件使用终端式元数据区和纵向时间线
表达证据顺序；观察、推断和确认入侵必须使用不同措辞，不能虚构指标或资产。

## 设计分层

行业差异应由三个层次共同表达：

| 层次 | 职责 | 示例 |
| --- | --- | --- |
| Protocol | 定义业务语义、属性和约束 | `reference`、`soilMoisture`、`state` |
| React/Vue 组件 | 决定信息结构和交互 | 检验分栏、仪表、铭牌、证据链 |
| CSS/设计系统 | 决定排版、质感和响应式布局 | 纸张网格、斜切结构、终端背景 |

不要把 `style`、`class`、事件处理器或可执行表达式放入模型输出。若场景需要切换整份
文档的设计语言，可以由宿主应用根据受信任的场景状态设置 `data-scene`，再由样式表
选择对应视觉系统。

## 新增行业场景检查清单

1. 先定义业务对象和决策所需字段，再设计组件外观。
2. Protocol 中写清使用条件、禁止推断的内容和有效示例。
3. React/Vue 使用相同节点名和属性语义。
4. 为无组件、属性错误和 Pending 状态提供可读 fallback。
5. 完整解析后不应产生非预期 diagnostics。
6. 测试随机分片、桌面布局和窄屏布局。
7. 医疗、安全、法律等高风险场景必须保留来源、时间和人工复核边界。

具体接入步骤见[自定义 Protocol 接入指南](./custom-protocol.md)，语法规则见
[Protocol 参考](./protocol.md)。
