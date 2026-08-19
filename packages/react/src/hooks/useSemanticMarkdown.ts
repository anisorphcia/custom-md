import {
  createStreamingMarkdownSession,
  type Diagnostic,
  type MarkdownDocument,
  type ParseUpdate,
  type StreamingMarkdownSession,
  type StreamingMode,
  type StreamingUpdateHandler,
} from "@semantic-md/core";
import type { SemanticProtocol } from "@semantic-md/protocol";
import { useCallback, useEffect, useRef, useState } from "react";

export interface UseSemanticMarkdownOptions {
  protocol?: SemanticProtocol;
  streamingMode?: StreamingMode;
  batchInterval?: number;
}

export interface UseSemanticMarkdownResult {
  document: MarkdownDocument;
  patches: ParseUpdate["patches"];
  diagnostics: Diagnostic[];
  status: ParseUpdate["streamStatus"];
  push(chunk: string): void;
  flush(): ParseUpdate | undefined;
  finish(): ParseUpdate;
  reset(): void;
}

function createSession(
  protocol: SemanticProtocol | undefined,
  streamingMode: StreamingMode | undefined,
  batchInterval: number | undefined,
  onUpdate: StreamingUpdateHandler,
): StreamingMarkdownSession {
  return createStreamingMarkdownSession({
    ...(protocol ? { protocol } : {}),
    ...(streamingMode ? { mode: streamingMode } : {}),
    ...(batchInterval !== undefined ? { batchInterval } : {}),
    onUpdate,
  });
}

export function useSemanticMarkdown(
  options: UseSemanticMarkdownOptions = {},
): UseSemanticMarkdownResult {
  const { protocol, streamingMode, batchInterval } = options;
  const updateHandlerRef = useRef<StreamingUpdateHandler>(() => {});
  const [initialSession] = useState(() =>
    createSession(protocol, streamingMode, batchInterval, (update) =>
      updateHandlerRef.current(update),
    ),
  );
  const sessionRef = useRef<StreamingMarkdownSession>(initialSession);
  const sessionDisposedRef = useRef(false);
  const sessionConfigRef = useRef({
    protocol,
    streamingMode,
    batchInterval,
  });
  const [document, setDocument] = useState(() => sessionRef.current.getSnapshot());
  const [patches, setPatches] = useState<ParseUpdate["patches"]>([]);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [status, setStatus] = useState<ParseUpdate["streamStatus"]>("idle");

  const apply = useCallback((update: ParseUpdate): void => {
    setDocument(update.snapshot);
    setPatches(update.patches);
    setDiagnostics(update.diagnostics);
    setStatus(update.streamStatus);
  }, []);
  updateHandlerRef.current = apply;

  useEffect(() => {
    const previousConfig = sessionConfigRef.current;
    const configChanged =
      previousConfig.protocol !== protocol ||
      previousConfig.streamingMode !== streamingMode ||
      previousConfig.batchInterval !== batchInterval;
    const needsSession = configChanged || sessionDisposedRef.current;
    const session = needsSession
      ? createSession(protocol, streamingMode, batchInterval, (update) =>
          updateHandlerRef.current(update),
        )
      : sessionRef.current;
    if (needsSession) {
      sessionRef.current = session;
      sessionDisposedRef.current = false;
      sessionConfigRef.current = {
        protocol,
        streamingMode,
        batchInterval,
      };
    }
    setDocument(session.getSnapshot());
    setPatches([]);
    setDiagnostics([]);
    setStatus("idle");
    return () => {
      session.dispose();
      if (sessionRef.current === session) {
        sessionDisposedRef.current = true;
      }
    };
  }, [protocol, streamingMode, batchInterval]);

  return {
    document,
    patches,
    diagnostics,
    status,
    push: useCallback((chunk: string) => sessionRef.current.push(chunk), []),
    flush: useCallback(() => sessionRef.current.flush(), []),
    finish: useCallback(() => sessionRef.current.finish(), []),
    reset: useCallback(() => {
      sessionRef.current.reset();
    }, []),
  };
}
