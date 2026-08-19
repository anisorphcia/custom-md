export const basicScenario = `# 基础 Markdown

这是一段包含 **加粗**、*斜体* 和 [安全链接](https://example.com) 的文本。

- 第一项
- 第二项
- 第三项
`;

export const codeScenario = `# 代码示例

\`\`\`ts
export function greet(name: string): string {
  return \`Hello, \${name}\`;
}
\`\`\`

\`\`\`json
{"streaming": true}
\`\`\`
`;

export const tableScenario = `# 数据表

| 指标 | 本季度 | 同比 |
| --- | ---: | ---: |
| 收入 | 2400 万元 | 12.5% |
| 成本 | 1680 万元 | -3.2% |
`;

export const semanticScenario = `# 语义节点

- 收入：:increase[增长 12.5%]{value=12.5 unit="percent"}
- 成本：:decrease[下降 3.2%]{value=3.2 unit="percent"}
- 状态：:status[等待复核]{value="pending"}

:::risk{level="high" code="PAYMENT_DUPLICATE"}
订单可能存在 **重复支付** 风险。
:::

参见 :citation[第 32 页]{id="report-q2" page=32}。

:action[重新生成]{name="regenerate" targetId="report-q2"}
`;

export const financeScenario = `# 2026 年第二季度财报速览

## 核心经营指标

:::financialMetric{label="营业收入" value=2400 unit="currency" yoy=12.5 qoq=4.1 direction="up" sentiment="positive"}
收入同比增长主要由汽车业务交付放量与高端产品占比提升驱动。
:::

:::financialMetric{label="毛利率" value=21.3 unit="percent" yoy=1.8 qoq=-0.6 direction="down" sentiment="neutral"}
同比改善，但受季度促销与原材料价格波动影响，环比小幅承压。
:::

:::financialMetric{label="经营费用" value=386 unit="currency" yoy=9.2 qoq=-2.4 direction="down" sentiment="positive"}
研发投入保持增长，销售费用环比得到控制，费用率有所优化。
:::

:::guidance{period="2026 年下半年" stance="raised" confidence="medium"}
管理层上调全年交付指引，但提示新品爬坡、供应链与价格竞争仍可能影响利润率。
:::
`;

export const deliveryScenario = `# 支付平台交付周报

:::milestone{owner="支付基础设施组" due="2026-08-18" progress=86 state="on-track"}
幂等改造已完成全量压测，本周进入灰度发布。
:::

:::milestone{owner="渠道接入组" due="2026-08-15" progress=58 state="at-risk"}
两家外部渠道尚未完成验收；下一步由负责人确认补测窗口。
:::

:::milestone{owner="风控组" due="2026-08-12" progress=100 state="done"}
重复支付规则已上线，告警阈值完成复核。
:::
`;

export const incidentScenario = `# 线上事故通报

:::incident{severity="SEV-2" state="monitoring" startedAt="2026-08-11 09:42 CST" scope="华东区域约 7% 支付请求"}
渠道连接池耗尽导致支付超时。09:58 完成扩容，错误率已恢复基线；当前持续监控积压订单与重复扣款风险。
:::

:::risk{level="medium" code="ORDER_REPLAY"}
少量客户端自动重试可能触发重复下单，已启用幂等校验并启动账务核对。
:::
`;

export const researchScenario = `# A/B 实验结论

:::evidence{strength="strong" sample=1240 effect="+8.4%" confidenceInterval="95% CI 5.1–11.7%"}
新版结账流程显著提升支付转化率。实验随机分流且两组基线均衡，可以支持本次产品改动与转化提升之间的因果判断。
:::

:::evidence{strength="limited" sample=86 effect="-1.2%"}
高客单价用户的退款率略有下降，但样本量不足，暂不宜据此推广到全部用户。
:::
`;

export const medicalScenario = `# 代谢指标随访摘要

> 就诊目的：复核近三个月血糖控制情况。本页仅用于解释检验信息，不能替代临床诊断。

## 本次检验

:::clinicalResult{test="糖化血红蛋白" value=7.2 unit="%" reference="4.0–6.0" flag="high" collectedAt="2026-08-16 08:30"}
该指标反映近 2–3 个月平均血糖水平，本次结果高于检验报告参考区间。需要结合既往结果、用药和生活方式，由专业人员综合判断。
:::

:::clinicalResult{test="估算肾小球滤过率" value=92 unit="mL/min/1.73m²" reference="≥ 90" flag="normal" collectedAt="2026-08-16 08:30"}
本次结果位于报告参考范围内。单次结果不能替代连续趋势观察。
:::

## 随访要点

- 带上近三个月家庭血糖记录。
- 记录低血糖症状及发生时间。
- 不要根据本页内容自行调整药物剂量。

资料来源见 :citation[检验报告 LAB-0816]{id="lab-0816" page=1}。
`;

export const agricultureScenario = `# 夏玉米田间观测日报

观测批次 **AGR-0819-AM** · 无人机巡田与人工取样结果汇总

## 地块状态

:::fieldObservation{field="北坡 12 号田" crop="夏玉米" stage="大喇叭口期" soilMoisture=24 condition="optimal" observedAt="2026-08-19 06:20"}
叶色均匀，群体长势整齐；根层墒情满足当前生育期需求，维持现有巡检节奏。
:::

:::fieldObservation{field="河西 7 号田" crop="夏玉米" stage="大喇叭口期" soilMoisture=16 condition="watch" observedAt="2026-08-19 06:45"}
西南角轻度卷叶，表层墒情偏低。建议在下一次灌溉前复测 20 cm 土层含水率，并核查滴灌末端压力。
:::

## 今日农事窗口

未来作业重点是复核河西地块灌溉条件，避免仅凭表层观测扩大灌溉范围。

:action[查看地块巡检明细]{name="open-detail" targetId="field-survey-0819"}
`;

