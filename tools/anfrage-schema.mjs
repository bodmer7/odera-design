#!/usr/bin/env node
// Kopiert die Felddefinition des Projekt-Checks (Konstante ANFRAGE in src/seite.html) in den Worker.
//
//   node tools/anfrage-schema.mjs      (läuft auch automatisch am Ende von tools/seo-build.mjs)
//
// Damit gelten im Formular und im Worker dieselben Felder, Pflichtfelder und Maximallängen.
// Ergebnis: anfrage-proxy/src/schema.js. Danach den Worker neu veröffentlichen (siehe anfrage-proxy/README.md).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { ROOT, QUELLE } from './lib/browser.mjs';

const quelle = readFileSync(QUELLE, 'utf8');
const m = quelle.match(/ {2}ANFRAGE = (\{[\s\S]*?\n {2}\});/);
if (!m) throw new Error('Konstante ANFRAGE in src/seite.html nicht gefunden.');
const ANFRAGE = new Function('return ' + m[1])();

// Plausibilität, damit Tippfehler im Schema früh auffallen
const schluessel = ANFRAGE.felder.map((f) => f[0]);
for (const f of ANFRAGE.felder) {
  if (f.length !== 4 || !ANFRAGE.abschnitte.includes(f[2]) || !(f[3] > 0)) throw new Error('Ungültiges Feld: ' + JSON.stringify(f));
}
for (const art of ['voll', 'kurz']) for (const k of ANFRAGE.pflicht[art]) if (!schluessel.includes(k)) throw new Error('Pflichtfeld fehlt im Schema: ' + k);
// Alle Schlüssel aus briefing() müssen im Schema stehen
const briefing = (quelle.match(/ {2}briefing\(\) \{([\s\S]*?)\n {2}\}/) || [])[1] || '';
for (const [, k] of briefing.matchAll(/put\('([A-Z_]+)'/g)) if (!schluessel.includes(k)) throw new Error('Feld aus briefing() fehlt im Schema: ' + k);

// Die nächsten Schritte müssen wörtlich auch ausserhalb der Konstante auf einer Seite stehen (gerenderte Seiten von seo-build)
const seitenText = ['index.html', 'ablauf/index.html', 'angebot/index.html'].filter((d) => existsSync(join(ROOT, d)))
  .map((d) => readFileSync(join(ROOT, d), 'utf8').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ')).join(' ');
for (const [, satz] of ANFRAGE.naechsteSchritte) {
  if ((quelle + ' ' + seitenText).split(satz).length - 1 < 2) throw new Error('Satz steht nicht (mehr) auf der Seite: ' + satz);
}

// Die Fragenzahl im Ablauf-Text muss zur Fragen-Definition passen (ohne Folgefragen und ohne Kurzversions-Frage)
const fragen = (quelle.match(/ {2}Q = \[([\s\S]*?)\n {2}\];/) || [])[1] || '';
const anzahl = fragen.split(/\n    \{ key: '/).slice(1).filter((f) => !/nurKurz: true|wenn: /.test(f)).length;
for (const [, n] of quelle.matchAll(/'(\d+) kurze Fragen/g)) if (Number(n) !== anzahl) throw new Error(`Text nennt ${n} Fragen, es sind ${anzahl}.`);

const ZIEL = join(ROOT, 'anfrage-proxy', 'src', 'schema.js');
mkdirSync(dirname(ZIEL), { recursive: true });
writeFileSync(ZIEL, '// Erzeugt mit tools/anfrage-schema.mjs aus src/seite.html (Konstante ANFRAGE). Nicht von Hand ändern.\n' +
  `export const ANFRAGE = ${JSON.stringify(ANFRAGE, null, 1)};\n`);
console.log(`anfrage-proxy/src/schema.js: ${ANFRAGE.felder.length} Felder`);
