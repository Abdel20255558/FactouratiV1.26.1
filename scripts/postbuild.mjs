import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

function runScript(scriptPath, label) {
  if (!existsSync(scriptPath)) {
    console.warn(`[postbuild] ${scriptPath} not found. Skipping ${label}.`);
    return 0;
  }

  const result = spawnSync(process.execPath, [scriptPath], {
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(`[postbuild] Failed to run ${label}:`, result.error);
    return 1;
  }

  return result.status ?? 1;
}

const seoGeneratorPath = resolve('scripts', 'generate-seo-pages.mjs');
const seoCheckPath = resolve('scripts', 'check-seo-integrity.mjs');

const generateStatus = runScript(seoGeneratorPath, 'SEO page generation');
if (generateStatus !== 0) {
  process.exit(generateStatus);
}

const checkStatus = runScript(seoCheckPath, 'SEO integrity checks');
process.exit(checkStatus);
