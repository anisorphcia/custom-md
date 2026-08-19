import type { SemanticProtocol } from "@semantic-md/protocol";
import type { Diagnostic, MarkdownDocument, MarkdownNode } from "../ast/types";
import type { StreamingMode } from "../parser/parseMarkdown";
import { parseMarkdownFragment, parseMarkdownWithDiagnostics } from "../parser/parseMarkdown";
import { diffAst } from "../patches/diff";
import type { ParseUpdate } from "../patches/types";

export interface StreamingSessionOptions {
  protocol?: SemanticProtocol;
  mode?: StreamingMode;
  batchInterval?: number;
  onUpdate?: StreamingUpdateHandler;
}

export type StreamingUpdateHandler = (update: ParseUpdate) => void;

export interface StreamingMarkdownSession {
  push(chunk: string): void;
  flush(): ParseUpdate | undefined;
  finish(): ParseUpdate;
  reset(): void;
  dispose(): void;
  getSnapshot(): MarkdownDocument;
  getDiagnostics(): Diagnostic[];
}

function emptyDocument(): MarkdownDocument {
  return {
    id: "root",
    type: "root",
    status: "stable",
    confidence: "confirmed",
    range: { start: 0, end: 0 },
    children: [],
  };
}

function diagnosticKey(diagnostic: Diagnostic): string {
  return [
    diagnostic.code,
    diagnostic.message,
    diagnostic.severity,
    diagnostic.range?.start ?? "",
    diagnostic.range?.end ?? "",
    diagnostic.nodeId ?? "",
    diagnostic.raw ?? "",
  ].join("\u0000");
}

function mergeDiagnostics(...groups: ReadonlyArray<ReadonlyArray<Diagnostic>>): Diagnostic[] {
  const seen = new Set<string>();
  const merged: Diagnostic[] = [];
  for (const group of groups) {
    for (const diagnostic of group) {
      const key = diagnosticKey(diagnostic);
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(diagnostic);
      }
    }
  }
  return merged;
}

