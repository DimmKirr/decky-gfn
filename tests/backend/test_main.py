import asyncio
import importlib
import os
import stat
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


def load_plugin(fake_decky, base_url, monkeypatch):
    monkeypatch.setenv("DECKY_GFN_BASE_URL", base_url)
    import main
    importlib.reload(main)
    return main.Plugin()


def test_download_appimage_success(fake_decky, http_fixture, monkeypatch):
    plugin = load_plugin(fake_decky, http_fixture, monkeypatch)
    result = asyncio.run(plugin.download_appimage("good", "Cyberpunk 2077"))
    assert result["ok"] is True
    path = result["value"]["path"]
    assert path.endswith("cyberpunk-2077.AppImage")
    assert os.path.isfile(path)
    assert os.stat(path).st_mode & stat.S_IXUSR  # executable
    assert any(e[0] == "download_progress" for e in fake_decky.emitted)


def test_download_appimage_404(fake_decky, http_fixture, monkeypatch):
    plugin = load_plugin(fake_decky, http_fixture, monkeypatch)
    result = asyncio.run(plugin.download_appimage("bad", "Nope"))
    assert result == {"ok": False, "code": "bad-status", "detail": "HTTP 404"}
    runtime = os.path.join(fake_decky.DECKY_PLUGIN_RUNTIME_DIR, "appimages")
    assert not os.path.exists(os.path.join(runtime, "nope.AppImage"))
    assert not any(f.endswith(".part") for f in os.listdir(runtime))  # no partial left


def test_download_appimage_network_error(fake_decky, monkeypatch):
    plugin = load_plugin(fake_decky, "http://127.0.0.1:1", monkeypatch)  # nothing listens
    result = asyncio.run(plugin.download_appimage("good", "Offline"))
    assert result["ok"] is False
    assert result["code"] == "network"


def test_install_registry_roundtrip(fake_decky, http_fixture, monkeypatch):
    plugin = load_plugin(fake_decky, http_fixture, monkeypatch)
    entry = {"gameId": "u1", "title": "CS2", "appId": 7, "path": "/x", "cmsId": "1", "store": "STEAM"}
    assert asyncio.run(plugin.list_installed()) == []
    asyncio.run(plugin.record_install(entry))
    assert asyncio.run(plugin.list_installed()) == [entry]
    asyncio.run(plugin.record_install({**entry, "appId": 8}))  # upsert by gameId
    assert asyncio.run(plugin.list_installed())[0]["appId"] == 8
    asyncio.run(plugin.remove_install("u1"))
    assert asyncio.run(plugin.list_installed()) == []


def test_remove_appimage_only_inside_own_dir(fake_decky, http_fixture, monkeypatch, tmp_path):
    plugin = load_plugin(fake_decky, http_fixture, monkeypatch)
    outside = tmp_path / "outside.AppImage"
    outside.write_text("x")
    asyncio.run(plugin.remove_appimage(str(outside)))
    assert outside.exists()  # refused: not our directory
    result = asyncio.run(plugin.download_appimage("good", "Doom"))
    path = result["value"]["path"]
    asyncio.run(plugin.remove_appimage(path))
    assert not os.path.exists(path)
