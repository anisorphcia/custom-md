import type { Diagnostic, ParseUpdate, StreamingMarkdownSession } from "@semantic-md/core";

export interface SemanticSseMeta {
  streamId: string;
  scenario: string;
  protocolVersion: string;
}

export interface SemanticSseCallbacks {
  onMeta?(meta: SemanticSseMeta): void;
  onUpdate?(update: ParseUpdate, rawText: string): void;
  onDiagnostic?(diagnostic: Diagnostic): void;
  onDone?(update: ParseUpdate): void;
  onError?(error: Error): void;
}

export interface SemanticSseConnection {
  close(): void;
  readonly source: EventSource;
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function connectSemanticSse(
  url: string,
  session: StreamingMarkdownSession,
  callbacks: SemanticSseCallbacks = {},
): SemanticSseConnection {
  const source = new EventSource(url);
  let rawText = "";

  source.addEventListener("meta", (event) => {
    if (!(event instanceof MessageEvent) || typeof event.data !== "string") {
      return;
    }
    const value = parseJson(event.data);
    if (
      isRecord(value) &&
      typeof value.streamId === "string" &&
      typeof value.scenario === "string" &&
      typeof value.protocolVersion === "string"
    ) {
      callbacks.onMeta?.({
        streamId: value.streamId,
        scenario: value.scenario,
        protocolVersion: value.protocolVersion,
      });
    }
  });

  source.addEventListener("delta", (event) => {
    if (!(event instanceof MessageEvent) || typeof event.data !== "string") {
      return;
    }
    const value = parseJson(event.data);
    if (isRecord(value) && typeof value.text === "string") {
      rawText += value.text;
      callbacks.onUpdate?.(session.push(value.text), rawText);
    }
  });

  source.addEventListener("diagnostic", (event) => {
    if (!(event instanceof MessageEvent) || typeof event.data !== "string") {
      return;
    }
    const value = parseJson(event.data);
    if (
      isRecord(value) &&
      typeof value.code === "string" &&
      typeof value.message === "string"
    ) {
      callbacks.onDiagnostic?.({
        code: value.code,
        message: value.message,
        severity:
          value.severity === "error" || value.severity === "warning"
            ? value.severity
            : "info",
      });
    }
  });

  source.addEventListener("done", () => {
    const update = session.finish();
    callbacks.onDone?.(update);
    source.close();
  });

  source.addEventListener("error", (event) => {
    source.close();
    callbacks.onError?.(
      new Error(
        event instanceof MessageEvent && typeof event.data === "string"
          ? event.data
          : "SSE connection failed",
      ),
    );
  });

  return {
    source,
    close(): void {
      source.close();
    },
  };
}
