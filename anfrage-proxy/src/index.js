// Worker für den Projekt-Check auf odera.ch: nimmt eine Anfrage entgegen und stellt sie per E-Mail zu (Resend).
//
// POST / mit { art, felder, kopie, token, website, dauerSek, idem }
//   200 { ok: true, referenz, kopie }         zugestellt (kopie: ob die Kopie verschickt wurde)
//   400 { ok: false, fehler: 'ungueltig' | 'abgewiesen' | 'pruefung' }
//   403 fremde Herkunft, 413 zu gross, 429 { fehler: 'limit' }, 503 { fehler: 'versand' }
//
// Nichts wird gespeichert ausser Zählern für das Rate Limit. Keine Inhalte im Protokoll.
// Secrets: RESEND_API_KEY (nur Senden, nur Domain odera.ch), TURNSTILE_SECRET.

import { ANFRAGE } from './schema.js';
import { pruefeAnfrage, referenzAus, erlaubterUrsprung, pruefeLimit, utcTag, FENSTER } from './regeln.js';
import { mailAnNico, mailKopie } from './mail.js';

const TAG = 24 * 60 * 60 * 1000;
const ABSENDER = 'ODERA Design <anfrage@odera.ch>';
const EMPFAENGER = 'kontakt@odera.ch';

const cors = (origin) => ({ 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', 'Vary': 'Origin' });
const json = (daten, status, origin) => new Response(JSON.stringify(daten), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...(origin ? cors(origin) : {}) } });
const protokoll = (ereignis, daten = {}) => console.log(JSON.stringify({ ereignis, ...daten })); // nie Inhalte, nie IP

async function hash(text) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function zaehler(env, name) { return env.LIMITER.get(env.LIMITER.idFromName(name), { locationHint: 'weur' }); }
async function aufruf(stub, pfad, daten) { return (await stub.fetch('https://limiter' + pfad, { method: 'POST', body: JSON.stringify(daten || {}) })).json(); }

async function turnstile(env, token, ip) {
  if (typeof token !== 'string' || !token || token.length > 2048) return false;
  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);
  const r = await (env.FETCH || fetch)('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  const d = await r.json();
  if (!d.success) return false;
  const hosts = String(env.TURNSTILE_HOSTS || 'odera.ch').split(',').map((s) => s.trim());
  return !d.hostname || hosts.includes(d.hostname) || env.ERLAUBE_LOCALHOST === '1';
}

