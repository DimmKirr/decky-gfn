# decky-gfn — GeForce NOW catalog plugin for Decky Loader

Design doc, approved 2026-08-24. Companion repo: `gfn-game-launcher` (Astro site on Cloudflare Pages).

## Goal

A Decky Loader plugin that browses the GFN game catalog inside Steam Gamepad UI, and on
Install: downloads the per-game AppImage from the launcher site and adds it to the Steam
library as a non-Steam shortcut with artwork — live, no Steam restart.

## Decisions (with rationale)

1. **Catalog API: contract + mock now, real endpoint later.** The launcher site has no
   browse/search endpoint yet (only single-game `/api/lookup`). This repo defines the
   contract and develops against a local mock seeded from a `library.json` fixture.
   Building `/api/catalog` in `gfn-game-launcher` is a follow-up ticket.
2. **UI surface: full-page route + QAM entry.** Browsing 5600+ games with banner art needs
   a full-page route (Junk Store model). The Quick Access panel is a small entry point +
   install status.
3. **Architecture: live shortcuts + thin backend.** Frontend calls `SteamClient.Apps`
   directly (AddShortcut etc., no restart). Python backend does only filesystem work
   (download/chmod/delete). Rejected: fat backend writing `shortcuts.vdf` (requires Steam
   restart per install); deep-link-only shortcuts via the GFN flatpak (drops the AppImage
   requirement — may return later as a per-game fallback the feed can enable).
4. **Testing: units + browser harness.** Vitest + Testing Library (frontend), pytest
   (backend), plus a Vite harness that runs the real plugin UI in a normal browser with all
   adapters mocked. On-device e2e stays manual/documented.
5. **Modern 2026 API only**: `plugin.json api_version: 1`, `@decky/ui` ~4.12,
   `@decky/api` ~1.1, `@decky/rollup`, pnpm 9. No deprecated `decky-frontend-lib`/`ServerAPI`.

## Repo layout

```
decky-gfn/
├── plugin.json            # api_version: 1, flags: ["debug"] during dev
├── package.json           # pnpm 9, @decky/ui, @decky/api, @decky/rollup
├── main.py                # thin backend: download / remove / list AppImages
├── src/
│   ├── index.tsx          # definePlugin: QAM panel + routerHook.addRoute("/gfn-catalog")
│   ├── core/              # pure TS, zero decky imports (fully unit-testable)
│   │   ├── catalog.ts     # paginated client, fetch fn injected
│   │   ├── install.ts     # install state machine (idle→downloading→adding→done/rollback)
│   │   └── types.ts       # CatalogGame, Variant, InstalledGame
│   ├── adapters/
│   │   ├── steam.ts       # SteamClient.Apps wrapper — ONLY place touching SteamClient
│   │   ├── backend.ts     # @decky/api callable() wrappers + progress event bridge
│   │   └── decky.ts       # fetchNoCors, toaster, Navigation wrappers
│   └── components/        # QamPanel, CatalogPage, GameTile, GameDetail, InstallButton
├── mock/
│   ├── catalog-server.mjs # serves the catalog contract from a library.json fixture
│   └── steam-mock.ts      # in-browser SteamClient mock, records calls
├── harness/               # Vite app mounting the plugin UI in a normal browser
├── tests/                 # vitest; backend pytest in tests/test_main.py
└── docs/plans/            # this doc + implementation plan
```

## Catalog contract v1

`GET /api/catalog?q=<search>&page=<n>&pageSize=<n>` →

```json
{
  "total": 5614, "page": 1, "pageSize": 50,
  "games": [{
    "gameId": "dcff9c03-…",            // GFN parentGameId UUID
    "title": "Counter-Strike 2",
    "imageUrl": "https://img.nvidiagrid.net/…TV_BANNER…jpg",
    "heroUrl":  "https://img.nvidiagrid.net/…HERO_IMAGE…jpg",
    "variants": [{ "cmsId": "7315111", "store": "Steam" }]
  }]
}
```

Thin projection of `gfn-game-launcher/src/data/library.json`. Search is title substring,
server-side. The plugin caches fetched pages in memory per session.

