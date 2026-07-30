import type {
  AstPatch,
  Diagnostic,
  SemanticActionRequest,
  StreamingMode,
} from "@semantic-md/core";
import { demoProtocol, scenarios } from "@semantic-md/example-protocol";
import { generateProtocolPrompt } from "@semantic-md/protocol";
import { SemanticMarkdown, useSemanticMarkdown } from "@semantic-md/react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { semanticComponents } from "./semantic-components";

type ScenarioName = keyof typeof scenarios;
type ChunkMode = "char" | "word" | "fixed" | "random" | "syntax-boundary";
type ConnectionStatus = "idle" | "connecting" | "streaming" | "finished" | "error";

interface DeltaPayload {
  text: string;
}

interface EventEntry {
  id: number;
  text: string;
}

function parseDelta(value: string): DeltaPayload | undefined {
  try {
    const parsed = JSON.parse(value) as unknown;
    return typeof parsed === "object" &&
      parsed !== null &&
      "text" in parsed &&
      typeof parsed.text === "string"
      ? { text: parsed.text }
      : undefined;
  } catch {
    return undefined;
  }
}

function DebugPanel({
  title,
  children,
  count,
}: {
  title: string;
  children: ReactNode;
  count?: number;
}) {
  return (
    <section className="debug-panel">
      <h2>
        {title}
        {count !== undefined && <span>{count}</span>}
      </h2>
      <div className="panel-body">{children}</div>
    </section>
  );
}

