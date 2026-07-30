import { scenarios } from "@semantic-md/example-protocol";
import type { Router } from "express";

export function registerScenarioRoutes(router: Router): void {
  router.get("/scenarios", (_request, response) => {
    response.json({
      scenarios: Object.entries(scenarios).map(([name, content]) => ({
        name,
        characters: content.length,
      })),
    });
  });
}
