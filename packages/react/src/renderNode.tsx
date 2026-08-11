import type { MarkdownNode, SemanticRenderContext } from "@semantic-md/core";
import type { SemanticProtocol } from "@semantic-md/protocol";
import { getNodeDefinition } from "@semantic-md/protocol";
import { createElement, Fragment, type ReactElement, type ReactNode } from "react";
import type { MarkdownComponentMap, SemanticComponentMap } from "./types";

export interface ReactRenderOptions {
  protocol: SemanticProtocol;
  components: SemanticComponentMap;
  markdownComponents: MarkdownComponentMap;
  context: SemanticRenderContext;
  showPendingState: boolean;
}

function children(node: MarkdownNode, options: ReactRenderOptions): ReactNode[] {
  return "children" in node ? node.children.map((child) => renderNode(child, options)) : [];
}

function element(
  node: MarkdownNode,
  fallback: string | ReactElement["type"],
  options: ReactRenderOptions,
  properties: Record<string, unknown> = {},
): ReactElement {
  const customComponent = options.markdownComponents[node.type];
  const component = customComponent ?? fallback;
  return createElement(
    component,
    {
      key: node.id,
      ...(customComponent ? { node } : {}),
      ...properties,
      ...(options.showPendingState && node.status === "pending"
        ? { "data-semantic-pending": "true" }
        : {}),
    },
    ...children(node, options),
  );
}

function semanticFallback(
  node: Extract<MarkdownNode, { type: "semantic" }>,
  options: ReactRenderOptions,
): ReactElement {
  const definition = getNodeDefinition(options.protocol, node.name);
  const fallback = definition?.fallback ?? "children";
  const renderedChildren = children(node, options);
  if (fallback === "remove") {
    return createElement(Fragment, { key: node.id });
  }
  if (fallback === "raw") {
    return createElement(Fragment, { key: node.id }, node.raw ?? renderedChildren);
  }
  if (fallback === "blockquote") {
    return createElement("blockquote", { key: node.id }, ...renderedChildren);
  }
  if (fallback === "error-component") {
    return createElement(
      "span",
      { key: node.id, role: "alert", "data-semantic-error": node.name },
      ...renderedChildren,
    );
  }
  return createElement(Fragment, { key: node.id }, ...renderedChildren);
}

function renderTableRow(
  node: Extract<MarkdownNode, { type: "tableRow" }>,
  options: ReactRenderOptions,
  header: boolean,
): ReactElement {
  const customRow = options.markdownComponents.tableRow;
  if (customRow) return element(node, "tr", options);
  return createElement(
    "tr",
    {
      key: node.id,
      ...(options.showPendingState && node.status === "pending"
        ? { "data-semantic-pending": "true" }
        : {}),
    },
    ...node.children.map((child) =>
      child.type === "tableCell"
        ? element(child, header ? "th" : "td", options, header ? { scope: "col" } : {})
        : renderNode(child, options),
    ),
  );
}

function renderTable(
  node: Extract<MarkdownNode, { type: "table" }>,
  options: ReactRenderOptions,
): ReactElement {
  const customTable = options.markdownComponents.table;
  if (customTable) return element(node, "table", options);
  const [header, ...body] = node.children;
  return createElement(
    "table",
    {
      key: node.id,
      ...(options.showPendingState && node.status === "pending"
        ? { "data-semantic-pending": "true" }
        : {}),
    },
    header?.type === "tableRow"
      ? createElement("thead", { key: `${node.id}-head` }, renderTableRow(header, options, true))
      : null,
    createElement(
      "tbody",
      { key: `${node.id}-body` },
      ...body.map((row) =>
        row.type === "tableRow" ? renderTableRow(row, options, false) : renderNode(row, options),
      ),
    ),
  );
}

export function renderNode(node: MarkdownNode, options: ReactRenderOptions): ReactElement {
  switch (node.type) {
    case "root":
      return createElement(Fragment, { key: node.id }, ...children(node, options));
    case "text":
      return createElement(Fragment, { key: node.id }, node.value);
    case "paragraph":
      return element(node, "p", options);
    case "heading":
      return element(node, `h${node.depth}`, options);
    case "emphasis":
      return element(node, "em", options);
    case "strong":
      return element(node, "strong", options);
    case "delete":
      return element(node, "del", options);
    case "inlineCode":
      return createElement("code", { key: node.id }, node.value);
    case "codeBlock":
      return createElement(
        "pre",
        {
          key: node.id,
          "data-status": node.status,
          ...(node.language ? { "data-language": node.language } : {}),
        },
        createElement("code", null, node.value),
      );
    case "blockquote":
      return element(node, "blockquote", options);
    case "list":
      return element(node, node.ordered ? "ol" : "ul", options, {
        ...(node.ordered && node.start !== undefined ? { start: node.start } : {}),
      });
    case "listItem":
      return element(node, "li", options);
    case "link":
      return node.safe && node.url
        ? element(node, "a", options, {
            href: node.url,
            ...(node.title ? { title: node.title } : {}),
            rel: "noopener noreferrer",
          })
        : createElement(Fragment, { key: node.id }, ...children(node, options));
    case "image":
      return node.safe && node.url
        ? createElement("img", {
            key: node.id,
            src: node.url,
            alt: node.alt,
            ...(node.title ? { title: node.title } : {}),
          })
        : createElement(Fragment, { key: node.id }, node.alt);
    case "thematicBreak":
      return createElement("hr", { key: node.id });
    case "table":
      return renderTable(node, options);
    case "tableRow": {
      return element(node, "tr", options);
    }
    case "tableCell":
      return element(node, "td", options);
    case "semantic": {
      const definition = getNodeDefinition(options.protocol, node.name);
      const component = options.components[node.name];
      const canRender =
        component &&
        node.status !== "invalid" &&
        (node.status !== "pending" || definition?.renderPending);
      if (!canRender || !component) {
        return semanticFallback(node, options);
      }
      return createElement(
        component,
        {
          key: node.id,
          node,
          attributes: node.attributes,
          status: node.status,
          confidence: node.confidence,
          context: options.context,
        },
        ...children(node, options),
      );
    }
    case "unknown":
      return createElement(Fragment, { key: node.id }, node.value, ...children(node, options));
  }
}
