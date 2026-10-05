/* Firstlicht: Oberfläche des Solarrechners
   Die Logik steckt in rechner-logik.js (ohne DOM, getestet). Hier: Eingaben lesen,
   Ergebnis zeichnen, Adresse aktualisieren, Kompass, Wizard auf dem Handy, Diagramme. */

import * as L from './rechner-logik.js';
import { annahmenLaden, zahl, chf, prozent, entprellen, toast, speicher } from './hilfen.js';
import { balken, linie } from './diagramme.js';

const wurzel = document.querySelector('[data-rechner]');
const form = wurzel.querySelector('[data-rechner-form]');
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const r = (k) => $$(`[data-r="${k}"]`);
const setzeText = (k, text) => r(k).forEach((el) => { el.textContent = text; });
const MONATE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const MONATE_LANG = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

let A = null;        // Annahmen
let e = null;        // aktuelle Eingaben (geprüft)
let ergebnis = null;

/* ---------- Eingaben ---------- */
function ausFormular() {
  const fd = new FormData(form);
  return {
    region: fd.get('region'), dach: fd.get('dach'), neigung: fd.get('neigung'), flaeche: e ? e.flaeche : 60,
    azimut: e ? e.azimut : 180, verschattung: fd.get('verschattung'), verbrauchArt: fd.get('verbrauchArt'),
    personen: fd.get('personen'), verbrauch: fd.get('verbrauch'), waermepumpe: form.waermepumpe.checked,
    eauto: form.eauto.checked, km: fd.get('km'), strompreis: fd.get('strompreis'), rueckliefer: fd.get('rueckliefer'),
    speicher: form.speicher.checked, speicherKwh: fd.get('speicherKwh'), groesseArt: fd.get('groesseArt'), kwp: fd.get('kwp')
  };
}

function insFormular(x) {
  const radio = (name, wert) => { const el = form.querySelector(`input[name="${name}"][value="${wert}"]`); if (el) el.checked = true; };
  radio('region', x.region); radio('dach', x.dach); radio('verschattung', x.verschattung);
  radio('verbrauchArt', x.verbrauchArt); radio('groesseArt', x.groesseArt);
  form.neigung.value = x.neigung; form.personen.value = x.personen; form.verbrauch.value = zahl(x.verbrauch);
  form.waermepumpe.checked = x.waermepumpe; form.eauto.checked = x.eauto; form.km.value = x.km;
  form.strompreis.value = x.strompreis; form.rueckliefer.value = x.rueckliefer; form.speicher.checked = x.speicher;
  form.speicherKwh.value = x.speicherKwh; form.kwp.value = x.kwp;
  $$('[data-paar="flaeche"]', form).forEach((el) => { el.value = el.type === 'range' ? Math.min(300, x.flaeche) : zahl(x.flaeche); });
  kompassSetzen(x.azimut, false);
}

/* ---------- Sichtbarkeit abhängiger Felder ---------- */
function abhaengig() {
  const flach = e.dach === 'flach';
  $$('[data-nur-schraeg]', form).forEach((el) => { el.hidden = flach; });
  $$('[data-nur-flach]', form).forEach((el) => { el.hidden = !flach; });
  $('[data-nur-personen]', form).hidden = e.verbrauchArt !== 'personen';
  $('[data-nur-kwh]', form).hidden = e.verbrauchArt !== 'kwh';
  $('[data-nur-eauto]', form).hidden = !e.eauto;
  $('[data-nur-speicher]', form).hidden = !e.speicher;
  $('[data-nur-manuell]', form).hidden = e.groesseArt !== 'manuell';
}

