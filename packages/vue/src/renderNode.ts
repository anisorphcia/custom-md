import type { MarkdownNode, SemanticRenderContext } from "@semantic-md/core";
import type { SemanticProtocol } from "@semantic-md/protocol";
import { getNodeDefinition } from "@semantic-md/protocol";
import { createVNode, Fragment, h, type VNode } from "vue";
import type { MarkdownComponentMap, SemanticComponentMap } from "./types";

export interface VueRenderOptions {
  protocol: SemanticProtocol;
  components: SemanticComponentMap;
  markdownComponents: MarkdownComponentMap;
  context: SemanticRenderContext;
  showPendingState: boolean;
}

function children(node: MarkdownNode, options: VueRenderOptions): VNode[] {
  return "children" in node ? node.children.map((child) => renderNode(child, options)) : [];
}

function element(
  node: MarkdownNode,
  fallback: string,
  options: VueRenderOptions,
  properties: Record<string, unknown> = {},
): VNode {
  const customComponent = options.markdownComponents[node.type];
  const component = customComponent ?? fallback;
  const props = {
    key: node.id,
    ...(customComponent ? { node } : {}),
    ...properties,
    ...(options.showPendingState && node.status === "pending"
      ? { "data-semantic-pending": "true" }
      : {}),
  };
  const renderedChildren = children(node, options);

  return customComponent
    ? h(component, props, { default: () => renderedChildren })
    : h(component, props, renderedChildren);
}

function semanticFallback(
  node: Extract<MarkdownNode, { type: "semantic" }>,
  options: VueRenderOptions,
): VNode {
  const definition = getNodeDefinition(options.protocol, node.name);
  const fallback = definition?.fallback ?? "children";
  const rendered = children(node, options);
  if (fallback === "remove") {
    return createVNode(Fragment, { key: node.id }, []);
  }
  if (fallback === "raw") {
    return createVNode(Fragment, { key: node.id }, node.raw === undefined ? rendered : [node.raw]);
  }
  if (fallback === "blockquote") {
    return h("blockquote", { key: node.id }, rendered);
  }
  if (fallback === "error-component") {
    return h("span", { key: node.id, role: "alert", "data-semantic-error": node.name }, rendered);
  }
  return createVNode(Fragment, { key: node.id }, rendered);
}

export function renderNode(node: MarkdownNode, options: VueRenderOptions): VNode {
  switch (node.type) {
    case "root":
      return createVNode(Fragment, { key: node.id }, children(node, options));
    case "text":
      return createVNode(Fragment, { key: node.id }, [node.value]);
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
      return h("code", { key: node.id }, node.value);
    case "codeBlock":
      return h(
        "pre",
        {
          key: node.id,
          "data-status": node.status,
          ...(node.language ? { "data-language": node.language } : {}),
        },
        [h("code", node.value)],
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
        : createVNode(Fragment, { key: node.id }, children(node, options));
    case "image":
      return node.safe && node.url
        ? h("img", {
            key: node.id,
            src: node.url,
            alt: node.alt,
            ...(node.title ? { title: node.title } : {}),
          })
        : createVNode(Fragment, { key: node.id }, [node.alt]);
    case "thematicBreak":
      return h("hr", { key: node.id });
    case "table":
      return element(node, "table", options);
    case "tableRow":
      return element(node, "tr", options);
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
      return h(
        component,
        {
          key: node.id,
          node,
          attributes: node.attributes,
          status: node.status,
          confidence: node.confidence,
          context: options.context,
        },
        { default: () => children(node, options) },
      );
    }
    case "unknown":
      return createVNode(Fragment, { key: node.id }, [
        node.value ?? "",
        ...children(node, options),
      ]);
  }
}
