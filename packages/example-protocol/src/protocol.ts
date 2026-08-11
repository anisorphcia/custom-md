import { defineProtocol } from "@semantic-md/protocol";
import { z } from "zod";

const trendSchema = z.object({
  value: z.coerce.number(),
  unit: z.enum(["percent", "currency", "count"]),
  period: z.string().optional(),
});

const comparisonSchema = z.object({
  label: z.string(),
  value: z.coerce.number(),
  unit: z.enum(["percent", "currency", "count", "ratio"]),
  currency: z.enum(["CNY", "USD", "HKD", "EUR"]).optional(),
  scale: z
    .enum(["unit", "thousand", "ten-thousand", "million", "hundred-million", "billion"])
    .optional(),
  yoy: z.coerce.number().optional(),
  qoq: z.coerce.number().optional(),
  direction: z.enum(["up", "down", "flat"]),
  sentiment: z.enum(["positive", "negative", "neutral"]),
});

export const demoProtocol = defineProtocol({
  version: "1.1.0",
  nodes: {
    financialMetric: {
      kind: "container",
      schema: comparisonSchema,
      fallback: "blockquote",
      renderPending: true,
      description: "Render a financial KPI card with period-over-period comparisons.",
      usage: "A financial report states a KPI value and at least one meaningful comparison.",
      childrenDescription: "A short professional interpretation of the metric and its drivers.",
      outputPriority: "recommended",
      constraints: [
        "Use yoy only for同比 and qoq only for环比; values are signed percentages.",
        "When unit is currency, provide both currency and scale so the displayed amount preserves the source unit.",
        "sentiment describes business impact, which may differ from numeric direction (for example, declining costs can be positive).",
        "Do not calculate or infer missing comparisons unless the source provides enough audited values.",
      ],
      examples: [
        ':::financialMetric{label="营业收入" value=240 unit="currency" currency="CNY" scale="hundred-million" yoy=12.5 qoq=4.1 direction="up" sentiment="positive"}\n汽车业务放量带动收入增长。\n:::',
      ],
    },
    financialInsight: {
      kind: "container",
      schema: z.object({
        title: z.string(),
        tone: z.enum(["highlight", "pressure", "watch"]),
        confidence: z.enum(["high", "medium", "low"]),
      }),
      fallback: "blockquote",
      renderPending: true,
      description: "Render a high-value financial conclusion as an executive insight card.",
      usage:
        "A report has a material, evidence-backed conclusion about growth, profitability, cash quality, or outlook.",
      childrenDescription:
        "A concise evidence → driver → business impact explanation, including at least one reliable figure.",
      outputPriority: "recommended",
      constraints: [
        "Use highlight for a proven strength, pressure for a proven weakness, and watch for a mixed or unresolved signal.",
        "Do not use this node for section introductions, generic commentary, or conclusions without quantitative evidence.",
        "confidence reflects evidence completeness, not rhetorical certainty.",
      ],
      examples: [
        ':::financialInsight{title="盈利改善快于收入" tone="highlight" confidence="high"}\n归母净利润同比增长 28.4%，快于收入增速 12.5%，主要受毛利率改善与费用杠杆驱动。\n:::',
      ],
    },
    periodComparison: {
      kind: "inline",
      schema: z.object({
        basis: z.enum(["yoy", "qoq"]),
        direction: z.enum(["up", "down", "flat"]),
        value: z.coerce.number().nonnegative(),
        unit: z.enum(["percent", "percentage-point"]),
        sentiment: z.enum(["positive", "negative", "neutral"]),
      }),
      fallback: "children",
      renderPending: true,
      description: "Render an explicit同比 or环比 change with direction and business impact.",
      usage:
        "A reliable figure explicitly states a year-over-year or quarter-over-quarter increase, decrease, or flat result.",
      childrenDescription:
        "Only the change phrase, such as 增长 12.5% or 下降 0.8 个百分点; the renderer adds同比/环比.",
      outputPriority: "recommended",
      constraints: [
        "value is always unsigned; direction carries up, down, or flat.",
        "Use percent for relative growth and percentage-point only for the absolute change of a rate.",
        "sentiment describes the business impact; declining expenses may be positive even though direction is down.",
        "Do not use this node when the comparison basis or numeric value is missing.",
      ],
      antiExamples: [
        ':periodComparison[增长明显]{basis="yoy" direction="up" value=0 unit="percent" sentiment="positive"}',
        ':periodComparison[同比增长 12%]{basis="qoq" direction="up" value=12 unit="percent" sentiment="positive"}',
      ],
      examples: [
        ':periodComparison[增长 12.5%]{basis="yoy" direction="up" value=12.5 unit="percent" sentiment="positive"}',
        ':periodComparison[下降 0.8 个百分点]{basis="qoq" direction="down" value=0.8 unit="percentage-point" sentiment="negative"}',
      ],
    },
    marginChange: {
      kind: "inline",
      schema: z.object({
        metric: z.string(),
        current: z.coerce.number(),
        change: z.coerce.number(),
        basis: z.enum(["yoy", "qoq"]),
        sentiment: z.enum(["positive", "negative", "neutral"]),
      }),
      fallback: "children",
      renderPending: true,
      description:
        "Render a margin or expense-rate level together with its percentage-point change.",
      usage:
        "A financial report provides the current gross margin, operating margin, net margin, or expense ratio and a comparable rate change.",
      childrenDescription: "The metric name and current level, such as 毛利率 21.3%.",
      outputPriority: "recommended",
      constraints: [
        "current is the current rate in percent and change is a signed percentage-point change.",
        "Never describe a percentage-point change as percent growth.",
        "Use a negative change for a decline; sentiment separately describes whether that change helps the business.",
      ],
      examples: [
        ':marginChange[毛利率 21.3%]{metric="毛利率" current=21.3 change=1.8 basis="yoy" sentiment="positive"}',
      ],
    },
    profitTransition: {
      kind: "inline",
      schema: z.object({
        state: z.enum(["turn-profitable", "turn-loss", "loss-narrowed", "loss-widened"]),
        previous: z.string().optional(),
        current: z.string().optional(),
      }),
      fallback: "children",
      renderPending: true,
      description: "Render a discrete profit/loss transition such as扭亏为盈 or亏损收窄.",
      usage:
        "Current and comparative profit figures establish a transition between profit and loss, or a change in loss magnitude.",
      childrenDescription: "The affected profit measure, such as 归母净利润 or 经营利润.",
      outputPriority: "recommended",
      constraints: [
        "Use turn-profitable only from loss to profit and turn-loss only from profit to loss.",
        "Use loss-narrowed or loss-widened only when both periods are losses and their magnitudes support the label.",
        "Preserve the disclosed amount and unit in previous/current; omit them rather than guessing.",
      ],
      examples: [
        ':profitTransition[归母净利润]{state="turn-profitable" previous="-3.1 亿元" current="8.2 亿元"}',
      ],
    },
    segmentPerformance: {
      kind: "container",
      schema: z.object({
        label: z.string(),
        share: z.coerce.number().min(0).max(100).optional(),
        yoy: z.coerce.number().optional(),
        margin: z.coerce.number().optional(),
        sentiment: z.enum(["positive", "negative", "neutral"]),
      }),
      fallback: "blockquote",
      renderPending: true,
      description: "Render the contribution and operating performance of a business segment.",
      usage:
        "A report discloses meaningful segment revenue share, growth, margin, or operating drivers.",
      childrenDescription:
        "Segment revenue or operating KPI, the growth driver, profit contribution, and an analytical conclusion.",
      outputPriority: "recommended",
      constraints: [
        "share and margin are percentage levels; yoy is a signed growth percentage.",
        "Omit an unavailable stat instead of estimating it.",
        "Use one card per material segment and avoid cards for immaterial line items.",
      ],
      examples: [
        ':::segmentPerformance{label="智能电动汽车" share=18.6 yoy=32.4 margin=18.1 sentiment="positive"}\n分部收入 446 亿元，交付增长与高端车型占比提升共同拉动收入。\n:::',
      ],
    },
    cashFlow: {
      kind: "container",
      schema: z.object({
        operating: z.string(),
        free: z.string().optional(),
        capex: z.string().optional(),
        quality: z.enum(["strong", "adequate", "weak"]),
      }),
      fallback: "blockquote",
      renderPending: true,
      description: "Render cash generation, capital expenditure, and free-cash-flow quality.",
      usage:
        "A report provides operating cash flow and enough context to judge its relationship with profit or investment.",
      childrenDescription:
        "Explain the gap between profit and operating cash flow, the free-cash-flow formula, and sustainability.",
      outputPriority: "recommended",
      constraints: [
        "Preserve disclosed amount signs, currencies, and scales in the string attributes.",
        "If free cash flow is calculated, state the exact formula and label it as calculated in the content.",
        "quality must be based on cash conversion and sustainability, not on financing inflows.",
      ],
      examples: [
        ':::cashFlow{operating="128 亿元" free="76 亿元" capex="52 亿元" quality="strong"}\n经营现金流覆盖资本开支；自由现金流按“经营现金流－资本开支”计算。\n:::',
      ],
    },
    guidance: {
      kind: "container",
      schema: z.object({
        period: z.string(),
        stance: z.enum(["raised", "maintained", "lowered"]),
        confidence: z.enum(["high", "medium", "low"]),
      }),
      fallback: "blockquote",
      description: "Render management guidance or an earnings outlook.",
      usage:
        "Management provides an explicit forward-looking target, range, or directional outlook.",
      childrenDescription:
        "The guidance, assumptions, and uncertainty in professional financial language.",
      outputPriority: "recommended",
      constraints: [
        "Separate guidance from historical results.",
        "Do not turn analyst speculation into management guidance.",
      ],
      examples: [
        ':::guidance{period="2026 H2" stance="raised" confidence="medium"}\n管理层上调交付指引。\n:::',
      ],
    },
    milestone: {
      kind: "container",
      schema: z.object({
        owner: z.string(),
        due: z.string(),
        progress: z.coerce.number().min(0).max(100),
        state: z.enum(["on-track", "at-risk", "blocked", "done"]),
      }),
      fallback: "blockquote",
      description: "Render a project milestone with ownership, due date, and progress.",
      usage: "A delivery milestone has an explicit owner, deadline, progress, and state.",
      childrenDescription: "Milestone scope, current result, and next step.",
      outputPriority: "recommended",
      constraints: [
        "progress must be 0 through 100.",
        "Use blocked only when a concrete dependency prevents progress.",
      ],
      examples: [
        ':::milestone{owner="支付组" due="2026-08-30" progress=72 state="at-risk"}\n联调等待渠道验收。\n:::',
      ],
    },
    incident: {
      kind: "container",
      schema: z.object({
        severity: z.enum(["SEV-1", "SEV-2", "SEV-3", "SEV-4"]),
        state: z.enum(["investigating", "identified", "monitoring", "resolved"]),
        startedAt: z.string(),
        scope: z.string(),
      }),
      fallback: "blockquote",
      renderPending: true,
      description: "Render an operational incident briefing.",
      usage:
        "A production incident has a known severity, lifecycle state, start time, and impact scope.",
      childrenDescription: "Impact, evidence, mitigation, and latest update without speculation.",
      outputPriority: "recommended",
      constraints: [
        "Use the supplied severity; never escalate it for emphasis.",
        "Keep timestamps explicit and preserve their timezone.",
      ],
      examples: [
        ':::incident{severity="SEV-2" state="monitoring" startedAt="2026-08-11 09:42 CST" scope="华东支付请求"}\n错误率已恢复，持续观察。\n:::',
      ],
    },
    evidence: {
      kind: "container",
      schema: z.object({
        strength: z.enum(["strong", "moderate", "limited"]),
        sample: z.coerce.number().int().positive().optional(),
        effect: z.string().optional(),
        confidenceInterval: z.string().optional(),
      }),
      fallback: "blockquote",
      description: "Render a research finding with evidence quality and statistical context.",
      usage:
        "A research or experiment result needs its evidence strength and quantitative context surfaced.",
      childrenDescription: "The finding, method limitations, and what can or cannot be concluded.",
      outputPriority: "recommended",
      constraints: [
        "Do not claim causality for observational evidence.",
        "Preserve sample size, effect, and confidence interval exactly when provided.",
      ],
      examples: [
        ':::evidence{strength="strong" sample=1240 effect="+8.4%" confidenceInterval="95% CI 5.1–11.7%"}\n实验组转化率显著提升。\n:::',
      ],
    },
    increase: {
      kind: "inline",
      schema: trendSchema,
      fallback: "children",
      renderPending: true,
      description: "Render a positive business metric.",
      usage: "A reliable numeric metric increased relative to an explicit baseline or period.",
      childrenDescription: "A concise human-readable metric including direction and value.",
      outputPriority: "recommended",
      constraints: [
        "Use only when the source contains a specific numeric increase; never invent a value.",
        "value must be an unsigned number; express direction in the visible text, not with a negative value.",
        "unit must match the visible value and period should identify the comparison basis when known.",
      ],
      antiExamples: [
        ':increase[增长明显]{value="明显" unit="percent"}',
        ':increase[下降 3%]{value=3 unit="percent"}',
      ],
      examples: [':increase[增长 12.5%]{value=12.5 unit="percent" period="year-over-year"}'],
    },
    decrease: {
      kind: "inline",
      schema: trendSchema,
      fallback: "children",
      renderPending: true,
      description: "Render a declining business metric.",
      usage: "A reliable numeric metric decreased relative to an explicit baseline or period.",
      childrenDescription: "A concise human-readable metric including direction and value.",
      outputPriority: "recommended",
      constraints: [
        "Use only when the source contains a specific numeric decrease; never invent a value.",
        "value must be an unsigned number; express direction in the visible text, not with a negative value.",
        "unit must match the visible value and period should identify the comparison basis when known.",
      ],
      antiExamples: [
        ':decrease[下降明显]{value="明显" unit="percent"}',
        ':decrease[增长 3%]{value=3 unit="percent"}',
      ],
      examples: [':decrease[下降 3.2%]{value=3.2 unit="percent"}'],
    },
    status: {
      kind: "inline",
      schema: z.object({
        value: z.enum(["pending", "success", "warning", "failed"]),
      }),
      fallback: "children",
      description: "Render the current workflow status.",
      usage:
        "A named task, milestone, review, or workflow has an explicitly supported current state.",
      childrenDescription: "The subject and its current state in a short label.",
      outputPriority: "optional",
      constraints: [
        "Choose success only for completed or verified outcomes.",
        "Choose pending for work in progress, warning for a material concern, and failed only for an explicit failure.",
        "Do not infer a status when the source does not establish one.",
      ],
      antiExamples: [':status[表现不错]{value="good"}'],
      examples: [':status[等待复核]{value="pending"}'],
    },
    risk: {
      kind: "container",
      schema: z.object({
        level: z.enum(["low", "medium", "high"]),
        code: z.string().optional(),
      }),
      fallback: "blockquote",
      renderPending: true,
      description: "Call out a business risk with Markdown content.",
      usage:
        "A material downside, uncertainty, dependency, or failure mode needs explicit attention.",
      childrenDescription:
        "Markdown that states the risk, evidence, potential impact, and mitigation when available.",
      outputPriority: "recommended",
      constraints: [
        "One container must describe one distinct risk; do not combine unrelated risks.",
        "Use high only for severe and plausible impact, medium for material uncertainty, and low for limited impact.",
        "Do not present speculation as established fact and do not invent evidence or a source code.",
      ],
      antiExamples: [
        ':::risk{level="critical"}\nEverything may fail.\n:::',
        ':::risk{level="high"}\nRisk exists.\n:::',
      ],
      examples: [':::risk{level="high" code="PAYMENT_DUPLICATE"}\nDetails\n:::'],
    },
    citation: {
      kind: "inline",
      schema: z.object({
        id: z.string(),
        page: z.coerce.number().int().positive().optional(),
      }),
      fallback: "children",
      description: "Reference a report without opening an external URL.",
      usage: "The claim is grounded in a reference that the application can resolve by id.",
      childrenDescription: "A useful source label, optionally identifying a relevant page.",
      outputPriority: "optional",
      constraints: [
        "Use only an id supplied by the application or reference material; never fabricate an id.",
        "Include page only when the source has stable page numbers and the page is known.",
        "Place the citation immediately after the claim it supports.",
      ],
      antiExamples: [
        ':citation[某报告]{id="invented-report" page=999}',
        ':citation[点击这里]{id="https://example.com"}',
      ],
      examples: [':citation[报告第 32 页]{id="report-q2" page=32}'],
    },
    action: {
      kind: "inline",
      schema: z.object({
        name: z.enum(["regenerate", "open-detail"]),
        targetId: z.string().optional(),
      }),
      fallback: "children",
      description: "Request a developer-controlled user action.",
      usage: "The user can take one of the explicitly supported application actions.",
      childrenDescription: "A short imperative button label that clearly describes the action.",
      outputPriority: "optional",
      constraints: [
        "Use only the allowed action names and never encode JavaScript, URLs, or instructions in attributes.",
        "Use targetId only when the application has supplied a real target identifier.",
        "Do not claim the action already happened; this node only offers a user-controlled action.",
      ],
      antiExamples: [
        ':action[删除全部]{name="delete-all"}',
        ':action[打开链接]{name="open-detail" targetId="javascript:alert(1)"}',
      ],
      examples: [':action[重新生成]{name="regenerate" targetId="report-q2"}'],
    },
  },
});
