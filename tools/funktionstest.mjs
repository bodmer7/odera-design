#!/usr/bin/env node
// Funktionstests für odera.ch mit Playwright und dem installierten Google Chrome.
//
//   node tools/funktionstest.mjs [basis-url] [teil,teil,...]
//
// Basis: Standard http://127.0.0.1:8792 (Server aus .claude/launch.json oder `python3 -m http.server 8792`).
// Teile: routen, navigation, check, weiter, folgefragen, einstiege, handy, kurz, chat, generator, muster, rechner, einblicke,
// statistik (Standard: alle ausser statistik). «handy» prüft bei 390 × 664 px, dass alle Antworten ohne Scrollen sichtbar sind.
// «einblicke» prüft die statischen Seiten unter /einblicke/ (Blog aus dem Akquise-Tool): Menüpunkt, Menü auf dem
// Handy, Übersicht und, falls vorhanden, den neuesten Artikel mit Titelbild, JSON-LD und Projekt-Check.
// Der Versand des Projekt-Checks wird abgefangen (kein E-Mail an Nico, kein Turnstile): geprüft wird, dass die
// Seite korrekt sendet und den Dankesbildschirm zeigt. Der Worker selbst hat eigene Tests (anfrage-proxy/test/).
// Der Chat nutzt nur die vier lokal beantworteten Vorschläge, damit keine Anfrage an das Sprachmodell geht.

import { chromium, devices } from 'playwright';

const args = process.argv.slice(2);
const BASIS = (args.find((a) => /^https?:/.test(a)) || 'http://127.0.0.1:8792').replace(/\/$/, '');
const TEILE = (args.find((a) => !/^https?:/.test(a)) || 'routen,navigation,check,weiter,folgefragen,einstiege,handy,kurz,chat,generator,muster,rechner,einblicke').split(',');
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

// Schlüssel und Nummer der aktuellen Frage aus dem Fortschrittsbalken, zum Beispiel «ZIEL:1»
const frageJetzt = (page) => page.evaluate(() => { const p = [...document.querySelectorAll('.q-prog')].find((x) => x.getClientRects().length); return p ? p.dataset.frage + ':' + p.getAttribute('aria-valuenow') : ''; });
const WERTE = { firma: 'Testbetrieb Muster', ort: 'Wohlen AG', angebot: 'Schreinerei für Küchen und Innenausbau in der Region.', name: 'Anna Test',
  email: 'anna@example.ch', tel: '079 123 45 67', url: 'www.example.ch', branche: 'Fahrschule', sprache: 'Französisch', stoerung: 'Lädt langsam' };
async function felderFuellen(page) {
  const felder = sichtbar(page, '.qright input[data-k]');
  for (let i = 0; i < await felder.count(); i++) {
    const f = felder.nth(i); const k = await f.getAttribute('data-k');
    if (WERTE[k] && !(await f.inputValue())) await f.fill(WERTE[k]);
  }
}

// Eine Frage des Projekt-Checks beantworten. Gibt true zurück, wenn der Check nach einer Einfachauswahl selbst weitergeht.
async function frageBeantworten(page, nr) {
  const vorher = await frageJetzt(page);
  const k = sichtbar(page, '.g-ans .acard');
  if (await k.count()) {
    await k.nth(nr % (await k.count())).click();
    await warte(450);
    if (await frageJetzt(page) !== vorher || await sichtbar(page, '.eg-paket').count()) return true;
  }
  const karten = sichtbar(page, '.g-karten .kcard[aria-disabled="false"]');
  if (await karten.count()) { await karten.first().click(); await warte(100); }
  await felderFuellen(page);
  return false;
}

async function checkDurchspielen(page, maxSchritte = 30) {
  for (let i = 0; i < maxSchritte; i++) {
    if (await sichtbar(page, '.eg-paket').count()) return i;
    if (!(await frageBeantworten(page, i))) { await sichtbar(page, '.q-weiter-knopf').first().click(); await warte(350); }
  }
  return -1;
}

