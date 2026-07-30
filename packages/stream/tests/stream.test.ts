import { createStreamingMarkdownSession } from "@semantic-md/core";
import { describe, expect, it } from "vitest";
import { consumeAsyncIterable, consumeReadableStream } from "../src";

describe("stream adapters", () => {
  it("consumes AsyncIterable input", async () => {
    async function* chunks(): AsyncGenerator<string> {
      yield "# ";
      yield "Title";
    }
    const session = createStreamingMarkdownSession();
    const update = await consumeAsyncIterable(chunks(), session);
    expect(update.streamStatus).toBe("finished");
    expect(update.snapshot.children[0]?.type).toBe("heading");
  });

  it("decodes byte ReadableStreams", async () => {
    const encoder = new TextEncoder();
    const input = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("你好，"));
        controller.enqueue(encoder.encode("世界"));
        controller.close();
      },
    });
    const update = await consumeReadableStream(
      input,
      createStreamingMarkdownSession(),
    );
    expect(JSON.stringify(update.snapshot)).toContain("你好，世界");
  });
});