export default function App() {
  const [scenario, setScenario] = useState<ScenarioName>("full");
  const [chunkMode, setChunkMode] = useState<ChunkMode>("syntax-boundary");
  const [speed, setSpeed] = useState(20);
  const [mode, setMode] = useState<StreamingMode>("balanced");
  const [showPending, setShowPending] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [connection, setConnection] = useState<ConnectionStatus>("idle");
  const [rawText, setRawText] = useState("");
  const [patchLog, setPatchLog] = useState<AstPatch[]>([]);
  const [eventLog, setEventLog] = useState<EventEntry[]>([]);
  const nextEventId = useRef(1);
  const eventSourceRef = useRef<EventSource | null>(null);
  const rawRef = useRef<HTMLPreElement | null>(null);
  const { document, diagnostics, status, push, finish, reset } =
    useSemanticMarkdown({
      protocol: demoProtocol,
      streamingMode: mode,
    });
  const prompt = useMemo(() => generateProtocolPrompt(demoProtocol), []);

  useEffect(() => {
    if (autoScroll && rawRef.current) {
      rawRef.current.scrollTop = rawRef.current.scrollHeight;
    }
  }, [autoScroll, rawText]);

  useEffect(
    () => () => {
      eventSourceRef.current?.close();
    },
    [],
  );

  function stop(): void {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    setConnection((current) => (current === "finished" ? current : "idle"));
  }

  function resetAll(): void {
    stop();
    reset();
    setRawText("");
    setPatchLog([]);
    setEventLog([]);
    nextEventId.current = 1;
    setConnection("idle");
  }

  function start(): void {
    resetAll();
    setConnection("connecting");
    const baseUrl = import.meta.env.VITE_SSE_BASE_URL ?? "http://localhost:4100";
    const query = new URLSearchParams({
      scenario,
      speed: String(speed),
      chunkMode,
      chunkSize: "12",
      seed: "1",
    });
    const source = new EventSource(`${baseUrl}/api/stream?${query}`);
    eventSourceRef.current = source;
    source.addEventListener("meta", () => {
      setConnection("streaming");
    });
    source.addEventListener("delta", (event) => {
      if (!(event instanceof MessageEvent) || typeof event.data !== "string") {
        return;
      }
      const payload = parseDelta(event.data);
      if (!payload) {
        return;
      }
      setRawText((current) => current + payload.text);
      const update = push(payload.text);
      setPatchLog((current) => [...current, ...update.patches].slice(-200));
    });
    source.addEventListener("done", () => {
      const update = finish();
      setPatchLog((current) => [...current, ...update.patches].slice(-200));
      setConnection("finished");
      source.close();
      eventSourceRef.current = null;
    });
    source.onerror = () => {
      setConnection("error");
      source.close();
      eventSourceRef.current = null;
    };
  }

  function logAction(action: SemanticActionRequest): void {
    const id = nextEventId.current;
    nextEventId.current += 1;
    setEventLog((current) => [
      ...current,
      {
        id,
        text: `action: ${action.name}${action.targetId ? ` → ${action.targetId}` : ""}`,
      },
    ]);
  }

  function logReference(id: string): void {
    const entryId = nextEventId.current;
    nextEventId.current += 1;
    setEventLog((current) => [
      ...current,
      { id: entryId, text: `citation: ${id}` },
    ]);
  }

  return (
    <main>
      <header className="hero">
        <div>
          <p className="eyebrow">REACT PLAYGROUND</p>
          <h1>Semantic Markdown Stream Lab</h1>
          <p>让 Markdown 在生成过程中就拥有结构、状态与业务语义。</p>
        </div>
        <div className="status-stack">
          <span className={`connection ${connection}`} data-testid="connection-status">
            {connection}
          </span>
          <span data-testid="parse-status">parser · {status}</span>
        </div>
      </header>

      <section className="controls" aria-label="Stream controls">
        <label>
          场景
          <select value={scenario} onChange={(event) => setScenario(event.target.value as ScenarioName)}>
            {Object.keys(scenarios).map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label>
          分片
          <select value={chunkMode} onChange={(event) => setChunkMode(event.target.value as ChunkMode)}>
            <option value="char">char</option>
            <option value="word">word</option>
            <option value="fixed">fixed</option>
            <option value="random">random</option>
            <option value="syntax-boundary">syntax-boundary</option>
          </select>
        </label>
        <label>
          速度 · {speed}ms
          <input
            type="range"
            min="0"
            max="200"
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
          />
        </label>
        <label>
          模式
          <select value={mode} onChange={(event) => setMode(event.target.value as StreamingMode)}>
            <option value="conservative">conservative</option>
            <option value="balanced">balanced</option>
            <option value="optimistic">optimistic</option>
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={showPending} onChange={(event) => setShowPending(event.target.checked)} />
          Pending
        </label>
        <label className="check">
          <input type="checkbox" checked={autoScroll} onChange={(event) => setAutoScroll(event.target.checked)} />
          自动滚动
        </label>
        <div className="button-row">
          <button type="button" className="primary" onClick={start}>开始</button>
          <button type="button" onClick={stop}>停止</button>
          <button type="button" onClick={resetAll}>重置</button>
        </div>
      </section>

      <section className="workspace">
        <DebugPanel title="渲染结果">
          <div className="render-surface" data-testid="render-output">
            <SemanticMarkdown
              document={document}
              protocol={demoProtocol}
              components={semanticComponents}
              showPendingState={showPending}
              onAction={logAction}
              onReference={logReference}
            />
          </div>
        </DebugPanel>
        <DebugPanel title="原始流" count={rawText.length}>
          <pre ref={rawRef} data-testid="raw-stream">{rawText}</pre>
        </DebugPanel>
        <DebugPanel title="AST">
          <pre>{JSON.stringify(document, null, 2)}</pre>
        </DebugPanel>
        <DebugPanel title="Patch" count={patchLog.length}>
          <pre>{patchLog.map((patch) => JSON.stringify(patch)).join("\n")}</pre>
        </DebugPanel>
        <DebugPanel title="Diagnostic" count={diagnostics.length}>
          <DiagnosticList diagnostics={diagnostics} />
        </DebugPanel>
        <DebugPanel title="Prompt">
          <pre>{prompt}</pre>
        </DebugPanel>
        <DebugPanel title="Action / 引用" count={eventLog.length}>
          <ol className="event-log">
            {eventLog.map((event) => <li key={event.id}>{event.text}</li>)}
          </ol>
        </DebugPanel>
      </section>
    </main>
  );
}

function DiagnosticList({ diagnostics }: { diagnostics: Diagnostic[] }) {
  return diagnostics.length === 0 ? (
    <p className="empty">暂无诊断</p>
  ) : (
    <ul className="diagnostics">
      {diagnostics.map((item) => (
        <li
          key={`${item.code}-${item.range?.start ?? "global"}-${item.message}`}
          data-severity={item.severity}
        >
          <code>{item.code}</code> {item.message}
        </li>
      ))}
    </ul>
  );
}
