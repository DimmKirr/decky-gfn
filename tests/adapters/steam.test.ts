import { afterEach, describe, expect, it, vi } from "vitest";
import { addShortcut, removeShortcut, LAUNCH_OPTIONS } from "../../src/adapters/steam";

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
});
