import type { InjectionKey } from "vue";
import type { SemanticRenderContext } from "@semantic-md/core";
import { inject } from "vue";

export const semanticMarkdownContextKey: InjectionKey<SemanticRenderContext> =
  Symbol("SemanticMarkdownContext");

export function useSemanticMarkdownContext(): SemanticRenderContext {
  const context = inject(semanticMarkdownContextKey);
  if (!context) {
    throw new Error("useSemanticMarkdownContext must be used below SemanticMarkdown");
  }
  return context;
}
