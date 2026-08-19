import { defineProtocol } from "@semantic-md/protocol";
import { describe, expect, it, vi } from "vitest";
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
    session.push("# ");
    expect(session.flush()?.snapshot.children[0]?.type).toBe("heading");
    session.push("Rep");
    session.flush();
    session.push("ort");
    expect(session.flush()?.patches.some((patch) => patch.type === "append-text")).toBe(true);
    session.push("\n");
    expect(session.flush()?.snapshot.children[0]?.status).toBe("stable");
  });

  it("confirms a GFM table after its delimiter row", () => {
    const session = createStreamingMarkdownSession({ protocol });
    session.push("| Name | Value |\n");
    session.flush();
    expect(session.getSnapshot().children[0]?.type).toBe("paragraph");
    session.push("| --- | ---: |\n");
    const update = session.flush();
    expect(session.getSnapshot().children[0]?.type).toBe("table");
    expect(update?.patches.some((patch) => patch.type === "replace")).toBe(true);
    session.push("| Revenue | 12 |\n");
    expect(session.flush()?.patches.some((patch) => patch.type === "insert")).toBe(true);
  });

  it("grows lists and fenced code blocks before completion", () => {
    const listSession = createStreamingMarkdownSession({ protocol });
    listSession.push("- one\n");
    listSession.push("- two");
    listSession.flush();
    const list = listSession.getSnapshot().children[0];
    expect(list?.type).toBe("list");
    expect(list && "children" in list ? list.children : []).toHaveLength(2);

    const codeSession = createStreamingMarkdownSession({ protocol });
    codeSession.push("```ts\n");
    codeSession.push("const value = 1;");
    codeSession.flush();
    const code = codeSession.getSnapshot().children[0];
    expect(code?.type).toBe("codeBlock");
    expect(code?.status).toBe("pending");
    expect(code && "value" in code ? code.value : "").toContain("const value");
  });

  it("does not stabilize a code fence closed by a shorter marker", () => {
    const session = createStreamingMarkdownSession();
    session.push("````js\nconst value = 1;\n```\n");
    session.flush();

    const pendingCode = session.getSnapshot().children[0];
    expect(pendingCode?.type).toBe("codeBlock");
    expect(pendingCode?.status).toBe("pending");
    expect(pendingCode && "value" in pendingCode ? pendingCode.value : "").toContain("```");

    session.push("````\n");
    session.flush();
    expect(session.getSnapshot().children[0]?.status).toBe("stable");
  });

  it("provides provisional inline nodes and falls back at finish", () => {
    const session = createStreamingMarkdownSession({ protocol, mode: "optimistic" });
    session.push("This is *important");
    session.flush();
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
    session.flush();
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
    session.flush();
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
    session.flush();
    const node = session.getSnapshot().children[0];
    expect(node?.type).toBe("semantic");
    expect(node?.status).toBe("pending");
    expect(JSON.stringify(node)).toContain('"type":"strong"');
  });

  it("keeps diagnostics when invalid content moves from active to stable", () => {
    const session = createStreamingMarkdownSession({ protocol, batchInterval: 0 });
    const invalidDirective = ':increase[bad]{value=nope unit="percent"}';

    session.push(invalidDirective);
    expect(
      session.getDiagnostics().filter((item) => item.code === "INVALID_ATTRIBUTE_TYPE"),
    ).toHaveLength(1);

    session.push("\n\n");
    expect(
      session.getDiagnostics().filter((item) => item.code === "INVALID_ATTRIBUTE_TYPE"),
    ).toHaveLength(1);

    session.push("# Later\n");
    expect(
      session.getDiagnostics().filter((item) => item.code === "INVALID_ATTRIBUTE_TYPE"),
    ).toHaveLength(1);
  });

  it("clears stable and active diagnostics on reset", () => {
    const session = createStreamingMarkdownSession({ protocol, batchInterval: 0 });
    session.push(':increase[bad]{value=nope unit="percent"}\n\n');
    session.push(":missing[visible]{value=1}");
    expect(session.getDiagnostics()).not.toHaveLength(0);

    session.reset();
    expect(session.getDiagnostics()).toEqual([]);
  });

  it("finishes with the same diagnostics as a complete parse", () => {
    const source = ':increase[bad]{value=nope unit="percent"}\n\n[unsafe](javascript:alert(1))';
    const session = createStreamingMarkdownSession({ protocol, batchInterval: 0 });
    session.push(source.slice(0, 24));
    session.push(source.slice(24));

    expect(session.finish().diagnostics).toEqual(
      parseMarkdownWithDiagnostics(source, { protocol }).diagnostics,
    );
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

  it("batches multiple chunks into one streaming update", () => {
    vi.useFakeTimers();
    try {
      const updates: Array<{ streamStatus: string }> = [];
      const session = createStreamingMarkdownSession({
        protocol,
        batchInterval: 16,
        onUpdate: (update) => updates.push(update),
      });

      session.push("# Bat");
      session.push("ched");
      expect(session.getSnapshot().children).toHaveLength(0);
      expect(updates).toHaveLength(0);

      vi.advanceTimersByTime(16);
      expect(updates).toHaveLength(1);
      expect(updates[0]?.streamStatus).toBe("streaming");
      expect(JSON.stringify(session.getSnapshot())).toContain("Batched");
    } finally {
      vi.useRealTimers();
    }
  });

  it("flushes explicitly and lets finish absorb pending chunks", () => {
    const statuses: string[] = [];
    const session = createStreamingMarkdownSession({
      protocol,
      onUpdate: (update) => statuses.push(update.streamStatus),
    });

    session.push("First");
    expect(session.flush()?.streamStatus).toBe("streaming");
    expect(session.flush()).toBeUndefined();

    session.push(" second");
    const finished = session.finish();
    expect(JSON.stringify(finished.snapshot)).toContain("First second");
    expect(statuses).toEqual(["streaming", "finished"]);
  });

  it("cancels a pending batch and publishes idle on reset", () => {
    vi.useFakeTimers();
    try {
      const updates: Array<{ status: string; version: number; patchTypes: string[] }> = [];
      const session = createStreamingMarkdownSession({
        batchInterval: 16,
        onUpdate: (update) =>
          updates.push({
            status: update.streamStatus,
            version: update.version,
            patchTypes: update.patches.map((patch) => patch.type),
          }),
      });
      session.push("kept");
      vi.advanceTimersByTime(16);
      session.push("discarded");
      session.reset();

      vi.advanceTimersByTime(16);
      expect(updates).toEqual([
        expect.objectContaining({ status: "streaming", version: 1 }),
        expect.objectContaining({ status: "idle", version: 2 }),
      ]);
      expect(updates[1]?.patchTypes).toContain("remove");
      expect(session.getSnapshot().children).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("disposes silently and rejects further use", () => {
    vi.useFakeTimers();
    try {
      const onUpdate = vi.fn();
      const session = createStreamingMarkdownSession({ batchInterval: 16, onUpdate });
      session.push("discarded");

      session.dispose();
      session.dispose();
      vi.advanceTimersByTime(16);

      expect(onUpdate).not.toHaveBeenCalled();
      expect(() => session.push("later")).toThrow("Cannot push after dispose()");
      expect(() => session.flush()).toThrow("Cannot flush after dispose()");
      expect(() => session.finish()).toThrow("Cannot finish after dispose()");
      expect(() => session.reset()).toThrow("Cannot reset after dispose()");
      expect(() => session.getSnapshot()).toThrow("Cannot getSnapshot after dispose()");
      expect(() => session.getDiagnostics()).toThrow("Cannot getDiagnostics after dispose()");
    } finally {
      vi.useRealTimers();
    }
  });
});
