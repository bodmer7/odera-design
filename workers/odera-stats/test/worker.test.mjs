import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bereinigen, pfad, quelle, kampagne, zuercherTag } from '../src/ereignisse.js';
import { zusammenfassen, p75, median } from '../src/summary.js';
import { gleich, zeitraum, grenze } from '../src/zugang.js';

const s = 'abcdefghijklmnopqrstuv';
const jetzt = new Date('2026-10-08T10:00:00Z');

test('bereinigt Ereignisse und verwirft Unbekanntes', () => {
  const z = bereinigen({ s, g: 'mobil', r: 'www.Google.com', k: 'li-2026-w41-mo', e: [
    { t: 'page_view', p: '/angebot/?x=1#a', erster: true },
    { t: 'section_view', p: '/', z: 'preise' },
    { t: 'scroll', p: '/', n: 50 },
    { t: 'scroll', p: '/', n: 33 },
    { t: 'engaged', p: '/', n: 12.5 },
    { t: 'web_vitals', p: '/', z: 'lcp', n: 2210 },
    { t: 'web_vitals', p: '/', z: 'fid', n: 3 },
    { t: 'projektcheck_submit', p: '/projekt-check/', z: 'ok' },
    { t: 'js_error', p: '/', z: 'TypeError: x <script>', i: '/assets/js/a.js:12' },
    { t: 'hack', p: '/' },
    { t: 'page_view', p: 'https://fremd.example/' },
  ] }, { land: 'CH', jetzt });
  assert.equal(z.length, 7);
  assert.deepEqual(z[0], { zeit: jetzt.toISOString(), tag: '2026-10-08', sitzung: s, typ: 'page_view', seite: '/angebot/', ziel: null, zahl: null, info: null, geraet: 'mobil', land: 'CH', quelle: 'google.com', k: 'li-2026-w41-mo' });
  assert.equal(z.find((x) => x.typ === 'js_error').ziel, 'TypeError: x script');
  assert.equal(bereinigen({ s: 'kurz', e: [{ t: 'page_view', p: '/' }] }), null);
  assert.equal(bereinigen({ s, e: [] }), null);
});

test('Herkunft, Pfad, Kampagne und Zürcher Tag', () => {
  assert.equal(quelle(''), '(direkt)');
  assert.equal(quelle('evil/path'), null);
  assert.equal(pfad('/a b'), null);
  assert.equal(kampagne('ak-2026-w41'), 'ak-2026-w41');
  assert.equal(kampagne('li-2026-w41-sa'), null);
  assert.equal(kampagne('gbp'), 'gbp');
  assert.equal(zuercherTag(new Date('2026-10-07T22:30:00Z')), '2026-10-08');
  const ohneRef = bereinigen({ s, e: [{ t: 'page_view', p: '/', erster: true }, { t: 'page_view', p: '/ablauf/' }] }, { jetzt });
  assert.equal(ohneRef[0].quelle, '(direkt)');
  assert.equal(ohneRef[1].quelle, null);
});

