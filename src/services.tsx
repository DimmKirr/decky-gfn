import { createContext, useContext } from "react";
import type { CatalogSource } from "./core/catalog";
import type { InstallPorts, UninstallPorts } from "./core/install";
import type { InstalledGame } from "./core/types";
import type { DownloadProgress } from "./adapters/backend";

export interface Services {
  catalog: CatalogSource;
  install: InstallPorts;
  uninstall: UninstallPorts;
  listInstalled(): Promise<InstalledGame[]>;
  onDownloadProgress(cb: (p: DownloadProgress) => void): () => void;
  openCatalog(): void;
  navigateToApp(appId: number): void;
  toast(title: string, body: string): void;
}

const Ctx = createContext<Services | null>(null);
export const ServicesProvider = Ctx.Provider;

export function useServices(): Services {
  const s = useContext(Ctx);
  if (!s) throw new Error("ServicesProvider missing");
  return s;
}
