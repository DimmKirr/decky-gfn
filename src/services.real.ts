import { Navigation } from "@decky/ui";
import { fetchNoCors, toaster } from "@decky/api";
import { CatalogClient } from "./core/catalog";
import { DEFAULT_BASE_URL } from "./core/config";
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
    listInstalled: () => backend.listInstalled(),
    onDownloadProgress: backend.onDownloadProgress,
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
