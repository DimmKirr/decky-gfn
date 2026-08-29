import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const GAMES = JSON.parse(readFileSync(path.join(here, "fixtures/catalog.json"), "utf8"));
const PORT = Number(process.env.PORT ?? 8787);

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  res.setHeader("access-control-allow-origin", "*");

  if (url.pathname === "/api/catalog") {
    const q = (url.searchParams.get("q") ?? "").toLowerCase();
    const page = Number(url.searchParams.get("page") ?? 1);
    const pageSize = Number(url.searchParams.get("pageSize") ?? 50);
    const filtered = GAMES.filter((g) => g.title.toLowerCase().includes(q));
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({
      total: filtered.length,
      page,
      pageSize,
      games: filtered.slice((page - 1) * pageSize, page * pageSize),
    }));
    return;
  }

  if (url.pathname === "/api/appimage") {
    const cmsId = url.searchParams.get("cmsId");
    if (!GAMES.some((g) => g.variants.some((v) => v.cmsId === cmsId))) {
      res.statusCode = 404;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: "unknown cmsId" }));
      return;
    }
    res.setHeader("content-type", "application/x-executable");
    res.end(Buffer.alloc(64 * 1024, 1)); // 64KB stand-in binary
    return;
  }

  res.statusCode = 404;
  res.end("not found");
});

server.listen(PORT, () => console.log(`mock catalog on http://localhost:${PORT}`));
