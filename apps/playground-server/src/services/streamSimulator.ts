import type { SseWriter } from "./sseWriter";

export interface SimulationOptions {
  chunks: string[];
  delay: number;
  signal: AbortSignal;
}

function wait(milliseconds: number, signal: AbortSignal): Promise<void> {
  if (milliseconds <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export async function simulateStream(
  writer: SseWriter,
  options: SimulationOptions,
): Promise<number> {
  let sequence = 0;
  for (const text of options.chunks) {
    if (options.signal.aborted || writer.closed) {
      break;
    }
    await wait(options.delay, options.signal);
    sequence += 1;
    writer.event("delta", { seq: sequence, text });
  }
  return sequence;
}