/* Anzeigen neben Reglern und gefüllte Spuren */
function reglerAnzeigen() {
  const aus = (k, t) => $$(`[data-aus="${k}"]`, form).forEach((el) => { el.textContent = t; });
  aus('neigung', `${e.neigung}°`);
  aus('personen', String(e.personen));
  aus('personenKwh', `Durchschnitt rund ${zahl(A.verbrauchPersonen.wert[String(e.personen)])} kWh pro Jahr`);
  aus('wpKwh', zahl(A.waermepumpe.wert));
  aus('km', zahl(e.km));
  aus('strompreis', `${zahl(e.strompreis, 1)} Rp./kWh`);
  aus('rueckliefer', `${zahl(e.rueckliefer, 1)} Rp./kWh`);
  aus('speicherKwh', `${zahl(e.speicherKwh)} kWh`);
  aus('kwp', `${zahl(Math.min(e.kwp, ergebnis ? ergebnis.maxKwp : e.kwp), 1)} kWp`);
  const texte = {
    neigung: `${e.neigung} Grad`, personen: `${e.personen} ${e.personen === 1 ? 'Person' : 'Personen'}`, km: `${zahl(e.km)} Kilometer`,
    strompreis: `${zahl(e.strompreis, 1)} Rappen pro Kilowattstunde`, rueckliefer: `${zahl(e.rueckliefer, 1)} Rappen pro Kilowattstunde`,
    speicherKwh: `${e.speicherKwh} Kilowattstunden`, kwp: `${zahl(e.kwp, 1)} Kilowatt-Peak`
  };
  $$('input[type="range"]', form).forEach((el) => {
    el.style.setProperty('--fuellung', `${((el.value - el.min) / (el.max - el.min)) * 100}%`);
    if (texte[el.name]) el.setAttribute('aria-valuetext', texte[el.name]);
  });
  $('#r-flaeche').setAttribute('aria-valuetext', `${zahl(e.flaeche)} Quadratmeter`);
  neigungSkizze(e.neigung);
}

function neigungSkizze(grad) {
  const dach = $('[data-neigung-dach]', form);
  const bogen = $('[data-neigung-bogen]', form);
  if (!dach) return;
  const halb = 58;
  const h = Math.tan((grad * Math.PI) / 180) * halb;
  const hoch = Math.min(h, 50);
  dach.setAttribute('d', `M22 56L80 ${56 - hoch}L138 56`);
  const rad = 24;
  const ex = 22 + rad * Math.cos((grad * Math.PI) / 180);
  const ey = 56 - rad * Math.sin((grad * Math.PI) / 180);
  bogen.setAttribute('d', grad > 0 ? `M${22 + rad} 56A${rad} ${rad} 0 0 0 ${ex.toFixed(1)} ${ey.toFixed(1)}` : '');
}

/* ---------- Kompass ---------- */
const kompass = $('[data-kompass-regler]', form);
const zeiger = $('[data-kompass-zeiger]', form);
const knoepfe = $('[data-kompass-knoepfe]', form);

function kompassSetzen(grad, melden = true) {
  const g = ((Math.round(grad) % 360) + 360) % 360;
  if (e) e.azimut = g;
  zeiger.setAttribute('transform', `rotate(${g} 100 100)`);
  kompass.setAttribute('aria-valuenow', String(g));
  kompass.setAttribute('aria-valuetext', `${L.richtungName(g)}, ${g} Grad`);
  $$('button', knoepfe).forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.grad) === g)));
  if (melden) aenderung();
}

