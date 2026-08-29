import type { CatalogGame, InstalledGame, Variant, BackendResult } from "./types";

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
