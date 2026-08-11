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

function stringAttribute(attributes: Record<string, unknown>, name: string): string | undefined {
  return typeof attributes[name] === "string" ? attributes[name] : undefined;
}

function numberAttribute(attributes: Record<string, unknown>, name: string): number | undefined {
  return typeof attributes[name] === "number" ? attributes[name] : undefined;
}

const FinancialMetric = defineComponent({
  props: sharedProps,
  setup(props, { slots }) {
    const comparison = (name: "yoy" | "qoq", label: string) => {
      const value = numberAttribute(props.attributes, name);
      if (value === undefined) return null;
      return h(
        "span",
        {
          class: "metric-comparison",
          "data-direction": value > 0 ? "up" : value < 0 ? "down" : "flat",
        },
        [h("small", label), ` ${value > 0 ? "+" : ""}${value}%`],
      );
    };
    return () => {
      const unit = stringAttribute(props.attributes, "unit");
      const suffix =
        unit === "percent" ? "%" : unit === "currency" ? " 万元" : unit === "ratio" ? "×" : "";
      const direction = stringAttribute(props.attributes, "direction");
      return h(
        "article",
        {
          class: "financial-metric",
          "data-sentiment": stringAttribute(props.attributes, "sentiment"),
          "data-status": props.status,
        },
        [
          h("div", { class: "metric-heading" }, [
            h("span", stringAttribute(props.attributes, "label")),
            h(
              "strong",
              `${direction === "up" ? "↗" : direction === "down" ? "↘" : "→"} ${numberAttribute(props.attributes, "value")}${suffix}`,
            ),
          ]),
          h("div", { class: "metric-comparisons" }, [
            comparison("yoy", "同比"),
            comparison("qoq", "环比"),
          ]),
          h("div", { class: "metric-analysis" }, slots.default?.()),
        ],
      );
    };
  },
});

function sceneContainer(kind: "guidance" | "milestone" | "incident" | "evidence") {
  return defineComponent({
    props: sharedProps,
    setup(props, { slots }) {
      return () => {
        const a = props.attributes;
        if (kind === "guidance")
          return h(
            "aside",
            { class: "guidance-card", "data-stance": stringAttribute(a, "stance") },
            [
              h("div", { class: "scene-kicker" }, `业绩指引 · ${stringAttribute(a, "period")}`),
              h(
                "strong",
                ({ raised: "上调", maintained: "维持", lowered: "下调" } as Record<string, string>)[
                  stringAttribute(a, "stance") ?? ""
                ],
              ),
              h("div", slots.default?.()),
              h("small", `管理层信心：${stringAttribute(a, "confidence")}`),
            ],
          );
        if (kind === "milestone") {
          const progress = numberAttribute(a, "progress") ?? 0;
          return h(
            "article",
            { class: "milestone-card", "data-state": stringAttribute(a, "state") },
            [
              h("header", [h("strong", stringAttribute(a, "owner")), h("span", `${progress}%`)]),
              h("div", { class: "progress-track" }, [h("i", { style: { width: `${progress}%` } })]),
              h("div", slots.default?.()),
              h("footer", [
                h("span", `截止 ${stringAttribute(a, "due")}`),
                h("b", stringAttribute(a, "state")),
              ]),
            ],
          );
        }
        if (kind === "incident")
          return h(
            "article",
            {
              class: "incident-card",
              "data-severity": stringAttribute(a, "severity"),
              "data-status": props.status,
            },
            [
              h("header", [
                h("strong", stringAttribute(a, "severity")),
                h("span", stringAttribute(a, "state")),
              ]),
              h("dl", [
                h("div", [h("dt", "开始时间"), h("dd", stringAttribute(a, "startedAt"))]),
                h("div", [h("dt", "影响范围"), h("dd", stringAttribute(a, "scope"))]),
              ]),
              h("div", { class: "incident-update" }, slots.default?.()),
            ],
          );
        return h(
          "article",
          { class: "evidence-card", "data-strength": stringAttribute(a, "strength") },
          [
            h("header", [
              h("span", { class: "scene-kicker" }, "证据强度"),
              h("strong", stringAttribute(a, "strength")),
            ]),
            h("div", { class: "evidence-stats" }, [
              numberAttribute(a, "sample") !== undefined
                ? h("span", [h("small", "样本量"), `n = ${numberAttribute(a, "sample")}`])
                : null,
              stringAttribute(a, "effect")
                ? h("span", [h("small", "效应量"), stringAttribute(a, "effect")])
                : null,
              stringAttribute(a, "confidenceInterval")
                ? h("span", [h("small", "置信区间"), stringAttribute(a, "confidenceInterval")])
                : null,
            ]),
            h("div", slots.default?.()),
          ],
        );
      };
    },
  });
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
            props.context.resolveReference(stringAttribute(props.attributes, "id") ?? ""),
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
  financialMetric: FinancialMetric,
  guidance: sceneContainer("guidance"),
  milestone: sceneContainer("milestone"),
  incident: sceneContainer("incident"),
  evidence: sceneContainer("evidence"),
  increase: trendComponent("increase"),
  decrease: trendComponent("decrease"),
  status: Status,
  risk: Risk,
  citation: Citation,
  action: Action,
};
