# decky-gfn Plugin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Decky Loader plugin that browses the GFN catalog in Steam Gamepad UI and installs games as non-Steam shortcuts (AppImage download + live `SteamClient.Apps.AddShortcut`), fully developable/testable locally without a Steam Deck.

**Architecture:** Live-shortcut frontend + thin Python file-ops backend (approved design: `docs/plans/2026-08-24-decky-gfn-plugin-design.md`). All logic in pure TS `src/core/` behind adapter interfaces; `@decky/ui`/`@decky/api` aliased to stubs in Vitest and a Vite browser harness; catalog served by a local mock until the real `/api/catalog` ships on the launcher site.

**Tech Stack:** `@decky/ui` 4.12, `@decky/api` 1.1.3, `@decky/rollup` 1.0.2, TypeScript, React 19 (dev only — Steam provides React at runtime), pnpm 9, Vitest + Testing Library, pytest, Vite harness, Playwright.

**Repo:** `/Users/dmitry/dev/dimmkirr/decky-gfn`, branch `develop`. Commit after every task. No Co-Authored-By lines.

**Reference facts (verified 2026-08-24):**
- Launcher site: `https://gfn-game-launcher.pages.dev`; `GET /api/appimage?cmsId=<id>` already deployed (CORS `*`, streams binary).
- Library snapshot (fixture source): `/Users/dmitry/dev/dimmkirr/gfn-game-launcher/src/data/library.json` — array of `{id, title, images: {TV_BANNER, HERO_IMAGE}, variants: [{id, appStore}]}`.
- Catalog contract v1: `GET /api/catalog?q=&page=&pageSize=` → `{total, page, pageSize, games: [{gameId, title, imageUrl, heroUrl, variants: [{cmsId, store}]}]}`. `store` stays raw uppercase (`STEAM`, `EPIC`, `GOG`…); UI prettifies.
- Container has node v24, python 3.13, no pnpm → install with `npm install -g pnpm@9`.

---

### Task 1: Scaffold plugin from template

**Files:**
- Create: `package.json`, `plugin.json`, `rollup.config.js`, `tsconfig.json`, `.gitignore`, `LICENSE`, `src/index.tsx`, `main.py`

**Step 1: Install pnpm**

Run: `npm install -g pnpm@9 && pnpm --version` — expect `9.x`.

**Step 2: Write config files**

`package.json`:

```json
{
  "name": "decky-gfn",
  "version": "0.1.0",
  "description": "Browse the GeForce NOW catalog and install games into your Steam library",
  "type": "module",
  "license": "BSD-3-Clause",
  "scripts": {
    "build": "rollup -c",
    "watch": "rollup -c -w",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "mock:catalog": "node mock/catalog-server.mjs",
    "harness": "vite -c harness/vite.config.ts",
    "package": "./scripts/package.sh"
  },
  "dependencies": {
    "@decky/api": "^1.1.3",
    "react-icons": "^5.3.0",
    "tslib": "^2.7.0"
  },
  "devDependencies": {
    "@decky/rollup": "^1.0.2",
    "@decky/ui": "^4.12.0",
    "@playwright/test": "^1.49.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/react": "19.1.1",
    "@types/react-dom": "19.1.1",
    "@vitejs/plugin-react": "^4.3.0",
    "jsdom": "^25.0.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "rollup": "^4.53.3",
    "typescript": "^5.6.2",
    "vite": "^6.0.0",
    "vitest": "^3.0.0"
  },
  "pnpm": {
    "peerDependencyRules": { "ignoreMissing": ["react", "react-dom"] }
  }
}
```

Note: do NOT add the template's `@rollup/rollup-linux-x64-musl` — this repo is bind-mounted macOS↔Linux; let npm/pnpm pick the native binary per platform (same policy as gfn-game-launcher).

`plugin.json`:

```json
{
  "name": "GeForce NOW",
  "author": "dimmkirr",
  "flags": ["debug"],
  "api_version": 1,
  "publish": {
    "tags": ["gfn", "geforce-now", "shortcuts"],
    "description": "Browse the GeForce NOW catalog and install games into your Steam library",
    "image": "https://opengraph.githubassets.com/1/SteamDeckHomebrew/PluginLoader"
  }
}
```

`rollup.config.js`:

```js
import deckyPlugin from "@decky/rollup";

export default deckyPlugin({});
```

`tsconfig.json` (template's, with tests/mock/harness included for `typecheck`):

```json
{
  "compilerOptions": {
    "outDir": "dist",
    "module": "ESNext",
    "target": "ES2020",
    "jsx": "react-jsx",
    "declaration": false,
    "moduleResolution": "bundler",
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "esModuleInterop": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "noImplicitAny": true,
    "strict": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src", "tests", "mock", "harness"],
  "exclude": ["node_modules", "dist"]
}
```

(If `tsc` complains about missing `@types/node`, add it: `pnpm add -D @types/node`.)

`.gitignore`:

```
node_modules/
dist/
build/
*.zip
__pycache__/
.pytest_cache/
test-results/
playwright-report/
.vite/
```

`LICENSE`: BSD-3-Clause text, copyright 2026 dimmkirr.

**Step 3: Minimal `src/index.tsx` (placeholder QAM panel)**

```tsx
import { PanelSection, PanelSectionRow, staticClasses } from "@decky/ui";
import { definePlugin } from "@decky/api";
import { SiNvidia } from "react-icons/si";

export default definePlugin(() => ({
  name: "GeForce NOW",
  titleView: <div className={staticClasses.Title}>GeForce NOW</div>,
  content: (
    <PanelSection title="GeForce NOW">
      <PanelSectionRow>Catalog coming soon</PanelSectionRow>
    </PanelSection>
  ),
  icon: <SiNvidia />,
}));
```

**Step 4: Minimal `main.py`**

```python
import decky


class Plugin:
    async def _main(self):
        decky.logger.info("decky-gfn backend up")

    async def _unload(self):
        pass
```

**Step 5: Install + build**

Run: `pnpm install && pnpm build`
Expected: `dist/index.js` exists, no errors.

**Step 6: Commit**

```bash
git add -A && git commit -m "Scaffold plugin from decky-plugin-template (api_version 1)"
```

---

### Task 2: Test infrastructure — Vitest + decky stubs

**Files:**
- Create: `vitest.config.ts`, `tests/setup.ts`, `mock/stubs/decky-ui.tsx`, `mock/stubs/decky-api.ts`, `tests/stubs.test.tsx`

**Step 1: `mock/stubs/decky-ui.tsx`** — minimal HTML equivalents of every `@decky/ui` component we use (shared by Vitest and the harness):

```tsx
/* Lightweight stand-ins for @decky/ui — real components only render inside Steam. */
export const staticClasses = { Title: "deckyTitle", PanelSectionTitle: "deckyPanelSectionTitle" };

export function PanelSection({ title, children }: any) {
  return (
    <section>
      {title && <h3>{title}</h3>}
      {children}
    </section>
  );
}

export function PanelSectionRow({ children }: any) {
  return <div>{children}</div>;
}

export function ButtonItem({ children, onClick, disabled }: any) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function DialogButton({ children, onClick, disabled, style }: any) {
  return (
    <button onClick={onClick} disabled={disabled} style={style}>
      {children}
    </button>
  );
}

export function Focusable({ children, onActivate, onCancel, ...rest }: any) {
  return (
    <div
      tabIndex={0}
      role="button"
      onClick={onActivate}
      onKeyDown={(e: any) => {
        if (e.key === "Enter") onActivate?.(e);
        if (e.key === "Escape") onCancel?.(e);
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

export function TextField({ value, onChange, label, ...rest }: any) {
  return <input aria-label={label ?? "text"} value={value} onChange={onChange} {...rest} />;
}

export function Dropdown({ rgOptions, selectedOption, onChange }: any) {
  return (
    <select
      aria-label="dropdown"
      value={String(selectedOption)}
      onChange={(e) => onChange?.(rgOptions.find((o: any) => String(o.data) === e.target.value))}
    >
      {rgOptions.map((o: any) => (
        <option key={String(o.data)} value={String(o.data)}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function SteamSpinner() {
  return <div role="progressbar">Loading…</div>;
}

export function ProgressBarWithInfo({ nProgress, sOperationText }: any) {
  return (
    <div role="progressbar" aria-valuenow={nProgress}>
      {sOperationText}
    </div>
  );
}

export const Navigation = {
  Navigate: (_path: string) => {},
  CloseSideMenus: () => {},
};
```

**Step 2: `mock/stubs/decky-api.ts`** — configurable callable registry + event bus:

```ts
/* Stand-in for @decky/api with test hooks (__setCallable / __emit / __reset). */
type AnyFn = (...args: any[]) => any;

const callables = new Map<string, AnyFn>();
const listeners = new Map<string, Set<AnyFn>>();

export function __setCallable(name: string, impl: AnyFn): void {
  callables.set(name, impl);
}

export function __emit(event: string, ...args: any[]): void {
  listeners.get(event)?.forEach((cb) => cb(...args));
}

export function __reset(): void {
  callables.clear();
  listeners.clear();
  toaster.toasts.length = 0;
}

export function callable<Args extends any[], Ret>(name: string) {
  return async (...args: Args): Promise<Ret> => {
    const impl = callables.get(name);
    if (!impl) throw new Error(`no mock for callable '${name}' — call __setCallable first`);
    return impl(...args);
  };
}

export function addEventListener(event: string, cb: AnyFn): void {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event)!.add(cb);
}

export function removeEventListener(event: string, cb: AnyFn): void {
  listeners.get(event)?.delete(cb);
}

export const toaster = {
  toasts: [] as any[],
  toast(t: any) {
    this.toasts.push(t);
  },
};

export const fetchNoCors: typeof fetch = (...args) => fetch(...args);

export const routerHook = {
  routes: new Map<string, any>(),
  addRoute(path: string, component: any, _opts?: any) {
    this.routes.set(path, component);
  },
  removeRoute(path: string) {
    this.routes.delete(path);
  },
};

export function definePlugin(fn: () => any) {
  return fn;
}
```

**Step 3: `vitest.config.ts`**

```ts
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
  },
});
```

**Step 4: `tests/setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { __reset } from "@decky/api";

afterEach(() => {
  cleanup();
  __reset();
});
```

**Step 5: Write the smoke test `tests/stubs.test.tsx`**

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ButtonItem, PanelSection } from "@decky/ui";
import { __setCallable, callable } from "@decky/api";