function kompassEinrichten() {
  // Striche alle 15 Grad
  const striche = $('.kompass__striche', kompass);
  let s = '';
  for (let g = 0; g < 360; g += 15) {
    const lang = g % 45 === 0;
    s += `<path d="M100 ${lang ? 14 : 16}V${lang ? 24 : 20}" transform="rotate(${g} 100 100)"${lang ? ' class="lang"' : ''}/>`;
  }
  striche.innerHTML = s;
  // Acht Richtungs-Knöpfe als Alternative zum Ziehen
  for (const [name, grad] of L.RICHTUNGEN) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'kompass__knopf';
    b.dataset.grad = grad;
    b.textContent = name;
    b.setAttribute('aria-pressed', 'false');
    knoepfe.append(b);
  }
  knoepfe.addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (b) kompassSetzen(Number(b.dataset.grad));
  });
  // Ziehen mit Maus, Stift oder Finger
  const winkel = (ev) => {
    const rect = kompass.getBoundingClientRect();
    const dx = ev.clientX - (rect.left + rect.width / 2);
    const dy = ev.clientY - (rect.top + rect.height / 2);
    return Math.round(((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360 / 5) * 5;
  };
  let zieht = false;
  kompass.addEventListener('pointerdown', (ev) => {
    zieht = true;
    kompass.setPointerCapture(ev.pointerId);
    kompass.classList.add('ist-aktiv');
    kompassSetzen(winkel(ev));
    ev.preventDefault();
  });
  kompass.addEventListener('pointermove', (ev) => { if (zieht) kompassSetzen(winkel(ev)); });
  const ende = (ev) => {
    if (!zieht) return;
    zieht = false;
    kompass.classList.remove('ist-aktiv');
    if (kompass.hasPointerCapture(ev.pointerId)) kompass.releasePointerCapture(ev.pointerId);
  };
  kompass.addEventListener('pointerup', ende);
  kompass.addEventListener('pointercancel', ende);
  // Tastatur: 15 Grad, mit Umschalttaste 45 Grad
  kompass.addEventListener('keydown', (ev) => {
    const schritt = ev.shiftKey ? 45 : 15;
    const tasten = { ArrowRight: schritt, ArrowUp: schritt, ArrowLeft: -schritt, ArrowDown: -schritt, PageUp: 45, PageDown: -45 };
    if (ev.key in tasten) { kompassSetzen(e.azimut + tasten[ev.key]); ev.preventDefault(); }
    else if (ev.key === 'Home') { kompassSetzen(0); ev.preventDefault(); }
    else if (ev.key === 'End') { kompassSetzen(315); ev.preventDefault(); }
  });
}

/* ---------- Ergebnis zeichnen ---------- */
const HINWEISE = {
  nord: 'Ihre Dachseite zeigt eher nach Norden. Das kostet viel Ertrag. Oft lohnt sich die andere Dachseite oder ein Flachdach mehr.',
  klein: 'Auf dieser Fläche hat eine Anlage unter 2 kWp Platz. Dafür gibt es keine Einmalvergütung des Bundes.',
  leer: 'Geben Sie die Dachfläche ein, die belegt werden soll.',
  keineErsparnis: 'Mit diesen Angaben deckt die Ersparnis den Unterhalt nicht. Beim Dach-Check schauen wir, was sich besser rechnet.',
  gross: 'Ab 30 kWp gelten andere Vergütungssätze und oft andere Anschlussbedingungen. Wir beraten Sie gerne persönlich.',
  flachSchraeg: 'Bei weniger als 10 Grad Neigung lohnt sich manchmal eine Reinigung der Module. Wir schauen das beim Dach-Check an.'
};

function zeichnen() {
  const x = ergebnis;
  setzeText('stand', new Date(A._stand).toLocaleDateString('de-CH', { day: 'numeric', month: 'long', year: 'numeric' }));
  const ersparnis = x.leer ? 'CHF 0' : x.ersparnis.wert > 0 ? `CHF ${zahl(x.ersparnis.von)} bis ${zahl(x.ersparnis.bis)}` : 'keine';
  setzeText('ersparnis', ersparnis);
  setzeText('ersparnisKurz', ersparnis);
  const amort = x.amortisation ? `${x.amortisation.von} bis ${x.amortisation.bis} Jahre` : 'nicht absehbar';
  setzeText('amortisation', amort);
  setzeText('amortisationKurz', amort);
  setzeText('kwp', `${zahl(x.kwp, 1)} kWp`);
  setzeText('kwpKurz', `${zahl(x.kwp, 1)} kWp`);
  setzeText('module', `${x.module} Module, ${zahl(Math.round(x.belegt))} m²`);
  setzeText('ertrag', `${zahl(x.ertrag.wert)} kWh`);
  setzeText('ertragKurz', `${zahl(x.ertrag.wert)} kWh`);
  setzeText('ertragSpanne', `Spanne ${zahl(x.ertrag.von)} bis ${zahl(x.ertrag.bis)} kWh`);
  setzeText('eigenverbrauch', prozent(x.eigenverbrauchQuote));
  setzeText('autarkie', prozent(x.autarkie));
  setzeText('autarkieKurz', prozent(x.autarkie));
  setzeText('brutto', chf(x.investition.brutto));
  setzeText('bruttoSpanne', `${chf(x.investition.von)} bis ${chf(x.investition.bis)}`);
  setzeText('speicherZeile', x.investition.speicher > 0 ? ', mit Speicher' : '');
  setzeText('eiv', x.eiv > 0 ? `minus ${chf(x.eiv)}` : 'keine');
  setzeText('netto', chf(x.netto));
  setzeText('unterhalt', chf(x.unterhalt));
  setzeText('jahre', String(A.jahre.wert));
  form.kwp.max = String(Math.max(1, Math.floor(x.maxKwp * 2) / 2));
  $('[data-aus="kwpMax"]', form).textContent = `Auf dieser Fläche haben höchstens ${zahl(x.maxKwp, 1)} kWp Platz.`;
  const be = x.verlauf.breakEven;
  setzeText('breakEvenText', x.leer ? '' : be !== null
    ? `In Franken, mit ${A.degradation.wert * 100} Prozent weniger Ertrag pro Jahr. Die Anlage hat sich nach rund ${zahl(Math.round(be))} Jahren bezahlt gemacht.`
    : `In Franken, mit ${A.degradation.wert * 100} Prozent weniger Ertrag pro Jahr. Innerhalb von ${A.jahre.wert} Jahren macht sich die Anlage mit diesen Angaben nicht bezahlt.`);

  const liste = r('hinweise')[0];
  liste.textContent = '';
  for (const h of x.hinweise) {
    const li = document.createElement('li');
    li.className = 'hinweis';
    li.textContent = HINWEISE[h];
    liste.append(li);
  }

  // Vergleich mit und ohne Speicher
  const v = x.vergleich;
  setzeText('vergleichKwh', `${zahl(v.mit.speicherKwh)} kWh Speicher`);
  const zeilen = [
    ['Autarkiegrad', prozent(v.ohne.autarkie), prozent(v.mit.autarkie)],
    ['Eigenverbrauch', prozent(v.ohne.quote), prozent(v.mit.quote)],
    ['Ersparnis', chf(v.ohne.ersparnis), chf(v.mit.ersparnis)],
    ['Investition netto', chf(v.ohne.netto), chf(v.mit.netto)]
  ];
  r('vergleich')[0].innerHTML = zeilen.map(([t, a, b]) => `<tr><th scope="row">${t}</th><td class="zahl">${a}</td><td class="zahl">${b}</td></tr>`).join('');

  // Diagramme
  const mon = $('[data-diagramm="monate"]');
  balken($('[data-diagramm-flaeche]', mon), x.monate.map((w, i) => ({ label: MONATE[i], lang: MONATE_LANG[i], wert: w })), {
    titel: 'Strom pro Monat in kWh', einheit: 'kWh', runden: 10
  });
  tabelle($('[data-diagramm-tabelle]', mon), ['Monat', 'Strom in kWh'], x.monate.map((w, i) => [MONATE_LANG[i], zahl(Math.round(w / 10) * 10)]));
  const ver = $('[data-diagramm="verlauf"]');
  linie($('[data-diagramm-flaeche]', ver), x.verlauf.punkte.map((p) => ({ x: p.jahr, y: p.kumuliert })), {
    titel: 'Kumulierter Ertrag in Franken', breakEven: be, xLabel: (j) => `Jahr ${j}`, yFormat: (y) => chf(L.chfRunden(y))
  });
  tabelle($('[data-diagramm-tabelle]', ver), ['Jahr', 'Kumuliert in CHF'], x.verlauf.punkte.filter((p) => p.jahr % 5 === 0 || p.jahr === 1).map((p) => [String(p.jahr), zahl(L.chfRunden(p.kumuliert))]));

  // Druck: Eingaben zusammenfassen
  $$('[data-druck-datum]').forEach((el) => { el.textContent = new Date().toLocaleDateString('de-CH'); });
}

function tabelle(huelle, kopf, zeilen) {
  huelle.innerHTML = `<table class="tabelle"><thead><tr>${kopf.map((k, i) => `<th scope="col"${i ? ' class="zahl"' : ''}>${k}</th>`).join('')}</tr></thead><tbody>` +
    zeilen.map((z) => `<tr><th scope="row">${z[0]}</th>${z.slice(1).map((w) => `<td class="zahl">${w}</td>`).join('')}</tr>`).join('') + '</tbody></table>';
}

/* Ansage für Screenreader, gedrosselt */
const ansagen = entprellen(() => {
  const x = ergebnis;
  $('[data-rechner-ansage]').textContent = x.leer ? 'Keine Anlage berechnet.'
    : `Anlage ${zahl(x.kwp, 1)} kWp, rund ${zahl(x.ertrag.wert)} kWh pro Jahr, Ersparnis ${zahl(x.ersparnis.von)} bis ${zahl(x.ersparnis.bis)} Franken pro Jahr.`;
}, 1200);

/* ---------- Adresse und Übergabe ---------- */
function adresseAktualisieren() {
  const p = L.zuParametern(e, A);
  const neu = location.pathname + (p.toString() ? `?${p}` : '') + location.hash;
  history.replaceState(null, '', neu);
  const uebergabe = new URLSearchParams(p);
  uebergabe.set('von', 'rechner');
  $('[data-uebernehmen]').href = `kontakt.html?${uebergabe}`;
}

function zusammenfassung() {
  const x = ergebnis;
  return {
    kwp: zahl(x.kwp, 1), module: x.module, ertrag: zahl(x.ertrag.wert), autarkie: prozent(x.autarkie),
    ersparnis: x.ersparnis.wert > 0 ? `CHF ${zahl(x.ersparnis.von)} bis ${zahl(x.ersparnis.bis)}` : 'keine',
    netto: chf(x.netto), speicher: e.speicher ? `${e.speicherKwh} kWh` : 'ohne', dach: e.dach === 'flach' ? 'Flachdach' : 'Schrägdach',
    flaeche: e.flaeche, richtung: e.dach === 'flach' ? '' : L.richtungName(e.azimut), waermepumpe: e.waermepumpe, eauto: e.eauto
  };
}

/* ---------- Ablauf ---------- */
const rechnenEntprellt = entprellen(() => {
  ergebnis = L.berechnen(e, A);
  zeichnen();
  reglerAnzeigen();
  adresseAktualisieren();
  ansagen();
}, 150);

function aenderung() {
  e = L.eingabenPruefen(ausFormular(), A);
  abhaengig();
  reglerAnzeigen();
  rechnenEntprellt();
}

function verbrauchPruefen() {
  const feld = form.verbrauch;
  const fehler = $('#r-verbrauch-fehler');
  const roh = feld.value.trim();
  const n = Number(roh.replace(/['’\s]/g, ''));
  const min = A.verbrauchGrenzen.wert.min;
  const max = A.verbrauchGrenzen.wert.max;
  const text = !roh ? 'Bitte geben Sie Ihren Jahresverbrauch ein.' : !Number.isFinite(n) ? 'Bitte nur Zahlen eingeben, zum Beispiel 4500.'
    : n < min || n > max ? `Bitte einen Wert zwischen ${zahl(min)} und ${zahl(max)} kWh eingeben.` : '';
  fehler.hidden = !text;
  fehler.textContent = text;
  feld.setAttribute('aria-invalid', String(!!text));
}

function ereignisse() {
  form.addEventListener('submit', (ev) => ev.preventDefault());
  form.addEventListener('input', (ev) => {
    const t = ev.target;
    if (t.dataset.paar === 'flaeche') {
      const n = L.begrenzen(t.value, 0, 2000, NaN);
      if (Number.isFinite(n)) {
        e.flaeche = Math.round(n);
        $$('[data-paar="flaeche"]', form).forEach((el) => { if (el !== t) el.value = el.type === 'range' ? Math.min(300, e.flaeche) : zahl(e.flaeche); });
      }
    }
    if (t.name === 'verbrauch') verbrauchPruefen();
    aenderung();
  });
  form.addEventListener('change', (ev) => {
    if (ev.target.dataset.paar === 'flaeche' && ev.target.type === 'text') ev.target.value = zahl(e.flaeche);
    aenderung();
  });

  // Diagramm als Tabelle
  $$('[data-tabelle-schalter]').forEach((b) => b.addEventListener('click', () => {
    const t = $('[data-diagramm-tabelle]', b.closest('.diagramm'));
    const auf = t.hidden;
    t.hidden = !auf;
    b.setAttribute('aria-expanded', String(auf));
    b.textContent = auf ? 'Tabelle ausblenden' : 'Als Tabelle anzeigen';
  }));

  // Link kopieren
  $('[data-link-kopieren]').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(location.href); toast('Link kopiert. Sie können ihn jetzt teilen.'); }
    catch { window.prompt('Diesen Link können Sie kopieren:', location.href); }
  });

  // PDF über die Druckfunktion
  const annahmenBox = $('[data-annahmen-box]');
  let warOffen = false;
  window.addEventListener('beforeprint', () => { warOffen = annahmenBox.open; annahmenBox.open = true; });
  window.addEventListener('afterprint', () => { annahmenBox.open = warOffen; });
  $('[data-drucken]').addEventListener('click', () => window.print());

  // Übergabe an die Anfrage
  $('[data-uebernehmen]').addEventListener('click', () => {
    speicher.schreiben('firstlicht-rechner', JSON.stringify(zusammenfassung()), 'session');
  });

  // Handy: Ergebnisleiste unten
  const schalter = $('[data-blatt-schalter]');
  const blatt = $('#ergebnis-blatt');
  schalter.addEventListener('click', () => {
    const auf = blatt.hidden;
    blatt.hidden = !auf;
    schalter.setAttribute('aria-expanded', String(auf));
  });
  $('[data-blatt-zum-ergebnis]').addEventListener('click', () => {
    blatt.hidden = true;
    schalter.setAttribute('aria-expanded', 'false');
    requestAnimationFrame(() => $('#ergebnis').focus({ preventScroll: true }));
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && !blatt.hidden) { blatt.hidden = true; schalter.setAttribute('aria-expanded', 'false'); schalter.focus(); }
  });
}

