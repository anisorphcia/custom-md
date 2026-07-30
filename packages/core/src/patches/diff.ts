import type { MarkdownNode, ParentNode } from "../ast/types";
import { hasChildren } from "../ast/types";
import type { AstPatch } from "./types";

const IGNORED_FIELDS = new Set(["id", "type", "children", "range", "status", "confidence"]);

function comparableFields(node: MarkdownNode): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (!IGNORED_FIELDS.has(key)) {
      fields[key] = value;
    }
  }
  return fields;
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function diffNode(previous: MarkdownNode, next: MarkdownNode, patches: AstPatch[]): void {
  if (previous.id !== next.id || previous.type !== next.type) {
    patches.push({ type: "replace", nodeId: previous.id, node: next });
    return;
  }

  if (previous.type === "text" && next.type === "text") {
    if (
      next.value.startsWith(previous.value) &&
      next.value.length > previous.value.length
    ) {
      patches.push({
        type: "append-text",
        nodeId: next.id,
        value: next.value.slice(previous.value.length),
      });
    } else if (next.value !== previous.value) {
      patches.push({ type: "update", nodeId: next.id, changes: { value: next.value } });
    }
  } else {
    const previousFields = comparableFields(previous);
    const nextFields = comparableFields(next);
    if (!sameValue(previousFields, nextFields)) {
      patches.push({ type: "update", nodeId: next.id, changes: nextFields });
    }
  }

  if (previous.status !== "stable" && next.status === "stable") {
    patches.push({ type: "stabilize", nodeId: next.id });
  } else if (
    previous.status !== next.status ||
    previous.confidence !== next.confidence
  ) {
    patches.push({
      type: "update",
      nodeId: next.id,
      changes: { status: next.status, confidence: next.confidence },
    });
  }

  if (hasChildren(previous) && hasChildren(next)) {
    diffChildren(previous, next, patches);
  }
}

function diffChildren(previous: ParentNode, next: ParentNode, patches: AstPatch[]): void {
  const sharedLength = Math.min(previous.children.length, next.children.length);
  for (let index = 0; index < sharedLength; index += 1) {
    const previousChild = previous.children[index];
    const nextChild = next.children[index];
    if (previousChild && nextChild) {
      diffNode(previousChild, nextChild, patches);
    }
  }
  for (let index = sharedLength; index < next.children.length; index += 1) {
    const child = next.children[index];
    if (child) {
      patches.push({ type: "insert", parentId: next.id, index, node: child });
    }
  }
  for (let index = sharedLength; index < previous.children.length; index += 1) {
    const child = previous.children[index];
    if (child) {
      patches.push({ type: "remove", nodeId: child.id });
    }
  }
}

export function diffAst(previous: MarkdownNode, next: MarkdownNode): AstPatch[] {
  const patches: AstPatch[] = [];
  diffNode(previous, next, patches);
  return patches;
}