describe("decky stubs", () => {
  it("renders @decky/ui stand-ins", async () => {
    let clicked = false;
    render(
      <PanelSection title="T">
        <ButtonItem onClick={() => (clicked = true)}>Go</ButtonItem>
      </PanelSection>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(clicked).toBe(true);
    expect(screen.getByText("T")).toBeInTheDocument();
  });

  it("routes callables through the registry", async () => {
    __setCallable("add", (a: number, b: number) => a + b);
    const add = callable<[number, number], number>("add");
    expect(await add(2, 3)).toBe(5);
  });
});
```

**Step 6: Run** `pnpm test` — expected: 2 passing. (If it fails on alias resolution, check `import.meta.dirname` — requires node ≥20.11, we have 24.)

**Step 7: Commit** — `git add -A && git commit -m "Add Vitest infra with @decky/ui and @decky/api stubs"`

---

### Task 3: `core/types.ts` + `core/catalog.ts` (TDD)

**Files:**
- Create: `src/core/types.ts`, `src/core/config.ts`, `src/core/catalog.ts`
- Test: `tests/core/catalog.test.ts`

**Step 1: `src/core/types.ts`** (types only, no test needed)

```ts
export interface Variant {
  cmsId: string;
  store: string; // raw library enum: STEAM, EPIC, GOG, …
}

export interface CatalogGame {
  gameId: string; // GFN parentGameId UUID
  title: string;
  imageUrl: string; // TV_BANNER
  heroUrl?: string; // HERO_IMAGE
  variants: Variant[];
}

export interface CatalogPageData {
  total: number;
  page: number;
  pageSize: number;
  games: CatalogGame[];
}

export interface InstalledGame {
  gameId: string;
  title: string;
  appId: number;
  path: string;
  cmsId: string;
  store: string;
}

export type BackendResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: "network" | "bad-status" | "disk-full" | "unknown"; detail?: string };
```

`src/core/config.ts`:

```ts
export const DEFAULT_BASE_URL = "https://gfn-game-launcher.pages.dev";
```

**Step 2: Write failing tests `tests/core/catalog.test.ts`**

```ts
import { describe, expect, it, vi } from "vitest";
import { CatalogClient, CatalogError } from "../../src/core/catalog";
import type { CatalogPageData } from "../../src/core/types";

const PAGE: CatalogPageData = {
  total: 1,
  page: 1,
  pageSize: 50,
  games: [
    {
      gameId: "uuid-1",
      title: "Counter-Strike 2",
      imageUrl: "https://img/banner.jpg",
      variants: [{ cmsId: "7315111", store: "STEAM" }],
    },
  ],
};

function okFetch(body: unknown = PAGE) {
  return vi.fn(async () => ({ ok: true, status: 200, json: async () => body }));
}

describe("CatalogClient", () => {
  it("builds the request URL from q/page/pageSize", async () => {
    const fetchFn = okFetch();
    const client = new CatalogClient("https://example.test", fetchFn);
    await client.getPage({ q: "counter", page: 2, pageSize: 10 });
    expect(fetchFn).toHaveBeenCalledWith(
      "https://example.test/api/catalog?q=counter&page=2&pageSize=10",
    );
  });

  it("returns the parsed page", async () => {
    const client = new CatalogClient("https://example.test", okFetch());
    const page = await client.getPage();
    expect(page.games[0].title).toBe("Counter-Strike 2");
  });

  it("caches per q|page|pageSize key", async () => {
    const fetchFn = okFetch();
    const client = new CatalogClient("https://example.test", fetchFn);
    await client.getPage({ q: "a" });
    await client.getPage({ q: "a" });
    await client.getPage({ q: "b" });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("throws CatalogError(bad-status) on non-2xx", async () => {
    const fetchFn = vi.fn(async () => ({ ok: false, status: 502, json: async () => ({}) }));
    const client = new CatalogClient("https://example.test", fetchFn);
    await expect(client.getPage()).rejects.toMatchObject({ kind: "bad-status" });
  });

  it("throws CatalogError(network) when fetch rejects", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("offline");
    });
    const client = new CatalogClient("https://example.test", fetchFn);
    await expect(client.getPage()).rejects.toBeInstanceOf(CatalogError);
    await expect(client.getPage()).rejects.toMatchObject({ kind: "network" });
  });

  it("throws CatalogError(bad-json) when games[] is missing", async () => {
    const client = new CatalogClient("https://example.test", okFetch({ nope: true }));
    await expect(client.getPage()).rejects.toMatchObject({ kind: "bad-json" });
  });
});
```

**Step 3: Run** `pnpm test tests/core/catalog.test.ts` — expected: FAIL (module not found).

**Step 4: Implement `src/core/catalog.ts`**

```ts
import type { CatalogPageData } from "./types";

