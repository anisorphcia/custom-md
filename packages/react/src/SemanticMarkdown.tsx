import {
  parseMarkdownWithDiagnostics,
  type Diagnostic,
  type MarkdownDocument,
  type SemanticActionRequest,
  type SemanticRenderContext,
  type StreamingMode,
} from "@semantic-md/core";
import type { SemanticProtocol } from "@semantic-md/protocol";
import { memo, useEffect, useMemo } from "react";
import { SemanticMarkdownContext } from "./context";
import { renderNode } from "./renderNode";
import type { MarkdownComponentMap, SemanticComponentMap } from "./types";

export interface SemanticMarkdownProps {
  content?: string;
  document?: MarkdownDocument;
  protocol: SemanticProtocol;
  components?: SemanticComponentMap;
  markdownComponents?: MarkdownComponentMap;
  streamingMode?: StreamingMode;
  locale?: string;
  showPendingState?: boolean;
  onDiagnostic?(diagnostic: Diagnostic): void;
  onAction?(action: SemanticActionRequest): void;
  onReference?(id: string): void;
}

export const SemanticMarkdown = memo(function SemanticMarkdown({
  content = "",
  document: providedDocument,
  protocol,
  components = {},
  markdownComponents = {},
  streamingMode = "balanced",
  locale = "zh-CN",
  showPendingState = true,
  onDiagnostic,
  onAction,
  onReference,
}: SemanticMarkdownProps) {
  const parsed = useMemo(
    () =>
      providedDocument
        ? { document: providedDocument, diagnostics: [] }
        : parseMarkdownWithDiagnostics(content, {
            protocol,
            mode: streamingMode,
          }),
    [content, protocol, providedDocument, streamingMode],
  );
  useEffect(() => {
    for (const diagnostic of parsed.diagnostics) {
      onDiagnostic?.(diagnostic);
    }
  }, [onDiagnostic, parsed.diagnostics]);
  const context = useMemo<SemanticRenderContext>(
    () => ({
      locale,
      requestAction(action) {
        onAction?.(action);
      },
      resolveReference(id) {
        onReference?.(id);
      },
      reportDiagnostic(diagnostic) {
        onDiagnostic?.(diagnostic);
      },
    }),
    [locale, onAction, onDiagnostic, onReference],
  );
  const rendered = renderNode(parsed.document, {
    protocol,
    components,
    markdownComponents,
    context,
    showPendingState,
  });
  return (
    <SemanticMarkdownContext.Provider value={context}>
      <div className="semantic-markdown">{rendered}</div>
    </SemanticMarkdownContext.Provider>
  );
});
