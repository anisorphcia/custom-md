import { defineProtocol } from "@semantic-md/protocol";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  createStreamingMarkdownSession,
  normalizeDocument,
  parseMarkdown,
  parseMarkdownWithDiagnostics,
  sanitizeUrl,
} from "../src";

const protocol = defineProtocol({
  version: "1",
  nodes: {
    increase: {
      kind: "inline",
      schema: z.object({
        value: z.coerce.number(),
        unit: z.enum(["percent", "count"]),
      }),
      fallback: "children",
      renderPending: true,
    },
    risk: {
      kind: "container",
      schema: z.object({ level: z.enum(["low", "high"]) }),
      fallback: "blockquote",
    },
  },
});

describe("parseMarkdown", () => {
  it("parses GFM and semantic directives", () => {
    const source =
      '# Report\n\n| Name | Value |\n| --- | ---: |\n| Revenue | 12 |\n\n:increase[up]{value=12 unit="percent"}\n\n:::risk{level="high"}\n**Check** it.\n:::';
    const document = parseMarkdown(source, { protocol });
    expect(document.children.map((node) => node.type)).toEqual([
      "heading",
      "table",
      "paragraph",
      "semantic",
    ]);
    expect(JSON.stringify(document)).toContain('"name":"increase"');
    expect(JSON.stringify(document)).toContain('"name":"risk"');
  });

  it("does not expose dangerous links or HTML", () => {
    const result = parseMarkdownWithDiagnostics(
      "[click](javascript:alert(1)) <img src=x onerror=alert(1)>",
      { protocol },
    );
    expect(result.diagnostics.some((item) => item.code === "UNSAFE_URL")).toBe(true);
    expect(JSON.stringify(result.document)).not.toContain('"url":"javascript:');
    expect(JSON.stringify(result.document)).toContain("<img");
    expect(sanitizeUrl("java\nscript:alert(1)").safe).toBe(false);
  });
});

