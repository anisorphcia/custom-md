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
      examples: [
        ':increase[增长 12.5%]{value=12.5 unit="percent" period="year-over-year"}',
      ],
    },
    decrease: {
      kind: "inline",
      schema: trendSchema,
      fallback: "children",
      renderPending: true,
      description: "Render a declining business metric.",
      examples: [':decrease[下降 3.2%]{value=3.2 unit="percent"}'],
    },
    status: {
      kind: "inline",
      schema: z.object({
        value: z.enum(["pending", "success", "warning", "failed"]),
      }),
      fallback: "children",
      description: "Render the current workflow status.",
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
      examples: [':action[重新生成]{name="regenerate" targetId="report-q2"}'],
    },
  },
});
