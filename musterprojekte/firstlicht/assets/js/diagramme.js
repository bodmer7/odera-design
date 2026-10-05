/* Firstlicht: kleine SVG-Diagramme ohne Bibliothek
   Balken (eine Reihe) und Linie mit Break-even. Schmale Marken, 4px gerundete Enden,
   haarfeine Achsen, Hover-Tooltip. Die Werte stehen zusätzlich in einer Tabelle. */

import { zahl } from './hilfen.js';

const NS = 'http://www.w3.org/2000/svg';

/* Saubere Achsenschritte: 1, 2, 2.5, 5 × 10^n */
export function achsenSchritte(min, max, anzahl = 4) {
  const spanne = Math.max(1, max - min);
  const roh = spanne / anzahl;
  const basis = 10 ** Math.floor(Math.log10(roh));
  const schritt = [1, 2, 2.5, 5, 10].map((f) => f * basis).find((s) => s >= roh);
  const von = Math.floor(min / schritt) * schritt;
  const bis = Math.ceil(max / schritt) * schritt;
  const werte = [];
  for (let v = von; v <= bis + schritt / 2; v += schritt) werte.push(Math.round(v * 1000) / 1000);
  return { von, bis, werte };
}

function tooltip(flaeche) {
  let t = flaeche.querySelector('.diagramm__tipp');
  if (!t) {
    t = document.createElement('div');
    t.className = 'diagramm__tipp';
    t.setAttribute('aria-hidden', 'true');
    flaeche.append(t);
  }
  return {
    zeigen(text, x, y) { t.textContent = text; t.style.left = `${x}px`; t.style.top = `${y}px`; t.classList.add('ist-sichtbar'); },
    weg() { t.classList.remove('ist-sichtbar'); }
  };
}

/* Breite des Containers, damit Schrift und Marken in echter Grösse gezeichnet werden */
const breiteVon = (flaeche) => Math.max(280, Math.min(900, Math.round(flaeche.clientWidth || 600)));
const beobachtet = new WeakMap();
function beiGroesse(flaeche, neuZeichnen) {
  beobachtet.set(flaeche, neuZeichnen);
  if (flaeche.dataset.beobachtet) return;
  flaeche.dataset.beobachtet = '1';
  let letzte = flaeche.clientWidth;
  new ResizeObserver(() => {
    if (Math.abs(flaeche.clientWidth - letzte) < 8) return;
    letzte = flaeche.clientWidth;
    beobachtet.get(flaeche)();
  }).observe(flaeche);
}

export function balken(flaeche, daten, opt = {}) {
  beiGroesse(flaeche, () => balken(flaeche, daten, opt));
  const { titel = '', einheit = '' } = opt;
  const B = breiteVon(flaeche), H = B < 480 ? 200 : 240, links = 46, unten = 26, oben = 16;
  const max = Math.max(1, ...daten.map((d) => d.wert));
  const { bis, werte } = achsenSchritte(0, max, 4);
  const y = (v) => oben + (H - oben - unten) * (1 - v / bis);
  const band = (B - links) / daten.length;
  const breite = Math.min(24, band - 6);
  let s = `<svg viewBox="0 0 ${B} ${H}" role="img" aria-label="${titel}. Die Werte stehen auch in der Tabelle." focusable="false">`;
  for (const w of werte) s += `<line class="achse" x1="${links}" x2="${B}" y1="${y(w)}" y2="${y(w)}"/><text class="achse-text" x="${links - 8}" y="${y(w) + 4}" text-anchor="end">${zahl(w)}</text>`;
  daten.forEach((d, i) => {
    const x = links + band * i + (band - breite) / 2;
    const h = Math.max(0, y(0) - y(d.wert));
    const r = Math.min(4, h, breite / 2);
    // Oben gerundet, an der Grundlinie gerade
    const pfad = h > 0
      ? `M${x} ${y(0)}V${y(d.wert) + r}Q${x} ${y(d.wert)} ${x + r} ${y(d.wert)}H${x + breite - r}Q${x + breite} ${y(d.wert)} ${x + breite} ${y(d.wert) + r}V${y(0)}Z`
      : '';
    s += `<path class="balken" data-i="${i}" d="${pfad}"/>`;
    s += `<rect class="treffer" data-i="${i}" x="${links + band * i}" y="${oben}" width="${band}" height="${H - oben - unten}" fill="transparent"/>`;
    const zahlLabel = /^\d+$/.test(d.label);
    const zeigen = !zahlLabel || band >= 22 || i % Math.ceil(22 / band) === 0;
    if (zeigen) s += `<text class="achse-text" x="${x + breite / 2}" y="${H - 6}" text-anchor="middle">${!zahlLabel && band < 34 ? d.label.slice(0, 1) : d.label}</text>`;
  });
  // Grösster Wert direkt beschriftet
  const iMax = daten.findIndex((d) => d.wert === max);
  if (iMax >= 0) s += `<text class="wert-text" x="${links + band * iMax + band / 2}" y="${y(max) - 6}" text-anchor="middle">${zahl(Math.round(max / 10) * 10)}</text>`;
  s += '</svg>';
  flaeche.innerHTML = s;
  const tip = tooltip(flaeche);
  const svg = flaeche.querySelector('svg');
  svg.addEventListener('pointermove', (ev) => {
    const t = ev.target.closest('[data-i]');
    svg.querySelectorAll('.balken.ist-aktiv').forEach((b) => b.classList.remove('ist-aktiv'));
    if (!t) { tip.weg(); return; }
    const i = Number(t.dataset.i);
    const bar = svg.querySelector(`.balken[data-i="${i}"]`);
    bar.classList.add('ist-aktiv');
    const rs = svg.getBoundingClientRect();
    const rb = bar.getBoundingClientRect();
    tip.zeigen(`${daten[i].lang}: ${zahl(Math.round(daten[i].wert / 10) * 10)} ${einheit}`, rb.left - rs.left + rb.width / 2, rb.top - rs.top);
  });
  svg.addEventListener('pointerleave', () => { tip.weg(); svg.querySelectorAll('.balken.ist-aktiv').forEach((b) => b.classList.remove('ist-aktiv')); });
}

