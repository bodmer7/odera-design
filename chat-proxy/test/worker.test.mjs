// Tests des ganzen Workers ohne Netz und ohne Cloudflare-Konto: npm test
// Workers AI und die Durable Objects werden im Speicher nachgebaut.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { Limiter } from '../src/index.js';

function umgebung({ ai, tagesMax = '40' } = {}) {
  const objekte = new Map();
  const aufrufe = [];
  const env = {
    ERLAUBTE_URSPRUENGE: 'https://odera.ch,https://www.odera.ch',
    TAGESLIMIT_GESAMT: tagesMax,
    MODELL: '@cf/test/modell',
    AI: { run: async (modell, eingabe) => { aufrufe.push({ modell, eingabe }); return ai ? ai(modell, eingabe) : { response: 'Das Paket **Standard** kostet CHF 1\'900.', usage: { prompt_tokens: 4000, completion_tokens: 20 } }; } },
    LIMITER: {
      idFromName: (n) => n,
      get: (id) => {
        if (!objekte.has(id)) {
          const daten = new Map();
          const storage = { get: async (k) => daten.get(k), put: async (k, v) => { daten.set(k, v); }, setAlarm: async () => {}, deleteAll: async () => daten.clear() };
          objekte.set(id, new Limiter({ storage }));
        }
        const o = objekte.get(id);
        return { fetch: (url, init) => o.fetch(new Request(url, init)) };
      },
    },
  };
  return { env, aufrufe, objekte };
}
const ctx = { waitUntil() {} };
const post = (env, body, { origin = 'https://odera.ch', ip = '203.0.113.7' } = {}) => worker.fetch(new Request('https://w/', {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}), 'CF-Connecting-IP': ip },
  body: typeof body === 'string' ? body : JSON.stringify(body),
}), env, ctx);
async function ereignisse(res) {
  return (await res.text()).split('\n\n').filter(Boolean).map((b) => ({ e: /^event: (.+)$/m.exec(b)[1], d: JSON.parse(/^data: (.+)$/m.exec(b)[1]) }));
}

test('CORS und Methode', async () => {
  const { env } = umgebung();
  let r = await worker.fetch(new Request('https://w/', { method: 'OPTIONS', headers: { Origin: 'https://odera.ch' } }), env, ctx);
  assert.equal(r.status, 204); assert.equal(r.headers.get('access-control-allow-origin'), 'https://odera.ch');
  r = await worker.fetch(new Request('https://w/', { method: 'OPTIONS', headers: { Origin: 'https://boese.example' } }), env, ctx);
  assert.equal(r.status, 403); assert.equal(r.headers.get('access-control-allow-origin'), null);
  assert.equal((await post(env, { message: 'Hallo' }, { origin: 'https://boese.example' })).status, 403);
  assert.equal((await post(env, { message: 'Hallo' }, { origin: null })).status, 403);
  assert.equal((await worker.fetch(new Request('https://w/', { headers: { Origin: 'https://odera.ch' } }), env, ctx)).status, 405);
});

test('Validierung', async () => {
  const { env, aufrufe } = umgebung();
  assert.equal((await post(env, { message: 'a'.repeat(1001) })).status, 400);
  assert.equal((await post(env, { message: 'a', history: Array.from({ length: 8 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'x' })) })).status, 400);
  assert.equal((await post(env, '{kein json')).status, 400);
  assert.equal((await post(env, 'x'.repeat(40000))).status, 413);
  assert.equal(aufrufe.length, 0, 'Ungültiges kostet kein Kontingent');
});

test('Antwort, Aufruf von Workers AI, keine IP an das Modell', async () => {
  const { env, aufrufe } = umgebung();
  const r = await post(env, { message: 'Was kostet Standard?', history: [{ role: 'user', content: 'Hallo' }, { role: 'assistant', content: 'Guten Tag.' }] });
  assert.match(r.headers.get('content-type'), /text\/event-stream/);
  const ev = await ereignisse(r);
  assert.equal(ev[0].e, 'text'); assert.equal(ev[0].d.t, 'Das Paket **Standard** kostet CHF 1\'900.');
  assert.equal(ev[1].e, 'ende');
  const a = aufrufe[0];
  assert.equal(a.modell, '@cf/test/modell');
  assert.equal(a.eingabe.max_tokens, 400);
  assert.equal(a.eingabe.messages[0].role, 'system');
  assert.match(a.eingabe.messages[0].content, /<wissen>/);
  assert.equal(a.eingabe.messages.length, 4);
  assert.ok(!JSON.stringify(a.eingabe).includes('203.0.113.7'), 'IP-Adresse geht nicht an das Modell');
});

