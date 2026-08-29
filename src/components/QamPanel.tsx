import { ButtonItem, PanelSection, PanelSectionRow } from "@decky/ui";
import { useEffect, useState } from "react";
import { useServices } from "../services";
import type { InstalledGame } from "../core/types";

export function QamPanel() {
  const services = useServices();
  const [installed, setInstalled] = useState<InstalledGame[]>([]);

  useEffect(() => {
    let cancelled = false;
    services.listInstalled().then((list) => {
      if (!cancelled) setInstalled(list);
    });
    return () => {
      cancelled = true;
    };
  }, [services]);

  return (
    <>
      <PanelSection>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => services.openCatalog()}>
            Browse catalog
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>
      {installed.length > 0 && (
        <PanelSection title="Installed">
          {installed.map((g) => (
            <PanelSectionRow key={g.gameId}>
              <ButtonItem layout="below" onClick={() => services.navigateToApp(g.appId)}>
                {g.title}
              </ButtonItem>
            </PanelSectionRow>
          ))}
        </PanelSection>
      )}
    </>
  );
}
