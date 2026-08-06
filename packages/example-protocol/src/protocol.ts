import { defineProtocol } from "@semantic-md/protocol";
import { z } from "zod";

const trendSchema = z.object({
  value: z.coerce.number(),
  unit: z.enum(["percent", "currency", "count"]),
  period: z.string().optional(),
});

export const demoProtocol = defineProtocol({
  version: "1.0.0",
  nodes: {
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
