// Proxy für den Chat-Assistenten auf odera.ch (Cloudflare Worker, Gratis-Plan).
//
// Der Browser schickt POST { message, history }. Der Worker prüft Herkunft, Grösse und Rate Limit,
// fragt das Sprachmodell über Workers AI (Binding AI, ohne API-Schlüssel) und gibt die Antwort
// im Format Server-Sent Events zurück:
//   event: text    data: {"t":"…"}              Antwort
//   event: ende    data: {"abgeschnitten":false} Antwort vollständig
//   event: fehler  data: {"art":"…"}            ausgelastet | ueberlastet | nicht_erreichbar
// Vor der Antwort: 400 (ungültig), 403 (Herkunft), 413 (zu gross), 429 (Limit) als JSON.
//
// Kosten: keine. Workers AI hat im Gratis-Plan 10'000 Neurons pro Tag, danach schlagen Anfragen fehl
// (Fehler 3036), es wird nichts verrechnet. Der Tageszähler unten hält die Nachrichten darunter.
// Chat-Inhalte werden nicht gespeichert und nicht protokolliert.

import { systemPrompt, MAX_TOKENS } from './prompt.js';
import { GRENZEN, FENSTER, pruefeAnfrage, pruefeLimit, utcTag, erlaubterUrsprung, fehlerArt, antwortText } from './regeln.js';

const TAG = 24 * 60 * 60 * 1000;
const MODELL_STANDARD = '@cf/mistralai/mistral-small-3.1-24b-instruct';

function corsKoepfe(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function json(daten, status, origin) {
  return new Response(JSON.stringify(daten), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...(origin ? corsKoepfe(origin) : {}) },
  });
}

function protokoll(ereignis, daten = {}) {
  // Nie Inhalte oder IP-Adressen hineinschreiben.
  console.log(JSON.stringify({ ereignis, ...daten }));
}

