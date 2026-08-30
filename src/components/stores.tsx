import { FaSteam, FaXbox } from "react-icons/fa";
import { SiBattledotnet, SiEa, SiEpicgames, SiGogdotcom, SiUbisoft } from "react-icons/si";
import type { IconType } from "react-icons";

export const STORE_ICONS: Record<string, { icon: IconType; label: string }> = {
  STEAM: { icon: FaSteam, label: "Steam" },
  EPIC: { icon: SiEpicgames, label: "Epic Games" },
  GOG: { icon: SiGogdotcom, label: "GOG" },
  UBISOFT: { icon: SiUbisoft, label: "Ubisoft" },
  UPLAY: { icon: SiUbisoft, label: "Ubisoft" },
  EA_APP: { icon: SiEa, label: "EA App" },
  ORIGIN: { icon: SiEa, label: "EA App" },
  XBOX: { icon: FaXbox, label: "Xbox" },
  BATTLENET: { icon: SiBattledotnet, label: "Battle.net" },
};

export function storeLabel(store: string): string {
  return STORE_ICONS[store]?.label ?? store;
}

export function StoreIcon({ store, size = 12 }: { store: string; size?: number }) {
  const known = STORE_ICONS[store];
  if (!known) return null;
  const Icon = known.icon;
  return <Icon size={size} aria-label={known.label} />;
}
