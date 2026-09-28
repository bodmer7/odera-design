#!/usr/bin/env node
// Persönliche Einstiegslinks und QR-Codes für Briefe an Firmen.
//
//   cd tools/brief && npm install        (einmal)
//   node brief-links.mjs firmen.csv
//
// firmen.csv: eine Zeile pro Firma, «Firma;Branche» oder «Firma,Branche». Erste Zeile darf eine Kopfzeile sein.
// Branche ist einer dieser Schlüssel: handwerk, gastro, gesundheit, beratung, beauty, laden (oder leer).
// Ergebnis in _lokal/brief/ (kommt nicht ins Repository): links.csv und je Firma ein QR-Code als SVG.
// Die Regeln für Firmennamen sind dieselben wie auf der Website (index.html, briefAusUrl).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const quelle = readFileSync(join(ROOT, 'index.html'), 'utf8');
const SITE = (quelle.match(/ {2}SITE = '([^']+)';/) || [])[1];
const branchen = new Function('return ' + (quelle.match(/ {2}BRIEF_BRANCHEN = (\{[\s\S]*?\});/) || [])[1])();
if (!SITE || !branchen) throw new Error('SITE oder BRIEF_BRANCHEN in index.html nicht gefunden.');

const datei = process.argv[2];
if (!datei) { console.error('Aufruf: node brief-links.mjs firmen.csv'); process.exit(1); }

const ZIEL = join(ROOT, '_lokal', 'brief');
mkdirSync(join(ZIEL, 'qr'), { recursive: true });
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'firma';
const csvFeld = (s) => /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;

const zeilen = readFileSync(datei, 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter((z) => z.trim());
const aus = ['Firma;Branche;Link;QR-Datei'];
let ok = 0, fehler = 0;
for (const [i, z] of zeilen.entries()) {
  const [rohFirma = '', rohBranche = ''] = z.split(/[;,](?=(?:[^"]*"[^"]*")*[^"]*$)/).map((x) => x.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
  if (i === 0 && /^firma$/i.test(rohFirma)) continue; // Kopfzeile
  const firma = rohFirma.normalize('NFC').replace(/\s+/g, ' ').trim();
  const branche = rohBranche.toLowerCase();
  if (!firma || firma.length > 80 || !/^[\p{L}\p{N} &.,'’\-/()+]+$/u.test(firma)) { console.warn(`Zeile ${i + 1}: Firmenname ungültig (höchstens 80 Zeichen, Buchstaben, Ziffern, Leerzeichen und & . , ' - / ( ) +): ${rohFirma}`); fehler++; continue; }
  if (branche && !branchen[branche]) { console.warn(`Zeile ${i + 1}: Branche unbekannt (${Object.keys(branchen).join(', ')}): ${rohBranche}`); fehler++; continue; }
  const q = new URLSearchParams({ firma });
  if (branche) q.set('branche', branche);
  const link = `${SITE}/start/?${q.toString().replace(/\+/g, '%20')}`;
  const name = `${String(ok + 1).padStart(3, '0')}-${slug(firma)}.svg`;
  const svg = await QRCode.toString(link, { type: 'svg', errorCorrectionLevel: 'M', margin: 2, color: { dark: '#11131A', light: '#FFFFFF' } });
  writeFileSync(join(ZIEL, 'qr', name), svg);
  aus.push([firma, branche, link, 'qr/' + name].map(csvFeld).join(';'));
  ok++;
}
writeFileSync(join(ZIEL, 'links.csv'), '﻿' + aus.join('\n') + '\n');
console.log(`${ok} Links und QR-Codes in _lokal/brief/${fehler ? `, ${fehler} Zeilen übersprungen` : ''}`);
