import { describe, expect, it } from "vitest";
import { chunkContent } from "../src/services/chunker";

describe("chunkContent", () => {
  it("supports every chunking mode without losing input", () => {
    const content = "**重要** :metric[12]{value=12}\n| --- | ---: |";
    for (const mode of ["char", "word", "fixed", "random", "syntax-boundary"] as const) {
      expect(chunkContent(content, { mode, chunkSize: 5, seed: 1 }).join("")).toBe(
        content,
      );
    }
  });

  it("makes random mode reproducible", () => {
    const content = "abcdefghijklmnopqrstuvwxyz";
    expect(chunkContent(content, { mode: "random", seed: 42, chunkSize: 7 })).toEqual(
      chunkContent(content, { mode: "random", seed: 42, chunkSize: 7 }),
    );
  });
});
