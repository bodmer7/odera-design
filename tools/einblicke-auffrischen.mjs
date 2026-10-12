#!/usr/bin/env node
// Setzt Kopf und Inhalt der bestehenden Einblicke-Seiten in die aktuelle src/einblicke-vorlage.html ein.
//
//   node tools/einblicke-auffrischen.mjs            schreibt einblicke/index.html und alle Artikel neu
//   NUR_PRUEFEN=1 node tools/einblicke-auffrischen.mjs   meldet nur, welche Seiten von der Vorlage abweichen
//
// Gleiche Regel wie das Akquise-Tool (scripts/einblicke.ts neu-erstellen): <!-- einblicke:kopf --> wird durch den
// seitenspezifischen Kopf ersetzt, die Marke <!-- einblicke:linkedin-firma … --> entfällt, <!-- einblicke:inhalt -->
// wird durch den Inhalt von <main> ersetzt. Nützlich nach Änderungen an Kopf, Stil oder Fusszeile (seo-build), wenn
// gerade kein neuer Artikel ansteht. Inhalte der Artikel ändert das Skript nicht.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const vorlage = readFileSync(join(ROOT, 'src', 'einblicke-vorlage.html'), 'utf8');
const ordner = readdirSync(join(ROOT, 'einblicke'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(ROOT, 'einblicke', d.name, 'index.html'))).map((d) => `einblicke/${d.name}/index.html`);
for (const f of ['einblicke/index.html', ...ordner]) {
  const alt = readFileSync(join(ROOT, f), 'utf8');
  const kopf = (alt.match(/<base href="\/">\n([\s\S]*?)\n<link rel="icon"/) || [])[1];
  const inhalt = (alt.match(/<main id="inhalt">\n([\s\S]*?)\n<\/main>/) || [])[1];
  if (!kopf || !inhalt) throw new Error(`Kopf oder Inhalt in ${f} nicht gefunden.`);
  const neu = vorlage.replace('<!-- einblicke:kopf -->', () => kopf).replace(/<!-- einblicke:linkedin-firma [^>]*-->\n/, '')
    .replace('<!-- einblicke:inhalt -->', () => inhalt);
  if (process.env.NUR_PRUEFEN) { console.log(f.padEnd(80), alt === neu ? 'aktuell' : 'weicht ab'); continue; }
  writeFileSync(join(ROOT, f), neu);
  console.log(f.padEnd(80), alt === neu ? 'unverändert' : 'neu geschrieben');
}
