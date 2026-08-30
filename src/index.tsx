import { staticClasses } from "@decky/ui";
import { definePlugin, routerHook } from "@decky/api";
import { SiNvidia } from "react-icons/si";
import { QamPanel } from "./components/QamPanel";
import { CatalogPage } from "./components/CatalogPage";
import { GfnAppOverlay } from "./components/GfnAppOverlay";
import { ServicesProvider } from "./services";
import { makeRealServices } from "./services.real";
import { installGame, uninstallGame } from "./core/install";
import { applyShortcutMeta, setArtwork } from "./adapters/steam";
import type { CatalogGame, InstalledGame, Variant } from "./core/types";

export default definePlugin(() => {
  const services = makeRealServices();

  // Debug/e2e seam: lets a remote CEF session (tests/e2e-deck) drive the real
  // service layer — catalog, backend download, SteamClient — without DOM automation.
  (globalThis as Record<string, unknown>).__DECKY_GFN__ = {
    services,
    installGame: (game: CatalogGame, variant: Variant) => installGame(services.install, game, variant),
    uninstallGame: (installed: InstalledGame) => uninstallGame(services.uninstall, installed),
    // Re-apply name/sortAs/launch options and artwork to every registered
    // shortcut — heals installs made before the naming/artwork fixes.
    repairShortcuts: async () => {
      const results: Array<{ title: string; art: boolean }> = [];
      for (const g of await services.listInstalled()) {
        applyShortcutMeta(g.appId, g.title);
        let art = false;
        try {
          const page = await services.catalog.getPage({ q: g.title.replace(/[®™]/g, "") });
          const match = page.games.find((c) => c.gameId === g.gameId);
          if (match?.imageUrl) {
            await setArtwork(g.appId, { imageUrl: match.imageUrl, heroUrl: match.heroUrl });
            art = true;
          }
        } catch {
          // meta fixed even if artwork lookup failed
        }
        results.push({ title: g.title, art });
      }
      return results;
    },
  };

  // Overlay a GFN badge + description on the game page of anything we installed.
  const appPagePatch = routerHook.addPatch("/library/app/:appid", (route) => {
    const original = route.children;
    route.children = (
      <>
        {original}
        <ServicesProvider value={services}>
          <GfnAppOverlay />
        </ServicesProvider>
      </>
    );
    return route;
  });

  routerHook.addRoute(
    "/gfn-catalog",
    () => (
      <ServicesProvider value={services}>
        <CatalogPage />
      </ServicesProvider>
    ),
    { exact: true },
  );

  return {
    name: "GeForce NOW",
    titleView: <div className={staticClasses.Title}>GeForce NOW</div>,
    content: (
      <ServicesProvider value={services}>
        <QamPanel />
      </ServicesProvider>
    ),
    icon: <SiNvidia />,
    onDismount() {
      delete (globalThis as Record<string, unknown>).__DECKY_GFN__;
      routerHook.removePatch("/library/app/:appid", appPagePatch);
      routerHook.removeRoute("/gfn-catalog");
    },
  };
});
