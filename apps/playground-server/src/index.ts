import cors from "cors";
import express from "express";
import { pathToFileURL } from "node:url";
import { registerScenarioRoutes } from "./routes/scenarios";
import { registerStreamRoutes } from "./routes/stream";

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

  const router = express.Router();
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
  createApp().listen(port, () => {
    console.log(`Semantic Markdown playground server listening on http://localhost:${port}`);
  });
}
