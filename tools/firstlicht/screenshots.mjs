#!/usr/bin/env node
// Aufnahmen des Musterprojekts Firstlicht für odera.ch (Startseite und Musterprojekte).
//   node tools/firstlicht/screenshots.mjs        (npm run firstlicht:screens)
//
// Startet einen kleinen Server und Chromium (Playwright), fotografiert die echte Seite und schreibt
// AVIF und WebP mit festen Grössen nach assets/img/:
//   muster-firstlicht-desktop[-dunkel]   1120 × 630  Startbildschirm am Computer
//   muster-firstlicht-handy[-dunkel]      300 × 585  Startbildschirm auf dem Handy
//   muster-firstlicht-rechner             960 × 495  Solarrechner (Karte auf der Startseite)
// Die Beispiel-Leiste oben wird abgeschnitten, sie gehört nicht zum Entwurf. Die Szene steht auf
// Sonnenaufgang im Sommer, damit das erste Licht auf dem First zu sehen ist.

import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ZIEL = join(ROOT, 'assets/img');
const TYPEN = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.json': 'application/json', '.ico': 'image/x-icon' };
const server = createServer((req, res) => {
  let datei = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (existsSync(datei) && statSync(datei).isDirectory()) datei = join(datei, 'index.html');
  if (!existsSync(datei)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPEN[extname(datei)] || 'application/octet-stream' });
  res.end(readFileSync(datei));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const basis = `http://127.0.0.1:${server.address().port}/musterprojekte/firstlicht/`;
const browser = await chromium.launch();

async function aufnahme({ pfad, breite, hoehe, faktor, handy, dunkel, zielB, zielH, datei, ausschnittH, morgen, abElement }) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe }, deviceScaleFactor: faktor, isMobile: handy, hasTouch: handy,
    reducedMotion: 'reduce', colorScheme: dunkel ? 'dark' : 'light' });
  const p = await ctx.newPage();
  await p.goto(basis + pfad, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  if (morgen) {
    await p.evaluate(() => {
      const r = document.querySelector('[data-szene-zeit]');
      if (r) { r.value = '6.25'; r.dispatchEvent(new Event('input', { bubbles: true })); }
    });
  }
  await p.waitForTimeout(500);
  const leiste = await p.evaluate(() => Math.round(document.querySelector('.beispiel-leiste').getBoundingClientRect().height));
  const start = abElement ? await p.evaluate((s) => Math.round(document.querySelector(s).getBoundingClientRect().top + scrollY - 24), abElement) : leiste;
  const png = await p.screenshot({ clip: { x: 0, y: start, width: breite, height: ausschnittH }, type: 'png', fullPage: true });
  await ctx.close();
  const bild = sharp(png).resize(zielB, zielH, { fit: 'cover', position: 'top' });
  const webp = await bild.clone().webp({ quality: 72, effort: 6 }).toFile(join(ZIEL, `${datei}.webp`));
  const avif = await bild.clone().avif({ quality: 52, effort: 6 }).toFile(join(ZIEL, `${datei}.avif`));
  console.log(`assets/img/${datei}`.padEnd(46), `${zielB} × ${zielH}`, `webp ${Math.round(webp.size / 1024)} KB`, `avif ${Math.round(avif.size / 1024)} KB`);
}

try {
  for (const dunkel of [false, true]) {
    const s = dunkel ? '-dunkel' : '';
    await aufnahme({ pfad: 'index.html', breite: 1280, hoehe: 800, faktor: 1, handy: false, dunkel, zielB: 1120, zielH: 630, datei: `muster-firstlicht-desktop${s}`, ausschnittH: 720, morgen: true });
    await aufnahme({ pfad: 'index.html', breite: 390, hoehe: 844, faktor: 2, handy: true, dunkel, zielB: 300, zielH: 585, datei: `muster-firstlicht-handy${s}`, ausschnittH: 760, morgen: true });
  }
  await aufnahme({ pfad: 'rechner.html?f=75&sk=1', breite: 1280, hoehe: 900, faktor: 1, handy: false, dunkel: false, zielB: 960, zielH: 495, datei: 'muster-firstlicht-rechner', ausschnittH: 660, abElement: '.rechner' });
} finally {
  await browser.close();
  server.close();
}
