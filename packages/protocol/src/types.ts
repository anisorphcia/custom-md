export type SemanticNodeKind = "inline" | "block" | "container";

export type FallbackStrategy =
  | "raw"
  | "children"
  | "remove"
  | "blockquote"
  | "error-component";

export interface ValidationSuccess<T> {
  success: true;
  data: T;
}

export interface ValidationFailure {
  success: false;
  error: {
    issues: ReadonlyArray<{
      path: ReadonlyArray<PropertyKey>;
      message: string;
      code?: string;
    }>;
  };
}

export interface SchemaLike<TOutput = unknown> {
  safeParse(value: unknown): ValidationSuccess<TOutput> | ValidationFailure;
}

export interface SemanticNodeDefinition<TSchema extends SchemaLike = SchemaLike> {
  kind: SemanticNodeKind;
  schema: TSchema;
  fallback: FallbackStrategy;
  renderPending?: boolean;
  description?: string;
  examples?: string[];
}

export type SemanticNodeDefinitions = Record<string, SemanticNodeDefinition>;

export interface SemanticProtocol<TNodes extends SemanticNodeDefinitions = SemanticNodeDefinitions> {
  version: string;
  nodes: TNodes;
}

export type InferSchema<TSchema> =
  TSchema extends SchemaLike<infer TOutput> ? TOutput : never;

export type InferNodeAttributes<
  TProtocol extends SemanticProtocol,
  TName extends keyof TProtocol["nodes"],
> = InferSchema<TProtocol["nodes"][TName]["schema"]>;

export interface SemanticValidationInput {
  name: string;
  rawAttributes: Record<string, string>;
  range?: {
    start: number;
    end: number;
  };
  nodeId?: string;
}

export interface ProtocolDiagnostic {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
  range?: {
    start: number;
    end: number;
  };
  nodeId?: string;
  raw?: string;
}

export interface SemanticValidationResult {
  valid: boolean;
  attributes: Record<string, unknown>;
  diagnostics: ProtocolDiagnostic[];
  definition?: SemanticNodeDefinition;
}
