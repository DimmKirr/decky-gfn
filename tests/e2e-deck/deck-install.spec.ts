import { chromium, expect, test, type Page } from "@playwright/test";

const CDP_URL = process.env.STEAM_DEV_TOOLS_URL ?? "http://steam.local:8081";

async function findSharedJSContext(pages: Page[]): Promise<Page> {
  for (const page of pages) {
    if ((await page.title()) === "SharedJSContext") return page;
  }
  throw new Error(
    `SharedJSContext not found at ${CDP_URL} — is the Deck in Gaming Mode with CEF debugging enabled?`,
  );
}

test("open catalog and install Counter-Strike 2 without errors", async () => {
  test.setTimeout(300_000); // real AppImage download over the Deck's wifi

  const browser = await chromium.connectOverCDP(CDP_URL);
  try {
    const shared = await findSharedJSContext(browser.contexts().flatMap((c) => c.pages()));

    const hasSeam = await shared.evaluate(() => !!(globalThis as any).__DECKY_GFN__);
    expect(hasSeam, "window.__DECKY_GFN__ missing — deploy the latest build first").toBe(true);

    // Open our catalog page in the visible UI (also proves the route is registered)
    await shared.evaluate(() => (globalThis as any).__DECKY_GFN__.services.openCatalog());

    // Find CS2 through the real catalog client
    const found = await shared.evaluate(async () => {
      const s = (globalThis as any).__DECKY_GFN__.services;
      const page = await s.catalog.getPage({ q: "counter-strike" });
      const game = page.games.find((g: any) => g.title.startsWith("Counter-Strike 2"));
      if (!game) return null;
      const variant = game.variants.find((v: any) => v.store === "STEAM") ?? game.variants[0];
      return { game, variant };
    });
    expect(found, "Counter-Strike 2 not found in catalog").toBeTruthy();
    const { game, variant } = found!;

    // Clean slate: uninstall a leftover install from a previous run
    await shared.evaluate(async (gameId) => {
      const api = (globalThis as any).__DECKY_GFN__;
      const list = await api.services.listInstalled();
      const existing = list.find((g: any) => g.gameId === gameId);
      if (existing) await api.uninstallGame(existing);
    }, game.gameId);

    // The real install: backend download → chmod → AddShortcut → artwork → registry
    const result = await shared.evaluate(
      ({ game, variant }) => (globalThis as any).__DECKY_GFN__.installGame(game, variant),
      { game, variant },
    );
    expect(result.ok, `install failed: ${JSON.stringify(result)}`).toBe(true);
    expect(result.appId).toBeGreaterThan(0);

    // Registry agrees
    const installed = await shared.evaluate(() =>
      (globalThis as any).__DECKY_GFN__.services.listInstalled(),
    );
    const entry = installed.find((g: any) => g.gameId === game.gameId);
    expect(entry, "installed.json should contain CS2").toBeTruthy();
    expect(entry.appId).toBe(result.appId);
    // Intentionally left installed — check your Steam library for the shortcut.
  } finally {
    await browser.close();
  }
});
