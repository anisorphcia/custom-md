import type { Diagnostic, MarkdownDocument, MarkdownNode } from "../ast/types";

export type AstPatch =
  | {
      type: "insert";
      parentId: string;
      index: number;
      node: MarkdownNode;
    }
  | {
      type: "update";
      nodeId: string;
      changes: Record<string, unknown>;
    }
  | {
      type: "append-text";
      nodeId: string;
      value: string;
    }
  | {
      type: "replace";
      nodeId: string;
      node: MarkdownNode;
    }
  | {
      type: "remove";
      nodeId: string;
    }
  | {
      type: "stabilize";
      nodeId: string;
    };

export interface ParseUpdate {
  version: number;
  patches: AstPatch[];
  snapshot: MarkdownDocument;
  diagnostics: Diagnostic[];
  streamStatus: "idle" | "streaming" | "finished" | "error";
}