/* ---------- Wizard auf dem Handy ---------- */
function wizardEinrichten() {
  const mq = window.matchMedia('(max-width: 63.99em)');
  const schritte = $$('[data-schritt]', form);
  const nav = $('[data-wizard-nav]', form);
  const zurueck = $('[data-wizard-zurueck]', nav);
  const weiter = $('[data-wizard-weiter]', nav);
  const punkte = $$('.fortschritt__schritte li', form);
  const ansage = $('[data-wizard-ansage]', form);
  let aktiv = 0;

  function zeigen(i, fokus) {
    aktiv = Math.max(0, Math.min(schritte.length - 1, i));
    const wiz = mq.matches;
    form.classList.toggle('ist-wizard', wiz);
    nav.hidden = !wiz;
    schritte.forEach((s, j) => { s.hidden = wiz && j !== aktiv; });
    punkte.forEach((p, j) => {
      p.classList.toggle('ist-fertig', wiz ? j < aktiv : true);
      if (wiz && j === aktiv) p.setAttribute('aria-current', 'step'); else p.removeAttribute('aria-current');
    });
    zurueck.disabled = aktiv === 0;
    weiter.textContent = aktiv === schritte.length - 1 ? 'Zum Ergebnis' : 'Weiter';
    if (wiz) ansage.textContent = `Schritt ${aktiv + 1} von ${schritte.length}: ${schritte[aktiv].querySelector('legend').textContent.replace(/^\d/, '')}`;
    if (fokus) {
      const legende = schritte[aktiv].querySelector('legend');
      legende.setAttribute('tabindex', '-1');
      legende.focus({ preventScroll: true });
      form.scrollIntoView({ block: 'start' });
    }
  }
  zurueck.addEventListener('click', () => zeigen(aktiv - 1, true));
  weiter.addEventListener('click', () => {
    if (aktiv === schritte.length - 1) { $('#ergebnis').focus({ preventScroll: true }); $('#ergebnis').scrollIntoView({ block: 'start' }); return; }
    zeigen(aktiv + 1, true);
  });
  mq.addEventListener('change', () => zeigen(aktiv, false));
  zeigen(0, false);
}

