// Zusammenfassung für das Akquise-Tool im Format «v: 1» (Vertrag in docs/tracking.md, Beispiel im Akquise-Repo
// test/fixtures/summary-beispiel.json). Die Datenbank rechnet die Summen (SQL), hier werden sie nur zusammengesetzt,
// damit der Worker im Gratis-Plan mit wenig Rechenzeit auskommt.

export const VERSION = 1;

const BEREICH = 'tag BETWEEN ?1 AND ?2';

/** Alle Abfragen, als D1-Batch. Reihenfolge = Schlüssel in ROH_SCHLUESSEL. */
export const ABFRAGEN = {
  daily: `SELECT tag AS day, COUNT(DISTINCT sitzung) AS sessions, COUNT(*) AS pageviews FROM ereignisse WHERE ${BEREICH} AND typ = 'page_view' GROUP BY tag ORDER BY tag`,
  consent: `SELECT COUNT(*) AS n FROM ereignisse WHERE ${BEREICH} AND typ = 'consent_yes'`,
  sitzungen: `SELECT sitzung, SUM(typ = 'page_view') AS pv, SUM(CASE WHEN typ = 'engaged' THEN zahl ELSE 0 END) AS sek
    FROM ereignisse WHERE ${BEREICH} AND typ IN ('page_view', 'engaged') GROUP BY sitzung HAVING pv > 0`,
  seiten: `SELECT seite AS path, SUM(typ = 'page_view') AS views, SUM(CASE WHEN typ = 'engaged' THEN zahl ELSE 0 END) AS sek
    FROM ereignisse WHERE ${BEREICH} AND typ IN ('page_view', 'engaged') GROUP BY seite HAVING views > 0 ORDER BY views DESC`,
  ausstiege: `SELECT seite AS path, COUNT(*) AS n FROM (
      SELECT seite, ROW_NUMBER() OVER (PARTITION BY sitzung ORDER BY zeit DESC, id DESC) AS rn
      FROM ereignisse WHERE ${BEREICH} AND typ = 'page_view') WHERE rn = 1 GROUP BY seite`,
  abschnitte: `SELECT seite AS page, ziel AS section, COUNT(*) AS views FROM ereignisse WHERE ${BEREICH} AND typ = 'section_view' GROUP BY seite, ziel`,
  scroll: `SELECT seite AS page, SUM(zahl = 25) AS d25, SUM(zahl = 50) AS d50, SUM(zahl = 75) AS d75, SUM(zahl = 100) AS d100
    FROM ereignisse WHERE ${BEREICH} AND typ = 'scroll' GROUP BY seite`,
  einfach: `SELECT typ, ziel, seite, COUNT(*) AS n FROM ereignisse WHERE ${BEREICH}
    AND typ IN ('cta_click', 'pricing_click', 'chat_preset', 'faq_open', 'muster_open', 'outbound_click', 'generator_use', 'generator_cta', 'chat_open', 'chat_send')
    GROUP BY typ, ziel, seite`,
  trichter: `SELECT
      (SELECT COUNT(DISTINCT sitzung) FROM ereignisse WHERE ${BEREICH} AND typ = 'projektcheck_start') AS start,
      (SELECT COUNT(*) FROM ereignisse WHERE ${BEREICH} AND typ = 'projektcheck_submit' AND ziel = 'ok') AS ok,
      (SELECT COUNT(*) FROM ereignisse WHERE ${BEREICH} AND typ = 'projektcheck_submit' AND ziel = 'fehler') AS fehler`,
  schritte: `SELECT CAST(zahl AS INTEGER) AS step, COUNT(DISTINCT sitzung) AS reached FROM ereignisse WHERE ${BEREICH} AND typ = 'projektcheck_step' GROUP BY step ORDER BY step`,
  herkunft: `SELECT quelle AS source, COUNT(DISTINCT sitzung) AS sessions FROM ereignisse WHERE ${BEREICH} AND typ = 'page_view' AND quelle IS NOT NULL GROUP BY quelle ORDER BY sessions DESC LIMIT 30`,
  kampagnen: `SELECT k,
      COUNT(DISTINCT CASE WHEN typ = 'page_view' THEN sitzung END) AS sessions,
      COUNT(DISTINCT CASE WHEN typ = 'projektcheck_start' THEN sitzung END) AS projektcheckStarts,
      SUM(typ = 'projektcheck_submit' AND ziel = 'ok') AS submits
    FROM ereignisse WHERE ${BEREICH} AND k IS NOT NULL GROUP BY k ORDER BY sessions DESC`,
  geraete: `SELECT geraet AS device,
      COUNT(DISTINCT CASE WHEN typ = 'page_view' THEN sitzung END) AS sessions,
      COUNT(DISTINCT CASE WHEN typ = 'projektcheck_start' THEN sitzung END) AS projektcheckStarts,
      SUM(typ = 'projektcheck_submit' AND ziel = 'ok') AS submits
    FROM ereignisse WHERE ${BEREICH} AND geraet IS NOT NULL GROUP BY geraet ORDER BY sessions DESC`,
  laender: `SELECT land AS country, COUNT(DISTINCT sitzung) AS sessions FROM ereignisse WHERE ${BEREICH} AND typ = 'page_view' AND land IS NOT NULL GROUP BY land ORDER BY sessions DESC LIMIT 30`,
  vitals: `SELECT seite, ziel, zahl FROM ereignisse WHERE ${BEREICH} AND typ = 'web_vitals' ORDER BY seite, ziel, zahl LIMIT 20000`,
  fehler: `SELECT ziel AS msg, COALESCE(info, '') AS src, COUNT(*) AS count FROM ereignisse WHERE ${BEREICH} AND typ = 'js_error' GROUP BY ziel, info ORDER BY count DESC LIMIT 30`,
};

