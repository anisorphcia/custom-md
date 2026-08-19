import {
  createStreamingMarkdownSession,
  type Diagnostic,
  type MarkdownDocument,
  type ParseUpdate,
  type StreamingMarkdownSession,
  type StreamingMode,
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

export function useSemanticMarkdown(
  options: UseSemanticMarkdownOptions = {},
): UseSemanticMarkdownResult {
  const sessionOptions = {
    ...(options.protocol ? { protocol: options.protocol } : {}),
    ...(options.streamingMode ? { mode: options.streamingMode } : {}),
    ...(options.batchInterval !== undefined ? { batchInterval: options.batchInterval } : {}),
  };
  const [initialSession] = useState(() => createStreamingMarkdownSession(sessionOptions));
  const sessionRef = useRef<StreamingMarkdownSession>(initialSession);
  const [document, setDocument] = useState(sessionRef.current.getSnapshot());
  const [patches, setPatches] = useState<ParseUpdate["patches"]>([]);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [status, setStatus] = useState<ParseUpdate["streamStatus"]>("idle");

  const apply = useCallback((update: ParseUpdate): ParseUpdate => {
    setDocument(update.snapshot);
    setPatches(update.patches);
    setDiagnostics(update.diagnostics);
    setStatus(update.streamStatus);
    return update;
  }, []);

  useEffect(() => {
    const session = createStreamingMarkdownSession({
      ...(options.protocol ? { protocol: options.protocol } : {}),
      ...(options.streamingMode ? { mode: options.streamingMode } : {}),
      ...(options.batchInterval !== undefined ? { batchInterval: options.batchInterval } : {}),
    });
    sessionRef.current = session;
    const unsubscribe = session.subscribe(apply);
    setDocument(session.getSnapshot());
    setPatches([]);
    setDiagnostics([]);
    setStatus("idle");
    return () => {
      unsubscribe();
      session.reset();
    };
  }, [apply, options.protocol, options.streamingMode, options.batchInterval]);

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
      setDocument(sessionRef.current.getSnapshot());
      setPatches([]);
      setDiagnostics([]);
      setStatus("idle");
    }, []),
  };
}
