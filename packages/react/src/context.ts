import { createContext, useContext } from "react";
import type { SemanticRenderContext } from "@semantic-md/core";

const defaultContext: SemanticRenderContext = {
  locale: "zh-CN",
  requestAction() {},
  resolveReference() {},
  reportDiagnostic() {},
};

export const SemanticMarkdownContext =
  createContext<SemanticRenderContext>(defaultContext);

export function useSemanticMarkdownContext(): SemanticRenderContext {
  return useContext(SemanticMarkdownContext);
}
