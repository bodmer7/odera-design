// Tests des Workers ohne Netz und ohne Konten: npm test
// Resend, Turnstile und die Durable Objects werden im Speicher nachgebaut.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { Limiter } from '../src/index.js';
import { pruefeAnfrage, referenzAus, einzeilig, istEmail } from '../src/regeln.js';
import { mailAnNico, mailKopie, maskiere } from '../src/mail.js';

const VOLL = {
  KONTAKT_NAME: 'Anna Muster', KONTAKT_MAIL: 'anna@beispiel.ch', KONTAKT_TEL: '079 000 00 00', FIRMA: 'Bäckerei Müller', ORT: 'Zürich',
  BRANCHE: 'Gastronomie oder Verkauf', SEITENZAHL: 'Etwa fünf Seiten', TERMIN: 'In einem Monat', BESCHREIBUNG: 'Wir backen seit 1990.\nFrisch jeden Tag.',
  PAKET: 'Standard', PREIS: "CHF 1'900",
};
const idem = () => 'test-' + Math.random().toString(36).slice(2) + Date.now();
const koerper = (x = {}) => ({ art: 'voll', felder: { ...VOLL }, kopie: false, token: 'gut', website: '', dauerSek: 120, idem: idem(), ...x });

function umgebung({ resend, turnstileOk = true, tagesMax = '40' } = {}) {
  const objekte = new Map(); const mails = []; const pruefungen = [];
  const env = {
    ERLAUBTE_URSPRUENGE: 'https://odera.ch,https://www.odera.ch', TURNSTILE_HOSTS: 'odera.ch', TAGESLIMIT_GESAMT: tagesMax,
    RESEND_API_KEY: 'test-schluessel', TURNSTILE_SECRET: 'test-secret',
    FETCH: async (url, init) => {
      if (url.includes('turnstile')) { pruefungen.push(init.body.get('response')); return Response.json({ success: turnstileOk && init.body.get('response') === 'gut', hostname: 'odera.ch' }); }
      const body = JSON.parse(init.body); const key = init.headers['Idempotency-Key'];
      if (resend) return resend(body, key, mails);
      if (mails.some((m) => m.key === key)) return Response.json({ name: 'invalid_idempotent_request', message: 'Same idempotency key used with a different request payload' }, { status: 409 });
      mails.push({ key, ...body }); return Response.json({ id: 'm' + mails.length });
    },
    LIMITER: {
      idFromName: (n) => n,
      get: (id) => {
        if (!objekte.has(id)) { const d = new Map(); objekte.set(id, new Limiter({ storage: { get: async (k) => d.get(k), put: async (k, v) => { d.set(k, v); }, setAlarm: async () => {}, deleteAll: async () => d.clear() } })); }
        const o = objekte.get(id); return { fetch: (url, init) => o.fetch(new Request(url, init)) };
      },
    },
  };
  return { env, mails, pruefungen, objekte };
}
const post = (env, body, { origin = 'https://odera.ch', ip = '203.0.113.7' } = {}) => worker.fetch(new Request('https://w/', {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}), 'CF-Connecting-IP': ip },
  body: typeof body === 'string' ? body : JSON.stringify(body),
}), env);

test('Erfolg: Mail an Nico mit Reply-To, Referenz, kein Versand der Kopie ohne Wunsch', async () => {
  const { env, mails } = umgebung();
  const r = await post(env, koerper());
  const d = await r.json();
  assert.equal(r.status, 200); assert.equal(d.ok, true); assert.match(d.referenz, /^ODR-[2-9A-HJ-NP-Z]{4}$/); assert.equal(d.kopie, false);
  assert.equal(mails.length, 1);
  const m = mails[0];
  assert.equal(m.from, 'ODERA Design <anfrage@odera.ch>'); assert.deepEqual(m.to, ['kontakt@odera.ch']); assert.equal(m.reply_to, 'anna@beispiel.ch');
  assert.equal(m.subject, `Projekt-Check: Bäckerei Müller (Standard) · ${d.referenz}`);
  assert.match(m.html, /Bäckerei Müller/); assert.match(m.text, /Beschreibung: Wir backen seit 1990\.\nFrisch jeden Tag\./);
});

test('Kopie an die Kundin: Absender anfrage@, Reply-To kontakt@', async () => {
  const { env, mails } = umgebung();
  const d = await (await post(env, koerper({ kopie: true }))).json();
  assert.equal(d.kopie, true); assert.equal(mails.length, 2);
  assert.deepEqual(mails[1].to, ['anna@beispiel.ch']); assert.equal(mails[1].reply_to, 'kontakt@odera.ch');
  assert.match(mails[1].subject, /^Ihre Anfrage bei ODERA Design · ODR-/);
  assert.match(mails[1].text, /Antwort spätestens am nächsten Abend, ausser am Wochenende/);
  assert.doesNotMatch(mails[1].html + mails[1].text, /newsletter|angebot des monats/i);
});

test('Domain nicht verifiziert: Fehler «versand», keine Kopie', async () => {
  const { env } = umgebung({ resend: () => Response.json({ name: 'validation_error', message: 'The odera.ch domain is not verified. Please, add and verify your domain.' }, { status: 403 }) });
  const r = await post(env, koerper({ kopie: true }));
  assert.equal(r.status, 503); assert.deepEqual(await r.json(), { ok: false, fehler: 'versand' });
});