async function hash(text) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function zaehler(env, name) {
  return env.LIMITER.get(env.LIMITER.idFromName(name), { locationHint: 'weur' });
}
async function aufruf(stub, pfad, daten) {
  const r = await stub.fetch('https://limiter' + pfad, { method: 'POST', body: JSON.stringify(daten || {}) });
  return r.json();
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    const erlaubt = erlaubterUrsprung(origin, env);

    if (request.method === 'OPTIONS') {
      return erlaubt ? new Response(null, { status: 204, headers: corsKoepfe(origin) }) : new Response(null, { status: 403 });
    }
    if (request.method !== 'POST') return json({ fehler: 'methode' }, 405, erlaubt ? origin : null);
    if (!erlaubt) return json({ fehler: 'herkunft' }, 403, null);

    const laenge = Number(request.headers.get('Content-Length') || 0);
    if (laenge > GRENZEN.anfrageBytes) return json({ fehler: 'zu_gross' }, 413, origin);
    const roh = await request.text();
    if (roh.length > GRENZEN.anfrageBytes) return json({ fehler: 'zu_gross' }, 413, origin);

    let body;
    try { body = JSON.parse(roh); } catch { return json({ fehler: 'ungueltig', text: 'Ungültige Anfrage.' }, 400, origin); }
    const p = pruefeAnfrage(body);
    if (!p.ok) return json({ fehler: 'ungueltig', text: p.fehler }, 400, origin);

    // Rate Limit. Der Tageszähler (UTC-Tag, wie das Kontingent) liefert auch ein zufälliges Salz,
    // das nur für diesen Tag gilt. Damit wird die IP gehasht. Kein Geheimnis im Code, und Hashes
    // verschiedener Tage lassen sich nicht verbinden.
    const tag = utcTag();
    const tagesMax = Number(env.TAGESLIMIT_GESAMT || 35);
    try {
      const tageszaehler = zaehler(env, 'tag:' + tag);
      const stand = await aufruf(tageszaehler, '/stand', { max: tagesMax });
      if (stand.anzahl >= tagesMax) {
        protokoll('limit', { art: 'tag' });
        return json({ fehler: 'ausgelastet' }, 429, origin);
      }
      const ip = request.headers.get('CF-Connecting-IP') || 'unbekannt';
      // Nur für Testläufe über Variablen anhebbar (wrangler deploy --var IP_PRO_10MIN:… --var IP_PRO_TAG:…)
      const fenster = [{ ...FENSTER[0], max: Number(env.IP_PRO_10MIN || FENSTER[0].max) }, { ...FENSTER[1], max: Number(env.IP_PRO_TAG || FENSTER[1].max) }];
      const r = await aufruf(zaehler(env, 'ip:' + tag + ':' + (await hash(stand.salz + '|' + ip))), '/pruefe', { fenster });
      if (!r.erlaubt) {
        protokoll('limit', { art: 'ip' });
        return json({ fehler: 'limit', wiederInSek: r.wiederInSek }, 429, origin);
      }
      const z = await aufruf(tageszaehler, '/zaehle', { max: tagesMax });
      if (!z.erlaubt) {
        protokoll('limit', { art: 'tag' });
        return json({ fehler: 'ausgelastet' }, 429, origin);
      }
    } catch {
      protokoll('fehler', { art: 'limiter' });
      return json({ fehler: 'nicht_erreichbar' }, 503, origin);
    }

    // Sprachmodell. Ohne Streaming: eine Antwort, die als ein Ereignis weitergegeben wird.
    const suchtext = [p.message, ...p.history.filter((h) => h.role === 'user').slice(-2).map((h) => h.content)].join(' ');
    const modell = env.MODELL || MODELL_STANDARD;
    const eingabe = {
      messages: [{ role: 'system', content: systemPrompt(suchtext) }, ...p.history, { role: 'user', content: p.message }],
      max_tokens: MAX_TOKENS,
    };
    if (/gpt-oss/.test(modell)) eingabe.reasoning = { effort: 'low' };

    const koepfe = { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...corsKoepfe(origin) };
    const sse = (ereignis, daten) => `event: ${ereignis}\ndata: ${JSON.stringify(daten)}\n\n`;
    try {
      const antwort = await env.AI.run(modell, eingabe);
      const text = antwortText(antwort).trim();
      if (!text) throw new Error('leere Antwort');
      const u = antwort.usage || {};
      protokoll('antwort', { modell, ein: u.prompt_tokens, aus: u.completion_tokens });
      const abgeschnitten = (antwort.choices && antwort.choices[0] && antwort.choices[0].finish_reason === 'length') || u.completion_tokens >= MAX_TOKENS;
      return new Response(sse('text', { t: text }) + sse('ende', { abgeschnitten: !!abgeschnitten }), { headers: koepfe });
    } catch (err) {
      const art = fehlerArt(err);
      protokoll('fehler', { art });
      return new Response(sse('fehler', { art }), { headers: koepfe });
    }
  },
};

// Zähler als SQLite Durable Object (im Gratis-Plan enthalten).
//   tag:<UTC-Datum>        Nachrichten aller Besucher an diesem Tag und das Tagessalz
//   ip:<Datum>:<Hash>      Zeitstempel der Nachrichten einer IP
// Gespeichert sind nur Zahlen, Zeitstempel und das Salz. 24 Stunden nach der letzten Nachricht wird alles gelöscht.
export class Limiter {
  constructor(state) { this.state = state; }

  async fetch(request) {
    const pfad = new URL(request.url).pathname;
    const daten = await request.json();
    const jetzt = Date.now();
    await this.state.storage.setAlarm(jetzt + TAG);

    if (pfad === '/stand' || pfad === '/zaehle') {
      let salz = await this.state.storage.get('salz');
      if (!salz) {
        salz = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
        await this.state.storage.put('salz', salz);
      }
      let anzahl = (await this.state.storage.get('anzahl')) || 0;
      if (pfad === '/zaehle') {
        if (anzahl >= daten.max) return Response.json({ erlaubt: false, anzahl });
        anzahl += 1;
        await this.state.storage.put('anzahl', anzahl);
        return Response.json({ erlaubt: true, anzahl });
      }
      return Response.json({ anzahl, salz });
    }

    const r = pruefeLimit(await this.state.storage.get('stempel'), jetzt, daten.fenster);
    await this.state.storage.put('stempel', r.stempel);
    return Response.json({ erlaubt: r.erlaubt, wiederInSek: r.wiederInSek });
  }

  async alarm() {
    await this.state.storage.deleteAll();
  }
}
