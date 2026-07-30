import {
  parseMarkdownWithDiagnostics,
  type MarkdownDocument,
  type SemanticActionRequest,
  type SemanticRenderContext,
  type StreamingMode,
} from "@semantic-md/core";
import type { SemanticProtocol } from "@semantic-md/protocol";
import {
  computed,
  defineComponent,
  h,
  provide,
  type PropType,
  watchEffect,
} from "vue";
import { semanticMarkdownContextKey } from "./context";
import { renderNode } from "./renderNode";
import type { MarkdownComponentMap, SemanticComponentMap } from "./types";

export const SemanticMarkdown = defineComponent({
  name: "SemanticMarkdown",
  props: {
    content: { type: String, default: "" },
    document: {
      type: Object as PropType<MarkdownDocument | undefined>,
      default: undefined,
    },
    protocol: {
      type: Object as PropType<SemanticProtocol>,
      required: true,
    },
    components: {
      type: Object as PropType<SemanticComponentMap>,
      default: () => ({}),
    },
    markdownComponents: {
      type: Object as PropType<MarkdownComponentMap>,
      default: () => ({}),
    },
    streamingMode: {
      type: String as PropType<StreamingMode>,
      default: "balanced",
    },
    locale: { type: String, default: "zh-CN" },
    showPendingState: { type: Boolean, default: true },
  },
  emits: {
    diagnostic: (_diagnostic: unknown) => true,
    action: (_action: SemanticActionRequest) => true,
    reference: (_id: string) => true,
  },
  setup(props, { emit }) {
    const context: SemanticRenderContext = {
      get locale() {
        return props.locale;
      },
      requestAction(action) {
        emit("action", action);
      },
      resolveReference(id) {
        emit("reference", id);
      },
      reportDiagnostic(diagnostic) {
        emit("diagnostic", diagnostic);
      },
    };
    provide(semanticMarkdownContextKey, context);
    const parsed = computed(() =>
      props.document
        ? { document: props.document, diagnostics: [] }
        : parseMarkdownWithDiagnostics(props.content, {
            protocol: props.protocol,
            mode: props.streamingMode,
          }),
    );
    watchEffect(() => {
      for (const diagnostic of parsed.value.diagnostics) {
        emit("diagnostic", diagnostic);
      }
    });
    return () =>
      h(
        "div",
        { class: "semantic-markdown" },
        renderNode(parsed.value.document, {
          protocol: props.protocol,
          components: props.components,
          markdownComponents: props.markdownComponents,
          context,
          showPendingState: props.showPendingState,
        }),
      );
  },
});
