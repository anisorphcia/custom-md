import { expect, it } from "vitest";
import fc from "fast-check";
import { normalizeDocument, parseMarkdown, createStreamingMarkdownSession } from "../src";

const sources = [
  "# Report\n\n**Strong** and *emphasis*.\n\n- one\n- two\n",
  "```ts\nconst value = `stream`;\n```\n",
  "| A | B |\n| --- | ---: |\n| x | 1 |\n",
  ':unknown[visible]{value=1}\n\n:::missing{level="high"}\nContent\n:::\n',
];

for (const [scenarioIndex, source] of sources.entries()) {
  it(`is invariant under random chunk boundaries for scenario ${scenarioIndex + 1}`, () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 12 }), {
          minLength: 1,
          maxLength: 40,
        }),
        (sizes: number[]) => {
          const session = createStreamingMarkdownSession();
          let offset = 0;
          let index = 0;
          while (offset < source.length) {
            const size = sizes[index % sizes.length] ?? 1;
            session.push(source.slice(offset, offset + size));
            offset += size;
            index += 1;
          }
          expect(normalizeDocument(session.finish().snapshot)).toEqual(
            normalizeDocument(parseMarkdown(source)),
          );
        },
      ),
      { numRuns: 30 },
    );
  });
}