export const manufacturingScenario = `# A 线设备点检交接单

**班次：** 夜班 → 早班　　**工单：** WO-2026-0819-04

## 关键设备读数

:::machineInspection{asset="CNC-102" line="A-03" reading=86 unit="°C" state="attention" checkedAt="2026-08-19 07:40"}
主轴温度达到班组关注线。设备暂可空载运行，交班后应检查冷却液液位、循环泵和过滤器压差。
:::

:::machineInspection{asset="AIR-04" line="A-01" reading=0.68 unit="MPa" state="normal" checkedAt="2026-08-19 07:48"}
压缩空气主管压力稳定，排水器动作正常，未发现持续泄漏声。
:::

:::machineInspection{asset="GUARD-17" line="A-03" reading=0 unit="mm" state="stop" checkedAt="2026-08-19 07:55"}
安全门联锁销未完全复位。恢复生产前必须执行锁定挂牌并由维修与班组长共同确认。
:::

:action[打开维修工单]{name="open-detail" targetId="WO-2026-0819-04"}
`;

export const securityScenario = `# 安全事件调查简报

事件窗口：\`2026-08-19 01:52–03:10 CST\`　调查状态：:status[遏制后复核]{value="warning"}

## 证据链

:::threatFinding{incidentId="IR-2026-0819" severity="high" phase="initial-access" asset="vpn-gateway-02" observedAt="2026-08-19 01:52 CST"}
同一服务账号在不常见自治域完成认证。现有证据确认异常登录，但尚不能确认凭据获取方式。
:::

:::threatFinding{incidentId="IR-2026-0819" severity="critical" phase="lateral-movement" asset="prod-db-07" observedAt="2026-08-19 02:14 CST"}
数据库主机收到来自办公网终端的异常远程管理请求。源终端已隔离，服务账号凭据已轮换。
:::

:::threatFinding{incidentId="IR-2026-0819" severity="medium" phase="contained" asset="corp-ws-184" observedAt="2026-08-19 03:10 CST"}
EDR 隔离完成，当前未观察到新的横向连接。仍需核查 24 小时身份与数据库审计日志。
:::

## 下一步

1. 保全 VPN、身份平台与数据库审计日志。
2. 验证轮换后的服务账号仅保留必要权限。
3. 对相同指标执行全网回溯，不将“未命中”解释为“未受影响”。

:action[打开事件时间线]{name="open-detail" targetId="IR-2026-0819"}
`;

export const malformedScenario = `# 错误恢复

未闭合的 *斜体

:increase[非法属性]{value="not-number" unit="other" onClick="evil()"}

:not-registered[未知节点]{value=1}

[危险链接](javascript:alert(1))

:::risk{level="high"}
未闭合容器仍应保留内容。

\`\`\`ts
const pending = true;
`;

export const fullScenario = `# 2026 年第二季度经营分析

本报告用于演示 **标准 Markdown** 与 *自定义语义节点* 的流式渲染。

## 核心指标

- 营业收入：:increase[增长 12.5%]{value=12.5 unit="percent" period="year-over-year"}
- 运营成本：:decrease[下降 3.2%]{value=3.2 unit="percent" period="year-over-year"}
- 当前状态：:status[等待复核]{value="pending"}

:::risk{level="high" code="PAYMENT_DUPLICATE"}
检测到部分订单可能存在 **重复支付** 风险。

请检查：

1. 请求幂等键。
2. 支付流水号。
3. 订单状态更新时间。
:::

## 数据表

| 指标 | 本季度 | 同比 |
| --- | ---: | ---: |
| 收入 | 2400 万元 | 12.5% |
| 成本 | 1680 万元 | -3.2% |

## 示例代码

\`\`\`ts
export function createIdempotencyKey(orderId: string): string {
  return \`payment:\${orderId}\`;
}
\`\`\`

详细数据参见 :citation[经营报告第 32 页]{id="report-q2" page=32}。

:action[重新生成报告]{name="regenerate" targetId="report-q2"}
`;

export const longScenario = Array.from(
  { length: 300 },
  (_, index) =>
    `## 指标 ${index + 1}\n\n第 ${index + 1} 项数据：:increase[增长 ${index + 1}%]{value=${index + 1} unit="percent"}\n`,
).join("\n");

export const scenarios = {
  basic: basicScenario,
  code: codeScenario,
  table: tableScenario,
  semantic: semanticScenario,
  finance: financeScenario,
  delivery: deliveryScenario,
  incident: incidentScenario,
  research: researchScenario,
  medical: medicalScenario,
  agriculture: agricultureScenario,
  manufacturing: manufacturingScenario,
  security: securityScenario,
  malformed: malformedScenario,
  full: fullScenario,
  long: longScenario,
} as const;

export type ScenarioName = keyof typeof scenarios;

export const scenarioLabels = {
  basic: "基础 Markdown",
  code: "代码示例",
  table: "数据表格",
  semantic: "语义节点",
  finance: "财经 · 财报速览",
  delivery: "研发 · 项目交付",
  incident: "科技 · 线上事故",
  research: "科研 · 实验证据",
  medical: "医疗 · 检验随访",
  agriculture: "农业 · 田间观测",
  manufacturing: "制造 · 设备点检",
  security: "安全 · 威胁调查",
  malformed: "错误恢复",
  full: "完整能力演示",
  long: "长文档压测",
} as const satisfies Record<ScenarioName, string>;

export function getScenario(name: string | undefined): {
  name: ScenarioName;
  content: string;
} {
  const scenarioName: ScenarioName =
    name && Object.hasOwn(scenarios, name) ? (name as ScenarioName) : "full";
  return {
    name: scenarioName,
    content: scenarios[scenarioName],
  };
}
