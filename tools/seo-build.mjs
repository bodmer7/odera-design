#!/usr/bin/env node
// Erzeugt die Suchmaschinen-Angaben der Website.
//
//   node tools/seo-build.mjs
//
// Quelle ist index.html. Daraus entstehen:
//   - je Seite eine eigene Datei mit echter Adresse (angebot/index.html, ablauf/index.html, ...)
//   - 404.html für den Fehlerfall des Webservers
//   - robots.txt und sitemap.xml
// In jeder Datei stehen im <head> eigener Titel, Beschreibung, canonical, robots und Vorschau-Angaben.
// Im <body> steht ein <noscript>-Block mit dem sichtbaren Text der Seite. Er hilft Suchmaschinen und
// Programmen, die kein JavaScript ausführen, und Besucherinnen und Besuchern ohne JavaScript.
//
// Titel, Beschreibung, noindex und SITE liest das Skript aus index.html (Tabelle PAGES und Konstante SITE).
// Braucht Node 22 oder neuer und Google Chrome. Ein anderer Chrome-Pfad geht über die Variable CHROME.
// Nach jeder Änderung an Texten oder Seiten in index.html erneut ausführen und die Ergebnisse einchecken.
// Am Schluss entsteht auch die Wissensbasis des Chat-Assistenten (tools/wissen-build.mjs).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { ROOT, leseSeiten, startServer, startChrome } from './lib/browser.mjs';

// ---------- 1. Angaben aus index.html lesen ----------
const quelle = readFileSync(join(ROOT, 'index.html'), 'utf8');
const PAGES = leseSeiten(quelle);
const SITE = (quelle.match(/ {2}SITE = '([^']+)';/) || [])[1];
const EMAIL = (quelle.match(/ {2}EMAIL = '([^']+)';/) || [])[1];
if (!SITE || !EMAIL) throw new Error('SITE oder EMAIL in index.html nicht gefunden.');
const NAME = 'ODERA Design';
const PREISE = JSON.parse((quelle.match(/ {2}PAKET_PREIS = (\[[^\]]+\]);/) || [])[1] || 'null');
if (!PREISE || PREISE.length !== 3) throw new Error('PAKET_PREIS in index.html nicht gefunden.');
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
    `<link rel="canonical" href="${url}">`,
    '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
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

function noscriptBlock(pfad, teile) {
  const nav = teile.nav.map((n) => `<li><a href="${escA(n.href)}">${esc(n.label)}</a></li>`).join('');
  const kopfzeile = `<header><p><a href="/">${NAME}</a></p><nav aria-label="Hauptnavigation"><ul>${nav}</ul></nav></header>`;
  let haupt = teile.main;
  if (pfad === '/projekt-check') {
    haupt = `<h1>Projekt-Check</h1><p>Der Projekt-Check braucht JavaScript. Schreiben Sie mir stattdessen: <a href="mailto:${escA(EMAIL)}">${esc(EMAIL)}</a></p>`;
  }
  return '<noscript>\n' + formatiere(kopfzeile) + '\n<main>\n' + formatiere(haupt) + '\n</main>\n' +
    (pfad === '/projekt-check' || !teile.footer ? '' : '<footer>\n' + formatiere(teile.footer) + '\n</footer>\n') + '</noscript>';
}

function baueSeite(pfad, teile) {
  let html = quelle;
  const tausche = (von, bis, inhalt) => {
    const re = new RegExp(`${von}[\\s\\S]*?${bis}`);
    if (!re.test(html)) throw new Error(`Marker ${von} fehlt in index.html`);
    html = html.replace(re, () => `${von}\n${inhalt}\n${bis}`);
  };
  tausche('<!-- seo:start -->', '<!-- seo:end -->', kopf(pfad, teile));
  tausche('<!-- seo-noscript:start -->', '<!-- seo-noscript:end -->', noscriptBlock(pfad, teile));
  html = html.replace(/<html(\s[^>]*)?>/, '<html lang="de-CH">');
  return html;
}

// ---------- 4. Ablauf ----------
const server = await startServer(PAGES);
const basis = `http://127.0.0.1:${server.address().port}`;
const chrome = await startChrome();
const geschrieben = [];
try {
  for (const pfad of Object.keys(PAGES)) {
    let teile;
    if (pfad === '/projekt-check') {
      teile = await chrome.ausfuehren(basis + '/', AUSZUG); // Navigation kommt von der Startseite
      teile = { nav: teile.nav, main: '', footer: '' };
    } else {
      teile = await chrome.ausfuehren(basis + urlOf(pfad), AUSZUG);
      if (!teile.main || teile.main.length < 80) throw new Error('Leerer Textauszug für ' + pfad);
    }
    const ziel = pfad === '/' ? 'index.html' : pfad === '/404' ? '404.html' : join(pfad.slice(1), 'index.html');
    mkdirSync(dirname(join(ROOT, ziel)), { recursive: true });
    writeFileSync(join(ROOT, ziel), baueSeite(pfad, teile));
    geschrieben.push(`${ziel.padEnd(34)} ${String(Math.round(teile.main.length / 100) / 10).padStart(5)} KB Text`);
    // Nach der Startseite liegt index.html neu vor. Quelle bleibt die zu Beginn gelesene Fassung.
  }
} finally {
  chrome.schliessen();
  server.close();
}

const indexierbar = Object.keys(PAGES).filter((p) => !PAGES[p].noindex);
writeFileSync(join(ROOT, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  indexierbar.map((p) => `  <url><loc>${SITE}${urlOf(p)}</loc></url>`).join('\n') + '\n</urlset>\n');
writeFileSync(join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
geschrieben.push('sitemap.xml'.padEnd(34) + `${indexierbar.length} Adressen`, 'robots.txt');

console.log(geschrieben.join('\n'));
console.log('Nicht in der Suche (noindex):', Object.keys(PAGES).filter((p) => PAGES[p].noindex).join(', '));

// ---------- 5. Wissensbasis des Chat-Assistenten aus denselben Seiten ----------
await import('./wissen-build.mjs');

// ---------- 6. Felddefinition des Projekt-Checks für den Worker anfrage-proxy/ ----------
await import('./anfrage-schema.mjs');