function findStableBoundary(source: string): number {
  let cursor = 0;
  let lastSafe = 0;
  let fence: { marker: string; length: number } | undefined;
  let containerDepth = 0;
  for (const lineWithEnding of source.matchAll(/.*(?:\n|$)/g)) {
    const line = lineWithEnding[0];
    if (!line) {
      continue;
    }
    cursor += line.length;
    const content = line.replace(/\r?\n$/, "");
    const fenceMatch = /^ {0,3}(`{3,}|~{3,})/.exec(content);
    const fenceSequence = fenceMatch?.[1];
    if (fence && fenceSequence) {
      const closesFence =
        fenceSequence[0] === fence.marker &&
        fenceSequence.length >= fence.length &&
        /^\s*$/.test(content.slice(fenceMatch[0].length));
      if (closesFence) {
        fence = undefined;
        if (line.endsWith("\n")) {
          lastSafe = cursor;
        }
      }
      continue;
    }
    if (fence) {
      continue;
    }
    if (fenceSequence) {
      fence = { marker: fenceSequence[0] ?? "", length: fenceSequence.length };
      continue;
    }
    if (/^ {0,3}:::[A-Za-z][\w-]*(?:\{.*\})?\s*$/.test(content)) {
      containerDepth += 1;
      continue;
    }
    if (/^ {0,3}:::\s*$/.test(content) && containerDepth > 0) {
      containerDepth -= 1;
      if (containerDepth === 0 && line.endsWith("\n")) {
        lastSafe = cursor;
      }
      continue;
    }
    if (containerDepth > 0) {
      continue;
    }
    if (
      line.endsWith("\n") &&
      (/^\s*$/.test(content) ||
        /^ {0,3}#{1,6}(?:\s|$)/.test(content) ||
        /^ {0,3}::[A-Za-z][\w-]*(?:\{.*\})?\s*$/.test(content) ||
        /^ {0,3}(?:\*{3,}|-{3,}|_{3,})\s*$/.test(content))
    ) {
      lastSafe = cursor;
    }
  }
  return lastSafe;
}

export function createStreamingMarkdownSession(
  options: StreamingSessionOptions = {},
): StreamingMarkdownSession {
  const mode = options.mode ?? "balanced";
  const protocolOptions = options.protocol ? { protocol: options.protocol } : {};
  let source = "";
  let stableBoundary = 0;
  let stableNodes: MarkdownNode[] = [];
  let snapshot = emptyDocument();
  let stableDiagnostics: Diagnostic[] = [];
  let activeDiagnostics: Diagnostic[] = [];
  let version = 0;
  let finished = false;
  let disposed = false;
  let updateHandler = options.onUpdate;
  const batchInterval = options.batchInterval ?? 16;
  let pendingChunks = "";
  let flushTimer: ReturnType<typeof setTimeout> | undefined;

  function assertActive(operation: string): void {
    if (disposed) {
      throw new Error(`Cannot ${operation} after dispose()`);
    }
  }

  function emitUpdate(update: ParseUpdate): void {
    updateHandler?.(update);
  }

  function clearFlushTimer(): void {
    if (flushTimer !== undefined) {
      clearTimeout(flushTimer);
      flushTimer = undefined;
    }
  }

  function streamingUpdate(): ParseUpdate {
    const previous = snapshot;
    const nextBoundary = findStableBoundary(source);
    if (nextBoundary > stableBoundary) {
      const stablePart = source.slice(stableBoundary, nextBoundary);
      const result = parseMarkdownFragment(stablePart, {
        ...protocolOptions,
        mode,
        offset: stableBoundary,
        status: "stable",
      });
      stableNodes = [...stableNodes, ...result.document.children];
      stableDiagnostics = mergeDiagnostics(stableDiagnostics, result.diagnostics);
      stableBoundary = nextBoundary;
    }

    const tail = source.slice(stableBoundary);
    const activeResult = parseMarkdownFragment(tail, {
      ...protocolOptions,
      mode,
      offset: stableBoundary,
      status: "pending",
    });
    activeDiagnostics = [...activeResult.diagnostics];
    const diagnostics = mergeDiagnostics(stableDiagnostics, activeDiagnostics);
    snapshot = {
      id: "root",
      type: "root",
      status: "pending",
      confidence: "confirmed",
      range: { start: 0, end: source.length },
      children: [...stableNodes, ...activeResult.document.children],
    };
    version += 1;
    const update: ParseUpdate = {
      version,
      patches: diffAst(previous, snapshot),
      snapshot,
      diagnostics: [...diagnostics],
      streamStatus: "streaming",
    };
    emitUpdate(update);
    return update;
  }

  function flushPending(): ParseUpdate | undefined {
    clearFlushTimer();
    if (!pendingChunks) {
      return undefined;
    }
    source += pendingChunks;
    pendingChunks = "";
    return streamingUpdate();
  }

  return {
    push(chunk: string): void {
      assertActive("push");
      if (finished) {
        throw new Error("Cannot push after finish(); call reset() first");
      }
      if (!chunk) {
        return;
      }
      pendingChunks += chunk;
      if (batchInterval <= 0) {
        flushPending();
        return;
      }
      flushTimer ??= setTimeout(flushPending, batchInterval);
    },
    flush(): ParseUpdate | undefined {
      assertActive("flush");
      return flushPending();
    },
    finish(): ParseUpdate {
      assertActive("finish");
      if (finished) {
        return {
          version,
          patches: [],
          snapshot,
          diagnostics: mergeDiagnostics(stableDiagnostics, activeDiagnostics),
          streamStatus: "finished",
        };
      }
      clearFlushTimer();
      source += pendingChunks;
      pendingChunks = "";
      const previous = snapshot;
      const result = parseMarkdownWithDiagnostics(source, {
        ...protocolOptions,
        mode,
      });
      snapshot = result.document;
      stableDiagnostics = mergeDiagnostics(result.diagnostics);
      activeDiagnostics = [];
      stableNodes = snapshot.children;
      stableBoundary = source.length;
      finished = true;
      version += 1;
      const update: ParseUpdate = {
        version,
        patches: diffAst(previous, snapshot),
        snapshot,
        diagnostics: [...stableDiagnostics],
        streamStatus: "finished",
      };
      emitUpdate(update);
      return update;
    },
    reset(): void {
      assertActive("reset");
      const previous = snapshot;
      clearFlushTimer();
      source = "";
      stableBoundary = 0;
      stableNodes = [];
      snapshot = emptyDocument();
      stableDiagnostics = [];
      activeDiagnostics = [];
      finished = false;
      pendingChunks = "";
      version += 1;
      emitUpdate({
        version,
        patches: diffAst(previous, snapshot),
        snapshot,
        diagnostics: [],
        streamStatus: "idle",
      });
    },
    dispose(): void {
      if (disposed) {
        return;
      }
      clearFlushTimer();
      source = "";
      stableBoundary = 0;
      stableNodes = [];
      snapshot = emptyDocument();
      stableDiagnostics = [];
      activeDiagnostics = [];
      version = 0;
      finished = false;
      pendingChunks = "";
      updateHandler = undefined;
      disposed = true;
    },
    getSnapshot(): MarkdownDocument {
      assertActive("getSnapshot");
      return snapshot;
    },
    getDiagnostics(): Diagnostic[] {
      assertActive("getDiagnostics");
      return mergeDiagnostics(stableDiagnostics, activeDiagnostics);
    },
  };
}
