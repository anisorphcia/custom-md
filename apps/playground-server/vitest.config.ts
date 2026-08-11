import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@semantic-md/example-protocol": fileURLToPath(
        new URL("../../packages/example-protocol/src/index.ts", import.meta.url),
      ),
      "@semantic-md/protocol": fileURLToPath(
        new URL("../../packages/protocol/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
  },
});
