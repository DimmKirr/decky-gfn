import { Navigation } from "@decky/ui";
import { fetchNoCors, toaster } from "@decky/api";
import { CatalogClient } from "./core/catalog";
import { DEFAULT_BASE_URL } from "./core/config";
import { reconcileInstalled } from "./core/reconcile";
import type { Services } from "./services";
import * as steam from "./adapters/steam";
import * as backend from "./adapters/backend";

export function makeRealServices(): Services {
  return {
    catalog: new CatalogClient(DEFAULT_BASE_URL, (url) => fetchNoCors(url)),
    install: {
      download: (cmsId, title) => backend.downloadAppimage(cmsId, title),
      addShortcut: steam.addShortcut,
      setArtwork: steam.setArtwork,
      removeFile: async (path) => {
        await backend.removeAppimage(path);
      },
      recordInstall: async (entry) => {
        await backend.recordInstall(entry);
      },
    },
    uninstall: {
      removeShortcut: async (appId) => steam.removeShortcut(appId),
      removeFile: async (path) => {
        await backend.removeAppimage(path);
      },
      removeRecord: async (gameId) => {
        await backend.removeInstall(gameId);
      },
    },
    // Reconcile against reality: entries whose shortcut or AppImage was removed
    // outside the plugin get pruned instead of shown as installed.
    listInstalled: async () =>
      reconcileInstalled(
        {
          shortcutExists: steam.shortcutExists,
          fileExists: (path) => backend.fileExists(path),
          removeShortcut: async (appId) => steam.removeShortcut(appId),
          removeFile: async (path) => {
            await backend.removeAppimage(path);
          },
          removeRecord: async (gameId) => {
            await backend.removeInstall(gameId);
          },
        },
        await backend.listInstalled(),
      ),
    onDownloadProgress: backend.onDownloadProgress,
    resolveImage: (() => {
      const memo = new Map<string, Promise<string>>();
      return (url: string) => {
        let hit = memo.get(url);
        if (!hit) {
          hit = backend
            .cacheImage(url)
            .then((res) => (res.ok ? res.value.dataUrl : url))
            .catch(() => url);
          memo.set(url, hit);
        }
        return hit;
      };
    })(),
    openCatalog() {
      Navigation.Navigate("/gfn-catalog");
      Navigation.CloseSideMenus();
    },
    navigateToApp(appId) {
      Navigation.Navigate(`/library/app/${appId}`);
      Navigation.CloseSideMenus();
    },
    toast(title, body) {
      toaster.toast({ title, body });
    },
  };
}
