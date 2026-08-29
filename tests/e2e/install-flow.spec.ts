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
