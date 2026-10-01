#!/usr/bin/env node
// Vorschaubilder der Musterseite Doppelmeter für odera.ch, aus der echten Seite fotografiert.
//
//   node tools/screenshots-doppelmeter.mjs
//
// Startet einen kleinen Webserver für das Repository und Chrome ohne Fenster, öffnet
// /musterprojekte/doppelmeter/ und schreibt WebP-Dateien mit festen Grössen nach assets/img/:
//   muster-doppelmeter-desktop.webp    1120 × 658  Startbildschirm am Computer (Hero, Musterprojekte)
//   muster-doppelmeter-handy.webp       300 × 585  Startbildschirm auf dem Handy (Hero, Musterprojekte)
//   muster-doppelmeter-werkstatt.webp   960 × 495  Seite «Werkstatt» (Karte auf der Startseite)
// Die Beispiel-Leiste oben wird abgeschnitten, sie gehört nicht zum Entwurf.
// Nach einer Änderung an Doppelmeter erneut ausführen und danach node tools/seo-build.mjs.

import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { ROOT, startChrome } from './lib/browser.mjs';

const TYPEN = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.webp': 'image/webp', '.avif': 'image/avif', '.jpg': 'image/jpeg', '.png': 'image/png' };
const server = createServer((req, res) => {
  let datei = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (existsSync(datei) && statSync(datei).isDirectory()) datei = join(datei, 'index.html');
  if (!existsSync(datei)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPEN[extname(datei)] || 'application/octet-stream' });
  res.end(readFileSync(datei));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const basis = `http://127.0.0.1:${server.address().port}`;
const chrome = await startChrome();
const { send } = chrome;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const wert = async (ausdruck) => (await send('Runtime.evaluate', { expression: ausdruck, returnByValue: true, awaitPromise: true })).result.value;

// Seite laden, warten bis Schriften und alle Bilder im Bild da sind, Leistenhöhe messen
async function laden(pfad, breite, hoehe, faktor, handy) {
  await send('Emulation.setDeviceMetricsOverride', { width: breite, height: hoehe, deviceScaleFactor: faktor, mobile: handy });
  await send('Page.navigate', { url: basis + pfad });
  await sleep(600);
  await wert(`(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.getBoundingClientRect().top<${hoehe * 2}).map(i=>i.decode().catch(()=>{})));return 1})()`);
  await sleep(300);
  return wert(`Math.round(document.querySelector('.beispiel-leiste').getBoundingClientRect().height)`);
}

// Ausschnitt fotografieren und im Browser als WebP mit fester Grösse kodieren
async function bild(x, y, w, h, faktor, zielB, zielH, qualitaet, datei) {
  const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x, y, width: w, height: h, scale: 1 }, captureBeyondViewport: true });
  const daten = await wert(`(async()=>{const i=new Image();i.src='data:image/png;base64,${shot.data}';await i.decode();
    const c=document.createElement('canvas');c.width=${zielB};c.height=${zielH};const g=c.getContext('2d');g.imageSmoothingQuality='high';
    g.drawImage(i,0,0,i.width,i.height,0,0,${zielB},${zielH});return c.toDataURL('image/webp',${qualitaet});})()`);
  const buf = Buffer.from(daten.split(',')[1], 'base64');
  writeFileSync(join(ROOT, 'assets', 'img', datei), buf);
  console.log(`assets/img/${datei}`.padEnd(42), `${zielB} × ${zielH}`, Math.round(buf.length / 1024) + ' KB');
}

try {
  let leiste = await laden('/musterprojekte/doppelmeter/', 1280, 800, 1, false);
  await bild(0, leiste, 1280, 752, 1, 1120, 658, 0.66, 'muster-doppelmeter-desktop.webp');
  leiste = await laden('/musterprojekte/doppelmeter/', 390, 844, 2, true);
  await bild(0, leiste, 390, 760, 2, 300, 585, 0.74, 'muster-doppelmeter-handy.webp');
  leiste = await laden('/musterprojekte/doppelmeter/werkstatt.html', 1280, 800, 1, false);
  await bild(0, leiste, 1280, 660, 1, 960, 495, 0.56, 'muster-doppelmeter-werkstatt.webp');
} finally {
  chrome.schliessen();
  server.close();
}
