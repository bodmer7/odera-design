#!/usr/bin/env node
// Prüfskript für das Musterprojekt Firstlicht. Bricht mit Fehlercode 1 ab, wenn eine Regel verletzt ist.
//   node tools/firstlicht/check.mjs
//
// Prüft auf allen Seiten in musterprojekte/firstlicht/:
//   Beispiel-Leiste, noindex, lang, Canonical und Vorschau-Angaben
//   kein Halbgeviert- oder Geviertstrich und kein ß im sichtbaren Text (auch in Skripten und Daten)
//   keine externen URLs in src, externe Links nur auf erlaubte Hosts, mit rel="noopener"
//   Telefon, Adresse, E-Mail und Öffnungszeiten auf allen Seiten identisch (aus firma.json)
//   alle Bilder mit alt, width und height
//   alle internen Links und Anker erreichbar
//   verbotene Floskeln, höchstens ein Ausrufezeichen auf der ganzen Website
//   Firstlicht nicht in der Sitemap

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ORDNER = join(ROOT, 'musterprojekte/firstlicht');
const firma = JSON.parse(readFileSync(join(ORDNER, 'daten/firma.json'), 'utf8'));
const annahmen = JSON.parse(readFileSync(join(ORDNER, 'daten/annahmen.json'), 'utf8'));

const ERLAUBTE_HOSTS = ['www.sonnendach.ch', 'www.energiefranken.ch', 'odera.ch'];
const QUELLEN_HOSTS = /(^|\.)(admin\.ch|ekz\.ch|ckw\.ch|swissolar\.ch|pronovo\.ch|energieschweiz\.ch|ag\.ch|zh\.ch|hagelregister\.ch|die-agv\.ch|so\.ch|opendata\.swiss|dasgebaeudeprogramm\.ch|htw-berlin\.de|timeanddate\.de|energie-solar-erfahrungen\.de|energieinside\.ch|elcom\.admin\.ch)$/;
const FLOSKELN = ['innovativ', 'ihr kompetenter partner', 'massgeschneiderte lösung', 'ganzheitlich', 'mehrwert', 'rundum sorglos', 'tauchen sie ein', 'in der heutigen zeit'];

const fehler = [];
const melden = (datei, text) => fehler.push(`${datei}: ${text}`);

const seiten = readdirSync(ORDNER).filter((d) => d.endsWith('.html'));
const oeffentlich = seiten.filter((d) => !d.startsWith('_'));
const inhalt = Object.fromEntries(seiten.map((d) => [d, readFileSync(join(ORDNER, d), 'utf8')]));

// Sichtbarer Text: ohne Skripte, Styles, SVG-Pfade; dazu Texte aus aria-label, alt, title, placeholder
function sichtbar(html) {
  const attr = [...html.matchAll(/\s(?:aria-label|alt|title|placeholder|aria-valuetext)="([^"]*)"/g)].map((m) => m[1]).join(' ');
  const text = html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
  return `${text} ${attr}`;
}