// Fragen nach Schlüssel beantworten: plan = { ZIEL: 'Anrufen', UNTERSTUETZUNG: ['Logo'], ... }. Ohne Plan die erste Antwort
// (Pflicht) oder nichts (optional). Felder aus WERTE. pruefen(schluessel) läuft vor jeder Antwort. Gibt die Schlüssel der Fragen zurück.
async function nachPlan(page, plan = {}, pruefen = null) {
  const gesehen = [];
  for (let i = 0; i < 14; i++) {
    if (await sichtbar(page, '.eg-paket').count()) return gesehen;
    const [key] = (await frageJetzt(page)).split(':');
    gesehen.push(key);
    if (pruefen) await pruefen(key);
    const wahl = plan[key];
    if (Array.isArray(wahl)) {
      for (const w of wahl) { const z = sichtbar(page, '.qright .acard, .qright .kcard').filter({ hasText: w }).first(); if ((await z.getAttribute('aria-pressed')) !== 'true') await z.click(); await warte(80); }
    } else if (wahl) await sichtbar(page, '.qright .acard').filter({ hasText: wahl }).first().click();
    else if (['ZIEL', 'BRANCHE'].includes(key)) await sichtbar(page, '.g-ans .acard').first().click();
    await warte(450);
    if ((await frageJetzt(page)).split(':')[0] === key && !(await sichtbar(page, '.eg-paket').count())) {
      await felderFuellen(page);
      if (plan.TERMIN && key === 'KONTAKT') await sichtbar(page, '.q-chip').filter({ hasText: plan.TERMIN }).first().click();
      if (plan.REFERENZ && key === 'KONTAKT') await sichtbar(page, '.q-haken-l input').first().check();
      await sichtbar(page, '.q-weiter-knopf').first().click(); await warte(350);
    }
  }
  return gesehen;
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
  return (gesendet.at(-1) || {}).felder || {};
}
// Felder, die es seit dem Projekt-Check mit sechs Fragen nicht mehr gibt
const ENTFERNT = ['REGION', 'KUNDEN', 'SEITENZAHL', 'LOGO', 'TEXTE', 'FOTOS', 'STIL', 'VORBILDER', 'FARBEN', 'DOMAIN', 'HOSTING'];

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
      // Einfachauswahl ohne Antwort hat keinen Knopf «Weiter». Enter ohne Antwort zeigt den Fehler an der Frage, Fokus auf der ersten Karte
      ok(await sichtbar(page, '.q-weiter-knopf').count() === 0, `${geraet}: Frage 1 ohne Antwort ohne Knopf «Weiter»`);
      await page.locator('h2:visible').first().focus(); await page.keyboard.press('Enter');
      await warte(300);
      const fehlerZu = await page.evaluate(() => ({ fehler: [...document.querySelectorAll('.f-fehler[data-an="1"]')].filter((e) => e.getClientRects().length).map((e) => e.textContent.trim()),
        fokus: !!(document.activeElement && document.activeElement.classList.contains('acard')) }));
      ok(fehlerZu.fehler.length > 0 && fehlerZu.fokus, `${geraet}: Enter ohne Antwort zeigt den Fehler an der Frage (${fehlerZu.fehler[0] || '-'}) und setzt den Fokus`);
      // Zwei Einfachauswahlen gehen selbst weiter, dann Zurück
      await frageBeantworten(page, 0);
      await frageBeantworten(page, 1);
      const titelVor = await sichtbar(page, '.qleft h2').first().textContent();
      await page.locator('.q-leiste button', { hasText: 'Zurück' }).filter({ visible: true }).first().click(); await warte(300);
      const titelZurueck = await sichtbar(page, '.qleft h2').first().textContent();
      ok(titelVor !== titelZurueck && /Branche/.test(titelZurueck), `${geraet}: Zurück führt zur vorherigen Frage («${titelZurueck.trim()}»)`);
      const schritte = await checkDurchspielen(page);
      ok(schritte > 0, `${geraet}: alle Fragen beantwortet, Ergebnis nach ${schritte} Schritten (${(await sichtbar(page, '.eg-paket').first().textContent().catch(() => '')).trim()})`);
      if (schritte > 0) {
        // Antworten durchsehen, eine ändern, zurück zum Ergebnis
        await sichtbar(page, '.eg-review').first().click(); await warte(300);
        const zeilen = await sichtbar(page, '.rv-row .mono').allTextContents();
        ok(zeilen.length >= 6 && zeilen.length <= 7 && /^01 · Ziel/.test(zeilen[0]) && /Kontakt$/.test(zeilen.at(-1)), `${geraet}: Übersicht der Antworten der Reihe nach (${zeilen.length} Zeilen: ${zeilen.map((z) => z.split(' · ')[1]).join(', ')})`);
        await sichtbar(page, '.rv-edit').nth(1).click(); await warte(300);
        ok(await sichtbar(page, '.editbar-btn').count() > 0, `${geraet}: «Ändern» öffnet die Frage mit Leiste «Zurück zum Ergebnis»`);
        await sichtbar(page, '.editbar-btn').first().click(); await warte(300);
        ok(await sichtbar(page, '.eg-paket').count() > 0, `${geraet}: «Zurück zum Ergebnis» führt zum Ergebnis`);
        const gemerkt = await page.evaluate(() => Object.keys(sessionStorage).length);
        ok(gemerkt > 0, `${geraet}: Antworten im sessionStorage gemerkt`);
        if (geraet === 'desktop') {
          const v = await page.evaluate(() => ({ text: [...document.querySelectorAll('.mf-text')].some((x) => x.getClientRects().length), knopf: [...document.querySelectorAll('.mf-angaben')].some((x) => x.getClientRects().length) }));
          ok(v.text && !v.knopf, 'desktop: Mail-Vorschau offen wie bisher, ohne Knopf «Ihre Angaben ansehen»');
        }
        const felder = await senden(page, gesendet, 'voll');
        ok(!ENTFERNT.some((k) => k in felder) && ['FIRMA', 'BRANCHE', 'ANGEBOT', 'ZIEL', 'KONTAKT_NAME', 'KONTAKT_MAIL', 'PAKET', 'PREIS', 'EINSTIEG'].every((k) => felder[k]),
          `${geraet}: gesendete Felder ohne entfernte Fragen (${Object.keys(felder).join(', ')})`);
      }
      ok(!probleme.length, `${geraet}: Projekt-Check ohne Konsolenfehler` + (probleme.length ? ': ' + probleme.join(' | ') : ''));
      await ctx.close();
    }
  }

  if (TEILE.includes('weiter')) {
    // «Weiter» nur, wo es etwas tut: Einfachauswahl geht nach rund 400 ms selbst weiter, ohne Knopf. Ausnahmen: schon beantwortet,
    // Zusatzfeld («Andere», «Ja» mit Adresse), «Ändern». Optionale Fragen ohne Antwort: «Überspringen». Enter auf einer Karte wählt sie.
    const ctx = await neuerKontext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    const probleme = beobachten(page);
    await page.goto(BASIS + '/projekt-check/', { waitUntil: 'networkidle' });
    await warte(600);
    const fokus = () => page.evaluate(() => { const a = document.activeElement; return a ? (a.id || a.tagName) : ''; });
    const knopf = async () => { const k = sichtbar(page, '.q-weiter-knopf'); return (await k.count()) ? (await k.first().textContent()).trim() : ''; };
    const offen = async () => (await sichtbar(page, '.q-offen').allTextContents()).join('').trim();
    ok(await knopf() === '' && await offen() === '', `Weiter: auf Frage 1 vor der Antwort weder «Weiter» noch «Noch offen» (${await knopf()}${await offen()})`);
    await sichtbar(page, '.g-ans .acard').filter({ hasText: 'Anrufen' }).first().click();
    await warte(100);
    const sofort = await frageJetzt(page), knopfSofort = await knopf();
    const haken = await sichtbar(page, '.g-ans .acard[aria-pressed="true"] .acard-k').first().textContent();
    await warte(500);
    ok(sofort === 'ZIEL:1' && await frageJetzt(page) === 'BRANCHE:2', `Weiter: nach der Antwort kurz stehen (${sofort}), dann selbst zur nächsten Frage (${await frageJetzt(page)})`);
    ok(knopfSofort === '' && haken.trim() === '✓', `Weiter: in der Zeit bis zum Weiter kein Knopf (${knopfSofort || 'keiner'}), die gewählte Karte zeigt ein Häkchen (${haken})`);
    ok(await fokus() === 'H2', `Weiter: Fokus auf der neuen Frage wie beim Knopf «Weiter» (${await fokus()})`);
    ok(await knopf() === '', `Weiter: auf Frage 2 vor der Antwort kein «Weiter» (${await knopf() || 'keiner'})`);
    await sichtbar(page, '.q-leiste button').filter({ hasText: 'Zurück' }).first().click(); await warte(300);
    ok(await frageJetzt(page) === 'ZIEL:1' && await knopf() === 'Weiter', `Weiter: zurück auf die beantwortete Frage 1 zeigt «Weiter» (${await knopf()})`);
    await sichtbar(page, '.q-weiter-knopf').first().click(); await warte(300);
    await sichtbar(page, '.g-ans .acard').filter({ hasText: 'Andere' }).first().click();
    await warte(600);
    ok(await frageJetzt(page) === 'BRANCHE:2' && await fokus() === 'f-branche' && await knopf() === 'Weiter', `Weiter: «Andere» bleibt stehen, Fokus im Zusatzfeld (${await fokus()}), «Weiter» sichtbar`);
    await page.fill('#f-branche', 'Fahrschule');
    await sichtbar(page, '.q-weiter-knopf').first().click(); await warte(400);
    ok(await knopf() === 'Überspringen' && /optional/i.test(await sichtbar(page, '.q-teil').first().textContent()), `Weiter: «Haben Sie schon eine Website?» mit «Überspringen» und «optional» (${await knopf()})`);
    await sichtbar(page, '.g-ans .acard').filter({ hasText: 'Ja' }).first().click();
    await warte(600);
    ok(await frageJetzt(page) === 'WEBSITE_HEUTE:3' && await fokus() === 'f-url' && await knopf() === 'Weiter', `Weiter: «Ja» bleibt für die Adresse stehen (${await frageJetzt(page)}, Fokus ${await fokus()}), «Weiter» sichtbar`);
    await sichtbar(page, '.g-ans .acard').filter({ hasText: 'Nein' }).first().click();
    await warte(100);
    const knopfNein = await knopf();
    await warte(500);
    ok(await frageJetzt(page) === 'UNTERSTUETZUNG:3' && knopfNein === 'Weiter', `Weiter: «Nein» geht selbst weiter (${await frageJetzt(page)}), «Weiter» bleibt bis dahin stehen (${knopfNein})`);
    ok(await knopf() === 'Überspringen', `Weiter: «Wobei brauchen Sie Unterstützung?» ohne Auswahl «Überspringen» (${await knopf()})`);
    await sichtbar(page, '.g-ans .acard').filter({ hasText: 'Logo' }).first().click(); await warte(150);
    ok(await knopf() === 'Weiter', `Weiter: mit Auswahl «Weiter» (${await knopf()})`);
    await sichtbar(page, '.g-ans .acard').filter({ hasText: 'Logo' }).first().click(); await warte(150);
    // Zurück innert 400 ms nach der Antwort: kein Sprung nach vorn
    await sichtbar(page, '.q-leiste button').filter({ hasText: 'Zurück' }).first().click(); await warte(300);
    await sichtbar(page, '.g-ans .acard').filter({ hasText: 'Nein' }).first().click();
    await sichtbar(page, '.q-leiste button').filter({ hasText: 'Zurück' }).first().click();
    await warte(700);
    ok(await frageJetzt(page) === 'BRANCHE:2', `Weiter: Zurück gleich nach der Antwort hebt das automatische Weiter auf (${await frageJetzt(page)})`);
    await nachPlan(page, { WEBSITE_HEUTE: 'Nein' });
    // Im Modus «Ändern» geht es nicht selbst weiter
    await sichtbar(page, '.eg-review').first().click(); await warte(300);
    await sichtbar(page, '.rv-edit').first().click(); await warte(300);
    await sichtbar(page, '.g-ans .acard').filter({ hasText: 'Vorbeikommen' }).first().click();
    await warte(600);
    ok(await frageJetzt(page) === 'ZIEL:1' && await sichtbar(page, '.editbar-btn').count() > 0 && /Übernehmen/.test(await knopf()), `Weiter: beim Ändern bleibt die Frage stehen (${await frageJetzt(page)}, ${await knopf()})`);
    ok(!probleme.length, 'Weiter ohne Konsolenfehler' + (probleme.length ? ': ' + probleme.join(' | ') : ''));
    await ctx.close();

    // «Überspringen» auf Frage 3 führt ohne Zusatzfrage zu den Funktionen. Enter auf einer fokussierten Karte wählt sie und geht weiter.
    const ctx2 = await neuerKontext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const p2 = await ctx2.newPage();
    const probleme2 = beobachten(p2);
    await p2.goto(BASIS + '/projekt-check/', { waitUntil: 'networkidle' });
    await warte(600);
    await sichtbar(p2, '.g-ans .acard').filter({ hasText: 'Anrufen' }).first().focus();
    await p2.keyboard.press('Enter');
    await warte(700);
    ok(await frageJetzt(p2) === 'BRANCHE:2', `Tastatur: Enter auf der fokussierten Karte wählt sie und geht weiter (${await frageJetzt(p2)}), ohne Meldung «Bitte wählen»`);
    await p2.keyboard.press('1'); await warte(700);
    await sichtbar(p2, '.q-weiter-knopf').filter({ hasText: 'Überspringen' }).first().click(); await warte(400);
    ok(await frageJetzt(p2) === 'FUNKTIONEN:4', `Weiter: «Überspringen» auf Frage 3 führt ohne Zusatzfrage zu den Funktionen (${await frageJetzt(p2)})`);
    await p2.locator('h2:visible').first().focus(); await p2.keyboard.press('Enter'); await warte(400);
    ok(await frageJetzt(p2) === 'BETRIEB:5', `Tastatur: Enter ohne Fokus auf einem Bedienelement wirkt wie «Weiter» (${await frageJetzt(p2)})`);
    ok(!probleme2.length, 'Überspringen und Tastatur ohne Konsolenfehler' + (probleme2.length ? ': ' + probleme2.join(' | ') : ''));
    await ctx2.close();

    // Handy: Frage 1 ohne Antwort ohne Leiste, danach nur «Zurück» kompakt, mit Zusatzfeld die volle Leiste
    const ctx3 = await neuerKontext({ viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    const p3 = await ctx3.newPage();
    await p3.goto(BASIS + '/projekt-check/', { waitUntil: 'networkidle' });
    await warte(600);
    const leiste = () => p3.evaluate(() => { const l = [...document.querySelectorAll('.q-leiste')].find((x) => x.getClientRects().length); if (!l) return 'keine'; const r = l.getBoundingClientRect(); return l.dataset.art + ':' + Math.round(r.width); });
    const l1 = await leiste();
    await sichtbar(p3, '.g-ans .acard').first().click(); await warte(700);
    const l2 = await leiste();
    await sichtbar(p3, '.g-ans .acard').filter({ hasText: 'Andere' }).first().click(); await warte(300);
    const l3 = await leiste();
    ok(l1 === 'keine' && /^zurueck:/.test(l2) && parseInt(l2.split(':')[1], 10) < 200 && /^voll:390$/.test(l3), `Handy: Leiste auf Frage 1 ${l1}, auf Frage 2 ${l2} (kompakt), mit «Andere» ${l3}`);
    await ctx3.close();
  }

  if (TEILE.includes('folgefragen')) {
    // Mit Website: «Was stört», ohne Website: «Wobei brauchen Sie Unterstützung?» mit Kostenhinweisen; Fortschritt zählt die Folgefrage mit
    for (const weg of ['Ja', 'Nein']) {
      const ctx = await neuerKontext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      const probleme = beobachten(page);
      await page.goto(BASIS + '/projekt-check/', { waitUntil: 'networkidle' });
      await warte(600);
      let label = '';
      const stand = [];
      const plan = weg === 'Ja' ? { WEBSITE_HEUTE: 'Ja', WEBSITE_PROBLEME: ['Wirkt veraltet'], FUNKTIONEN: ['Online-Terminbuchung'] }
        : { WEBSITE_HEUTE: 'Nein', UNTERSTUETZUNG: ['Logo', 'Fotos'], FUNKTIONEN: ['Eigene Unterseiten'], TERMIN: 'In einem Monat', REFERENZ: true };
      const fragen = await nachPlan(page, plan, async (key) => {
        if (key === 'WEBSITE_PROBLEME' || key === 'UNTERSTUETZUNG') label = await sichtbar(page, '.q-teil').first().innerText();
        stand.push(await page.evaluate(() => { const p = [...document.querySelectorAll('.q-prog')].find((x) => x.getClientRects().length);
          return { now: Number(p.getAttribute('aria-valuenow')), max: p.getAttribute('aria-valuemax'), text: p.getAttribute('aria-valuetext'), breite: parseFloat(p.firstElementChild.style.width),
            teil: [...document.querySelectorAll('.q-teil')].find((x) => x.getClientRects().length).firstChild.textContent.trim() }; }));
      });
      const folge = weg === 'Ja' ? 'WEBSITE_PROBLEME' : 'UNTERSTUETZUNG', andere = weg === 'Ja' ? 'UNTERSTUETZUNG' : 'WEBSITE_PROBLEME';
      ok(fragen.includes(folge) && !fragen.includes(andere) && /^Frage 3 von 6 · Zusatzfrage/.test(label.trim()), `Website «${weg}»: Folgefrage ${folge} erscheint (${label.trim().replace(/\s+/g, ' ')}), ${andere} nicht. Fragen: ${fragen.join(', ')}`);
      // Gesamtzahl bleibt 6, der Balken läuft nie zurück, die Folgefrage steht zwischen 3 und 4, aria-valuetext wie der sichtbare Text
      const iFolge = fragen.indexOf(folge);
      ok(stand.every((x) => x.max === '6' && x.text === x.teil && Number.isInteger(x.now)) && stand.every((x, i) => !i || x.breite >= stand[i - 1].breite)
        && stand[iFolge].now === 3 && stand[iFolge].breite > 50 && stand[iFolge].breite < 66.7,
        `Website «${weg}»: Fortschritt ${stand.map((x) => x.now + '/' + x.max + ' ' + x.breite + '%').join(', ')}`);
      const eg = await page.evaluate(() => ({ satz: (document.querySelector('.eg-satz') || {}).textContent, paket: (document.querySelector('.eg-paket') || {}).textContent,
        zusatz: [...document.querySelectorAll('.eg-zusatz dt')].filter((x) => x.getClientRects().length).map((x) => x.textContent), ref: [...document.querySelectorAll('.eg-ref')].some((x) => x.getClientRects().length) }));
      if (weg === 'Ja') {
        ok(/Paket Pro/.test(eg.paket) && eg.satz === 'Bis 10 Seiten, dazu ein Kontaktformular und eine Online-Terminbuchung.' && eg.zusatz.join(',') === 'Hosting',
          `Website «Ja»: ${eg.paket}, «${eg.satz}», Zusätze ${eg.zusatz.join(', ')}`);
      } else {
        ok(/Paket Standard/.test(eg.paket) && eg.satz === 'Bis 5 Unterseiten, dazu ein Kontaktformular und eigene Unterseiten für Ihre Leistungen.' && eg.zusatz.join(',') === 'Logo,Fotograf,Hosting' && eg.ref,
          `Website «Nein»: ${eg.paket}, «${eg.satz}», Zusätze ${eg.zusatz.join(', ')}, Referenzrabatt ${eg.ref ? 'ja' : 'nein'}`);
      }
      ok(!probleme.length, `Website «${weg}» ohne Konsolenfehler` + (probleme.length ? ': ' + probleme.join(' | ') : ''));
      await ctx.close();
    }
    // Kostenhinweise der Unterstützung und Text in der Mail
    const ctx = await neuerKontext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const gesendet = await versandAbfangen(ctx);
    const page = await ctx.newPage();
    await page.goto(BASIS + '/projekt-check/', { waitUntil: 'networkidle' });
    await warte(600);
    let hinweis = '';
    await nachPlan(page, { WEBSITE_HEUTE: 'Nein', UNTERSTUETZUNG: ['Logo', 'Texte', 'Fotos'], TERMIN: 'In einem Monat', REFERENZ: true }, async (key) => {
      if (key === 'FUNKTIONEN') { await page.locator('.q-leiste button', { hasText: 'Zurück' }).filter({ visible: true }).first().click(); await warte(300);
        hinweis = await page.evaluate(() => [...document.querySelectorAll('.q-hinweis')].filter((x) => x.getClientRects().length).map((x) => x.textContent).join(''));
        await sichtbar(page, '.q-weiter-knopf').first().click(); await warte(300); }
    });
    ok(/CHF 390 zusammen mit der Website/.test(hinweis) && /CHF 150 pro Seite/.test(hinweis) && /Kosten nach Aufwand/.test(hinweis), `Unterstützung: Kostenhinweise für Logo, Texte und Fotos («${hinweis}»)`);
    const felder = await senden(page, gesendet, 'voll');
    ok(felder.UNTERSTUETZUNG === 'Logo, Texte, Fotos' && felder.TERMIN === 'In einem Monat' && felder.REFERENZ === 'Ja, gerne mit Name, Logo und zwei Sätzen' && /mit Referenzrabatt/.test(felder.PREIS)
      && /Logo: CHF 390 einmalig; Texte: CHF 150 pro Seite; Fotograf: auf Wunsch, nach Aufwand; Hosting: auf Ihren Namen eingerichtet, ohne Abo/.test(felder.ZUSAETZE),
      `Mail: Unterstützung «${felder.UNTERSTUETZUNG}», Termin, Referenz, Preis «${felder.PREIS}», Zusätze «${felder.ZUSAETZE}»`);
    await ctx.close();
  }

  if (TEILE.includes('einstiege')) {
    // Einstiege: Vorbelegung, übersprungene Fragen und Mindestpaket
    const faelle = [
      { name: 'Musterprojekt Doppelmeter', url: '/projekt-check/?quelle=doppelmeter', erste: 'WEBSITE_HEUTE', paket: 'Standard', felder: { BRANCHE: 'Handwerk und Bau', ZIEL: 'Anrufen', EINSTIEG: 'Musterprojekt Doppelmeter' } },
      { name: 'Musterprojekt Firstlicht', url: '/projekt-check/?quelle=firstlicht', erste: 'ZIEL', paket: 'Pro', felder: { EINSTIEG: 'Musterprojekt Firstlicht' } },
      { name: 'Paketkarte Pro (Link)', url: '/projekt-check/?paket=pro', erste: 'ZIEL', paket: 'Pro', felder: { EINSTIEG: 'Paketkarte Pro' } },
      { name: 'Paketkarte Website', start: '/angebot/', klick: 'a[data-quelle="paket-website"]', erste: 'ZIEL', paket: 'Website', felder: { EINSTIEG: 'Paketkarte Website' } },
      { name: 'Paketkarte Standard', start: '/angebot/', klick: 'a[data-quelle="paket-standard"]', erste: 'ZIEL', paket: 'Standard', felder: { EINSTIEG: 'Paketkarte Standard' } },
      { name: 'Hero-Chip', start: '/', klick: '.hero-chip', erste: 'BRANCHE', paket: 'Website', felder: { ZIEL: 'Anrufen', EINSTIEG: 'Startseite, erste Frage' } },
      { name: 'Branchenseite Handwerk', start: '/website-fuer-handwerker/', klick: 'a[data-quelle="branche-handwerk"]', erste: 'ZIEL', ohne: 'BRANCHE', paket: 'Website', felder: { BRANCHE: 'Handwerk und Bau' } },
      { name: 'Brief-Link', start: '/start/?firma=Testbetrieb%20Muster&branche=handwerk', klick: 'a[data-quelle="hero"]', erste: 'ZIEL', ohne: 'BRANCHE', paket: 'Website', firma: 'Testbetrieb Muster', felder: { BRANCHE: 'Handwerk und Bau', FIRMA: 'Testbetrieb Muster', EINSTIEG: 'Brief oder QR-Code' } },
    ];
    for (const f of faelle) {
      const ctx = await neuerKontext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
      const gesendet = await versandAbfangen(ctx);
      const page = await ctx.newPage();
      const probleme = beobachten(page);
      if (f.url) await page.goto(BASIS + f.url, { waitUntil: 'networkidle' });
      else {
        await page.goto(BASIS + f.start, { waitUntil: 'networkidle' }); await warte(500);
        await page.locator(f.klick).filter({ visible: true }).first().click();
      }
      await warte(800);
      const erste = (await frageJetzt(page)).split(':')[0];
      let firma = '';
      const fragen = await nachPlan(page, {}, async (key) => { if (key === 'BETRIEB') firma = await sichtbar(page, '#f-firma').first().inputValue(); });
      const paket = (await sichtbar(page, '.eg-paket').first().textContent().catch(() => '')).trim();
      const felder = await senden(page, gesendet, 'voll');
      const passt = Object.entries(f.felder).every(([k, v]) => felder[k] === v);
      ok(erste === f.erste && paket === 'Paket ' + f.paket && passt && (!f.ohne || !fragen.includes(f.ohne)) && (!f.firma || firma === f.firma),
        `Einstieg ${f.name}: erste Frage ${erste}, ${paket}${f.firma ? ', Betrieb vorausgefüllt «' + firma + '»' : ''}, ${Object.keys(f.felder).map((k) => k + ' «' + (felder[k] || '') + '»').join(', ')}`);
      ok(!probleme.length, `Einstieg ${f.name} ohne Konsolenfehler` + (probleme.length ? ': ' + probleme.join(' | ') : ''));
      await ctx.close();
    }
  }

  if (TEILE.includes('handy')) {
    // 390 × 664 px: alle Antworten ohne Scrollen sichtbar (ausser Funktionen-Karten), Branchen zweispaltig, Senden direkt unter dem Ergebnis
    for (const weg of ['Ja', 'Nein']) {
      const ctx = await neuerKontext({ viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
      const gesendet = await versandAbfangen(ctx);
      const page = await ctx.newPage();
      const probleme = beobachten(page);
      await page.goto(BASIS + '/projekt-check/', { waitUntil: 'networkidle' });
      await warte(600);
      const zuTief = [];
      let spalten = 0;
      await nachPlan(page, { WEBSITE_HEUTE: weg }, async (key) => {
        await page.evaluate(() => window.scrollTo(0, 0)); await warte(100);
        const m = await page.evaluate(() => {
          const vis = (el) => el.getClientRects().length > 0;
          // Ohne Leiste (Frage 1 ohne Antwort) zählt der untere Bildschirmrand
          const l = [...document.querySelectorAll('.q-leiste')].find(vis), leiste = l ? l.getBoundingClientRect().top : innerHeight;
          const karten = [...document.querySelectorAll('.qright .g-ans .acard')].filter(vis).map((b) => b.getBoundingClientRect());
          return { aussen: karten.filter((r) => r.top < 0 || r.bottom > leiste).length, links: new Set(karten.map((r) => Math.round(r.left))).size };
        });
        if (key !== 'FUNKTIONEN' && m.aussen) zuTief.push(key + ' (' + m.aussen + ')');
        if (key === 'BRANCHE') spalten = m.links;
      });
      ok(!zuTief.length && spalten === 2, `390 px, Website «${weg}»: alle Antworten ohne Scrollen sichtbar${zuTief.length ? ', NICHT bei ' + zuTief.join(', ') : ''}, Branchen in ${spalten} Spalten`);
      // Ganz unten messen: Dort steht der klebende Senden-Knopf an seinem Platz im Ablauf
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await warte(200);
      const lage = await page.evaluate(() => {
        const vis = (el) => el && el.getClientRects().length > 0;
        const y = (sel) => { const el = [...document.querySelectorAll(sel)].find(vis); return el ? el.getBoundingClientRect().top + scrollY : null; };
        return { ergebnis: (() => { const el = [...document.querySelectorAll('.eg-links')].find(vis); const r = el.getBoundingClientRect(); return r.bottom + scrollY; })(),
          zustimmung: y('.mf-check input'), senden: y('.mf-haupt'), knopf: y('.mf-angaben'), vorschau: [...document.querySelectorAll('.mf-text')].some(vis) };
      });
      ok(lage.zustimmung > lage.ergebnis && lage.zustimmung - lage.ergebnis < 80 && lage.senden > lage.zustimmung && lage.knopf > lage.senden && !lage.vorschau,
        `390 px: Zustimmung (${Math.round(lage.zustimmung - lage.ergebnis)} px unter dem Ergebnis) und Senden vor «Ihre Angaben ansehen», Vorschau eingeklappt`);
      await sichtbar(page, '.mf-angaben').first().click(); await warte(200);
      ok(await sichtbar(page, '.mf-text').count() > 0 && (await sichtbar(page, '.mf-angaben').first().getAttribute('aria-expanded')) === 'true', '390 px: «Ihre Angaben ansehen» klappt die Vorschau auf');
      const ueberlauf = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      ok(ueberlauf <= 0, `390 px: kein seitliches Scrollen (${ueberlauf} px)`);
      await senden(page, gesendet, 'voll');
      ok(!probleme.length, `390 px, Website «${weg}» ohne Konsolenfehler` + (probleme.length ? ': ' + probleme.join(' | ') : ''));
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
    const kopf = await page.evaluate(() => [...document.querySelectorAll('.q-teil, .q-fortschritt')].filter((x) => x.getClientRects().length).map((x) => x.innerText.trim()));
    ok(kopf.join(' | ') === 'Frage 1 von 3 | KURZSCHÄTZUNG' || kopf.join(' | ') === 'KURZSCHÄTZUNG | Frage 1 von 3', `Kurzversion: Kopf wie bisher (${kopf.join(' | ')})`);
    const fragenKurz = [];
    for (let i = 0; i < 4 && !(await sichtbar(page, '.eg-paket').count()); i++) { fragenKurz.push((await frageJetzt(page)).split(':')[0]); await frageBeantworten(page, i); await sichtbar(page, '.q-weiter-knopf').first().click(); await warte(350); }
    ok(fragenKurz.join(',') === 'ANGEBOT,FUNKTIONEN,MAIL' && await sichtbar(page, '.eg-paket').count() > 0, `Kurzversion: Angebot, Funktionen, E-Mail, dann Ergebnis (${fragenKurz.join(', ')})`);
    if (await sichtbar(page, '.eg-paket').count()) {
      const v = await page.evaluate(() => ({ text: [...document.querySelectorAll('.mf-kopf')].some((x) => x.getClientRects().length) }));
      ok(v.text, 'Kurzversion: Mail-Fenster mit Eingabe der E-Mail-Adresse wie bisher');
      const felder = await senden(page, gesendet, 'kurz');
      ok(felder.ANGEBOT && felder.KONTAKT_MAIL && felder.FUNKTIONEN, `Kurzversion: Angebot, Funktionen und E-Mail gesendet (${Object.keys(felder).join(', ')})`);
    }
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

  if (TEILE.includes('muster')) {
    // Musterprojekte: Umschalter Desktop/Handy pro Projekt, Bilder vollständig (Seitenverhältnis von Bild und Rahmen gleich)
    for (const [geraet, opt] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['handy', { ...devices['iPhone 13'] }]]) {
      const ctx = await neuerKontext(opt);
      const page = await ctx.newPage();
      const probleme = beobachten(page);
      await page.goto(BASIS + '/musterprojekte/', { waitUntil: 'networkidle' });
      await warte(600);
      const zustand = () => page.evaluate(() => ['doppelmeter', 'firstlicht'].map((x) => (document.querySelector('#mp-' + x + ' .mp2-geraet') || { dataset: {} }).dataset.geraet));
      const start = await zustand();
      const anders = start[0] === 'desktop' ? 'handy' : 'desktop';
      await page.locator(`#mp-doppelmeter .mp2-schalter [data-g="${anders}"]`).click();
      await warte(400);
      const nachher = await zustand();
      ok(nachher[0] === anders && nachher[1] === start[1], `${geraet}: Umschalter bei Doppelmeter wechselt nur Doppelmeter (${start.join('/')} → ${nachher.join('/')})`);
      for (const id of ['doppelmeter', 'firstlicht']) {
        await page.locator(`#mp-${id} .mp2-geraet img`).scrollIntoViewIfNeeded();
        await page.waitForFunction((s) => { const i = document.querySelector(s); return i && i.complete && i.naturalWidth > 0; }, `#mp-${id} .mp2-geraet img`, { timeout: 8000 }).catch(() => {});
        const m = await page.evaluate((s) => { const i = document.querySelector(s); const r = i.getBoundingClientRect();
          return { anzeige: r.width / r.height, bild: i.naturalWidth / i.naturalHeight, breite: Math.round(r.width), dichte: i.naturalWidth && i.currentSrc ? Number((i.currentSrc.match(/-(\d+)\.(?:avif|webp)/) || [])[1]) / (r.width * devicePixelRatio) : 0 }; }, `#mp-${id} .mp2-geraet img`);
        ok(Math.abs(m.anzeige - m.bild) < 0.02 && m.dichte >= 0.95, `${geraet}: Bild ${id} vollständig (Seitenverhältnis ${m.anzeige.toFixed(3)} zu ${m.bild.toFixed(3)}) und scharf (${m.dichte.toFixed(2)} Bildpunkte pro Gerätepixel)`);
      }
      ok(!probleme.length, `${geraet}: Musterprojekte ohne Konsolenfehler` + (probleme.length ? ': ' + probleme.join(' | ') : ''));
      await ctx.close();
    }
  }

  if (TEILE.includes('rechner')) {
    // Preis-Rechner auf der Angebotsseite: Funktionen anwählen, Paket und Richtwert passen sich an, Übergabe an den Projekt-Check
    const ctx = await neuerKontext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const probleme = beobachten(page);
    await page.goto(BASIS + '/angebot/', { waitUntil: 'networkidle' });
    await warte(600);
    const paket = () => page.locator('.rechner-paket').filter({ visible: true }).first().textContent();
    const vorher = (await paket()).trim();
    const fn = page.locator('.rechner-fn .rfn[aria-disabled="false"]').filter({ visible: true });
    const n = await fn.count();
    for (let i = 0; i < n; i++) { await fn.nth(i).click(); await warte(120); }
    const nachher = (await paket()).trim();
    ok(/Paket Website/.test(vorher) && /Paket Pro/.test(nachher), `Rechner: ohne Auswahl «${vorher.split(',')[0]}», mit allen ${n} Funktionen «${nachher.split(',')[0]}»`);
    await page.locator('.rechner-los').filter({ visible: true }).first().click();
    await warte(800);
    ok(new URL(page.url()).pathname === '/projekt-check/', 'Rechner: «Mit dieser Auswahl» führt in den Projekt-Check');
    ok(!probleme.length, 'Rechner ohne Konsolenfehler' + (probleme.length ? ': ' + probleme.join(' | ') : ''));
    await ctx.close();
    // Logo und Texte aus dem Rechner: im Ergebnis und in der Mail, auch ohne die Frage nach Unterstützung; erscheint sie, sind sie vorausgewählt
    for (const weg of ['Ja', 'Nein']) {
      const c2 = await neuerKontext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
      const gesendet = await versandAbfangen(c2);
      const p2 = await c2.newPage();
      const prob2 = beobachten(p2);
      await p2.goto(BASIS + '/angebot/', { waitUntil: 'networkidle' }); await warte(500);
      await p2.locator('.rechner-fn .rfn', { hasText: 'Bildergalerie' }).filter({ visible: true }).first().click();
      for (const t of ['Logo dazu', 'Texte von mir']) await p2.locator('.rechner-fn-z .rfn', { hasText: t }).filter({ visible: true }).first().click();
      await p2.locator('.rechner-los').filter({ visible: true }).first().click(); await warte(800);
      let vorgewaehlt = null;
      const fragen = await nachPlan(p2, { WEBSITE_HEUTE: weg }, async (key) => {
        if (key === 'UNTERSTUETZUNG') vorgewaehlt = await p2.evaluate(() => [...document.querySelectorAll('.qright .acard[aria-pressed="true"]')].filter((x) => x.getClientRects().length).map((x) => x.textContent.replace('✓', '').trim()));
      });
      const zusatz = await p2.evaluate(() => [...document.querySelectorAll('.eg-zusatz dt')].filter((x) => x.getClientRects().length).map((x) => x.textContent));
      const felder = await senden(p2, gesendet, 'voll');
      ok(!fragen.includes('FUNKTIONEN') && zusatz.join(',') === 'Logo,Texte,Hosting' && felder.UNTERSTUETZUNG === 'Logo, Texte' && felder.PAKET === 'Standard'
        && (weg === 'Ja' ? !fragen.includes('UNTERSTUETZUNG') : (vorgewaehlt || []).join(',') === 'Logo,Texte'),
        `Rechner mit Logo und Texten, Website «${weg}»: Funktionen übersprungen, ${weg === 'Ja' ? 'ohne Frage nach Unterstützung' : 'vorausgewählt: ' + (vorgewaehlt || []).join(', ')}, Zusätze ${zusatz.join(', ')}, Mail «${felder.UNTERSTUETZUNG}»`);
      ok(!prob2.length, `Rechner, Website «${weg}» ohne Konsolenfehler` + (prob2.length ? ': ' + prob2.join(' | ') : ''));
      await c2.close();
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
    const check = await page.evaluate(() => ({ pfad: location.pathname, such: location.search,
      branche: [...document.querySelectorAll('.qright .acard[aria-pressed="true"]')].filter((x) => x.getClientRects().length).map((x) => x.textContent.trim()).join('') }));
    // Der Name steht vorausgefüllt im Bildschirm «Ihr Betrieb». Fremde Anfragen nur bis hier zählen (das Ergebnis lädt Turnstile).
    const fremdGenerator = fremd.slice();
    let firma = '';
    await nachPlan(page, {}, async (key) => { if (key === 'BETRIEB') firma = await sichtbar(page, '#f-firma').first().inputValue(); });
    ok(check.pfad === '/projekt-check/' && !check.such && /Testbetrieb Muster/.test(firma), `Übergabe an den Projekt-Check ohne URL-Parameter, Betrieb vorausgefüllt («${firma}»)`);
    ok(!fremdGenerator.length, 'Vorschau-Werkzeug ohne Anfragen an fremde Server' + (fremdGenerator.length ? ': ' + fremdGenerator.join(', ') : ''));
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
      karten: [...document.querySelectorAll('.eb-karte a.karte-link')].map((a) => a.getAttribute('href')),
      robots: (document.querySelector('meta[name="robots"]') || {}).content,
      canonical: (document.querySelector('link[rel="canonical"]') || {}).href,
      ueberlauf: document.documentElement.scrollWidth - window.innerWidth,
      linkedin: [...document.querySelectorAll('main a[href*="linkedin.com"]')].map((a) => ({ href: a.href, target: a.target, rel: a.rel })),
      abstand: (() => { const k = [...document.querySelectorAll('header.kopf')].find((x) => x.getClientRects().length); return Math.round(document.querySelector('main h1').getBoundingClientRect().top - k.getBoundingClientRect().bottom); })(),
    }));
    ok(ueb.linkedin.length === 1 && ueb.linkedin.every((l) => /linkedin\.com\/company\/odera-design/.test(l.href) && l.target === '_blank' && l.rel === 'noopener noreferrer'),
      `Einblicke: LinkedIn-Link zeigt auf die Firmenseite und öffnet einen neuen Tab (${ueb.linkedin.map((l) => l.href).join(', ')})`);
    const ablauf = await ctx.newPage();
    await ablauf.goto(BASIS + '/ablauf/', { waitUntil: 'networkidle' });
    const abstandAblauf = await ablauf.evaluate(() => { const k = [...document.querySelectorAll('header.kopf')].find((x) => x.getClientRects().length); return Math.round([...document.querySelectorAll('main h1')].find((h) => h.getClientRects().length).getBoundingClientRect().top - k.getBoundingClientRect().bottom); });
    await ablauf.close();
    ok(ueb.abstand === abstandAblauf, `Einblicke: Abstand Navigation zu Titel ${ueb.abstand} px wie auf /ablauf/ (${abstandAblauf} px)`);
    ok(ueb.h1.length === 1 && ueb.h1[0] === 'Einblicke' && ueb.aktiv && ueb.aktiv.trim() === 'Einblicke' && ueb.strich && ueb.strich.o === '1' && ueb.strich.w > 20,
      `Einblicke: Menüpunkt führt zur Übersicht, «Einblicke» markiert (h1 «${ueb.h1[0]}»)`);
    ok(!ueb.react && ueb.canonical === 'https://odera.ch/einblicke/' && ueb.ueberlauf <= 0 && ueb.robots === (ueb.karten.length ? 'index,follow' : 'noindex,follow'),
      `Einblicke: statisch ohne React, canonical, ${ueb.karten.length} Artikel, robots ${ueb.robots}`);
    if (ueb.karten.length) {
      await page.locator('.eb-karte a.karte-link').first().click();
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
          artikel: ld.some((d) => (d['@graph'] || [d]).some((x) => x['@type'] === 'BlogPosting')),
          og: (document.querySelector('meta[property="og:image"]') || {}).content,
          cta: (document.querySelector('#abschluss a.btn') || {}).getAttribute ? document.querySelector('#abschluss a.btn').getAttribute('href') : null,
          worte: document.querySelector('.eb-text').innerText.split(/\s+/).length,
        };
      });
      ok(art.h1 === 1 && art.h2 >= 3 && art.bild > 0 && art.alt.length > 10 && art.artikel && art.cta === '/projekt-check/?quelle=einblicke',
        `Einblicke: Artikel ${ueb.karten[0]} mit Titelbild (${art.bild} px), Alt-Text, ${art.h2} Zwischentiteln, JSON-LD BlogPosting, ${art.worte} Wörter`);
      const og = await page.request.get(BASIS + new URL(art.og).pathname);
      ok(og.status() === 200, `Einblicke: Vorschaubild ${new URL(art.og).pathname} vorhanden`);
      await page.locator('#abschluss a.btn').click();
      await page.waitForURL('**/projekt-check/**');
      await warte(800);
      ok(await page.locator('.q-prog').filter({ visible: true }).count() > 0, 'Einblicke: Knopf führt in den Projekt-Check');
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
      if (geraet === 'Desktop') {
        ok(!(await banner.isVisible().catch(() => false)), `${geraet}: Banner bremst das erste Zeichnen nicht (erscheint verzögert)`);
        await warte(2800);
        ok(await banner.isVisible(), `${geraet}: Banner erscheint ohne gespeicherte Wahl`);
      } else {
        // Handy: kompakte Leiste direkt beim Laden, höchstens rund 120 px, oberhalb der festen Leiste unten
        ok(await banner.isVisible(), `${geraet}: kompakte Leiste erscheint direkt beim Laden`);
        await page.mouse.wheel(0, 900); await warte(2000);
        const lage = await page.evaluate(() => {
          const b = document.querySelector('.st-banner').getBoundingClientRect();
          const l = [...document.querySelectorAll('.mobbar')].find((x) => x.getClientRects().length);
          const r = l ? l.getBoundingClientRect() : null;
          const mitte = r ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
          return { hoehe: Math.round(b.height), ueber: r ? b.bottom <= r.top + 1 : true, leisteFrei: !r || (mitte && l.contains(mitte)), text: document.querySelector('.st-banner').innerText };
        });
        ok(lage.hoehe <= 125 && lage.ueber && lage.leisteFrei && /Ohne Cookies und ohne IP-Adresse/.test(lage.text),
          `${geraet}: Leiste ${lage.hoehe} px hoch, über der festen Leiste, feste Leiste frei`);
      }
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
      ok(neu.some((e) => e.t === 'page_view' && e.p === '/projekt-check/') && neu.some((e) => e.t === 'projektcheck_start') && neu.some((e) => e.t === 'projektcheck_step' && e.n === 1 && e.z === 'ZIEL'), `${geraet}: Projekt-Check: Seitenaufruf, Start und Schritt 1 mit Schlüssel ZIEL`);
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
