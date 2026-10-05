/* Firstlicht: kleine gemeinsame Hilfen */

export const zahl = (wert, stellen = 0) =>
  new Intl.NumberFormat('de-CH', { minimumFractionDigits: stellen, maximumFractionDigits: stellen }).format(wert);
export const chf = (wert) => 'CHF ' + zahl(wert);
// Spanne «von bis bis», bei gleichen Grenzen nur ein Wert
export const spanne = (von, bis) => (von === bis ? zahl(von) : `${zahl(von)} bis ${zahl(bis)}`);
export const prozent = (anteil) => zahl(Math.round(anteil * 100)) + ' %';

export const bewegungAus = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function entprellen(fn, ms = 150) {
  let t = 0;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/* Kurze Bestätigung unten am Bildschirm, wird auch vorgelesen */
let toastEl = null;
let toastTimer = 0;
export function toast(text) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    toastEl.setAttribute('role', 'status');
    document.body.append(toastEl);
  }
  toastEl.textContent = text;
  requestAnimationFrame(() => toastEl.classList.add('ist-sichtbar'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('ist-sichtbar'), 2600);
}

/* Speicher im Browser: darf fehlen oder gesperrt sein */
export const speicher = {
  lesen(schluessel, art = 'local') {
    try { return (art === 'session' ? sessionStorage : localStorage).getItem(schluessel); } catch { return null; }
  },
  schreiben(schluessel, wert, art = 'local') {
    try { (art === 'session' ? sessionStorage : localStorage).setItem(schluessel, wert); return true; } catch { return false; }
  }
};

/* Annahmen des Rechners einmal laden */
let annahmenPromise = null;
export function annahmenLaden() {
  if (!annahmenPromise) {
    annahmenPromise = fetch(new URL('../../daten/annahmen.json', import.meta.url))
      .then((r) => { if (!r.ok) throw new Error('Annahmen nicht geladen: ' + r.status); return r.json(); })
      .catch((e) => { annahmenPromise = null; throw e; });
  }
  return annahmenPromise;
}
