// Serve web/dist under a mount path, the way a GitHub Pages project site does
// (https://<user>.github.io/<repo>/), so the browser drivers can prove that
// every asset path resolves beside the page rather than at the origin root.
//
//   node scripts/serve-mounted.mjs [Day-4-Observatory] [4174]
//   node scripts/planets.mjs http://127.0.0.1:4174/Day-4-Observatory/
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

// The mount is taken as a bare name ("Day-4-Observatory") because a POSIX
// shell on Windows rewrites a leading-slash argument into a filesystem path.
const mount = `/${(process.argv[2] ?? "Day-4-Observatory").replace(/^[/\\]+|[/\\]+$/g, "").split(/[/\\]/).pop()}/`;
const port = Number(process.argv[3] ?? 4174);
const root = fileURLToPath(new URL("../web/dist/", import.meta.url));
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };

createServer(async (req, res) => {
  const path = new URL(req.url ?? "/", "http://x").pathname;
  if (!path.startsWith(mount)) { res.writeHead(404); res.end("not under the mount"); return; }
  let rel = path.slice(mount.length);
  if (rel === "" || rel.endsWith("/")) rel += "index.html";
  rel = normalize(rel).replace(/^([/\\])+/, "");
  if (rel.includes("..")) { res.writeHead(400); res.end(); return; }
  try {
    const body = await readFile(join(root, rel));
    res.writeHead(200, { "content-type": types[extname(rel)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404); res.end("not found");
  }
}).listen(port, "127.0.0.1", () => console.log(`serving web/dist at http://127.0.0.1:${port}${mount}`));
