import { validateSemanticNode } from "@semantic-md/protocol";
import type {
  ProtocolDiagnostic,
  SemanticNodeKind,
  SemanticProtocol,
} from "@semantic-md/protocol";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import type {
  Diagnostic,
  MarkdownDocument,
  MarkdownNode,
  NodeConfidence,
  NodeStatus,
  SemanticNode,
  SourceRange,
  TextNode,
} from "../ast/types";
import { hasChildren } from "../ast/types";
import { sanitizeUrl } from "../security/url";

interface MdPosition {
  start?: { offset?: number };
  end?: { offset?: number };
}

interface MdNode {
  type: string;
  value?: string;
  depth?: number;
  ordered?: boolean;
  start?: number;
  spread?: boolean;
  checked?: boolean | null;
  url?: string;
  title?: string | null;
  alt?: string | null;
  lang?: string | null;
  meta?: string | null;
  align?: Array<"left" | "right" | "center" | null>;
  name?: string;
  attributes?: Record<string, unknown> | null;
  children?: MdNode[];
  position?: MdPosition;
}

export type StreamingMode = "conservative" | "balanced" | "optimistic";

export interface ParseMarkdownOptions {
  protocol?: SemanticProtocol;
  mode?: StreamingMode;
}

interface TransformContext {
  source: string;
  offset: number;
  protocol: SemanticProtocol;
  status: NodeStatus;
  confidence: NodeConfidence;
  diagnostics: Diagnostic[];
}

const EMPTY_PROTOCOL: SemanticProtocol = {
  version: "0",
  nodes: {},
};

function rangeFor(node: MdNode, context: TransformContext): SourceRange {
  return {
    start: context.offset + (node.position?.start?.offset ?? 0),
    end: context.offset + (node.position?.end?.offset ?? context.source.length),
  };
}

function nodeId(type: string, range: SourceRange): string {
  return type === "root" ? "root" : `n-${range.start}-${type}`;
}

function base(
  type: string,
  node: MdNode,
  context: TransformContext,
  overrides: { status?: NodeStatus; confidence?: NodeConfidence } = {},
): {
  id: string;
  status: NodeStatus;
  confidence: NodeConfidence;
  range: SourceRange;
} {
  const range = rangeFor(node, context);
  return {
    id: nodeId(type, range),
    status: overrides.status ?? context.status,
    confidence: overrides.confidence ?? context.confidence,
    range,
  };
}

function childrenFor(node: MdNode, context: TransformContext): MarkdownNode[] {
  return (node.children ?? []).map((child) => transformNode(child, context));
}

function rawAttributes(node: MdNode): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [name, value] of Object.entries(node.attributes ?? {})) {
    if (typeof value === "string") {
      result[name] = value;
    } else if (value !== null && value !== undefined) {
      result[name] = String(value);
    }
  }
  return result;
}

function semanticKind(type: string): SemanticNodeKind {
  if (type === "textDirective") {
    return "inline";
  }
  if (type === "containerDirective") {
    return "container";
  }
  return "block";
}

function transformSemantic(node: MdNode, context: TransformContext): SemanticNode {
  const range = rangeFor(node, context);
  const name = node.name ?? "unknown";
  const raw = rawAttributes(node);
  const result = validateSemanticNode(
    {
      name,
      rawAttributes: raw,
      range,
      nodeId: nodeId("semantic", range),
    },
    context.protocol,
  );
  context.diagnostics.push(...result.diagnostics);
  const kind = semanticKind(node.type);
  const kindMismatch = result.definition && result.definition.kind !== kind;
  if (kindMismatch) {
    context.diagnostics.push({
      code: "INVALID_ATTRIBUTE_TYPE",
      message: `Node ${name} must use ${result.definition?.kind} syntax`,
      severity: "error",
      range,
      nodeId: nodeId("semantic", range),
    });
  }
  const invalid = !result.valid || Boolean(kindMismatch);
  return {
    type: "semantic",
    ...base("semantic", node, context, {
      status: invalid ? "invalid" : context.status,
    }),
    name,
    kind,
    attributes: result.attributes,
    rawAttributes: raw,
    children: childrenFor(node, context),
    validationErrors: result.diagnostics,
    raw: context.source.slice(
      range.start - context.offset,
      range.end - context.offset,
    ),
  };
}

