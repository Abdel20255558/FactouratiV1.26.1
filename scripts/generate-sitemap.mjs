import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { getAllSeoRoutes, SITE_URL } from './seo-shared.mjs';

const { staticRoutes, articleRoutes } = await getAllSeoRoutes();

const urls = [...staticRoutes, ...articleRoutes];

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map(
    (url) => `  <url>
    <loc>${url.canonicalUrl}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`,
  ),
  '</urlset>',
  '',
].join('\n');

const outputPath = resolve('public', 'sitemap.xml');
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, xml, 'utf8');

console.log(`[sitemap] Generated ${urls.length} canonical URLs for ${SITE_URL}`);
