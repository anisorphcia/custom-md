import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: {
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "pnpm dev:server",
      port: 4100,
      reuseExistingServer: true,
    },
    {
      command: "pnpm dev:react",
      port: 5173,
      reuseExistingServer: true,
    },
    {
      command: "pnpm dev:vue",
      port: 5174,
      reuseExistingServer: true,
    },
  ],
});
