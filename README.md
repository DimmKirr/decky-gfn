# decky-gfn

Decky Loader plugin that browses the GeForce NOW catalog inside Steam's Gamepad UI
and installs games into your Steam library as non-Steam shortcuts (AppImage download
+ live `SteamClient.Apps.AddShortcut` — no Steam restart).

- **Frontend** (`src/`): TypeScript/React on `@decky/ui` + `@decky/api`. QAM panel with
  a Browse entry and installed list, plus a full-page `/gfn-catalog` route (debounced
  search, banner tile grid, detail page with store-variant picker).
- **Backend** (`main.py`): thin Python file-ops layer — streamed AppImage download with
  progress events, chmod +x, `installed.json` registry.

Shortcuts are created with launch options `LD_PRELOAD= %command%` — Steam's overlay
injection (`gameoverlayrenderer.so`) otherwise kills AppImage launches in Desktop Mode.

## Develop

```sh
pnpm install        # pnpm 9
pnpm typecheck      # tsc
pnpm build          # rollup → dist/index.js
pnpm test           # vitest (core + components, decky stubs)
pytest -q           # python backend (fake decky module)
```

### Browser harness (no Steam needed)

```sh
pnpm mock:catalog   # terminal 1 — mock /api/catalog + /api/appimage on :8787
pnpm harness        # terminal 2 — Vite serving the real plugin UI on :5173
```

Open http://localhost:5173 — browse, search, install with progress, Play/Uninstall.
A fake `SteamClient` logs every AddShortcut/artwork call on screen.

```sh
pnpm test:e2e       # Playwright smoke over the harness (starts both servers itself)
```

On a nix-based dev container the downloaded Playwright chromium can't resolve
system libs; use the nix-patched browsers instead:

```sh
export PLAYWRIGHT_BROWSERS_PATH=$(nix build nixpkgs#playwright-driver.browsers --no-link --print-out-paths)
export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true
pnpm test:e2e
```

(Keep `@playwright/test` on the same minor version as nixpkgs' `playwright-driver`.)

## Package & deploy

```sh
pnpm package        # → decky-gfn.zip
```

Install on the Deck via Decky → Settings → Developer → Install Plugin from ZIP,
or rsync `build/decky-gfn/` to `/home/deck/homebrew/plugins/`
(VS Code task "deploy to deck" does this over the `deck@steamdeck` SSH host).

## Release

Tag a version to publish a sideload zip as a GitHub Release:

```sh
git tag v0.1.0 && git push origin v0.1.0
```

The `release` workflow builds, tests, packages, and attaches `decky-gfn.zip`
with generated release notes. (Official Decky store submission is a separate
decky-plugin-database PR — tracked in DIMM-469.)

## Notes

- This repo is bind-mounted between macOS and Linux: `node_modules` holds
  platform-native binaries — delete it when switching sides.
- The catalog is served by the launcher site's `GET /api/catalog` (contract v1);
  `mock/` only exists for offline dev and CI.
