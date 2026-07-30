<script setup lang="ts">
import type {
  AstPatch,
  SemanticActionRequest,
  StreamingMode,
} from "@semantic-md/core";
import { demoProtocol, scenarios } from "@semantic-md/example-protocol";
import { generateProtocolPrompt } from "@semantic-md/protocol";
import { SemanticMarkdown, useSemanticMarkdown } from "@semantic-md/vue";
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import { semanticComponents } from "./semantic-components";

type ScenarioName = keyof typeof scenarios;
type ChunkMode = "char" | "word" | "fixed" | "random" | "syntax-boundary";
type ConnectionStatus = "idle" | "connecting" | "streaming" | "finished" | "error";

const scenario = ref<ScenarioName>("full");
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
const { document, diagnostics, status, push, finish, reset } =
  useSemanticMarkdown({
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

function stop(): void {
  eventSource?.close();
  eventSource = undefined;
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
}

function start(): void {
  resetAll();
  connection.value = "connecting";
  const baseUrl = import.meta.env.VITE_SSE_BASE_URL ?? "http://localhost:4100";
  const query = new URLSearchParams({
    scenario: scenario.value,
    speed: String(speed.value),
    chunkMode: chunkMode.value,
    chunkSize: "12",
    seed: "1",
  });
  const source = new EventSource(`${baseUrl}/api/stream?${query}`);
  eventSource = source;
  source.addEventListener("meta", () => {
    connection.value = "streaming";
  });
  source.addEventListener("delta", (event) => {
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
  source.addEventListener("done", () => {
    const update = finish();
    patchLog.value = [...patchLog.value, ...update.patches].slice(-200);
    connection.value = "finished";
    source.close();
    eventSource = undefined;
  });
  source.onerror = () => {
    connection.value = "error";
    source.close();
    eventSource = undefined;
  };
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
      <div class="button-row">
        <button type="button" class="primary" @click="start">开始</button>
        <button type="button" @click="stop">停止</button>
        <button type="button" @click="resetAll">重置</button>
      </div>
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
