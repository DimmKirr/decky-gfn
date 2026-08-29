export interface Variant {
  cmsId: string;
  store: string; // raw library enum: STEAM, EPIC, GOG, …
}

export interface CatalogGame {
  gameId: string; // GFN parentGameId UUID
  title: string;
  imageUrl: string; // TV_BANNER
  heroUrl?: string; // HERO_IMAGE
  variants: Variant[];
}

export interface CatalogPageData {
  total: number;
  page: number;
  pageSize: number;
  games: CatalogGame[];
}

export interface InstalledGame {
  gameId: string;
  title: string;
  appId: number;
  path: string;
  cmsId: string;
  store: string;
}

export type BackendResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: "network" | "bad-status" | "disk-full" | "unknown"; detail?: string };