function unsafeUrlDiagnostic(
  node: MdNode,
  context: TransformContext,
  rawUrl: string,
): ProtocolDiagnostic {
  return {
    code: "UNSAFE_URL",
    message: `Unsafe URL was rendered as text: ${rawUrl}`,
    severity: "error",
    range: rangeFor(node, context),
    raw: rawUrl,
  };
}

function unknownNode(node: MdNode, context: TransformContext): MarkdownNode {
  const result: MarkdownNode = {
    type: "unknown",
    ...base("unknown", node, context),
    originalType: node.type,
    children: childrenFor(node, context),
    ...(node.value !== undefined ? { value: node.value } : {}),
  };
  return result;
}

function transformNode(node: MdNode, context: TransformContext): MarkdownNode {
  switch (node.type) {
    case "root":
      return {
        type: "root",
        ...base("root", node, context),
        children: childrenFor(node, context),
      };
    case "text":
      return {
        type: "text",
        ...base("text", node, context),
        value: node.value ?? "",
      };
    case "paragraph":
      return {
        type: "paragraph",
        ...base("paragraph", node, context),
        children: childrenFor(node, context),
      };
    case "heading": {
      const depth = Math.min(6, Math.max(1, node.depth ?? 1)) as 1 | 2 | 3 | 4 | 5 | 6;
      return {
        type: "heading",
        ...base("heading", node, context),
        depth,
        children: childrenFor(node, context),
      };
    }
    case "emphasis":
      return {
        type: "emphasis",
        ...base("emphasis", node, context),
        children: childrenFor(node, context),
      };
    case "strong":
      return {
        type: "strong",
        ...base("strong", node, context),
        children: childrenFor(node, context),
      };
    case "delete":
      return {
        type: "delete",
        ...base("delete", node, context),
        children: childrenFor(node, context),
      };
    case "inlineCode":
      return {
        type: "inlineCode",
        ...base("inlineCode", node, context),
        value: node.value ?? "",
      };
    case "code":
      return {
        type: "codeBlock",
        ...base("codeBlock", node, context),
        value: node.value ?? "",
        ...(node.lang ? { language: node.lang } : {}),
        ...(node.meta ? { meta: node.meta } : {}),
      };
    case "blockquote":
      return {
        type: "blockquote",
        ...base("blockquote", node, context),
        children: childrenFor(node, context),
      };
    case "list":
      return {
        type: "list",
        ...base("list", node, context),
        ordered: Boolean(node.ordered),
        spread: Boolean(node.spread),
        ...(node.start !== undefined && node.start !== null ? { start: node.start } : {}),
        children: childrenFor(node, context),
      };
    case "listItem":
      return {
        type: "listItem",
        ...base("listItem", node, context),
        spread: Boolean(node.spread),
        ...(typeof node.checked === "boolean" ? { checked: node.checked } : {}),
        children: childrenFor(node, context),
      };
    case "link": {
      const safeUrl = sanitizeUrl(node.url ?? "");
      if (!safeUrl.safe) {
        context.diagnostics.push(unsafeUrlDiagnostic(node, context, node.url ?? ""));
      }
      return {
        type: "link",
        ...base("link", node, context),
        safe: safeUrl.safe,
        ...(safeUrl.url ? { url: safeUrl.url } : {}),
        ...(node.title ? { title: node.title } : {}),
        children: childrenFor(node, context),
      };
    }
    case "image": {
      const safeUrl = sanitizeUrl(node.url ?? "");
      if (!safeUrl.safe) {
        context.diagnostics.push(unsafeUrlDiagnostic(node, context, node.url ?? ""));
      }
      return {
        type: "image",
        ...base("image", node, context),
        safe: safeUrl.safe,
        alt: node.alt ?? "",
        ...(safeUrl.url ? { url: safeUrl.url } : {}),
        ...(node.title ? { title: node.title } : {}),
      };
    }
    case "thematicBreak":
      return {
        type: "thematicBreak",
        ...base("thematicBreak", node, context),
      };
    case "table":
      return {
        type: "table",
        ...base("table", node, context),
        align: node.align ?? [],
        children: childrenFor(node, context),
      };
    case "tableRow":
      return {
        type: "tableRow",
        ...base("tableRow", node, context),
        children: childrenFor(node, context),
      };
    case "tableCell":
      return {
        type: "tableCell",
        ...base("tableCell", node, context),
        children: childrenFor(node, context),
      };
    case "textDirective":
    case "leafDirective":
    case "containerDirective":
      return transformSemantic(node, context);
    case "html":
      return {
        type: "text",
        ...base("text", node, context),
        value: node.value ?? "",
      };
    case "break":
      return {
        type: "text",
        ...base("text", node, context),
        value: "\n",
      };
    default:
      return unknownNode(node, context);
  }
}

