import {
  createStreamingMarkdownSession,
  type Diagnostic,
  type MarkdownDocument,
  type ParseUpdate,
  type StreamingMode,
} from "@semantic-md/core";
import type { SemanticProtocol } from "@semantic-md/protocol";
import {
  onScopeDispose,
  ref,
  shallowRef,
  toValue,
  watch,
  type MaybeRef,
  type Ref,
  type ShallowRef,
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
  push(chunk: string): ParseUpdate;
  finish(): ParseUpdate;
  reset(): void;
}

export function useSemanticMarkdown(
  options: UseSemanticMarkdownOptions = {},
): UseSemanticMarkdownResult {
  let session = createStreamingMarkdownSession({
    ...(options.protocol ? { protocol: options.protocol } : {}),
    ...(toValue(options.streamingMode)
      ? { mode: toValue(options.streamingMode) }
      : {}),
    ...(options.batchInterval !== undefined
      ? { batchInterval: options.batchInterval }
      : {}),
  });
  const document = shallowRef(session.getSnapshot());
  const patches = shallowRef<ParseUpdate["patches"]>([]);
  const diagnostics = shallowRef<Diagnostic[]>([]);
  const status = ref<ParseUpdate["streamStatus"]>("idle");

  const stopModeWatch = watch(
    () => toValue(options.streamingMode),
    (streamingMode) => {
      session = createStreamingMarkdownSession({
        ...(options.protocol ? { protocol: options.protocol } : {}),
        ...(streamingMode ? { mode: streamingMode } : {}),
        ...(options.batchInterval !== undefined
          ? { batchInterval: options.batchInterval }
          : {}),
      });
      document.value = session.getSnapshot();
      patches.value = [];
      diagnostics.value = [];
      status.value = "idle";
    },
  );

  const apply = (update: ParseUpdate): ParseUpdate => {
    document.value = update.snapshot;
    patches.value = update.patches;
    diagnostics.value = update.diagnostics;
    status.value = update.streamStatus;
    return update;
  };
  onScopeDispose(stopModeWatch);

  return {
    document,
    patches,
    diagnostics,
    status,
    push(chunk: string): ParseUpdate {
      return apply(session.push(chunk));
    },
    finish(): ParseUpdate {
      return apply(session.finish());
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
