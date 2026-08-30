import { chromium, expect, test, type Page } from "@playwright/test";

const CDP_URL = process.env.STEAM_DEV_TOOLS_URL ?? "http://steam.local:8081";

// SharedJSContext is Steam's hidden window where Decky and all plugin frontends live.
async function findSharedJSContext(pages: Page[]): Promise<Page> {
  for (const page of pages) {
    if ((await page.title()) === "SharedJSContext") return page;
  }
  throw new Error(
    `SharedJSContext not found at ${CDP_URL} — is the Deck in Gaming Mode with CEF debugging enabled?`,
  );
}

test("decky-gfn is loaded in the Deck's Gamepad UI", async () => {
  const browser = await chromium.connectOverCDP(CDP_URL);
  try {
    const shared = await findSharedJSContext(browser.contexts().flatMap((c) => c.pages()));

    const steamClientOk = await shared.evaluate(
      () => typeof (globalThis as any).SteamClient?.Apps?.AddShortcut === "function",
    );
    expect(steamClientOk, "SteamClient.Apps.AddShortcut should exist").toBe(true);

    const deckyOk = await shared.evaluate(() => !!(globalThis as any).DeckyPluginLoader);
    expect(deckyOk, "Decky Loader should be injected").toBe(true);

    const pluginNames = await shared.evaluate(() => {
      const loader = (globalThis as any).DeckyPluginLoader;
      const plugins = loader?.plugins ?? loader?.pluginList ?? [];
      return Array.from(plugins, (p: any) => p?.name ?? String(p));
    });
    expect(pluginNames, `loaded plugins: ${JSON.stringify(pluginNames)}`).toContain("GeForce NOW");
  } finally {
    await browser.close();
  }
});

test("catalog API is reachable from the Deck", async () => {
  const browser = await chromium.connectOverCDP(CDP_URL);
  try {
    const shared = await findSharedJSContext(browser.contexts().flatMap((c) => c.pages()));
    const result = await shared.evaluate(async () => {
      const res = await fetch("https://gfn.atd.sh/api/catalog?pageSize=1");
      const body = await res.json();
      return { status: res.status, total: body.total, hasGames: Array.isArray(body.games) };
    });
    expect(result.status).toBe(200);
    expect(result.hasGames).toBe(true);
    expect(result.total).toBeGreaterThan(0);
  } finally {
    await browser.close();
  }
});