export type FetchLike = (
  url: string,
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export class CatalogError extends Error {
  constructor(
    public kind: "network" | "bad-status" | "bad-json",
    message: string,
  ) {
    super(message);
    this.name = "CatalogError";
  }
}

export interface CatalogSource {
  getPage(opts?: { q?: string; page?: number; pageSize?: number }): Promise<CatalogPageData>;
}

export class CatalogClient implements CatalogSource {
  private cache = new Map<string, CatalogPageData>();

  constructor(
    private baseUrl: string,
    private fetchFn: FetchLike,
  ) {}

  async getPage(opts: { q?: string; page?: number; pageSize?: number } = {}): Promise<CatalogPageData> {
    const q = opts.q ?? "";
    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? 50;
    const key = `${q}|${page}|${pageSize}`;
    const hit = this.cache.get(key);
    if (hit) return hit;

    const url = new URL("/api/catalog", this.baseUrl);
    if (q) url.searchParams.set("q", q);
    url.searchParams.set("page", String(page));
    url.searchParams.set("pageSize", String(pageSize));

    let res: Awaited<ReturnType<FetchLike>>;
    try {
      res = await this.fetchFn(url.toString());
    } catch (err) {
      throw new CatalogError("network", String(err));
    }
    if (!res.ok) throw new CatalogError("bad-status", `catalog returned ${res.status}`);

    let body: unknown;
    try {
      body = await res.json();
    } catch (err) {
      throw new CatalogError("bad-json", String(err));
    }
    const parsed = body as CatalogPageData;
    if (!Array.isArray(parsed?.games)) throw new CatalogError("bad-json", "missing games[]");

    this.cache.set(key, parsed);
    return parsed;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
```

**Step 5: Run** `pnpm test tests/core/catalog.test.ts` — expected: 6 passing.

**Step 6: Commit** — `git commit -am "Add core types and CatalogClient (cached, typed errors)"` (use `git add -A` first for new files).

---

### Task 4: `core/install.ts` — install/uninstall orchestration (TDD)

**Files:**
- Create: `src/core/install.ts`
- Test: `tests/core/install.test.ts`

**Step 1: Write failing tests `tests/core/install.test.ts`**

```ts
import { describe, expect, it, vi } from "vitest";
import { installGame, uninstallGame, type InstallPorts } from "../../src/core/install";
import type { CatalogGame, InstalledGame } from "../../src/core/types";

const GAME: CatalogGame = {
  gameId: "uuid-1",
  title: "Cyberpunk 2077",
  imageUrl: "https://img/banner.jpg",
  variants: [{ cmsId: "100838211", store: "GOG" }],
};
const VARIANT = GAME.variants[0];

function makePorts(overrides: Partial<InstallPorts> = {}): InstallPorts {
  return {
    download: vi.fn(async () => ({ ok: true as const, value: { path: "/data/cyberpunk.AppImage" } })),
    addShortcut: vi.fn(async () => 12345),
    setArtwork: vi.fn(async () => {}),
    removeFile: vi.fn(async () => {}),
    recordInstall: vi.fn(async () => {}),
    ...overrides,
  };
}

describe("installGame", () => {
  it("happy path: download → shortcut → artwork → record", async () => {
    const ports = makePorts();
    const phases: string[] = [];
    const out = await installGame(ports, GAME, VARIANT, (p) => phases.push(p));
    expect(out).toEqual({ ok: true, appId: 12345 });
    expect(ports.addShortcut).toHaveBeenCalledWith("Cyberpunk 2077", "/data/cyberpunk.AppImage");
    expect(ports.setArtwork).toHaveBeenCalledWith(12345, GAME.imageUrl);
    expect(ports.recordInstall).toHaveBeenCalledWith({
      gameId: "uuid-1",
      title: "Cyberpunk 2077",
      appId: 12345,
      path: "/data/cyberpunk.AppImage",
      cmsId: "100838211",
      store: "GOG",
    });
    expect(phases).toEqual(["downloading", "adding", "recording"]);
  });

  it("download failure: returns error, adds no shortcut", async () => {
    const ports = makePorts({
      download: vi.fn(async () => ({ ok: false as const, code: "network" as const, detail: "offline" })),
    });
    const out = await installGame(ports, GAME, VARIANT);
    expect(out).toMatchObject({ ok: false, code: "download" });
    expect(ports.addShortcut).not.toHaveBeenCalled();
  });

  it("addShortcut throw: rolls back the file", async () => {
    const ports = makePorts({ addShortcut: vi.fn(async () => { throw new Error("steam broke"); }) });
    const out = await installGame(ports, GAME, VARIANT);
    expect(out).toMatchObject({ ok: false, code: "add-shortcut" });
    expect(ports.removeFile).toHaveBeenCalledWith("/data/cyberpunk.AppImage");
  });

  it("addShortcut bad appId: rolls back the file", async () => {
    const ports = makePorts({ addShortcut: vi.fn(async () => 0) });
    const out = await installGame(ports, GAME, VARIANT);
    expect(out).toMatchObject({ ok: false, code: "add-shortcut" });
    expect(ports.removeFile).toHaveBeenCalled();
  });

  it("artwork failure is non-fatal", async () => {
    const ports = makePorts({ setArtwork: vi.fn(async () => { throw new Error("no art"); }) });
    const out = await installGame(ports, GAME, VARIANT);
    expect(out).toEqual({ ok: true, appId: 12345 });
  });
});

describe("uninstallGame", () => {
  it("removes shortcut, file, and record", async () => {
    const installed: InstalledGame = {
      gameId: "uuid-1", title: "Cyberpunk 2077", appId: 12345,
      path: "/data/cyberpunk.AppImage", cmsId: "100838211", store: "GOG",
    };
    const ports = {
      removeShortcut: vi.fn(async () => {}),
      removeFile: vi.fn(async () => {}),
      removeRecord: vi.fn(async () => {}),
    };
    await uninstallGame(ports, installed);
    expect(ports.removeShortcut).toHaveBeenCalledWith(12345);
    expect(ports.removeFile).toHaveBeenCalledWith("/data/cyberpunk.AppImage");
    expect(ports.removeRecord).toHaveBeenCalledWith("uuid-1");
  });
});
```

**Step 2: Run** `pnpm test tests/core/install.test.ts` — expected: FAIL.

**Step 3: Implement `src/core/install.ts`**

```ts
import type { BackendResult, CatalogGame, InstalledGame, Variant } from "./types";

export interface InstallPorts {
  download(cmsId: string, title: string): Promise<BackendResult<{ path: string }>>;
  addShortcut(title: string, path: string): Promise<number>;
  setArtwork(appId: number, imageUrl: string): Promise<void>;
  removeFile(path: string): Promise<void>;
  recordInstall(entry: InstalledGame): Promise<void>;
}

export interface UninstallPorts {
  removeShortcut(appId: number): Promise<void>;
  removeFile(path: string): Promise<void>;
  removeRecord(gameId: string): Promise<void>;
}

export type InstallPhase = "downloading" | "adding" | "recording";

export type InstallOutcome =
  | { ok: true; appId: number }
  | { ok: false; code: "download" | "add-shortcut" | "record"; detail?: string };

export async function installGame(
  ports: InstallPorts,
  game: CatalogGame,
  variant: Variant,
  onPhase?: (phase: InstallPhase) => void,
): Promise<InstallOutcome> {
  onPhase?.("downloading");
  const dl = await ports.download(variant.cmsId, game.title);
  if (!dl.ok) {
    return { ok: false, code: "download", detail: dl.detail ? `${dl.code}: ${dl.detail}` : dl.code };
  }
  const { path } = dl.value;

  onPhase?.("adding");
  let appId: number;
  try {
    appId = await ports.addShortcut(game.title, path);
  } catch (err) {
    await ports.removeFile(path);
    return { ok: false, code: "add-shortcut", detail: String(err) };
  }
  if (!Number.isInteger(appId) || appId <= 0) {
    await ports.removeFile(path);
    return { ok: false, code: "add-shortcut", detail: `AddShortcut returned ${appId}` };
  }

  try {
    await ports.setArtwork(appId, game.imageUrl);
  } catch {
    // Non-fatal: the shortcut works without custom art.
  }

  onPhase?.("recording");
  try {
    await ports.recordInstall({
      gameId: game.gameId,
      title: game.title,
      appId,
      path,
      cmsId: variant.cmsId,
      store: variant.store,
    });
  } catch (err) {
    return { ok: false, code: "record", detail: String(err) };
  }

  return { ok: true, appId };
}

export async function uninstallGame(ports: UninstallPorts, installed: InstalledGame): Promise<void> {
  await ports.removeShortcut(installed.appId);
  await ports.removeFile(installed.path);
  await ports.removeRecord(installed.gameId);
}
```

**Step 4: Run** `pnpm test` — expected: all passing.

**Step 5: Commit** — `git add -A && git commit -m "Add install/uninstall orchestration with rollback"`

---

### Task 5: Catalog fixture + mock catalog server

**Files:**
- Create: `mock/fixtures/catalog.json` (generated), `mock/catalog-server.mjs`

**Step 1: Generate the fixture from the launcher library snapshot**

```bash
mkdir -p mock/fixtures && node -e '
const fs = require("fs");
const lib = JSON.parse(fs.readFileSync("/Users/dmitry/dev/dimmkirr/gfn-game-launcher/src/data/library.json", "utf8"));
const proj = lib.slice(0, 40).map(g => ({
  gameId: g.id,
  title: g.title,
  imageUrl: g.images?.TV_BANNER ?? "",
  heroUrl: g.images?.HERO_IMAGE ?? "",
  variants: (g.variants ?? []).map(v => ({ cmsId: String(v.id), store: v.appStore })),
}));
fs.writeFileSync("mock/fixtures/catalog.json", JSON.stringify(proj, null, 2));
console.log(proj.length, "games;", proj[0].title);
'
```

Expected output: `40 games; Counter-Strike 2`.

**Step 2: `mock/catalog-server.mjs`**

```js
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const GAMES = JSON.parse(readFileSync(path.join(here, "fixtures/catalog.json"), "utf8"));
const PORT = Number(process.env.PORT ?? 8787);

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  res.setHeader("access-control-allow-origin", "*");

  if (url.pathname === "/api/catalog") {
    const q = (url.searchParams.get("q") ?? "").toLowerCase();
    const page = Number(url.searchParams.get("page") ?? 1);
    const pageSize = Number(url.searchParams.get("pageSize") ?? 50);
    const filtered = GAMES.filter((g) => g.title.toLowerCase().includes(q));
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({
      total: filtered.length,
      page,
      pageSize,
      games: filtered.slice((page - 1) * pageSize, page * pageSize),
    }));
    return;
  }

  if (url.pathname === "/api/appimage") {
    const cmsId = url.searchParams.get("cmsId");
    if (!GAMES.some((g) => g.variants.some((v) => v.cmsId === cmsId))) {
      res.statusCode = 404;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: "unknown cmsId" }));
      return;
    }
    res.setHeader("content-type", "application/x-executable");
    res.end(Buffer.alloc(64 * 1024, 1)); // 64KB stand-in binary
    return;
  }

  res.statusCode = 404;
  res.end("not found");
});

server.listen(PORT, () => console.log(`mock catalog on http://localhost:${PORT}`));
```

**Step 3: Verify manually**

```bash
pnpm mock:catalog &
sleep 1
curl -s 'http://localhost:8787/api/catalog?q=counter' | head -c 300; echo
curl -so /dev/null -w '%{http_code} %{size_download}\n' 'http://localhost:8787/api/appimage?cmsId=7315111'
curl -so /dev/null -w '%{http_code}\n' 'http://localhost:8787/api/appimage?cmsId=nope'
kill %1
```

Expected: JSON with Counter-Strike 2; `200 65536`; `404`.

**Step 4: Commit** — `git add -A && git commit -m "Add catalog fixture and local mock server (catalog + appimage)"`

---

### Task 6: Python backend — download + registry (TDD, pytest)

**Files:**
- Create: `tests/backend/conftest.py`, `tests/backend/test_main.py`, `requirements-dev.txt`
- Modify: `main.py`

**Step 1: `requirements-dev.txt`** — just `pytest`. Run `pip install -r requirements-dev.txt` (or `pip install pytest`).

**Step 2: `tests/backend/conftest.py`** — fake `decky` module + local HTTP fixture:

```python
import http.server
import logging
import sys
import threading
import types

