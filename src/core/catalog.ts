import type { CatalogPageData } from "./types";

export type FetchLike = (
  url: string,
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export class CatalogError extends Error {
  constructor(
    public kind: "network" | "bad-status" | "bad-json",
    message: string,
  ) {
    super(message);
    this.name = "CatalogError";
  }
}

export interface CatalogSource {
  getPage(opts?: { q?: string; page?: number; pageSize?: number }): Promise<CatalogPageData>;
}

export class CatalogClient implements CatalogSource {
  private cache = new Map<string, CatalogPageData>();

  constructor(
    private baseUrl: string,
    private fetchFn: FetchLike,
  ) {}

  async getPage(opts: { q?: string; page?: number; pageSize?: number } = {}): Promise<CatalogPageData> {
    const q = opts.q ?? "";
    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? 50;
    const key = `${q}|${page}|${pageSize}`;
    const hit = this.cache.get(key);
    if (hit) return hit;

    const url = new URL("/api/catalog", this.baseUrl);
    if (q) url.searchParams.set("q", q);
    url.searchParams.set("page", String(page));
    url.searchParams.set("pageSize", String(pageSize));

    let res: Awaited<ReturnType<FetchLike>>;
    try {
      res = await this.fetchFn(url.toString());
    } catch (err) {
      throw new CatalogError("network", String(err));
    }
    if (!res.ok) throw new CatalogError("bad-status", `catalog returned ${res.status}`);

    let body: unknown;
    try {
      body = await res.json();
    } catch (err) {
      throw new CatalogError("bad-json", String(err));
    }
    const parsed = body as CatalogPageData;
    if (!Array.isArray(parsed?.games)) throw new CatalogError("bad-json", "missing games[]");

    this.cache.set(key, parsed);
    return parsed;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
