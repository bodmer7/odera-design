// Unit-Tests ohne Netz: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pruefeAnfrage, pruefeLimit, erlaubterUrsprung, fehlerArt, antwortText, utcTag, FENSTER } from '../src/regeln.js';
import { systemPrompt, waehleTeile, MAX_TOKENS } from '../src/prompt.js';

const verlauf = (n) => Array.from({ length: n }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'x' }));

test('Nachricht: Pflicht, höchstens 1000 Zeichen', () => {
  assert.equal(pruefeAnfrage({ message: 'Hallo' }).ok, true);
  assert.equal(pruefeAnfrage({ message: '' }).ok, false);
  assert.equal(pruefeAnfrage({ message: '   ' }).ok, false);
  assert.equal(pruefeAnfrage({ message: 'a'.repeat(1000) }).ok, true);
  assert.equal(pruefeAnfrage({ message: 'a'.repeat(1001) }).ok, false);
  assert.equal(pruefeAnfrage({ message: 42 }).ok, false);
  assert.equal(pruefeAnfrage(null).ok, false);
});

test('Verlauf: höchstens 6, abwechselnd user/assistant, gerade Anzahl', () => {
  assert.equal(pruefeAnfrage({ message: 'a', history: verlauf(6) }).ok, true);
  assert.equal(pruefeAnfrage({ message: 'a', history: verlauf(8) }).ok, false);
  assert.equal(pruefeAnfrage({ message: 'a', history: verlauf(3) }).ok, false);
  assert.equal(pruefeAnfrage({ message: 'a', history: [{ role: 'assistant', content: 'x' }, { role: 'user', content: 'y' }] }).ok, false);
  assert.equal(pruefeAnfrage({ message: 'a', history: [{ role: 'system', content: 'x' }, { role: 'assistant', content: 'y' }] }).ok, false);
  assert.equal(pruefeAnfrage({ message: 'a', history: 'kein Array' }).ok, false);
  assert.equal(pruefeAnfrage({ message: 'a', history: [{ role: 'user', content: 'x'.repeat(3001) }, { role: 'assistant', content: 'y' }] }).ok, false);
  const r = pruefeAnfrage({ message: 'a', history: [{ role: 'user', content: 'x', extra: 1 }, { role: 'assistant', content: 'y' }] });
  assert.deepEqual(r.history[0], { role: 'user', content: 'x' });
});

test('Rate Limit: 8 in 10 Minuten, 20 pro Tag', () => {
  let s = []; const t0 = 1_000_000_000_000;
  for (let i = 0; i < 8; i++) { const r = pruefeLimit(s, t0 + i * 1000); assert.equal(r.erlaubt, true); s = r.stempel; }
  const zu = pruefeLimit(s, t0 + 8000);
  assert.equal(zu.erlaubt, false);
  assert.ok(zu.wiederInSek > 500 && zu.wiederInSek <= 600, 'Wartezeit etwa 10 Minuten');
  assert.equal(pruefeLimit(s, t0 + 10 * 60 * 1000 + 1).erlaubt, true);
  s = []; let t = t0, ok = 0;
  for (let runde = 0; runde < 4; runde++) {
    for (let i = 0; i < 8; i++) { const r = pruefeLimit(s, t + i); if (r.erlaubt) ok++; s = r.stempel; }
    t += 11 * 60 * 1000;
  }
  assert.equal(ok, 20);
  assert.equal(FENSTER.length, 2);
});

test('CORS: nur odera.ch, localhost nur mit Schalter', () => {
  const env = { ERLAUBTE_URSPRUENGE: 'https://odera.ch,https://www.odera.ch' };
  assert.equal(erlaubterUrsprung('https://odera.ch', env), true);
  assert.equal(erlaubterUrsprung('https://www.odera.ch', env), true);
  assert.equal(erlaubterUrsprung('https://odera.ch.boese.example', env), false);
  assert.equal(erlaubterUrsprung('http://odera.ch', env), false);
  assert.equal(erlaubterUrsprung('', env), false);
  assert.equal(erlaubterUrsprung('http://localhost:8080', env), false);
  assert.equal(erlaubterUrsprung('http://localhost:8080', { ...env, ERLAUBE_LOCALHOST: '1' }), true);
});

test('Fehlerarten von Workers AI', () => {
  assert.equal(fehlerArt(new Error('3036: You have used up your daily free allocation of 10,000 neurons.')), 'ausgelastet');
  assert.equal(fehlerArt(new Error('AiError: 3040: Capacity temporarily exceeded')), 'ueberlastet');
  assert.equal(fehlerArt(new Error('network')), 'nicht_erreichbar');
});

test('Antworttext aus verschiedenen Formaten', () => {
  assert.equal(antwortText({ response: 'A' }), 'A');
  assert.equal(antwortText({ choices: [{ message: { content: 'B' } }] }), 'B');
  assert.equal(antwortText({ output: [{ type: 'reasoning' }, { type: 'message', content: [{ type: 'output_text', text: 'C' }] }] }), 'C');
  assert.equal(antwortText(null), '');
});

test('Wissen: Kern immer, weitere Teile nur mit Stichwort', () => {
  const titel = (s) => waehleTeile(s).map((t) => t.titel);
  assert.ok(titel('Was kostet eine Website?').includes('Angebot und Preise'));
  assert.ok(!titel('Was kostet eine Website?').includes('Allgemeine Geschäftsbedingungen'));
  assert.ok(titel('Wie kann ich das Hosting kündigen?').includes('Allgemeine Geschäftsbedingungen'));
  assert.ok(titel('Werden meine Daten gespeichert?').includes('Datenschutzerklärung'));
  assert.ok(titel('Haben Sie Referenzen aus der Gastronomie?').includes('Musterprojekte'));
  assert.ok(titel('Wer ist Nico?').includes('Über mich und Kontakt'));
  const p = systemPrompt('Was kostet eine Website?');
  assert.match(p, /<wissen>[\s\S]+CHF 1'900[\s\S]+<\/wissen>/);
  assert.match(p, /Nicht in <wissen> enthalten, aber auf der Website: /);
  assert.doesNotMatch(p.replace('(– oder —)', ''), /[–—]/, 'keine Gedankenstriche ausser in der Regel selbst');
  assert.equal(MAX_TOKENS, 400);
  assert.equal(utcTag(Date.UTC(2026, 8, 28, 23, 59)), '2026-09-28');
});
