#!/usr/bin/env node
// Setzt Kopf und Inhalt der bestehenden Einblicke-Seiten in die aktuelle src/einblicke-vorlage.html ein.
//
//   node tools/einblicke-auffrischen.mjs            schreibt einblicke/index.html und alle Artikel neu
//   NUR_PRUEFEN=1 node tools/einblicke-auffrischen.mjs   meldet nur, welche Seiten von der Vorlage abweichen
//
// Gleiche Regel wie das Akquise-Tool (scripts/einblicke.ts neu-erstellen): <!-- einblicke:kopf --> wird durch den
// seitenspezifischen Kopf ersetzt, die Marke <!-- einblicke:linkedin-firma … --> entfällt, <!-- einblicke:inhalt -->
// wird durch den Inhalt von <main> ersetzt. Nützlich nach Änderungen an Kopf, Stil oder Fusszeile (seo-build), wenn
// gerade kein neuer Artikel ansteht. Texte der Artikel ändert das Skript nicht, nur die strukturierten Daten (schemaAngleichen).
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SITE = 'https://odera.ch';
const ORG = { '@type': 'ProfessionalService', '@id': SITE + '/#organisation', name: 'ODERA Design', url: SITE + '/',
  logo: { '@type': 'ImageObject', url: SITE + '/assets/img/odera-logo-512.png' } };
const AUTOR = { '@type': 'Person', '@id': SITE + '/ueber-mich/#person', name: 'Nico Bodmer', url: SITE + '/ueber-mich/' };

// Kopf wie auf den übrigen Seiten: Titel-Trenner «·» statt «|» (lange Titel ohne Zusatz, damit sie nicht über 65 Zeichen
// wachsen), Twitter-Titel und -Beschreibung wie Open Graph.
function kopfAngleichen(html) {
  const titelAlt = (html.match(/<title>([^<]*)<\/title>/) || [])[1];
  if (!titelAlt) return html;
  const kern = titelAlt.replace(/ [|·] ODERA Design$/, '');
  const titel = (kern + ' · ODERA Design').length <= 65 ? kern + ' · ODERA Design' : kern;
  html = html.replace(`<title>${titelAlt}</title>`, () => `<title>${titel}</title>`)
    .replace(/(<meta property="og:title" content=")[^"]*"/, (_, a) => `${a}${titel}"`);
  const desc = (html.match(/<meta property="og:description" content="([^"]*)"/) || [])[1];
  if (!html.includes('name="twitter:title"')) html = html.replace(/(<meta name="twitter:card" content="[^"]*">)/, (_, a) =>
    `${a}\n<meta name="twitter:title" content="${titel}">` + (desc ? `\n<meta name="twitter:description" content="${desc}">` : ''));
  return html;
}

// Strukturierte Daten an die übrigen Seiten angleichen (gleiche @id für Firma und Person wie in tools/seo-build.mjs):
// Artikel als BlogPosting mit Verweis auf Autor, Firma und Blog; dateModified nie vor datePublished.
function schemaAngleichen(html) {
  let geaendert = null;
  html = html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/, (_, roh) => {
    const daten = JSON.parse(roh);
    for (const k of daten['@graph'] || [daten]) {
      if (k['@type'] === 'Article') k['@type'] = 'BlogPosting';
      if (k.publisher) k.publisher = ORG;
      if (k['@type'] === 'BlogPosting') {
        k.author = AUTOR;
        k.isPartOf = { '@type': 'Blog', '@id': SITE + '/einblicke/#blog', name: 'Einblicke', url: SITE + '/einblicke/' };
        if (k.dateModified && k.datePublished && k.dateModified < k.datePublished) k.dateModified = k.datePublished;
        geaendert = k.dateModified;
      }
      if (k['@type'] === 'Blog') k.author = AUTOR;
    }
    return `<script type="application/ld+json">${JSON.stringify(daten).replace(/</g, '\\u003c')}</script>`;
  });
  return geaendert ? html.replace(/(<meta property="article:modified_time" content=")[^"]*"/, `$1${geaendert}"`) : html;
}
const vorlage = readFileSync(join(ROOT, 'src', 'einblicke-vorlage.html'), 'utf8');
const ordner = readdirSync(join(ROOT, 'einblicke'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(ROOT, 'einblicke', d.name, 'index.html'))).map((d) => `einblicke/${d.name}/index.html`);
for (const f of ['einblicke/index.html', ...ordner]) {
  const alt = readFileSync(join(ROOT, f), 'utf8');
  const kopf = (alt.match(/<base href="\/">\n([\s\S]*?)\n<link rel="icon"/) || [])[1];
  const inhalt = (alt.match(/<main id="inhalt">\n([\s\S]*?)\n<\/main>/) || [])[1];
  if (!kopf || !inhalt) throw new Error(`Kopf oder Inhalt in ${f} nicht gefunden.`);
  let neu = vorlage.replace('<!-- einblicke:kopf -->', () => kopf).replace(/<!-- einblicke:linkedin-firma [^>]*-->\n/, '')
    .replace('<!-- einblicke:inhalt -->', () => inhalt);
  neu = kopfAngleichen(schemaAngleichen(neu));
  if (process.env.NUR_PRUEFEN) { console.log(f.padEnd(80), alt === neu ? 'aktuell' : 'weicht ab'); continue; }
  writeFileSync(join(ROOT, f), neu);
  console.log(f.padEnd(80), alt === neu ? 'unverändert' : 'neu geschrieben');
}
