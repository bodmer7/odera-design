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

import { readFileSync, writeFileSync, mkdirSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- 1. Angaben aus index.html lesen ----------
const quelle = readFileSync(join(ROOT, 'index.html'), 'utf8');
const pagesText = quelle.match(/ {2}PAGES = (\{[\s\S]*?\n {2}\});/);
if (!pagesText) throw new Error('Tabelle PAGES in index.html nicht gefunden.');
const PAGES = new Function('return ' + pagesText[1])();
const SITE = (quelle.match(/ {2}SITE = '([^']+)';/) || [])[1];
const EMAIL = (quelle.match(/ {2}EMAIL = '([^']+)';/) || [])[1];
if (!SITE || !EMAIL) throw new Error('SITE oder EMAIL in index.html nicht gefunden.');
const NAME = 'ODERA Design';

const urlOf = (p) => (p === '/' ? '/' : p + '/');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escA = (s) => esc(s).replace(/"/g, '&quot;');

// ---------- 2. Kleiner Webserver und Chrome, um jede Seite zu rendern ----------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.txt': 'text/plain', '.xml': 'application/xml' };
function startServer() {
  const server = createServer((req, res) => {
    const pfad = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const route = pfad.replace(/\/index\.html$/, '/').replace(/\/+$/, '') || '/';
    let datei = null;
    if (extname(pfad) && existsSync(join(ROOT, pfad)) && !pfad.endsWith('/index.html')) datei = join(ROOT, pfad);
    else if (PAGES[route]) datei = join(ROOT, 'index.html');
    if (!datei) { res.writeHead(404); res.end('nicht gefunden'); return; }
    res.writeHead(200, { 'content-type': TYPES[extname(datei)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(readFileSync(datei));
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}

async function startChrome() {
  const kandidaten = [process.env.CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean);
  const pfad = kandidaten.find((p) => existsSync(p));
  if (!pfad) throw new Error('Chrome nicht gefunden. Pfad über die Variable CHROME angeben.');
  const port = 9600 + Math.floor(Math.random() * 300);
  const profil = mkdtempSync(join(tmpdir(), 'seo-build-'));
  const proc = spawn(pfad, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`,
    `--user-data-dir=${profil}`, '--no-first-run', '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });
  let ziele;
  for (let i = 0; i < 60; i++) {
    try { ziele = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); if (ziele.length) break; } catch {}
    await sleep(200);
  }
  if (!ziele) throw new Error('Chrome hat nicht gestartet.');
  const ws = new WebSocket(ziele.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0; const offen = new Map();
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && offen.has(m.id)) { const { res, rej } = offen.get(m.id); offen.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); }
  });
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; offen.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  // Ohne Bewegung, damit Zähler und Animationen sofort ihren Endwert zeigen
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  return {
    async ausfuehren(url, ausdruck) {
      await send('Page.navigate', { url });
      for (let i = 0; i < 50; i++) {
        await sleep(200);
        const r = await send('Runtime.evaluate', { expression: `!!document.querySelector('#dc-root main h1')`, returnByValue: true });
        if (r.result.value) break;
      }
      await sleep(700);
      const r = await send('Runtime.evaluate', { expression: ausdruck, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    },
    schliessen() { try { ws.close(); } catch {} proc.kill(); try { rmSync(profil, { recursive: true, force: true }); } catch {} },
  };
}

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
    main: teil('#dc-root main'),
    footer: teil('#dc-root footer'),
  };
})()`;

function formatiere(html) {
  return html.replace(/<p>(<p>)/g, '$1').replace(/<\/p>\s*<\/p>/g, '</p>')
    .replace(/(<\/(?:h[1-4]|p|li|ul|ol|div|table|tr|details|summary|dl)>)/g, '$1\n').replace(/\n{2,}/g, '\n').trim();
}

// ---------- 3. Bausteine für <head> und <body> ----------
function kopf(pfad) {
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
    '<meta name="twitter:card" content="summary">',
    '<style>x-dc{display:none!important}</style>',
  );
  if (pfad === '/') {
    const ld = { '@context': 'https://schema.org', '@graph': [
      { '@type': 'WebSite', '@id': SITE + '/#website', url: SITE + '/', name: NAME, inLanguage: 'de-CH', publisher: { '@id': SITE + '/#firma' } },
      { '@type': 'ProfessionalService', '@id': SITE + '/#firma', name: NAME, url: SITE + '/', email: EMAIL, description: p.desc,
        areaServed: { '@type': 'Country', name: 'Schweiz' }, founder: { '@type': 'Person', name: 'Nico Robin Bodmer' } },
    ] };
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
  tausche('<!-- seo:start -->', '<!-- seo:end -->', kopf(pfad));
  tausche('<!-- seo-noscript:start -->', '<!-- seo-noscript:end -->', noscriptBlock(pfad, teile));
  html = html.replace(/<html(\s[^>]*)?>/, '<html lang="de-CH">');
  return html;
}

// ---------- 4. Ablauf ----------
const server = await startServer();
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
