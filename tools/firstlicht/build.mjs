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
import { createHash } from 'node:crypto';
import { gebaeude, baukasten, SYMBOLE } from './illustrationen.mjs';
import { berechnen } from '../../musterprojekte/firstlicht/assets/js/rechner-logik.js';

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const VORLAGEN = join(ROOT, 'tools/firstlicht/vorlagen');
const ZIEL = join(ROOT, 'musterprojekte/firstlicht');
const PROTO = join(ROOT, 'tools/firstlicht/prototypen');
const firma = JSON.parse(readFileSync(join(ZIEL, 'daten/firma.json'), 'utf8'));
firma.telefonAnzeige = firma.telefon.replace(/ /g, '&nbsp;'); // Nummer bricht nicht um
const projekte = JSON.parse(readFileSync(join(ZIEL, 'daten/projekte.json'), 'utf8')).projekte;
const fragen = JSON.parse(readFileSync(join(VORLAGEN, 'fragen.json'), 'utf8')).fragen;
const annahmen = JSON.parse(readFileSync(join(ZIEL, 'daten/annahmen.json'), 'utf8'));
const nurProto = process.argv.includes('--proto');
const zahl = (n, stellen = 0) => new Intl.NumberFormat('de-CH', { minimumFractionDigits: stellen, maximumFractionDigits: stellen }).format(n);
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

// Kennzahlen eines Projekts, einmal gerechnet
export function projektWerte(p) {
  const kwp = Math.round(((p.bestandKwp || 0) + p.module * 0.44) * 10) / 10;
  const ertrag = Math.round((kwp * p.spezifisch) / 100) * 100;
  return { kwp, ertrag };
}

const KATEGORIEN = { efh: 'Einfamilienhaus', mfh: 'Mehrfamilienhaus', gewerbe: 'Gewerbe', landwirtschaft: 'Landwirtschaft', speicher: 'Mit Speicher' };

function projektKarte(p, { verlinkt }) {
  const w = projektWerte(p);
  const illu = gebaeude(p.typ, { variante: p.variante, spiegeln: p.spiegeln, wallbox: p.id === 'efh-freiamt', ladepunkte: p.id === 'halle-freiamt', halb: p.id === 'efh-freiamt' });
  const titel = verlinkt
    ? `<a class="stretch" href="projekte.html#projekt-${p.id}">${esc(p.titel)}</a>`
    : `<span data-projekt-titel="${p.id}">${esc(p.titel)}</span>`;
  const werte = [`${zahl(w.kwp, 1)} kWp`, `${zahl(w.ertrag)} kWh pro Jahr`];
  if (p.speicherKwh) werte.push(`Speicher ${zahl(p.speicherKwh)} kWh`);
  return `<article class="karte karte--hover projekt schein" id="${verlinkt ? 'start-' : ''}projekt-${p.id}" data-kategorien="${p.kategorien.join(' ')}">
  <div class="projekt__bild">${illu}</div>
  <div class="projekt__text">
    <p><span class="badge badge--beispiel">Beispielprojekt, ${p.jahr}</span></p>
    <h3 class="projekt__titel">${titel}</h3>
    <p>${esc(p.besonderheit)}.</p>
    <ul class="projekt__werte" role="list">${werte.map((t) => `<li class="badge">${t}</li>`).join('')}</ul>
    ${verlinkt ? '' : `<p class="ohne-js">${esc(p.geschichte)}</p>`}
  </div>
</article>`;
}

function projektDaten() {
  const daten = projekte.map((p) => ({ ...p, ...projektWerte(p),
    vorher: gebaeude(p.typ, { module: false, variante: p.variante, spiegeln: p.spiegeln, halb: p.id === 'efh-freiamt', wallbox: false }),
    nachher: gebaeude(p.typ, { module: true, variante: p.variante, spiegeln: p.spiegeln, halb: p.id === 'efh-freiamt', wallbox: p.id === 'efh-freiamt', ladepunkte: p.id === 'halle-freiamt' }) }));
  return `<script type="application/json" id="projekte-daten">${JSON.stringify(daten).replace(/</g, '\\u003c')}</script>`;
}

