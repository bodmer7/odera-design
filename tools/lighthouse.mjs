#!/usr/bin/env node
// Lighthouse für ausgewählte Routen, mobil und Desktop, Median aus drei Läufen.
//
//   node tools/lighthouse.mjs [basis-url] [route,route,...]
//
// Standard: https://odera.ch, Startseite, Ablauf, Über mich. Ausgabe als Markdown-Tabelle.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const BASIS = (process.argv[2] || 'https://odera.ch').replace(/\/$/, '');
const ROUTEN = (process.argv[3] || '/,/ablauf/,/ueber-mich/').split(',');
const LAEUFE = Number(process.env.LAEUFE || 3);
const KAT = ['performance', 'accessibility', 'best-practices', 'seo'];
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

const ordner = mkdtempSync(join(tmpdir(), 'lh-'));
const zeilen = ['| Route | Gerät | Performance | Accessibility | Best Practices | SEO | LCP s | CLS |', '|---|---|---|---|---|---|---|---|'];
try {
  for (const r of ROUTEN) for (const geraet of ['mobil', 'desktop']) {
    const werte = [];
    for (let i = 0; i < LAEUFE; i++) {
      const aus = join(ordner, 'lh.json');
      const args = [BASIS + r, '--quiet', '--output=json', `--output-path=${aus}`, `--only-categories=${KAT.join(',')}`,
        '--chrome-flags=--headless=new --no-first-run'];
      if (geraet === 'desktop') args.push('--preset=desktop');
      execFileSync(join(process.cwd(), 'node_modules/.bin/lighthouse'), args, { stdio: 'ignore' });
      const j = JSON.parse(readFileSync(aus, 'utf8'));
      werte.push({ ...Object.fromEntries(KAT.map((k) => [k, Math.round(j.categories[k].score * 100)])),
        lcp: j.audits['largest-contentful-paint'].numericValue / 1000, cls: j.audits['cumulative-layout-shift'].numericValue });
    }
    const m = (k) => median(werte.map((w) => w[k]));
    zeilen.push(`| \`${r}\` | ${geraet} | ${m('performance')} | ${m('accessibility')} | ${m('best-practices')} | ${m('seo')} | ${m('lcp').toFixed(2)} | ${m('cls').toFixed(3)} |`);
    console.error(zeilen.at(-1));
  }
} finally { rmSync(ordner, { recursive: true, force: true }); }
console.log(zeilen.join('\n'));
