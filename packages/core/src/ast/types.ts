import type { ProtocolDiagnostic, SemanticNodeKind } from "@semantic-md/protocol";

export type Diagnostic = ProtocolDiagnostic;
export type NodeStatus = "pending" | "stable" | "invalid";
export type NodeConfidence = "confirmed" | "provisional";

export interface SourceRange {
  start: number;
  end: number;
}

export interface BaseNode {
  id: string;
  type: string;
  status: NodeStatus;
  confidence: NodeConfidence;
  range: SourceRange;
}

export interface ParentNode extends BaseNode {
  children: MarkdownNode[];
}

export interface RootNode extends ParentNode {
  type: "root";
}

export interface TextNode extends BaseNode {
  type: "text";
  value: string;
}

export interface ParagraphNode extends ParentNode {
  type: "paragraph";
}

export interface HeadingNode extends ParentNode {
  type: "heading";
  depth: 1 | 2 | 3 | 4 | 5 | 6;
}

export interface EmphasisNode extends ParentNode {
  type: "emphasis";
}

export interface StrongNode extends ParentNode {
  type: "strong";
}

export interface DeleteNode extends ParentNode {
  type: "delete";
}

export interface InlineCodeNode extends BaseNode {
  type: "inlineCode";
  value: string;
}

export interface CodeBlockNode extends BaseNode {
  type: "codeBlock";
  value: string;
  language?: string;
  meta?: string;
}

export interface BlockquoteNode extends ParentNode {
  type: "blockquote";
}

export interface ListNode extends ParentNode {
  type: "list";
  ordered: boolean;
  start?: number;
  spread: boolean;
}

export interface ListItemNode extends ParentNode {
  type: "listItem";
  checked?: boolean;
  spread: boolean;
}

export interface LinkNode extends ParentNode {
  type: "link";
  url?: string;
  title?: string;
  safe: boolean;
}

export interface ImageNode extends BaseNode {
  type: "image";
  url?: string;
  alt: string;
  title?: string;
  safe: boolean;
}

export interface ThematicBreakNode extends BaseNode {
  type: "thematicBreak";
}

export interface TableNode extends ParentNode {
  type: "table";
  align: Array<"left" | "right" | "center" | null>;
}

export interface TableRowNode extends ParentNode {
  type: "tableRow";
}

export interface TableCellNode extends ParentNode {
  type: "tableCell";
}

export interface SemanticNode extends ParentNode {
  type: "semantic";
  name: string;
  kind: SemanticNodeKind;
  attributes: Record<string, unknown>;
  rawAttributes: Record<string, string>;
  validationErrors: Diagnostic[];
  raw?: string;
}

export interface UnknownNode extends ParentNode {
  type: "unknown";
  originalType: string;
  value?: string;
}

export type MarkdownNode =
  | RootNode
  | TextNode
  | ParagraphNode
  | HeadingNode
  | EmphasisNode
  | StrongNode
  | DeleteNode
  | InlineCodeNode
  | CodeBlockNode
  | BlockquoteNode
  | ListNode
  | ListItemNode
  | LinkNode
  | ImageNode
  | ThematicBreakNode
  | TableNode
  | TableRowNode
  | TableCellNode
  | SemanticNode
  | UnknownNode;

export type MarkdownDocument = RootNode;

export function hasChildren(
  node: MarkdownNode,
): node is MarkdownNode & ParentNode {
  return "children" in node;
}
