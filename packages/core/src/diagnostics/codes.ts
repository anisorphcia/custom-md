export const DIAGNOSTIC_CODES = {
  unknownSemanticNode: "UNKNOWN_SEMANTIC_NODE",
  invalidAttributeType: "INVALID_ATTRIBUTE_TYPE",
  missingRequiredAttribute: "MISSING_REQUIRED_ATTRIBUTE",
  unterminatedDirective: "UNTERMINATED_DIRECTIVE",
  unterminatedCodeFence: "UNTERMINATED_CODE_FENCE",
  unterminatedInlineMark: "UNTERMINATED_INLINE_MARK",
  unsafeUrl: "UNSAFE_URL",
  forbiddenAttribute: "FORBIDDEN_ATTRIBUTE",
  streamParseRecovery: "STREAM_PARSE_RECOVERY",
} as const;

export type DiagnosticCode = (typeof DIAGNOSTIC_CODES)[keyof typeof DIAGNOSTIC_CODES];
