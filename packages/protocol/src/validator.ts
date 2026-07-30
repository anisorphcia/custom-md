import { getNodeDefinition } from "./registry";
import type {
  ProtocolDiagnostic,
  SemanticProtocol,
  SemanticValidationInput,
  SemanticValidationResult,
} from "./types";

const FORBIDDEN_ATTRIBUTES = new Set([
  "style",
  "class",
  "classname",
  "innerhtml",
  "srcdoc",
]);
const ATTRIBUTE_NAME = /^[A-Za-z_][A-Za-z0-9_-]*$/;

function diagnostic(
  input: SemanticValidationInput,
  code: string,
  message: string,
  raw?: string,
): ProtocolDiagnostic {
  return {
    code,
    message,
    severity: "error",
    ...(input.range ? { range: input.range } : {}),
    ...(input.nodeId ? { nodeId: input.nodeId } : {}),
    ...(raw ? { raw } : {}),
  };
}

export function isForbiddenAttribute(name: string): boolean {
  const normalized = name.toLowerCase();
  return FORBIDDEN_ATTRIBUTES.has(normalized) || normalized.startsWith("on");
}

export function validateSemanticNode(
  input: SemanticValidationInput,
  protocol: SemanticProtocol,
): SemanticValidationResult {
  const definition = getNodeDefinition(protocol, input.name);
  if (!definition) {
    return {
      valid: false,
      attributes: {},
      diagnostics: [
        diagnostic(
          input,
          "UNKNOWN_SEMANTIC_NODE",
          `Unknown semantic node: ${input.name}`,
          input.name,
        ),
      ],
    };
  }

  const safeAttributes: Record<string, string> = {};
  const diagnostics: ProtocolDiagnostic[] = [];
  for (const [name, value] of Object.entries(input.rawAttributes)) {
    if (!ATTRIBUTE_NAME.test(name) || isForbiddenAttribute(name)) {
      diagnostics.push(
        diagnostic(input, "FORBIDDEN_ATTRIBUTE", `Forbidden attribute: ${name}`, name),
      );
      continue;
    }
    safeAttributes[name] = value;
  }

  const result = definition.schema.safeParse(safeAttributes);
  if (!result.success) {
    for (const issue of result.error.issues) {
      const path = issue.path.map(String).join(".");
      const isMissing = issue.code === "invalid_type" && /required/i.test(issue.message);
      diagnostics.push(
        diagnostic(
          input,
          isMissing ? "MISSING_REQUIRED_ATTRIBUTE" : "INVALID_ATTRIBUTE_TYPE",
          path ? `${path}: ${issue.message}` : issue.message,
        ),
      );
    }
    return {
      valid: false,
      attributes: {},
      diagnostics,
      definition,
    };
  }

  if (typeof result.data !== "object" || result.data === null || Array.isArray(result.data)) {
    return {
      valid: false,
      attributes: {},
      diagnostics: [
        ...diagnostics,
        diagnostic(
          input,
          "INVALID_ATTRIBUTE_TYPE",
          "Semantic node schemas must produce an attribute object",
        ),
      ],
      definition,
    };
  }

  return {
    valid: diagnostics.length === 0,
    attributes: { ...result.data } as Record<string, unknown>,
    diagnostics,
    definition,
  };
}
