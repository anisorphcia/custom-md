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

function FinancialMetric({ attributes, children, status }: SemanticComponentProps) {
  const direction = stringAttribute(attributes, "direction");
  const unit = stringAttribute(attributes, "unit");
  const value = numericAttribute(attributes, "value");
  const suffix =
    unit === "percent" ? "%" : unit === "currency" ? " 万元" : unit === "ratio" ? "×" : "";
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
          {suffix}
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

function ClinicalResult({ attributes, children, status }: SemanticComponentProps) {
  const flag = stringAttribute(attributes, "flag");
  const flagLabels = { normal: "参考范围内", high: "高于参考值", low: "低于参考值" } as const;
  return (
    <article className="clinical-result" data-flag={flag} data-status={status}>
      <header>
        <span className="clinical-mark" aria-hidden="true">
          +
        </span>
        <div>
          <small>LAB RESULT / 检验项目</small>
          <strong>{stringAttribute(attributes, "test")}</strong>
        </div>
        <time>{stringAttribute(attributes, "collectedAt")}</time>
      </header>
      <div className="clinical-reading">
        <strong>{numericAttribute(attributes, "value")}</strong>
        <span>{stringAttribute(attributes, "unit")}</span>
        <dl>
          <div>
            <dt>参考区间</dt>
            <dd>{stringAttribute(attributes, "reference")}</dd>
          </div>
          <div>
            <dt>结果标记</dt>
            <dd>{flagLabels[flag as keyof typeof flagLabels] ?? flag}</dd>
          </div>
        </dl>
      </div>
      <div className="clinical-note">{children}</div>
    </article>
  );
}

function FieldObservation({ attributes, children, status }: SemanticComponentProps) {
  const moisture = numericAttribute(attributes, "soilMoisture") ?? 0;
  const condition = stringAttribute(attributes, "condition");
  const conditionLabels = { optimal: "墒情适宜", watch: "持续观察", urgent: "立即处理" } as const;
  return (
    <article className="field-observation" data-condition={condition} data-status={status}>
      <header>
        <div>
          <small>FIELD NOTE</small>
          <strong>{stringAttribute(attributes, "field")}</strong>
        </div>
        <time>{stringAttribute(attributes, "observedAt")}</time>
      </header>
      <div className="field-dashboard">
        <div className="crop-stage">
          <span aria-hidden="true">⌁</span>
          <div>
            <small>{stringAttribute(attributes, "crop")}</small>
            <strong>{stringAttribute(attributes, "stage")}</strong>
          </div>
        </div>
        <div
          className="moisture-dial"
          style={{ background: `conic-gradient(#315d3b ${moisture * 3.6}deg, #ded8bd 0deg)` }}
        >
          <span>
            <strong>{moisture}%</strong>
            <small>土壤含水率</small>
          </span>
        </div>
      </div>
      <div className="field-condition">
        <span>{conditionLabels[condition as keyof typeof conditionLabels] ?? condition}</span>
        {children}
      </div>
    </article>
  );
}

function MachineInspection({ attributes, children, status }: SemanticComponentProps) {
  const state = stringAttribute(attributes, "state");
  const stateLabels = { normal: "RUN", attention: "CHECK", stop: "LOCKOUT" } as const;
  return (
    <article className="machine-inspection" data-state={state} data-status={status}>
      <header>
        <span>ASSET / {stringAttribute(attributes, "asset")}</span>
        <b>{stateLabels[state as keyof typeof stateLabels] ?? state}</b>
      </header>
      <div className="machine-grid">
        <div className="machine-reading">
          <small>MEASURED VALUE</small>
          <strong>{numericAttribute(attributes, "reading")}</strong>
          <span>{stringAttribute(attributes, "unit")}</span>
        </div>
        <dl>
          <div>
            <dt>生产线</dt>
            <dd>{stringAttribute(attributes, "line")}</dd>
          </div>
          <div>
            <dt>点检时间</dt>
            <dd>{stringAttribute(attributes, "checkedAt")}</dd>
          </div>
        </dl>
      </div>
      <div className="machine-note">{children}</div>
    </article>
  );
}

function ThreatFinding({ attributes, children, status }: SemanticComponentProps) {
  const severity = stringAttribute(attributes, "severity");
  return (
    <article className="threat-finding" data-severity={severity} data-status={status}>
      <header>
        <span className="terminal-prompt">$</span>
        <strong>{stringAttribute(attributes, "incidentId")}</strong>
        <b>{severity}</b>
      </header>
      <div className="threat-meta">
        <span>
          <small>PHASE</small>
          {stringAttribute(attributes, "phase")}
        </span>
        <span>
          <small>ASSET</small>
          {stringAttribute(attributes, "asset")}
        </span>
        <time>
          <small>OBSERVED</small>
          {stringAttribute(attributes, "observedAt")}
        </time>
      </div>
      <div className="threat-evidence">{children}</div>
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
  guidance: Guidance,
  milestone: Milestone,
  incident: Incident,
  evidence: Evidence,
  clinicalResult: ClinicalResult,
  fieldObservation: FieldObservation,
  machineInspection: MachineInspection,
  threatFinding: ThreatFinding,
  increase: Increase,
  decrease: Decrease,
  status: Status,
  risk: Risk,
  citation: Citation,
  action: Action,
};
