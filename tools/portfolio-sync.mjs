#!/usr/bin/env node
// Holt das aktuelle Portfolio von Nico Bodmer und legt es als Musterprojekt ab.
//
//   node tools/portfolio-sync.mjs                 holt github.com/bodmer7/nicobodmer (braucht die GitHub-Anmeldung "gh")
//   node tools/portfolio-sync.mjs /pfad/zum/clone nimmt einen lokalen Ordner statt GitHub
//
// Ergebnis: muster/portfolio/ (index.html und assets/). Der Rahmen muster/portfolio.html zeigt diese Kopie.
// Die Kopie wird nicht von Hand bearbeitet. Bei jeder Änderung am Portfolio das Skript erneut ausführen
// und das Ergebnis einchecken.
//
// Gegenüber dem Original werden nur diese vier Dinge geändert, damit die Kopie zu den Zusagen dieser Website passt:
//   1. Google Fonts entfallen. Die Schriften kommen von diesem Server (assets/fonts/portfolio-muster.css).
//   2. Das Portfolio merkt sich Farbschema und Sprache im Browser (localStorage). Hier wird das abgeschaltet.
//   3. canonical entfällt und die Seite ist noindex. Sie ist eine Kopie von nico-bodmer.ch.
//   4. Ein Kommentar nennt Quelle und Stand der Kopie.

import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const ZIEL = join(ROOT, 'muster', 'portfolio');
const REPO = 'bodmer7/nicobodmer';

let quelle = process.argv[2];
let aufraeumen = null;
if (!quelle) {
  aufraeumen = mkdtempSync(join(tmpdir(), 'portfolio-'));
  quelle = join(aufraeumen, 'repo');
  execFileSync('gh', ['repo', 'clone', REPO, quelle, '--', '-q'], { stdio: 'inherit' });
}
const git = (...a) => execFileSync('git', ['-C', quelle, ...a], { encoding: 'utf8' }).trim();
const stand = git('log', '-1', '--format=%h %ad %s', '--date=short');

let html = readFileSync(join(quelle, 'index.html'), 'utf8');
const ersetze = (von, nach, name) => {
  if (!html.includes(von)) throw new Error(`Änderung "${name}" nicht möglich: Stelle nicht gefunden. Hat sich das Portfolio verändert?`);
  html = html.replace(von, () => nach);
};
const zeile = (muster, name) => {
  const m = html.match(muster);
  if (!m) throw new Error(`Änderung "${name}" nicht möglich: Stelle nicht gefunden. Hat sich das Portfolio verändert?`);
  return m[0];
};

// 1. Schriften lokal
ersetze(zeile(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\n/, 'preconnect'), '', 'preconnect');
ersetze(zeile(/<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>\n/, 'preconnect gstatic'), '', 'preconnect gstatic');
ersetze(zeile(/<link href="https:\/\/fonts\.googleapis\.com\/css2[^>]*>\n/, 'Google Fonts'), '<link rel="stylesheet" href="/assets/fonts/portfolio-muster.css">\n', 'Google Fonts');

// 2. Kein Speichern im Browser. Der Ersatz muss vor allen anderen Skripten stehen.
const schalter = `<script>
  /* Kopie für die Muster-Seite: nichts im Browser speichern (Farbschema und Sprache gelten nur für diesen Besuch). */
  (function () {
    var speicher = {};
    try {
      Object.defineProperty(window, "localStorage", { configurable: true, value: {
        getItem: function (k) { return Object.prototype.hasOwnProperty.call(speicher, k) ? speicher[k] : null; },
        setItem: function (k, v) { speicher[k] = String(v); },
        removeItem: function (k) { delete speicher[k]; }
      } });
    } catch (e) {}
  })();
</script>
`;
ersetze('<meta name="viewport" content="width=device-width, initial-scale=1">\n', '<meta name="viewport" content="width=device-width, initial-scale=1">\n<meta name="robots" content="noindex">\n' + schalter, 'localStorage');

// 3. canonical entfällt
ersetze(zeile(/<link rel="canonical"[^>]*>\n/, 'canonical'), '', 'canonical');

// 4. Herkunft
ersetze('<!DOCTYPE html>\n', `<!DOCTYPE html>\n<!-- Kopie von github.com/${REPO}, Stand ${stand}. Erzeugt mit tools/portfolio-sync.mjs. Nicht von Hand ändern. -->\n`, 'Herkunft');

// Schreiben
rmSync(ZIEL, { recursive: true, force: true });
mkdirSync(ZIEL, { recursive: true });
cpSync(join(quelle, 'assets'), join(ZIEL, 'assets'), { recursive: true });
writeFileSync(join(ZIEL, 'index.html'), html);
if (aufraeumen) rmSync(aufraeumen, { recursive: true, force: true });

// Prüfung: nichts Externes darf beim Laden angefragt werden
const extern = [...html.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)].map((m) => m[1])
  .filter((u) => !/^https:\/\/(odera\.ch|www\.linkedin\.com|github\.com|bodmer7\.github\.io)/.test(u));
if (extern.length) throw new Error('Unerwartete externe Adressen: ' + extern.join(', '));
if (existsSync(join(ZIEL, 'assets', 'css')) && /googleapis|gstatic/.test(readFileSync(join(ZIEL, 'assets', 'css', 'style.css'), 'utf8')))
  throw new Error('style.css lädt Google Fonts.');

console.log(`Portfolio übernommen: ${stand}`);
console.log(`-> ${ZIEL.replace(ROOT + '/', '')}/ (${html.length} Zeichen index.html)`);