/* ---------- So rechnen wir ---------- */
const BESCHRIFTUNG = {
  strompreis: 'Strompreis, Startwert', rueckliefertarif: 'Rückliefertarif, Startwert', minimalverguetung: 'Minimalvergütung bis 30 kW',
  einmalverguetung: 'Einmalvergütung des Bundes', einmalverguetungMinKwp: 'Einmalvergütung ab', einmalverguetungMaxAnteil: 'Einmalvergütung höchstens',
  anlagekosten: 'Anlagekosten pro kWp', kostenSpanne: 'Spanne der Kosten', speicherkosten: 'Speicherkosten', speicherGroesse: 'Speichergrösse, Startwert',
  ertragRegion: 'Ertrag pro kWp und Jahr', ertragSpanne: 'Spanne des Ertrags', ausrichtung: 'Faktor für Ausrichtung und Neigung',
  flachdach: 'Flachdach', verschattung: 'Verlust durch Verschattung', belegung: 'Belegbarer Anteil der Dachfläche', flaecheProKwp: 'Fläche pro kWp',
  modul: 'Modul', unterhalt: 'Unterhalt', degradation: 'Leistungsverlust der Module', jahre: 'Betrachtungsdauer',
  verbrauchPersonen: 'Verbrauch nach Personen', waermepumpe: 'Wärmepumpe', eauto: 'Elektroauto', eigenverbrauch: 'Eigenverbrauch', monatsverteilung: 'Verteilung über das Jahr'
};

