// Vice Cover Studio's entrypoint for make.fun's gta6-cover-art-01 (Node 22,
// standard library only): it hands the app in. It copies this directory's
// app/ and screenshots/ to /output and writes /output/dossier.json with the
// vendored make.fun library, which the scorer rebuilds byte for byte.
//
// The app itself is plain static files under app/ (index.html plus its ES
// modules, the two sample photos, no library and no network request), so any
// static server can serve it; `node serve.ts` does that locally on
// http://localhost:8080. Outside the grader's container, MAKEFUN_OUTPUT_DIR
// stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// The scorer's own caps for this bounty (its gate.json): only text_max_bytes
// shapes the dossier's bytes; the others refuse an entry the scorer would
// refuse — more than 4 screenshots or one over 256 KiB; more than 993 files
// in app/ or 48 MiB of app files in all, or a path under app/ over 1000 bytes.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** Copies one tree from beside this file into /output, replacing any old copy. */
function handIn(name) {
  const source = join(here, name);
  const target = join(outDir, name);
  if (!existsSync(source)) return;
  rmSync(target, { recursive: true, force: true });
  cpSync(source, target, { recursive: true });
}

mkdirSync(outDir, { recursive: true });
handIn('app');
handIn('screenshots');
writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, DOSSIER_CAPS));
