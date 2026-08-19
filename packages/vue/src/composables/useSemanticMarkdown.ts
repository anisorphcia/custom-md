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
import {
  type MaybeRef,
  onScopeDispose,
  type Ref,
  ref,
  type ShallowRef,
  shallowRef,
  toValue,
  watch,
} from "vue";

export interface UseSemanticMarkdownOptions {
  protocol?: SemanticProtocol;
  streamingMode?: MaybeRef<StreamingMode>;
  batchInterval?: number;
}

export interface UseSemanticMarkdownResult {
  document: ShallowRef<MarkdownDocument>;
  patches: ShallowRef<ParseUpdate["patches"]>;
  diagnostics: ShallowRef<Diagnostic[]>;
  status: Ref<ParseUpdate["streamStatus"]>;
  push(chunk: string): void;
  flush(): ParseUpdate | undefined;
  finish(): ParseUpdate;
  reset(): void;
}

export function useSemanticMarkdown(
  options: UseSemanticMarkdownOptions = {},
): UseSemanticMarkdownResult {
  let updateHandler: StreamingUpdateHandler = () => {};
  const createSession = (streamingMode: StreamingMode | undefined): StreamingMarkdownSession =>
    createStreamingMarkdownSession({
      ...(options.protocol ? { protocol: options.protocol } : {}),
      ...(streamingMode ? { mode: streamingMode } : {}),
      ...(options.batchInterval !== undefined ? { batchInterval: options.batchInterval } : {}),
      onUpdate: (update) => updateHandler(update),
    });
  const initialMode = toValue(options.streamingMode);
  let session = createSession(initialMode);
  const document = shallowRef(session.getSnapshot());
  const patches = shallowRef<ParseUpdate["patches"]>([]);
  const diagnostics = shallowRef<Diagnostic[]>([]);
  const status = ref<ParseUpdate["streamStatus"]>("idle");

  updateHandler = (update: ParseUpdate): void => {
    document.value = update.snapshot;
    patches.value = update.patches;
    diagnostics.value = update.diagnostics;
    status.value = update.streamStatus;
  };

  const stopModeWatch = watch(
    () => toValue(options.streamingMode),
    (streamingMode) => {
      session.dispose();
      session = createSession(streamingMode);
      document.value = session.getSnapshot();
      patches.value = [];
      diagnostics.value = [];
      status.value = "idle";
    },
  );
  onScopeDispose(() => {
    stopModeWatch();
    session.dispose();
  });

  return {
    document,
    patches,
    diagnostics,
    status,
    push(chunk: string): void {
      session.push(chunk);
    },
    flush(): ParseUpdate | undefined {
      return session.flush();
    },
    finish(): ParseUpdate {
      return session.finish();
    },
    reset(): void {
      session.reset();
    },
  };
}
