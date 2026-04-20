import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const seoGeneratorPath = resolve('scripts', 'generate-seo-pages.mjs');

if (!existsSync(seoGeneratorPath)) {
  console.warn('[postbuild] scripts/generate-seo-pages.mjs not found. Skipping optional SEO page generation.');
  process.exit(0);
}

const result = spawnSync(process.execPath, [seoGeneratorPath], {
  stdio: 'inherit',
});

if (result.error) {
  console.error('[postbuild] Failed to run SEO page generation:', result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
