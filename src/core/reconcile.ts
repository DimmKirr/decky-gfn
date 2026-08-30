import type { InstalledGame } from "./types";

export interface ReconcilePorts {
  shortcutExists(appId: number): boolean;
  fileExists(path: string): Promise<boolean>;
  removeShortcut(appId: number): Promise<void>;
  removeFile(path: string): Promise<void>;
  removeRecord(gameId: string): Promise<void>;
}

/**
 * Drop registry entries whose Steam shortcut or AppImage was removed outside
 * the plugin (Steam UI "Remove from library", manual file deletion). Fail-open:
 * if a check errors, the entry is kept.
 */
export async function reconcileInstalled(
  ports: ReconcilePorts,
  entries: InstalledGame[],
): Promise<InstalledGame[]> {
  const kept: InstalledGame[] = [];
  for (const entry of entries) {
    try {
      if (!ports.shortcutExists(entry.appId)) {
        await ports.removeFile(entry.path);
        await ports.removeRecord(entry.gameId);
        continue;
      }
      if (!(await ports.fileExists(entry.path))) {
        await ports.removeShortcut(entry.appId);
        await ports.removeRecord(entry.gameId);
        continue;
      }
    } catch {
      // Can't verify — keep the entry rather than destroy user state.
    }
    kept.push(entry);
  }
  return kept;
}
