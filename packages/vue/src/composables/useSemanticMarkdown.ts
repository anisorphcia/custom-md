import {
  createStreamingMarkdownSession,
  type Diagnostic,
  type MarkdownDocument,
  type ParseUpdate,
  type StreamingMode,
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
  const initialMode = toValue(options.streamingMode);
  let session = createStreamingMarkdownSession({
    ...(options.protocol ? { protocol: options.protocol } : {}),
    ...(initialMode ? { mode: initialMode } : {}),
    ...(options.batchInterval !== undefined ? { batchInterval: options.batchInterval } : {}),
  });
  const document = shallowRef(session.getSnapshot());
  const patches = shallowRef<ParseUpdate["patches"]>([]);
  const diagnostics = shallowRef<Diagnostic[]>([]);
  const status = ref<ParseUpdate["streamStatus"]>("idle");

  const apply = (update: ParseUpdate): void => {
    document.value = update.snapshot;
    patches.value = update.patches;
    diagnostics.value = update.diagnostics;
    status.value = update.streamStatus;
  };
  let unsubscribe = session.subscribe(apply);

  const stopModeWatch = watch(
    () => toValue(options.streamingMode),
    (streamingMode) => {
      unsubscribe();
      session.reset();
      session = createStreamingMarkdownSession({
        ...(options.protocol ? { protocol: options.protocol } : {}),
        ...(streamingMode ? { mode: streamingMode } : {}),
        ...(options.batchInterval !== undefined ? { batchInterval: options.batchInterval } : {}),
      });
      unsubscribe = session.subscribe(apply);
      document.value = session.getSnapshot();
      patches.value = [];
      diagnostics.value = [];
      status.value = "idle";
    },
  );
  onScopeDispose(() => {
    stopModeWatch();
    unsubscribe();
    session.reset();
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
      document.value = session.getSnapshot();
      patches.value = [];
      diagnostics.value = [];
      status.value = "idle";
    },
  };
}
