import { describe, expect, it, vi } from "vitest";
import { reconcileInstalled, type ReconcilePorts } from "../../src/core/reconcile";
import type { InstalledGame } from "../../src/core/types";

const A: InstalledGame = { gameId: "a", title: "A", appId: 1, path: "/data/a.AppImage", cmsId: "10", store: "STEAM" };
const B: InstalledGame = { gameId: "b", title: "B", appId: 2, path: "/data/b.AppImage", cmsId: "20", store: "GOG" };

function makePorts(overrides: Partial<ReconcilePorts> = {}): ReconcilePorts {
  return {
    shortcutExists: vi.fn(() => true),
    fileExists: vi.fn(async () => true),
    removeShortcut: vi.fn(async () => {}),
    removeFile: vi.fn(async () => {}),
    removeRecord: vi.fn(async () => {}),
    ...overrides,
  };
}

describe("reconcileInstalled", () => {
  it("keeps healthy entries untouched", async () => {
    const ports = makePorts();
    const out = await reconcileInstalled(ports, [A, B]);
    expect(out).toEqual([A, B]);
    expect(ports.removeRecord).not.toHaveBeenCalled();
  });

  it("prunes record + leftover file when the shortcut was removed in Steam", async () => {
    const ports = makePorts({ shortcutExists: vi.fn((appId: number) => appId !== 1) });
    const out = await reconcileInstalled(ports, [A, B]);
    expect(out).toEqual([B]);
    expect(ports.removeFile).toHaveBeenCalledWith("/data/a.AppImage");
    expect(ports.removeRecord).toHaveBeenCalledWith("a");
    expect(ports.removeShortcut).not.toHaveBeenCalled();
  });

  it("removes the dead shortcut + record when the AppImage was deleted manually", async () => {
    const ports = makePorts({ fileExists: vi.fn(async (path: string) => path !== "/data/b.AppImage") });
    const out = await reconcileInstalled(ports, [A, B]);
    expect(out).toEqual([A]);
    expect(ports.removeShortcut).toHaveBeenCalledWith(2);
    expect(ports.removeRecord).toHaveBeenCalledWith("b");
  });

  it("survives a throwing port and keeps the entry (fail-open)", async () => {
    const ports = makePorts({ fileExists: vi.fn(async () => { throw new Error("backend down"); }) });
    const out = await reconcileInstalled(ports, [A]);
    expect(out).toEqual([A]);
    expect(ports.removeRecord).not.toHaveBeenCalled();
  });
});
