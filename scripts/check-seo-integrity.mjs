import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getAllSeoRoutes, SITE_URL } from './seo-shared.mjs';

const DIST_DIR = resolve('dist');
const SITEMAP_PATH = resolve(DIST_DIR, 'sitemap.xml');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readText(filePath) {
  assert(existsSync(filePath), `[seo-check] Missing file: ${filePath}`);
  return readFileSync(filePath, 'utf8');
}

function getHtmlPath(routePath) {
  return routePath === '/' ? resolve(DIST_DIR, 'index.html') : resolve(DIST_DIR, routePath.slice(1), 'index.html');
}

const { staticRoutes, articleRoutes } = await getAllSeoRoutes();
const routes = [...staticRoutes, ...articleRoutes];
const sitemapXml = readText(SITEMAP_PATH);
const sitemapUrls = Array.from(sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((match) => match[1]);

assert(!sitemapUrls.some((url) => url.includes('www.factourati.com')), '[seo-check] Sitemap still contains www URLs.');
assert(
  !sitemapUrls.some((url) => url !== SITE_URL && /\/$/.test(url)),
  '[seo-check] Sitemap still contains trailing-slash URLs.',
);

routes.forEach((route) => {
  const htmlPath = getHtmlPath(route.path);
  const html = readText(htmlPath);
  const canonicalMatches = Array.from(html.matchAll(/<link\s+rel="canonical"\s+href="([^"]+)"\s*\/?>/gi));

  assert(canonicalMatches.length === 1, `[seo-check] ${route.path} should contain exactly one canonical tag.`);
  assert(
    canonicalMatches[0][1] === route.canonicalUrl,
    `[seo-check] ${route.path} canonical mismatch. Expected ${route.canonicalUrl}, found ${canonicalMatches[0][1]}.`,
  );
  assert(
    !canonicalMatches[0][1].includes('www.factourati.com'),
    `[seo-check] ${route.path} canonical still uses www.`,
  );
  assert(
    canonicalMatches[0][1] === SITE_URL || !canonicalMatches[0][1].endsWith('/'),
    `[seo-check] ${route.path} canonical still ends with a trailing slash.`,
  );
  assert(
    sitemapUrls.includes(route.canonicalUrl),
    `[seo-check] ${route.canonicalUrl} is missing from sitemap.xml.`,
  );
});

console.log(`[seo-check] Validated ${routes.length} routes with canonical + sitemap consistency`);
