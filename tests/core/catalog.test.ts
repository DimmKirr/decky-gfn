import { describe, expect, it, vi } from "vitest";
import { CatalogClient, CatalogError } from "../../src/core/catalog";
import type { CatalogPageData } from "../../src/core/types";

const PAGE: CatalogPageData = {
  total: 1,
  page: 1,
  pageSize: 50,
  games: [
    {
      gameId: "uuid-1",
      title: "Counter-Strike 2",
      imageUrl: "https://img/banner.jpg",
      variants: [{ cmsId: "7315111", store: "STEAM" }],
    },
  ],
};

function okFetch(body: unknown = PAGE) {
  return vi.fn(async () => ({ ok: true, status: 200, json: async () => body }));
}

describe("CatalogClient", () => {
  it("builds the request URL from q/page/pageSize", async () => {
    const fetchFn = okFetch();
    const client = new CatalogClient("https://example.test", fetchFn);
    await client.getPage({ q: "counter", page: 2, pageSize: 10 });
    expect(fetchFn).toHaveBeenCalledWith(
      "https://example.test/api/catalog?q=counter&page=2&pageSize=10",
    );
  });

  it("returns the parsed page", async () => {
    const client = new CatalogClient("https://example.test", okFetch());
    const page = await client.getPage();
    expect(page.games[0].title).toBe("Counter-Strike 2");
  });

  it("caches per q|page|pageSize key", async () => {
    const fetchFn = okFetch();
    const client = new CatalogClient("https://example.test", fetchFn);
    await client.getPage({ q: "a" });
    await client.getPage({ q: "a" });
    await client.getPage({ q: "b" });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("throws CatalogError(bad-status) on non-2xx", async () => {
    const fetchFn = vi.fn(async () => ({ ok: false, status: 502, json: async () => ({}) }));
    const client = new CatalogClient("https://example.test", fetchFn);
    await expect(client.getPage()).rejects.toMatchObject({ kind: "bad-status" });
  });

  it("throws CatalogError(network) when fetch rejects", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("offline");
    });
    const client = new CatalogClient("https://example.test", fetchFn);
    await expect(client.getPage()).rejects.toBeInstanceOf(CatalogError);
    await expect(client.getPage()).rejects.toMatchObject({ kind: "network" });
  });

  it("throws CatalogError(bad-json) when games[] is missing", async () => {
    const client = new CatalogClient("https://example.test", okFetch({ nope: true }));
    await expect(client.getPage()).rejects.toMatchObject({ kind: "bad-json" });
  });
});
