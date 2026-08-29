import http.server
import logging
import sys
import threading
import types

import pytest


@pytest.fixture()
def fake_decky(tmp_path, monkeypatch):
    """Install a fake 'decky' module BEFORE main.py is imported."""
    m = types.ModuleType("decky")
    m.DECKY_PLUGIN_RUNTIME_DIR = str(tmp_path / "runtime")
    m.DECKY_PLUGIN_SETTINGS_DIR = str(tmp_path / "settings")
    m.DECKY_PLUGIN_LOG_DIR = str(tmp_path / "log")
    m.logger = logging.getLogger("decky-fake")
    m.emitted = []

    async def emit(event, *args):
        m.emitted.append((event, args))

    m.emit = emit
    monkeypatch.setitem(sys.modules, "decky", m)
    # Force re-import of main against the fake
    sys.modules.pop("main", None)
    return m


class _Handler(http.server.BaseHTTPRequestHandler):
    payload = b"\x7fELF" + b"\x01" * (128 * 1024)

    def do_GET(self):
        if self.path.startswith("/api/appimage") and "cmsId=good" in self.path:
            self.send_response(200)
            self.send_header("Content-Length", str(len(self.payload)))
            self.end_headers()
            self.wfile.write(self.payload)
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, *args):
        pass


@pytest.fixture()
def http_fixture():
    server = http.server.HTTPServer(("127.0.0.1", 0), _Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield f"http://127.0.0.1:{server.server_address[1]}"
    server.shutdown()
