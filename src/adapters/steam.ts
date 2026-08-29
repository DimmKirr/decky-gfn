import { fetchNoCors } from "@decky/api";

interface SteamApps {
  AddShortcut(appName: string, execPath: string, cwd: string, launchOptions: string): Promise<number>;
  RemoveShortcut(appId: number): void;
  SetCustomArtworkForApp(appId: number, base64: string, ext: string, assetType: number): Promise<void>;
}

// SteamClient is provided by Steam's Gamepad UI at runtime (typed loosely by
// @decky/ui's own global declaration); faked in tests/harness.
function steamApps(): SteamApps {
  return (globalThis as unknown as { SteamClient: { Apps: SteamApps } }).SteamClient.Apps;
}

// Steam injects gameoverlayrenderer.so into non-Steam shortcuts; in Desktop Mode
// its libGL dependency doesn't resolve and ld.so kills the process before the
// script runs. Clearing LD_PRELOAD is mandatory (the overlay can't cross the
// flatpak sandbox into GFN anyway).
export const LAUNCH_OPTIONS = "LD_PRELOAD= %command%";

const ASSET_GRID = 0; // 0 = grid/capsule, 1 = hero, 2 = logo

function dirOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i > 0 ? path.slice(0, i) : "/";
}

export async function addShortcut(title: string, path: string): Promise<number> {
  const appId = await steamApps().AddShortcut(title, path, dirOf(path), LAUNCH_OPTIONS);
  if (typeof appId !== "number" || !Number.isInteger(appId) || appId <= 0) {
    throw new Error(`AddShortcut returned ${String(appId)} — Steam API may have changed`);
  }
  return appId;
}

export function removeShortcut(appId: number): void {
  steamApps().RemoveShortcut(appId);
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
  await steamApps().SetCustomArtworkForApp(appId, btoa(bin), ext, ASSET_GRID);
}