async function senden(env, mail, idem) {
  // RESEND_BASIS nur für lokale Tests (nachgebaute API)
  const r = await (env.FETCH || fetch)((env.RESEND_BASIS || 'https://api.resend.com') + '/emails', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json', 'Idempotency-Key': idem },
    body: JSON.stringify(mail),
  });
  if (r.ok) return { ok: true };
  const d = await r.json().catch(() => ({}));
  const text = String(d.message || d.name || '');
  // Gleicher Idempotenz-Schlüssel schon verwendet: Die Mail ging beim ersten Versuch raus.
  if (r.status === 409 && /idempoten/i.test(text + ' ' + (d.name || ''))) return { ok: true, wiederholt: true };
  return { ok: false, status: r.status, art: /not verified|verify your domain/i.test(text) ? 'domain_unverifiziert' : 'resend_' + r.status };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const erlaubt = erlaubterUrsprung(origin, env);
    if (request.method === 'OPTIONS') return erlaubt ? new Response(null, { status: 204, headers: cors(origin) }) : new Response(null, { status: 403 });
    if (request.method !== 'POST') return json({ ok: false, fehler: 'methode' }, 405, erlaubt ? origin : null);
    if (!erlaubt) return json({ ok: false, fehler: 'herkunft' }, 403, null);

    const max = ANFRAGE.gesamtMax;
    if (Number(request.headers.get('Content-Length') || 0) > max) return json({ ok: false, fehler: 'zu_gross' }, 413, origin);
    const roh = await request.text();
    if (new TextEncoder().encode(roh).length > max) return json({ ok: false, fehler: 'zu_gross' }, 413, origin);
    let body;
    try { body = JSON.parse(roh); } catch { return json({ ok: false, fehler: 'ungueltig' }, 400, origin); }

    const p = pruefeAnfrage(body);
    if (!p.ok) { protokoll('abgewiesen', { grund: p.grund.split(' ')[0] }); return json({ ok: false, fehler: p.fehler, ...(p.feld ? { feld: p.feld, meldung: p.meldung } : {}) }, 400, origin); }
    if (!env.RESEND_API_KEY || !env.TURNSTILE_SECRET) { protokoll('fehler', { art: 'konfiguration' }); return json({ ok: false, fehler: 'versand' }, 503, origin); }

    const ip = request.headers.get('CF-Connecting-IP') || '';
    try {
      if (!(await turnstile(env, body.token, ip))) { protokoll('abgewiesen', { grund: 'turnstile' }); return json({ ok: false, fehler: 'pruefung' }, 400, origin); }
    } catch { protokoll('fehler', { art: 'turnstile' }); return json({ ok: false, fehler: 'versand' }, 503, origin); }

    // Rate Limit pro IP (gehasht mit täglich wechselndem Salz) und gesamt pro Tag
    const tag = utcTag();
    const tagesMax = Number(env.TAGESLIMIT_GESAMT || 40);
    try {
      const tz = zaehler(env, 'tag:' + tag);
      const stand = await aufruf(tz, '/stand', {});
      if (stand.anzahl >= tagesMax) { protokoll('limit', { art: 'tag' }); return json({ ok: false, fehler: 'limit' }, 429, origin); }
      const fenster = [{ ...FENSTER[0], max: Number(env.IP_PRO_STUNDE || FENSTER[0].max) }];
      const r = await aufruf(zaehler(env, 'ip:' + tag + ':' + (await hash(stand.salz + '|' + ip))), '/pruefe', { fenster });
      if (!r.erlaubt) { protokoll('limit', { art: 'ip' }); return json({ ok: false, fehler: 'limit', wiederInSek: r.wiederInSek }, 429, origin); }
      await aufruf(tz, '/zaehle', { max: tagesMax });
    } catch { protokoll('fehler', { art: 'limiter' }); return json({ ok: false, fehler: 'versand' }, 503, origin); }

    const referenz = await referenzAus(p.daten.idem);
    const an = mailAnNico(p.daten, referenz);
    const erst = await senden(env, { from: ABSENDER, to: [EMPFAENGER], reply_to: p.daten.felder.KONTAKT_MAIL, subject: an.betreff, html: an.html, text: an.text }, 'anfrage-' + p.daten.idem);
    if (!erst.ok) { protokoll('fehler', { art: erst.art }); return json({ ok: false, fehler: 'versand' }, 503, origin); }

    // Kopie nur, wenn gewünscht und der Versand an Nico geklappt hat (dann ist die Domain verifiziert)
    let kopie = false;
    if (p.daten.kopie) {
      const k = mailKopie(p.daten, referenz);
      const zweit = await senden(env, { from: ABSENDER, to: [p.daten.felder.KONTAKT_MAIL], reply_to: EMPFAENGER, subject: k.betreff, html: k.html, text: k.text }, 'kopie-' + p.daten.idem);
      kopie = zweit.ok;
      if (!zweit.ok) protokoll('fehler', { art: 'kopie_' + zweit.art });
    }
    protokoll('gesendet', { art: p.daten.art, kopie });
    return json({ ok: true, referenz, kopie }, 200, origin);
  },
};

// Zähler als SQLite Durable Object (im Gratis-Plan enthalten), wie im Worker odera-chat.
export class Limiter {
  constructor(state) { this.state = state; }
  async fetch(request) {
    const pfad = new URL(request.url).pathname;
    const daten = await request.json();
    const jetzt = Date.now();
    await this.state.storage.setAlarm(jetzt + TAG);
    if (pfad === '/stand' || pfad === '/zaehle') {
      let salz = await this.state.storage.get('salz');
      if (!salz) { salz = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join(''); await this.state.storage.put('salz', salz); }
      let anzahl = (await this.state.storage.get('anzahl')) || 0;
      if (pfad === '/zaehle') { anzahl += 1; await this.state.storage.put('anzahl', anzahl); }
      return Response.json({ anzahl, salz });
    }
    const r = pruefeLimit(await this.state.storage.get('stempel'), jetzt, daten.fenster);
    await this.state.storage.put('stempel', r.stempel);
    return Response.json({ erlaubt: r.erlaubt, wiederInSek: r.wiederInSek });
  }
  async alarm() { await this.state.storage.deleteAll(); }
}