import pytest


@pytest.fixture()
def fake_decky(tmp_path, monkeypatch):
    """Install a fake 'decky' module BEFORE main.py is imported."""
    m = types.ModuleType("decky")
    m.DECKY_PLUGIN_RUNTIME_DIR = str(tmp_path / "runtime")
    m.DECKY_PLUGIN_SETTINGS_DIR = str(tmp_path / "settings")
    m.DECKY_PLUGIN_LOG_DIR = str(tmp_path / "log")
    m.logger = logging.getLogger("decky-fake")
    m.emitted = []

    async def emit(event, *args):
        m.emitted.append((event, args))

    m.emit = emit
    monkeypatch.setitem(sys.modules, "decky", m)
    # Force re-import of main against the fake
    sys.modules.pop("main", None)
    return m


class _Handler(http.server.BaseHTTPRequestHandler):
    payload = b"\x7fELF" + b"\x01" * (128 * 1024)

    def do_GET(self):
        if self.path.startswith("/api/appimage") and "cmsId=good" in self.path:
            self.send_response(200)
            self.send_header("Content-Length", str(len(self.payload)))
            self.end_headers()
            self.wfile.write(self.payload)
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, *args):
        pass


@pytest.fixture()
def http_fixture():
    server = http.server.HTTPServer(("127.0.0.1", 0), _Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield f"http://127.0.0.1:{server.server_address[1]}"
    server.shutdown()
```

**Step 3: Write failing tests `tests/backend/test_main.py`**

```python
import asyncio
import importlib
import json
import os
import stat
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


def load_plugin(fake_decky, base_url, monkeypatch):
    monkeypatch.setenv("DECKY_GFN_BASE_URL", base_url)
    import main
    importlib.reload(main)
    return main.Plugin()


def test_download_appimage_success(fake_decky, http_fixture, monkeypatch):
    plugin = load_plugin(fake_decky, http_fixture, monkeypatch)
    result = asyncio.run(plugin.download_appimage("good", "Cyberpunk 2077"))
    assert result["ok"] is True
    path = result["value"]["path"]
    assert path.endswith("cyberpunk-2077.AppImage")
    assert os.path.isfile(path)
    assert os.stat(path).st_mode & stat.S_IXUSR  # executable
    assert any(e[0] == "download_progress" for e in fake_decky.emitted)


def test_download_appimage_404(fake_decky, http_fixture, monkeypatch):
    plugin = load_plugin(fake_decky, http_fixture, monkeypatch)
    result = asyncio.run(plugin.download_appimage("bad", "Nope"))
    assert result == {"ok": False, "code": "bad-status", "detail": "HTTP 404"}
    runtime = os.path.join(fake_decky.DECKY_PLUGIN_RUNTIME_DIR, "appimages")
    assert not os.path.exists(os.path.join(runtime, "nope.AppImage"))
    assert not any(f.endswith(".part") for f in os.listdir(runtime))  # no partial left


def test_download_appimage_network_error(fake_decky, monkeypatch):
    plugin = load_plugin(fake_decky, "http://127.0.0.1:1", monkeypatch)  # nothing listens
    result = asyncio.run(plugin.download_appimage("good", "Offline"))
    assert result["ok"] is False
    assert result["code"] == "network"


def test_install_registry_roundtrip(fake_decky, http_fixture, monkeypatch):
    plugin = load_plugin(fake_decky, http_fixture, monkeypatch)
    entry = {"gameId": "u1", "title": "CS2", "appId": 7, "path": "/x", "cmsId": "1", "store": "STEAM"}
    assert asyncio.run(plugin.list_installed()) == []
    asyncio.run(plugin.record_install(entry))
    assert asyncio.run(plugin.list_installed()) == [entry]
    asyncio.run(plugin.record_install({**entry, "appId": 8}))  # upsert by gameId
    assert asyncio.run(plugin.list_installed())[0]["appId"] == 8
    asyncio.run(plugin.remove_install("u1"))
    assert asyncio.run(plugin.list_installed()) == []


def test_remove_appimage_only_inside_own_dir(fake_decky, http_fixture, monkeypatch, tmp_path):
    plugin = load_plugin(fake_decky, http_fixture, monkeypatch)
    outside = tmp_path / "outside.AppImage"
    outside.write_text("x")
    asyncio.run(plugin.remove_appimage(str(outside)))
    assert outside.exists()  # refused: not our directory
    result = asyncio.run(plugin.download_appimage("good", "Doom"))
    path = result["value"]["path"]
    asyncio.run(plugin.remove_appimage(path))
    assert not os.path.exists(path)
```

**Step 4: Run** `pytest tests/backend -q` — expected: FAIL (methods missing).

**Step 5: Implement `main.py` (full replacement)**

```python
import asyncio
import json
import os
import re
import tempfile
import urllib.error
import urllib.request

import decky

CHUNK = 256 * 1024


def _base_url() -> str:
    return os.environ.get("DECKY_GFN_BASE_URL", "https://gfn-game-launcher.pages.dev")


def _slug(title: str) -> str:
    s = re.sub(r"[^A-Za-z0-9]+", "-", title).strip("-").lower()
    return s or "game"


def _appimage_dir() -> str:
    d = os.path.join(decky.DECKY_PLUGIN_RUNTIME_DIR, "appimages")
    os.makedirs(d, exist_ok=True)
    return d


def _installed_path() -> str:
    os.makedirs(decky.DECKY_PLUGIN_SETTINGS_DIR, exist_ok=True)
    return os.path.join(decky.DECKY_PLUGIN_SETTINGS_DIR, "installed.json")


def _read_installed() -> list:
    try:
        with open(_installed_path()) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def _write_installed(entries: list) -> None:
    tmp = _installed_path() + ".tmp"
    with open(tmp, "w") as f:
        json.dump(entries, f, indent=2)
    os.replace(tmp, _installed_path())


def _download(url: str, dest: str, progress) -> None:
    """Stream url to dest atomically; chmod +x. Runs in a worker thread."""
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(dest), suffix=".part")
    try:
        with urllib.request.urlopen(url, timeout=60) as res, os.fdopen(fd, "wb") as out:
            total = int(res.headers.get("Content-Length") or 0) or None
            received = 0
            while True:
                chunk = res.read(CHUNK)
                if not chunk:
                    break
                out.write(chunk)
                received += len(chunk)
                progress(received, total)
        os.chmod(tmp, 0o755)
        os.replace(tmp, dest)
    except BaseException:
        try:
            os.unlink(tmp)
        except FileNotFoundError:
            pass
        raise


class Plugin:
    async def download_appimage(self, cms_id: str, title: str) -> dict:
        dest = os.path.join(_appimage_dir(), f"{_slug(title)}.AppImage")
        url = f"{_base_url()}/api/appimage?cmsId={cms_id}"
        loop = asyncio.get_running_loop()

        def progress(received: int, total):
            asyncio.run_coroutine_threadsafe(
                decky.emit("download_progress", {"cmsId": cms_id, "received": received, "total": total}),
                loop,
            )

        try:
            await asyncio.to_thread(_download, url, dest, progress)
        except urllib.error.HTTPError as err:
            return {"ok": False, "code": "bad-status", "detail": f"HTTP {err.code}"}
        except OSError as err:
            code = "disk-full" if getattr(err, "errno", None) == 28 else "network"
            return {"ok": False, "code": code, "detail": str(err)}
        return {"ok": True, "value": {"path": dest}}

    async def remove_appimage(self, path: str) -> dict:
        # Only ever delete files inside our own appimages dir.
        if os.path.dirname(os.path.abspath(path)) == _appimage_dir():
            try:
                os.unlink(path)
            except FileNotFoundError:
                pass
        return {"ok": True}

    async def list_installed(self) -> list:
        return _read_installed()

    async def record_install(self, entry: dict) -> dict:
        entries = [e for e in _read_installed() if e.get("gameId") != entry.get("gameId")]
        entries.append(entry)
        _write_installed(entries)
        return {"ok": True}

    async def remove_install(self, game_id: str) -> dict:
        _write_installed([e for e in _read_installed() if e.get("gameId") != game_id])
        return {"ok": True}

    async def _main(self):
        decky.logger.info("decky-gfn backend up")

    async def _unload(self):
        pass
