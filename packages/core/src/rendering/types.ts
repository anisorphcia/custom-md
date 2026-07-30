import type { Diagnostic } from "../ast/types";

export interface SemanticActionRequest {
  name: string;
  targetId?: string;
  attributes?: Record<string, unknown>;
}

export interface SemanticRenderContext {
  locale: string;
  requestAction(action: SemanticActionRequest): void;
  resolveReference(id: string): void;
  reportDiagnostic(diagnostic: Diagnostic): void;
}
