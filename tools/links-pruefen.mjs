#!/usr/bin/env node
// Prüft bei 390 px mit Touch-Emulation, ob Links und Knöpfe antippbar sind.
//
//   node tools/links-pruefen.mjs [basis-url] [--banner]
//
// 1. Verdeckte Links: Für jedes sichtbare <a> und jeden <button> wird der Mittelpunkt nach dem Hineinscrollen
//    per document.elementFromPoint() geprüft. Ist das oberste Element dort nicht der Link selbst oder ein Kind
//    davon, gilt der Link als verdeckt. Ziel: leere Liste auf allen Routen.
// 2. Musterprojekte antippen: Jeder Link auf ein Musterprojekt wird per Touch angetippt. Erwartet wird, dass
//    danach die Musterprojekt-Seite offen ist (unter 768 px öffnet der Link die Seite direkt).
// Mit --banner wird vorher das Einwilligungs-Banner der Statistik eingeblendet (falls vorhanden).

import { chromium, devices } from 'playwright';

const args = process.argv.slice(2);
const BASIS = (args.find((a) => !a.startsWith('--')) || 'https://odera.ch').replace(/\/$/, '');
const MIT_BANNER = args.includes('--banner');
const ROUTEN = (process.env.ROUTEN || '/,/angebot/,/ablauf/,/musterprojekte/,/ueber-mich/,/projekt-check/,/datenschutz/,/impressum/,/agb/,/website-fuer-handwerker/,/website-fuer-restaurants/,/website-fuer-praxen/,/website-fuer-laeden/').split(',');
const GERAETE = { iphone: devices['iPhone 13'], android: devices['Pixel 7'] };

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'chrome' });
let fehler = 0;
try {
  for (const [gname, geraet] of Object.entries(GERAETE)) {
    const ctx = await browser.newContext({ ...geraet, viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    if (MIT_BANNER) await ctx.addInitScript(() => { try { localStorage.removeItem('odera-statistik'); } catch {} window.__bannerSofort = true; });
    for (const r of ROUTEN) {
      const page = await ctx.newPage();
      const antwort = await page.goto(BASIS + r, { waitUntil: 'networkidle' }).catch(() => null);
      if (!antwort || antwort.status() >= 400) { await page.close(); continue; }
      await page.waitForTimeout(600);
      if (MIT_BANNER) await page.evaluate(() => window.dispatchEvent(new Event('scroll'))).catch(() => {});
      await page.waitForTimeout(MIT_BANNER ? 3500 : 0);
      const verdeckt = await page.evaluate(async () => {
        const warte = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 30))));
        const liste = [];
        const kandidaten = [...document.querySelectorAll('a[href], button')].filter((el) => {
          if (el.closest('x-dc, #vorab[hidden], noscript, [aria-hidden="true"]')) return false;
          const cs = getComputedStyle(el); const b = el.getBoundingClientRect();
          return cs.display !== 'none' && cs.visibility !== 'hidden' && b.width > 1 && b.height > 1 && cs.pointerEvents !== 'none';
        });
        for (const el of kandidaten) {
          if (!el.isConnected) continue;
          el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
          await warte();
          // Bei Links über mehrere Zeilen zählt die erste Zeile (dort tippt man auf den Text)
          const b = el.getClientRects()[0];
          if (!b || b.width < 1 || b.height < 1) continue;
          // Elemente in waagrechten Wischlisten: nur prüfen, was im Fenster liegt
          const x = b.left + b.width / 2, y = b.top + b.height / 2;
          if (x < 0 || x > innerWidth || y < 0 || y > innerHeight) continue;
          const oben = document.elementFromPoint(x, y);
          if (!oben || oben === el || el.contains(oben)) continue;
          // Das Label eines Knopfs, der im Label steckt, zählt nicht als Verdeckung
          if (oben.closest('label') && oben.closest('label').contains(el)) continue;
          const name = (el.getAttribute('aria-label') || el.innerText || el.getAttribute('href') || '').trim().replace(/\s+/g, ' ').slice(0, 50);
          const ueber = oben.tagName.toLowerCase() + (oben.id ? '#' + oben.id : '') + (oben.className && typeof oben.className === 'string' ? '.' + oben.className.trim().split(/\s+/).join('.') : '');
          liste.push(`${el.tagName.toLowerCase()} «${name}» verdeckt von ${ueber.slice(0, 80)}`);
        }
        return liste;
      });
      if (verdeckt.length) { fehler += verdeckt.length; console.log(`✗ ${gname} ${r}: ${verdeckt.length} verdeckt`); verdeckt.forEach((v) => console.log('    ' + v)); }
      else console.log(`✓ ${gname} ${r}: keine verdeckten Links`);
      await page.close();
    }

    // Musterprojekte antippen
    for (const r of ['/', '/musterprojekte/']) {
      const page = await ctx.newPage();
      await page.goto(BASIS + r, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      const ziele = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href*="/musterprojekte/"]')]
        .filter((a) => { const b = a.getBoundingClientRect(); return b.width > 0 && b.height > 0 && /\/musterprojekte\/[a-z]/.test(a.getAttribute('href')); })
        .map((a, i) => { a.setAttribute('data-tipp', String(i)); return a.getAttribute('data-tipp'); }))]);
      for (const id of ziele) {
        await page.goto(BASIS + r, { waitUntil: 'networkidle' });
        await page.waitForTimeout(600);
        // Index neu vergeben, weil die Seite neu geladen wurde
        await page.evaluate(() => [...document.querySelectorAll('a[href*="/musterprojekte/"]')]
          .filter((a) => { const b = a.getBoundingClientRect(); return b.width > 0 && b.height > 0 && /\/musterprojekte\/[a-z]/.test(a.getAttribute('href')); })
          .forEach((a, i) => a.setAttribute('data-tipp', String(i))));
        const link = page.locator(`[data-tipp="${id}"]`);
        const href = await link.getAttribute('href');
        const text = ((await link.getAttribute('aria-label')) || (await link.innerText()).trim()).replace(/\s+/g, ' ').slice(0, 40);
        await link.scrollIntoViewIfNeeded();
        await link.tap({ timeout: 5000 }).catch((e) => console.log('    Tippen gescheitert: ' + e.message.split('\n')[0]));
        await page.waitForTimeout(1500);
        const url = page.url();
        const overlay = await page.evaluate(() => !!document.querySelector('.mp-ov, iframe[src*="musterprojekte"]'));
        const ok = /\/musterprojekte\/[a-z]/.test(new URL(url).pathname) || overlay;
        if (!ok) fehler++;
        console.log(`${ok ? '✓' : '✗'} ${gname} ${r} tippen «${text}» (${href}) → ${new URL(url).pathname}${overlay ? ' (Overlay)' : ''}`);
      }
      await page.close();
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log(fehler ? `\n${fehler} Probleme gefunden.` : '\nAlles antippbar.');
process.exit(fehler ? 1 : 0);
