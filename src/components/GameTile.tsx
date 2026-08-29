import { Focusable } from "@decky/ui";
import type { CatalogGame } from "../core/types";

const tileStyle: React.CSSProperties = {
  width: 220,
  height: 100,
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

export function GameTile({ game, onOpen }: { game: CatalogGame; onOpen(game: CatalogGame): void }) {
  return (
    <Focusable
      style={{ ...tileStyle, backgroundImage: game.imageUrl ? `url(${game.imageUrl})` : undefined }}
      onActivate={() => onOpen(game)}
    >
      <div style={labelStyle}>{game.title}</div>
    </Focusable>
  );
}
