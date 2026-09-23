// Injects the server-rendered page into dist/index.html after `vite build`, so the
// deployed HTML contains the full portfolio text for search engines, link previews,
// and ATS scrapers that don't run JavaScript.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const distDir = path.resolve('dist');
const ssrDir = path.resolve('dist-ssr');
const indexPath = path.join(distDir, 'index.html');

const { render } = await import(pathToFileURL(path.join(ssrDir, 'entry-server.js')).href);
const html = fs.readFileSync(indexPath, 'utf8');
const marker = '<div id="root"></div>';

if (!html.includes(marker)) {
  throw new Error(`prerender: could not find ${marker} in dist/index.html`);
}

fs.writeFileSync(indexPath, html.replace(marker, `<div id="root">${render()}</div>`));
fs.rmSync(ssrDir, { recursive: true, force: true });
console.log('prerender: wrote static HTML into dist/index.html');
