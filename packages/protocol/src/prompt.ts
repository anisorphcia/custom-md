import type { SchemaLike, SemanticNodeDefinition, SemanticProtocol } from "./types";

interface SchemaDescription {
  type: string;
  required: boolean;
  values?: string[];
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function unwrapSchema(schema: unknown): SchemaDescription {
  const record = asRecord(schema);
  const definition = asRecord(record?._def);
  const typeName = typeof definition?.typeName === "string" ? definition.typeName : "unknown";

  if (typeName === "ZodOptional" || typeName === "ZodDefault") {
    return {
      ...unwrapSchema(definition?.innerType),
      required: false,
    };
  }
  if (typeName === "ZodEffects") {
    return unwrapSchema(definition?.schema);
  }
  if (typeName === "ZodEnum") {
    const values = Array.isArray(definition?.values)
      ? definition.values.filter((value): value is string => typeof value === "string")
      : [];
    return { type: "enum", required: true, values };
  }

  const type = typeName.replace(/^Zod/, "").toLowerCase() || "unknown";
  return { type, required: true };
}

function schemaFields(schema: SchemaLike): Array<[string, SchemaDescription]> {
  const record = asRecord(schema);
  const definition = asRecord(record?._def);
  const shape = definition?.shape;
  const resolved = typeof shape === "function" ? shape() : shape;
  const shapeRecord = asRecord(resolved);
  if (!shapeRecord) {
    return [];
  }
  return Object.entries(shapeRecord).map(([name, field]) => [name, unwrapSchema(field)]);
}

function syntaxFor(name: string, definition: SemanticNodeDefinition): string {
  if (definition.kind === "inline") {
    return `:${name}[visible text]{key="value"}`;
  }
  if (definition.kind === "block") {
    return `::${name}{key="value"}`;
  }
  return `:::${name}{key="value"}\nMarkdown content\n:::`;
}

export function generateProtocolPrompt(protocol: SemanticProtocol): string {
  const sections = [
    `# Semantic Markdown protocol ${protocol.version}`,
    "",
    "Output standard Markdown. You may also use only the semantic nodes listed below.",
    "Never output JavaScript, expressions, style/class attributes, event handlers, or unsafe URLs.",
  ];

  for (const [name, definition] of Object.entries(protocol.nodes)) {
    sections.push("", `## ${name} (${definition.kind})`);
    if (definition.description) {
      sections.push(definition.description);
    }
    sections.push(`Syntax: \`${syntaxFor(name, definition)}\``);
    const fields = schemaFields(definition.schema);
    if (fields.length > 0) {
      sections.push("Attributes:");
      for (const [fieldName, field] of fields) {
        const values = field.values ? `; allowed: ${field.values.join(", ")}` : "";
        sections.push(
          `- ${fieldName}: ${field.type}; ${field.required ? "required" : "optional"}${values}`,
        );
      }
    }
    for (const example of definition.examples ?? []) {
      sections.push(`Example: \`${example}\``);
    }
  }

  return sections.join("\n");
}
