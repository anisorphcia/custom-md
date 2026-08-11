import type { SemanticComponentMap, SemanticComponentProps } from "@semantic-md/react";

function numericAttribute(attributes: Record<string, unknown>, name: string): number | undefined {
  return typeof attributes[name] === "number" ? attributes[name] : undefined;
}

function stringAttribute(attributes: Record<string, unknown>, name: string): string | undefined {
  return typeof attributes[name] === "string" ? attributes[name] : undefined;
}

function comparison(value: number | undefined, label: string) {
  if (value === undefined) return null;
  const direction = value > 0 ? "up" : value < 0 ? "down" : "flat";
  return (
    <span className="metric-comparison" data-direction={direction}>
      <small>{label}</small> {value > 0 ? "+" : ""}
      {value}%
    </span>
  );
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

function FinancialMetric({ attributes, children, status }: SemanticComponentProps) {
  const direction = stringAttribute(attributes, "direction");
  const value = numericAttribute(attributes, "value");
  return (
    <article
      className="financial-metric"
      data-sentiment={stringAttribute(attributes, "sentiment")}
      data-status={status}
    >
      <div className="metric-heading">
        <span>{stringAttribute(attributes, "label")}</span>
        <strong>
          {direction === "up" ? "↗" : direction === "down" ? "↘" : "→"} {value}
          {metricSuffix(attributes)}
        </strong>
      </div>
      <div className="metric-comparisons">
        {comparison(numericAttribute(attributes, "yoy"), "同比")}
        {comparison(numericAttribute(attributes, "qoq"), "环比")}
      </div>
      <div className="metric-analysis">{children}</div>
    </article>
  );
}

const basisLabels = { yoy: "同比", qoq: "环比" } as const;

function FinancialInsight({ attributes, children, status }: SemanticComponentProps) {
  const tone = stringAttribute(attributes, "tone");
  const toneLabels = { highlight: "核心亮点", pressure: "主要压力", watch: "待验证" } as const;
  const confidenceLabels = { high: "高", medium: "中", low: "低" } as const;
  const confidence = stringAttribute(attributes, "confidence");
  return (
    <aside className="financial-insight" data-tone={tone} data-status={status}>
      <header>
        <span>{toneLabels[tone as keyof typeof toneLabels] ?? tone}</span>
        <strong>{stringAttribute(attributes, "title")}</strong>
        <small>
          置信度 {confidenceLabels[confidence as keyof typeof confidenceLabels] ?? confidence}
        </small>
      </header>
      <div className="insight-analysis">{children}</div>
    </aside>
  );
}

function PeriodComparison({ attributes, children, status }: SemanticComponentProps) {
  const basis = stringAttribute(attributes, "basis");
  const direction = stringAttribute(attributes, "direction");
  const arrow = direction === "up" ? "↗" : direction === "down" ? "↘" : "→";
  return (
    <span
      className="period-comparison"
      data-direction={direction}
      data-sentiment={stringAttribute(attributes, "sentiment")}
      data-status={status}
    >
      <b>{basisLabels[basis as keyof typeof basisLabels] ?? basis}</b>
      <span>
        {arrow} {children}
      </span>
    </span>
  );
}

function MarginChange({ attributes, children, status }: SemanticComponentProps) {
  const basis = stringAttribute(attributes, "basis");
  const change = numericAttribute(attributes, "change") ?? 0;
  return (
    <span
      className="margin-change"
      data-direction={change > 0 ? "up" : change < 0 ? "down" : "flat"}
      data-sentiment={stringAttribute(attributes, "sentiment")}
      data-status={status}
    >
      <span>{children}</span>
      <small>
        {basisLabels[basis as keyof typeof basisLabels] ?? basis} {change > 0 ? "+" : ""}
        {change}pp
      </small>
    </span>
  );
}

function ProfitTransition({ attributes, children, status }: SemanticComponentProps) {
  const state = stringAttribute(attributes, "state");
  const stateLabels = {
    "turn-profitable": "扭亏为盈",
    "turn-loss": "由盈转亏",
    "loss-narrowed": "亏损收窄",
    "loss-widened": "亏损扩大",
  } as const;
  const previous = stringAttribute(attributes, "previous");
  const current = stringAttribute(attributes, "current");
  return (
    <span className="profit-transition" data-state={state} data-status={status}>
      <span>{children}</span>
      <strong>{stateLabels[state as keyof typeof stateLabels] ?? state}</strong>
      {previous && current && (
        <small>
          {previous} → {current}
        </small>
      )}
    </span>
  );
}

function SegmentPerformance({ attributes, children, status }: SemanticComponentProps) {
  const yoy = numericAttribute(attributes, "yoy");
  return (
    <article
      className="segment-performance"
      data-sentiment={stringAttribute(attributes, "sentiment")}
      data-status={status}
    >
      <header>
        <span className="scene-kicker">业务分部</span>
        <strong>{stringAttribute(attributes, "label")}</strong>
      </header>
      <dl>
        {numericAttribute(attributes, "share") !== undefined && (
          <div>
            <dt>收入占比</dt>
            <dd>{numericAttribute(attributes, "share")}%</dd>
          </div>
        )}
        {yoy !== undefined && (
          <div data-direction={yoy > 0 ? "up" : yoy < 0 ? "down" : "flat"}>
            <dt>同比</dt>
            <dd>
              {yoy > 0 ? "+" : ""}
              {yoy}%
            </dd>
          </div>
        )}
        {numericAttribute(attributes, "margin") !== undefined && (
          <div>
            <dt>分部利润率</dt>
            <dd>{numericAttribute(attributes, "margin")}%</dd>
          </div>
        )}
      </dl>
      <div className="segment-analysis">{children}</div>
    </article>
  );
}

function CashFlow({ attributes, children, status }: SemanticComponentProps) {
  const quality = stringAttribute(attributes, "quality");
  const qualityLabels = { strong: "强劲", adequate: "尚可", weak: "偏弱" } as const;
  return (
    <article className="cash-flow-card" data-quality={quality} data-status={status}>
      <header>
        <div>
          <span className="scene-kicker">Cash conversion</span>
          <strong>现金流质量</strong>
        </div>
        <b>{qualityLabels[quality as keyof typeof qualityLabels] ?? quality}</b>
      </header>
      <dl>
        <div>
          <dt>经营现金流</dt>
          <dd>{stringAttribute(attributes, "operating")}</dd>
        </div>
        {stringAttribute(attributes, "capex") && (
          <div>
            <dt>资本开支</dt>
            <dd>{stringAttribute(attributes, "capex")}</dd>
          </div>
        )}
        {stringAttribute(attributes, "free") && (
          <div>
            <dt>自由现金流</dt>
            <dd>{stringAttribute(attributes, "free")}</dd>
          </div>
        )}
      </dl>
      <div className="cash-flow-analysis">{children}</div>
    </article>
  );
}

function Guidance({ attributes, children }: SemanticComponentProps) {
  const stance = stringAttribute(attributes, "stance");
  const labels = { raised: "上调", maintained: "维持", lowered: "下调" } as const;
  return (
    <aside className="guidance-card" data-stance={stance}>
      <div className="scene-kicker">业绩指引 · {stringAttribute(attributes, "period")}</div>
      <strong>{labels[stance as keyof typeof labels] ?? stance}</strong>
      <div>{children}</div>
      <small>管理层信心：{stringAttribute(attributes, "confidence")}</small>
    </aside>
  );
}

function Milestone({ attributes, children }: SemanticComponentProps) {
  const progress = numericAttribute(attributes, "progress") ?? 0;
  return (
    <article className="milestone-card" data-state={stringAttribute(attributes, "state")}>
      <header>
        <strong>{stringAttribute(attributes, "owner")}</strong>
        <span>{progress}%</span>
      </header>
      <div className="progress-track">
        <i style={{ width: `${progress}%` }} />
      </div>
      <div>{children}</div>
      <footer>
        <span>截止 {stringAttribute(attributes, "due")}</span>
        <b>{stringAttribute(attributes, "state")}</b>
      </footer>
    </article>
  );
}

function Incident({ attributes, children, status }: SemanticComponentProps) {
  return (
    <article
      className="incident-card"
      data-severity={stringAttribute(attributes, "severity")}
      data-status={status}
    >
      <header>
        <strong>{stringAttribute(attributes, "severity")}</strong>
        <span>{stringAttribute(attributes, "state")}</span>
      </header>
      <dl>
        <div>
          <dt>开始时间</dt>
          <dd>{stringAttribute(attributes, "startedAt")}</dd>
        </div>
        <div>
          <dt>影响范围</dt>
          <dd>{stringAttribute(attributes, "scope")}</dd>
        </div>
      </dl>
      <div className="incident-update">{children}</div>
    </article>
  );
}

function Evidence({ attributes, children }: SemanticComponentProps) {
  return (
    <article className="evidence-card" data-strength={stringAttribute(attributes, "strength")}>
      <header>
        <span className="scene-kicker">证据强度</span>
        <strong>{stringAttribute(attributes, "strength")}</strong>
      </header>
      <div className="evidence-stats">
        {numericAttribute(attributes, "sample") !== undefined && (
          <span>
            <small>样本量</small>n = {numericAttribute(attributes, "sample")}
          </span>
        )}
        {stringAttribute(attributes, "effect") && (
          <span>
            <small>效应量</small>
            {stringAttribute(attributes, "effect")}
          </span>
        )}
        {stringAttribute(attributes, "confidenceInterval") && (
          <span>
            <small>置信区间</small>
            {stringAttribute(attributes, "confidenceInterval")}
          </span>
        )}
      </div>
      <div>{children}</div>
    </article>
  );
}

function Increase({ attributes, children, status }: SemanticComponentProps) {
  return (
    <span className="semantic-chip trend increase" data-status={status}>
      ↗ {children}
      <small>{numericAttribute(attributes, "value")}</small>
    </span>
  );
}

function Decrease({ attributes, children, status }: SemanticComponentProps) {
  return (
    <span className="semantic-chip trend decrease" data-status={status}>
      ↘ {children}
      <small>{numericAttribute(attributes, "value")}</small>
    </span>
  );
}

function Status({ attributes, children }: SemanticComponentProps) {
  return (
    <span className="semantic-chip status" data-value={stringAttribute(attributes, "value")}>
      {children}
    </span>
  );
}

function Risk({ attributes, children, status }: SemanticComponentProps) {
  return (
    <aside
      className="risk-card"
      data-level={stringAttribute(attributes, "level")}
      data-status={status}
    >
      <strong>风险 · {stringAttribute(attributes, "level")}</strong>
      <div>{children}</div>
    </aside>
  );
}

function Citation({ attributes, children, context }: SemanticComponentProps) {
  const id = stringAttribute(attributes, "id") ?? "";
  return (
    <button className="citation" type="button" onClick={() => context.resolveReference(id)}>
      {children}
    </button>
  );
}

function Action({ attributes, children, context }: SemanticComponentProps) {
  const name = stringAttribute(attributes, "name") ?? "unknown";
  const targetId = stringAttribute(attributes, "targetId");
  return (
    <button
      className="action"
      type="button"
      onClick={() =>
        context.requestAction({
          name,
          ...(targetId ? { targetId } : {}),
          attributes,
        })
      }
    >
      {children}
    </button>
  );
}

export const semanticComponents: SemanticComponentMap = {
  financialMetric: FinancialMetric,
  financialInsight: FinancialInsight,
  periodComparison: PeriodComparison,
  marginChange: MarginChange,
  profitTransition: ProfitTransition,
  segmentPerformance: SegmentPerformance,
  cashFlow: CashFlow,
  guidance: Guidance,
  milestone: Milestone,
  incident: Incident,
  evidence: Evidence,
  increase: Increase,
  decrease: Decrease,
  status: Status,
  risk: Risk,
  citation: Citation,
  action: Action,
};
