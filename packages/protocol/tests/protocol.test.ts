import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineProtocol, generateProtocolPrompt, validateSemanticNode } from "../src";

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
      usage: "A measured metric increased.",
      constraints: ["Never invent the value."],
      antiExamples: [':metric[about 12%]{value="about" unit="percent"}'],
      childrenDescription: "A concise metric label.",
      outputPriority: "recommended",
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
      validateSemanticNode({ name: "missing", rawAttributes: {} }, protocol).diagnostics[0]?.code,
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
    expect(prompt).toContain("Never wrap semantic directives in backticks");
    expect(prompt).toContain("Output priority: recommended");
    expect(prompt).toContain("Use when: A measured metric increased.");
    expect(prompt).toContain("Visible content: A concise metric label.");
    expect(prompt).toContain("Constraints:\n- Never invent the value.");
    expect(prompt).toContain(
      'Valid example (output without backticks): :metric[12%]{value=12 unit="percent"}',
    );
    expect(prompt).toContain(
      'Invalid example (never output): :metric[about 12%]{value="about" unit="percent"}',
    );
    expect(prompt).not.toContain('`:metric[12%]{value=12 unit="percent"}`');
  });
});
