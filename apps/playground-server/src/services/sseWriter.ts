import type { Response } from "express";

export interface SseWriter {
  event(name: string, data: unknown): boolean;
  comment(value: string): boolean;
  close(): void;
  readonly closed: boolean;
}

export function createSseWriter(response: Response): SseWriter {
  let closed = false;
  return {
    get closed(): boolean {
      return closed || response.writableEnded || response.destroyed;
    },
    event(name: string, data: unknown): boolean {
      if (this.closed) {
        return false;
      }
      return response.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
    },
    comment(value: string): boolean {
      if (this.closed) {
        return false;
      }
      return response.write(`: ${value}\n\n`);
    },
    close(): void {
      if (!this.closed) {
        closed = true;
        response.end();
      }
    },
  };
}
