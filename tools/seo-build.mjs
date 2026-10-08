#!/usr/bin/env node
// Erzeugt die Suchmaschinen-Angaben der Website.
//
//   node tools/seo-build.mjs
//
// Quelle ist src/seite.html (Kopf, Stil und die Vorlage <x-dc> mit allen Seiten). Daraus entstehen:
//   - je Seite eine eigene Datei mit echter Adresse (index.html, angebot/index.html, ...). Sie enthält nur
//     den Kopf und den fertig gerenderten Inhalt dieser einen Seite (Vorab-Block), ohne Vorlage und ohne {{ }}.
//   - assets/js/vorlage.js: die Vorlage mit allen Seiten für die Laufzeit. Jede Seite lädt sie erst nach dem
//     ersten Zeichnen und setzt sie ins Dokument, danach übernimmt React (Seitenwechsel ohne Neuladen).
//   - 404.html für den Fehlerfall des Webservers
//   - robots.txt und sitemap.xml (mit lastmod: Datum, an dem sich der Text der Seite zuletzt geändert hat)
// In jeder Datei stehen im <head> eigener Titel, Beschreibung, canonical, robots und Vorschau-Angaben.
//
// Titel, Beschreibung, noindex und SITE liest das Skript aus der Quelle (Tabelle PAGES und Konstante SITE).
// Braucht Node 22 oder neuer und Google Chrome. Ein anderer Chrome-Pfad geht über die Variable CHROME.
// Nach jeder Änderung an Texten oder Seiten in index.html erneut ausführen und die Ergebnisse einchecken.
// Am Schluss entsteht auch die Wissensbasis des Chat-Assistenten (tools/wissen-build.mjs).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { ROOT, QUELLE, leseSeiten, startServer, startChrome } from './lib/browser.mjs';

// ---------- 1. Angaben aus der Quelle lesen ----------
const quelle = readFileSync(QUELLE, 'utf8');
const PAGES = leseSeiten(quelle);
const SITE = (quelle.match(/ {2}SITE = '([^']+)';/) || [])[1];
const EMAIL = (quelle.match(/ {2}EMAIL = '([^']+)';/) || [])[1];
if (!SITE || !EMAIL) throw new Error('SITE oder EMAIL in src/seite.html nicht gefunden.');
const NAME = 'ODERA Design';
const PREISE = JSON.parse((quelle.match(/ {2}PAKET_PREIS = (\[[^\]]+\]);/) || [])[1] || 'null');
if (!PREISE || PREISE.length !== 3) throw new Error('PAKET_PREIS in src/seite.html nicht gefunden.');
// Vorschaubild für geteilte Links (WhatsApp, Mail, soziale Netzwerke), 1200 x 630
const VORSCHAU = { url: '/assets/img/vorschau-odera.jpg', breite: 1200, hoehe: 630, alt: 'ODERA Design: Sie sehen Ihre neue Website, bevor Sie bezahlen. Ab CHF 890, Entwurf in 5 Arbeitstagen.' };

