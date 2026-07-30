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
