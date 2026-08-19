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

const ClinicalResult = defineComponent({
  props: sharedProps,
  setup(props, { slots }) {
    return () => {
      const attributes = props.attributes;
      const flag = stringAttribute(attributes, "flag") ?? "normal";
      const flagLabels: Record<string, string> = {
        normal: "参考范围内",
        high: "高于参考值",
        low: "低于参考值",
      };
      return h(
        "article",
        { class: "clinical-result", "data-flag": flag, "data-status": props.status },
        [
          h("header", [
            h("span", { class: "clinical-mark", "aria-hidden": "true" }, "+"),
            h("div", [
              h("small", "LAB RESULT / 检验项目"),
              h("strong", stringAttribute(attributes, "test")),
            ]),
            h("time", stringAttribute(attributes, "collectedAt")),
          ]),
          h("div", { class: "clinical-reading" }, [
            h("strong", `${numberAttribute(attributes, "value")}`),
            h("span", stringAttribute(attributes, "unit")),
            h("dl", [
              h("div", [h("dt", "参考区间"), h("dd", stringAttribute(attributes, "reference"))]),
              h("div", [h("dt", "结果标记"), h("dd", flagLabels[flag] ?? flag)]),
            ]),
          ]),
          h("div", { class: "clinical-note" }, slots.default?.()),
        ],
      );
    };
  },
});

const FieldObservation = defineComponent({
  props: sharedProps,
  setup(props, { slots }) {
    return () => {
      const attributes = props.attributes;
      const moisture = numberAttribute(attributes, "soilMoisture") ?? 0;
      const condition = stringAttribute(attributes, "condition") ?? "optimal";
      const conditionLabels: Record<string, string> = {
        optimal: "墒情适宜",
        watch: "持续观察",
        urgent: "立即处理",
      };
      return h(
        "article",
        {
          class: "field-observation",
          "data-condition": condition,
          "data-status": props.status,
        },
        [
          h("header", [
            h("div", [h("small", "FIELD NOTE"), h("strong", stringAttribute(attributes, "field"))]),
            h("time", stringAttribute(attributes, "observedAt")),
          ]),
          h("div", { class: "field-dashboard" }, [
            h("div", { class: "crop-stage" }, [
              h("span", { "aria-hidden": "true" }, "⌁"),
              h("div", [
                h("small", stringAttribute(attributes, "crop")),
                h("strong", stringAttribute(attributes, "stage")),
              ]),
            ]),
            h(
              "div",
              {
                class: "moisture-dial",
                style: {
                  background: `conic-gradient(#315d3b ${moisture * 3.6}deg, #ded8bd 0deg)`,
                },
              },
              [h("span", [h("strong", `${moisture}%`), h("small", "土壤含水率")])],
            ),
          ]),
          h("div", { class: "field-condition" }, [
            h("span", conditionLabels[condition] ?? condition),
            slots.default?.(),
          ]),
        ],
      );
    };
  },
});

const MachineInspection = defineComponent({
  props: sharedProps,
  setup(props, { slots }) {
    return () => {
      const attributes = props.attributes;
      const state = stringAttribute(attributes, "state") ?? "normal";
      const stateLabels: Record<string, string> = {
        normal: "RUN",
        attention: "CHECK",
        stop: "LOCKOUT",
      };
      return h(
        "article",
        { class: "machine-inspection", "data-state": state, "data-status": props.status },
        [
          h("header", [
            h("span", `ASSET / ${stringAttribute(attributes, "asset")}`),
            h("b", stateLabels[state] ?? state),
          ]),
          h("div", { class: "machine-grid" }, [
            h("div", { class: "machine-reading" }, [
              h("small", "MEASURED VALUE"),
              h("strong", `${numberAttribute(attributes, "reading")}`),
              h("span", stringAttribute(attributes, "unit")),
            ]),
            h("dl", [
              h("div", [h("dt", "生产线"), h("dd", stringAttribute(attributes, "line"))]),
              h("div", [h("dt", "点检时间"), h("dd", stringAttribute(attributes, "checkedAt"))]),
            ]),
          ]),
          h("div", { class: "machine-note" }, slots.default?.()),
        ],
      );
    };
  },
});

const ThreatFinding = defineComponent({
  props: sharedProps,
  setup(props, { slots }) {
    return () => {
      const attributes = props.attributes;
      const severity = stringAttribute(attributes, "severity");
      return h(
        "article",
        { class: "threat-finding", "data-severity": severity, "data-status": props.status },
        [
          h("header", [
            h("span", { class: "terminal-prompt" }, "$"),
            h("strong", stringAttribute(attributes, "incidentId")),
            h("b", severity),
          ]),
          h("div", { class: "threat-meta" }, [
            h("span", [h("small", "PHASE"), stringAttribute(attributes, "phase")]),
            h("span", [h("small", "ASSET"), stringAttribute(attributes, "asset")]),
            h("time", [h("small", "OBSERVED"), stringAttribute(attributes, "observedAt")]),
          ]),
          h("div", { class: "threat-evidence" }, slots.default?.()),
        ],
      );
    };
  },
});

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
  clinicalResult: ClinicalResult,
  fieldObservation: FieldObservation,
  machineInspection: MachineInspection,
  threatFinding: ThreatFinding,
  increase: trendComponent("increase"),
  decrease: trendComponent("decrease"),
  status: Status,
  risk: Risk,
  citation: Citation,
  action: Action,
};
