import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GameDetail } from "../../src/components/GameDetail";
import { makeFakeServices, renderWithServices } from "../helpers/fakeServices";
import type { CatalogGame } from "../../src/core/types";

const GAME: CatalogGame = {
  gameId: "u2",
  title: "Cyberpunk 2077",
  imageUrl: "https://img/banner.jpg",
  heroUrl: "https://img/hero.jpg",
  variants: [
    { cmsId: "100838211", store: "GOG" },
    { cmsId: "100444811", store: "STEAM" },
  ],
};

describe("GameDetail", () => {
  it("installs the selected variant and flips to Play", async () => {
    const services = makeFakeServices();
    renderWithServices(<GameDetail game={GAME} onBack={() => {}} />, services);
    // pick the STEAM variant
    await userEvent.selectOptions(await screen.findByRole("combobox"), "100444811");
    await userEvent.click(screen.getByRole("button", { name: /install/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /play/i })).toBeInTheDocument());
    expect(services.install.download).toHaveBeenCalledWith("100444811", "Cyberpunk 2077");
    expect(services.toast).toHaveBeenCalled();
  });

  it("shows the error and keeps Install on failure", async () => {
    const services = makeFakeServices();
    services.install.download = vi.fn(async () => ({ ok: false as const, code: "network" as const }));
    renderWithServices(<GameDetail game={GAME} onBack={() => {}} />, services);
    await userEvent.click(await screen.findByRole("button", { name: /install/i }));
    expect(await screen.findByText(/failed/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /install/i })).toBeInTheDocument();
  });

  it("shows Play/Uninstall when already installed, and uninstalls", async () => {
    const services = makeFakeServices({
      listInstalled: vi.fn(async () => [
        { gameId: "u2", title: "Cyberpunk 2077", appId: 55, path: "/x.AppImage", cmsId: "100838211", store: "GOG" },
      ]),
    });
    renderWithServices(<GameDetail game={GAME} onBack={() => {}} />, services);
    const play = await screen.findByRole("button", { name: /play/i });
    await userEvent.click(play);
    expect(services.navigateToApp).toHaveBeenCalledWith(55);
    await userEvent.click(screen.getByRole("button", { name: /uninstall/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /install/i })).toBeInTheDocument());
    expect(services.uninstall.removeShortcut).toHaveBeenCalledWith(55);
  });
});