Install download uses the **existing** `GET /api/appimage?cmsId=<id>` (CORS `*`, streams
the binary, already deployed).

## Install flow

1. GameDetail → Install (multi-store: `Dropdown` picks variant first)
2. Frontend calls backend `download(cmsId, title)` → backend streams
   `/api/appimage?cmsId=` to `DECKY_PLUGIN_RUNTIME_DIR/appimages/<slug>.AppImage`,
   chmod +x, emits `download_progress` events via `decky.emit`
3. Frontend `SteamClient.Apps.AddShortcut(title, path, dir, "")` → appId
4. `SetCustomArtworkForApp(appId, <banner>, …)` for grid/hero art
5. Record `{gameId → {appId, path, cmsId, store}}` in plugin settings
   (`DECKY_PLUGIN_SETTINGS_DIR/installed.json`)
6. Toast success. Installed games show **Play** (`RunGame(appId)`) / **Uninstall**
   (`RemoveShortcut(appId)` + backend delete + settings cleanup)

## Error handling

- Backend returns typed results `{ok, code, detail}` — codes: `network`, `bad-status`,
  `disk-full`. Partial downloads are cleaned up on failure/abort.
- `AddShortcut` drift guard: adapter validates the returned appId is a positive number;
  on failure rolls back (deletes file) and toasts. SteamClient access is confined to
  `adapters/steam.ts`.
- Dedupe: install button consults settings; already-installed games render Play/Uninstall.
- Catalog fetch failure → inline retry state on the page, toast on install-time failures.

## UI/UX — store-like, native Steam look

Native look comes from `@decky/ui` primitives, not custom CSS:

- **Catalog page** (`/gfn-catalog`): top `TextField` search (debounced ~300ms), grid of
  focusable game tiles (`Focusable` + TV_BANNER art, focus ring, `onActivate`),
  `SteamSpinner` while loading, infinite scroll via paged fetches.
- **Game detail**: HERO_IMAGE banner, `staticClasses.Title`, store badge chips, primary
  `DialogButton` Install → `ProgressBarWithInfo` during download → Play / secondary
  Uninstall. `Dropdown` for multi-store variant choice.
- **QAM panel**: `PanelSection`/`PanelSectionRow`, `ButtonItem` "Browse catalog"
  (`Navigation.Navigate`), compact installed list with status. `toaster.toast` for results.
- Controller-first: every interactive element is `Focusable`/`DialogButton` so A/B/LB/RB
  behave like the rest of Steam. Harness maps keyboard equivalents.

## Testing

1. `src/core/`: pure Vitest units — state machine transitions, catalog paging/search with
   fake fetch. Highest coverage lives here.
2. Components: Vitest + Testing Library; `@decky/ui` aliased to lightweight HTML stubs
   (real components only render inside Steam — aliasing is the standard trick).
3. Backend: pytest + fake `decky` module (per its `.pyi`); download tested against a local
   HTTP fixture serving a tiny blob; asserts chmod, cleanup on abort.
4. Harness: `pnpm harness` = Vite dev server mounting the real plugin UI in a browser.
   `@decky/api` mock routes calls to `mock/catalog-server.mjs` + in-memory backend;
   `steam-mock.ts` shows recorded AddShortcut calls on screen. One Playwright smoke:
   search → open game → install → assert the mock recorded the shortcut.
5. On-device: `decky plugin build` zip + documented rsync deploy to a real Deck (manual).

## CI / distribution

GitHub Actions: pnpm build + vitest + pytest + `decky plugin build` zip artifact.
Beta distribution: sideload zip (Decky developer mode). Official Decky store submission
(PR to decky-plugin-database, pnpm lockfile v9, version bumps) is a later, separate step.

## References

- Research notes: `gfn-game-launcher/.scratch/research/2026-08-24-decky-loader-and-plugin-format.md`
- Template: https://github.com/SteamDeckHomebrew/decky-plugin-template
- Precedents: Junk Store (store-approved catalog+shortcut model), NonSteamLaunchersDecky,
  decky-steamgriddb (artwork), SDH-QuickLaunch
