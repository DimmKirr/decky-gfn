import { afterEach, describe, expect, it, vi } from "vitest";
import { addShortcut, removeShortcut, setArtwork, shortcutExists, sortAsFor, LAUNCH_OPTIONS } from "../../src/adapters/steam";

afterEach(() => {
  // @ts-expect-error test global
  delete globalThis.SteamClient;
});

function fakeSteam(addResult: unknown) {
  const Apps = {
    AddShortcut: vi.fn(async () => addResult),
    RemoveShortcut: vi.fn(),
    SetCustomArtworkForApp: vi.fn(async () => {}),
    SetShortcutName: vi.fn(),
    SetShortcutLaunchOptions: vi.fn(),
    SetShortcutSortAs: vi.fn(),
  };
  // @ts-expect-error test global
  globalThis.SteamClient = { Apps };
  return Apps;
}

describe("steam adapter", () => {
  it("addShortcut passes title/path/cwd/launch-options and returns the appId", async () => {
    const Apps = fakeSteam(4242);
    const appId = await addShortcut("CS2", "/data/appimages/cs2.AppImage");
    expect(appId).toBe(4242);
    expect(Apps.AddShortcut).toHaveBeenCalledWith(
      "CS2",
      "/data/appimages/cs2.AppImage",
      "/data/appimages",
      LAUNCH_OPTIONS,
    );
  });

  it("sets name, launch options, and sortAs after creation — Steam ignores the name arg", async () => {
    // Verified on-device 2026-08-30: AddShortcut names the shortcut after the
    // exe file regardless of the appName argument.
    const Apps = fakeSteam(4242);
    await addShortcut("The Witcher® 3: Wild Hunt", "/data/appimages/witcher.AppImage");
    expect(Apps.SetShortcutName).toHaveBeenCalledWith(4242, "The Witcher® 3: Wild Hunt");
    expect(Apps.SetShortcutLaunchOptions).toHaveBeenCalledWith(4242, LAUNCH_OPTIONS);
    expect(Apps.SetShortcutSortAs).toHaveBeenCalledWith(4242, "Witcher 3: Wild Hunt");
  });

  it("sortAsFor strips leading articles and trademark glyphs", () => {
    expect(sortAsFor("The Witcher® 3: Wild Hunt")).toBe("Witcher 3: Wild Hunt");
    expect(sortAsFor("A Plague Tale™")).toBe("Plague Tale");
    expect(sortAsFor("Counter-Strike 2")).toBe("Counter-Strike 2");
  });

  it("launch options neutralize LD_PRELOAD so the overlay lib can't kill the launch", () => {
    // Steam injects gameoverlayrenderer.so into non-Steam shortcuts; in Desktop Mode
    // sessions its libGL dependency doesn't resolve and ld.so kills the process.
    expect(LAUNCH_OPTIONS).toBe("LD_PRELOAD= %command%");
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

  it("setArtwork falls back to the raw image when canvas is unavailable (jsdom)", async () => {
    const Apps = fakeSteam(1);
    const bytes = new Uint8Array([1, 2, 3]);
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, arrayBuffer: async () => bytes.buffer })));
    try {
      await setArtwork(7, { imageUrl: "https://img/banner.jpg" });
    } finally {
      vi.unstubAllGlobals();
    }
    expect(Apps.SetCustomArtworkForApp).toHaveBeenCalledWith(7, btoa("\x01\x02\x03"), "jpg", 0);
  });

  it("shortcutExists reads Steam's appStore, assuming alive when absent", () => {
    expect(shortcutExists(123)).toBe(true); // no appStore global in tests
    // @ts-expect-error test global
    globalThis.appStore = { GetAppOverviewByAppID: (id: number) => (id === 42 ? {} : null) };
    try {
      expect(shortcutExists(42)).toBe(true);
      expect(shortcutExists(43)).toBe(false);
    } finally {
      // @ts-expect-error test global
      delete globalThis.appStore;
    }
  });
});
