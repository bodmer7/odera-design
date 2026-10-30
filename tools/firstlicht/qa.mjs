#!/usr/bin/env node
// Automatische Qualitätsprüfung des Musterprojekts Firstlicht im Browser.
//   node tools/firstlicht/qa.mjs            alles (Screenshots, axe, ohne JS, reduzierte Bewegung, Netzwerk, html-validate)
//   node tools/firstlicht/qa.mjs --schnell  ohne Screenshots
//
// Ergebnis: Konsole und _lokal/firstlicht-qa/ (Screenshots, bericht.json). Der Ordner ist in .gitignore.
// Browser: Playwright mit Chromium. WebKit und Firefox laufen, wenn sie installiert sind (npx playwright install webkit firefox).

import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { join, extname, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit, firefox } from 'playwright';
import { HtmlValidate } from 'html-validate';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const AUS = join(ROOT, '_lokal/firstlicht-qa');
mkdirSync(AUS, { recursive: true });
const schnell = process.argv.includes('--schnell');
const SEITEN = ['index', 'rechner', 'leistungen', 'projekte', 'ueber-uns', 'kontakt'];
const BREITEN = [320, 375, 768, 1440, 1920];
const TYPEN = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };

const server = createServer((req, res) => {
  let datei = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (existsSync(datei) && statSync(datei).isDirectory()) datei = join(datei, 'index.html');
  if (!existsSync(datei)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPEN[extname(datei)] || 'application/octet-stream' });
  res.end(readFileSync(datei));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASIS = `http://127.0.0.1:${server.address().port}/musterprojekte/firstlicht/`;
const axeQuelle = readFileSync(join(ROOT, 'node_modules/axe-core/axe.min.js'), 'utf8');

const befunde = [];
const bericht = { datum: new Date().toISOString(), browser: [], seiten: {} };
const melden = (t) => { befunde.push(t); console.log('  ✗ ' + t); };

async function durchscrollen(p) {
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); } scrollTo(0, 0); });
}

async function browserPruefen(name, typ) {
  let browser;
  try { browser = await typ.launch(); } catch { console.log(`${name}: nicht installiert, übersprungen`); return; }
  bericht.browser.push(name);
  console.log(`\n${name}`);
  for (const seite of SEITEN) {
    const ergebnis = (bericht.seiten[seite] ||= {});
    for (const thema of ['light', 'dark']) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: thema, reducedMotion: 'reduce' });
      const p = await ctx.newPage();
      const fehler = [];
      const extern = [];
      p.on('pageerror', (e) => fehler.push(e.message));
      p.on('console', (m) => { if (m.type() === 'error') fehler.push(m.text()); });
      p.on('request', (r) => { const u = r.url(); if (!u.startsWith('http://127.0.0.1') && !u.startsWith('data:') && !u.startsWith('blob:')) extern.push(u); });
      await p.goto(BASIS + seite + '.html', { waitUntil: 'load' });
      await p.waitForTimeout(600);
      await durchscrollen(p);
      if (fehler.length) melden(`${name} ${seite} ${thema}: Konsolenfehler ${fehler.join(' | ')}`);
      if (extern.length) melden(`${name} ${seite} ${thema}: externe Requests ${extern.join(', ')}`);
      // Überlauf in allen Breiten
      for (const b of BREITEN) {
        await p.setViewportSize({ width: b, height: b < 768 ? 800 : 900 });
        await p.waitForTimeout(150);
        const ueber = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (ueber > 0) melden(`${name} ${seite} ${b}px ${thema}: horizontal ${ueber}px zu breit`);
        if (!schnell && name === 'chromium') {
          await p.evaluate(() => document.querySelectorAll('.unten-aus').forEach((e) => { e.style.contentVisibility = 'visible'; }));
          await p.screenshot({ path: join(AUS, `${seite}-${b}-${thema === 'dark' ? 'dunkel' : 'hell'}.png`), fullPage: true });
        }
      }
      // axe-core in Desktop-Breite
      if (name === 'chromium') {
        await p.setViewportSize({ width: 1440, height: 900 });
        await p.evaluate(axeQuelle);
        const axe = await p.evaluate(async () => {
          document.querySelectorAll('details').forEach((d) => { d.open = true; });
          const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } });
          return r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
        });
        ergebnis[`axe-${thema}`] = axe.length;
        for (const v of axe) melden(`axe ${seite} ${thema}: ${v}`);
        // Zweiter Lauf in Handybreite (Handyleiste, Ergebnisleiste, Menü-Knopf)
        await p.setViewportSize({ width: 390, height: 844 });
        await p.waitForTimeout(150);
        const axeHandy = await p.evaluate(async () => {
          const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } });
          return r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
        });
        ergebnis[`axe-handy-${thema}`] = axeHandy.length;
        for (const v of axeHandy) melden(`axe Handy ${seite} ${thema}: ${v}`);
      }
      await ctx.close();
    }
    // Ohne JavaScript: Inhalt da, Navigation da, keine leeren Bereiche
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const p = await ctx.newPage();
    await p.goto(BASIS + seite + '.html');
    const ohneJs = await p.evaluate(() => ({
      h1: !!document.querySelector('h1')?.textContent.trim(),
      nav: document.querySelectorAll('#fussnavigation ~ ul a').length,
      textlaenge: document.body.innerText.length
    }));
    if (!ohneJs.h1 || ohneJs.nav < 6 || ohneJs.textlaenge < 800) melden(`${name} ${seite} ohne JavaScript: ${JSON.stringify(ohneJs)}`);
    await ctx.close();
    console.log(`  ✓ ${seite}`);
  }
  await browser.close();
}

