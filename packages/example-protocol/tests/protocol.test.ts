import { generateProtocolPrompt, validateSemanticNode } from "@semantic-md/protocol";
import { describe, expect, it } from "vitest";
import { demoProtocol, financeScenario } from "../src";

describe("finance demo protocol", () => {
  it("describes finance-specific semantic nodes to the model", () => {
    const prompt = generateProtocolPrompt(demoProtocol);
    expect(prompt).toContain("periodComparison (inline)");
    expect(prompt).toContain("marginChange (inline)");
    expect(prompt).toContain("profitTransition (inline)");
    expect(prompt).toContain("segmentPerformance (container)");
    expect(prompt).toContain("cashFlow (container)");
  });

  it("validates period comparison semantics", () => {
    const result = validateSemanticNode(
      {
        name: "periodComparison",
        rawAttributes: {
          basis: "yoy",
          direction: "up",
          value: "12.5",
          unit: "percent",
          sentiment: "positive",
        },
      },
      demoProtocol,
    );
    expect(result.valid).toBe(true);
    expect(result.attributes).toMatchObject({ basis: "yoy", value: 12.5 });
  });

  it("keeps the finance scenario aligned with the rich node set", () => {
    expect(financeScenario).toContain(":::financialInsight");
    expect(financeScenario).toContain(":periodComparison");
    expect(financeScenario).toContain(":marginChange");
    expect(financeScenario).toContain(":profitTransition");
    expect(financeScenario).toContain(":::segmentPerformance");
    expect(financeScenario).toContain(":::cashFlow");
  });
});
