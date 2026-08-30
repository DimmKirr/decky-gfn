import { chromium, expect, test, type Page } from "@playwright/test";

const CDP_URL = process.env.STEAM_DEV_TOOLS_URL ?? "http://steam.local:8081";

async function findPageByTitle(pages: Page[], ...titles: string[]): Promise<Page> {
  for (const page of pages) {
    if (titles.includes(await page.title())) return page;
  }
  throw new Error(`none of ${titles.join("/")} found at ${CDP_URL}`);
}

test("GFN overlay renders on the app page of a decky-installed game", async () => {
  const browser = await chromium.connectOverCDP(CDP_URL);
  try {
    const pages = browser.contexts().flatMap((c) => c.pages());
    const shared = await findPageByTitle(pages, "SharedJSContext");

    const installed = await shared.evaluate(() =>
      (globalThis as any).__DECKY_GFN__?.services.listInstalled(),
    );
    test.skip(!installed?.length, "no decky-installed games — run deck-install first");

    await shared.evaluate(
      (appId) => (globalThis as any).__DECKY_GFN__.services.navigateToApp(appId),
      installed[0].appId,
    );

    // The visible Gamepad UI window ("SP" on some builds, "Steam Big Picture Mode" on others).
    const sp = await findPageByTitle(pages, "SP", "Steam Big Picture Mode");
    const overlay = sp.locator('[data-testid="gfn-overlay"]');
    await expect(overlay).toBeVisible({ timeout: 15_000 });
    await expect(overlay).toContainText("GeForce NOW");
  } finally {
    await browser.close();
  }
});
