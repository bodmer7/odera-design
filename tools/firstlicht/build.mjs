#!/usr/bin/env node
// Setzt die Seiten des Musterprojekts Firstlicht aus Vorlagen zusammen.
//
//   node tools/firstlicht/build.mjs            alle Seiten
//   node tools/firstlicht/build.mjs --proto    nur die Hero-Prototypen (tools/firstlicht/prototypen/)
//
// Vorlagen:   tools/firstlicht/vorlagen/*.html         (eine Datei pro Seite)
// Teile:      tools/firstlicht/vorlagen/teile/*.html   (Kopf, Fuss, Beispiel-Leiste, Szene ...)
// Firmendaten: musterprojekte/firstlicht/daten/firma.json (einzige Quelle)
// Ausgabe:    musterprojekte/firstlicht/*.html
//
// Syntax in Vorlagen:
//   <!-- @meta {"titel": "...", "beschreibung": "...", "pfad": "rechner.html", "nav": "rechner"} -->  erste Zeile
//   <!-- @teil name -->        fügt teile/name.html ein (verschachtelt erlaubt)
//   {{firma.telefon}}          Wert aus firma.json
//   {{meta.titel}}             Wert aus dem @meta-Block
//   {{nav:rechner}}            ergibt aria-current="page", wenn die Seite zu diesem Menüpunkt gehört

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const VORLAGEN = join(ROOT, 'tools/firstlicht/vorlagen');
const ZIEL = join(ROOT, 'musterprojekte/firstlicht');
const PROTO = join(ROOT, 'tools/firstlicht/prototypen');
const firma = JSON.parse(readFileSync(join(ZIEL, 'daten/firma.json'), 'utf8'));
const nurProto = process.argv.includes('--proto');

function teil(name, tiefe = 0) {
  if (tiefe > 8) throw new Error('Teile zu tief verschachtelt: ' + name);
  const datei = join(VORLAGEN, 'teile', name + '.html');
  if (!existsSync(datei)) throw new Error('Teil fehlt: ' + name);
  return einsetzen(readFileSync(datei, 'utf8').trimEnd(), tiefe + 1);
}

function einsetzen(text, tiefe = 0) {
  return text.replace(/^([ \t]*)<!-- @teil ([\w-]+) -->/gm, (_, einzug, name) =>
    teil(name, tiefe).split('\n').map((z) => (z ? einzug + z : z)).join('\n'));
}

function wert(pfad, daten) {
  const v = pfad.split('.').reduce((o, k) => (o == null ? undefined : o[k]), daten);
  if (v === undefined) throw new Error('Unbekannter Platzhalter: ' + pfad);
  return String(v);
}

function seiteBauen(datei, zielOrdner) {
  let text = readFileSync(join(VORLAGEN, datei), 'utf8');
  const m = text.match(/^<!-- @meta (\{.*\}) -->\n/);
  const meta = m ? JSON.parse(m[1]) : {};
  if (m) text = text.slice(m[0].length);
  text = einsetzen(text);
  text = text.replace(/\{\{nav:([\w-]+)\}\}/g, (_, n) => (meta.nav === n ? ' aria-current="page"' : ''));
  text = text.replace(/\{\{(firma|meta)\.([\w.]+)\}\}/g, (_, wo, pfad) => wert(pfad, { firma, meta }[wo]));
  if (/\{\{/.test(text)) throw new Error(`${datei}: nicht ersetzter Platzhalter ${text.match(/\{\{[^}]*\}\}/)[0]}`);
  writeFileSync(join(zielOrdner, datei.replace(/^proto-/, 'hero-')), text);
  return datei;
}

const dateien = readdirSync(VORLAGEN).filter((d) => d.endsWith('.html'));
const gebaut = [];
for (const d of dateien) {
  const proto = d.startsWith('proto-');
  if (proto !== nurProto) continue;
  if (proto && !existsSync(PROTO)) mkdirSync(PROTO, { recursive: true });
  gebaut.push(seiteBauen(d, proto ? PROTO : ZIEL));
}
console.log('Gebaut:', gebaut.join(', '));
