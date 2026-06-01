/**
 * Copy error pages to root HTML files for static hosts (Netlify, Cloudflare, etc.).
 * Astro emits 404.html automatically; 500/403/503 need a root-level copy.
 */
import { copyFileSync, existsSync } from 'node:fs';

for (const code of ['500', '403', '503']) {
  const src = `dist/${code}/index.html`;
  const dest = `dist/${code}.html`;
  if (existsSync(src)) {
    copyFileSync(src, dest);
    console.log(`[copy-error-pages] ${dest}`);
  }
}
