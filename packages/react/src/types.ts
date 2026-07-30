import type {
  MarkdownNode,
  NodeConfidence,
  NodeStatus,
  SemanticNode,
  SemanticRenderContext,
} from "@semantic-md/core";
import type { ComponentType, ElementType, ReactNode } from "react";

export interface SemanticComponentProps<
  TAttributes extends Record<string, unknown> = Record<string, unknown>,
> {
  node: SemanticNode;
  attributes: TAttributes;
  status: NodeStatus;
  confidence: NodeConfidence;
  children: ReactNode;
  context: SemanticRenderContext;
}

export type SemanticComponent = ComponentType<SemanticComponentProps>;
export type SemanticComponentMap = Record<string, SemanticComponent>;

export interface MarkdownComponentProps {
  node: MarkdownNode;
  children?: ReactNode;
}

export type MarkdownComponentMap = Partial<Record<MarkdownNode["type"], ElementType>>;
