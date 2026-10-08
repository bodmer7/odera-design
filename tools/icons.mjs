#!/usr/bin/env node
// Erzeugt das Icon-Set aus favicon.svg (Bildmarke: blaues Quadrat mit weissem «O», Schnitt wie im Logo).
//
//   node tools/icons.mjs
//
// favicon.svg enthält den Buchstaben «O» aus Bricolage Grotesque (800) als Pfad, damit das Symbol ohne
// Schrift überall gleich aussieht. Ergebnis im Wurzelverzeichnis: favicon.ico (16, 32, 48), icon-48/96/192/512.png,
// apple-touch-icon.png (180, ohne Transparenz, mit Innenrand), site.webmanifest.
// Dazu assets/img/odera-logo-512.png für die strukturierten Daten (heller, einfarbiger Hintergrund).
// Die Dateinamen bleiben dauerhaft gleich, Google und Browser merken sich die Adressen.

import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const svg = readFileSync(join(ROOT, 'favicon.svg'));
const BLAU = '#2D4CF0', PAPIER = '#F6F5F1';

const png = (groesse) => sharp(svg, { density: Math.max(72, groesse * 2) }).resize(groesse, groesse).png({ compressionLevel: 9 }).toBuffer();

for (const g of [48, 96, 192, 512]) writeFileSync(join(ROOT, `icon-${g}.png`), await png(g));

// Apple: 180 px, deckend, Marke mit Innenrand auf blauem Grund (iOS rundet die Ecken selbst)
const innen = await sharp(svg, { density: 400 }).resize(148, 148).png().toBuffer();
writeFileSync(join(ROOT, 'apple-touch-icon.png'), await sharp({ create: { width: 180, height: 180, channels: 3, background: BLAU } })
  .composite([{ input: innen, top: 16, left: 16 }]).flatten({ background: BLAU }).png({ compressionLevel: 9 }).toBuffer());

// Logo für Google: quadratisch, heller einfarbiger Hintergrund, Marke mittig
const marke = await sharp(svg, { density: 600 }).resize(384, 384).png().toBuffer();
writeFileSync(join(ROOT, 'assets/img/odera-logo-512.png'), await sharp({ create: { width: 512, height: 512, channels: 3, background: PAPIER } })
  .composite([{ input: marke, top: 64, left: 64 }]).png({ compressionLevel: 9 }).toBuffer());

// favicon.ico mit PNG-Einträgen (16, 32, 48)
const eintraege = await Promise.all([16, 32, 48].map(async (g) => ({ g, daten: await png(g) })));
const kopf = Buffer.alloc(6 + 16 * eintraege.length);
kopf.writeUInt16LE(0, 0); kopf.writeUInt16LE(1, 2); kopf.writeUInt16LE(eintraege.length, 4);
let versatz = kopf.length;
eintraege.forEach(({ g, daten }, i) => {
  const o = 6 + 16 * i;
  kopf.writeUInt8(g, o); kopf.writeUInt8(g, o + 1); kopf.writeUInt8(0, o + 2); kopf.writeUInt8(0, o + 3);
  kopf.writeUInt16LE(1, o + 4); kopf.writeUInt16LE(32, o + 6);
  kopf.writeUInt32LE(daten.length, o + 8); kopf.writeUInt32LE(versatz, o + 12);
  versatz += daten.length;
});
writeFileSync(join(ROOT, 'favicon.ico'), Buffer.concat([kopf, ...eintraege.map((e) => e.daten)]));

writeFileSync(join(ROOT, 'site.webmanifest'), JSON.stringify({
  name: 'ODERA Design',
  short_name: 'ODERA',
  lang: 'de-CH',
  start_url: '/',
  display: 'browser',
  theme_color: BLAU,
  background_color: PAPIER,
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
  ],
}, null, 2) + '\n');

console.log('favicon.ico, icon-48/96/192/512.png, apple-touch-icon.png, site.webmanifest, assets/img/odera-logo-512.png');
