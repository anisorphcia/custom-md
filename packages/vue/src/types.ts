import type {
  MarkdownNode,
  NodeConfidence,
  NodeStatus,
  SemanticNode,
  SemanticRenderContext,
} from "@semantic-md/core";
import type { Component, VNodeChild } from "vue";

export interface SemanticComponentProps<
  TAttributes extends Record<string, unknown> = Record<string, unknown>,
> {
  node: SemanticNode;
  attributes: TAttributes;
  status: NodeStatus;
  confidence: NodeConfidence;
  context: SemanticRenderContext;
}

export type SemanticComponent = Component;
export type SemanticComponentMap = Record<string, SemanticComponent>;
export type MarkdownComponentMap = Partial<Record<MarkdownNode["type"], Component | string>>;

export interface RenderedSemanticSlot {
  default(): VNodeChild;
}
