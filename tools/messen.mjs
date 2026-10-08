#!/usr/bin/env node
// Misst die Kennzahlen für docs/redesign-vorher-nachher.md.
//
//   node tools/messen.mjs [basis-url]        (Standard: https://odera.ch)
//
// Pro Route: Grösse des ausgelieferten HTML, Anzahl <h1> und {{ im Quelltext, Wörter (ganze Seite und pro
// Abschnitt), Seitenhöhe bei 1440 px, Hintergrundwechsel zwischen den Abschnitten, Anzahl echter Bilder.
// Ausgabe als JSON auf stdout, Zusammenfassung als Markdown-Tabelle auf stderr.

import { chromium } from 'playwright';

const BASIS = (process.argv[2] || 'https://odera.ch').replace(/\/$/, '');
const ROUTEN = (process.env.ROUTEN || '/,/angebot/,/ablauf/,/musterprojekte/,/ueber-mich/,/projekt-check/,/datenschutz/,/impressum/,/agb/').split(',');

// Installiertes Google Chrome, damit Playwright keine eigenen Browser herunterladen muss
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'chrome' });
const ergebnis = {};
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  for (const r of ROUTEN) {
    const roh = await (await fetch(BASIS + r)).text();
    const page = await ctx.newPage();
    await page.goto(BASIS + r, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const m = await page.evaluate(() => {
      const sichtbar = (el) => { const cs = getComputedStyle(el); const b = el.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && b.width > 0 && b.height > 0; };
      const woerter = (el) => (el.innerText || '').split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
      const main = [...document.querySelectorAll('main')].find(sichtbar) || document.body;
      // Abschnitte: oberste section-Elemente in main, sonst direkte Kinder
      let abschnitte = [...main.querySelectorAll('section')].filter((s) => sichtbar(s) && !s.parentElement.closest('main section'));
      if (!abschnitte.length) abschnitte = [...main.children].filter(sichtbar);
      const grund = (el) => {
        for (let e = el; e; e = e.parentElement) {
          const c = getComputedStyle(e).backgroundColor;
          if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c;
        }
        return 'rgb(255, 255, 255)';
      };
      const foot = [...document.querySelectorAll('footer')].find(sichtbar);
      const flaechen = [...abschnitte, ...(foot ? [foot] : [])].map(grund);
      let wechsel = 0;
      for (let i = 1; i < flaechen.length; i++) if (flaechen[i] !== flaechen[i - 1]) wechsel++;
      // Echte Bilder: <img> und Bildflächen mit Hintergrundbild (role="img"), mindestens 120 px breit, keine SVG-Grafiken
      const bilder = [...main.querySelectorAll('img, [role="img"]')].filter((i) => sichtbar(i) && i.getBoundingClientRect().width >= 120 &&
        (i.tagName === 'IMG' ? !/\.svg/.test(i.getAttribute('src') || '') : /url\(/.test(getComputedStyle(i).backgroundImage)));
      return {
        hoehe: document.scrollingElement.scrollHeight,
        woerter: woerter(main),
        abschnitte: abschnitte.map((s, i) => ({ nr: i + 1, titel: (s.querySelector('h1,h2,h3')?.innerText || '').trim().slice(0, 60), woerter: woerter(s), grund: grund(s) })),
        flaechen,
        hintergrundwechsel: wechsel,
        bilder: bilder.length,
        h1Gerendert: [...document.querySelectorAll('h1')].filter(sichtbar).length,
      };
    });
    ergebnis[r] = { kb: Math.round(Buffer.byteLength(roh) / 1024), h1Quelle: (roh.match(/<h1[\s>]/g) || []).length, platzhalter: (roh.match(/\{\{/g) || []).length, ...m };
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify(ergebnis, null, 2));
const z = ['| Route | HTML KB | h1 im Quelltext | {{ | Wörter | Höhe px | Abschnitte | Hintergrundwechsel | Bilder |', '|---|---|---|---|---|---|---|---|---|'];
for (const [r, m] of Object.entries(ergebnis)) z.push(`| \`${r}\` | ${m.kb} | ${m.h1Quelle} | ${m.platzhalter} | ${m.woerter} | ${m.hoehe} | ${m.abschnitte.length} | ${m.hintergrundwechsel} | ${m.bilder} |`);
console.error(z.join('\n'));