```

Note: `urllib.error.URLError` is an `OSError` subclass, so the second `except` catches connection failures; `HTTPError` must stay first.

**Step 6: Run** `pytest tests/backend -q` — expected: 5 passing.

**Step 7: Commit** — `git add -A && git commit -m "Implement backend: streamed AppImage download, install registry"`

---

### Task 7: Adapters — steam, backend, services context (TDD for steam)

**Files:**
- Create: `src/adapters/steam.ts`, `src/adapters/backend.ts`, `src/services.tsx`
- Test: `tests/adapters/steam.test.ts`

**Step 1: Write failing tests `tests/adapters/steam.test.ts`**

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { addShortcut, removeShortcut } from "../../src/adapters/steam";

afterEach(() => {
  // @ts-expect-error test global
  delete globalThis.SteamClient;
});

function fakeSteam(addResult: unknown) {
  const Apps = {
    AddShortcut: vi.fn(async () => addResult),
    RemoveShortcut: vi.fn(),
    SetCustomArtworkForApp: vi.fn(async () => {}),
  };
  // @ts-expect-error test global
  globalThis.SteamClient = { Apps };
  return Apps;
}

describe("steam adapter", () => {
  it("addShortcut passes title/path/cwd and returns the appId", async () => {
    const Apps = fakeSteam(4242);
    const appId = await addShortcut("CS2", "/data/appimages/cs2.AppImage");
    expect(appId).toBe(4242);
    expect(Apps.AddShortcut).toHaveBeenCalledWith("CS2", "/data/appimages/cs2.AppImage", "/data/appimages", "");
  });

  it("addShortcut throws when Steam returns a non-positive id", async () => {
    fakeSteam(0);
    await expect(addShortcut("CS2", "/x/y.AppImage")).rejects.toThrow(/AddShortcut/);
  });

  it("removeShortcut delegates to SteamClient", () => {
    const Apps = fakeSteam(1);
    removeShortcut(99);
    expect(Apps.RemoveShortcut).toHaveBeenCalledWith(99);
  });
});
```

**Step 2: Run** — expected FAIL. **Then implement `src/adapters/steam.ts`:**

```ts
import { fetchNoCors } from "@decky/api";

interface SteamApps {
  AddShortcut(appName: string, execPath: string, cwd: string, launchOptions: string): Promise<number>;
  RemoveShortcut(appId: number): void;
  SetCustomArtworkForApp(appId: number, base64: string, ext: string, assetType: number): Promise<void>;
}

declare global {
  // Provided by Steam's Gamepad UI at runtime; faked in tests/harness.
  // eslint-disable-next-line no-var
  var SteamClient: { Apps: SteamApps };
}

const ASSET_GRID = 0; // 0 = grid/capsule, 1 = hero, 2 = logo

function dirOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i > 0 ? path.slice(0, i) : "/";
}

export async function addShortcut(title: string, path: string): Promise<number> {
  const appId = await SteamClient.Apps.AddShortcut(title, path, dirOf(path), "");
  if (typeof appId !== "number" || !Number.isInteger(appId) || appId <= 0) {
    throw new Error(`AddShortcut returned ${String(appId)} — Steam API may have changed`);
  }
  return appId;
}

export function removeShortcut(appId: number): void {
  SteamClient.Apps.RemoveShortcut(appId);
}

export async function setArtwork(appId: number, imageUrl: string): Promise<void> {
  const res = await fetchNoCors(imageUrl);
  if (!res.ok) throw new Error(`artwork fetch failed: ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) {
    bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  }
  const ext = imageUrl.split("?")[0].endsWith(".png") ? "png" : "jpg";
  await SteamClient.Apps.SetCustomArtworkForApp(appId, btoa(bin), ext, ASSET_GRID);
}
```

**Step 3: `src/adapters/backend.ts`** (thin — covered indirectly by component tests):

```ts
import { addEventListener, callable, removeEventListener } from "@decky/api";
import type { BackendResult, InstalledGame } from "../core/types";

export const downloadAppimage = callable<[cmsId: string, title: string], BackendResult<{ path: string }>>(
  "download_appimage",
);
export const removeAppimage = callable<[path: string], { ok: boolean }>("remove_appimage");
export const listInstalled = callable<[], InstalledGame[]>("list_installed");
export const recordInstall = callable<[entry: InstalledGame], { ok: boolean }>("record_install");
export const removeInstall = callable<[gameId: string], { ok: boolean }>("remove_install");

export interface DownloadProgress {
  cmsId: string;
  received: number;
  total: number | null;
}

export function onDownloadProgress(cb: (p: DownloadProgress) => void): () => void {
  const handler = (p: DownloadProgress) => cb(p);
  addEventListener("download_progress", handler);
  return () => removeEventListener("download_progress", handler);
}
```

**Step 4: `src/services.tsx`** — the DI seam every component uses:

```tsx
import { createContext, useContext } from "react";
import type { CatalogSource } from "./core/catalog";
import type { InstallPorts, UninstallPorts } from "./core/install";
import type { InstalledGame } from "./core/types";
import type { DownloadProgress } from "./adapters/backend";

export interface Services {
  catalog: CatalogSource;
  install: InstallPorts;
  uninstall: UninstallPorts;
  listInstalled(): Promise<InstalledGame[]>;
  onDownloadProgress(cb: (p: DownloadProgress) => void): () => void;
  openCatalog(): void;
  navigateToApp(appId: number): void;
  toast(title: string, body: string): void;
}

const Ctx = createContext<Services | null>(null);
export const ServicesProvider = Ctx.Provider;

export function useServices(): Services {
  const s = useContext(Ctx);
  if (!s) throw new Error("ServicesProvider missing");
  return s;
}
```

**Step 5: Run** `pnpm test && pnpm typecheck` — expected: all green.

**Step 6: Commit** — `git add -A && git commit -m "Add steam/backend adapters and Services context"`

---

### Task 8: QAM panel component (TDD)

**Files:**
- Create: `src/components/QamPanel.tsx`, `tests/helpers/fakeServices.tsx`
- Test: `tests/components/QamPanel.test.tsx`

**Step 1: `tests/helpers/fakeServices.tsx`** — reusable fake Services + render helper:

```tsx
import { render } from "@testing-library/react";
import { vi } from "vitest";
import type { ReactElement } from "react";
import { ServicesProvider, type Services } from "../../src/services";
import type { InstalledGame } from "../../src/core/types";

export function makeFakeServices(overrides: Partial<Services> = {}): Services {
  return {
    catalog: { getPage: vi.fn(async () => ({ total: 0, page: 1, pageSize: 50, games: [] })) },
    install: {
      download: vi.fn(async () => ({ ok: true as const, value: { path: "/data/x.AppImage" } })),
      addShortcut: vi.fn(async () => 111),
      setArtwork: vi.fn(async () => {}),
      removeFile: vi.fn(async () => {}),
      recordInstall: vi.fn(async () => {}),
    },
    uninstall: {
      removeShortcut: vi.fn(async () => {}),
      removeFile: vi.fn(async () => {}),
      removeRecord: vi.fn(async () => {}),
    },
    listInstalled: vi.fn(async (): Promise<InstalledGame[]> => []),
    onDownloadProgress: vi.fn(() => () => {}),
    openCatalog: vi.fn(),
    navigateToApp: vi.fn(),
    toast: vi.fn(),
    ...overrides,
  };
}

export function renderWithServices(ui: ReactElement, services: Services) {
  return render(<ServicesProvider value={services}>{ui}</ServicesProvider>);
}
```

**Step 2: Write failing tests `tests/components/QamPanel.test.tsx`**

```tsx
import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QamPanel } from "../../src/components/QamPanel";
import { makeFakeServices, renderWithServices } from "../helpers/fakeServices";

describe("QamPanel", () => {
  it("opens the catalog page", async () => {
    const services = makeFakeServices();
    renderWithServices(<QamPanel />, services);
    await userEvent.click(screen.getByRole("button", { name: /browse catalog/i }));
    expect(services.openCatalog).toHaveBeenCalled();
  });

  it("lists installed games and navigates to them", async () => {
    const services = makeFakeServices({
      listInstalled: vi.fn(async () => [
        { gameId: "u1", title: "CS2", appId: 7, path: "/x", cmsId: "1", store: "STEAM" },
      ]),
    });
    renderWithServices(<QamPanel />, services);
    const item = await screen.findByRole("button", { name: /CS2/ });
    await userEvent.click(item);
    expect(services.navigateToApp).toHaveBeenCalledWith(7);
  });
});
```

**Step 3: Run** — FAIL. **Then implement `src/components/QamPanel.tsx`:**

```tsx
import { ButtonItem, PanelSection, PanelSectionRow } from "@decky/ui";
import { useEffect, useState } from "react";
import { useServices } from "../services";
import type { InstalledGame } from "../core/types";

