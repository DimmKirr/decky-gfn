import { fetchNoCors } from "@decky/api";

interface SteamApps {
  AddShortcut(appName: string, execPath: string, cwd: string, launchOptions: string): Promise<number>;
  RemoveShortcut(appId: number): void;
  SetCustomArtworkForApp(appId: number, base64: string, ext: string, assetType: number): Promise<void>;
  SetShortcutName(appId: number, name: string): void;
  SetShortcutLaunchOptions(appId: number, options: string): void;
  SetShortcutSortAs(appId: number, sortAs: string): void;
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
const ASSET_HERO = 1;

function dirOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i > 0 ? path.slice(0, i) : "/";
}

/** Sort key: trademark glyphs dropped, leading article stripped ("The Witcher 3" sorts at W). */
export function sortAsFor(title: string): string {
  const clean = title.replace(/[®™]/g, "").replace(/\s{2,}/g, " ").trim();
  return clean.replace(/^(the|a|an)\s+/i, "");
}

export async function addShortcut(title: string, path: string): Promise<number> {
  const appId = await steamApps().AddShortcut(title, path, dirOf(path), LAUNCH_OPTIONS);
  if (typeof appId !== "number" || !Number.isInteger(appId) || appId <= 0) {
    throw new Error(`AddShortcut returned ${String(appId)} — Steam API may have changed`);
  }
  // Verified on-device: AddShortcut names the shortcut after the exe file and
  // ignores the appName/launchOptions arguments — set everything explicitly.
  applyShortcutMeta(appId, title);
  return appId;
}

/** Name, launch options, and sort key — safe to re-apply to existing shortcuts. */
export function applyShortcutMeta(appId: number, title: string): void {
  const apps = steamApps();
  apps.SetShortcutName(appId, title);
  apps.SetShortcutLaunchOptions(appId, LAUNCH_OPTIONS);
  apps.SetShortcutSortAs(appId, sortAsFor(title));
}

export function removeShortcut(appId: number): void {
  steamApps().RemoveShortcut(appId);
}

// Steam's global appStore knows every app in the library, shortcuts included.
export function shortcutExists(appId: number): boolean {
  const store = (globalThis as unknown as { appStore?: { GetAppOverviewByAppID?(id: number): unknown } })
    .appStore;
  if (!store?.GetAppOverviewByAppID) return true; // can't verify — assume alive
  return !!store.GetAppOverviewByAppID(appId);
}

function toBase64(buf: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) {
    bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

/**
 * Draw a small "GFN" corner badge onto the banner so decky-installed games are
 * recognizable in the library grid. Returns null when canvas/decode isn't
 * available (jsdom, harness) — caller falls back to the raw image.
 */
async function compositeGfnBadge(bytes: Uint8Array): Promise<string | null> {
  try {
    if (typeof createImageBitmap !== "function") return null;
    const bitmap = await createImageBitmap(new Blob([bytes as unknown as BlobPart]));
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0);

    const pad = Math.round(bitmap.width * 0.02);
    const h = Math.max(18, Math.round(bitmap.height * 0.09));
    const w = Math.round(h * 2.2);
    const x = bitmap.width - w - pad;
    const y = bitmap.height - h - pad;

    ctx.beginPath();
    ctx.roundRect(x, y, w, h, Math.round(h / 4));
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fill();
    ctx.fillStyle = "#76b900"; // NVIDIA green
    ctx.font = `bold ${Math.round(h * 0.55)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("GFN", x + w / 2, y + h / 2 + 1);

    return canvas.toDataURL("image/jpeg", 0.92).split(",")[1] ?? null;
  } catch {
    return null;
  }
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetchNoCors(url);
  if (!res.ok) throw new Error(`artwork fetch failed: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

function extOf(url: string): string {
  return url.split("?")[0].endsWith(".png") ? "png" : "jpg";
}

export async function setArtwork(appId: number, art: { imageUrl: string; heroUrl?: string }): Promise<void> {
  if (art.heroUrl) {
    try {
      const hero = await fetchBytes(art.heroUrl);
      await steamApps().SetCustomArtworkForApp(appId, toBase64(hero), extOf(art.heroUrl), ASSET_HERO);
    } catch {
      // Hero is a bonus — never block the grid capsule on it.
    }
  }
  const buf = await fetchBytes(art.imageUrl);
  const badged = await compositeGfnBadge(buf);
  const ext = badged ? "jpg" : extOf(art.imageUrl);
  await steamApps().SetCustomArtworkForApp(appId, badged ?? toBase64(buf), ext, ASSET_GRID);
}
