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
  malformed: malformedScenario,
  full: fullScenario,
  long: longScenario,
} as const;

export type ScenarioName = keyof typeof scenarios;

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
