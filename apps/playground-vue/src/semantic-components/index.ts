import type {
  NodeConfidence,
  NodeStatus,
  SemanticNode,
  SemanticRenderContext,
} from "@semantic-md/core";
import type { SemanticComponentMap } from "@semantic-md/vue";
import { defineComponent, h, type PropType } from "vue";

const sharedProps = {
  node: {
    type: Object as PropType<SemanticNode>,
    required: true as const,
  },
  attributes: {
    type: Object as PropType<Record<string, unknown>>,
    required: true as const,
  },
  status: {
    type: String as PropType<NodeStatus>,
    required: true as const,
  },
  confidence: {
    type: String as PropType<NodeConfidence>,
    required: true as const,
  },
  context: {
    type: Object as PropType<SemanticRenderContext>,
    required: true as const,
  },
};

function stringAttribute(
  attributes: Record<string, unknown>,
  name: string,
): string | undefined {
  return typeof attributes[name] === "string" ? attributes[name] : undefined;
}

function trendComponent(direction: "increase" | "decrease") {
  return defineComponent({
    props: sharedProps,
    setup(props, { slots }) {
      return () =>
        h(
          "span",
          {
            class: `semantic-chip trend ${direction}`,
            "data-status": props.status,
          },
          [direction === "increase" ? "↗ " : "↘ ", slots.default?.()],
        );
    },
  });
}

const Status = defineComponent({
  props: sharedProps,
  setup(props, { slots }) {
    return () =>
      h(
        "span",
        {
          class: "semantic-chip status",
          "data-value": stringAttribute(props.attributes, "value"),
        },
        slots.default?.(),
      );
  },
});

const Risk = defineComponent({
  props: sharedProps,
  setup(props, { slots }) {
    return () =>
      h(
        "aside",
        {
          class: "risk-card",
          "data-level": stringAttribute(props.attributes, "level"),
          "data-status": props.status,
        },
        [
          h("strong", `风险 · ${stringAttribute(props.attributes, "level")}`),
          h("div", slots.default?.()),
        ],
      );
  },
});

const Citation = defineComponent({
  props: sharedProps,
  setup(props, { slots }) {
    return () =>
      h(
        "button",
        {
          type: "button",
          class: "citation",
          onClick: () =>
            props.context.resolveReference(
              stringAttribute(props.attributes, "id") ?? "",
            ),
        },
        slots.default?.(),
      );
  },
});

const Action = defineComponent({
  props: sharedProps,
  setup(props, { slots }) {
    return () =>
      h(
        "button",
        {
          type: "button",
          class: "action",
          onClick: () => {
            const targetId = stringAttribute(props.attributes, "targetId");
            props.context.requestAction({
              name: stringAttribute(props.attributes, "name") ?? "unknown",
              ...(targetId ? { targetId } : {}),
              attributes: props.attributes,
            });
          },
        },
        slots.default?.(),
      );
  },
});

export const semanticComponents: SemanticComponentMap = {
  increase: trendComponent("increase"),
  decrease: trendComponent("decrease"),
  status: Status,
  risk: Risk,
  citation: Citation,
  action: Action,
};
