#!/usr/bin/env node
// Lighthouse mobil für alle Firstlicht-Seiten, Median aus drei Läufen.
//   CHROME_PATH=/pfad/zu/chrome node tools/firstlicht/lighthouse.mjs [läufe]
//   PROFIL=desktop ...   wie die Ladezeit-Angabe auf odera.ch (Lighthouse Desktop)
// Ergebnis: Konsole und _lokal/firstlicht-qa/lighthouse.json

import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, extname, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import * as chromeLauncher from 'chrome-launcher';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const LAEUFE = Number(process.argv[2] || 3);
const SEITEN = process.env.SEITEN ? process.env.SEITEN.split(',') : ['index', 'rechner', 'leistungen', 'projekte', 'ueber-uns', 'kontakt'];
const TYPEN = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };
// Server wie bei GitHub Pages: Textdateien gzip-komprimiert, Schriften und Bilder unverändert
const server = createServer((req, res) => {
  let datei = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (existsSync(datei) && statSync(datei).isDirectory()) datei = join(datei, 'index.html');
  if (!existsSync(datei)) { res.writeHead(404); res.end(); return; }
  const typ = TYPEN[extname(datei)] || 'application/octet-stream';
  const text = /text|javascript|json|svg/.test(typ) && /gzip/.test(req.headers['accept-encoding'] || '');
  res.writeHead(200, { 'content-type': typ, 'cache-control': 'max-age=600', ...(text ? { 'content-encoding': 'gzip' } : {}) });
  res.end(text ? gzipSync(readFileSync(datei)) : readFileSync(datei));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const basis = `http://127.0.0.1:${server.address().port}/musterprojekte/firstlicht/`;
const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox'] });
const median = (xs) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const ergebnis = {};
try {
  for (const s of SEITEN) {
    const laeufe = [];
    for (let i = 0; i < LAEUFE; i++) {
      const desktop = process.env.PROFIL === 'desktop';
      const r = desktop
        ? await lighthouse(basis + s + '.html', { port: chrome.port, output: 'json', logLevel: 'error' }, desktopConfig)
        : await lighthouse(basis + s + '.html', { port: chrome.port, output: 'json', logLevel: 'error', formFactor: 'mobile', screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75 } });
      const c = r.lhr.categories;
      const a = r.lhr.audits;
      const fehlgeschlagen = Object.values(c.seo.auditRefs).map((x) => a[x.id]).filter((x) => x && x.score === 0).map((x) => x.id);
      laeufe.push({ perf: Math.round(c.performance.score * 100), a11y: Math.round(c.accessibility.score * 100), bp: Math.round(c['best-practices'].score * 100),
        seo: Math.round(c.seo.score * 100), lcp: a['largest-contentful-paint'].numericValue, cls: a['cumulative-layout-shift'].numericValue, tbt: a['total-blocking-time'].numericValue,
        gewicht: a['total-byte-weight'].numericValue, seoFehlt: fehlgeschlagen,
        shifts: (a['layout-shifts']?.details?.items || []).map((x) => `${x.score.toFixed(3)} ${(x.node?.snippet || '').slice(0, 50)} Ursache: ${JSON.stringify(x.subItems?.items || [])}`),
        bpFehlt: Object.values(c['best-practices'].auditRefs).map((x) => a[x.id]).filter((x) => x && x.score === 0).map((x) => x.id),
        a11yFehlt: Object.values(c.accessibility.auditRefs).map((x) => a[x.id]).filter((x) => x && x.score === 0).map((x) => x.id) });
    }
    const m = (k) => median(laeufe.map((l) => l[k]));
    ergebnis[s] = { performance: m('perf'), accessibility: m('a11y'), bestPractices: m('bp'), seo: m('seo'), lcpMs: Math.round(m('lcp')), cls: Math.round(m('cls') * 1000) / 1000,
      tbtMs: Math.round(m('tbt')), gewichtKb: Math.round(m('gewicht') / 1024), seoFehlt: laeufe[0].seoFehlt, bpFehlt: laeufe[0].bpFehlt, a11yFehlt: laeufe[0].a11yFehlt, shifts: laeufe.find((l) => l.shifts.length)?.shifts || [] };
    console.log(s.padEnd(11), JSON.stringify(ergebnis[s]));
  }
} finally {
  await chrome.kill();
  server.close();
}
mkdirSync(join(ROOT, '_lokal/firstlicht-qa'), { recursive: true });
writeFileSync(join(ROOT, `_lokal/firstlicht-qa/lighthouse${process.env.PROFIL === 'desktop' ? '-desktop' : ''}.json`), JSON.stringify({ datum: new Date().toISOString(), laeufe: LAEUFE, ergebnis }, null, 2));