function filterLeiste() {
  const knopf = (k, t) => `<button class="filter" type="button" data-filter="${k}" aria-pressed="false">${t}</button>`;
  return `<button class="filter" type="button" data-filter="alle" aria-pressed="true">Alle</button>` + Object.entries(KATEGORIEN).map(([k, t]) => knopf(k, t)).join('');
}

// Startwerte des Mini-Rechners, damit die Seite auch ohne JavaScript eine Schätzung zeigt
const start = berechnen({}, annahmen);
const mini = {
  flaeche: start.eingaben.flaeche, strompreis: zahl(start.eingaben.strompreis, 1), strompreisRoh: start.eingaben.strompreis,
  kwp: zahl(start.kwp, 1), ertrag: zahl(start.ertrag.wert), ersparnisVon: zahl(start.ersparnis.von), ersparnisBis: zahl(start.ersparnis.bis),
  stand: new Date(annahmen._stand).toLocaleDateString('de-CH', { day: 'numeric', month: 'long', year: 'numeric' })
};

function frageHtml(f) {
  return `<details class="frage" id="frage-${f.id}">
  <summary>${esc(f.frage)}</summary>
  <div class="frage__antwort">${f.antwort}</div>
</details>`;
}

const ANWEISUNGEN = {
  'fragen start': () => fragen.filter((f) => f.start).map(frageHtml).join('\n'),
  'fragen alle': () => fragen.map(frageHtml).join('\n'),
  'projekte start': () => ['efh-reusstal', 'stwe-limmattal', 'hof-freiamt'].map((id) => projektKarte(projekte.find((p) => p.id === id), { verlinkt: true })).join('\n'),
  'projekte alle': () => projekte.map((p) => projektKarte(p, { verlinkt: false })).join('\n'),
  'projektdaten': projektDaten,
  'baukasten': baukasten,
  'filter': filterLeiste,
  'projektzahl': () => String(projekte.length),
  'symbole-extra': () => Object.entries(SYMBOLE).map(([id, d]) => `<symbol id="${id}" viewBox="0 0 24 24">${d}</symbol>`).join('\n')
};

function teil(name, tiefe = 0) {
  if (tiefe > 8) throw new Error('Teile zu tief verschachtelt: ' + name);
  const datei = join(VORLAGEN, 'teile', name + '.html');
  if (!existsSync(datei)) throw new Error('Teil fehlt: ' + name);
  return einsetzen(readFileSync(datei, 'utf8').trimEnd(), tiefe + 1);
}

function einsetzen(text, tiefe = 0) {
  return text
    .replace(/^([ \t]*)<!-- @teil ([\w-]+) -->/gm, (_, einzug, name) =>
      teil(name, tiefe).split('\n').map((z) => (z ? einzug + z : z)).join('\n'))
    .replace(/<!-- @illu (\w+) (\{.*?\}) -->/g, (_, typ, opt) => gebaeude(typ, JSON.parse(opt)))
    .replace(/<!-- @([\w -]+?) -->/g, (ganz, name) => (ANWEISUNGEN[name] ? ANWEISUNGEN[name]() : ganz));
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
  text = text.replace(/\{\{(firma|meta|mini)\.([\w.]+)\}\}/g, (_, wo, pfad) => wert(pfad, { firma, meta, mini }[wo]));
  // Content-Security-Policy: nur eigene Dateien, Inline-Skripte per Hash erlaubt
  const hashes = [...text.matchAll(/<script(?![^>]*type="application\/json")(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)]
    .map((m) => `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`);
  const csp = ["default-src 'self'", `script-src 'self' ${hashes.join(' ')}`.trim(), `style-src 'self'${meta.csp === 'locker' ? " 'unsafe-inline'" : ''}`,
    "img-src 'self' data:", "font-src 'self'", "connect-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'"].join('; ');
  text = text.replace('{{csp}}', csp);
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
