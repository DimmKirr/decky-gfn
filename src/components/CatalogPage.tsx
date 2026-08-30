import { DialogButton, Focusable, SteamSpinner, TextField } from "@decky/ui";
import { useCallback, useEffect, useState } from "react";
import { useServices } from "../services";
import { useDebounced } from "./useDebounced";
import { GameTile } from "./GameTile";
import { GameDetail } from "./GameDetail";
import type { CatalogGame, CatalogPageData } from "../core/types";

// 4 tiles per row filling the full width — no trailing negative space.
const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 12,
  padding: "12px 0",
};

export function CatalogPage() {
  const services = useServices();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query, 300);
  const [data, setData] = useState<CatalogPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CatalogGame | null>(null);
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(() => setAttempt((a) => a + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    services.catalog
      .getPage({ q: debouncedQuery || undefined })
      .then((page) => {
        if (!cancelled) setData(page);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [services, debouncedQuery, attempt]);

  if (selected) {
    return <GameDetail game={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div style={{ padding: "40px 24px 24px" }}>
      <TextField
        label="Search"
        value={query}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
      />
      {loading && <SteamSpinner />}
      {error && !loading && (
        <Focusable style={{ padding: 16 }}>
          <div>Couldn't load the catalog.</div>
          <DialogButton onClick={load}>Retry</DialogButton>
        </Focusable>
      )}
      {data && !loading && !error && (
        <Focusable style={gridStyle} flow-children="grid">
          {data.games.map((game) => (
            <GameTile key={game.gameId} game={game} onOpen={setSelected} />
          ))}
        </Focusable>
      )}
    </div>
  );
}