function provisionalNode(
  type: "strong" | "emphasis",
  markerStart: number,
  value: string,
  textNode: TextNode,
): MarkdownNode {
  const contentStart = markerStart + (type === "strong" ? 2 : 1);
  return {
    type,
    id: nodeId(type, { start: markerStart, end: textNode.range.end }),
    status: "pending",
    confidence: "provisional",
    range: { start: markerStart, end: textNode.range.end },
    children: [
      {
        type: "text",
        id: nodeId("text", { start: contentStart, end: textNode.range.end }),
        status: "pending",
        confidence: "provisional",
        range: { start: contentStart, end: textNode.range.end },
        value,
      },
    ],
  };
}

function completedRawAttributes(source: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const attributePattern =
    /([A-Za-z_][A-Za-z0-9_-]*)=(?:"([^"]*)"|'([^']*)'|([^\s"'=}]+))(?=\s|$)/g;
  for (const match of source.matchAll(attributePattern)) {
    const name = match[1];
    const value = match[2] ?? match[3] ?? match[4];
    if (name && value !== undefined) {
      attributes[name] = value;
    }
  }
  return attributes;
}

function provisionalSemantic(
  node: TextNode,
  markerStart: number,
  raw: string,
  name: string,
  label: string,
  rawAttributes: Record<string, string>,
  protocol: SemanticProtocol,
): SemanticNode {
  const range = { start: markerStart, end: node.range.end };
  const validation = validateSemanticNode(
    {
      name,
      rawAttributes,
      range,
      nodeId: nodeId("semantic", range),
    },
    protocol,
  );
  return {
    type: "semantic",
    id: nodeId("semantic", range),
    status: protocol.nodes[name] ? "pending" : "invalid",
    confidence: "provisional",
    range,
    name,
    kind: "inline",
    attributes: validation.valid ? validation.attributes : {},
    rawAttributes,
    validationErrors: validation.diagnostics,
    raw,
    children: [
      {
        type: "text",
        id: nodeId("text", {
          start: markerStart + name.length + 2,
          end: node.range.end,
        }),
        status: "pending",
        confidence: "provisional",
        range: {
          start: markerStart + name.length + 2,
          end: node.range.end,
        },
        value: label,
      },
    ],
  };
}

