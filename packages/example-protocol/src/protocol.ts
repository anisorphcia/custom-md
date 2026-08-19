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
  yoy: z.coerce.number().optional(),
  qoq: z.coerce.number().optional(),
  direction: z.enum(["up", "down", "flat"]),
  sentiment: z.enum(["positive", "negative", "neutral"]),
});

export const demoProtocol = defineProtocol({
  version: "1.0.0",
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
        "sentiment describes business impact, which may differ from numeric direction (for example, declining costs can be positive).",
        "Do not calculate or infer missing comparisons unless the source provides enough audited values.",
      ],
      examples: [
        ':::financialMetric{label="营业收入" value=2400 unit="currency" yoy=12.5 qoq=4.1 direction="up" sentiment="positive"}\n汽车业务放量带动收入增长。\n:::',
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
    clinicalResult: {
      kind: "container",
      schema: z.object({
        test: z.string(),
        value: z.coerce.number(),
        unit: z.string(),
        reference: z.string(),
        flag: z.enum(["normal", "high", "low"]),
        collectedAt: z.string(),
      }),
      fallback: "blockquote",
      renderPending: true,
      description: "Render a clinical laboratory result with its reference interval and flag.",
      usage:
        "A supplied medical test result needs to be explained together with its unit, reference interval, and collection time.",
      childrenDescription:
        "A cautious interpretation of the result, relevant context, and an explicit reminder that clinical decisions require professional review.",
      outputPriority: "recommended",
      constraints: [
        "Preserve the reported value, unit, reference interval, and collection time exactly.",
        "The flag must reflect the supplied laboratory reference interval; do not diagnose a condition.",
        "Do not present educational interpretation as a treatment recommendation.",
      ],
      examples: [
        ':::clinicalResult{test="糖化血红蛋白" value=7.2 unit="%" reference="4.0–6.0" flag="high" collectedAt="2026-08-16 08:30"}\n该指标高于本次报告参考区间，建议结合既往趋势由专业人员复核。\n:::',
      ],
    },
    fieldObservation: {
      kind: "container",
      schema: z.object({
        field: z.string(),
        crop: z.string(),
        stage: z.string(),
        soilMoisture: z.coerce.number().min(0).max(100),
        condition: z.enum(["optimal", "watch", "urgent"]),
        observedAt: z.string(),
      }),
      fallback: "blockquote",
      renderPending: true,
      description: "Render an agronomic field observation with crop stage and soil moisture.",
      usage:
        "A field inspection identifies a plot, crop growth stage, measured soil moisture, and an explicit operating condition.",
      childrenDescription:
        "Observed field conditions, likely operational impact, and the next inspection step.",
      outputPriority: "recommended",
      constraints: [
        "soilMoisture is a measured percentage from 0 through 100, not an estimated value.",
        "Use urgent only when the supplied observation calls for immediate field action.",
        "Keep weather forecasts separate from observations made in the field.",
      ],
      examples: [
        ':::fieldObservation{field="东区 3 号地" crop="冬小麦" stage="灌浆期" soilMoisture=18 condition="watch" observedAt="2026-08-18 06:40"}\n表层墒情偏低，建议复核未来降水后安排灌溉窗口。\n:::',
      ],
    },
    machineInspection: {
      kind: "container",
      schema: z.object({
        asset: z.string(),
        line: z.string(),
        reading: z.coerce.number(),
        unit: z.string(),
        state: z.enum(["normal", "attention", "stop"]),
        checkedAt: z.string(),
      }),
      fallback: "blockquote",
      renderPending: true,
      description: "Render an industrial equipment inspection reading as a maintenance record.",
      usage:
        "A named asset has a measured reading, production line, inspection time, and explicit operating state.",
      childrenDescription:
        "Inspection evidence, operational impact, and the required maintenance response.",
      outputPriority: "recommended",
      constraints: [
        "Preserve the asset id, reading, unit, and inspection time exactly.",
        "Use stop only when the source explicitly requires shutdown or lockout.",
        "Do not invent a safety threshold that is absent from the source.",
      ],
      examples: [
        ':::machineInspection{asset="CNC-102" line="A-03" reading=86 unit="°C" state="attention" checkedAt="2026-08-18 14:20"}\n主轴温度高于班组关注线，需检查冷却液循环。\n:::',
      ],
    },
    threatFinding: {
      kind: "container",
      schema: z.object({
        incidentId: z.string(),
        severity: z.enum(["critical", "high", "medium", "low"]),
        phase: z.enum([
          "initial-access",
          "execution",
          "persistence",
          "lateral-movement",
          "exfiltration",
          "contained",
        ]),
        asset: z.string(),
        observedAt: z.string(),
      }),
      fallback: "blockquote",
      renderPending: true,
      description:
        "Render a cybersecurity investigation finding with attack phase and asset scope.",
      usage:
        "A security investigation has an explicit incident id, severity, observed phase, affected asset, and timestamp.",
      childrenDescription: "Observed evidence, containment status, and the next verification step.",
      outputPriority: "recommended",
      constraints: [
        "Use only the severity and attack phase established by the supplied evidence.",
        "Preserve timestamps and asset identifiers exactly.",
        "Distinguish an observation from a confirmed compromise and do not invent indicators.",
      ],
      examples: [
        ':::threatFinding{incidentId="IR-2026-0819" severity="high" phase="lateral-movement" asset="prod-db-07" observedAt="2026-08-19 02:14 CST"}\n检测到异常服务账号访问，相关凭据已轮换并隔离源主机。\n:::',
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
