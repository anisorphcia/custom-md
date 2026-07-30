import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  defineProtocol,
  generateProtocolPrompt,
  validateSemanticNode,
} from "../src";

const protocol = defineProtocol({
  version: "1.0.0",
  nodes: {
    metric: {
      kind: "inline",
      schema: z.object({
        value: z.coerce.number(),
        unit: z.enum(["percent", "count"]),
      }),
      fallback: "children",
      examples: [':metric[12%]{value=12 unit="percent"}'],
    },
  },
});

describe("protocol", () => {
  it("validates and coerces semantic attributes", () => {
    const result = validateSemanticNode(
      {
        name: "metric",
        rawAttributes: { value: "12", unit: "percent" },
      },
      protocol,
    );
    expect(result.valid).toBe(true);
    expect(result.attributes).toEqual({ value: 12, unit: "percent" });
  });

  it("rejects unknown nodes and dangerous attributes", () => {
    expect(
      validateSemanticNode({ name: "missing", rawAttributes: {} }, protocol)
        .diagnostics[0]?.code,
    ).toBe("UNKNOWN_SEMANTIC_NODE");
    expect(
      validateSemanticNode(
        {
          name: "metric",
          rawAttributes: { value: "12", unit: "count", onClick: "evil()" },
        },
        protocol,
      ).diagnostics[0]?.code,
    ).toBe("FORBIDDEN_ATTRIBUTE");
  });

  it("generates a useful prompt", () => {
    const prompt = generateProtocolPrompt(protocol);
    expect(prompt).toContain("metric (inline)");
    expect(prompt).toContain("allowed: percent, count");
    expect(prompt).toContain("Never output JavaScript");
  });
});