function splitProvisionalText(node: TextNode, protocol: SemanticProtocol): MarkdownNode[] {
  const value = node.value;
  const partialAttributes =
    /:([A-Za-z][A-Za-z0-9_-]*)\[([^\]]*)\]\{([^}]*)$/.exec(value);
  if (partialAttributes?.index !== undefined) {
    const markerStart = node.range.start + partialAttributes.index;
    const name = partialAttributes[1] ?? "unknown";
    const label = partialAttributes[2] ?? "";
    const rawAttributeSource = partialAttributes[3] ?? "";
    const before = value.slice(0, partialAttributes.index);
    return [
      ...(before
        ? [
            {
              ...node,
              range: { start: node.range.start, end: markerStart },
              value: before,
            } satisfies TextNode,
          ]
        : []),
      provisionalSemantic(
        node,
        markerStart,
        partialAttributes[0],
        name,
        label,
        completedRawAttributes(rawAttributeSource),
        protocol,
      ),
    ];
  }

  const directive = /:([A-Za-z][A-Za-z0-9_-]*)\[([^\]]*)$/.exec(value);
  if (directive?.index !== undefined) {
    const markerStart = node.range.start + directive.index;
    const name = directive[1] ?? "unknown";
    const label = directive[2] ?? "";
    const before = value.slice(0, directive.index);
    return [
      ...(before
        ? [
            {
              ...node,
              range: { start: node.range.start, end: markerStart },
              value: before,
            } satisfies TextNode,
          ]
        : []),
      provisionalSemantic(
        node,
        markerStart,
        directive[0],
        name,
        label,
        {},
        protocol,
      ),
    ];
  }

  const strongIndex = value.lastIndexOf("**");
  if (strongIndex >= 0 && value.indexOf("**", strongIndex + 2) < 0) {
    const content = value.slice(strongIndex + 2);
    if (content) {
      const markerStart = node.range.start + strongIndex;
      return [
        ...(strongIndex > 0
          ? [
              {
                ...node,
                range: { start: node.range.start, end: markerStart },
                value: value.slice(0, strongIndex),
              } satisfies TextNode,
            ]
          : []),
        provisionalNode("strong", markerStart, content, node),
      ];
    }
  }

  const codeIndex = value.lastIndexOf("`");
  if (codeIndex >= 0 && value.indexOf("`", codeIndex + 1) < 0) {
    const content = value.slice(codeIndex + 1);
    if (content) {
      const markerStart = node.range.start + codeIndex;
      return [
        ...(codeIndex > 0
          ? [
              {
                ...node,
                range: { start: node.range.start, end: markerStart },
                value: value.slice(0, codeIndex),
              } satisfies TextNode,
            ]
          : []),
        {
          type: "inlineCode",
          id: nodeId("inlineCode", { start: markerStart, end: node.range.end }),
          status: "pending",
          confidence: "provisional",
          range: { start: markerStart, end: node.range.end },
          value: content,
        },
      ];
    }
  }

  const emphasisIndex = value.lastIndexOf("*");
  if (emphasisIndex >= 0 && value.indexOf("*", emphasisIndex + 1) < 0) {
    const content = value.slice(emphasisIndex + 1);
    if (content) {
      const markerStart = node.range.start + emphasisIndex;
      return [
        ...(emphasisIndex > 0
          ? [
              {
                ...node,
                range: { start: node.range.start, end: markerStart },
                value: value.slice(0, emphasisIndex),
              } satisfies TextNode,
            ]
          : []),
        provisionalNode("emphasis", markerStart, content, node),
      ];
    }
  }

  return [node];
}

function applyProvisional(
  node: MarkdownNode,
  protocol: SemanticProtocol,
  mode: StreamingMode,
): void {
  if (mode === "conservative" || !hasChildren(node)) {
    return;
  }
  const nextChildren: MarkdownNode[] = [];
  for (const child of node.children) {
    if (child.type === "text" && child.status === "pending") {
      nextChildren.push(...splitProvisionalText(child, protocol));
    } else {
      applyProvisional(child, protocol, mode);
      nextChildren.push(child);
    }
  }
  node.children = nextChildren;
}