export function QamPanel() {
  const services = useServices();
  const [installed, setInstalled] = useState<InstalledGame[]>([]);

  useEffect(() => {
    let cancelled = false;
    services.listInstalled().then((list) => {
      if (!cancelled) setInstalled(list);
    });
    return () => {
      cancelled = true;
    };
  }, [services]);

  return (
    <>
      <PanelSection>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => services.openCatalog()}>
            Browse catalog
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>
      {installed.length > 0 && (
        <PanelSection title="Installed">
          {installed.map((g) => (
            <PanelSectionRow key={g.gameId}>
              <ButtonItem layout="below" onClick={() => services.navigateToApp(g.appId)}>
                {g.title}
              </ButtonItem>
            </PanelSectionRow>
          ))}
        </PanelSection>
      )}
    </>
  );
}
```

**Step 4: Run** `pnpm test` — green. **Step 5: Commit** — `git add -A && git commit -m "Add QAM panel: browse entry + installed list"`

---

### Task 9: Catalog page + game tiles (TDD)

**Files:**
- Create: `src/components/useDebounced.ts`, `src/components/GameTile.tsx`, `src/components/CatalogPage.tsx`
- Test: `tests/components/CatalogPage.test.tsx`

**Step 1: Write failing tests `tests/components/CatalogPage.test.tsx`**

```tsx
import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CatalogPage } from "../../src/components/CatalogPage";
import { makeFakeServices, renderWithServices } from "../helpers/fakeServices";
import type { CatalogPageData } from "../../src/core/types";

const PAGE: CatalogPageData = {
  total: 2,
  page: 1,
  pageSize: 50,
  games: [
    { gameId: "u1", title: "Counter-Strike 2", imageUrl: "https://img/cs2.jpg", variants: [{ cmsId: "1", store: "STEAM" }] },
    { gameId: "u2", title: "Cyberpunk 2077", imageUrl: "https://img/cp.jpg", variants: [{ cmsId: "2", store: "GOG" }] },
  ],
};

describe("CatalogPage", () => {
  it("renders tiles from the catalog", async () => {
    const services = makeFakeServices({ catalog: { getPage: vi.fn(async () => PAGE) } });
    renderWithServices(<CatalogPage />, services);
    expect(await screen.findByText("Counter-Strike 2")).toBeInTheDocument();
    expect(screen.getByText("Cyberpunk 2077")).toBeInTheDocument();
  });

  it("debounces search and queries with q", async () => {
    const getPage = vi.fn(async () => PAGE);
    const services = makeFakeServices({ catalog: { getPage } });
    renderWithServices(<CatalogPage />, services);
    await screen.findByText("Counter-Strike 2");
    await userEvent.type(screen.getByRole("textbox"), "cyber");
    await waitFor(() => expect(getPage).toHaveBeenCalledWith(expect.objectContaining({ q: "cyber" })), {
      timeout: 2000,
    });
    // typing 5 chars must NOT produce 5 queries
    const qCalls = getPage.mock.calls.filter(([opts]) => (opts as any)?.q);
    expect(qCalls.length).toBeLessThan(5);
  });

  it("shows an error with retry when the catalog fails", async () => {
    const getPage = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(PAGE);
    const services = makeFakeServices({ catalog: { getPage } });
    renderWithServices(<CatalogPage />, services);
    await screen.findByText(/couldn't load/i);
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(await screen.findByText("Counter-Strike 2")).toBeInTheDocument();
  });

  it("opens the detail view when a tile is activated", async () => {
    const services = makeFakeServices({ catalog: { getPage: vi.fn(async () => PAGE) } });
    renderWithServices(<CatalogPage />, services);
    await userEvent.click(await screen.findByText("Counter-Strike 2"));
    expect(await screen.findByRole("button", { name: /install/i })).toBeInTheDocument();
  });
});
```

**Step 2: Run** — FAIL. **Then implement:**

`src/components/useDebounced.ts`:

```ts
import { useEffect, useState } from "react";

export function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}
```

`src/components/GameTile.tsx`:

```tsx
import { Focusable } from "@decky/ui";
import type { CatalogGame } from "../core/types";

const tileStyle: React.CSSProperties = {
  width: 220,
  height: 100,
  borderRadius: 6,
  overflow: "hidden",
  position: "relative",
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundColor: "#1a2233",
};

const labelStyle: React.CSSProperties = {
  position: "absolute",
  insetInline: 0,
  bottom: 0,
  padding: "4px 8px",
  background: "linear-gradient(transparent, rgba(0,0,0,0.85))",
  fontSize: 13,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

export function GameTile({ game, onOpen }: { game: CatalogGame; onOpen(game: CatalogGame): void }) {
  return (
    <Focusable
      style={{ ...tileStyle, backgroundImage: game.imageUrl ? `url(${game.imageUrl})` : undefined }}
      onActivate={() => onOpen(game)}
    >
      <div style={labelStyle}>{game.title}</div>
    </Focusable>
  );
}
```

`src/components/CatalogPage.tsx`:

```tsx
import { DialogButton, Focusable, SteamSpinner, TextField } from "@decky/ui";
import { useCallback, useEffect, useState } from "react";
import { useServices } from "../services";
import { useDebounced } from "./useDebounced";
import { GameTile } from "./GameTile";
import { GameDetail } from "./GameDetail";
import type { CatalogGame, CatalogPageData } from "../core/types";

const gridStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  padding: "12px 0",
};

export function CatalogPage() {
  const services = useServices();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query, 300);
  const [data, setData] = useState<CatalogPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CatalogGame | null>(null);
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(() => setAttempt((a) => a + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    services.catalog
      .getPage({ q: debouncedQuery || undefined })
      .then((page) => {
        if (!cancelled) setData(page);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [services, debouncedQuery, attempt]);

  if (selected) {
    return <GameDetail game={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div style={{ padding: "40px 24px 24px" }}>
      <TextField
        label="Search"
        value={query}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
      />
      {loading && <SteamSpinner />}
      {error && !loading && (
        <Focusable style={{ padding: 16 }}>
          <div>Couldn't load the catalog.</div>
          <DialogButton onClick={load}>Retry</DialogButton>
        </Focusable>
      )}
      {data && !loading && !error && (
        <Focusable style={gridStyle} flow-children="grid">
          {data.games.map((game) => (
            <GameTile key={game.gameId} game={game} onOpen={setSelected} />
          ))}
        </Focusable>
      )}
    </div>
  );
}
```

Note: `GameDetail` doesn't exist yet — create a placeholder so this task compiles, replaced in Task 10:

`src/components/GameDetail.tsx` (placeholder):

```tsx
import { DialogButton } from "@decky/ui";
import type { CatalogGame } from "../core/types";

export function GameDetail({ game, onBack }: { game: CatalogGame; onBack(): void }) {
  return (
    <div>
      <h2>{game.title}</h2>
      <DialogButton onClick={() => {}}>Install</DialogButton>
      <DialogButton onClick={onBack}>Back</DialogButton>
    </div>
  );
}
```

**Step 3: Run** `pnpm test` — green. **Step 4: Commit** — `git add -A && git commit -m "Add catalog page: debounced search, tile grid, error retry"`

---

### Task 10: Game detail + install flow (TDD)

**Files:**
- Create: `src/components/useInstall.ts`
- Modify: `src/components/GameDetail.tsx` (replace placeholder)
- Test: `tests/components/GameDetail.test.tsx`

**Step 1: Write failing tests `tests/components/GameDetail.test.tsx`**

```tsx
import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GameDetail } from "../../src/components/GameDetail";
import { makeFakeServices, renderWithServices } from "../helpers/fakeServices";
import type { CatalogGame } from "../../src/core/types";

const GAME: CatalogGame = {
  gameId: "u2",
  title: "Cyberpunk 2077",
  imageUrl: "https://img/banner.jpg",
  heroUrl: "https://img/hero.jpg",
  variants: [
    { cmsId: "100838211", store: "GOG" },
    { cmsId: "100444811", store: "STEAM" },
  ],
};

describe("GameDetail", () => {
  it("installs the selected variant and flips to Play", async () => {
    const services = makeFakeServices();
    renderWithServices(<GameDetail game={GAME} onBack={() => {}} />, services);
    // pick the STEAM variant
    await userEvent.selectOptions(screen.getByRole("combobox"), "100444811");
    await userEvent.click(screen.getByRole("button", { name: /install/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /play/i })).toBeInTheDocument());
    expect(services.install.download).toHaveBeenCalledWith("100444811", "Cyberpunk 2077");
    expect(services.toast).toHaveBeenCalled();
  });

  it("shows the error and keeps Install on failure", async () => {
    const services = makeFakeServices();
    services.install.download = vi.fn(async () => ({ ok: false as const, code: "network" as const }));
    renderWithServices(<GameDetail game={GAME} onBack={() => {}} />, services);
    await userEvent.click(screen.getByRole("button", { name: /install/i }));
    expect(await screen.findByText(/failed/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /install/i })).toBeInTheDocument();
  });

  it("shows Play/Uninstall when already installed, and uninstalls", async () => {
    const services = makeFakeServices({
      listInstalled: vi.fn(async () => [
        { gameId: "u2", title: "Cyberpunk 2077", appId: 55, path: "/x.AppImage", cmsId: "100838211", store: "GOG" },
      ]),
    });
    renderWithServices(<GameDetail game={GAME} onBack={() => {}} />, services);
    const play = await screen.findByRole("button", { name: /play/i });
    await userEvent.click(play);
    expect(services.navigateToApp).toHaveBeenCalledWith(55);
    await userEvent.click(screen.getByRole("button", { name: /uninstall/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /install/i })).toBeInTheDocument());
    expect(services.uninstall.removeShortcut).toHaveBeenCalledWith(55);
  });
});
```

**Step 2: Run** — FAIL. **Then implement:**

`src/components/useInstall.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from "react";
import { installGame, uninstallGame } from "../core/install";
import { useServices } from "../services";
import type { CatalogGame, InstalledGame, Variant } from "../core/types";

