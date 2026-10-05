/* Firstlicht: Logik des Solarrechners
   Reine Funktionen ohne DOM. Alle Zahlen kommen aus daten/annahmen.json (Parameter «a»).
   Getestet in tools/firstlicht/tests/rechner-logik.test.mjs. */

export const REGIONEN = ['mittelland', 'jura', 'wallis', 'alpen'];
export const VERSCHATTUNG = ['keine', 'leicht', 'mittel'];
export const RICHTUNGEN = [
  ['Nord', 0], ['Nordost', 45], ['Ost', 90], ['Südost', 135],
  ['Süd', 180], ['Südwest', 225], ['West', 270], ['Nordwest', 315]
];

/* Startwerte der Eingaben, Zahlen aus den Annahmen */
export function standardEingaben(a) {
  return {
    region: 'mittelland',
    dach: 'schraeg',
    neigung: 30,
    flaeche: 60,
    azimut: 180,
    verschattung: 'keine',
    verbrauchArt: 'personen',
    personen: 4,
    verbrauch: a.verbrauchPersonen.wert['4'],
    waermepumpe: false,
    eauto: false,
    km: a.eauto.wert.kmStart,
    strompreis: a.strompreis.wert,
    rueckliefer: a.rueckliefertarif.wert,
    speicher: false,
    speicherKwh: a.speicherGroesse.wert,
    groesseArt: 'auto',
    kwp: 8
  };
}

