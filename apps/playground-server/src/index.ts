import cors from "cors";
import express from "express";
import { loadEnvFile } from "node:process";
import { pathToFileURL } from "node:url";
import { registerOpenAiRoutes } from "./routes/openai";
import { registerScenarioRoutes } from "./routes/scenarios";
import { registerStreamRoutes } from "./routes/stream";

try {
  loadEnvFile(new URL("../../../.env", import.meta.url));
} catch (error: unknown) {
  if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
    throw error;
  }
}

export function createApp(): express.Express {
  const app = express();
  const origins = new Set(
    (process.env.CORS_ORIGINS ?? "http://localhost:5173,http://localhost:5174")
      .split(",")
      .map((origin) => origin.trim()),
  );
  app.use(
    cors({
      origin(origin, callback) {
        callback(null, !origin || origins.has(origin));
      },
    }),
  );
  app.use(express.json({ limit: "16kb" }));

  const router = express.Router();
  registerOpenAiRoutes(router);
  registerStreamRoutes(router);
  registerScenarioRoutes(router);
  app.use("/api", router);
  app.get("/health", (_request, response) => {
    response.json({ ok: true });
  });
  return app;
}

const entryUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === entryUrl) {
  const port = Number(process.env.PORT ?? 4100);
  const host = process.env.HOST?.trim() || "127.0.0.1";
  createApp().listen(port, host, () => {
    console.log(`Semantic Markdown playground server listening on http://${host}:${port}`);
  });
}
