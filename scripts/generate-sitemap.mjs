import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const SITE_URL = 'https://factourati.com';
const BUILD_DATE = new Date().toISOString().slice(0, 10);

const staticRoutes = [
  { path: '/', changefreq: 'weekly', priority: '1.0', lastmod: BUILD_DATE },
  { path: '/blog', changefreq: 'weekly', priority: '0.9', lastmod: BUILD_DATE },
  { path: '/tarifs', changefreq: 'weekly', priority: '0.9', lastmod: BUILD_DATE },
  { path: '/faq', changefreq: 'weekly', priority: '0.8', lastmod: BUILD_DATE },
  { path: '/generateur-facture', changefreq: 'weekly', priority: '0.9', lastmod: BUILD_DATE },
  { path: '/modules', changefreq: 'weekly', priority: '0.8', lastmod: BUILD_DATE },
  { path: '/secteurs', changefreq: 'weekly', priority: '0.8', lastmod: BUILD_DATE },
];

const urls = [...staticRoutes];

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map(
    (url) => `  <url>
    <loc>${SITE_URL}${url.path}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
  ),
  '</urlset>',
  '',
].join('\n');

const outputPath = resolve('public', 'sitemap.xml');
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, xml, 'utf8');

console.log(`Sitemap generated: ${outputPath}`);
