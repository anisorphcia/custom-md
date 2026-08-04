import { demoProtocol } from "@semantic-md/example-protocol";
import { generateProtocolPrompt } from "@semantic-md/protocol";
import type { Request, Response, Router } from "express";
import OpenAI from "openai";
import { fetch, ProxyAgent } from "undici";
import { createSseWriter } from "../services/sseWriter";

const MAX_PROMPT_LENGTH = 8_000;
const OPENAI_TIMEOUT_MS = 120_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;

const requestCounts = new Map<string, { count: number; resetAt: number }>();

function shouldLogPrompt(): boolean {
  return process.env.AI_LOG_PROMPT?.trim().toLowerCase() === "true";
}

let cachedProxyUrl: string | undefined;
let cachedProxyAgent: ProxyAgent | undefined;

function getProxyUrl(): string | undefined {
  const secure = process.env.HTTPS_PROXY?.trim();
  if (secure) {
    return secure;
  }
  const basic = process.env.HTTP_PROXY?.trim();
  return basic || undefined;
}

function getProxyAgent(proxyUrl: string): ProxyAgent {
  if (!cachedProxyAgent || cachedProxyUrl !== proxyUrl) {
    cachedProxyAgent = new ProxyAgent(proxyUrl);
    cachedProxyUrl = proxyUrl;
  }
  return cachedProxyAgent;
}

function createOpenAiClient(): OpenAI {
  const options: ConstructorParameters<typeof OpenAI>[0] = {
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
    timeout: OPENAI_TIMEOUT_MS,
  };
  const proxyUrl = getProxyUrl();
  if (proxyUrl) {
    const dispatcher = getProxyAgent(proxyUrl);
    options.fetch = fetch as unknown as typeof globalThis.fetch;
    options.fetchOptions = { dispatcher };
  }
  return new OpenAI(options);
}

function formatOpenAiError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "OpenAI 请求失败";
  }
  const maybe = error as Error & { status?: number; code?: string; cause?: unknown };
  if (maybe.status === 429 || maybe.code === "insufficient_quota") {
    return "OpenAI 额度不足（429 insufficient_quota），请检查账号计费或更换可用 Key。";
  }
  if (maybe.message === "Request timed out.") {
    const proxy = getProxyUrl();
    if (proxy) {
      let proxyHost = "已配置的代理";
      try {
        const parsed = new URL(proxy);
        proxyHost = `${parsed.hostname}:${parsed.port}`;
      } catch {
        // Do not expose malformed proxy URLs because they may contain credentials.
      }
      return `AI 请求超时（${OPENAI_TIMEOUT_MS}ms）。当前走代理 ${proxyHost}，请检查该节点对 OPENAI_BASE_URL 的连通性/稳定性。`;
    }
    return "OpenAI 请求超时，请配置可用代理（HTTP_PROXY/HTTPS_PROXY）或检查网络。";
  }
  return maybe.message;
}

function isRateLimited(request: Request): boolean {
  const key = request.ip || request.socket.remoteAddress || "unknown";
  const now = Date.now();
  const current = requestCounts.get(key);
  if (!current || current.resetAt <= now) {
    requestCounts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT_MAX_REQUESTS;
}

function textQuery(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function handleOpenAiStream(request: Request, response: Response): Promise<void> {
  response.status(200);
  response.set({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  response.flushHeaders();

  const writer = createSseWriter(response);
  const prompt = textQuery(request.body?.prompt);
  const model = process.env.OPENAI_MODEL?.trim();
  const baseURL = process.env.OPENAI_BASE_URL?.trim();
  const abortController = new AbortController();
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const heartbeat = setInterval(() => writer.comment("heartbeat"), 15_000);
  const cleanup = (): void => {
    clearInterval(heartbeat);
    if (!abortController.signal.aborted) {
      abortController.abort(new DOMException("Client disconnected", "AbortError"));
    }
  };
  response.on("close", cleanup);

  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("服务端未配置 OPENAI_API_KEY，请先在 .env 中填写你的 Key");
    }
    if (!baseURL) {
      throw new Error("服务端未配置 OPENAI_BASE_URL");
    }
    if (!model) {
      throw new Error("服务端未配置 OPENAI_MODEL");
    }
    if (!prompt) {
      throw new Error("请输入要发送给模型的问题");
    }
    if (prompt.length > MAX_PROMPT_LENGTH) {
      throw new Error(`问题不能超过 ${MAX_PROMPT_LENGTH} 个字符`);
    }

    const instructions = [
      "请使用简体中文回答。输出必须是可直接渲染的 Markdown。",
      "在有助于表达时使用下方 Semantic Markdown 协议；不要解释协议本身。",
      "输出 Semantic Markdown 节点时必须直接写 :name[...] 或 :::name 语法，严禁用反引号或代码块包裹，否则节点无法渲染。",
      generateProtocolPrompt(demoProtocol),
    ].join("\n\n");

    if (shouldLogPrompt()) {
      console.log(
        `[ai:${requestId}] outbound prompt\n${JSON.stringify(
          { baseURL, model, instructions, input: prompt },
          null,
          2,
        )}`,
      );
    } else {
      console.log(`[ai:${requestId}] request started model=${model}`);
    }

    writer.event("meta", {
      streamId: requestId,
      source: "openai",
      model,
      protocolVersion: demoProtocol.version,
    });

    const client = createOpenAiClient();
    const stream = await client.responses.create(
      {
        model,
        instructions,
        input: prompt,
        reasoning: { effort: "low" },
        stream: true,
      },
      { signal: abortController.signal },
    );

    let totalChars = 0;
    for await (const event of stream) {
      if (event.type === "response.output_text.delta") {
        totalChars += event.delta.length;
        writer.event("delta", { text: event.delta });
      }
    }

    if (!writer.closed && !abortController.signal.aborted) {
      console.log(
        `[ai:${requestId}] request completed model=${model} chars=${totalChars} durationMs=${Date.now() - startedAt}`,
      );
      writer.event("done", { totalChars, model });
      writer.close();
    }
  } catch (error: unknown) {
    if (!abortController.signal.aborted && !writer.closed) {
      const message = formatOpenAiError(error);
      console.error(
        `[ai:${requestId}] request failed model=${model ?? "unconfigured"} durationMs=${Date.now() - startedAt} message=${message}`,
      );
      writer.event("failure", {
        code: "OPENAI_ERROR",
        message,
      });
      writer.close();
    }
  } finally {
    clearInterval(heartbeat);
    response.off("close", cleanup);
  }
}

export function registerOpenAiRoutes(router: Router): void {
  router.post("/openai/stream", (request, response) => {
    if (isRateLimited(request)) {
      response.status(429).json({
        code: "RATE_LIMITED",
        message: "请求过于频繁，请稍后再试",
      });
      return;
    }
    void handleOpenAiStream(request, response);
  });
}
