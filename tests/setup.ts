import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
// Direct stub import: vitest aliases @decky/api to this same module, but plain
// tsc (pnpm typecheck) doesn't, and the real package has no test hooks.
import { __reset } from "../mock/stubs/decky-api";

afterEach(() => {
  cleanup();
  __reset();
});