export type InstallUiState =
  | { phase: "loading" }
  | { phase: "idle" }
  | { phase: "downloading"; fraction: number | null }
  | { phase: "adding" }
  | { phase: "installed"; installed: InstalledGame }
  | { phase: "error"; message: string };

export function useInstall(game: CatalogGame) {
  const services = useServices();
  const [state, setState] = useState<InstallUiState>({ phase: "loading" });
  const cmsIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    services.listInstalled().then((list) => {
      if (cancelled) return;
      const installed = list.find((g) => g.gameId === game.gameId);
      setState(installed ? { phase: "installed", installed } : { phase: "idle" });
    });
    return () => {
      cancelled = true;
    };
  }, [services, game.gameId]);

  useEffect(
    () =>
      services.onDownloadProgress((p) => {
        if (p.cmsId !== cmsIdRef.current) return;
        setState((s) =>
          s.phase === "downloading"
            ? { phase: "downloading", fraction: p.total ? p.received / p.total : null }
            : s,
        );
      }),
    [services],
  );

  const start = useCallback(
    async (variant: Variant) => {
      cmsIdRef.current = variant.cmsId;
      setState({ phase: "downloading", fraction: null });
      const out = await installGame(services.install, game, variant, (phase) => {
        if (phase === "adding") setState({ phase: "adding" });
      });
      if (out.ok) {
        const installed: InstalledGame = {
          gameId: game.gameId,
          title: game.title,
          appId: out.appId,
          path: "",
          cmsId: variant.cmsId,
          store: variant.store,
        };
        // Re-read from the registry so `path` is authoritative.
        const list = await services.listInstalled();
        const entry = list.find((g) => g.gameId === game.gameId) ?? installed;
        setState({ phase: "installed", installed: entry });
        services.toast(game.title, "Added to your Steam library");
      } else {
        setState({ phase: "error", message: `Install failed (${out.code}${out.detail ? `: ${out.detail}` : ""})` });
      }
    },
    [services, game],
  );

  const uninstall = useCallback(async () => {
    if (state.phase !== "installed") return;
    await uninstallGame(services.uninstall, state.installed);
    setState({ phase: "idle" });
    services.toast(game.title, "Removed from your Steam library");
  }, [services, game, state]);

  return { state, start, uninstall };
}
```

`src/components/GameDetail.tsx` (full replacement):

```tsx
import { DialogButton, Dropdown, Focusable, ProgressBarWithInfo, staticClasses } from "@decky/ui";
import { useState } from "react";
import { useServices } from "../services";
import { useInstall } from "./useInstall";
import type { CatalogGame } from "../core/types";

const STORE_LABELS: Record<string, string> = {
  STEAM: "Steam", EPIC: "Epic Games", GOG: "GOG", UBISOFT: "Ubisoft", EA_APP: "EA App",
};

function storeLabel(store: string): string {
  return STORE_LABELS[store] ?? store;
}

