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
}

export interface StreamingMarkdownSession {
  push(chunk: string): ParseUpdate;
  finish(): ParseUpdate;
  reset(): void;
  getSnapshot(): MarkdownDocument;
  getDiagnostics(): Diagnostic[];
  subscribe(listener: (update: ParseUpdate) => void): () => void;
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
  let diagnostics: Diagnostic[] = [];
  let version = 0;
  let finished = false;
  const listeners = new Set<(update: ParseUpdate) => void>();
  const batchInterval = options.batchInterval ?? 16;
  let pendingNotification: ParseUpdate | undefined;
  let notificationTimer: ReturnType<typeof setTimeout> | undefined;

  function notifyListeners(update: ParseUpdate): void {
    for (const listener of listeners) {
      listener(update);
    }
  }

  function flushNotification(): void {
    if (notificationTimer) {
      clearTimeout(notificationTimer);
      notificationTimer = undefined;
    }
    if (pendingNotification) {
      const update = pendingNotification;
      pendingNotification = undefined;
      notifyListeners(update);
    }
  }

  function clearNotification(): void {
    if (notificationTimer) {
      clearTimeout(notificationTimer);
      notificationTimer = undefined;
    }
    pendingNotification = undefined;
  }

  function emit(update: ParseUpdate, immediate = false): ParseUpdate {
    if (immediate || batchInterval <= 0) {
      flushNotification();
      notifyListeners(update);
      return update;
    }
    pendingNotification = pendingNotification
      ? {
          ...update,
          patches: [...pendingNotification.patches, ...update.patches],
        }
      : update;
    notificationTimer ??= setTimeout(flushNotification, batchInterval);
    return update;
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
      stableBoundary = nextBoundary;
    }

    const tail = source.slice(stableBoundary);
    const activeResult = parseMarkdownFragment(tail, {
      ...protocolOptions,
      mode,
      offset: stableBoundary,
      status: "pending",
    });
    diagnostics = [...activeResult.diagnostics];
    snapshot = {
      id: "root",
      type: "root",
      status: "pending",
      confidence: "confirmed",
      range: { start: 0, end: source.length },
      children: [...stableNodes, ...activeResult.document.children],
    };
    version += 1;
    return emit({
      version,
      patches: diffAst(previous, snapshot),
      snapshot,
      diagnostics: [...diagnostics],
      streamStatus: "streaming",
    });
  }

  return {
    push(chunk: string): ParseUpdate {
      if (finished) {
        throw new Error("Cannot push after finish(); call reset() first");
      }
      if (!chunk) {
        return {
          version,
          patches: [],
          snapshot,
          diagnostics: [...diagnostics],
          streamStatus: source ? "streaming" : "idle",
        };
      }
      source += chunk;
      return streamingUpdate();
    },
    finish(): ParseUpdate {
      if (finished) {
        return {
          version,
          patches: [],
          snapshot,
          diagnostics: [...diagnostics],
          streamStatus: "finished",
        };
      }
      const previous = snapshot;
      const result = parseMarkdownWithDiagnostics(source, {
        ...protocolOptions,
        mode,
      });
      snapshot = result.document;
      diagnostics = result.diagnostics;
      stableNodes = snapshot.children;
      stableBoundary = source.length;
      finished = true;
      version += 1;
      return emit(
        {
          version,
          patches: diffAst(previous, snapshot),
          snapshot,
          diagnostics: [...diagnostics],
          streamStatus: "finished",
        },
        true,
      );
    },
    reset(): void {
      source = "";
      stableBoundary = 0;
      stableNodes = [];
      snapshot = emptyDocument();
      diagnostics = [];
      version = 0;
      finished = false;
      clearNotification();
    },
    getSnapshot(): MarkdownDocument {
      return snapshot;
    },
    getDiagnostics(): Diagnostic[] {
      return [...diagnostics];
    },
    subscribe(listener: (update: ParseUpdate) => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
