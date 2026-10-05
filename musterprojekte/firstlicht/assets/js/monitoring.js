/* Firstlicht: Monitoring-Demo mit Beispieldaten (Tag, Monat, Jahr)
   Wird erst geladen, wenn der Abschnitt in die Nähe kommt. */

import { tagesverlauf } from './szene-modell.js';
import { berechnen } from './rechner-logik.js';
import { annahmenLaden, zahl, prozent } from './hilfen.js';
import { balken } from './diagramme.js';

const wurzel = document.querySelector('[data-monitoring]');
const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

// Gleichbleibende «Wetter»-Faktoren, damit die Beispieldaten bei jedem Besuch gleich aussehen
function wetter(tag) {
  const x = Math.sin(tag * 12.9898) * 43758.5453;
  return 0.45 + 0.75 * (x - Math.floor(x));
}

async function starten() {
  const a = await annahmenLaden();
  const anlage = berechnen({ groesseArt: 'manuell', kwp: 10, flaeche: 100, speicher: true, eauto: true }, a);
  const quote = anlage.eigenverbrauchQuote;

  // Tag: Beispieltag aus dem Modell der Szene (10 kWp, Sommer)
  const verlauf = tagesverlauf('sommer');
  const stunden = [];
  let tagProd = 0, tagNetz = 0;
  for (let h = 5; h < 22; h++) {
    const teil = verlauf.filter((p) => p.t >= h && p.t < h + 1);
    const prod = teil.reduce((s, p) => s + p.prod / 12, 0);
    tagProd += prod;
    tagNetz += teil.reduce((s, p) => s + p.f.dachNetz / 12, 0);
    stunden.push({ label: String(h), lang: `${h} bis ${h + 1} Uhr`, wert: prod });
  }
  // Monat: Juli, Tageswerte mit Wetter
  const juli = (anlage.monate[6]);
  const roh = Array.from({ length: 31 }, (_, i) => wetter(i + 1));
  const summe = roh.reduce((s, x) => s + x, 0);
  const tage = roh.map((x, i) => ({ label: String(i + 1), lang: `${i + 1}. Juli`, wert: (juli * x) / summe }));
  const jahr = anlage.monate.map((w, i) => ({ label: MONATE[i].slice(0, 3), lang: MONATE[i], wert: w }));

  const ZEITRAUM = {
    tag: { daten: stunden, werte: [['Produktion heute', `${zahl(tagProd)} kWh`], ['Selbst genutzt', prozent(1 - tagNetz / tagProd)], ['Eingespeist', `${zahl(tagNetz)} kWh`]],
      hinweis: 'Produktion pro Stunde an einem klaren Sommertag, in kWh. Beispieldaten einer Anlage mit 10 kWp und Speicher.' },
    monat: { daten: tage, werte: [['Produktion Juli', `${zahl(Math.round(juli / 10) * 10)} kWh`], ['Selbst genutzt', prozent(quote)], ['Bester Tag', `${zahl(Math.max(...tage.map((t) => t.wert)), 1)} kWh`]],
      hinweis: 'Produktion pro Tag im Juli, in kWh. Bewölkte Tage sind gut zu erkennen. Beispieldaten.' },
    jahr: { daten: jahr, werte: [['Produktion Jahr', `${zahl(anlage.ertrag.wert)} kWh`], ['Selbst genutzt', prozent(quote)], ['Winterhalbjahr', prozent([0, 1, 2, 9, 10, 11].reduce((s, i) => s + anlage.monate[i], 0) / anlage.ertrag.roh)]],
      hinweis: 'Produktion pro Monat, in kWh. Beispieldaten einer Anlage mit 10 kWp im Mittelland.' }
  };

  const tabs = [...wurzel.querySelectorAll('[role="tab"]')];
  const panel = wurzel.querySelector('[role="tabpanel"]');
  const flaeche = wurzel.querySelector('[data-mon-diagramm]');

  function zeigen(name, fokus) {
    const z = ZEITRAUM[name];
    tabs.forEach((t) => {
      const aktiv = t.dataset.zeitraum === name;
      t.setAttribute('aria-selected', String(aktiv));
      t.tabIndex = aktiv ? 0 : -1;
      if (aktiv) { panel.setAttribute('aria-labelledby', t.id); if (fokus) t.focus(); }
    });
    z.werte.forEach(([l, w], i) => {
      wurzel.querySelector(`[data-mon="l${i + 1}"]`).textContent = l;
      wurzel.querySelector(`[data-mon="w${i + 1}"]`).textContent = w;
    });
    wurzel.querySelector('[data-mon="hinweis"]').textContent = z.hinweis;
    balken(flaeche, z.daten, { titel: z.hinweis, einheit: 'kWh' });
  }

  wurzel.querySelector('[role="tablist"]').addEventListener('click', (e) => {
    const t = e.target.closest('[role="tab"]');
    if (t) zeigen(t.dataset.zeitraum, false);
  });
  wurzel.querySelector('[role="tablist"]').addEventListener('keydown', (e) => {
    const i = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
    const ziel = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (ziel === undefined) return;
    e.preventDefault();
    zeigen(tabs[(ziel + tabs.length) % tabs.length].dataset.zeitraum, true);
  });
  zeigen('tag', false);
}

if (wurzel) starten().catch((e) => console.error('Monitoring:', e));
