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
    expect(ports.setArtwork).toHaveBeenCalledWith(12345, { imageUrl: GAME.imageUrl, heroUrl: undefined });
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