test('Doppelklick und Wiederholung: gleiche Referenz, nur eine Mail', async () => {
  const { env, mails } = umgebung();
  const k = koerper();
  const [a, b] = await Promise.all([post(env, k), post(env, { ...k })]);
  const ra = await a.json(), rb = await b.json();
  assert.equal(ra.referenz, rb.referenz);
  assert.equal(mails.length, 1);
});

test('Spam-Schutz: Turnstile, Honigtopf, zu schnell, Herkunft, Grösse', async () => {
  const { env, mails } = umgebung();
  assert.equal((await post(env, koerper({ token: '' }))).status, 400);
  assert.equal((await post(env, koerper({ token: 'falsch' }))).status, 400);
  assert.equal((await post(env, koerper({ website: 'http://spam.example' }))).status, 400);
  assert.equal((await post(env, koerper({ dauerSek: 3 }))).status, 400);
  assert.equal((await post(env, koerper({ art: 'kurz', dauerSek: 2 }))).status, 400);
  assert.equal((await post(env, koerper(), { origin: 'https://boese.example' })).status, 403);
  assert.equal((await post(env, koerper(), { origin: null })).status, 403);
  assert.equal((await post(env, JSON.stringify(koerper({ felder: { ...VOLL, SONSTIGES: 'x'.repeat(21000) } })))).status, 413);
  assert.equal((await post(env, '{kein json')).status, 400);
  assert.equal(mails.length, 0);
});

test('Validierung: Pflicht, E-Mail, Länge, unbekannte Felder verworfen', () => {
  const ok = (x) => pruefeAnfrage(koerper(x)).ok;
  assert.equal(ok({ felder: { ...VOLL, KONTAKT_MAIL: 'keine-mail' } }), false);
  assert.equal(ok({ felder: { ...VOLL, KONTAKT_MAIL: 'a@b.ch\r\nBcc: x@y.ch' } }), false);
  assert.equal(ok({ felder: { ...VOLL, FIRMA: '' } }), false);
  assert.equal(ok({ felder: { ...VOLL, BESCHREIBUNG: 'x'.repeat(2001) } }), false);
  assert.equal(ok({ felder: { ...VOLL, BESCHREIBUNG: 42 } }), false);
  const r = pruefeAnfrage(koerper({ felder: { ...VOLL, UNBEKANNT: 'weg', __proto__x: 1 } }));
  assert.equal(r.ok, true); assert.equal(r.daten.felder.UNBEKANNT, undefined);
  assert.equal(pruefeAnfrage(koerper({ art: 'kurz', felder: { KONTAKT_NAME: 'A', KONTAKT_MAIL: 'a@b.ch', BRANCHE: 'Verein', SEITENZAHL: 'Eine Seite reicht' }, dauerSek: 30 })).ok, true);
  assert.equal(istEmail('anna.muster+test@sub.beispiel.ch'), true);
});

test('Sicherheit in der Mail: HTML maskiert, Umbrüche in Name und Betreff entfernt, Links entschärft', async () => {
  const bos = { ...VOLL, KONTAKT_NAME: 'Eva\r\nBcc: boese@example.com', FIRMA: '<script>alert(1)</script>\nFirma', SONSTIGES: 'Siehe https://boese.example/x und www.boese.example' };
  const p = pruefeAnfrage(koerper({ felder: bos }));
  assert.equal(p.ok, true);
  assert.doesNotMatch(p.daten.felder.KONTAKT_NAME, /[\r\n]/);
  const m = mailAnNico(p.daten, 'ODR-TEST');
  assert.doesNotMatch(m.betreff, /[\r\n]/);
  assert.doesNotMatch(m.html, /<script>/); assert.match(m.html, /&lt;script&gt;/);
  assert.doesNotMatch(m.html, /https:\/\/boese/); assert.match(m.html, /https:&#8203;\/\/boese/); assert.match(m.html, /www&#8203;\.boese/);
  assert.equal(maskiere(`"'<>&`), '&quot;&#39;&lt;&gt;&amp;');
  assert.equal(einzeilig('a\nb\r\nc\u2028d'), 'a b c d');
  const k = mailKopie(p.daten, 'ODR-TEST');
  assert.doesNotMatch(k.html, /<script>/);
});

test('Rate Limit: 3 pro Stunde je IP, Tageslimit gesamt', async () => {
  let { env, mails } = umgebung();
  const st = [];
  for (let i = 0; i < 4; i++) st.push((await post(env, koerper(), { ip: '198.51.100.1' })).status);
  assert.deepEqual(st, [200, 200, 200, 429]);
  assert.equal((await post(env, koerper(), { ip: '198.51.100.2' })).status, 200);
  ({ env, mails } = umgebung({ tagesMax: '2' }));
  const s2 = [];
  for (let i = 0; i < 3; i++) s2.push((await post(env, koerper(), { ip: '192.0.2.' + i })).status);
  assert.deepEqual(s2, [200, 200, 429]); assert.equal(mails.length, 2);
});

test('Referenz ist stabil pro Schlüssel und gut lesbar', async () => {
  assert.equal(await referenzAus('abc-def-ghi-jkl-mno'), await referenzAus('abc-def-ghi-jkl-mno'));
  assert.notEqual(await referenzAus('abc-def-ghi-jkl-mno'), await referenzAus('abc-def-ghi-jkl-mnp'));
});

test('IP nur gehasht in den Zählern', async () => {
  const { env, objekte } = umgebung();
  await post(env, koerper(), { ip: '203.0.113.99' });
  assert.ok(![...objekte.keys()].join().includes('203.0.113.99'));
});
