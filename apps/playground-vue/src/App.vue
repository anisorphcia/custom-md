<script setup lang="ts">
import type { AstPatch, SemanticActionRequest, StreamingMode } from "@semantic-md/core";
import { demoProtocol, scenarios } from "@semantic-md/example-protocol";
import { generateProtocolPrompt } from "@semantic-md/protocol";
import { SemanticMarkdown, useSemanticMarkdown } from "@semantic-md/vue";
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import { semanticComponents } from "./semantic-components";

type ScenarioName = keyof typeof scenarios;
type ChunkMode = "char" | "word" | "fixed" | "random" | "syntax-boundary";
type ConnectionStatus = "idle" | "connecting" | "streaming" | "finished" | "error";
type StreamSource = "simulation" | "openai";

interface SseEvent {
  event: string;
  data: string;
}

interface FailurePayload {
  message: string;
}

const scenario = ref<ScenarioName>("full");
const source = ref<StreamSource>("simulation");
const question = ref("请分析小米汽车2025年财报，并综合2024年财报对比，并给出专业的分析报告");
const errorMessage = ref("");
const chunkMode = ref<ChunkMode>("syntax-boundary");
const speed = ref(20);
const mode = ref<StreamingMode>("balanced");
const showPending = ref(true);
const autoScroll = ref(true);
const connection = ref<ConnectionStatus>("idle");
const rawText = ref("");
const patchLog = ref<AstPatch[]>([]);
const eventLog = ref<Array<{ id: number; text: string }>>([]);
let nextEventId = 1;
const rawElement = ref<HTMLPreElement>();
let eventSource: EventSource | undefined;
let requestAbortController: AbortController | undefined;
const { document, diagnostics, status, push, finish, reset } = useSemanticMarkdown({
  protocol: demoProtocol,
  streamingMode: mode,
});
const prompt = generateProtocolPrompt(demoProtocol);

watch(rawText, async () => {
  if (autoScroll.value) {
    await nextTick();
    if (rawElement.value) {
      rawElement.value.scrollTop = rawElement.value.scrollHeight;
    }
  }
});

function parseDelta(value: string): string | undefined {
  try {
    const parsed = JSON.parse(value) as unknown;
    return typeof parsed === "object" &&
      parsed !== null &&
      "text" in parsed &&
      typeof parsed.text === "string"
      ? parsed.text
      : undefined;
  } catch {
    return undefined;
  }
}

function parseFailure(value: string): FailurePayload | undefined {
  try {
    const parsed = JSON.parse(value) as unknown;
    return typeof parsed === "object" &&
      parsed !== null &&
      "message" in parsed &&
      typeof parsed.message === "string"
      ? { message: parsed.message }
      : undefined;
  } catch {
    return undefined;
  }
}

function extractSseEvents(buffer: string): { events: SseEvent[]; rest: string } {
  const normalized = buffer.replaceAll("\r\n", "\n");
  const blocks = normalized.split("\n\n");
  const rest = blocks.pop() ?? "";
  const events = blocks.flatMap((block) => {
    let event = "message";
    const data: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trimStart();
      if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
    }
    return data.length > 0 ? [{ event, data: data.join("\n") }] : [];
  });
  return { events, rest };
}

function stop(): void {
  eventSource?.close();
  eventSource = undefined;
  requestAbortController?.abort();
  requestAbortController = undefined;
  if (connection.value !== "finished") {
    connection.value = "idle";
  }
}

function resetAll(): void {
  stop();
  reset();
  rawText.value = "";
  patchLog.value = [];
  eventLog.value = [];
  nextEventId = 1;
  connection.value = "idle";
  errorMessage.value = "";
}

function start(): void {
  resetAll();
  connection.value = "connecting";
  const baseUrl = import.meta.env.VITE_SSE_BASE_URL ?? "";
  if (source.value === "openai") {
    void startOpenAi(baseUrl);
    return;
  }
  const query = new URLSearchParams({
    scenario: scenario.value,
    speed: String(speed.value),
    chunkMode: chunkMode.value,
    chunkSize: "12",
    seed: "1",
  });
  const stream = new EventSource(`${baseUrl}/api/stream?${query}`);
  eventSource = stream;
  stream.addEventListener("meta", () => {
    connection.value = "streaming";
  });
  stream.addEventListener("delta", (event) => {
    if (!(event instanceof MessageEvent) || typeof event.data !== "string") {
      return;
    }
    const text = parseDelta(event.data);
    if (text === undefined) {
      return;
    }
    rawText.value += text;
    const update = push(text);
    patchLog.value = [...patchLog.value, ...update.patches].slice(-200);
  });
  stream.addEventListener("done", () => {
    const update = finish();
    patchLog.value = [...patchLog.value, ...update.patches].slice(-200);
    connection.value = "finished";
    stream.close();
    eventSource = undefined;
  });
  stream.onerror = () => {
    connection.value = "error";
    errorMessage.value = "无法连接 Playground Server";
    stream.close();
    eventSource = undefined;
  };
}

