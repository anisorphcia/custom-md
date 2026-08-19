import { bench } from "vitest";
import { createStreamingMarkdownSession } from "../src";

const block = "# Heading\n\nA paragraph with **strong** text.\n\n";
const document = block.repeat(2_500);

bench("stream a 100KB document with synchronous 256 character pushes", () => {
  const session = createStreamingMarkdownSession({ batchInterval: 0 });
  for (let offset = 0; offset < document.length; offset += 256) {
    session.push(document.slice(offset, offset + 256));
  }
  session.finish();
});

bench("stream a 100KB document with 16 chunks per batch", () => {
  const session = createStreamingMarkdownSession();
  let chunksInBatch = 0;
  for (let offset = 0; offset < document.length; offset += 256) {
    session.push(document.slice(offset, offset + 256));
    chunksInBatch += 1;
    if (chunksInBatch === 16) {
      session.flush();
      chunksInBatch = 0;
    }
  }
  session.finish();
});