let ausrufe = 0;
for (const datei of seiten) {
  const html = inhalt[datei];
  const text = sichtbar(html);

  if (!/<html lang="de-CH"/.test(html)) melden(datei, 'lang="de-CH" fehlt');
  if (!/<meta name="robots" content="noindex">/.test(html)) melden(datei, 'noindex fehlt');
  if (!/class="beispiel-leiste"[\s\S]*?Beispielseite von ODERA Design\.[\s\S]*?Der Betrieb ist frei erfunden\./.test(html)) melden(datei, 'Beispiel-Leiste fehlt oder unvollständig');
  if (!/href="\/musterprojekte\/"/.test(html)) melden(datei, 'Link «Zurück zu odera.ch» fehlt');
  if (!/data-erklaeren-schalter/.test(html)) melden(datei, 'Schalter für den Erklärmodus fehlt');
  if (!datei.startsWith('_')) {
    for (const m of ['<link rel="canonical"', 'property="og:image"', 'name="description"', 'name="theme-color"', 'Content-Security-Policy']) if (!html.includes(m)) melden(datei, `${m} fehlt`);
    if (!/fiktiv/.test(html)) melden(datei, 'Hinweis «fiktiv» im Fuss fehlt');
  }

  if (/[–—]/.test(text)) melden(datei, `Gedankenstrich im Text: «${text.match(/.{0,30}[–—].{0,30}/)[0].trim()}»`);
  if (/ß/.test(text)) melden(datei, 'ß im Text');
  if (/\d'\d{3}/.test(text)) melden(datei, `Tausendertrenner ' statt ’ (wie Intl de-CH): «${text.match(/.{0,20}\d'\d{3}.{0,10}/)[0].trim()}»`);
  const tief = text.toLowerCase();
  for (const f of FLOSKELN) if (tief.includes(f)) melden(datei, `Floskel «${f}»`);
  if (!datei.startsWith('_')) ausrufe += (text.match(/!/g) || []).length;

  // src: nur eigene Dateien
  for (const m of html.matchAll(/\ssrc="([^"]+)"/g)) if (/^(https?:)?\/\//.test(m[1])) melden(datei, `externe URL in src: ${m[1]}`);
  // href: externe nur erlaubt, mit noopener bei neuem Fenster
  for (const m of html.matchAll(/<a\s[^>]*href="([^"]+)"[^>]*>/g)) {
    const tag = m[0];
    const href = m[1];
    if (/^https?:\/\//.test(href)) {
      const host = new URL(href).hostname;
      if (!ERLAUBTE_HOSTS.includes(host)) melden(datei, `externer Link nicht erlaubt: ${href}`);
      if (/target="_blank"/.test(tag) && !/rel="[^"]*noopener/.test(tag)) melden(datei, `rel="noopener" fehlt: ${href}`);
    }
  }
  // Bilder
  for (const m of html.matchAll(/<img\s[^>]*>/g)) for (const a of ['alt=', 'width=', 'height=']) if (!m[0].includes(a)) melden(datei, `Bild ohne ${a} ${m[0].slice(0, 60)}`);

  // Firmendaten identisch
  if (!datei.startsWith('_')) {
    for (const [name, wert] of [['Telefon', firma.telefon.replace(/ /g, '&nbsp;')], ['Strasse', firma.strasse], ['PLZ und Ort', `${firma.plz} ${firma.ort}`], ['E-Mail', firma.email],
      ['Öffnungszeiten', firma.zeiten.vormittag], ['Öffnungszeiten', firma.zeiten.nachmittag], ['Firmenname', firma.name]]) {
      if (!html.includes(wert)) melden(datei, `${name} fehlt oder weicht ab (erwartet «${wert}»)`);
    }
    if (!html.includes(`tel:${firma.telefonLink}`)) melden(datei, 'Telefon-Link weicht ab');
    // Keine anderen Telefonnummern im Format 0xx xxx xx xx
    for (const m of text.matchAll(/\b0\d{2} \d{3} \d{2} \d{2}\b/g)) if (m[0] !== firma.telefon && !/079 123 45 67/.test(m[0])) melden(datei, `fremde Telefonnummer ${m[0]}`);
  }

  // Interne Links und Anker
  for (const m of html.matchAll(/\shref="([^"]+)"/g)) {
    const href = m[1];
    if (/^(https?:|mailto:|tel:)/.test(href) || href.includes("${")) continue;
    if (/^assets\/|\.(css|svg|png|ico|woff2)$/.test(href)) {
      const pfad = join(ORDNER, href.split(/[?#]/)[0]);
      if (!existsSync(pfad)) melden(datei, `Datei fehlt: ${href}`);
      continue;
    }
    const [pfadTeil, anker] = href.split('#');
    const ohneSuche = pfadTeil.split('?')[0];
    let ziel;
    if (!ohneSuche) ziel = datei;
    else if (ohneSuche.startsWith('/')) {
      const p = join(ROOT, ohneSuche);
      const ok = existsSync(p) && (statSync(p).isFile() || existsSync(join(p, 'index.html')));
      if (!ok) melden(datei, `interner Link nicht erreichbar: ${href}`);
      continue;
    } else ziel = ohneSuche;
    if (!inhalt[ziel]) { melden(datei, `Seite fehlt: ${href}`); continue; }
    if (anker && !new RegExp(`id="${anker}"`).test(inhalt[ziel]) && !/^projekt-/.test(anker)) melden(datei, `Anker fehlt: ${href}`);
  }
}
// Jede Klasse im HTML muss im CSS-Bündel der Seite stehen (sonst fehlt ein Stil nach dem Aufteilen).
// Ausnahmen: reine Haken für Skripte und Illustrationen.
const NUR_HAKEN = new Set(['szene__himmel', 'szene__haus', 'szene__fluesse', 'szene__play', 'illu--mittag', 'glossar-vorrat', 'vergleich', 'annahmen',
  'bk-fluesse', 'vn__vorher', 'geschichte', 'team__avatar--1']);
const erklaerCss = readFileSync(join(ORDNER, 'assets/css/erklaeren.css'), 'utf8');
for (const datei of oeffentlich) {
  const html = inhalt[datei];
  const bundel = html.match(/assets\/css\/(firstlicht[\w-]*\.css)/)?.[1];
  if (!bundel) { melden(datei, 'CSS-Bündel nicht gefunden'); continue; }
  const css = readFileSync(join(ORDNER, 'assets/css', bundel), 'utf8') + erklaerCss;
  const klassen = new Set([...html.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)).filter((k) => k && !k.includes('$')));
  for (const k of klassen) {
    if (NUR_HAKEN.has(k)) continue;
    if (!new RegExp(`\\.${k.replace(/[-_]/g, (z) => `\\${z}`)}(?![\\w-])`).test(css)) melden(datei, `Klasse «${k}» fehlt in ${bundel}`);
  }
}
if (ausrufe > 1) melden('alle Seiten', `${ausrufe} Ausrufezeichen, höchstens eines erlaubt`);

// Skripte und Daten: keine Gedankenstriche und kein ß in Texten
for (const d of readdirSync(join(ORDNER, 'assets/js'))) {
  const t = readFileSync(join(ORDNER, 'assets/js', d), 'utf8');
  if (/[–—ß]/.test(t)) melden(`assets/js/${d}`, 'Gedankenstrich oder ß');
}
for (const d of readdirSync(join(ORDNER, 'daten'))) {
  const t = readFileSync(join(ORDNER, 'daten', d), 'utf8');
  if (/[–—ß]/.test(t)) melden(`daten/${d}`, 'Gedankenstrich oder ß');
}

// Annahmen: Quelle bei jedem Eintrag, nur seriöse Hosts
for (const [k, v] of Object.entries(annahmen)) {
  if (k.startsWith('_')) continue;
  for (const f of ['wert', 'einheit', 'quelle', 'abgerufen', 'status', 'hinweis']) if (!(f in v)) melden('daten/annahmen.json', `${k} ohne ${f}`);
  try { if (!QUELLEN_HOSTS.test(new URL(v.quelle).hostname)) melden('daten/annahmen.json', `${k}: Quelle ausserhalb der Liste ${v.quelle}`); } catch { melden('daten/annahmen.json', `${k}: Quelle ungültig`); }
}

// Sitemap
const sitemap = readFileSync(join(ROOT, 'sitemap.xml'), 'utf8');
if (/firstlicht/.test(sitemap)) melden('sitemap.xml', 'Firstlicht steht in der Sitemap');

if (fehler.length) {
  console.error(`Prüfung fehlgeschlagen, ${fehler.length} Befunde:\n- ` + fehler.join('\n- '));
  process.exit(1);
}
console.log(`Prüfung bestanden: ${seiten.length} Seiten (${oeffentlich.length} öffentlich), Skripte, Daten und Sitemap.`);
