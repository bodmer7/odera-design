// Worker odera-stats: Statistik von odera.ch mit Einwilligung (Teil 11).
//   POST /e              Ereignisse von odera.ch (nur nach Einwilligung, CORS nur odera.ch)
//   GET  /api/summary    Zusammenfassung für das Akquise-Tool (Bearer STATS_READ_TOKEN), ?from=YYYY-MM-DD&to=YYYY-MM-DD
//   GET  /api/export     Rohdaten als NDJSON (Bearer STATS_READ_TOKEN), gleiche Parameter
//   Cron                 löscht Rohdaten, die älter als 14 Monate sind
// Keine IP-Adressen, keine Cookies, keine dauerhaften Protokolle.

import { MAX_BYTES, bereinigen } from './ereignisse.js';
import { AUFBEWAHRUNG_MONATE, berechtigt, grenze, zeitraum } from './zugang.js';
import { summary } from './summary.js';

const MINUTE_LIMIT = 60; // Sendungen pro Minute und Gerät (nur im Arbeitsspeicher, ohne IP zu speichern)

const SPALTEN = ['zeit', 'tag', 'sitzung', 'typ', 'seite', 'ziel', 'zahl', 'info', 'geraet', 'land', 'quelle', 'k'];

function json(daten, status = 200, kopf = {}) {
  return new Response(JSON.stringify(daten), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...kopf } });
}

function ursprungErlaubt(request, env) {
  const origin = request.headers.get('Origin') || '';
  const erlaubt = String(env.ERLAUBTE_URSPRUENGE || '').split(',').map((x) => x.trim()).filter(Boolean);
  return erlaubt.includes(origin) ? origin : null;
}

function cors(origin) {
  return origin
    ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' }
    : {};
}

// ---------- Rate-Limit nur im Arbeitsspeicher ----------
// Schlüssel ist ein Hash aus IP und einem zufälligen Wert dieser Worker-Instanz. Er wird nie gespeichert.
let salz = null; // entsteht beim ersten Aufruf (Zufall ist auf oberster Ebene nicht erlaubt)
const zaehler = new Map();

async function zuViele(request) {
  salz ??= crypto.randomUUID();
  const ip = request.headers.get('CF-Connecting-IP') || 'unbekannt';
  const daten = new TextEncoder().encode(salz + ip);
  const schluessel = [...new Uint8Array(await crypto.subtle.digest('SHA-256', daten))].slice(0, 8).join('.');
  const minute = Math.floor(Date.now() / 60000);
  const e = zaehler.get(schluessel);
  if (!e || e.minute !== minute) {
    zaehler.set(schluessel, { minute, n: 1 });
    if (zaehler.size > 5000) zaehler.clear();
    return false;
  }
  e.n++;
  return e.n > MINUTE_LIMIT;
}

async function erfassen(request, env) {
  const origin = ursprungErlaubt(request, env);
  if (!origin) return new Response('Nicht erlaubt', { status: 403 });
  const kopf = cors(origin);
  if (Number(request.headers.get('Content-Length') || 0) > MAX_BYTES) return new Response(null, { status: 413, headers: kopf });
  if (await zuViele(request)) return new Response(null, { status: 429, headers: kopf });
  let text;
  try {
    text = await request.text();
  } catch {
    return new Response(null, { status: 400, headers: kopf });
  }
  if (text.length > MAX_BYTES) return new Response(null, { status: 413, headers: kopf });
  let sendung;
  try {
    sendung = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400, headers: kopf });
  }
  const zeilen = bereinigen(sendung, { land: request.cf?.country ?? null });
  if (!zeilen) return new Response(null, { status: 400, headers: kopf });
  if (!zeilen.length) return new Response(null, { status: 204, headers: kopf });

  // Tageslimit schützt das Gratis-Kontingent von D1.
  const tag = zeilen[0].tag;
  const limit = Number(env.TAGESLIMIT_EREIGNISSE || 20000);
  const stand = await env.DB.prepare('INSERT INTO tageszaehler (tag, anzahl) VALUES (?, ?) ON CONFLICT (tag) DO UPDATE SET anzahl = anzahl + excluded.anzahl RETURNING anzahl')
    .bind(tag, zeilen.length)
    .first();
  if (stand && stand.anzahl > limit) return new Response(null, { status: 429, headers: kopf });

  const sql = `INSERT INTO ereignisse (${SPALTEN.join(', ')}) VALUES (${SPALTEN.map(() => '?').join(', ')})`;
  await env.DB.batch(zeilen.map((z) => env.DB.prepare(sql).bind(...SPALTEN.map((s) => z[s]))));
  return new Response(null, { status: 204, headers: kopf });
}

async function exportieren(env, von, bis) {
  const { results } = await env.DB.prepare(
    'SELECT zeit, tag, sitzung, typ, seite, ziel, zahl, info, geraet, land, quelle, k FROM ereignisse WHERE tag BETWEEN ? AND ? ORDER BY id LIMIT 100000',
  )
    .bind(von, bis)
    .all();
  const text = results.map((z) => JSON.stringify(z)).join('\n') + (results.length ? '\n' : '');
  return new Response(text, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Disposition': `attachment; filename="odera-stats-${von}-${bis}.ndjson"` },
  });
}

async function aufraeumen(env, jetzt = new Date()) {
  const bis = grenze(AUFBEWAHRUNG_MONATE, jetzt);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM ereignisse WHERE tag < ?').bind(bis),
    env.DB.prepare('DELETE FROM tageszaehler WHERE tag < ?').bind(grenze(1, jetzt)),
  ]);
  return bis;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/e') {
        if (request.method === 'OPTIONS') {
          const origin = ursprungErlaubt(request, env);
          return new Response(null, { status: origin ? 204 : 403, headers: cors(origin) });
        }
        if (request.method === 'POST') return await erfassen(request, env);
        return new Response('Nicht erlaubt', { status: 405 });
      }
      if (url.pathname === '/api/summary' || url.pathname === '/api/export') {
        if (request.method !== 'GET') return json({ fehler: 'Nicht erlaubt' }, 405);
        if (!berechtigt(request, env)) return json({ fehler: 'Kein Zugang' }, 401);
        const z = zeitraum(url);
        if (!z) return json({ fehler: 'Zeitraum ungültig (from und to als YYYY-MM-DD, höchstens 400 Tage)' }, 400);
        if (url.pathname === '/api/export') return await exportieren(env, z.von, z.bis);
        return json(await summary(env.DB, z.von, z.bis));
      }
      return json({ fehler: 'Nicht gefunden' }, 404);
    } catch (e) {
      // Nur die Art des Fehlers, keine Inhalte.
      console.error('Fehler:', e instanceof Error ? e.name : 'unbekannt');
      return json({ fehler: 'Interner Fehler' }, 500);
    }
  },

  async scheduled(_event, env) {
    await aufraeumen(env);
  },
};