async function startOpenAi(baseUrl: string): Promise<void> {
  const controller = new AbortController();
  requestAbortController = controller;
  let receivedDone = false;
  try {
    const response = await fetch(`${baseUrl}/api/openai/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: question.value }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => undefined)) as FailurePayload | undefined;
      throw new Error(payload?.message ?? `请求失败（HTTP ${response.status}）`);
    }
    if (!response.body) throw new Error("服务端没有返回流式响应");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      const extracted = extractSseEvents(buffer);
      buffer = extracted.rest;
      for (const event of extracted.events) {
        if (event.event === "meta") connection.value = "streaming";
        if (event.event === "delta") {
          const text = parseDelta(event.data);
          if (text !== undefined) {
            rawText.value += text;
            const update = push(text);
            patchLog.value = [...patchLog.value, ...update.patches].slice(-200);
          }
        }
        if (event.event === "failure") {
          throw new Error(parseFailure(event.data)?.message ?? "AI 请求失败");
        }
        if (event.event === "done") {
          const update = finish();
          patchLog.value = [...patchLog.value, ...update.patches].slice(-200);
          connection.value = "finished";
          receivedDone = true;
        }
      }
    }
    if (!receivedDone) throw new Error("AI 响应在完成前中断");
  } catch (error: unknown) {
    if (!controller.signal.aborted) {
      connection.value = "error";
      errorMessage.value = error instanceof Error ? error.message : "AI 请求失败";
    }
  } finally {
    if (requestAbortController === controller) requestAbortController = undefined;
  }
}

function logAction(action: SemanticActionRequest): void {
  const id = nextEventId;
  nextEventId += 1;
  eventLog.value.push({
    id,
    text: `action: ${action.name}${action.targetId ? ` → ${action.targetId}` : ""}`,
  });
}

function logReference(id: string): void {
  const entryId = nextEventId;
  nextEventId += 1;
  eventLog.value.push({ id: entryId, text: `citation: ${id}` });
}

onBeforeUnmount(stop);
</script>

<template>
  <main>
    <header class="hero">
      <div>
        <p class="eyebrow">VUE PLAYGROUND</p>
        <h1>Semantic Markdown Stream Lab</h1>
        <p>同一协议、同一 AST，使用 Vue 3 原生 VNode 渲染。</p>
      </div>
      <div class="status-stack">
        <span
          class="connection"
          :class="connection"
          data-testid="connection-status"
        >{{ connection }}</span>
        <span data-testid="parse-status">parser · {{ status }}</span>
      </div>
    </header>

    <section class="controls" aria-label="Stream controls">
      <label>
        数据源
        <select v-model="source">
          <option value="simulation">模拟数据</option>
          <option value="openai">真实 OpenAI</option>
        </select>
      </label>
      <template v-if="source === 'openai'">
        <label class="question-field">
          问题
          <textarea v-model="question" maxlength="8000" />
        </label>
      </template>
      <template v-else>
        <label>
          场景
          <select v-model="scenario">
            <option v-for="(_, name) in scenarios" :key="name" :value="name">{{ name }}</option>
          </select>
        </label>
        <label>
          分片
          <select v-model="chunkMode">
            <option>char</option>
            <option>word</option>
            <option>fixed</option>
            <option>random</option>
            <option>syntax-boundary</option>
          </select>
        </label>
        <label>
          速度 · {{ speed }}ms
          <input v-model.number="speed" type="range" min="0" max="200" />
        </label>
        <label>
          模式
          <select v-model="mode">
            <option>conservative</option>
            <option>balanced</option>
            <option>optimistic</option>
          </select>
        </label>
        <label class="check"><input v-model="showPending" type="checkbox" /> Pending</label>
        <label class="check"><input v-model="autoScroll" type="checkbox" /> 自动滚动</label>
      </template>
      <div class="button-row">
        <button
          type="button"
          class="primary"
          :disabled="source === 'openai' && !question.trim()"
          @click="start"
        >{{ source === "openai" ? "询问 OpenAI" : "开始" }}</button>
        <button type="button" @click="stop">停止</button>
        <button type="button" @click="resetAll">重置</button>
      </div>
      <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>
    </section>

    <section class="workspace">
      <section class="debug-panel">
        <h2>渲染结果</h2>
        <div class="panel-body">
          <div class="render-surface" data-testid="render-output">
            <SemanticMarkdown
              :document="document"
              :protocol="demoProtocol"
              :components="semanticComponents"
              :show-pending-state="showPending"
              @action="logAction"
              @reference="logReference"
            />
          </div>
        </div>
      </section>

      <section class="debug-panel">
        <h2>原始流 <span>{{ rawText.length }}</span></h2>
        <div class="panel-body">
          <pre ref="rawElement" data-testid="raw-stream">{{ rawText }}</pre>
        </div>
      </section>

      <section class="debug-panel">
        <h2>AST</h2>
        <div class="panel-body"><pre>{{ JSON.stringify(document, null, 2) }}</pre></div>
      </section>

      <section class="debug-panel">
        <h2>Patch <span>{{ patchLog.length }}</span></h2>
        <div class="panel-body">
          <pre>{{ patchLog.map((patch) => JSON.stringify(patch)).join("\n") }}</pre>
        </div>
      </section>

      <section class="debug-panel">
        <h2>Diagnostic <span>{{ diagnostics.length }}</span></h2>
        <div class="panel-body">
          <p v-if="diagnostics.length === 0" class="empty">暂无诊断</p>
          <ul v-else class="diagnostics">
            <li
              v-for="item in diagnostics"
              :key="`${item.code}-${item.range?.start ?? 'global'}-${item.message}`"
              :data-severity="item.severity"
            ><code>{{ item.code }}</code> {{ item.message }}</li>
          </ul>
        </div>
      </section>

      <section class="debug-panel">
        <h2>Prompt</h2>
        <div class="panel-body"><pre>{{ prompt }}</pre></div>
      </section>

      <section class="debug-panel">
        <h2>Action / 引用 <span>{{ eventLog.length }}</span></h2>
        <div class="panel-body">
          <ol class="event-log">
            <li v-for="event in eventLog" :key="event.id">{{ event.text }}</li>
          </ol>
        </div>
      </section>
    </section>
  </main>
</template>
