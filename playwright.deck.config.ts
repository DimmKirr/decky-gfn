import { defineConfig } from "@playwright/test";

// On-device smoke against a real Deck via Decky's "Allow Remote CEF Debugging"
// (Decky → Settings → Developer). No webServer — we attach to the running
// Gamepad UI over CDP at STEAM_DEV_TOOLS_URL.
export default defineConfig({
  testDir: "tests/e2e-deck",
  timeout: 30_000,
  workers: 1, // one shared Steam UI — parallel specs race each other
});
