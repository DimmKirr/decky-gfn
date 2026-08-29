import { useCallback, useEffect, useRef, useState } from "react";
import { installGame, uninstallGame } from "../core/install";
import { useServices } from "../services";
import type { CatalogGame, InstalledGame, Variant } from "../core/types";

export type InstallUiState =
  | { phase: "loading" }
  | { phase: "idle" }
  | { phase: "downloading"; fraction: number | null }
  | { phase: "adding" }
  | { phase: "installed"; installed: InstalledGame }
  | { phase: "error"; message: string };

export function useInstall(game: CatalogGame) {
  const services = useServices();
  const [state, setState] = useState<InstallUiState>({ phase: "loading" });
  const cmsIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    services.listInstalled().then((list) => {
      if (cancelled) return;
      const installed = list.find((g) => g.gameId === game.gameId);
      setState(installed ? { phase: "installed", installed } : { phase: "idle" });
    });
    return () => {
      cancelled = true;
    };
  }, [services, game.gameId]);

  useEffect(
    () =>
      services.onDownloadProgress((p) => {
        if (p.cmsId !== cmsIdRef.current) return;
        setState((s) =>
          s.phase === "downloading"
            ? { phase: "downloading", fraction: p.total ? p.received / p.total : null }
            : s,
        );
      }),
    [services],
  );

  const start = useCallback(
    async (variant: Variant) => {
      cmsIdRef.current = variant.cmsId;
      setState({ phase: "downloading", fraction: null });
      const out = await installGame(services.install, game, variant, (phase) => {
        if (phase === "adding") setState({ phase: "adding" });
      });
      if (out.ok) {
        const installed: InstalledGame = {
          gameId: game.gameId,
          title: game.title,
          appId: out.appId,
          path: "",
          cmsId: variant.cmsId,
          store: variant.store,
        };
        // Re-read from the registry so `path` is authoritative.
        const list = await services.listInstalled();
        const entry = list.find((g) => g.gameId === game.gameId) ?? installed;
        setState({ phase: "installed", installed: entry });
        services.toast(game.title, "Added to your Steam library");
      } else {
        setState({ phase: "error", message: `Install failed (${out.code}${out.detail ? `: ${out.detail}` : ""})` });
      }
    },
    [services, game],
  );

  const uninstall = useCallback(async () => {
    if (state.phase !== "installed") return;
    await uninstallGame(services.uninstall, state.installed);
    setState({ phase: "idle" });
    services.toast(game.title, "Removed from your Steam library");
  }, [services, game, state]);

  return { state, start, uninstall };
}
