import { DialogButton, Dropdown, Focusable, ProgressBarWithInfo, staticClasses } from "@decky/ui";
import { useState } from "react";
import { useServices } from "../services";
import { useInstall } from "./useInstall";
import { useCachedImage } from "./useCachedImage";
import type { CatalogGame } from "../core/types";

import { storeLabel } from "./stores";

export function GameDetail({ game, onBack }: { game: CatalogGame; onBack(): void }) {
  const services = useServices();
  const { state, start, uninstall } = useInstall(game);
  const [variant, setVariant] = useState(game.variants[0]);
  const heroSrc = useCachedImage(game.heroUrl);

  return (
    <Focusable onCancel={onBack} style={{ padding: "40px 24px 24px" }}>
      {heroSrc && (
        <div
          style={{
            height: 180, borderRadius: 8, backgroundImage: `url(${heroSrc})`,
            backgroundSize: "cover", backgroundPosition: "center", marginBottom: 16,
          }}
        />
      )}
      <div className={staticClasses.Title}>{game.title}</div>
      <div style={{ margin: "8px 0", opacity: 0.7 }}>
        {game.variants.map((v) => storeLabel(v.store)).join(" · ")}
      </div>

      {game.variants.length > 1 && state.phase === "idle" && (
        <Dropdown
          rgOptions={game.variants.map((v) => ({ data: v.cmsId, label: storeLabel(v.store) }))}
          selectedOption={variant.cmsId}
          onChange={(opt: { data: string }) => {
            const next = game.variants.find((v) => v.cmsId === opt.data);
            if (next) setVariant(next);
          }}
        />
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        {state.phase === "idle" && (
          <DialogButton onClick={() => start(variant)}>Install</DialogButton>
        )}
        {state.phase === "downloading" && (
          <ProgressBarWithInfo
            nProgress={state.fraction != null ? state.fraction * 100 : undefined}
            sOperationText="Downloading…"
          />
        )}
        {state.phase === "adding" && <ProgressBarWithInfo sOperationText="Adding to Steam…" />}
        {state.phase === "installed" && (
          <>
            <DialogButton onClick={() => services.navigateToApp(state.installed.appId)}>Play</DialogButton>
            <DialogButton onClick={uninstall}>Uninstall</DialogButton>
          </>
        )}
        {state.phase === "error" && (
          <>
            <div style={{ color: "#ff6b6b" }}>{state.message}</div>
            <DialogButton onClick={() => start(variant)}>Install</DialogButton>
          </>
        )}
        <DialogButton onClick={onBack}>Back</DialogButton>
      </div>
    </Focusable>
  );
}
