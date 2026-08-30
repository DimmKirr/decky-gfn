import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { GameTile } from "../../src/components/GameTile";
import { makeFakeServices, renderWithServices } from "../helpers/fakeServices";
import type { CatalogGame } from "../../src/core/types";

const GAME: CatalogGame = {
  gameId: "u1",
  title: "Counter-Strike 2",
  imageUrl: "https://img.nvidiagrid.net/apps/1/TV_BANNER.jpg",
  variants: [{ cmsId: "1", store: "STEAM" }],
};

describe("GameTile", () => {
  it("renders the image through the local cache", async () => {
    const services = makeFakeServices({
      resolveImage: vi.fn(async () => "data:image/jpeg;base64,CACHED"),
    });
    renderWithServices(<GameTile game={GAME} onOpen={() => {}} />, services);
    await waitFor(() => {
      const tile = screen.getByRole("button");
      expect(tile.style.backgroundImage).toContain("data:image/jpeg;base64,CACHED");
    });
    expect(services.resolveImage).toHaveBeenCalledWith(GAME.imageUrl);
  });

  it("shows a store badge per variant", () => {
    const services = makeFakeServices();
    const game: CatalogGame = {
      ...GAME,
      variants: [
        { cmsId: "1", store: "STEAM" },
        { cmsId: "2", store: "GOG" },
        { cmsId: "3", store: "SOMESTORE" },
      ],
    };
    renderWithServices(<GameTile game={game} onOpen={() => {}} />, services);
    expect(screen.getByLabelText("Steam")).toBeInTheDocument();
    expect(screen.getByLabelText("GOG")).toBeInTheDocument();
    expect(screen.getByLabelText("SOMESTORE")).toBeInTheDocument(); // unknown → text chip
  });

  it("falls back to the raw URL while the cache resolves", () => {
    const services = makeFakeServices({
      resolveImage: vi.fn(() => new Promise<string>(() => {})), // never resolves
    });
    renderWithServices(<GameTile game={GAME} onOpen={() => {}} />, services);
    expect(screen.getByRole("button").style.backgroundImage).toContain(GAME.imageUrl);
  });
});