function addCompletionDiagnostics(
  source: string,
  diagnostics: Diagnostic[],
): void {
  const fences = source.match(/^(?: {0,3})(`{3,}|~{3,}).*$/gm) ?? [];
  if (fences.length % 2 === 1) {
    diagnostics.push({
      code: "UNTERMINATED_CODE_FENCE",
      message: "Code fence was not terminated before the stream ended",
      severity: "warning",
    });
  }
  const containers = source.match(/^ {0,3}:::(?:[A-Za-z][\w-]*(?:\{.*\})?)?\s*$/gm) ?? [];
  if (containers.length % 2 === 1) {
    diagnostics.push({
      code: "UNTERMINATED_DIRECTIVE",
      message: "Container directive was not terminated before the stream ended",
      severity: "warning",
    });
  }
  if (/:[A-Za-z][\w-]*\[[^\]\n]*(?:\n|$)/.test(source)) {
    diagnostics.push({
      code: "UNTERMINATED_DIRECTIVE",
      message: "Inline directive was not terminated before the stream ended",
      severity: "warning",
    });
  }
  let inFence = false;
  let hasUnterminatedInline = false;
  for (const line of source.split(/\r?\n/)) {
    if (/^ {0,3}(?:`{3,}|~{3,})/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      continue;
    }
    const text = line.replace(/\\./g, "");
    const codeOpener = /(`+)(?=\S)/.exec(text);
    if (
      codeOpener &&
      text.indexOf(codeOpener[1] ?? "", codeOpener.index + codeOpener[0].length) < 0
    ) {
      hasUnterminatedInline = true;
      break;
    }
    const markOpener = /(?:^|[\s(])(\*{1,3}|_{1,3})(?=\S)/.exec(text);
    if (
      markOpener &&
      text.indexOf(
        markOpener[1] ?? "",
        markOpener.index + markOpener[0].length,
      ) < 0
    ) {
      hasUnterminatedInline = true;
      break;
    }
  }
  if (hasUnterminatedInline) {
    diagnostics.push({
      code: "UNTERMINATED_INLINE_MARK",
      message: "Inline markup was not terminated and was rendered as text",
      severity: "warning",
    });
  }
}

export function parseMarkdownFragment(
  source: string,
  options: ParseMarkdownOptions & {
    offset: number;
    status: NodeStatus;
    completionDiagnostics?: boolean;
  },
): { document: MarkdownDocument; diagnostics: Diagnostic[] } {
  const protocol = options.protocol ?? EMPTY_PROTOCOL;
  const diagnostics: Diagnostic[] = [];
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkDirective);
  const parsed = processor.parse(source) as unknown as MdNode;
  const document = transformNode(parsed, {
    source,
    offset: options.offset,
    protocol,
    status: options.status,
    confidence: "confirmed",
    diagnostics,
  }) as MarkdownDocument;
  document.range = { start: options.offset, end: options.offset + source.length };
  if (options.status === "pending") {
    applyProvisional(document, protocol, options.mode ?? "balanced");
  }
  if (options.completionDiagnostics) {
    addCompletionDiagnostics(source, diagnostics);
  }
  return { document, diagnostics };
}

export function parseMarkdown(
  source: string,
  options: ParseMarkdownOptions = {},
): MarkdownDocument {
  return parseMarkdownWithDiagnostics(source, options).document;
}

export function parseMarkdownWithDiagnostics(
  source: string,
  options: ParseMarkdownOptions = {},
): { document: MarkdownDocument; diagnostics: Diagnostic[] } {
  return parseMarkdownFragment(source, {
    ...options,
    offset: 0,
    status: "stable",
    completionDiagnostics: true,
  });
}

export function normalizeDocument(document: MarkdownDocument): unknown {
  function normalize(node: MarkdownNode): Record<string, unknown> {
    const common: Record<string, unknown> = { type: node.type };
    switch (node.type) {
      case "text":
      case "inlineCode":
      case "codeBlock":
        common.value = node.value;
        break;
      case "heading":
        common.depth = node.depth;
        break;
      case "list":
        common.ordered = node.ordered;
        common.start = node.start;
        break;
      case "link":
        common.url = node.url;
        common.safe = node.safe;
        break;
      case "image":
        common.url = node.url;
        common.alt = node.alt;
        common.safe = node.safe;
        break;
      case "semantic":
        common.name = node.name;
        common.kind = node.kind;
        common.attributes = node.attributes;
        break;
      case "table":
        common.align = node.align;
        break;
      default:
        break;
    }
    if (hasChildren(node)) {
      common.children = node.children.map(normalize);
    }
    return common;
  }
  return normalize(document);
}
