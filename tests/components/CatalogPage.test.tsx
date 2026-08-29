import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CatalogPage } from "../../src/components/CatalogPage";
import { makeFakeServices, renderWithServices } from "../helpers/fakeServices";
import type { CatalogPageData } from "../../src/core/types";

const PAGE: CatalogPageData = {
  total: 2,
  page: 1,
  pageSize: 50,
  games: [
    { gameId: "u1", title: "Counter-Strike 2", imageUrl: "https://img/cs2.jpg", variants: [{ cmsId: "1", store: "STEAM" }] },
    { gameId: "u2", title: "Cyberpunk 2077", imageUrl: "https://img/cp.jpg", variants: [{ cmsId: "2", store: "GOG" }] },
  ],
};

describe("CatalogPage", () => {
  it("renders tiles from the catalog", async () => {
    const services = makeFakeServices({ catalog: { getPage: vi.fn(async () => PAGE) } });
    renderWithServices(<CatalogPage />, services);
    expect(await screen.findByText("Counter-Strike 2")).toBeInTheDocument();
    expect(screen.getByText("Cyberpunk 2077")).toBeInTheDocument();
  });

  it("debounces search and queries with q", async () => {
    const getPage = vi.fn(async () => PAGE);
    const services = makeFakeServices({ catalog: { getPage } });
    renderWithServices(<CatalogPage />, services);
    await screen.findByText("Counter-Strike 2");
    await userEvent.type(screen.getByRole("textbox"), "cyber");
    await waitFor(() => expect(getPage).toHaveBeenCalledWith(expect.objectContaining({ q: "cyber" })), {
      timeout: 2000,
    });
    // typing 5 chars must NOT produce 5 queries
    const qCalls = (getPage.mock.calls as unknown[][]).filter((args) => (args[0] as { q?: string })?.q);
    expect(qCalls.length).toBeLessThan(5);
  });

  it("shows an error with retry when the catalog fails", async () => {
    const getPage = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(PAGE);
    const services = makeFakeServices({ catalog: { getPage } });
    renderWithServices(<CatalogPage />, services);
    await screen.findByText(/couldn't load/i);
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(await screen.findByText("Counter-Strike 2")).toBeInTheDocument();
  });

  it("opens the detail view when a tile is activated", async () => {
    const services = makeFakeServices({ catalog: { getPage: vi.fn(async () => PAGE) } });
    renderWithServices(<CatalogPage />, services);
    await userEvent.click(await screen.findByText("Counter-Strike 2"));
    expect(await screen.findByRole("button", { name: /install/i })).toBeInTheDocument();
  });
});
