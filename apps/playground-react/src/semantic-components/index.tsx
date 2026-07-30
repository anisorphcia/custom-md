import type { SemanticComponentMap, SemanticComponentProps } from "@semantic-md/react";

function numericAttribute(
  attributes: Record<string, unknown>,
  name: string,
): number | undefined {
  return typeof attributes[name] === "number" ? attributes[name] : undefined;
}

function stringAttribute(
  attributes: Record<string, unknown>,
  name: string,
): string | undefined {
  return typeof attributes[name] === "string" ? attributes[name] : undefined;
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
    <span
      className="semantic-chip status"
      data-value={stringAttribute(attributes, "value")}
    >
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
    <button
      className="citation"
      type="button"
      onClick={() => context.resolveReference(id)}
    >
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
  increase: Increase,
  decrease: Decrease,
  status: Status,
  risk: Risk,
  citation: Citation,
  action: Action,
};
