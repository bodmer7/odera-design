// Prüfung und Bereinigung der Ereignisse, die odera.ch nach Einwilligung sendet.
// Gespeichert wird nur, was die Zusammenfassung braucht: keine IP-Adresse, keine Eingaben, keine Personendaten.

export const TYPEN = new Set([
  'consent_yes', 'page_view', 'section_view', 'scroll', 'engaged', 'cta_click', 'pricing_click',
  'projektcheck_start', 'projektcheck_step', 'projektcheck_submit', 'generator_use', 'generator_cta',
  'chat_open', 'chat_send', 'chat_preset', 'faq_open', 'muster_open', 'outbound_click', 'web_vitals', 'js_error',
]);

export const GERAETE = new Set(['mobil', 'tablet', 'desktop']);
export const MAX_EREIGNISSE = 40;
export const MAX_BYTES = 12000;

const ID = /^[A-Za-z0-9_-]{16,40}$/;
const KAMPAGNE = /^(ak-\d{4}-w\d{2}|li-\d{4}-w\d{2}-(mo|mi|fr)|gbp)$/;

/** Nur Buchstaben, Ziffern und wenige Zeichen, gekürzt. */
function kurz(wert, max = 60) {
  if (typeof wert !== 'string') return null;
  const t = wert.normalize('NFC').replace(/[^\p{L}\p{N} ._:/()'«»,-]/gu, '').trim().slice(0, max);
  return t || null;
}

/** Nur der Pfad einer Seite von odera.ch, ohne Abfrage und Sprungmarke. */
export function pfad(wert) {
  if (typeof wert !== 'string' || !wert.startsWith('/')) return null;
  const p = wert.split(/[?#]/)[0].replace(/\/{2,}/g, '/').slice(0, 100);
  return /^\/[A-Za-z0-9/_.-]*$/.test(p) ? p : null;
}

/** Herkunft nur als Hostname, ohne Pfad. Leer heisst direkt. */
export function quelle(wert) {
  if (wert === '' || wert === null || wert === undefined) return '(direkt)';
  if (typeof wert !== 'string') return null;
  const h = wert.toLowerCase().replace(/^www\./, '').slice(0, 80);
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(h) ? h : null;
}

export function kampagne(wert) {
  return typeof wert === 'string' && KAMPAGNE.test(wert) ? wert : null;
}

function zahl(wert, min, max) {
  const n = Number(wert);
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n * 1000) / 1000 : null;
}

/** Datum YYYY-MM-DD in der Zeitzone Europe/Zurich. */
export function zuercherTag(zeit = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit' }).format(zeit);
}

/**
 * Prüft eine Sendung { s, g, r, k, e: [{ t, p, z, n, i }] } und gibt die Zeilen für die Datenbank zurück.
 * Ungültige Ereignisse werden still verworfen, eine ungültige Sendung ergibt null.
 */
export function bereinigen(sendung, { land = null, jetzt = new Date() } = {}) {
  if (!sendung || typeof sendung !== 'object' || !ID.test(String(sendung.s || ''))) return null;
  if (!Array.isArray(sendung.e) || !sendung.e.length) return null;
  const geraet = GERAETE.has(sendung.g) ? sendung.g : null;
  const k = kampagne(sendung.k);
  const zeit = jetzt.toISOString();
  const tag = zuercherTag(jetzt);
  const laenderCode = typeof land === 'string' && /^[A-Z]{2}$/.test(land) ? land : null;
  const zeilen = [];
  for (const e of sendung.e.slice(0, MAX_EREIGNISSE)) {
    if (!e || !TYPEN.has(e.t)) continue;
    const seite = pfad(e.p);
    if (!seite) continue;
    const zeile = { zeit, tag, sitzung: sendung.s, typ: e.t, seite, ziel: null, zahl: null, info: null, geraet, land: laenderCode, quelle: null, k };
    switch (e.t) {
      case 'page_view':
        // Herkunft nur beim ersten Seitenaufruf einer Sitzung
        if (e.erster) zeile.quelle = quelle(e.r ?? sendung.r ?? '') ?? '(unbekannt)';
        break;
      case 'scroll':
        zeile.zahl = [25, 50, 75, 100].includes(Number(e.n)) ? Number(e.n) : null;
        if (zeile.zahl === null) continue;
        break;
      case 'engaged':
        zeile.zahl = zahl(e.n, 0, 1800);
        if (zeile.zahl === null) continue;
        break;
      case 'projektcheck_step':
        zeile.zahl = zahl(e.n, 1, 40);
        if (zeile.zahl === null) continue;
        break;
      case 'projektcheck_submit':
        zeile.ziel = e.z === 'ok' ? 'ok' : 'fehler';
        break;
      case 'web_vitals':
        if (!['lcp', 'cls', 'inp'].includes(e.z)) continue;
        zeile.ziel = e.z;
        zeile.zahl = zahl(e.n, 0, e.z === 'cls' ? 10 : 60000);
        if (zeile.zahl === null) continue;
        break;
      case 'js_error':
        zeile.ziel = kurz(e.z, 160);
        zeile.info = kurz(e.i, 120);
        if (!zeile.ziel) continue;
        break;
      case 'consent_yes':
      case 'projektcheck_start':
      case 'chat_open':
      case 'chat_send':
        break;
      default:
        // section_view, cta_click, pricing_click, generator_use, generator_cta, chat_preset, faq_open, muster_open, outbound_click
        zeile.ziel = kurz(e.z);
        if (!zeile.ziel) continue;
    }
    zeilen.push(zeile);
  }
  return zeilen;
}
