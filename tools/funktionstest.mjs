#!/usr/bin/env node
// Funktionstests für odera.ch mit Playwright und dem installierten Google Chrome.
//
//   node tools/funktionstest.mjs [basis-url] [teil,teil,...]
//
// Basis: Standard http://127.0.0.1:8792 (Server aus .claude/launch.json oder `python3 -m http.server 8792`).
// Teile: routen, navigation, check, kurz, chat, generator, einblicke, statistik (Standard: alle ausser statistik).
// «einblicke» prüft die statischen Seiten unter /einblicke/ (Blog aus dem Akquise-Tool): Menüpunkt, Menü auf dem
// Handy, Übersicht und, falls vorhanden, den neuesten Artikel mit Titelbild, JSON-LD und Projekt-Check.
// Der Versand des Projekt-Checks wird abgefangen (kein E-Mail an Nico, kein Turnstile): geprüft wird, dass die
// Seite korrekt sendet und den Dankesbildschirm zeigt. Der Worker selbst hat eigene Tests (anfrage-proxy/test/).
// Der Chat nutzt nur die vier lokal beantworteten Vorschläge, damit keine Anfrage an das Sprachmodell geht.

import { chromium, devices } from 'playwright';

const args = process.argv.slice(2);
const BASIS = (args.find((a) => /^https?:/.test(a)) || 'http://127.0.0.1:8792').replace(/\/$/, '');
const TEILE = (args.find((a) => !/^https?:/.test(a)) || 'routen,navigation,check,kurz,chat,generator,einblicke').split(',');
const ROUTEN = ['/', '/angebot/', '/ablauf/', '/musterprojekte/', '/ueber-mich/', '/projekt-check/', '/datenschutz/', '/impressum/', '/agb/',
  ...(process.env.ROUTEN_ZUSATZ ? process.env.ROUTEN_ZUSATZ.split(',') : [])];
const BREITEN = [390, 834, 1440];

let fehler = 0;
const ok = (b, text) => { if (!b) fehler++; console.log(`${b ? '✓' : '✗'} ${text}`); return b; };
const warte = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'chrome' });

// Statistik-Banner: Die übrigen Teile laufen wie bei einem Besucher, der die Statistik abgelehnt hat.
async function neuerKontext(optionen, wahl = 'nein') {
  const ctx = await browser.newContext(optionen);
  if (wahl) await ctx.addInitScript((w) => { try { localStorage.setItem('odera-statistik', w); } catch (e) { /* ohne Speicher */ } }, wahl);
  return ctx;
}

// Konsolenfehler, Seitenfehler und fehlgeschlagene Anfragen eines Tabs sammeln
function beobachten(page) {
  const probleme = [];
  page.on('console', (m) => { if (m.type() === 'error') probleme.push('Konsole: ' + m.text().slice(0, 160)); });
  page.on('pageerror', (e) => probleme.push('Fehler: ' + String(e.message || e).slice(0, 160)));
  page.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith(BASIS)) probleme.push(`HTTP ${r.status()}: ${r.url().replace(BASIS, '')}`); });
  return probleme;
}

// Versand und Turnstile abfangen
async function versandAbfangen(ctx) {
  const gesendet = [];
  await ctx.route('https://challenges.cloudflare.com/**', (route) => route.fulfill({ contentType: 'text/javascript',
    body: 'window.turnstile={render:function(s,o){setTimeout(function(){o.callback("test-token")},20);return 1},reset:function(){}};' }));
  await ctx.route('https://odera-anfrage.odera-chat-proxy.workers.dev/**', async (route) => {
    if (route.request().method() === 'POST') gesendet.push(JSON.parse(route.request().postData() || '{}'));
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"ok":true}' });
  });
  return gesendet;
}

const sichtbar = (page, sel) => page.locator(sel).filter({ visible: true });

