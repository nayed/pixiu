// Captures docs/artboards/*.png from the debug build: each board is a page of the artboards
// entrypoint, opened in headless Chrome at 2x. Run it with `pnpm artboards`, which builds first.
// Set CHROME to the browser to use when it is not on the path as google-chrome.

import { execFile } from "node:child_process";
import { createReadStream, existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join, resolve, sep } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const built = join(root, ".output", "chrome-mv3-debug");
const out = join(root, "docs", "artboards");
const chrome = process.env.CHROME ?? "google-chrome";

/** Each kind of board at its size in CSS pixels. The pictures are twice that. */
const SIZES = {
  popup: [360, 520],
  "toolbar-icon": [960, 520],
  "on-page-overlay": [1200, 720],
};

const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

if (!existsSync(join(built, "artboards.html"))) {
  console.error("No debug build with the artboards page. Run `pnpm artboards`, which builds it.");
  process.exit(1);
}

const boards = JSON.parse(
  readFileSync(join(root, "src", "entrypoints", "artboards", "boards.json"), "utf8"),
);

// The built pages load their files from the site root, so they need a server, not file://.
const server = createServer((request, response) => {
  const path = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
  const file = join(built, path);
  if (!file.startsWith(built + sep) || !existsSync(file) || statSync(file).isDirectory()) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(response);
});
await new Promise((ready) => server.listen(0, "127.0.0.1", ready));
const { port } = server.address();

// A throwaway profile, so this never touches the browser you use.
const profile = mkdtempSync(join(tmpdir(), "pixiu-artboards-"));
try {
  for (const { name, kind } of boards) {
    const [width, height] = SIZES[kind];
    const file = join(out, `${name}.png`);
    await run(chrome, [
      "--headless=new",
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-gpu",
      "--hide-scrollbars",
      // The pets stand still, and the hatching shows its last frame.
      "--force-prefers-reduced-motion",
      "--force-device-scale-factor=2",
      `--window-size=${width},${height}`,
      // Time for the fonts to load and the sprites to be drawn.
      "--virtual-time-budget=5000",
      `--screenshot=${file}`,
      `http://127.0.0.1:${port}/artboards.html?board=${name}`,
    ]);
    console.log(`${name}.png`);
  }
} finally {
  server.close();
  rmSync(profile, { recursive: true, force: true });
}
