#!/usr/bin/env node
// Gerätebilder der Musterprojekte für odera.ch (Startseite, Musterprojekte, Branchenseiten), aus den echten Seiten fotografiert.
//
//   node tools/screenshots-muster.mjs
//
// Pro Musterprojekt entstehen in assets/img/ je AVIF und WebP:
//   musterprojekt-<name>-desktop-1280 / -2560   16:9, Startbildschirm am Computer (Fenster 1280 × 720, doppelt aufgelöst)
//   musterprojekt-<name>-handy-390 / -780       390 × 760, Startbildschirm auf dem Handy (dreifach aufgenommen)
// Die Seiten zeigen die Bilder mit srcset in genau diesem Seitenverhältnis: nichts wird abgeschnitten, und Bildschirme
// mit hoher Pixeldichte bekommen die doppelt aufgelöste Fassung.
// Die Beispiel-Leiste wird ausgeblendet (wie im Overlay, html.im-rahmen), sie gehört nicht zum Entwurf.
// Nach einer Änderung an einem Musterprojekt erneut ausführen und danach node tools/seo-build.mjs.

import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { ROOT } from './lib/browser.mjs';

const MUSTER = [
  // name: Dateiname, pfad: Startseite des Musters, vorher: Zustand vor der Aufnahme
  { name: 'schreinerei', pfad: '/musterprojekte/doppelmeter/' },
  { name: 'solar', pfad: '/musterprojekte/firstlicht/', vorher: () => {
    // Szene auf Sommer, 12 Uhr: volle Produktion, Speicher geladen, Einspeisung
    const r = document.querySelector('[data-szene-zeit]');
    if (r) { r.value = '12'; r.dispatchEvent(new Event('input', { bubbles: true })); }
  } },
];

const TYPEN = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  '.webp': 'image/webp', '.avif': 'image/avif', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json', '.ico': 'image/x-icon' };
const server = createServer((req, res) => {
  let datei = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (existsSync(datei) && statSync(datei).isDirectory()) datei = join(datei, 'index.html');
  if (!existsSync(datei)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPEN[extname(datei)] || 'application/octet-stream' });
  res.end(readFileSync(datei));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const basis = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'chrome' });

async function aufnahme(m, { geraet, breite, hoehe, faktor, groessen }) {
  const handy = geraet === 'handy';
  const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe }, deviceScaleFactor: faktor, isMobile: handy, hasTouch: handy,
    reducedMotion: 'reduce', colorScheme: 'light' });
  const p = await ctx.newPage();
  await p.goto(basis + m.pfad, { waitUntil: 'networkidle' });
  await p.evaluate(() => {
    document.documentElement.classList.add('im-rahmen');
    const l = document.querySelector('.beispiel-leiste'); if (l) l.style.display = 'none';
  });
  if (m.vorher) await p.evaluate(m.vorher);
  await p.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].filter((i) => i.getBoundingClientRect().top < innerHeight).map((i) => i.decode().catch(() => {})));
  });
  await p.waitForTimeout(700);
  const png = await p.screenshot({ type: 'png' });
  await ctx.close();
  for (const b of groessen) {
    const h = Math.round(b * hoehe / breite);
    const bild = sharp(png).resize(b, h, { fit: 'cover', position: 'top', kernel: 'lanczos3' });
    const datei = `musterprojekt-${m.name}-${geraet}-${b}`;
    const webp = await bild.clone().webp({ quality: 82, effort: 6, smartSubsample: true }).toFile(join(ROOT, 'assets/img', datei + '.webp'));
    const avif = await bild.clone().avif({ quality: 60, effort: 6 }).toFile(join(ROOT, 'assets/img', datei + '.avif'));
    console.log(`assets/img/${datei}`.padEnd(48), `${b} × ${h}`, `webp ${Math.round(webp.size / 1024)} KB`, `avif ${Math.round(avif.size / 1024)} KB`);
  }
}

try {
  for (const m of MUSTER) {
    await aufnahme(m, { geraet: 'desktop', breite: 1280, hoehe: 720, faktor: 2, groessen: [1280, 2560] });
    await aufnahme(m, { geraet: 'handy', breite: 390, hoehe: 760, faktor: 3, groessen: [390, 780] });
  }
} finally {
  await browser.close();
  server.close();
}