function wertText(k, a) {
  const w = a.wert;
  switch (k) {
    case 'einmalverguetung': return `${w.bis30} CHF/kWp bis 30 kWp, ${w.bis100} bis 100 kWp, ${w.ab100} darüber`;
    case 'einmalverguetungMaxAnteil': case 'kostenSpanne': case 'ertragSpanne': case 'belegung':
      return `${k.includes('Spanne') ? 'plus/minus ' : ''}${zahl(w * 100)} %`;
    case 'anlagekosten': return w.map(([x, y]) => `${x} kWp: ${zahl(y)}`).join(', ') + ' CHF/kWp';
    case 'speicherkosten': return `CHF ${zahl(w.fix)} plus ${zahl(w.proKwh)} pro kWh`;
    case 'ertragRegion': return `Mittelland ${zahl(w.mittelland)}, Jura und Voralpen ${zahl(w.jura)}, Wallis und Tessin ${zahl(w.wallis)}, Alpen ${zahl(w.alpen)} kWh`;
    case 'ausrichtung': return 'Tabelle nach Neigung und Himmelsrichtung, Süd mit 30 Grad gleich 100 %';
    case 'flachdach': return `Faktor ${zahl(w.faktor * 100)} %, belegbar ${zahl(w.belegung * 100)} %`;
    case 'verschattung': return `leicht ${zahl(w.leicht * 100)} %, mittel ${zahl(w.mittel * 100)} %`;
    case 'modul': return `${zahl(w.kwp * 1000)} Wp, ${zahl(w.flaeche, 2)} m²`;
    case 'unterhalt': return `CHF ${zahl(w.fix)} plus ${zahl(w.proKwp)} pro kWp und Jahr`;
    case 'degradation': return `${zahl(w * 100, 1)} % pro Jahr`;
    case 'verbrauchPersonen': return Object.entries(w).map(([p, v]) => `${p}: ${zahl(v)}`).join(', ') + ' kWh';
    case 'eauto': return `${w.kwhPro100km} kWh pro 100 km`;
    case 'eigenverbrauch': return 'Faustregel, siehe Text oben';
    case 'monatsverteilung': return 'Monatsanteile in Prozent, Flachland und Alpen';
    default: return typeof w === 'number' ? `${zahl(w, Number.isInteger(w) ? 0 : 1)} ${a.einheit.split(',')[0]}` : '';
  }
}