describe("streaming session", () => {
  it("renders a heading before the line is complete and appends text", () => {
    const session = createStreamingMarkdownSession({ protocol });
    expect(session.push("# ").snapshot.children[0]?.type).toBe("heading");
    session.push("Rep");
    const update = session.push("ort");
    expect(update.patches.some((patch) => patch.type === "append-text")).toBe(true);
    expect(session.push("\n").snapshot.children[0]?.status).toBe("stable");
  });

  it("confirms a GFM table after its delimiter row", () => {
    const session = createStreamingMarkdownSession({ protocol });
    session.push("| Name | Value |\n");
    expect(session.getSnapshot().children[0]?.type).toBe("paragraph");
    const update = session.push("| --- | ---: |\n");
    expect(session.getSnapshot().children[0]?.type).toBe("table");
    expect(update.patches.some((patch) => patch.type === "replace")).toBe(true);
    const rowUpdate = session.push("| Revenue | 12 |\n");
    expect(rowUpdate.patches.some((patch) => patch.type === "insert")).toBe(true);
  });

  it("grows lists and fenced code blocks before completion", () => {
    const listSession = createStreamingMarkdownSession({ protocol });
    listSession.push("- one\n");
    listSession.push("- two");
    const list = listSession.getSnapshot().children[0];
    expect(list?.type).toBe("list");
    expect(list && "children" in list ? list.children : []).toHaveLength(2);

    const codeSession = createStreamingMarkdownSession({ protocol });
    codeSession.push("```ts\n");
    codeSession.push("const value = 1;");
    const code = codeSession.getSnapshot().children[0];
    expect(code?.type).toBe("codeBlock");
    expect(code?.status).toBe("pending");
    expect(code && "value" in code ? code.value : "").toContain("const value");
  });

  it("does not stabilize a code fence closed by a shorter marker", () => {
    const session = createStreamingMarkdownSession();
    session.push("````js\nconst value = 1;\n```\n");

    const pendingCode = session.getSnapshot().children[0];
    expect(pendingCode?.type).toBe("codeBlock");
    expect(pendingCode?.status).toBe("pending");
    expect(pendingCode && "value" in pendingCode ? pendingCode.value : "").toContain("```");

    session.push("````\n");
    expect(session.getSnapshot().children[0]?.status).toBe("stable");
  });

  it("provides provisional inline nodes and falls back at finish", () => {
    const session = createStreamingMarkdownSession({ protocol, mode: "optimistic" });
    session.push("This is *important");
    expect(JSON.stringify(session.getSnapshot())).toContain('"confidence":"provisional"');
    session.finish();
    expect(JSON.stringify(session.getSnapshot())).not.toContain('"confidence":"provisional"');
    expect(session.getDiagnostics().some((item) => item.code === "UNTERMINATED_INLINE_MARK")).toBe(
      true,
    );
  });

  it("collects only complete attributes on a pending directive", () => {
    const session = createStreamingMarkdownSession({ protocol, mode: "optimistic" });
    session.push(':increase[up]{value=12 unit="per');
    const snapshot = JSON.stringify(session.getSnapshot());
    expect(snapshot).toContain('"rawAttributes":{"value":"12"}');
    expect(snapshot).not.toContain('"unit":"per"');
    expect(snapshot).toContain('"confidence":"provisional"');
    expect(session.getSnapshot().children[0]).toMatchObject({
      children: [{ type: "semantic", range: { start: 0, end: 32 } }],
    });
  });

  it("recovers incomplete inline code as text", () => {
    const session = createStreamingMarkdownSession({ mode: "optimistic" });
    session.push("Use `pending");
    expect(session.getSnapshot().children[0]?.status).toBe("pending");
    const update = session.finish();
    expect(JSON.stringify(update.snapshot)).toContain("`pending");
    expect(update.diagnostics.some((item) => item.code === "UNTERMINATED_INLINE_MARK")).toBe(true);
  });

  it("reports malformed structures even when they are not on the final line", () => {
    const result = parseMarkdownWithDiagnostics(
      "Unclosed *mark\n\nA later paragraph\n\n```ts\nconst value = 1;",
    );
    expect(result.diagnostics.map((item) => item.code)).toEqual(
      expect.arrayContaining(["UNTERMINATED_INLINE_MARK", "UNTERMINATED_CODE_FENCE"]),
    );
  });

  it("marks invalid and unknown semantic nodes without dropping children", () => {
    const invalid = parseMarkdownWithDiagnostics(':increase[bad]{value=nope unit="percent"}', {
      protocol,
    });
    expect(invalid.diagnostics.some((item) => item.code === "INVALID_ATTRIBUTE_TYPE")).toBe(true);
    expect(invalid.document.children[0]?.status).toBe("stable");
    expect(JSON.stringify(invalid.document)).toContain('"status":"invalid"');

    const unknown = parseMarkdownWithDiagnostics(":missing[visible]{value=1}", {
      protocol,
    });
    expect(unknown.diagnostics.some((item) => item.code === "UNKNOWN_SEMANTIC_NODE")).toBe(true);
    expect(JSON.stringify(unknown.document)).toContain("visible");
  });

  it("streams an open semantic container as pending", () => {
    const session = createStreamingMarkdownSession({ protocol });
    session.push(':::risk{level="high"}\n');
    session.push("**Check** the payment");
    const node = session.getSnapshot().children[0];
    expect(node?.type).toBe("semantic");
    expect(node?.status).toBe("pending");
    expect(JSON.stringify(node)).toContain('"type":"strong"');
  });

  it("finishes with the same semantic AST as a complete parse", () => {
    const source =
      '# Title\n\n- one\n- two\n\n```ts\nconst x = 1;\n```\n\n:increase[up]{value=2 unit="count"}';
    const session = createStreamingMarkdownSession({ protocol });
    for (const character of source) {
      session.push(character);
    }
    const streamed = session.finish().snapshot;
    expect(normalizeDocument(streamed)).toEqual(
      normalizeDocument(parseMarkdown(source, { protocol })),
    );
  });
});