// Eine Frage des Projekt-Checks beantworten
async function frageBeantworten(page, nr) {
  const werte = { firma: 'Testbetrieb Muster', ort: 'Wohlen AG', angebot: 'Schreinerei für Küchen und Innenausbau in der Region.', name: 'Anna Test',
    email: 'anna@example.ch', tel: '079 123 45 67', url: 'www.example.ch', domain: 'example.ch', branche: 'Fahrschule', sprache: 'Französisch',
    stoerung: 'Lädt langsam', vorbilder: 'www.example.ch', farben: 'Blau' };
  for (const sel of ['.g-ans .acard', '.g-stil .acard']) {
    const k = sichtbar(page, sel);
    if (await k.count()) { await k.nth(nr % (await k.count())).click(); await warte(150); }
  }
  const karten = sichtbar(page, '.g-karten .kcard[aria-disabled="false"]');
  if (await karten.count()) { await karten.first().click(); await warte(100); }
  const felder = sichtbar(page, '.qright input[data-k]');
  for (let i = 0; i < await felder.count(); i++) {
    const f = felder.nth(i); const k = await f.getAttribute('data-k');
    if (werte[k] && !(await f.inputValue())) await f.fill(werte[k]);
  }
}

async function checkDurchspielen(page, maxSchritte = 30) {
  for (let i = 0; i < maxSchritte; i++) {
    if (await sichtbar(page, '.eg-paket').count()) return i;
    await frageBeantworten(page, i);
    await sichtbar(page, '.q-weiter-knopf').first().click();
    await warte(350);
  }
  return -1;
}

async function senden(page, gesendet, art) {
  const mail = sichtbar(page, '#mf-email');
  if (await mail.count() && !(await mail.inputValue())) await mail.fill('anna@example.ch');
  const zustimmung = sichtbar(page, '.mf-check input[type=checkbox]').first();
  if (await zustimmung.count() && !(await zustimmung.isChecked())) await zustimmung.check();
  const vorher = gesendet.length;
  await sichtbar(page, '.mf-haupt').first().click();
  for (let i = 0; i < 40 && !(await sichtbar(page, '.dk-titel').count()); i++) await warte(250);
  ok(gesendet.length === vorher + 1 && gesendet.at(-1).art === art, `Projekt-Check (${art}): Anfrage an den Worker gesendet, ${Object.keys(gesendet.at(-1)?.felder || {}).length} Felder`);
  ok(await sichtbar(page, '.dk-titel').count() > 0, `Projekt-Check (${art}): Dankesbildschirm erscheint`);
}

