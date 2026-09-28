// Prüfung einer Anfrage aus dem Projekt-Check. Ohne Cloudflare-Abhängigkeiten, damit es sich in Node testen lässt.
import { ANFRAGE } from './schema.js';

const FELDER = new Map(ANFRAGE.felder.map(([k, label, abschnitt, max]) => [k, { label, abschnitt, max }]));
export const FELD_REIHENFOLGE = ANFRAGE.felder.map((f) => f[0]);

// Pro IP: 3 Anfragen pro Stunde. Gesamt pro Tag: Standard 40 (Resend Gratis-Plan: 100 E-Mails pro Tag,
// jede Anfrage braucht bis zu zwei).
export const FENSTER = [{ dauer: 60 * 60 * 1000, max: 3 }];

const EMAIL = /^[^\s@<>()[\]\\,;:"]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
export const istEmail = (s) => typeof s === 'string' && s.length <= 200 && EMAIL.test(s);

/** Ohne Zeilenumbrüche und Steuerzeichen (gegen Header-Injection) */
export const einzeilig = (s) => String(s).replace(/[\r\n\t\u0000-\u001f\u007f\u2028\u2029]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

/**
 * Prüft den Körper { art, felder, kopie, token, website, dauerSek, idem }.
 * Gibt { ok: true, daten } oder { ok: false, fehler, grund } zurück. Unbekannte Felder werden verworfen.
 */
export function pruefeAnfrage(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, fehler: 'ungueltig', grund: 'kein Objekt' };
  const art = body.art === 'kurz' ? 'kurz' : body.art === 'voll' ? 'voll' : null;
  if (!art) return { ok: false, fehler: 'ungueltig', grund: 'art' };
  // Honigtopf: Feld, das Menschen nicht sehen
  if (typeof body.website === 'string' && body.website.trim() !== '') return { ok: false, fehler: 'abgewiesen', grund: 'honigtopf' };
  const dauer = Number(body.dauerSek);
  if (!Number.isFinite(dauer) || dauer < ANFRAGE.mindestSek[art]) return { ok: false, fehler: 'abgewiesen', grund: 'zu_schnell' };
  if (typeof body.idem !== 'string' || !/^[A-Za-z0-9-]{16,64}$/.test(body.idem)) return { ok: false, fehler: 'ungueltig', grund: 'idem' };
  if (!body.felder || typeof body.felder !== 'object' || Array.isArray(body.felder)) return { ok: false, fehler: 'ungueltig', grund: 'felder' };

  const felder = {};
  for (const k of FELD_REIHENFOLGE) {
    const v = body.felder[k];
    if (v === undefined || v === null || v === '') continue;
    if (typeof v !== 'string') return { ok: false, fehler: 'ungueltig', grund: 'typ ' + k };
    const wert = v.replace(/\r\n?/g, '\n').trim();
    if (!wert) continue;
    if (wert.length > FELDER.get(k).max) return { ok: false, fehler: 'ungueltig', grund: 'zu lang ' + k };
    felder[k] = wert;
  }
  for (const k of ANFRAGE.pflicht[art]) if (!felder[k]) return { ok: false, fehler: 'ungueltig', grund: 'pflicht ' + k };
  felder.KONTAKT_NAME = einzeilig(felder.KONTAKT_NAME);
  felder.KONTAKT_MAIL = einzeilig(felder.KONTAKT_MAIL);
  if (!istEmail(felder.KONTAKT_MAIL)) return { ok: false, fehler: 'ungueltig', grund: 'email' };
  return { ok: true, daten: { art, felder, kopie: body.kopie === true, idem: body.idem } };
}

/** Kurze, gut lesbare Referenz aus dem Idempotenz-Schlüssel, zum Beispiel ODR-4K7P. Gleicher Schlüssel, gleiche Referenz. */
export async function referenzAus(idem) {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('odera|' + idem)));
  const zeichen = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let r = '';
  for (let i = 0; i < 4; i++) r += zeichen[d[i] % zeichen.length];
  return 'ODR-' + r;
}

/** Ursprünge, die senden dürfen */
export function erlaubterUrsprung(origin, env) {
  if (!origin) return false;
  const liste = String(env.ERLAUBTE_URSPRUENGE || 'https://odera.ch').split(',').map((s) => s.trim()).filter(Boolean);
  if (liste.includes(origin)) return true;
  if (env.ERLAUBE_LOCALHOST === '1' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return false;
}

/** Rate Limit über Zeitstempel. Gibt { erlaubt, stempel, wiederInSek }. */
export function pruefeLimit(stempel, jetzt, fenster = FENSTER) {
  const laengstes = Math.max(...fenster.map((f) => f.dauer));
  const aktuell = (stempel || []).filter((t) => jetzt - t < laengstes);
  for (const f of fenster) {
    const drin = aktuell.filter((t) => jetzt - t < f.dauer);
    if (drin.length >= f.max) return { erlaubt: false, stempel: aktuell, wiederInSek: Math.max(1, Math.ceil((Math.min(...drin) + f.dauer - jetzt) / 1000)) };
  }
  aktuell.push(jetzt);
  return { erlaubt: true, stempel: aktuell, wiederInSek: 0 };
}

export const utcTag = (jetzt = Date.now()) => new Date(jetzt).toISOString().slice(0, 10);
export const feldInfo = (k) => FELDER.get(k);
