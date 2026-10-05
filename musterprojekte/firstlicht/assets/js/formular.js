/* Firstlicht: Anfrage-Formular «Dach-Check» in drei Schritten (Demo, sendet nichts)
   Gleiche Fehlerlogik wie der Projekt-Check auf odera.ch: Pflichtfelder beschriftet, «Weiter» nie
   gesperrt, Fehler am Feld mit Text, Fokus ins erste fehlerhafte Feld, Zusammenfassung ab zwei Fehlern,
   Zeile «Noch offen» unter dem Knopf, Tippfehler-Vorschlag bei der E-Mail. */

import { speicher, annahmenLaden, zahl, chf, prozent, spanne } from './hilfen.js';

const form = document.querySelector('[data-formular]');
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

const MELDUNGEN = {
  gebaeude: 'Bitte wählen Sie das Gebäude.',
  dach: 'Bitte wählen Sie die Dachform. «Weiss nicht» ist auch in Ordnung.',
  zeitrahmen: 'Bitte wählen Sie, wann Sie bauen möchten.',
  name: 'Bitte geben Sie Ihren Namen ein.',
  telefon: 'Bitte geben Sie Ihre Telefonnummer ein, damit wir Sie zurückrufen können.',
  telefonFormat: 'Diese Telefonnummer scheint unvollständig. Beispiel: 079 123 45 67',
  email: 'Diese E-Mail-Adresse scheint unvollständig. Beispiel: anna@beispiel.ch',
  plz: 'Bitte geben Sie Ihre Postleitzahl ein.',
  plzFormat: 'Die Postleitzahl hat vier Ziffern, zum Beispiel 5610.',
  ort: 'Bitte geben Sie Ihren Ort ein.'
};
const LABEL = { gebaeude: 'Gebäude', dach: 'Dach', zeitrahmen: 'Zeitrahmen', name: 'Name', telefon: 'Telefon', email: 'E-Mail', plz: 'PLZ', ort: 'Ort' };
// Dieselben Muster wie ANFRAGE.pruefung auf odera.ch
const EMAIL = /^[^\s@<>()[\]\\,;:"]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;
const DOMAINS = ['gmail.com', 'googlemail.com', 'gmx.ch', 'gmx.net', 'gmx.de', 'bluewin.ch', 'hotmail.com', 'hotmail.ch', 'outlook.com', 'live.com',
  'icloud.com', 'me.com', 'yahoo.com', 'yahoo.de', 'sunrise.ch', 'hispeed.ch', 'protonmail.com', 'proton.me', 'web.de', 'quickline.ch'];

export function telefonOk(v) {
  if (!/^\+?[0-9 ().\/-]+$/.test(v)) return false;
  const z = v.replace(/\D/g, '');
  if (z.length < 9 || z.length > 15) return false;
  if (v.charAt(0) !== '+' && /^0[1-9]/.test(z)) return z.length === 10;
  return true;
}

function abstand(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

function mailVorschlag(v) {
  const t = v.toLowerCase();
  const at = t.lastIndexOf('@');
  if (at < 1) return '';
  const dom = t.slice(at + 1);
  if (!dom || DOMAINS.includes(dom)) return '';
  let best = '', bestD = 9;
  for (const x of DOMAINS) { const n = abstand(dom, x); if (n < bestD) { bestD = n; best = x; } }
  return bestD === 1 || (bestD === 2 && dom.length >= 9) ? t.slice(0, at + 1) + best : '';
}

const schritte = $$('[data-schritt]', form);
const punkte = $$('[data-schritte] li', form);
const zurueck = $('[data-zurueck]', form);
const weiter = $('[data-weiter]', form);
const zusammen = $('#formular-zusammen');
const offenZeile = $('#formular-offen');
const erfolg = $('[data-erfolg]');
let aktiv = 0;
let versucht = false;
const bearbeitet = {};

/* ---------- Prüfen ---------- */
function wert(name) {
  const el = form.elements[name];
  if (!el) return '';
  if (el instanceof RadioNodeList) return el.value;
  return el.value.trim();
}

function pruefen(name) {
  const v = wert(name);
  switch (name) {
    case 'gebaeude': case 'dach': case 'zeitrahmen': case 'name': case 'ort': return v ? '' : MELDUNGEN[name];
    case 'telefon': return !v ? MELDUNGEN.telefon : telefonOk(v) ? '' : MELDUNGEN.telefonFormat;
    case 'email': return !v || EMAIL.test(v) ? '' : MELDUNGEN.email;
    case 'plz': return !v ? MELDUNGEN.plz : /^\d{4}$/.test(v) ? '' : MELDUNGEN.plzFormat;
    default: return '';
  }
}

function fehlerZeigen(name, text) {
  const ziel = $(`[data-pruefen="${name}"]`, form);
  const ausgabe = document.getElementById(ziel.getAttribute('aria-describedby').split(' ')[0]);
  const hatte = ziel.getAttribute('aria-invalid') === 'true';
  ausgabe.textContent = text;
  ausgabe.hidden = !text;
  ziel.setAttribute('aria-invalid', String(!!text));
  const feld = ziel.closest('.feld');
  if (!text && hatte) { feld.classList.remove('ist-ok'); void feld.offsetWidth; feld.classList.add('ist-ok'); }
}

function vorschlag() {
  const feld = form.elements.email;
  const box = $('#f-email-vorschlag');
  const v = (versucht || bearbeitet.email) && feld.value.trim() ? mailVorschlag(feld.value.trim()) : '';
  box.hidden = !v;
  box.textContent = '';
  if (!v) return;
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'tabelle-knopf';
  b.textContent = v;
  b.addEventListener('click', () => { feld.value = v; fehlerZeigen('email', pruefen('email')); vorschlag(); feld.focus(); });
  box.append('Meinten Sie ', b, '?');
}

const namenIm = (i) => $$('[data-pruefen]', schritte[i]).map((el) => el.dataset.pruefen);

function offenAktualisieren() {
  if (!versucht) { offenZeile.textContent = ''; return; }
  const offen = namenIm(aktiv).filter((n) => pruefen(n));
  offenZeile.textContent = offen.length ? `Noch offen: ${offen.map((n) => LABEL[n]).join(', ')}` : '';
}

function schrittPruefen() {
  const fehler = [];
  for (const n of namenIm(aktiv)) {
    const t = pruefen(n);
    fehlerZeigen(n, t);
    if (t) fehler.push(n);
  }
  zusammen.hidden = fehler.length < 2;
  zusammen.innerHTML = '';
  if (fehler.length >= 2) {
    const p = document.createElement('p');
    p.textContent = `Bitte prüfen Sie ${fehler.length} Angaben:`;
    const ul = document.createElement('ul');
    for (const n of fehler) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#';
      a.textContent = `${LABEL[n]}: ${pruefen(n)}`;
      a.addEventListener('click', (e) => { e.preventDefault(); fokusAuf(n); });
      li.append(a);
      ul.append(li);
    }
    zusammen.append(p, ul);
  }
  return fehler;
}

function fokusAuf(name) {
  const ziel = $(`[data-pruefen="${name}"]`, form);
  const el = ziel.matches('input, textarea, select') ? ziel : ($('input:checked', ziel) || $('input', ziel));
  el.focus();
  ziel.closest('.feld').scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

/* ---------- Schritte ---------- */
function zeigen(i, fokus) {
  aktiv = i;
  schritte.forEach((s, j) => { s.hidden = j !== i; });
  punkte.forEach((p, j) => {
    p.classList.toggle('ist-fertig', j < i);
    if (j === i) p.setAttribute('aria-current', 'step'); else p.removeAttribute('aria-current');
  });
  zurueck.hidden = i === 0;
  weiter.textContent = i === schritte.length - 1 ? 'Anfrage senden (Demo)' : 'Weiter';
  $('[data-schritt-ansage]', form).textContent = `Schritt ${i + 1} von ${schritte.length}: ${schritte[i].querySelector('legend').textContent}`;
  versucht = false;
  zusammen.hidden = true;
  offenAktualisieren();
  if (fokus) {
    const leg = schritte[i].querySelector('legend');
    leg.tabIndex = -1;
    leg.focus({ preventScroll: true });
    form.scrollIntoView({ block: 'start' });
  }
}

/* ---------- Wunschtermine: die nächsten sechs Werktage ---------- */
function termineEinrichten() {
  const box = $('[data-termine]', form);
  const fmt = new Intl.DateTimeFormat('de-CH', { weekday: 'short', day: 'numeric', month: 'short' });
  const lang = new Intl.DateTimeFormat('de-CH', { weekday: 'long', day: 'numeric', month: 'long' });
  const d = new Date();
  d.setDate(d.getDate() + 2);
  let n = 0;
  while (n < 6) {
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      const l = document.createElement('label');
      l.className = 'termin';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'termin';
      input.value = lang.format(d);
      const span = document.createElement('span');
      span.textContent = fmt.format(d).replace(/\.$/, '');
      span.setAttribute('aria-label', lang.format(d));
      l.append(input, span);
      box.append(l);
      n++;
    }
    d.setDate(d.getDate() + 1);
  }
}

/* ---------- Werte aus dem Solarrechner ---------- */
async function uebernahme() {
  const p = new URLSearchParams(location.search);
  if (p.get('von') !== 'rechner') return;
  let werte = null;
  try { werte = JSON.parse(speicher.lesen('firstlicht-rechner', 'session') || 'null'); } catch { werte = null; }
  if (!werte) {
    // Kein Tab-Speicher: aus der Adresse neu rechnen
    const [L, a] = await Promise.all([import('./rechner-logik.js'), annahmenLaden()]);
    const e = L.eingabenPruefen(L.ausParametern(p), a);
    const r = L.berechnen(e, a);
    werte = { kwp: zahl(r.kwp, 1), module: r.module, ertrag: zahl(r.ertrag.wert), autarkie: prozent(r.autarkie),
      ersparnis: r.ersparnis.wert > 0 ? `CHF ${spanne(r.ersparnis.von, r.ersparnis.bis)}` : 'keine', netto: chf(r.netto),
      speicher: e.speicher ? `${e.speicherKwh} kWh` : 'ohne', dach: e.dach === 'flach' ? 'Flachdach' : 'Schrägdach', flaeche: e.flaeche,
      richtung: e.dach === 'flach' ? '' : L.richtungName(e.azimut), waermepumpe: e.waermepumpe, eauto: e.eauto };
  }
  const box = $('[data-uebernahme]');
  const liste = [
    ['Anlage', `${werte.kwp} kWp, ${werte.module} Module`], ['Strom pro Jahr', `rund ${werte.ertrag} kWh`], ['Autarkiegrad', werte.autarkie],
    ['Ersparnis pro Jahr', werte.ersparnis], ['Investition netto', werte.netto], ['Speicher', werte.speicher]
  ];
  $('[data-uebernahme-werte]', box).innerHTML = liste.map(([t]) => `<div><dt>${t}</dt><dd></dd></div>`).join('');
  $$('[data-uebernahme-werte] dd', box).forEach((dd, i) => { dd.textContent = liste[i][1]; });
  box.hidden = false;
  box.dataset.werte = JSON.stringify(liste);
  // Formular vorausfüllen
  const radio = (name, v) => { const el = form.querySelector(`input[name="${name}"][value="${v}"]`); if (el) el.checked = true; };
  radio('dach', werte.dach);
  if (werte.flaeche) form.elements.flaeche.value = String(werte.flaeche);
  if (werte.speicher !== 'ohne') radio('wuensche', 'Batteriespeicher');
  if (werte.eauto) radio('wuensche', 'Wallbox');
  if (werte.waermepumpe) radio('wuensche', 'Wärmepumpe');
  $('[data-uebernahme-weg]', box).addEventListener('click', () => {
    box.hidden = true;
    delete box.dataset.werte;
    form.querySelector('legend').focus();
  });
}

/* ---------- Abschluss ---------- */
function abschliessen() {
  const fd = new FormData(form);
  const zeilen = [
    ['Gebäude', fd.get('gebaeude')], ['Dach', fd.get('dach')], ['Dachfläche', fd.get('flaeche') ? `${fd.get('flaeche')} m²` : ''],
    ['Wünsche', fd.getAll('wuensche').join(', ')], ['Zeitrahmen', fd.get('zeitrahmen')], ['Wunschtermin', fd.get('termin') || ''],
    ['Name', fd.get('name')], ['Telefon', fd.get('telefon')], ['E-Mail', fd.get('email')], ['Ort', `${fd.get('plz')} ${fd.get('ort')}`],
    ['Rückruf', fd.get('rueckruf') || '']
  ].filter(([, v]) => v);
  const box = $('[data-uebernahme]');
  if (!box.hidden && box.dataset.werte) zeilen.push(['Aus dem Rechner', JSON.parse(box.dataset.werte).map(([t, v]) => `${t} ${v}`).join(', ')]);
  const dl = $('[data-erfolg-werte]', erfolg);
  dl.innerHTML = zeilen.map(([t]) => `<div><dt>${t}</dt><dd></dd></div>`).join('');
  $$('dd', dl).forEach((dd, i) => { dd.textContent = zeilen[i][1]; });
  const vorname = String(fd.get('name')).split(' ')[0];
  $('[data-erfolg-titel]', erfolg).textContent = `Danke, ${vorname}.`;
  form.hidden = true;
  box.hidden = true;
  erfolg.hidden = false;
  erfolg.focus();
}

/* ---------- Ereignisse ---------- */
form.setAttribute('novalidate', '');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  versucht = true;
  const fehler = schrittPruefen();
  vorschlag();
  offenAktualisieren();
  if (fehler.length) { fokusAuf(fehler[0]); return; }
  if (aktiv < schritte.length - 1) zeigen(aktiv + 1, true);
  else abschliessen();
});
zurueck.addEventListener('click', () => zeigen(aktiv - 1, true));
form.addEventListener('input', (e) => {
  const n = e.target.name;
  if (n === 'plz') e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
  if (LABEL[n] && (versucht || bearbeitet[n])) fehlerZeigen(n, pruefen(n));
  if (n === 'email') vorschlag();
  offenAktualisieren();
});
form.addEventListener('change', (e) => {
  const n = e.target.name;
  if (e.target.type === 'radio' && LABEL[n]) { bearbeitet[n] = true; fehlerZeigen(n, pruefen(n)); offenAktualisieren(); }
});
form.addEventListener('focusout', (e) => {
  const n = e.target.name;
  if (!LABEL[n] || e.target.type === 'radio') return;
  if (e.target.value.trim()) bearbeitet[n] = true;
  if (bearbeitet[n]) { fehlerZeigen(n, pruefen(n)); if (n === 'email') vorschlag(); }
});
$('[data-neu]', erfolg).addEventListener('click', () => {
  form.reset();
  Object.keys(bearbeitet).forEach((k) => delete bearbeitet[k]);
  $$('[aria-invalid]', form).forEach((el) => el.setAttribute('aria-invalid', 'false'));
  $$('.fehler', form).forEach((el) => { el.hidden = true; });
  erfolg.hidden = true;
  form.hidden = false;
  zeigen(0, true);
});

termineEinrichten();
zeigen(0, false);
uebernahme().catch((e) => console.error('Übernahme:', e));
