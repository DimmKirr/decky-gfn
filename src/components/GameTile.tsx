import { Focusable } from "@decky/ui";
import { STORE_ICONS } from "./stores";
import { useCachedImage } from "./useCachedImage";
import type { CatalogGame } from "../core/types";

const tileStyle: React.CSSProperties = {
  width: "100%",
  aspectRatio: "22 / 10",
  borderRadius: 6,
  overflow: "hidden",
  position: "relative",
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundColor: "#1a2233",
};

const labelStyle: React.CSSProperties = {
  position: "absolute",
  insetInline: 0,
  bottom: 0,
  padding: "4px 8px",
  background: "linear-gradient(transparent, rgba(0,0,0,0.85))",
  fontSize: 13,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const badgeRowStyle: React.CSSProperties = {
  position: "absolute",
  top: 6,
  right: 6,
  display: "flex",
  gap: 4,
};

const badgeStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 20,
  height: 20,
  padding: "0 3px",
  borderRadius: 3,
  background: "rgba(0, 0, 0, 0.7)",
  color: "#dcdedf",
  fontSize: 12,
};

function StoreBadge({ store }: { store: string }) {
  const known = STORE_ICONS[store];
  if (known) {
    const Icon = known.icon;
    return (
      <span style={badgeStyle} aria-label={known.label} title={known.label}>
        <Icon size={12} />
      </span>
    );
  }
  return (
    <span style={{ ...badgeStyle, fontSize: 9, fontWeight: 600 }} aria-label={store} title={store}>
      {store.slice(0, 4)}
    </span>
  );
}

export function GameTile({ game, onOpen }: { game: CatalogGame; onOpen(game: CatalogGame): void }) {
  const src = useCachedImage(game.imageUrl || undefined);
  const stores = [...new Set(game.variants.map((v) => v.store))].filter(
    (s) => s !== "NONE" && s !== "UNKNOWN",
  );
  return (
    <Focusable
      style={{ ...tileStyle, backgroundImage: src ? `url(${src})` : undefined }}
      onActivate={() => onOpen(game)}
    >
      <div style={badgeRowStyle}>
        {stores.map((store) => (
          <StoreBadge key={store} store={store} />
        ))}
      </div>
      <div style={labelStyle}>{game.title}</div>
    </Focusable>
  );
}
