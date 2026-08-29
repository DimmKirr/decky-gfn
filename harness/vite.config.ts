import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

export default defineConfig({
  root: path.resolve(root, "harness"),
  plugins: [react()],
  resolve: {
    alias: {
      "@decky/ui": path.resolve(root, "mock/stubs/decky-ui.tsx"),
      "@decky/api": path.resolve(root, "mock/stubs/decky-api.ts"),
    },
  },
  server: { port: 5173, strictPort: true },
});
