import { demoProtocol, getScenario } from "@semantic-md/example-protocol";
import type { Request, Response, Router } from "express";
import { chunkContent } from "../services/chunker";
import { createSseWriter } from "../services/sseWriter";
import { simulateStream } from "../services/streamSimulator";
import type { ChunkMode, StreamQuery } from "../types";

const CHUNK_MODES = new Set<ChunkMode>(["char", "word", "fixed", "random", "syntax-boundary"]);

function numberQuery(value: unknown, fallback: number, minimum: number, maximum: number): number {
  const parsed = typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}

function queryFrom(request: Request): StreamQuery {
  const rawMode = typeof request.query.chunkMode === "string" ? request.query.chunkMode : "";
  return {
    ...(typeof request.query.scenario === "string" ? { scenario: request.query.scenario } : {}),
    speed: numberQuery(request.query.speed, 30, 0, 5_000),
    chunkMode: CHUNK_MODES.has(rawMode as ChunkMode) ? (rawMode as ChunkMode) : "random",
    chunkSize: numberQuery(request.query.chunkSize, 12, 1, 1_024),
    seed: numberQuery(request.query.seed, 1, 0, 2_147_483_647),
  };
}

async function handleStream(request: Request, response: Response): Promise<void> {
  response.status(200);
  response.set({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  response.flushHeaders();

  const query = queryFrom(request);
  const scenario = getScenario(query.scenario);
  const chunks = chunkContent(scenario.content, {
    mode: query.chunkMode ?? "random",
    chunkSize: query.chunkSize ?? 12,
    seed: query.seed ?? 1,
  });
  const writer = createSseWriter(response);
  const abortController = new AbortController();
  const heartbeat = setInterval(() => {
    writer.comment("heartbeat");
  }, 15_000);

  const cleanup = (): void => {
    clearInterval(heartbeat);
    if (!abortController.signal.aborted) {
      abortController.abort(new DOMException("Client disconnected", "AbortError"));
    }
  };
  response.on("close", cleanup);

  writer.event("meta", {
    streamId: crypto.randomUUID(),
    scenario: scenario.name,
    protocolVersion: demoProtocol.version,
  });
  writer.event("diagnostic", {
    code: "SIMULATION_STARTED",
    severity: "info",
    message: "simulation started",
  });

  try {
    const sequence = await simulateStream(writer, {
      chunks,
      delay: query.speed ?? 30,
      signal: abortController.signal,
    });
    if (!writer.closed && !abortController.signal.aborted) {
      writer.event("done", { seq: sequence, totalChars: scenario.content.length });
      writer.close();
    }
  } catch (error: unknown) {
    if (!abortController.signal.aborted && !writer.closed) {
      writer.event("error", {
        code: "SIMULATION_ERROR",
        message: error instanceof Error ? error.message : "Unknown simulation error",
      });
      writer.close();
    }
  } finally {
    clearInterval(heartbeat);
    response.off("close", cleanup);
  }
}

export function registerStreamRoutes(router: Router): void {
  router.get("/stream", (request, response) => {
    void handleStream(request, response);
  });
}
