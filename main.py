import asyncio
import json
import os
import re
import tempfile
import urllib.error
import urllib.request

import decky

CHUNK = 256 * 1024


def _base_url() -> str:
    return os.environ.get("DECKY_GFN_BASE_URL", "https://gfn.atd.sh")


def _slug(title: str) -> str:
    s = re.sub(r"[^A-Za-z0-9]+", "-", title).strip("-").lower()
    return s or "game"


def _appimage_dir() -> str:
    d = os.path.join(decky.DECKY_PLUGIN_RUNTIME_DIR, "appimages")
    os.makedirs(d, exist_ok=True)
    return d


def _installed_path() -> str:
    os.makedirs(decky.DECKY_PLUGIN_SETTINGS_DIR, exist_ok=True)
    return os.path.join(decky.DECKY_PLUGIN_SETTINGS_DIR, "installed.json")


def _read_installed() -> list:
    try:
        with open(_installed_path()) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def _write_installed(entries: list) -> None:
    tmp = _installed_path() + ".tmp"
    with open(tmp, "w") as f:
        json.dump(entries, f, indent=2)
    os.replace(tmp, _installed_path())


def _download(url: str, dest: str, progress) -> None:
    """Stream url to dest atomically; chmod +x. Runs in a worker thread."""
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(dest), suffix=".part")
    try:
        with urllib.request.urlopen(url, timeout=60) as res, os.fdopen(fd, "wb") as out:
            total = int(res.headers.get("Content-Length") or 0) or None
            received = 0
            while True:
                chunk = res.read(CHUNK)
                if not chunk:
                    break
                out.write(chunk)
                received += len(chunk)
                progress(received, total)
        os.chmod(tmp, 0o755)
        os.replace(tmp, dest)
    except BaseException:
        try:
            os.unlink(tmp)
        except FileNotFoundError:
            pass
        raise


class Plugin:
    async def download_appimage(self, cms_id: str, title: str) -> dict:
        dest = os.path.join(_appimage_dir(), f"{_slug(title)}.AppImage")
        url = f"{_base_url()}/api/appimage?cmsId={cms_id}"
        loop = asyncio.get_running_loop()

        def progress(received: int, total):
            asyncio.run_coroutine_threadsafe(
                decky.emit("download_progress", {"cmsId": cms_id, "received": received, "total": total}),
                loop,
            )

        try:
            await asyncio.to_thread(_download, url, dest, progress)
        except urllib.error.HTTPError as err:
            return {"ok": False, "code": "bad-status", "detail": f"HTTP {err.code}"}
        except OSError as err:
            code = "disk-full" if getattr(err, "errno", None) == 28 else "network"
            return {"ok": False, "code": code, "detail": str(err)}
        return {"ok": True, "value": {"path": dest}}

    async def remove_appimage(self, path: str) -> dict:
        # Only ever delete files inside our own appimages dir.
        if os.path.dirname(os.path.abspath(path)) == _appimage_dir():
            try:
                os.unlink(path)
            except FileNotFoundError:
                pass
        return {"ok": True}

    async def list_installed(self) -> list:
        return _read_installed()

    async def record_install(self, entry: dict) -> dict:
        entries = [e for e in _read_installed() if e.get("gameId") != entry.get("gameId")]
        entries.append(entry)
        _write_installed(entries)
        return {"ok": True}

    async def remove_install(self, game_id: str) -> dict:
        _write_installed([e for e in _read_installed() if e.get("gameId") != game_id])
        return {"ok": True}

    async def _main(self):
        decky.logger.info("decky-gfn backend up")

    async def _unload(self):
        pass