/* ---------- Hilfen ---------- */
export function begrenzen(wert, min, max, ersatz) {
  const n = typeof wert === 'string' ? Number(wert.replace(/['’\s]/g, '').replace(',', '.')) : Number(wert);
  if (!Number.isFinite(n)) return ersatz;
  return Math.min(max, Math.max(min, n));
}

/* Eingaben säubern: Grenzen, NaN, unbekannte Auswahl */
export function eingabenPruefen(roh, a) {
  const s = standardEingaben(a);
  const e = { ...s, ...(roh || {}) };
  const aus = (v, liste, d) => (liste.includes(v) ? v : d);
  const ja = (v) => v === true || v === 'true' || v === '1' || v === 1;
  return {
    region: aus(e.region, REGIONEN, s.region),
    dach: aus(e.dach, ['schraeg', 'flach'], s.dach),
    neigung: Math.round(begrenzen(e.neigung, 0, 60, s.neigung)),
    flaeche: Math.round(begrenzen(e.flaeche, 0, 2000, s.flaeche)),
    azimut: ((Math.round(begrenzen(e.azimut, -720, 720, s.azimut)) % 360) + 360) % 360,
    verschattung: aus(e.verschattung, VERSCHATTUNG, s.verschattung),
    verbrauchArt: aus(e.verbrauchArt, ['personen', 'kwh'], s.verbrauchArt),
    personen: Math.round(begrenzen(e.personen, 1, 6, s.personen)),
    verbrauch: Math.round(begrenzen(e.verbrauch, a.verbrauchGrenzen.wert.min, a.verbrauchGrenzen.wert.max, s.verbrauch)),
    waermepumpe: ja(e.waermepumpe),
    eauto: ja(e.eauto),
    km: Math.round(begrenzen(e.km, 0, a.eauto.wert.kmMax, s.km)),
    strompreis: begrenzen(e.strompreis, a.strompreis.min, a.strompreis.max, s.strompreis),
    rueckliefer: begrenzen(e.rueckliefer, a.rueckliefertarif.min, a.rueckliefertarif.max, s.rueckliefer),
    speicher: ja(e.speicher),
    speicherKwh: Math.round(begrenzen(e.speicherKwh, a.speicherGroesse.min, a.speicherGroesse.max, s.speicherKwh)),
    groesseArt: aus(e.groesseArt, ['auto', 'manuell'], s.groesseArt),
    kwp: begrenzen(e.kwp, 0, 400, s.kwp)
  };
}

/* Lineare Interpolation in einer Liste von [x, y] */
export function staffel(punkte, x) {
  if (x <= punkte[0][0]) return punkte[0][1];
  for (let i = 1; i < punkte.length; i++) {
    const [x1, y1] = punkte[i];
    if (x <= x1) {
      const [x0, y0] = punkte[i - 1];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return punkte[punkte.length - 1][1];
}

/* Ausrichtungsfaktor aus Neigung und Azimut (0 = Nord, 180 = Süd), bilinear */
export function ausrichtungsFaktor(neigung, azimut, a) {
  const t = a.ausrichtung.wert;
  const abw = Math.abs((((azimut - 180) % 360) + 540) % 360 - 180); // 0 bis 180
  const n = Math.min(60, Math.max(0, neigung));
  const idx = (liste, v) => {
    let i = 0;
    while (i < liste.length - 2 && v > liste[i + 1]) i++;
    return [i, (v - liste[i]) / (liste[i + 1] - liste[i])];
  };
  const [i, fi] = idx(t.neigungen, n);
  const [j, fj] = idx(t.abweichungen, abw);
  const f = t.faktoren;
  const oben = f[i][j] + (f[i][j + 1] - f[i][j]) * fj;
  const unten = f[i + 1][j] + (f[i + 1][j + 1] - f[i + 1][j]) * fj;
  return oben + (unten - oben) * fi;
}

export function richtungName(azimut) {
  const i = Math.round((((azimut % 360) + 360) % 360) / 45) % 8;
  return RICHTUNGEN[i][0];
}

/* ---------- Teilrechnungen ---------- */

export function anlage(e, a) {
  const flach = e.dach === 'flach';
  const belegung = flach ? a.flachdach.wert.belegung : a.belegung.wert;
  const maxKwp = (e.flaeche * belegung) / a.flaecheProKwp.wert;
  const wunsch = e.groesseArt === 'manuell' ? Math.min(e.kwp, maxKwp) : maxKwp;
  const modulKwp = a.modul.wert.kwp;
  const module = wunsch > 0 ? Math.max(1, Math.round(wunsch / modulKwp)) : 0;
  // Bei «Dach optimal nutzen» nicht mehr Module als Platz hat
  const moduleOk = wunsch > 0 && module * modulKwp > maxKwp + 1e-9 ? Math.floor(maxKwp / modulKwp) : module;
  const kwp = moduleOk * modulKwp;
  return { kwp, maxKwp, module: moduleOk, belegt: moduleOk * a.modul.wert.flaeche };
}

export function jahresertrag(e, kwp, a) {
  const spez = a.ertragRegion.wert[e.region];
  const richtung = e.dach === 'flach' ? a.flachdach.wert.faktor : ausrichtungsFaktor(e.neigung, e.azimut, a);
  const schatten = 1 - a.verschattung.wert[e.verschattung];
  return { kwh: kwp * spez * richtung * schatten, spezifisch: spez * richtung * schatten, richtung };
}

export function verbrauch(e, a) {
  const haushalt = e.verbrauchArt === 'kwh' ? e.verbrauch : a.verbrauchPersonen.wert[String(e.personen)];
  const wp = e.waermepumpe ? a.waermepumpe.wert : 0;
  const auto = e.eauto ? (e.km * a.eauto.wert.kwhPro100km) / 100 : 0;
  return { haushalt, wp, auto, total: haushalt + wp + auto };
}

/* Autarkiegrad nach Verhältnis Produktion/Verbrauch (r) und Speicher pro MWh (s) */
export function autarkie(r, s, a) {
  const p = a.eigenverbrauch.wert;
  if (!(r > 0)) return 0;
  const ohne = p.autarkieBei1 * (1 - Math.exp(-p.krumm * r)) / (1 - Math.exp(-p.krumm));
  if (!(s > 0)) return Math.min(ohne, 0.95);
  const max = p.autarkieMax * (1 - Math.exp(-p.maxKrumm * r));
  const mit = ohne + Math.max(0, max - ohne) * (1 - Math.exp(-p.speicherWirkung * s));
  return Math.min(mit, 0.95);
}

export function eigenverbrauch(ertragKwh, v, speicherKwh, a) {
  if (ertragKwh <= 0 || v.total <= 0) return { kwh: 0, quote: 0, autarkie: 0 };
  const p = a.eigenverbrauch.wert;
  const r = ertragKwh / v.total;
  const s = speicherKwh / (v.total / 1000);
  const basis = autarkie(r, s, a);
  let kwh = basis * v.haushalt + basis * p.faktorAuto * v.auto + basis * p.faktorWaermepumpe * v.wp;
  kwh = Math.min(kwh, ertragKwh);
  return { kwh, quote: kwh / ertragKwh, autarkie: kwh / v.total };
}

export function einmalverguetung(kwp, investition, a) {
  if (kwp < a.einmalverguetungMinKwp.wert) return 0;
  const s = a.einmalverguetung.wert;
  const betrag = Math.min(kwp, 30) * s.bis30 + Math.max(0, Math.min(kwp, 100) - 30) * s.bis100 + Math.max(0, kwp - 100) * s.ab100;
  return Math.min(betrag, investition * a.einmalverguetungMaxAnteil.wert);
}

export function investition(kwp, speicherKwh, a) {
  const anlageChf = kwp > 0 ? kwp * staffel(a.anlagekosten.wert, kwp) : 0;
  const speicherChf = speicherKwh > 0 ? a.speicherkosten.wert.fix + speicherKwh * a.speicherkosten.wert.proKwh : 0;
  return { anlage: anlageChf, speicher: speicherChf, total: anlageChf + speicherChf };
}

export function unterhalt(kwp, a) {
  return kwp > 0 ? a.unterhalt.wert.fix + a.unterhalt.wert.proKwp * kwp : 0;
}

/* Ein Szenario rechnen (mit oder ohne Speicher) */
export function szenario(e, a, mitSpeicher) {
  const anl = anlage(e, a);
  const ertrag = jahresertrag(e, anl.kwp, a);
  const v = verbrauch(e, a);
  const speicherKwh = mitSpeicher && anl.kwp > 0 ? e.speicherKwh : 0;
  const ev = eigenverbrauch(ertrag.kwh, v, speicherKwh, a);
  const einspeisung = ertrag.kwh - ev.kwh;
  const inv = investition(anl.kwp, speicherKwh, a);
  const eiv = einmalverguetung(anl.kwp, inv.total, a);
  const netto = inv.total - eiv;
  const uh = unterhalt(anl.kwp, a);
  const ersparnis = (ev.kwh * e.strompreis + einspeisung * e.rueckliefer) / 100 - uh;
  return { anlage: anl, ertrag, verbrauch: v, speicherKwh, eigenverbrauch: ev, einspeisung, investition: inv, eiv, netto, unterhalt: uh, ersparnis };
}

/* Kumulierter Ertrag über die Jahre, beginnend bei minus netto */
export function verlauf(sz, e, a) {
  const jahre = a.jahre.wert;
  const d = a.degradation.wert;
  const punkte = [{ jahr: 0, kumuliert: -sz.netto }];
  let summe = -sz.netto;
  let breakEven = null;
  for (let j = 1; j <= jahre; j++) {
    const faktor = (1 - d) ** (j - 1);
    const jahrErsparnis = ((sz.eigenverbrauch.kwh * faktor) * e.strompreis + (sz.einspeisung * faktor) * e.rueckliefer) / 100 - sz.unterhalt;
    const vorher = summe;
    summe += jahrErsparnis;
    if (breakEven === null && vorher < 0 && summe >= 0) breakEven = j - 1 + (-vorher) / jahrErsparnis;
    punkte.push({ jahr: j, kumuliert: summe });
  }
  return { punkte, breakEven, total: summe };
}

/* ---------- Rundung ohne Scheingenauigkeit ---------- */
export const runden = (wert, schritt) => Math.round(wert / schritt) * schritt;
export const chfRunden = (wert) => runden(wert, Math.abs(wert) < 10000 ? 50 : 100);
export const kwhRunden = (wert) => runden(wert, 100);

/* ---------- Gesamtergebnis ---------- */
export function berechnen(roh, a) {
  const e = eingabenPruefen(roh, a);
  const ohne = szenario(e, a, false);
  const mit = szenario(e, a, true);
  const sz = e.speicher ? mit : ohne;
  const spE = a.ertragSpanne.wert;
  const spK = a.kostenSpanne.wert;
  const kwp = sz.anlage.kwp;
  const leer = kwp <= 0;

  // Amortisation als Spanne: günstiger Fall (mehr Ertrag, tiefere Kosten) bis ungünstiger Fall
  const amort = (nettoFaktor, ertragFaktor) => {
    const ers = ((sz.eigenverbrauch.kwh * ertragFaktor) * e.strompreis + (sz.einspeisung * ertragFaktor) * e.rueckliefer) / 100 - sz.unterhalt;
    const netto = sz.investition.total * nettoFaktor - einmalverguetung(kwp, sz.investition.total * nettoFaktor, a);
    return ers > 0 ? netto / ers : Infinity;
  };
  const jahreVon = amort(1 - spK, 1 + spE);
  const jahreBis = amort(1 + spK, 1 - spE);

  const monate = (e.region === 'alpen' ? a.monatsverteilung.wert.alpen : a.monatsverteilung.wert.flachland)
    .map((p) => (sz.ertrag.kwh * p) / 100);

  const hinweise = [];
  const abw = Math.abs((((e.azimut - 180) % 360) + 540) % 360 - 180);
  if (!leer && e.dach === 'schraeg' && abw >= 120) hinweise.push('nord');
  if (e.flaeche > 0 && sz.anlage.maxKwp < a.einmalverguetungMinKwp.wert) hinweise.push('klein');
  if (e.flaeche === 0) hinweise.push('leer');
  if (!leer && sz.ersparnis <= 0) hinweise.push('keineErsparnis');
  if (!leer && kwp > 30) hinweise.push('gross');
  if (!leer && e.dach === 'schraeg' && e.neigung < 10) hinweise.push('flachSchraeg');

  return {
    eingaben: e,
    leer,
    kwp,
    maxKwp: sz.anlage.maxKwp,
    module: sz.anlage.module,
    belegt: sz.anlage.belegt,
    richtungsFaktor: sz.ertrag.richtung,
    ertrag: { wert: kwhRunden(sz.ertrag.kwh), von: kwhRunden(sz.ertrag.kwh * (1 - spE)), bis: kwhRunden(sz.ertrag.kwh * (1 + spE)), roh: sz.ertrag.kwh },
    spezifisch: sz.ertrag.spezifisch,
    monate,
    verbrauch: sz.verbrauch,
    eigenverbrauchQuote: sz.eigenverbrauch.quote,
    autarkie: sz.eigenverbrauch.autarkie,
    eigenverbrauchKwh: sz.eigenverbrauch.kwh,
    einspeisungKwh: sz.einspeisung,
    ersparnis: { wert: chfRunden(sz.ersparnis), von: chfRunden(sz.ersparnis * (1 - spE)), bis: chfRunden(sz.ersparnis * (1 + spE)) },
    investition: { brutto: chfRunden(sz.investition.total), von: chfRunden(sz.investition.total * (1 - spK)), bis: chfRunden(sz.investition.total * (1 + spK)), anlage: sz.investition.anlage, speicher: sz.investition.speicher },
    eiv: chfRunden(sz.eiv),
    netto: chfRunden(sz.netto),
    unterhalt: chfRunden(sz.unterhalt),
    amortisation: leer || !Number.isFinite(jahreBis) ? null : { von: Math.max(1, Math.floor(jahreVon)), bis: Math.ceil(jahreBis) },
    verlauf: verlauf(sz, e, a),
    vergleich: {
      ohne: { autarkie: ohne.eigenverbrauch.autarkie, quote: ohne.eigenverbrauch.quote, ersparnis: chfRunden(ohne.ersparnis), netto: chfRunden(ohne.netto) },
      mit: { autarkie: mit.eigenverbrauch.autarkie, quote: mit.eigenverbrauch.quote, ersparnis: chfRunden(mit.ersparnis), netto: chfRunden(mit.netto), speicherKwh: e.speicherKwh }
    },
    hinweise
  };
}

/* ---------- Zustand in der Adresse ---------- */
const KURZ = {
  region: 'r', dach: 'd', neigung: 'n', flaeche: 'f', azimut: 'az', verschattung: 's', verbrauchArt: 'va', personen: 'p',
  verbrauch: 'v', waermepumpe: 'wp', eauto: 'ea', km: 'km', strompreis: 'sp', rueckliefer: 'rl', speicher: 'sk', speicherKwh: 'skw',
  groesseArt: 'ga', kwp: 'kwp'
};

export function zuParametern(e, a) {
  const s = standardEingaben(a);
  const p = new URLSearchParams();
  for (const [lang, kurz] of Object.entries(KURZ)) {
    if (e[lang] === s[lang]) continue;
    const v = e[lang];
    p.set(kurz, typeof v === 'boolean' ? (v ? '1' : '0') : typeof v === 'number' ? String(Math.round(v * 100) / 100) : v);
  }
  return p;
}

export function ausParametern(suche) {
  const p = suche instanceof URLSearchParams ? suche : new URLSearchParams(suche);
  const roh = {};
  for (const [lang, kurz] of Object.entries(KURZ)) if (p.has(kurz)) roh[lang] = p.get(kurz);
  return roh;
}