await browserPruefen('chromium', chromium);
await browserPruefen('webkit', webkit);
await browserPruefen('firefox', firefox);

// Tagesverlauf mit Bewegung (die Prüfungen oben laufen mit reduzierter Bewegung): Während der Startsequenz zeigt der Knopf
// «anhalten», ein Klick hält die Szene an, der nächste spielt ab. Nach der Startsequenz steht er wieder auf «abspielen».
{
  console.log('\nTagesverlauf');
  // Playwright-Chromium, sonst das installierte Google Chrome
  const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  const p = await ctx.newPage();
  await p.goto(BASIS + 'index.html', { waitUntil: 'load' });
  const knopf = p.locator('[data-szene-play]'), zeit = async () => Number(await p.locator('#szene-zeit').inputValue());
  await p.waitForTimeout(1500);
  const vorher = await knopf.getAttribute('aria-label');
  await knopf.click();
  const t1 = await zeit(); await p.waitForTimeout(800); const t2 = await zeit();
  const angehalten = await knopf.getAttribute('aria-label');
  await knopf.click(); await p.waitForTimeout(800); const t3 = await zeit();
  if (vorher !== 'Tagesverlauf anhalten' || t1 !== t2 || angehalten !== 'Tagesverlauf abspielen' || !(t3 > t2)) {
    melden(`Tagesverlauf: Startsequenz «${vorher}», Klick hält an (${t1} → ${t2}, «${angehalten}»), Klick spielt ab (${t2} → ${t3})`);
  } else console.log(`  ✓ Startsequenz zeigt «anhalten», Klick hält bei ${t2} Uhr an, nächster Klick spielt ab (${t3} Uhr)`);
  await p.reload({ waitUntil: 'load' });
  await p.waitForTimeout(6800);
  const nachStart = await knopf.getAttribute('aria-label'), s1 = await zeit();
  await knopf.click(); await p.waitForTimeout(800); const s2 = await zeit();
  if (nachStart !== 'Tagesverlauf abspielen' || !(s2 > s1)) melden(`Tagesverlauf nach der Startsequenz: «${nachStart}», Klick ${s1} → ${s2}`);
  else console.log(`  ✓ Nach der Startsequenz «abspielen», Klick spielt ab (${s1} → ${s2} Uhr)`);
  await browser.close();
}

// html-validate
const hv = new HtmlValidate({
  extends: ['html-validate:recommended'],
  rules: { 'no-inline-style': 'off', 'require-sri': 'off', 'no-trailing-whitespace': 'off', 'long-title': 'off', 'attribute-boolean-style': 'off',
    'no-redundant-role': 'off', 'prefer-native-element': ['error', { exclude: ['switch', 'slider', 'tab', 'tablist', 'tabpanel', 'radiogroup', 'group', 'list'] }],
    'form-dup-name': ['error', { shared: ['radio', 'checkbox', 'button', 'reset', 'submit'] }] }
});
console.log('\nhtml-validate');
for (const d of readdirSync(join(ROOT, 'musterprojekte/firstlicht')).filter((x) => x.endsWith('.html'))) {
  const r = await hv.validateFile(join(ROOT, 'musterprojekte/firstlicht', d));
  const msgs = r.results.flatMap((x) => x.messages);
  if (msgs.length) for (const m of msgs.slice(0, 15)) melden(`html-validate ${d}:${m.line} ${m.ruleId}: ${m.message}`);
  else console.log(`  ✓ ${d}`);
}

server.close();
bericht.befunde = befunde;
writeFileSync(join(AUS, 'bericht.json'), JSON.stringify(bericht, null, 2));
console.log(`\n${befunde.length ? `${befunde.length} Befunde` : 'Alles bestanden'}. Bericht: _lokal/firstlicht-qa/bericht.json`);
process.exit(befunde.length ? 1 : 0);