export function linie(flaeche, punkte, opt = {}) {
  beiGroesse(flaeche, () => linie(flaeche, punkte, opt));
  const { titel = '', breakEven = null, xLabel = String, yFormat = String } = opt;
  const B = breiteVon(flaeche), H = B < 480 ? 220 : 260, links = 62, unten = 26, oben = 16, rechts = 12;
  const ys = punkte.map((p) => p.y);
  const { von, bis, werte } = achsenSchritte(Math.min(0, ...ys), Math.max(0, ...ys), 4);
  const xMax = punkte[punkte.length - 1].x;
  const x = (v) => links + (B - links - rechts) * (v / xMax);
  const y = (v) => oben + (H - oben - unten) * (1 - (v - von) / (bis - von));
  let s = `<svg viewBox="0 0 ${B} ${H}" role="img" aria-label="${titel}. Die Werte stehen auch in der Tabelle." focusable="false">`;
  for (const w of werte) {
    s += `<line class="${w === 0 ? 'null' : 'achse'}" x1="${links}" x2="${B - rechts}" y1="${y(w)}" y2="${y(w)}"/>`;
    s += `<text class="achse-text" x="${links - 8}" y="${y(w) + 4}" text-anchor="end">${zahl(w)}</text>`;
  }
  for (let j = 0; j <= xMax; j += 5) s += `<text class="achse-text" x="${x(j)}" y="${H - 6}" text-anchor="middle">${j}</text>`;
  const d = punkte.map((p, i) => `${i ? 'L' : 'M'}${x(p.x).toFixed(1)} ${y(p.y).toFixed(1)}`).join('');
  s += `<path class="flaeche" d="${d}L${x(xMax)} ${y(Math.max(von, 0))}L${x(0)} ${y(Math.max(von, 0))}Z"/>`;
  s += `<path class="linie" d="${d}"/>`;
  if (breakEven !== null && breakEven <= xMax) {
    s += `<circle class="punkt" cx="${x(breakEven)}" cy="${y(0)}" r="5"/>`;
    const anker = breakEven > xMax * 0.75 ? 'end' : 'start';
    s += `<text class="wert-text" x="${x(breakEven) + (anker === 'end' ? -10 : 10)}" y="${y(0) - 10}" text-anchor="${anker}">${B < 480 ? 'Break-even' : `Break-even nach rund ${zahl(Math.round(breakEven))} Jahren`}</text>`;
  }
  const letzter = punkte[punkte.length - 1];
  s += `<circle class="punkt" cx="${x(letzter.x)}" cy="${y(letzter.y)}" r="4"/>`;
  s += `<line class="fadenkreuz" x1="0" x2="0" y1="${oben}" y2="${H - unten}" visibility="hidden"/>`;
  s += `<circle class="punkt" data-hover r="5" visibility="hidden"/>`;
  s += `<rect class="treffer" x="${links}" y="${oben}" width="${B - links - rechts}" height="${H - oben - unten}" fill="transparent"/>`;
  s += '</svg>';
  flaeche.innerHTML = s;
  const svg = flaeche.querySelector('svg');
  const tip = tooltip(flaeche);
  const kreuz = svg.querySelector('.fadenkreuz');
  const punkt = svg.querySelector('[data-hover]');
  svg.addEventListener('pointermove', (ev) => {
    const rs = svg.getBoundingClientRect();
    const vx = ((ev.clientX - rs.left) / rs.width) * B;
    const j = Math.max(0, Math.min(xMax, Math.round(((vx - links) / (B - links - rechts)) * xMax)));
    const p = punkte[j];
    kreuz.setAttribute('x1', x(p.x)); kreuz.setAttribute('x2', x(p.x)); kreuz.setAttribute('visibility', 'visible');
    punkt.setAttribute('cx', x(p.x)); punkt.setAttribute('cy', y(p.y)); punkt.setAttribute('visibility', 'visible');
    tip.zeigen(`${xLabel(p.x)}: ${yFormat(p.y)}`, (x(p.x) / B) * rs.width, (y(p.y) / H) * rs.height);
  });
  svg.addEventListener('pointerleave', () => { tip.weg(); kreuz.setAttribute('visibility', 'hidden'); punkt.setAttribute('visibility', 'hidden'); });
}