export function GameDetail({ game, onBack }: { game: CatalogGame; onBack(): void }) {
  const services = useServices();
  const { state, start, uninstall } = useInstall(game);
  const [variant, setVariant] = useState(game.variants[0]);

  return (
    <Focusable onCancel={onBack} style={{ padding: "40px 24px 24px" }}>
      {game.heroUrl && (
        <div
          style={{
            height: 180, borderRadius: 8, backgroundImage: `url(${game.heroUrl})`,
            backgroundSize: "cover", backgroundPosition: "center", marginBottom: 16,
          }}
        />
      )}
      <div className={staticClasses.Title}>{game.title}</div>
      <div style={{ margin: "8px 0", opacity: 0.7 }}>
        {game.variants.map((v) => storeLabel(v.store)).join(" · ")}
      </div>

      {game.variants.length > 1 && state.phase === "idle" && (
        <Dropdown
          rgOptions={game.variants.map((v) => ({ data: v.cmsId, label: storeLabel(v.store) }))}
          selectedOption={variant.cmsId}
          onChange={(opt: { data: string }) => {
            const next = game.variants.find((v) => v.cmsId === opt.data);
            if (next) setVariant(next);
          }}
        />
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        {state.phase === "idle" && (
          <DialogButton onClick={() => start(variant)}>Install</DialogButton>
        )}
        {state.phase === "downloading" && (
          <ProgressBarWithInfo
            nProgress={state.fraction != null ? state.fraction * 100 : undefined}
            sOperationText="Downloading…"
          />
        )}
        {state.phase === "adding" && <ProgressBarWithInfo sOperationText="Adding to Steam…" />}
        {state.phase === "installed" && (
          <>
            <DialogButton onClick={() => services.navigateToApp(state.installed.appId)}>Play</DialogButton>
            <DialogButton onClick={uninstall}>Uninstall</DialogButton>
          </>
        )}
        {state.phase === "error" && (
          <>
            <div style={{ color: "#ff6b6b" }}>{state.message}</div>
            <DialogButton onClick={() => start(variant)}>Install</DialogButton>
          </>
        )}
        <DialogButton onClick={onBack}>Back</DialogButton>
      </div>
    </Focusable>
  );
}
```

Wait — the error-state test expects an Install button while the error message shows; the code above renders both. Good.

**Step 3: Run** `pnpm test` — green. **Step 4: Commit** — `git add -A && git commit -m "Add game detail with variant picker and install/uninstall flow"`

---

### Task 11: Wire `index.tsx` — real services, route, QAM

**Files:**
- Create: `src/services.real.ts`
- Modify: `src/index.tsx`

**Step 1: `src/services.real.ts`**

```ts
import { Navigation } from "@decky/ui";
import { fetchNoCors, toaster } from "@decky/api";
import { CatalogClient } from "./core/catalog";
import { DEFAULT_BASE_URL } from "./core/config";
import type { Services } from "./services";
import * as steam from "./adapters/steam";
import * as backend from "./adapters/backend";

export function makeRealServices(): Services {
  return {
    catalog: new CatalogClient(DEFAULT_BASE_URL, (url) => fetchNoCors(url)),
    install: {
      download: (cmsId, title) => backend.downloadAppimage(cmsId, title),
      addShortcut: steam.addShortcut,
      setArtwork: steam.setArtwork,
      removeFile: async (path) => {
        await backend.removeAppimage(path);
      },
      recordInstall: async (entry) => {
        await backend.recordInstall(entry);
      },
    },
    uninstall: {
      removeShortcut: async (appId) => steam.removeShortcut(appId),
      removeFile: async (path) => {
        await backend.removeAppimage(path);
      },
      removeRecord: async (gameId) => {
        await backend.removeInstall(gameId);
      },
    },
    listInstalled: () => backend.listInstalled(),
    onDownloadProgress: backend.onDownloadProgress,
    openCatalog() {
      Navigation.Navigate("/gfn-catalog");
      Navigation.CloseSideMenus();
    },
    navigateToApp(appId) {
      Navigation.Navigate(`/library/app/${appId}`);
      Navigation.CloseSideMenus();
    },
    toast(title, body) {
      toaster.toast({ title, body });
    },
  };
}
```

**Step 2: `src/index.tsx` (full replacement)**

```tsx
import { staticClasses } from "@decky/ui";
import { definePlugin, routerHook } from "@decky/api";
import { SiNvidia } from "react-icons/si";
import { QamPanel } from "./components/QamPanel";
import { CatalogPage } from "./components/CatalogPage";
import { ServicesProvider } from "./services";
import { makeRealServices } from "./services.real";

export default definePlugin(() => {
  const services = makeRealServices();

  routerHook.addRoute(
    "/gfn-catalog",
    () => (
      <ServicesProvider value={services}>
        <CatalogPage />
      </ServicesProvider>
    ),
    { exact: true },
  );

  return {
    name: "GeForce NOW",
    titleView: <div className={staticClasses.Title}>GeForce NOW</div>,
    content: (
      <ServicesProvider value={services}>
        <QamPanel />
      </ServicesProvider>
    ),
    icon: <SiNvidia />,
    onDismount() {
      routerHook.removeRoute("/gfn-catalog");
    },
  };
});
```

**Step 3: Run** `pnpm typecheck && pnpm build && pnpm test` — expected: dist/index.js builds, all tests green.

**Step 4: Commit** — `git add -A && git commit -m "Wire plugin entry: real services, /gfn-catalog route, QAM panel"`

---

### Task 12: Packaging script

**Files:**
- Create: `scripts/package.sh`, `README.md`

**Step 1: `scripts/package.sh`**

```sh
#!/usr/bin/env sh
# Assemble the Decky sideload zip: decky-gfn/{plugin.json,package.json,main.py,dist/index.js,...}
set -eu
cd "$(dirname "$0")/.."
rm -rf build/decky-gfn decky-gfn.zip
mkdir -p build/decky-gfn/dist
cp plugin.json package.json main.py LICENSE README.md build/decky-gfn/
cp dist/index.js build/decky-gfn/dist/
cd build && python3 -m zipfile -c ../decky-gfn.zip decky-gfn
echo "wrote decky-gfn.zip"
```

Run: `chmod +x scripts/package.sh`

**Step 2: `README.md`** — short: what it is, `pnpm install/build/test`, `pnpm mock:catalog` + `pnpm harness` for local dev, `pnpm package` for the sideload zip, deploy-to-Deck instructions (Decky → Developer → Install from ZIP; or rsync the `build/decky-gfn` folder to `~/homebrew/plugins/`), and the macOS↔Linux `node_modules` caveat (delete `node_modules` when switching sides).

**Step 3: Verify** — `pnpm build && pnpm package && python3 -m zipfile -l decky-gfn.zip` — expected listing shows `decky-gfn/plugin.json`, `decky-gfn/dist/index.js`, `decky-gfn/main.py`.

**Step 4: Commit** — `git add -A && git commit -m "Add sideload packaging script and README"`

---

### Task 13: Browser harness

**Files:**
- Create: `harness/vite.config.ts`, `harness/index.html`, `harness/main.tsx`

**Step 1: `harness/vite.config.ts`**

```ts
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
```

**Step 2: `harness/index.html`**

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>decky-gfn harness</title>
    <style>
      body { margin: 0; background: #0e141b; color: #dcdedf; font-family: sans-serif; display: flex; }
      #qam { width: 300px; min-height: 100vh; background: #171d25; padding: 12px; box-sizing: border-box; }
      #page { flex: 1; padding: 12px; }
      #steam-log { position: fixed; bottom: 0; right: 0; width: 420px; max-height: 180px; overflow: auto;
                   background: #000a; font: 11px monospace; padding: 8px; }
      button { cursor: pointer; }
    </style>
  </head>
  <body>
    <div id="qam"></div>
    <div id="page"></div>
    <pre id="steam-log"></pre>
    <script type="module" src="/main.tsx"></script>
  </body>
</html>
```

**Step 3: `harness/main.tsx`** — mock Services wired to the mock server; fake SteamClient that logs on screen:

```tsx
import { createRoot } from "react-dom/client";
import { CatalogClient } from "../src/core/catalog";
import type { Services } from "../src/services";
import { ServicesProvider } from "../src/services";
import { QamPanel } from "../src/components/QamPanel";
import { CatalogPage } from "../src/components/CatalogPage";
import type { InstalledGame } from "../src/core/types";
import type { DownloadProgress } from "../src/adapters/backend";

const CATALOG_BASE = "http://localhost:8787";

const logEl = document.getElementById("steam-log")!;
function steamLog(line: string) {
  logEl.textContent += `${line}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

const installed = new Map<string, InstalledGame>(
  JSON.parse(localStorage.getItem("installed") ?? "[]").map((g: InstalledGame) => [g.gameId, g]),
);
function persist() {
  localStorage.setItem("installed", JSON.stringify([...installed.values()]));
}

const progressListeners = new Set<(p: DownloadProgress) => void>();
let nextAppId = 1000;

const services: Services = {
  catalog: new CatalogClient(CATALOG_BASE, (url) => fetch(url)),
  install: {
    async download(cmsId, title) {
      const res = await fetch(`${CATALOG_BASE}/api/appimage?cmsId=${cmsId}`);
      if (!res.ok) return { ok: false, code: "bad-status", detail: `HTTP ${res.status}` };
      const total = Number(res.headers.get("content-length")) || 65536;
      for (let received = 0; received <= total; received += total / 4) {
        await new Promise((r) => setTimeout(r, 150));
        progressListeners.forEach((cb) => cb({ cmsId, received: Math.min(received, total), total }));
      }
      await res.arrayBuffer();
      const path = `/home/deck/homebrew/data/decky-gfn/appimages/${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.AppImage`;
      steamLog(`backend: downloaded ${path}`);
      return { ok: true, value: { path } };
    },
    async addShortcut(title, path) {
      const appId = nextAppId++;
      steamLog(`SteamClient.Apps.AddShortcut("${title}", "${path}") -> ${appId}`);
      return appId;
    },
    async setArtwork(appId, imageUrl) {
      steamLog(`SteamClient.Apps.SetCustomArtworkForApp(${appId}, ${imageUrl.slice(0, 60)}…)`);
    },
    async removeFile(path) {
      steamLog(`backend: rm ${path}`);
    },
    async recordInstall(entry) {
      installed.set(entry.gameId, entry);
      persist();
    },
  },
  uninstall: {
    async removeShortcut(appId) {
      steamLog(`SteamClient.Apps.RemoveShortcut(${appId})`);
    },
    async removeFile(path) {
      steamLog(`backend: rm ${path}`);
    },
    async removeRecord(gameId) {
      installed.delete(gameId);
      persist();
    },
  },
  async listInstalled() {
    return [...installed.values()];
  },
  onDownloadProgress(cb) {
    progressListeners.add(cb);
    return () => progressListeners.delete(cb);
  },
  openCatalog() {
    steamLog("Navigation.Navigate(/gfn-catalog)");
  },
  navigateToApp(appId) {
    steamLog(`Navigation.Navigate(/library/app/${appId})`);
  },
  toast(title, body) {
    steamLog(`toast: ${title} — ${body}`);
  },
};

createRoot(document.getElementById("qam")!).render(
  <ServicesProvider value={services}>
    <QamPanel />
  </ServicesProvider>,
);
createRoot(document.getElementById("page")!).render(
  <ServicesProvider value={services}>
    <CatalogPage />
  </ServicesProvider>,
);
```

**Step 4: Manual check** — terminal 1: `pnpm mock:catalog`; terminal 2: `pnpm harness`; open `http://localhost:5173`: search, open a game, Install → progress → Play, steam log shows AddShortcut, QAM panel lists the game after reload.

**Step 5: Commit** — `git add -A && git commit -m "Add browser harness: full plugin UI against mock catalog + fake Steam"`

---

### Task 14: Playwright smoke test

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/install-flow.spec.ts`

**Step 1: `playwright.config.ts`**

```ts
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
```

Also exclude e2e specs from Vitest — in `vitest.config.ts` add `exclude: ["tests/e2e/**", "node_modules/**"]` under `test`.

**Step 2: `tests/e2e/install-flow.spec.ts`**

```ts
import { expect, test } from "@playwright/test";

test("browse → search → install → play", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.getByRole("textbox").fill("counter");
  await page.getByText("Counter-Strike 2").click();

  await page.getByRole("button", { name: /install/i }).click();
  await expect(page.getByRole("button", { name: /play/i })).toBeVisible({ timeout: 10_000 });

  const log = page.locator("#steam-log");
  await expect(log).toContainText("AddShortcut");
  await expect(log).toContainText("counter-strike-2.AppImage");
});
```

**Step 3: Run** — `npx playwright install chromium` (first time), then `pnpm test:e2e` — expected: 1 passing.

**Step 4: Commit** — `git add -A && git commit -m "Add Playwright smoke test for the install flow"`

---

### Task 15: CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

**Step 1: Write the workflow**

```yaml
name: ci
on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm build
      - run: pnpm test
      - run: ./scripts/package.sh
      - uses: actions/upload-artifact@v4
        with:
          name: decky-gfn-zip
          path: decky-gfn.zip

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: npx playwright install --with-deps chromium
      - run: pnpm test:e2e

  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11" # SteamOS ships 3.11-era python
      - run: pip install -r requirements-dev.txt
      - run: pytest -q
```

**Step 2: Validate locally** — run the same commands the workflow runs: `pnpm typecheck && pnpm build && pnpm test && ./scripts/package.sh && pytest -q`. All green.

**Step 3: Commit** — `git add -A && git commit -m "Add CI: typecheck, build, unit + e2e + backend tests, zip artifact"`

---

### Task 16: Follow-ups (record, don't build)

1. Create Linear ticket in the gfn-game-launcher project: **`/api/catalog` endpoint** implementing the contract in this plan (projection of `library.json`, `q`/`page`/`pageSize`, CORS `*`). Until it ships, point `DEFAULT_BASE_URL` consumers at the mock for demos.
2. Create Linear ticket: **Decky plugin on-device beta** — sideload `decky-gfn.zip` on the Deck, verify AddShortcut/artwork against real Steam, capture any `AddShortcut` signature deviations in `adapters/steam.ts`.
3. Later: official Decky store submission (decky-plugin-database PR, needs pnpm lockfile v9 committed — it is, via `pnpm-lock.yaml`).

**Done criteria for the whole plan:** `pnpm typecheck && pnpm build && pnpm test && pnpm test:e2e && pytest -q` all green; `pnpm package` emits a valid sideload zip; harness demo works end-to-end against the mock catalog.