function annahmenZeigen() {
  const tb = $('[data-annahmen]');
  const zeilen = Object.keys(BESCHRIFTUNG).filter((k) => A[k]).map((k) => {
    const a = A[k];
    const status = a.status === 'verifiziert' ? '<span class="badge badge--ok">verifiziert</span>' : '<span class="badge">nicht verifiziert</span>';
    let host = '';
    try { host = new URL(a.quelle).hostname.replace(/^www\./, ''); } catch { host = 'Quelle'; }
    return `<tr><th scope="row">${BESCHRIFTUNG[k]}</th><td>${wertText(k, a)}<br><span class="feld__hilfe"></span></td><td>${status}</td><td><a href="${a.quelle}" target="_blank" rel="noopener">${host}</a>, abgerufen ${new Date(a.abgerufen).toLocaleDateString('de-CH')}</td></tr>`;
  });
  tb.innerHTML = zeilen.join('');
  // Hinweise als Text einsetzen (keine HTML-Auswertung)
  $$('tr', tb).forEach((tr, i) => { $('.feld__hilfe', tr).textContent = A[Object.keys(BESCHRIFTUNG).filter((k) => A[k])[i]].hinweis; });
}

/* ---------- Start ---------- */
async function starten() {
  try {
    A = await annahmenLaden();
  } catch (err) {
    console.error(err);
    $('[data-rechner-fehler]', wurzel).hidden = false;
    form.hidden = true;
    $$('.rechner__ergebnis, .rechner__details, .ergebnis-leiste').forEach((el) => { el.hidden = true; });
    return;
  }
  kompassEinrichten();
  e = L.eingabenPruefen(L.ausParametern(location.search), A);
  insFormular(e);
  abhaengig();
  ergebnis = L.berechnen(e, A);
  zeichnen();
  reglerAnzeigen();
  annahmenZeigen();
  ereignisse();
  wizardEinrichten();
  wurzel.classList.add('ist-bereit');
}

starten();
