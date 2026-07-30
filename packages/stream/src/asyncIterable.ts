import type { ParseUpdate, StreamingMarkdownSession } from "@semantic-md/core";

export interface ConsumeStreamOptions {
  signal?: AbortSignal;
  finish?: boolean;
}

export async function consumeAsyncIterable(
  input: AsyncIterable<string>,
  session: StreamingMarkdownSession,
  options: ConsumeStreamOptions = {},
): Promise<ParseUpdate> {
  let latest: ParseUpdate | undefined;
  for await (const chunk of input) {
    if (options.signal?.aborted) {
      throw options.signal.reason ?? new DOMException("Aborted", "AbortError");
    }
    latest = session.push(chunk);
  }
  if (options.finish ?? true) {
    return session.finish();
  }
  return (
    latest ?? {
      version: 0,
      patches: [],
      snapshot: session.getSnapshot(),
      diagnostics: session.getDiagnostics(),
      streamStatus: "idle",
    }
  );
}