test('setzt die Zusammenfassung im Format v: 1 zusammen', () => {
  const roh = {
    daily: [{ day: '2026-10-08', sessions: 2, pageviews: 3 }],
    consent: [{ n: 2 }],
    sitzungen: [{ sitzung: 'a', pv: 2, sek: 40 }, { sitzung: 'b', pv: 1, sek: 5 }],
    seiten: [{ path: '/', views: 2, sek: 30 }, { path: '/angebot/', views: 1, sek: 15 }],
    ausstiege: [{ path: '/angebot/', n: 1 }, { path: '/', n: 1 }],
    abschnitte: [{ page: '/', section: 'hero', views: 2 }, { page: '/', section: 'preise', views: 1 }],
    scroll: [{ page: '/', d25: 2, d50: 1, d75: 0, d100: 0 }],
    einfach: [
      { typ: 'cta_click', ziel: 'hero-projekt-check', seite: '/', n: 1 },
      { typ: 'pricing_click', ziel: 'standard', seite: '/', n: 1 },
      { typ: 'generator_use', ziel: 'Handwerk', seite: '/musterprojekte/', n: 3 },
      { typ: 'generator_cta', ziel: 'Handwerk', seite: '/musterprojekte/', n: 1 },
      { typ: 'chat_open', ziel: null, seite: '/', n: 1 },
      { typ: 'chat_send', ziel: null, seite: '/', n: 2 },
      { typ: 'outbound_click', ziel: 'linkedin', seite: '/ueber-mich/', n: 1 },
    ],
    trichter: [{ start: 1, ok: 1, fehler: 0 }],
    schritte: [{ step: 1, reached: 1 }, { step: 2, reached: 1 }],
    herkunft: [{ source: '(direkt)', sessions: 1 }, { source: 'google.com', sessions: 1 }],
    kampagnen: [{ k: 'gbp', sessions: 1, projektcheckStarts: 1, submits: 1 }],
    geraete: [{ device: 'mobil', sessions: 2, projektcheckStarts: 1, submits: 1 }],
    laender: [{ country: 'CH', sessions: 2 }],
    vitals: [{ seite: '/', ziel: 'lcp', zahl: 1800 }, { seite: '/', ziel: 'lcp', zahl: 2400 }, { seite: '/', ziel: 'cls', zahl: 0.02 }, { seite: '/', ziel: 'inp', zahl: 90 }],
    fehler: [{ msg: 'TypeError', src: '/a.js:1', count: 3 }],
  };
  const x = zusammenfassen(roh, '2026-10-01', '2026-10-08', jetzt);
  assert.deepEqual(Object.keys(x), ['v', 'range', 'generatedAt', 'totals', 'daily', 'pages', 'sections', 'scroll', 'ctas', 'pricing', 'funnel', 'generator', 'chat', 'faq', 'muster', 'outbound', 'referrers', 'campaigns', 'devices', 'countries', 'vitals', 'errors']);
  assert.deepEqual(x.totals, { sessions: 2, pageviews: 3, avgPagesPerSession: 1.5, bounceRate: 0.5, medianEngagedSeconds: 23, consentYes: 2 });
  assert.deepEqual(x.pages[0], { path: '/', views: 2, avgEngagedSeconds: 15, exitRate: 0.5 });
  assert.deepEqual(x.sections[1], { page: '/', section: 'preise', views: 1, reachRate: 0.5 });
  assert.deepEqual(x.generator, { uses: 3, ctaClicks: 1, byBranche: [{ branche: 'Handwerk', uses: 3, ctaClicks: 1 }] });
  assert.deepEqual(x.funnel, { start: 1, steps: [{ step: 1, reached: 1 }, { step: 2, reached: 1 }], submitOk: 1, submitFail: 0 });
  assert.deepEqual(x.vitals, [{ page: '/', samples: 2, lcpP75: 2400, clsP75: 0.02, inpP75: 90 }]);
  assert.deepEqual(x.chat, { opens: 1, messages: 2, presets: [] });
  assert.equal(x.generatedAt, '2026-10-08T10:00:00Z');
});

test('Hilfen: Perzentil, Median, Token, Zeitraum, Löschgrenze', () => {
  assert.equal(p75([1, 2, 3, 4]), 3);
  assert.equal(median([5, 1, 3]), 3);
  assert.equal(gleich('geheim', 'geheim'), true);
  assert.equal(gleich('geheim', 'geheiM'), false);
  assert.equal(gleich('geheim', 'geheim1'), false);
  const z = (q) => zeitraum(new URL('https://x/api/summary?' + q));
  assert.deepEqual(z('from=2026-10-01&to=2026-10-31'), { von: '2026-10-01', bis: '2026-10-31' });
  assert.equal(z('from=2026-10-31&to=2026-10-01'), null);
  assert.equal(z('from=2020-01-01&to=2026-10-01'), null);
  assert.equal(z('from=2026-10-01'), null);
  assert.equal(grenze(14, new Date('2026-10-08T10:00:00Z')), '2025-08-08');
});