test('Rate Limit pro IP: 8 in 10 Minuten', async () => {
  const { env } = umgebung();
  const status = [];
  for (let i = 0; i < 9; i++) { const r = await post(env, { message: 'Frage ' + i }, { ip: '198.51.100.9' }); status.push(r.status); await r.text(); }
  assert.deepEqual(status.slice(0, 8), Array(8).fill(200));
  assert.equal(status[8], 429);
  const r = await post(env, { message: 'x' }, { ip: '198.51.100.9' });
  const d = await r.json();
  assert.equal(d.fehler, 'limit'); assert.ok(d.wiederInSek > 0);
  assert.equal((await post(env, { message: 'x' }, { ip: '198.51.100.10' })).status, 200, 'andere IP nicht betroffen');
});

test('Tageslimit gesamt: danach «ausgelastet», ohne Aufruf des Modells', async () => {
  const { env, aufrufe } = umgebung({ tagesMax: '5' });
  const status = [];
  for (let i = 0; i < 7; i++) { const r = await post(env, { message: 'x' }, { ip: '192.0.2.' + i }); status.push(r.status); if (r.status === 429) assert.equal((await r.json()).fehler, 'ausgelastet'); else await r.text(); }
  assert.deepEqual(status, [200, 200, 200, 200, 200, 429, 429]);
  assert.equal(aufrufe.length, 5);
});

test('Abgelehnte IP-Anfragen zählen nicht gegen das Tageslimit', async () => {
  const { env, aufrufe } = umgebung({ tagesMax: '10' });
  for (let i = 0; i < 12; i++) await (await post(env, { message: 'x' }, { ip: '198.51.100.20' })).text();
  assert.equal(aufrufe.length, 8);
  assert.equal((await post(env, { message: 'x' }, { ip: '198.51.100.21' })).status, 200);
});

test('Kontingent von Workers AI aufgebraucht (3036): fehler/ausgelastet', async () => {
  const { env } = umgebung({ ai: () => { throw new Error('AiError: 3036: You have used up your daily free allocation of 10,000 neurons.'); } });
  const ev = await ereignisse(await post(env, { message: 'x' }));
  assert.deepEqual(ev, [{ e: 'fehler', d: { art: 'ausgelastet' } }]);
});

test('Keine Kapazität (3040) und leere Antwort', async () => {
  let { env } = umgebung({ ai: () => { throw new Error('AiError: 3040: Capacity temporarily exceeded'); } });
  assert.equal((await ereignisse(await post(env, { message: 'x' })))[0].d.art, 'ueberlastet');
  ({ env } = umgebung({ ai: () => ({ response: '' }) }));
  assert.equal((await ereignisse(await post(env, { message: 'x' })))[0].d.art, 'nicht_erreichbar');
});

test('IP wird mit Tagessalz gehasht, nicht im Klartext gespeichert', async () => {
  const { env, objekte } = umgebung();
  await (await post(env, { message: 'x' }, { ip: '203.0.113.99' })).text();
  const namen = [...objekte.keys()];
  assert.ok(namen.some((n) => /^tag:\d{4}-\d\d-\d\d$/.test(n)));
  assert.ok(namen.some((n) => /^ip:\d{4}-\d\d-\d\d:[0-9a-f]{64}$/.test(n)));
  assert.ok(!namen.join().includes('203.0.113.99'));
});

test('gpt-oss bekommt niedrigen Denkaufwand', async () => {
  const { env, aufrufe } = umgebung();
  env.MODELL = '@cf/openai/gpt-oss-120b';
  await (await post(env, { message: 'x' })).text();
  assert.deepEqual(aufrufe[0].eingabe.reasoning, { effort: 'low' });
});
