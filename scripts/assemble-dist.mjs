/**
 * Lays the seven builds out as one publishable folder.
 *
 * Each app is still built entirely on its own, exactly as it would be if it
 * belonged to a different team on a different pipeline. This step only decides
 * where the finished folders are stacked so a single static host can serve
 * them, and the layout has to match the deployed addresses in
 * `scripts/deploy-target.ts`. Change one and change the other.
 *
 * Run after `MFE_TARGET=netlify bun run build`. Building without that variable
 * bakes localhost URLs into the output, so this script refuses to assemble a
 * build that was not made for deployment.
 */
import { access, cp, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist');

const APPS = [
  { pkg: 'compare', to: '.' },
  { pkg: 'option1-shared/shell', to: 'option1/shell' },
  { pkg: 'option1-shared/app1', to: 'option1/app1' },
  { pkg: 'option1-shared/app2', to: 'option1/app2' },
  { pkg: 'option2-independent/shell', to: 'option2/shell' },
  { pkg: 'option2-independent/app1', to: 'option2/app1' },
  { pkg: 'option2-independent/app2', to: 'option2/app2' },
];

if (process.env.MFE_TARGET !== 'netlify') {
  console.error(
    'assemble-dist: MFE_TARGET is not set to netlify, so the builds point at localhost.\n' +
      'Run `bun run build:netlify` instead of calling this script directly.',
  );
  process.exit(1);
}

const missing = [];
for (const app of APPS) {
  try {
    await access(join(root, app.pkg, 'dist', 'index.html'));
  } catch {
    missing.push(`${app.pkg}/dist`);
  }
}

if (missing.length > 0) {
  console.error(`assemble-dist: nothing built yet in:\n  ${missing.join('\n  ')}`);
  process.exit(1);
}

await rm(out, { recursive: true, force: true });

for (const app of APPS) {
  const to = join(out, app.to);
  await cp(join(root, app.pkg, 'dist'), to, { recursive: true });
  console.log(`  ${app.pkg}/dist  ->  dist/${app.to === '.' ? '' : `${app.to}/`}`);
}

console.log(`\nassemble-dist: ${APPS.length} apps in dist/`);
