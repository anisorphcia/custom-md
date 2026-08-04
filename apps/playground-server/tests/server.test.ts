import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src";

const { responsesCreate } = vi.hoisted(() => ({ responsesCreate: vi.fn() }));

vi.mock("openai", () => ({
  default: class MockOpenAI {
    responses = { create: responsesCreate };
  },
}));

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

  it("explains when the OpenAI API key is missing", async () => {
    const originalKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      const response = await request(createApp())
        .post("/api/openai/stream")
        .send({ prompt: "hello" });
      expect(response.status).toBe(200);
      expect(response.text).toContain("event: failure");
      expect(response.text).toContain("OPENAI_API_KEY");
    } finally {
      if (originalKey) process.env.OPENAI_API_KEY = originalKey;
    }
  });

  it("forwards a successful model stream as semantic SSE", async () => {
    const original = {
      key: process.env.OPENAI_API_KEY,
      baseUrl: process.env.OPENAI_BASE_URL,
      model: process.env.OPENAI_MODEL,
    };
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_BASE_URL = "https://example.invalid/v1";
    process.env.OPENAI_MODEL = "test-model";
    responsesCreate.mockResolvedValueOnce((async function* () {
      yield { type: "response.output_text.delta", delta: "# Hello" };
      yield { type: "response.completed" };
    })());

    try {
      const response = await request(createApp())
        .post("/api/openai/stream")
        .send({ prompt: "hello" });
      expect(response.status).toBe(200);
      expect(response.text).toContain("event: meta");
      expect(response.text).toContain('data: {"text":"# Hello"}');
      expect(response.text).toContain("event: done");
      expect(responsesCreate).toHaveBeenCalledWith(
        expect.objectContaining({ model: "test-model", input: "hello", stream: true }),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    } finally {
      if (original.key) process.env.OPENAI_API_KEY = original.key;
      else delete process.env.OPENAI_API_KEY;
      if (original.baseUrl) process.env.OPENAI_BASE_URL = original.baseUrl;
      else delete process.env.OPENAI_BASE_URL;
      if (original.model) process.env.OPENAI_MODEL = original.model;
      else delete process.env.OPENAI_MODEL;
    }
  });
});
