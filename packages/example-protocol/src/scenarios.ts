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

export const financeScenario = `# 2026 年第二季度财务与经营分析

> **分析口径**：人民币，金额单位为亿元；以下均为演示数据，不对应真实上市公司。

## 一、核心结论

:::financialInsight{title="盈利改善快于收入" tone="highlight" confidence="high"}
调整后净利润同比增长 28.4%，明显快于收入增速 12.5%；毛利率提升和费用杠杆是主要贡献。
:::

:::financialInsight{title="现金创造能力增强" tone="highlight" confidence="medium"}
经营现金流达到 32.8 亿元并覆盖资本开支，但部分改善来自应付账款增加，持续性仍需观察。
:::

:::financialInsight{title="主业仍受价格竞争影响" tone="pressure" confidence="medium"}
汽车分部毛利率环比下降 0.8 个百分点，促销和新品爬坡抵消了部分规模效应。
:::

## 二、关键指标总览

:::financialMetric{label="营业收入" value=240 unit="currency" currency="CNY" scale="hundred-million" yoy=12.5 qoq=4.1 direction="up" sentiment="positive"}
汽车交付放量与高端产品占比提升共同推动收入增长。
:::

:::financialMetric{label="调整后净利润" value=24.8 unit="currency" currency="CNY" scale="hundred-million" yoy=28.4 qoq=6.2 direction="up" sentiment="positive"}
利润增速快于收入，体现毛利改善与经营杠杆释放。
:::

:::financialMetric{label="研发投入" value=38.6 unit="currency" currency="CNY" scale="hundred-million" yoy=9.2 qoq=-2.4 direction="down" sentiment="neutral"}
研发投入保持同比增长，环比波动主要来自项目验收节奏。
:::

| 指标 | 本季度 | 上年同期 | 同比 | 上季度 | 环比 | 判断 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| 营业收入 | 240.0 亿元 | 213.3 亿元 | +12.5% | 230.6 亿元 | +4.1% | 稳健增长 |
| 调整后净利润 | 24.8 亿元 | 19.3 亿元 | +28.4% | 23.4 亿元 | +6.2% | 盈利弹性释放 |
| 毛利率 | 21.3% | 19.5% | +1.8pct | 22.1% | -0.8pct | 同比改善、环比承压 |

## 三、利润表拆解

营业收入 :periodComparison[增长 12.5%]{basis="yoy" direction="up" value=12.5 unit="percent" sentiment="positive"}，其中汽车业务是主要增量来源；本季度收入 :periodComparison[增长 4.1%]{basis="qoq" direction="up" value=4.1 unit="percent" sentiment="positive"}，增长斜率保持稳定。

综合 :marginChange[毛利率 21.3%]{metric="毛利率" current=21.3 change=1.8 basis="yoy" sentiment="positive"}，但汽车 :marginChange[分部毛利率 18.1%]{metric="汽车分部毛利率" current=18.1 change=-0.8 basis="qoq" sentiment="negative"}。这说明规模效应已经改善同比盈利，季度促销与新品爬坡仍造成短期压力。

:profitTransition[经营利润]{state="turn-profitable" previous="-1.6 亿元" current="3.2 亿元"}，但其中包含 0.7 亿元一次性收益；剔除该项目后，核心经营利润仍为正。

## 四、业务分部

:::segmentPerformance{label="智能电动汽车" share=46.8 yoy=32.4 margin=18.1 sentiment="positive"}
分部收入 112.3 亿元，交付增长与高端车型占比提升共同拉动收入；毛利率环比承压，是下一季度最重要的验证项。
:::

:::segmentPerformance{label="智能终端与服务" share=53.2 yoy=-1.2 margin=24.2 sentiment="neutral"}
分部收入 127.7 亿元，硬件需求偏弱，但服务收入占比提升稳定了整体利润率。
:::

## 五、现金流与资本配置

:::cashFlow{operating="32.8 亿元" free="20.4 亿元" capex="12.4 亿元" quality="adequate"}
自由现金流根据“经营现金流－资本开支”计算。经营现金流高于净利润，但应付账款增加贡献较多，现金转化质量尚可而非全面强劲。
:::

## 六、管理层指引与风险

:::guidance{period="2026 年下半年" stance="raised" confidence="medium"}
管理层上调全年交付指引；实现目标依赖新品产能爬坡，且没有同步上调利润率目标。
:::

:::risk{level="medium" code="MARGIN_PRESSURE"}
价格竞争和促销投入可能继续压制汽车分部毛利率。重点跟踪单车收入、单车毛利和促销强度。
:::

## 七、综合评价

本季度处于“收入稳健增长、盈利加速改善、现金质量仍待验证”的阶段。最强证据是净利润增速和同比毛利率改善，最大反证是汽车分部毛利率环比下降以及经营现金流对营运资金的依赖。
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
