import { addEventListener, callable, removeEventListener } from "@decky/api";
import type { BackendResult, InstalledGame } from "../core/types";

export const downloadAppimage = callable<[cmsId: string, title: string], BackendResult<{ path: string }>>(
  "download_appimage",
);
export const removeAppimage = callable<[path: string], { ok: boolean }>("remove_appimage");
export const listInstalled = callable<[], InstalledGame[]>("list_installed");
export const fileExists = callable<[path: string], boolean>("file_exists");
export const cacheImage = callable<[url: string], BackendResult<{ dataUrl: string; path: string }>>(
  "cache_image",
);
export const recordInstall = callable<[entry: InstalledGame], { ok: boolean }>("record_install");
export const removeInstall = callable<[gameId: string], { ok: boolean }>("remove_install");

export interface DownloadProgress {
  cmsId: string;
  received: number;
  total: number | null;
}

export function onDownloadProgress(cb: (p: DownloadProgress) => void): () => void {
  const handler = (p: DownloadProgress) => cb(p);
  addEventListener("download_progress", handler);
  return () => removeEventListener("download_progress", handler);
}
