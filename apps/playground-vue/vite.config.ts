import { fileURLToPath, URL } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@semantic-md/core": fileURLToPath(
        new URL("../../packages/core/src/index.ts", import.meta.url),
      ),
      "@semantic-md/protocol": fileURLToPath(
        new URL("../../packages/protocol/src/index.ts", import.meta.url),
      ),
      "@semantic-md/vue": fileURLToPath(
        new URL("../../packages/vue/src/index.ts", import.meta.url),
      ),
      "@semantic-md/example-protocol": fileURLToPath(
        new URL("../../packages/example-protocol/src/index.ts", import.meta.url),
      ),
    },
  },
  server: {
    port: 5174,
  },
});
