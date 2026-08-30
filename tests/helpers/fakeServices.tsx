import { render } from "@testing-library/react";
import { vi } from "vitest";
import type { ReactElement } from "react";
import { ServicesProvider, type Services } from "../../src/services";
import type { InstalledGame } from "../../src/core/types";

export function makeFakeServices(overrides: Partial<Services> = {}): Services {
  return {
    catalog: { getPage: vi.fn(async () => ({ total: 0, page: 1, pageSize: 50, games: [] })) },
    install: {
      download: vi.fn(async () => ({ ok: true as const, value: { path: "/data/x.AppImage" } })),
      addShortcut: vi.fn(async () => 111),
      setArtwork: vi.fn(async (_appId: number, _art: { imageUrl: string; heroUrl?: string }) => {}),
      removeFile: vi.fn(async () => {}),
      recordInstall: vi.fn(async () => {}),
    },
    uninstall: {
      removeShortcut: vi.fn(async () => {}),
      removeFile: vi.fn(async () => {}),
      removeRecord: vi.fn(async () => {}),
    },
    listInstalled: vi.fn(async (): Promise<InstalledGame[]> => []),
    resolveImage: vi.fn(async (url: string) => url),
    onDownloadProgress: vi.fn(() => () => {}),
    openCatalog: vi.fn(),
    navigateToApp: vi.fn(),
    toast: vi.fn(),
    ...overrides,
  };
}

export function renderWithServices(ui: ReactElement, services: Services) {
  return render(<ServicesProvider value={services}>{ui}</ServicesProvider>);
}
