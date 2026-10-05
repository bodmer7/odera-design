/* Firstlicht: Projekte filtern, animiert umsortieren, Details im Dialog
   Ohne JavaScript sind alle Projekte mit ihrer Geschichte sichtbar. */

import { zahl, bewegungAus } from './hilfen.js';

const wurzel = document.querySelector('[data-projekte]');
const liste = wurzel.querySelector('[data-projekte-liste]');
const karten = [...liste.querySelectorAll('.projekt')];
const knoepfe = [...wurzel.querySelectorAll('[data-filter]')];
const anzahl = wurzel.querySelector('[data-projekte-anzahl]');
const daten = JSON.parse(document.getElementById('projekte-daten').textContent);
const dialog = document.getElementById('projekt-dialog');
const ERLAUBT = ['alle', 'efh', 'mfh', 'gewerbe', 'landwirtschaft', 'speicher'];

/* ---------- Filter ---------- */
function anwenden(filter) {
  knoepfe.forEach((k) => k.setAttribute('aria-pressed', String(k.dataset.filter === filter)));
  let n = 0;
  karten.forEach((k) => {
    const passt = filter === 'alle' || k.dataset.kategorien.split(' ').includes(filter);
    k.hidden = !passt;
    if (passt) n++;
  });
  anzahl.textContent = `${n} ${n === 1 ? 'Beispielprojekt' : 'Beispielprojekte'}${filter === 'alle' ? '' : ' in dieser Auswahl'}`;
}

// Umsortieren mit View Transitions, sonst FLIP
function filtern(filter) {
  const p = new URLSearchParams(location.search);
  if (filter === 'alle') p.delete('filter'); else p.set('filter', filter);
  history.replaceState(null, '', location.pathname + (p.toString() ? `?${p}` : ''));
  if (bewegungAus()) { anwenden(filter); return; }
  if (document.startViewTransition) {
    karten.forEach((k) => { k.style.viewTransitionName = `projekt-${k.id}`; });
    document.startViewTransition(() => anwenden(filter)).finished.finally(() => karten.forEach((k) => { k.style.viewTransitionName = ''; }));
    return;
  }
  const vorher = new Map(karten.filter((k) => !k.hidden).map((k) => [k, k.getBoundingClientRect()]));
  anwenden(filter);
  karten.filter((k) => !k.hidden).forEach((k) => {
    const alt = vorher.get(k);
    const neu = k.getBoundingClientRect();
    if (!alt) { k.animate([{ opacity: 0, transform: 'scale(0.96)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'ease-out' }); return; }
    const dx = alt.left - neu.left, dy = alt.top - neu.top;
    if (dx || dy) k.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 350, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' });
  });
}

knoepfe.forEach((k) => k.addEventListener('click', () => filtern(k.dataset.filter)));
const start = new URLSearchParams(location.search).get('filter');
anwenden(ERLAUBT.includes(start) ? start : 'alle');

/* ---------- Dialog ---------- */
const $ = (k) => dialog.querySelector(`[data-pd="${k}"]`);

function oeffnen(id) {
  const p = daten.find((d) => d.id === id);
  if (!p || typeof dialog.showModal !== 'function') return;
  $('titel').textContent = p.titel;
  $('badge').textContent = `Beispielprojekt, ${p.jahr}`;
  $('geschichte').textContent = p.geschichte;
  $('vorher').innerHTML = p.vorher;
  $('nachher').innerHTML = p.nachher;
  const werte = [
    ['Leistung', `${zahl(p.kwp, 1)} kWp${p.bestandKwp ? `, davon ${zahl(p.bestandKwp, 1)} bestehend` : ''}`],
    ['Module', `${p.module}${p.bestandKwp ? ' neu' : ''}`],
    ['Jahresertrag', `rund ${zahl(p.ertrag)} kWh`],
    ['Speicher', p.speicherKwh ? `${p.speicherKwh} kWh` : 'keiner'],
    ['Montage', `${p.montageTage} Tage`],
    ['Besonderheit', p.besonderheit]
  ];
  $('kennzahlen').innerHTML = werte.map(([t]) => `<div><dt>${t}</dt><dd></dd></div>`).join('');
  [...$('kennzahlen').querySelectorAll('dd')].forEach((dd, i) => { dd.textContent = werte[i][1]; });
  const regler = dialog.querySelector('.vn__regler');
  regler.value = 50;
  dialog.querySelector('.vn').style.setProperty('--vn', '50%');
  regler.dispatchEvent(new Event('input'));
  dialog.showModal();
  history.replaceState(null, '', `${location.pathname}${location.search}#projekt-${id}`);
}

dialog.querySelector('[data-dialog-zu]').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
dialog.addEventListener('close', () => history.replaceState(null, '', location.pathname + location.search));

// Titel werden zu Knöpfen, die den Dialog öffnen
liste.querySelectorAll('[data-projekt-titel]').forEach((span) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'projekt__knopf';
  b.setAttribute('aria-haspopup', 'dialog');
  b.textContent = span.textContent;
  b.addEventListener('click', () => oeffnen(span.dataset.projektTitel));
  span.replaceWith(b);
});

// Link von der Startseite: #projekt-id öffnet das Projekt
const ziel = location.hash.match(/^#projekt-([\w-]+)$/);
if (ziel) { const karte = document.getElementById(`projekt-${ziel[1]}`); if (karte) { karte.hidden = false; oeffnen(ziel[1]); } }
