import type { ChunkMode } from "../types";

export interface ChunkOptions {
  mode: ChunkMode;
  chunkSize: number;
  seed: number;
}

function fixedChunks(content: string, size: number): string[] {
  const chunks: string[] = [];
  for (let index = 0; index < content.length; index += size) {
    chunks.push(content.slice(index, index + size));
  }
  return chunks;
}

function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function randomChunks(content: string, maximum: number, seed: number): string[] {
  const random = seededRandom(seed);
  const chunks: string[] = [];
  let index = 0;
  while (index < content.length) {
    const size = 1 + Math.floor(random() * maximum);
    chunks.push(content.slice(index, index + size));
    index += size;
  }
  return chunks;
}

function syntaxBoundaryChunks(content: string, chunkSize: number): string[] {
  const boundaries = new Set<number>([0, content.length]);
  const dangerous = /```[A-Za-z]*|:::[A-Za-z][\w-]*|:[A-Za-z][\w-]*\[|\*\*|`|\]\{|\|(?:\s*:?-{3,}:?\s*\|)+/g;
  for (const match of content.matchAll(dangerous)) {
    const start = match.index;
    const end = start + match[0].length;
    boundaries.add(start);
    boundaries.add(Math.min(end, start + Math.max(1, Math.floor(match[0].length / 2))));
    boundaries.add(end);
  }
  for (let index = chunkSize; index < content.length; index += chunkSize) {
    boundaries.add(index);
  }
  const sorted = [...boundaries].sort((left, right) => left - right);
  const chunks: string[] = [];
  for (let index = 1; index < sorted.length; index += 1) {
    const start = sorted[index - 1];
    const end = sorted[index];
    if (start !== undefined && end !== undefined && end > start) {
      chunks.push(content.slice(start, end));
    }
  }
  return chunks;
}

export function chunkContent(
  content: string,
  options: Partial<ChunkOptions> = {},
): string[] {
  const mode = options.mode ?? "random";
  const size = Math.max(1, Math.min(1_024, Math.floor(options.chunkSize ?? 12)));
  switch (mode) {
    case "char":
      return Array.from(content);
    case "word":
      return content.match(/\s+|[\p{Script=Han}]|[^\s\p{Script=Han}]+/gu) ?? [];
    case "fixed":
      return fixedChunks(content, size);
    case "random":
      return randomChunks(content, size, options.seed ?? 1);
    case "syntax-boundary":
      return syntaxBoundaryChunks(content, size);
  }
}