try {
  if (TEILE.includes('routen')) {
    for (const breite of BREITEN) {
      const ctx = await neuerKontext({ viewport: { width: breite, height: 900 }, reducedMotion: 'reduce', ...(breite < 768 ? { isMobile: true, hasTouch: true } : {}) });
      for (const r of ROUTEN) {
        const page = await ctx.newPage();
        const probleme = beobachten(page);
        const antwort = await page.goto(BASIS + r, { waitUntil: 'networkidle' });
        await warte(700);
        const m = await page.evaluate(() => ({ h1: [...document.querySelectorAll('h1')].filter((h) => h.getClientRects().length || h.classList.contains('rechner-sr')).length,
          ueberlauf: document.documentElement.scrollWidth - window.innerWidth, laufzeit: !!document.getElementById('dc-root') }));
        ok(antwort.status() === 200 && m.laufzeit && m.h1 === 1 && m.ueberlauf <= 0 && !probleme.length,
          `${String(breite).padStart(4)} px ${r}: Status ${antwort.status()}, h1 ${m.h1}, Überlauf ${m.ueberlauf} px${probleme.length ? ', ' + probleme.join(' | ') : ''}`);
        await page.close();
      }
      await ctx.close();
    }
  }

  if (TEILE.includes('navigation')) {
    const ctx = await neuerKontext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const probleme = beobachten(page);
    await page.goto(BASIS + '/', { waitUntil: 'networkidle' });
    await warte(500);
    for (const [label, pfad] of [['Angebot', '/angebot/'], ['Ablauf', '/ablauf/'], ['Musterprojekte', '/musterprojekte/'], ['Über mich', '/ueber-mich/']]) {
      await page.locator('header nav a', { hasText: label }).filter({ visible: true }).first().click();
      await warte(500);
      const h1 = await page.evaluate(() => [...document.querySelectorAll('main h1')].filter((h) => h.getClientRects().length).map((h) => h.textContent.trim()));
      ok(new URL(page.url()).pathname === pfad && h1.length === 1, `Navigation «${label}» → ${new URL(page.url()).pathname}, h1 «${h1[0] || ''}»`);
    }
    await page.goBack(); await warte(400);
    ok(new URL(page.url()).pathname === '/musterprojekte/', 'Zurück im Browser führt auf die vorherige Seite');
    ok(!probleme.length, 'Navigation ohne Konsolenfehler' + (probleme.length ? ': ' + probleme.join(' | ') : ''));
    await ctx.close();
  }

  if (TEILE.includes('check')) {
    for (const geraet of ['desktop', 'handy']) {
      const ctx = await neuerKontext(geraet === 'handy' ? { ...devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 } });
      const gesendet = await versandAbfangen(ctx);
      const page = await ctx.newPage();
      const probleme = beobachten(page);
      await page.goto(BASIS + '/projekt-check/', { waitUntil: 'networkidle' });
      await warte(600);
      // Weiter ist nie gesperrt: ohne Antwort erscheint der Fehler am Feld, Fokus im ersten Fehler
      await sichtbar(page, '.q-weiter-knopf').first().click();
      await warte(300);
      const fehlerZu = await page.evaluate(() => ({ fehler: [...document.querySelectorAll('.f-fehler[data-an="1"]')].filter((e) => e.getClientRects().length).map((e) => e.textContent.trim()),
        fokus: document.activeElement && document.activeElement.getAttribute('data-k') }));
      ok(fehlerZu.fehler.length > 0 && fehlerZu.fokus === 'firma', `${geraet}: Weiter ohne Pflichtfeld zeigt Fehler am Feld (${fehlerZu.fehler[0] || '-'}) und setzt den Fokus`);
      // Tippfehler-Vorschlag bei der E-Mail kommt später, hier Zurück testen
      await frageBeantworten(page, 0); await sichtbar(page, '.q-weiter-knopf').first().click(); await warte(300);
      await frageBeantworten(page, 1); await sichtbar(page, '.q-weiter-knopf').first().click(); await warte(300);
      const titelVor = await sichtbar(page, '.qleft h2').first().textContent();
      await page.locator('.q-leiste button', { hasText: 'Zurück' }).filter({ visible: true }).first().click(); await warte(300);
      const titelZurueck = await sichtbar(page, '.qleft h2').first().textContent();
      ok(titelVor !== titelZurueck && /Branche/.test(titelZurueck), `${geraet}: Zurück führt zur vorherigen Frage («${titelZurueck.trim()}»)`);
      const schritte = await checkDurchspielen(page);
      ok(schritte > 0, `${geraet}: alle Fragen beantwortet, Ergebnis nach ${schritte} Schritten (${(await sichtbar(page, '.eg-paket').first().textContent().catch(() => '')).trim()})`);
      if (schritte > 0) {
        // Antworten durchsehen, eine ändern, zurück zum Ergebnis
        await sichtbar(page, '.eg-review').first().click(); await warte(300);
        ok(await sichtbar(page, '.rv-edit').count() >= 10, `${geraet}: Übersicht der Antworten (${await sichtbar(page, '.rv-edit').count()} Zeilen)`);
        await sichtbar(page, '.rv-edit').nth(1).click(); await warte(300);
        ok(await sichtbar(page, '.editbar-btn').count() > 0, `${geraet}: «Ändern» öffnet die Frage mit Leiste «Zurück zum Ergebnis»`);
        await sichtbar(page, '.editbar-btn').first().click(); await warte(300);
        ok(await sichtbar(page, '.eg-paket').count() > 0, `${geraet}: «Zurück zum Ergebnis» führt zum Ergebnis`);
        const gemerkt = await page.evaluate(() => Object.keys(sessionStorage).length);
        ok(gemerkt > 0, `${geraet}: Antworten im sessionStorage gemerkt`);
        await senden(page, gesendet, 'voll');
      }
      ok(!probleme.length, `${geraet}: Projekt-Check ohne Konsolenfehler` + (probleme.length ? ': ' + probleme.join(' | ') : ''));
      await ctx.close();
    }
  }

  if (TEILE.includes('kurz')) {
    const ctx = await neuerKontext({ viewport: { width: 1440, height: 900 } });
    const gesendet = await versandAbfangen(ctx);
    const page = await ctx.newPage();
    const probleme = beobachten(page);
    await page.goto(BASIS + '/projekt-check/?kurz=1', { waitUntil: 'networkidle' });
    await warte(600);
    const schritte = await checkDurchspielen(page, 8);
    ok(schritte > 0 && schritte <= 4, `Kurzversion: Ergebnis nach ${schritte} Schritten`);
    if (schritte > 0) await senden(page, gesendet, 'kurz');
    ok(!probleme.length, 'Kurzversion ohne Konsolenfehler' + (probleme.length ? ': ' + probleme.join(' | ') : ''));
    await ctx.close();
  }

  if (TEILE.includes('chat')) {
    for (const geraet of ['desktop', 'handy']) {
      const ctx = await neuerKontext(geraet === 'handy' ? { ...devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 } });
      const anfragenKi = [];
      await ctx.route('https://odera-chat.odera-chat-proxy.workers.dev/**', (route) => { anfragenKi.push(route.request().url()); route.abort(); });
      const page = await ctx.newPage();
      const probleme = beobachten(page);
      await page.goto(BASIS + '/', { waitUntil: 'networkidle' });
      await warte(600);
      const knopf = geraet === 'handy' ? sichtbar(page, '.mobbar-chat, .chat-btn') : sichtbar(page, '.chat-btn');
      if (geraet === 'handy') { await page.mouse.wheel(0, 1200); await warte(600); }
      await knopf.first().click();
      await page.waitForSelector('[role=dialog].oc-root, .oc-root [role=dialog], [role=dialog] .oc-chip', { timeout: 5000 }).catch(() => {});
      const chip = sichtbar(page, '.oc-chip');
      ok(await chip.count() === 4, `${geraet}: Chat öffnet mit vier Vorschlägen`);
      if (await chip.count()) {
        await chip.first().click();
        await warte(1200);
        const antworten = await sichtbar(page, '.oc-ki').count();
        ok(antworten >= 1 && !anfragenKi.length, `${geraet}: Vorschlag lokal beantwortet (${antworten} Antwort, ${anfragenKi.length} Anfragen ans Sprachmodell)`);
      }
      await page.keyboard.press('Escape'); await warte(400);
      ok(!(await sichtbar(page, '.oc-chip').count()), `${geraet}: Escape schliesst den Chat`);
      ok(!probleme.length, `${geraet}: Chat ohne Konsolenfehler` + (probleme.length ? ': ' + probleme.join(' | ') : ''));
      await ctx.close();
    }
  }

  if (TEILE.includes('generator')) {
    const ctx = await neuerKontext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const probleme = beobachten(page);
    const fremd = [];
    page.on('request', (r) => { if (!r.url().startsWith(BASIS) && !r.url().startsWith('data:')) fremd.push(r.url()); });
    await page.goto(BASIS + '/musterprojekte/', { waitUntil: 'networkidle' });
    await warte(500);
    await page.locator('#gen-buehne').filter({ visible: true }).first().scrollIntoViewIfNeeded();
    await page.waitForSelector('#gen-name', { state: 'visible', timeout: 8000 }).catch(() => {});
    ok(await sichtbar(page, '#gen-name').count() > 0, 'Vorschau-Werkzeug lädt beim Heranscrollen');
    await page.fill('#gen-name', 'Testbetrieb Muster');
    await page.fill('#gen-ort', 'Berikon');
    const chips = sichtbar(page, '.gen-chips [role=radio]');
    const n = await chips.count();
    ok(n === 6, `Vorschau-Werkzeug: ${n} Branchen`);
    for (let i = 0; i < n; i++) {
      await chips.nth(i).click(); await warte(250);
      const v = await page.evaluate(() => ({ name: (document.querySelector('.ms-name') || {}).textContent || '', bild: !!document.querySelector('.ms-bild'), domain: (document.querySelector('.gen-domain, .gen-adresse') || {}).textContent || '' }));
      ok(/Testbetrieb Muster/.test(v.name) && v.bild, `Branche «${(await chips.nth(i).textContent()).trim()}»: Vorschau mit Name und Bild, Adresse ${v.domain.trim()}`);
    }
    await sichtbar(page, '.gen-seg [data-geraet="handy"]').first().click(); await warte(300);
    ok(await page.evaluate(() => !!document.querySelector('.gen-handy')), 'Umschalter Handy zeigt die Handy-Ansicht');
    await sichtbar(page, '.gen-beispiel').first().click(); await warte(300);
    ok(await page.inputValue('#gen-name') !== 'Testbetrieb Muster', `«Beispiel zeigen» füllt ein Beispiel ein (${await page.inputValue('#gen-name')})`);
    await page.fill('#gen-name', 'Testbetrieb Muster');
    await chips.first().click(); await warte(200);
    await sichtbar(page, '.gen-start').first().click(); await warte(800);
    const check = await page.evaluate(() => ({ pfad: location.pathname, such: location.search, firma: (document.querySelector('input[data-k="firma"]') || {}).value || '' }));
    ok(check.pfad === '/projekt-check/' && !check.such && /Testbetrieb Muster/.test(check.firma), `Übergabe an den Projekt-Check ohne URL-Parameter, Betrieb vorausgefüllt («${check.firma}»)`);
    ok(!fremd.length, 'Vorschau-Werkzeug ohne Anfragen an fremde Server' + (fremd.length ? ': ' + fremd.join(', ') : ''));
    ok(!probleme.length, 'Vorschau-Werkzeug ohne Konsolenfehler' + (probleme.length ? ': ' + probleme.join(' | ') : ''));
    await ctx.close();
  }
  if (TEILE.includes('einblicke')) {
    // Desktop: Menüpunkt in der Kopfzeile, Übersicht, neuester Artikel
    const ctx = await neuerKontext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const probleme = beobachten(page);
    await page.goto(BASIS + '/', { waitUntil: 'networkidle' });
    await warte(500);
    await page.locator('header nav a', { hasText: 'Einblicke' }).filter({ visible: true }).first().click();
    await page.waitForURL('**/einblicke/');
    await warte(500);
    const ueb = await page.evaluate(() => ({
      h1: [...document.querySelectorAll('main h1')].map((h) => h.textContent.trim()),
      aktiv: (document.querySelector('.navmid a[aria-current="page"]') || {}).textContent,
      strich: (() => { const u = document.querySelector('.navmid > span[aria-hidden="true"]'); return u ? { o: getComputedStyle(u).opacity, w: u.getBoundingClientRect().width } : null; })(),
      react: !!document.getElementById('dc-root') || !!window.React,
      karten: [...document.querySelectorAll('.eb-karte a')].map((a) => a.getAttribute('href')),
      robots: (document.querySelector('meta[name="robots"]') || {}).content,
      canonical: (document.querySelector('link[rel="canonical"]') || {}).href,
      ueberlauf: document.documentElement.scrollWidth - window.innerWidth,
    }));
    ok(ueb.h1.length === 1 && ueb.h1[0] === 'Einblicke' && ueb.aktiv && ueb.aktiv.trim() === 'Einblicke' && ueb.strich && ueb.strich.o === '1' && ueb.strich.w > 20,
      `Einblicke: Menüpunkt führt zur Übersicht, «Einblicke» markiert (h1 «${ueb.h1[0]}»)`);
    ok(!ueb.react && ueb.canonical === 'https://odera.ch/einblicke/' && ueb.ueberlauf <= 0 && ueb.robots === (ueb.karten.length ? 'index,follow' : 'noindex,follow'),
      `Einblicke: statisch ohne React, canonical, ${ueb.karten.length} Artikel, robots ${ueb.robots}`);
    if (ueb.karten.length) {
      await page.locator('.eb-karte a').first().click();
      await page.waitForURL('**' + ueb.karten[0]);
      await warte(500);
      const art = await page.evaluate(async () => {
        const img = document.querySelector('.eb-bild img');
        if (img && !img.complete) await new Promise((r) => { img.onload = r; img.onerror = r; });
        const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent));
        return {
          h1: [...document.querySelectorAll('main h1')].length,
          h2: document.querySelectorAll('.eb-text h2').length,
          bild: img ? img.naturalWidth : 0,
          alt: img ? img.alt : '',
          artikel: ld.some((d) => (d['@graph'] || [d]).some((x) => x['@type'] === 'Article')),
          og: (document.querySelector('meta[property="og:image"]') || {}).content,
          cta: (document.querySelector('.eb-cta a.btn') || {}).getAttribute ? document.querySelector('.eb-cta a.btn').getAttribute('href') : null,
          worte: document.querySelector('.eb-text').innerText.split(/\s+/).length,
        };
      });
      ok(art.h1 === 1 && art.h2 >= 3 && art.bild > 0 && art.alt.length > 10 && art.artikel && art.cta === '/projekt-check/?quelle=einblicke',
        `Einblicke: Artikel ${ueb.karten[0]} mit Titelbild (${art.bild} px), Alt-Text, ${art.h2} Zwischentiteln, JSON-LD Article, ${art.worte} Wörter`);
      const og = await page.request.get(BASIS + new URL(art.og).pathname);
      ok(og.status() === 200, `Einblicke: Vorschaubild ${new URL(art.og).pathname} vorhanden`);
      await page.locator('.eb-cta a.btn').click();
      await page.waitForURL('**/projekt-check/**');
      await warte(800);
      ok(await page.locator('.q-weiter-knopf').filter({ visible: true }).count() > 0, 'Einblicke: Knopf führt in den Projekt-Check');
    }
    ok(!probleme.length, 'Einblicke (Desktop) ohne Konsolenfehler' + (probleme.length ? ': ' + probleme.join(' | ') : ''));
    await ctx.close();

    // Handy: blaues Menü öffnen, Einblicke markiert, Escape schliesst, Link führt weiter
    const hctx = await neuerKontext({ ...devices['iPhone 13'] });
    const h = await hctx.newPage();
    const hprob = beobachten(h);
    await h.goto(BASIS + '/einblicke/', { waitUntil: 'networkidle' });
    await warte(500);
    await h.locator('.kopf .burger-knopf').click();
    await warte(700);
    const offen = await h.evaluate(() => ({ menue: document.documentElement.dataset.menue, links: [...document.querySelectorAll('#menue .menue-link')].filter((a) => a.getClientRects().length).map((a) => a.textContent.trim()),
      aktiv: (document.querySelector('#menue .menue-link[aria-current="page"]') || {}).textContent, fix: document.body.style.position }));
    ok(offen.menue === '1' && offen.links.length === 5 && offen.links.includes('Einblicke') && offen.aktiv && offen.aktiv.trim() === 'Einblicke' && offen.fix === 'fixed',
      `Einblicke (Handy): Menü offen mit ${offen.links.join(', ')}`);
    await h.keyboard.press('Escape');
    await warte(500);
    const zu = await h.evaluate(() => ({ menue: document.documentElement.dataset.menue || null, sichtbar: !document.getElementById('menue').hidden, fix: document.body.style.position }));
    ok(!zu.menue && !zu.sichtbar && !zu.fix, 'Einblicke (Handy): Escape schliesst das Menü und gibt das Scrollen frei');
    await h.locator('.kopf .burger-knopf').click();
    await warte(700);
    await h.locator('#menue .menue-link', { hasText: 'Angebot' }).click();
    await h.waitForURL('**/angebot/');
    ok(true, 'Einblicke (Handy): Link im Menü führt zur Seite Angebot');
    ok(!hprob.length, 'Einblicke (Handy) ohne Konsolenfehler' + (hprob.length ? ': ' + hprob.join(' | ') : ''));
    await hctx.close();
  }

  if (TEILE.includes('statistik')) {
    // Banner, Einwilligung, Widerruf und gesendete Ereignisse (an odera-stats, hier abgefangen)
    for (const [geraet, optionen] of [['Desktop', { viewport: { width: 1440, height: 900 } }], ['Handy', { ...devices['iPhone 13'] }]]) {
      const ctx = await neuerKontext(optionen, null);
      const gesendet = [];
      await ctx.route('https://odera-stats.odera-chat-proxy.workers.dev/**', async (route) => {
        try { gesendet.push(JSON.parse(route.request().postData() || '{}')); } catch (e) { gesendet.push({ fehler: true }); }
        await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': BASIS } });
      });
      const page = await ctx.newPage();
      const probleme = beobachten(page);
      await page.goto(BASIS + '/', { waitUntil: 'networkidle' });
      const banner = page.locator('.st-banner');
      ok(!(await banner.isVisible().catch(() => false)), `${geraet}: Banner bremst das erste Zeichnen nicht (erscheint verzögert)`);
      await warte(2800);
      ok(await banner.isVisible(), `${geraet}: Banner erscheint ohne gespeicherte Wahl`);
      const knoepfe = await banner.locator('button').evaluateAll((b) => b.map((x) => ({ t: x.textContent, k: x.className, w: Math.round(x.getBoundingClientRect().width) })));
      ok(knoepfe.length === 2 && knoepfe[0].k === knoepfe[1].k && /Zustimmen/.test(knoepfe[0].t) && /Ablehnen/.test(knoepfe[1].t), `${geraet}: Zustimmen und Ablehnen gleichwertig`);
      const breite = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
      ok(breite, `${geraet}: Banner ohne seitliches Scrollen`);
      await page.mouse.wheel(0, 2000); await warte(1500);
      ok(!gesendet.length, `${geraet}: vor der Wahl wird nichts gesendet`);
      await banner.getByRole('button', { name: 'Ablehnen' }).click();
      await warte(300);
      ok(!(await banner.isVisible().catch(() => false)), `${geraet}: Banner nach Ablehnen weg`);
      await page.mouse.wheel(0, 3000); await warte(6000);
      ok(!gesendet.length, `${geraet}: nach Ablehnen wird nichts gesendet`);
      // Wahl ändern über die Fusszeile
      await page.locator('[data-statistik-einstellungen]').filter({ visible: true }).first().click();
      await warte(300);
      ok(/Zurzeit ausgeschaltet/.test(await banner.textContent()), `${geraet}: Einstellungen öffnen den Banner mit der aktuellen Wahl`);
      await banner.getByRole('button', { name: 'Zustimmen' }).click();
      await page.evaluate(() => window.scrollTo(0, 0)); await warte(300);
      for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, 700); await warte(250); }
      await warte(6000);
      const ereignisse = gesendet.flatMap((g) => g.e || []);
      const typen = new Set(ereignisse.map((e) => e.t));
      ok(typen.has('consent_yes') && typen.has('page_view'), `${geraet}: nach Zustimmen kommen consent_yes und page_view`);
      const abschnitte = new Set(ereignisse.filter((e) => e.t === 'section_view').map((e) => e.z));
      ok(['hero', 'preise', 'abschluss'].every((x) => abschnitte.has(x)), `${geraet}: Abschnitte der Startseite gemessen (${[...abschnitte].join(', ')})`);
      ok(ereignisse.some((e) => e.t === 'scroll' && e.n === 100), `${geraet}: Scrolltiefe gemessen`);
      const erste = ereignisse.find((e) => e.t === 'page_view');
      ok(erste && erste.erster === true && 'r' in erste, `${geraet}: erster Seitenaufruf mit Herkunft`);
      ok(gesendet.every((g) => /^[A-Za-z0-9_-]{16,40}$/.test(g.s || '') && ['mobil', 'tablet', 'desktop'].includes(g.g)), `${geraet}: zufällige Sitzungs-ID und Gerätetyp`);
      ok(!(await ctx.cookies()).length, `${geraet}: keine Cookies`);
      // Seitenwechsel ohne Neuladen und Projekt-Check
      const vorher = ereignisse.length;
      await page.evaluate(() => window.scrollTo(0, 0));
      await sichtbar(page, 'a[href="/projekt-check/"]').first().click();
      await warte(2500);
      await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
      await warte(6000);
      const neu = gesendet.flatMap((g) => g.e || []).slice(vorher);
      ok(neu.some((e) => e.t === 'cta_click'), `${geraet}: Klick auf den Projekt-Check gemessen`);
      ok(neu.some((e) => e.t === 'page_view' && e.p === '/projekt-check/') && neu.some((e) => e.t === 'projektcheck_start') && neu.some((e) => e.t === 'projektcheck_step' && e.n === 1), `${geraet}: Projekt-Check: Seitenaufruf, Start und Schritt 1`);
      ok(!JSON.stringify(gesendet).match(/@|Testbetrieb/), `${geraet}: keine Eingaben in den gesendeten Daten`);
      // Widerruf (Fusszeile auf der Startseite; der Projekt-Check hat keine Fusszeile)
      await page.goto(BASIS + '/', { waitUntil: 'networkidle' }); await warte(800);
      await page.locator('[data-statistik-einstellungen]').filter({ visible: true }).first().click();
      await warte(300);
      await banner.getByRole('button', { name: 'Ablehnen' }).click();
      const nachWiderruf = gesendet.length;
      await page.mouse.wheel(0, 2000); await warte(6000);
      ok(gesendet.length === nachWiderruf, `${geraet}: nach dem Widerruf wird nichts mehr gesendet`);
      ok(!probleme.length, `${geraet}: Statistik ohne Konsolenfehler` + (probleme.length ? ': ' + probleme.join(' | ') : ''));
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}

console.log(fehler ? `\n${fehler} Prüfungen fehlgeschlagen.` : '\nAlle Prüfungen bestanden.');
process.exit(fehler ? 1 : 0);
