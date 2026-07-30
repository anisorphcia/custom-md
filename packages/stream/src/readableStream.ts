import type { ParseUpdate, StreamingMarkdownSession } from "@semantic-md/core";
import type { ConsumeStreamOptions } from "./asyncIterable";

export async function consumeReadableStream(
  input: ReadableStream<string | Uint8Array>,
  session: StreamingMarkdownSession,
  options: ConsumeStreamOptions = {},
): Promise<ParseUpdate> {
  const reader = input.getReader();
  const decoder = new TextDecoder();
  try {
    while (true) {
      if (options.signal?.aborted) {
        await reader.cancel(options.signal.reason);
        throw options.signal.reason ?? new DOMException("Aborted", "AbortError");
      }
      const result = await reader.read();
      if (result.done) {
        break;
      }
      const text =
        typeof result.value === "string"
          ? result.value
          : decoder.decode(result.value, { stream: true });
      if (text) {
        session.push(text);
      }
    }
    const remaining = decoder.decode();
    if (remaining) {
      session.push(remaining);
    }
    return options.finish ?? true
      ? session.finish()
      : {
          version: 0,
          patches: [],
          snapshot: session.getSnapshot(),
          diagnostics: session.getDiagnostics(),
          streamStatus: "streaming",
        };
  } finally {
    reader.releaseLock();
  }
}
