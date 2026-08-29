import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  use: { baseURL: "http://localhost:5173" },
  webServer: [
    { command: "node mock/catalog-server.mjs", port: 8787, reuseExistingServer: true },
    { command: "pnpm harness", port: 5173, reuseExistingServer: true },
  ],
});
