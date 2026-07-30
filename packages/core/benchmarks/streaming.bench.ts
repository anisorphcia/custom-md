import { bench } from "vitest";
import { createStreamingMarkdownSession } from "../src";

const block = "# Heading\n\nA paragraph with **strong** text.\n\n";
const document = block.repeat(2_500);

bench("stream a 100KB document in 256 character chunks", () => {
  const session = createStreamingMarkdownSession();
  for (let offset = 0; offset < document.length; offset += 256) {
    session.push(document.slice(offset, offset + 256));
  }
  session.finish();
});
