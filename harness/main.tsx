import { createRoot } from "react-dom/client";
import { CatalogClient } from "../src/core/catalog";
import type { Services } from "../src/services";
import { ServicesProvider } from "../src/services";
import { QamPanel } from "../src/components/QamPanel";
import { CatalogPage } from "../src/components/CatalogPage";
import type { InstalledGame } from "../src/core/types";
import type { DownloadProgress } from "../src/adapters/backend";

const CATALOG_BASE = "http://localhost:8787";

const logEl = document.getElementById("steam-log")!;
function steamLog(line: string) {
  logEl.textContent += `${line}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

const installed = new Map<string, InstalledGame>(
  JSON.parse(localStorage.getItem("installed") ?? "[]").map((g: InstalledGame) => [g.gameId, g]),
);
function persist() {
  localStorage.setItem("installed", JSON.stringify([...installed.values()]));
}

const progressListeners = new Set<(p: DownloadProgress) => void>();
let nextAppId = 1000;

const services: Services = {
  catalog: new CatalogClient(CATALOG_BASE, (url) => fetch(url)),
  install: {
    async download(cmsId, title) {
      const res = await fetch(`${CATALOG_BASE}/api/appimage?cmsId=${cmsId}`);
      if (!res.ok) return { ok: false, code: "bad-status" as const, detail: `HTTP ${res.status}` };
      const total = Number(res.headers.get("content-length")) || 65536;
      for (let received = 0; received <= total; received += total / 4) {
        await new Promise((r) => setTimeout(r, 150));
        progressListeners.forEach((cb) => cb({ cmsId, received: Math.min(received, total), total }));
      }
      await res.arrayBuffer();
      const path = `/home/deck/homebrew/data/decky-gfn/appimages/${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.AppImage`;
      steamLog(`backend: downloaded ${path}`);
      return { ok: true, value: { path } };
    },
    async addShortcut(title, path) {
      const appId = nextAppId++;
      steamLog(`SteamClient.Apps.AddShortcut("${title}", "${path}") -> ${appId}`);
      return appId;
    },
    async setArtwork(appId, imageUrl) {
      steamLog(`SteamClient.Apps.SetCustomArtworkForApp(${appId}, ${imageUrl.slice(0, 60)}…)`);
    },
    async removeFile(path) {
      steamLog(`backend: rm ${path}`);
    },
    async recordInstall(entry) {
      installed.set(entry.gameId, entry);
      persist();
    },
  },
  uninstall: {
    async removeShortcut(appId) {
      steamLog(`SteamClient.Apps.RemoveShortcut(${appId})`);
    },
    async removeFile(path) {
      steamLog(`backend: rm ${path}`);
    },
    async removeRecord(gameId) {
      installed.delete(gameId);
      persist();
    },
  },
  async listInstalled() {
    return [...installed.values()];
  },
  onDownloadProgress(cb) {
    progressListeners.add(cb);
    return () => progressListeners.delete(cb);
  },
  openCatalog() {
    steamLog("Navigation.Navigate(/gfn-catalog)");
  },
  navigateToApp(appId) {
    steamLog(`Navigation.Navigate(/library/app/${appId})`);
  },
  toast(title, body) {
    steamLog(`toast: ${title} — ${body}`);
  },
};

createRoot(document.getElementById("qam")!).render(
  <ServicesProvider value={services}>
    <QamPanel />
  </ServicesProvider>,
);
createRoot(document.getElementById("page")!).render(
  <ServicesProvider value={services}>
    <CatalogPage />
  </ServicesProvider>,
);
