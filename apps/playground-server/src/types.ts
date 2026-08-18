export type ChunkMode = "char" | "word" | "fixed" | "random" | "syntax-boundary";

export interface StreamQuery {
  scenario?: string;
  speed?: number;
  chunkMode?: ChunkMode;
  chunkSize?: number;
  seed?: number;
}

export interface StreamMeta {
  streamId: string;
  scenario: string;
  protocolVersion: string;
}
