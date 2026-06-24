// Postbuild step: the Medusa admin bundler writes a placeholder favicon
// (`<link rel="icon" href="data:," data-placeholder-favicon />`) into the
// generated admin index.html, and nothing replaces it — so the dashboard at
// /app ships with no icon. This patches the built index.html to use the R²
// mark (the same SVG the storefront uses) as an inline data-URI favicon, so no
// extra asset path or request is involved. Idempotent and never fails the
// build: if the file or placeholder is missing it just warns and exits 0.

import { existsSync } from "node:fs"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"

// R² mark — black tile with the white "R²" pixel glyph. Kept in sync with
// apps/storefront/app/icon.svg.
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 640 640"><rect fill="#000" width="640" height="640"/><path fill="#fff" d="M64 128h256v64H64zM64 192h64v64H64zM320 192h64v64h-64zM64 256h256v64H64zM64 320h64v64H64zM192 320h64v64h-64zM64 384h64v64H64zM256 384h64v64h-64zM64 448h64v64H64zM320 448h64v64h-64zM448 64h96v48h-96zM496 112h48v48h-48zM448 160h96v48h-96zM448 208h48v48h-48zM448 256h96v48h-96z"/></svg>`

const FAVICON_LINK = `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,${encodeURIComponent(SVG)}" />`

const htmlPath = path.resolve(".medusa/server/public/admin/index.html")

if (!existsSync(htmlPath)) {
  console.warn(`[patch-admin-favicon] ${htmlPath} not found, skipping`)
  process.exit(0)
}

let html = await readFile(htmlPath, "utf8")
const placeholder = /<link\s+rel="icon"[^>]*data-placeholder-favicon[^>]*\/?>/

if (placeholder.test(html)) {
  html = html.replace(placeholder, FAVICON_LINK)
} else if (html.includes('type="image/svg+xml"')) {
  console.log("[patch-admin-favicon] favicon already applied, nothing to do")
  process.exit(0)
} else {
  // Placeholder shape changed across versions; fall back to injecting into <head>.
  html = html.replace("</head>", `    ${FAVICON_LINK}\n        </head>`)
}

await writeFile(htmlPath, html)
console.log("[patch-admin-favicon] applied R² favicon to admin index.html")