const rund = (x) => Math.round(x * 1000) / 1000;

export function median(werte) {
  if (!werte.length) return 0;
  const s = [...werte].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** 75. Perzentil einer aufsteigend sortierten Liste (nächster Rang). */
export function p75(sortiert) {
  if (!sortiert.length) return 0;
  return sortiert[Math.min(sortiert.length - 1, Math.ceil(0.75 * sortiert.length) - 1)];
}

/** Setzt die Rohergebnisse (Objekt mit den Schlüsseln von ABFRAGEN, je ein Array von Zeilen) zusammen. */
export function zusammenfassen(roh, von, bis, jetzt = new Date()) {
  const sitzungen = roh.sitzungen;
  const sessions = sitzungen.length;
  const pageviews = roh.daily.reduce((a, d) => a + Number(d.pageviews), 0);
  const absprung = sitzungen.filter((x) => Number(x.pv) === 1 && Number(x.sek) < 10).length;
  const aufrufe = Object.fromEntries(roh.seiten.map((p) => [p.path, Number(p.views)]));
  const ausstiege = Object.fromEntries(roh.ausstiege.map((a) => [a.path, Number(a.n)]));

  const einfach = (typ) => roh.einfach.filter((z) => z.typ === typ);
  const summeNach = (typ, schluessel) => {
    const m = new Map();
    for (const z of einfach(typ)) m.set(z[schluessel], (m.get(z[schluessel]) ?? 0) + Number(z.n));
    return [...m].sort((a, b) => b[1] - a[1]);
  };
  const anzahl = (typ) => einfach(typ).reduce((a, z) => a + Number(z.n), 0);

  const vitals = new Map();
  for (const v of roh.vitals) {
    const e = vitals.get(v.seite) ?? { lcp: [], cls: [], inp: [] };
    e[v.ziel]?.push(Number(v.zahl));
    vitals.set(v.seite, e);
  }

  const generatorCta = new Map(summeNach('generator_cta', 'ziel'));
  const t = roh.trichter[0] ?? { start: 0, ok: 0, fehler: 0 };

  return {
    v: VERSION,
    range: { from: von, to: bis },
    generatedAt: jetzt.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    totals: {
      sessions,
      pageviews,
      avgPagesPerSession: sessions ? rund(pageviews / sessions) : 0,
      bounceRate: sessions ? rund(absprung / sessions) : 0,
      medianEngagedSeconds: Math.round(median(sitzungen.map((x) => Number(x.sek)))),
      consentYes: Number(roh.consent[0]?.n ?? 0),
    },
    daily: roh.daily.map((d) => ({ day: d.day, sessions: Number(d.sessions), pageviews: Number(d.pageviews) })),
    pages: roh.seiten.map((p) => ({
      path: p.path,
      views: Number(p.views),
      avgEngagedSeconds: Number(p.views) ? Math.round(Number(p.sek) / Number(p.views)) : 0,
      exitRate: Number(p.views) ? rund((ausstiege[p.path] ?? 0) / Number(p.views)) : 0,
    })),
    sections: roh.abschnitte.map((a) => ({
      page: a.page,
      section: a.section,
      views: Number(a.views),
      reachRate: aufrufe[a.page] ? rund(Math.min(1, Number(a.views) / aufrufe[a.page])) : 0,
    })),
    scroll: roh.scroll.map((s) => ({ page: s.page, d25: Number(s.d25), d50: Number(s.d50), d75: Number(s.d75), d100: Number(s.d100) })),
    ctas: einfach('cta_click').map((z) => ({ id: z.ziel, page: z.seite, clicks: Number(z.n) })).sort((a, b) => b.clicks - a.clicks),
    pricing: summeNach('pricing_click', 'ziel').map(([paket, clicks]) => ({ paket, clicks })),
    funnel: {
      start: Number(t.start),
      steps: roh.schritte.map((s) => ({ step: Number(s.step), reached: Number(s.reached) })),
      submitOk: Number(t.ok),
      submitFail: Number(t.fehler),
    },
    generator: {
      uses: anzahl('generator_use'),
      ctaClicks: anzahl('generator_cta'),
      byBranche: summeNach('generator_use', 'ziel').map(([branche, uses]) => ({ branche, uses, ctaClicks: generatorCta.get(branche) ?? 0 })),
    },
    chat: { opens: anzahl('chat_open'), messages: anzahl('chat_send'), presets: summeNach('chat_preset', 'ziel').map(([id, clicks]) => ({ id, clicks })) },
    faq: summeNach('faq_open', 'ziel').map(([id, opens]) => ({ id, opens })),
    muster: summeNach('muster_open', 'ziel').map(([id, opens]) => ({ id, opens })),
    outbound: summeNach('outbound_click', 'ziel').map(([target, clicks]) => ({ target, clicks })),
    referrers: roh.herkunft.map((r) => ({ source: r.source, sessions: Number(r.sessions) })),
    campaigns: roh.kampagnen.map((c) => ({ k: c.k, sessions: Number(c.sessions), projektcheckStarts: Number(c.projektcheckStarts), submits: Number(c.submits) })),
    devices: roh.geraete.map((d) => ({ device: d.device, sessions: Number(d.sessions), projektcheckStarts: Number(d.projektcheckStarts), submits: Number(d.submits) })),
    countries: roh.laender.map((c) => ({ country: c.country, sessions: Number(c.sessions) })),
    vitals: [...vitals].map(([page, v]) => ({
      page,
      samples: Math.max(v.lcp.length, v.cls.length, v.inp.length),
      lcpP75: Math.round(p75(v.lcp)),
      clsP75: rund(p75(v.cls)),
      inpP75: Math.round(p75(v.inp)),
    })),
    errors: roh.fehler.map((f) => ({ msg: f.msg, src: f.src, count: Number(f.count) })),
  };
}

/** Führt alle Abfragen in einem Batch aus und setzt die Zusammenfassung zusammen. */
export async function summary(db, von, bis, jetzt = new Date()) {
  const schluessel = Object.keys(ABFRAGEN);
  const ergebnisse = await db.batch(schluessel.map((k) => db.prepare(ABFRAGEN[k]).bind(von, bis)));
  const roh = Object.fromEntries(schluessel.map((k, i) => [k, ergebnisse[i].results ?? []]));
  return zusammenfassen(roh, von, bis, jetzt);
}