const urlOf = (p) => (p === '/' ? '/' : p + '/');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escA = (s) => esc(s).replace(/"/g, '&quot;');

// ---------- 2. Webserver und Chrome: tools/lib/browser.mjs ----------

// Läuft im Browser: macht aus der gerenderten Seite sauberes, einfaches HTML.
// Übersprungen werden Knöpfe, Formularfelder, Grafiken, Komponenten (Logo, Musterprojekt-Vorschau),
// alles mit aria-hidden="true" und alles, was in index.html mit data-nosnap markiert ist
// (Tageszeit abhängige Angaben und die erfundenen Beispieltexte in den Vorschaubildern).
const AUSZUG = `(() => {
  const SKIP = new Set(['BUTTON','INPUT','TEXTAREA','SELECT','OPTION','LABEL','FORM','SVG','PATH','IMG','CANVAS','IFRAME','STYLE','SCRIPT','NOSCRIPT','DC-IMPORT','SC-IF','SC-FOR']);
  const INLINE = new Set(['STRONG','EM','B','I']);
  const LISTEN = new Set(['UL','OL','TABLE','THEAD','TBODY','TR','DL']);
  const ZELLEN = new Set(['LI','TD','TH','DT','DD']);
  const esc = (s) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const escA = (s) => esc(s).replace(/"/g,'&quot;');
  const verschachtelt = (el) => el.classList && el.classList.contains('sc-host') && el.parentElement && el.parentElement.closest('.sc-host');
  const inlineText = (n) => [...n.childNodes].map((c) => gehe(c).html || '').join('');
  // Kinder als Folge von Blöcken ausgeben. Loser Text und Inline-Inhalt wird zu einem Absatz.
  const fluss = (kinder) => {
    let aus = '', puffer = '';
    const leeren = () => { if (puffer.trim()) aus += /<(p|h[1-4]|ul|ol|table|details)[ >]/.test(puffer) ? puffer.trim() : '<p>' + puffer.trim() + '</p>'; puffer = ''; };
    for (const k of kinder) {
      const r = gehe(k);
      if (r.art === 'inline') puffer += r.html;
      else if (r.art === 'block') { leeren(); aus += r.html; }
    }
    leeren();
    return aus;
  };
  const einzeln = (html) => { const m = html.match(/^<p>([\\s\\S]*)<\\/p>$/); return m && m[1].indexOf('<p>') < 0 ? m[1] : html; };
  const gehe = (n) => {
    if (n.nodeType === 3) {
      const tx = n.textContent.replace(/\\u00ad/g, '').replace(/\\s+/g, ' ');
      return tx.trim() === '\u2713' ? { art: 'nichts' } : { art: 'inline', html: esc(tx) };
    }
    if (n.nodeType !== 1) return { art: 'nichts' };
    const tag = n.tagName.toUpperCase();
    if (SKIP.has(tag)) return { art: 'nichts' };
    if (n.hasAttribute('data-nosnap') || n.getAttribute('aria-hidden') === 'true' || verschachtelt(n)) return { art: 'nichts' };
    const cs = getComputedStyle(n);
    if (cs.display === 'none' || cs.visibility === 'hidden') return { art: 'nichts' };
    if (tag === 'BR') return { art: 'inline', html: '<br>' };
    if (tag === 'A') {
      const h = n.getAttribute('href') || '';
      const innen = inlineText(n);
      if (!innen.trim()) return { art: 'nichts' };
      return { art: 'inline', html: h.charAt(0) === '#' ? innen : '<a href="' + escA(h) + '">' + innen + '</a>' };
    }
    if (INLINE.has(tag)) { const t = tag.toLowerCase(), innen = inlineText(n); return innen.trim() ? { art: 'inline', html: '<' + t + '>' + innen + '</' + t + '>' } : { art: 'nichts' }; }
    if (/^H[1-4]$/.test(tag) || tag === 'P' || tag === 'SUMMARY') {
      const t = tag.toLowerCase(), innen = inlineText(n).trim();
      return innen ? { art: 'block', html: '<' + t + '>' + innen + '</' + t + '>' } : { art: 'nichts' };
    }
    if (ZELLEN.has(tag)) {
      const t = tag.toLowerCase(), innen = einzeln(fluss([...n.childNodes]));
      return innen ? { art: 'block', html: '<' + t + '>' + innen + '</' + t + '>' } : { art: 'nichts' };
    }
    if (LISTEN.has(tag)) {
      const t = tag.toLowerCase(), innen = [...n.children].map((c) => gehe(c).html || '').join('');
      return innen ? { art: 'block', html: '<' + t + '>' + innen + '</' + t + '>' } : { art: 'nichts' };
    }
    if (tag === 'DETAILS') { const innen = fluss([...n.childNodes]); return innen ? { art: 'block', html: '<details open>' + innen + '</details>' } : { art: 'nichts' }; }
    if (cs.display.indexOf('inline') === 0) { const innen = inlineText(n); return innen ? { art: 'inline', html: innen } : { art: 'nichts' }; }
    const innen = fluss([...n.childNodes]);
    return innen ? { art: 'block', html: innen } : { art: 'nichts' };
  };
  const teil = (sel) => { const el = document.querySelector(sel); return el ? (gehe(el).html || '') : ''; };
  return {
    nav: [...document.querySelectorAll('#dc-root header nav a')].map((a) => ({ label: a.innerText.trim(), href: a.getAttribute('href') })),
    // Fertig gerenderte Seite für den Vorab-Block (ohne interne Zähler der Laufzeit)
    vorab: document.getElementById('dc-root').innerHTML.replace(/ data-dc-tpl="\\d+"/g, ''),
    faq: [...document.querySelectorAll('#dc-root main details.frage')].map((d) => ({ q: d.querySelector('summary').textContent.trim(), a: d.querySelector('p').textContent.trim() })),
    main: teil('#dc-root main'),
    footer: teil('#dc-root footer'),
  };
})()`;

function formatiere(html) {
  return html.replace(/<p>(<p>)/g, '$1').replace(/<\/p>\s*<\/p>/g, '</p>')
    .replace(/(<\/(?:h[1-4]|p|li|ul|ol|div|table|tr|details|summary|dl)>)/g, '$1\n').replace(/\n{2,}/g, '\n').trim();
}

// ---------- 3. Bausteine für <head> und <body> ----------
function kopf(pfad, teile = {}) {
  const p = PAGES[pfad];
  const url = SITE + urlOf(pfad);
  const zeilen = [
    '<base href="/">',
    `<title>${esc(p.title)}</title>`,
  ];
  if (p.desc) zeilen.push(`<meta name="description" content="${escA(p.desc)}">`);
  zeilen.push(
    `<meta name="robots" content="${p.noindex ? 'noindex,follow' : 'index,follow'}">`,
    // Die Fehlerseite hat keine eigene Adresse und darum kein canonical
    ...(pfad === '/404' ? [] : [`<link rel="canonical" href="${url}">`]),
    // Icon-Set aus tools/icons.mjs. Die Adressen bleiben dauerhaft gleich.
    '<link rel="icon" href="/favicon.ico" sizes="48x48">',
    '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
    '<link rel="manifest" href="/site.webmanifest">',
    '<meta property="og:type" content="website">',
    `<meta property="og:site_name" content="${NAME}">`,
    '<meta property="og:locale" content="de_CH">',
    `<meta property="og:title" content="${escA(p.title)}">`,
    `<meta property="og:description" content="${escA(p.desc || '')}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${SITE}${VORSCHAU.url}">`,
    `<meta property="og:image:width" content="${VORSCHAU.breite}">`,
    `<meta property="og:image:height" content="${VORSCHAU.hoehe}">`,
    `<meta property="og:image:alt" content="${escA(VORSCHAU.alt)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:image" content="${SITE}${VORSCHAU.url}">`,
    '<style>x-dc{display:none!important}</style>',
  );
  if (pfad === '/') {
    const ld = { '@context': 'https://schema.org', '@graph': [
      { '@type': 'WebSite', '@id': SITE + '/#website', url: SITE + '/', name: NAME, inLanguage: 'de-CH', publisher: { '@id': SITE + '/#firma' } },
      { '@type': 'ProfessionalService', '@id': SITE + '/#firma', name: NAME, url: SITE + '/', email: EMAIL, description: p.desc,
        image: SITE + VORSCHAU.url, logo: SITE + '/favicon.svg', priceRange: 'CHF ' + PREISE[0] + ' bis ' + PREISE[2],
        address: { '@type': 'PostalAddress', streetAddress: 'Gubelweg 23', postalCode: '8965', addressLocality: 'Berikon', addressRegion: 'AG', addressCountry: 'CH' },
        areaServed: { '@type': 'Country', name: 'Schweiz' }, founder: { '@type': 'Person', name: 'Nico Robin Bodmer' },
        hasOfferCatalog: { '@type': 'OfferCatalog', name: 'Website-Pakete zum Fixpreis', itemListElement: [
          ['Website', 'Eine Seite mit allen Abschnitten, Kontaktformular, eine Korrekturrunde'],
          ['Standard', 'Bis 5 Unterseiten, Bildergalerie, Google-Unternehmensprofil, zwei Korrekturrunden'],
          ['Pro', 'Bis 10 Seiten, Online-Terminbuchung, zweite Sprache, Texte selbst bearbeiten, drei Korrekturrunden'],
        ].map(([n, d], i) => ({ '@type': 'Offer', name: 'Paket ' + n, description: d, price: String(PREISE[i]), priceCurrency: 'CHF', url: SITE + '/angebot/' })) } },
    ] };
    // Fragen nur, wenn sie auf der Seite sichtbar sind (aufklappbar zählt)
    if (teile.faq && teile.faq.length) ld['@graph'].push({ '@type': 'FAQPage', '@id': SITE + '/#fragen', mainEntity: teile.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });
    zeilen.push(`<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`);
  }
  return zeilen.join('\n');
}

// Der Vorab-Block ist auch ohne JavaScript sichtbar. Nur der Projekt-Check braucht JavaScript: Dort steht ein Hinweis.
function noscriptBlock(pfad) {
  if (pfad !== '/projekt-check') return '';
  return `<noscript><p class="ohne-js">Der Projekt-Check braucht JavaScript. Schreiben Sie mir stattdessen: <a href="mailto:${escA(EMAIL)}">${esc(EMAIL)}</a></p></noscript>`;
}

// Vorlage (<x-dc> und Komponenten-Skript) aus der Quelle. Sie kommt nicht in die Seiten, sondern nach assets/js/vorlage.js.
const VORLAGE_RE = /<x-dc>[\s\S]*<\/x-dc>\s*<script type="text\/x-dc"[\s\S]*?<\/script>\n?/;
const vorlageHtml = (quelle.match(VORLAGE_RE) || [])[0];
if (!vorlageHtml) throw new Error('Vorlage <x-dc> mit Komponenten-Skript in src/seite.html nicht gefunden.');
const vorlageJs = '// Erzeugt mit tools/seo-build.mjs aus src/seite.html. Nicht von Hand ändern.\n' +
  '// Setzt die Vorlage mit allen Seiten ins Dokument, bevor assets/js/support.js sie mit React aufbaut.\n' +
  'document.body.insertAdjacentHTML(\'beforeend\', ' + JSON.stringify(vorlageHtml.trim()).replace(/<\/(script)/gi, '<\\/$1') + ');\n';
const VORLAGE_URL = 'assets/js/vorlage.js?v=' + createHash('sha256').update(vorlageJs).digest('hex').slice(0, 10);

function baueSeite(pfad, teile) {
  let html = quelle;
  const tausche = (von, bis, inhalt) => {
    const re = new RegExp(`${von}[\\s\\S]*?${bis}`);
    if (!re.test(html)) throw new Error(`Marker ${von} fehlt in index.html`);
    html = html.replace(re, () => `${von}\n${inhalt}\n${bis}`);
  };
  tausche('<!-- seo:start -->', '<!-- seo:end -->', kopf(pfad, teile) +
    // Vorlage früh, aber nachrangig laden: Sie wird erst nach dem ersten Zeichnen gebraucht
    `\n<link rel="preload" href="${VORLAGE_URL}" as="script" fetchpriority="low">`);
  tausche('<!-- seo-noscript:start -->', '<!-- seo-noscript:end -->', noscriptBlock(pfad));
  // Vorab gerenderte Fassung: sichtbar ab dem ersten Zeichnen, React ersetzt sie beim Aufbau (componentDidMount)
  tausche('<!-- vorab:start -->', '<!-- vorab:end -->', teile.vorab ? `<div id="vorab">${teile.vorab}</div>` : '');
  html = html.replace(/<html(\s[^>]*)?>/, '<html lang="de-CH">');
  // Ohne Vorlage: keine Inhalte anderer Seiten, keine {{ }} im ausgelieferten HTML
  html = html.replace(VORLAGE_RE, '');
  if (!html.includes("VORLAGE=/*vorlage*/''")) throw new Error('Lader für die Vorlage in src/seite.html nicht gefunden.');
  html = html.replace("VORLAGE=/*vorlage*/''", `VORLAGE='${VORLAGE_URL}'`);
  return html;
}

// ---------- 4. Ablauf ----------
const server = await startServer(PAGES);
const basis = `http://127.0.0.1:${server.address().port}`;
const chrome = await startChrome();
const geschrieben = [];
const fingerabdruck = {};
try {
  for (const pfad of Object.keys(PAGES)) {
    let teile;
    teile = await chrome.ausfuehren(basis + urlOf(pfad), AUSZUG);
    // Der Projekt-Check zeigt vorab die erste Frage. Er hat wenig Text, darum keine Mindestlänge.
    if (pfad !== '/projekt-check' && (!teile.main || teile.main.length < 80)) throw new Error('Leerer Textauszug für ' + pfad);
    const ziel = pfad === '/' ? 'index.html' : pfad === '/404' ? '404.html' : join(pfad.slice(1), 'index.html');
    mkdirSync(dirname(join(ROOT, ziel)), { recursive: true });
    writeFileSync(join(ROOT, ziel), baueSeite(pfad, teile));
    fingerabdruck[pfad] = createHash('sha256').update(teile.main + (teile.title || '') + (PAGES[pfad].desc || '')).digest('hex').slice(0, 16);
    geschrieben.push(`${ziel.padEnd(34)} ${String(Math.round(teile.main.length / 100) / 10).padStart(5)} KB Text`);
  }
} finally {
  chrome.schliessen();
  server.close();
}

writeFileSync(join(ROOT, 'assets', 'js', 'vorlage.js'), vorlageJs);
geschrieben.push('assets/js/vorlage.js'.padEnd(34) + ` ${String(Math.round(vorlageJs.length / 102.4) / 10).padStart(5)} KB, ${VORLAGE_URL.split('?')[1]}`);

// lastmod: Datum der letzten Textänderung je Seite. Fingerabdrücke in tools/sitemap-stand.json.
const STAND_DATEI = join(ROOT, 'tools', 'sitemap-stand.json');
const stand = existsSync(STAND_DATEI) ? JSON.parse(readFileSync(STAND_DATEI, 'utf8')) : {};
const heute = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Zurich' }).format(new Date());
for (const [p, fp] of Object.entries(fingerabdruck)) {
  if (!stand[p] || stand[p].fp !== fp) stand[p] = { fp, lastmod: heute };
}
writeFileSync(STAND_DATEI, JSON.stringify(stand, null, 2) + '\n');
const indexierbar = Object.keys(PAGES).filter((p) => !PAGES[p].noindex);
writeFileSync(join(ROOT, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  indexierbar.map((p) => `  <url><loc>${SITE}${urlOf(p)}</loc><lastmod>${(stand[p] || {}).lastmod || heute}</lastmod></url>`).join('\n') + '\n</urlset>\n');
writeFileSync(join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
geschrieben.push('sitemap.xml'.padEnd(34) + `${indexierbar.length} Adressen`, 'robots.txt');

console.log(geschrieben.join('\n'));
console.log('Nicht in der Suche (noindex):', Object.keys(PAGES).filter((p) => PAGES[p].noindex).join(', '));

// ---------- 5. Wissensbasis des Chat-Assistenten aus denselben Seiten ----------
await import('./wissen-build.mjs');

// ---------- 6. Felddefinition des Projekt-Checks für den Worker anfrage-proxy/ ----------
await import('./anfrage-schema.mjs');
