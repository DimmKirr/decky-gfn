import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@decky/ui": path.resolve(import.meta.dirname, "mock/stubs/decky-ui.tsx"),
      "@decky/api": path.resolve(import.meta.dirname, "mock/stubs/decky-api.ts"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["tests/setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    exclude: ["tests/e2e/**", "node_modules/**"],
  },
});
