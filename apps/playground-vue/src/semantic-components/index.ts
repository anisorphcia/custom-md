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

function metricSuffix(attributes: Record<string, unknown>): string {
  const unit = stringAttribute(attributes, "unit");
  if (unit === "percent") return "%";
  if (unit === "ratio") return "×";
  if (unit !== "currency") return "";

  const currency = stringAttribute(attributes, "currency");
  const scale = stringAttribute(attributes, "scale");
  if (!currency && !scale) return " 万元";
  const scaleLabels: Record<string, string> = {
    unit: "",
    thousand: "千",
    "ten-thousand": "万",
    million: "百万",
    "hundred-million": "亿",
    billion: "十亿",
  };
  const currencyLabels: Record<string, string> = {
    CNY: "元",
    USD: "美元",
    HKD: "港元",
    EUR: "欧元",
  };
  return ` ${scaleLabels[scale ?? "unit"] ?? ""}${currencyLabels[currency ?? "CNY"] ?? currency}`;
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
              `${direction === "up" ? "↗" : direction === "down" ? "↘" : "→"} ${numberAttribute(props.attributes, "value")}${metricSuffix(props.attributes)}`,
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

const basisLabels = { yoy: "同比", qoq: "环比" } as const;

const FinancialInsight = defineComponent({
  props: sharedProps,
  setup(props, { slots }) {
    return () => {
      const tone = stringAttribute(props.attributes, "tone");
      const confidence = stringAttribute(props.attributes, "confidence");
      const toneLabels: Record<string, string> = {
        highlight: "核心亮点",
        pressure: "主要压力",
        watch: "待验证",
      };
      const confidenceLabels: Record<string, string> = { high: "高", medium: "中", low: "低" };
      return h(
        "aside",
        {
          class: "financial-insight",
          "data-tone": tone,
          "data-status": props.status,
        },
        [
          h("header", [
            h("span", toneLabels[tone ?? ""] ?? tone),
            h("strong", stringAttribute(props.attributes, "title")),
            h("small", `置信度 ${confidenceLabels[confidence ?? ""] ?? confidence}`),
          ]),
          h("div", { class: "insight-analysis" }, slots.default?.()),
        ],
      );
    };
  },
});

const PeriodComparison = defineComponent({
  props: sharedProps,
  setup(props, { slots }) {
    return () => {
      const basis = stringAttribute(props.attributes, "basis");
      const direction = stringAttribute(props.attributes, "direction");
      const arrow = direction === "up" ? "↗" : direction === "down" ? "↘" : "→";
      return h(
        "span",
        {
          class: "period-comparison",
          "data-direction": direction,
          "data-sentiment": stringAttribute(props.attributes, "sentiment"),
          "data-status": props.status,
        },
        [
          h("b", basisLabels[basis as keyof typeof basisLabels] ?? basis),
          h("span", [arrow, " ", slots.default?.()]),
        ],
      );
    };
  },
});

const MarginChange = defineComponent({
  props: sharedProps,
  setup(props, { slots }) {
    return () => {
      const basis = stringAttribute(props.attributes, "basis");
      const change = numberAttribute(props.attributes, "change") ?? 0;
      return h(
        "span",
        {
          class: "margin-change",
          "data-direction": change > 0 ? "up" : change < 0 ? "down" : "flat",
          "data-sentiment": stringAttribute(props.attributes, "sentiment"),
          "data-status": props.status,
        },
        [
          h("span", slots.default?.()),
          h(
            "small",
            `${basisLabels[basis as keyof typeof basisLabels] ?? basis} ${change > 0 ? "+" : ""}${change}pp`,
          ),
        ],
      );
    };
  },
});

const ProfitTransition = defineComponent({
  props: sharedProps,
  setup(props, { slots }) {
    return () => {
      const state = stringAttribute(props.attributes, "state");
      const stateLabels: Record<string, string> = {
        "turn-profitable": "扭亏为盈",
        "turn-loss": "由盈转亏",
        "loss-narrowed": "亏损收窄",
        "loss-widened": "亏损扩大",
      };
      const previous = stringAttribute(props.attributes, "previous");
      const current = stringAttribute(props.attributes, "current");
      return h(
        "span",
        {
          class: "profit-transition",
          "data-state": state,
          "data-status": props.status,
        },
        [
          h("span", slots.default?.()),
          h("strong", stateLabels[state ?? ""] ?? state),
          previous && current ? h("small", `${previous} → ${current}`) : null,
        ],
      );
    };
  },
});

const SegmentPerformance = defineComponent({
  props: sharedProps,
  setup(props, { slots }) {
    return () => {
      const a = props.attributes;
      const yoy = numberAttribute(a, "yoy");
      return h(
        "article",
        {
          class: "segment-performance",
          "data-sentiment": stringAttribute(a, "sentiment"),
          "data-status": props.status,
        },
        [
          h("header", [
            h("span", { class: "scene-kicker" }, "业务分部"),
            h("strong", stringAttribute(a, "label")),
          ]),
          h("dl", [
            numberAttribute(a, "share") !== undefined
              ? h("div", [h("dt", "收入占比"), h("dd", `${numberAttribute(a, "share")}%`)])
              : null,
            yoy !== undefined
              ? h("div", { "data-direction": yoy > 0 ? "up" : yoy < 0 ? "down" : "flat" }, [
                  h("dt", "同比"),
                  h("dd", `${yoy > 0 ? "+" : ""}${yoy}%`),
                ])
              : null,
            numberAttribute(a, "margin") !== undefined
              ? h("div", [h("dt", "分部利润率"), h("dd", `${numberAttribute(a, "margin")}%`)])
              : null,
          ]),
          h("div", { class: "segment-analysis" }, slots.default?.()),
        ],
      );
    };
  },
});

const CashFlow = defineComponent({
  props: sharedProps,
  setup(props, { slots }) {
    return () => {
      const a = props.attributes;
      const quality = stringAttribute(a, "quality");
      const qualityLabels: Record<string, string> = {
        strong: "强劲",
        adequate: "尚可",
        weak: "偏弱",
      };
      return h(
        "article",
        {
          class: "cash-flow-card",
          "data-quality": quality,
          "data-status": props.status,
        },
        [
          h("header", [
            h("div", [
              h("span", { class: "scene-kicker" }, "Cash conversion"),
              h("strong", "现金流质量"),
            ]),
            h("b", qualityLabels[quality ?? ""] ?? quality),
          ]),
          h("dl", [
            h("div", [h("dt", "经营现金流"), h("dd", stringAttribute(a, "operating"))]),
            stringAttribute(a, "capex")
              ? h("div", [h("dt", "资本开支"), h("dd", stringAttribute(a, "capex"))])
              : null,
            stringAttribute(a, "free")
              ? h("div", [h("dt", "自由现金流"), h("dd", stringAttribute(a, "free"))])
              : null,
          ]),
          h("div", { class: "cash-flow-analysis" }, slots.default?.()),
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
  financialInsight: FinancialInsight,
  periodComparison: PeriodComparison,
  marginChange: MarginChange,
  profitTransition: ProfitTransition,
  segmentPerformance: SegmentPerformance,
  cashFlow: CashFlow,
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
