#!/usr/bin/env node
// Rastert die Logo-Dateien: favicon.ico (16, 32, 48), apple-touch-icon.png (180), og-image.png (1200 × 630).
//   node tools/firstlicht/logo-raster.mjs   (nach python3 tools/firstlicht/logo.py)
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ORDNER = join(dirname(fileURLToPath(import.meta.url)), '../../musterprojekte/firstlicht/assets/logo');
const favicon = readFileSync(join(ORDNER, 'favicon.svg'));

// ICO-Container mit PNG-Einträgen
const groessen = [16, 32, 48];
const pngs = await Promise.all(groessen.map((g) => sharp(favicon, { density: 600 }).resize(g, g).png().toBuffer()));
const kopf = Buffer.alloc(6 + 16 * pngs.length);
kopf.writeUInt16LE(0, 0); kopf.writeUInt16LE(1, 2); kopf.writeUInt16LE(pngs.length, 4);
let offset = kopf.length;
pngs.forEach((png, i) => {
  const e = 6 + i * 16;
  kopf.writeUInt8(groessen[i] % 256, e); kopf.writeUInt8(groessen[i] % 256, e + 1);
  kopf.writeUInt16LE(1, e + 4); kopf.writeUInt16LE(32, e + 6);
  kopf.writeUInt32LE(png.length, e + 8); kopf.writeUInt32LE(offset, e + 12);
  offset += png.length;
});
writeFileSync(join(ORDNER, 'favicon.ico'), Buffer.concat([kopf, ...pngs]));

// Apple-Touch-Icon ohne runde Ecken (iOS rundet selbst)
const apple = favicon.toString().replace('rx="11"', 'rx="0"');
await sharp(Buffer.from(apple), { density: 600 }).resize(180, 180).png({ compressionLevel: 9 }).toFile(join(ORDNER, 'apple-touch-icon.png'));

await sharp(join(dirname(fileURLToPath(import.meta.url)), 'og-image.svg'), { density: 144 }).resize(1200, 630).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(join(ORDNER, 'og-image.png'));
console.log('favicon.ico, apple-touch-icon.png, og-image.png geschrieben');
