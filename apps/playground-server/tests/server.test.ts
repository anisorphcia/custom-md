import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src";

describe("playground server", () => {
  it("lists scenarios", async () => {
    const response = await request(createApp()).get("/api/scenarios");
    expect(response.status).toBe(200);
    expect(response.body.scenarios).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "full" })]),
    );
  });

  it("streams ordered meta, delta and done SSE events", async () => {
    const response = await request(createApp()).get(
      "/api/stream?scenario=basic&speed=0&chunkMode=fixed&chunkSize=1000",
    );
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/event-stream");
    const body = response.text;
    expect(body.indexOf("event: meta")).toBeLessThan(body.indexOf("event: delta"));
    expect(body.indexOf("event: delta")).toBeLessThan(body.indexOf("event: done"));
  });
});
