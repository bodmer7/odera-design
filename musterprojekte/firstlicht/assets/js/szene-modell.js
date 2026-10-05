/* Firstlicht: Modell der Tagesverlauf-Szene (Beispieltag, vereinfacht)
   Reine Funktionen ohne DOM. Getestet in tools/firstlicht/tests/szene-modell.test.mjs.

   Annahmen des Beispieltags (keine Rechnergrundlage, nur zur Veranschaulichung):
   - Einfamilienhaus mit 10 kWp Anlage, Speicher 10 kWh, Wallbox mit Überschussladen
   - Produktion als Glockenkurve zwischen Sonnenauf- und -untergang
   - Verbrauch mit Morgen- und Abendspitze, im Winter zusätzlich Wärmepumpe
   - Speicher lädt nur aus Überschuss und entlädt bis auf eine Reserve */

export const SAISONS = {
  sommer: {
    aufgang: 5.6, untergang: 21.4,   // Uhrzeit dezimal, Mittelland um den 21. Juni
    spitzeKw: 7.2,                    // Spitzenleistung an einem klaren Tag
    sonnenhoeheMax: 66,               // Grad über dem Horizont am Mittag (47.4° Nord)
    waermepumpeKw: 0.15,              // nur Warmwasser
    autoKw: 2.3, autoVon: 10.5, autoBis: 14.5, // Überschussladen
    speicherStart: 0.45               // Ladestand um Mitternacht
  },
  winter: {
    aufgang: 8.1, untergang: 16.7,
    spitzeKw: 2.4,
    sonnenhoeheMax: 19,
    waermepumpeKw: 1.1,
    autoKw: 0, autoVon: 0, autoBis: 0,
    speicherStart: 0.2
  }
};

export const ANLAGE = {
  speicherKwh: 10,
  speicherReserve: 0.1,   // Anteil, der für Notfälle bleibt
  ladeleistungKw: 5,
  schrittH: 1 / 12        // Rechenschritt 5 Minuten
};

export const ZEIT_MIN = 5;
export const ZEIT_MAX = 22;

const glocke = (t, mitte, breite) => Math.exp(-((t - mitte) ** 2) / (2 * breite ** 2));

/* Begrenzt die Uhrzeit auf den Bereich der Szene, fängt NaN ab */
export function uhrzeitBegrenzen(uhrzeit) {
  const t = Number(uhrzeit);
  if (!Number.isFinite(t)) return 12;
  return Math.min(ZEIT_MAX, Math.max(ZEIT_MIN, t));
}

export function saisonVon(saison) {
  return saison === 'winter' ? 'winter' : 'sommer';
}

/* Anteil des Tagbogens (0 bei Aufgang, 1 bei Untergang), ausserhalb null */
export function tagAnteil(t, s) {
  if (t <= s.aufgang || t >= s.untergang) return null;
  return (t - s.aufgang) / (s.untergang - s.aufgang);
}

export function produktionKw(t, saison) {
  const s = SAISONS[saisonVon(saison)];
  const x = tagAnteil(t, s);
  if (x === null) return 0;
  return s.spitzeKw * Math.sin(Math.PI * x) ** 1.5;
}

/* Haushalt ohne Auto: Grundlast, Frühstück, Mittag, Abend */
export function haushaltKw(t, saison) {
  const s = SAISONS[saisonVon(saison)];
  const grund = 0.3;
  const spitzen = 1.3 * glocke(t, 7, 0.7) + 0.7 * glocke(t, 12.3, 0.8) + 1.8 * glocke(t, 19, 1.4);
  // Wärmepumpe läuft vor allem morgens und abends
  const wp = s.waermepumpeKw * (0.5 + 0.5 * glocke(t, 6.5, 2) + 0.5 * glocke(t, 20, 2.5));
  return grund + spitzen + wp;
}

export function autoKw(t, saison) {
  const s = SAISONS[saisonVon(saison)];
  return t >= s.autoVon && t < s.autoBis ? s.autoKw : 0;
}

/* Einen Schritt der Energiebilanz rechnen. Positive Netzleistung heisst Bezug, negative Einspeisung. */
export function bilanz(prod, haus, auto, ladestandKwh) {
  const a = ANLAGE;
  const min = a.speicherKwh * a.speicherReserve;
  // Auto lädt nur aus Überschuss: höchstens, was nach dem Haus übrig ist
  const autoIst = Math.min(auto, Math.max(0, prod - haus));
  const bedarf = haus + autoIst;
  const f = { dachHaus: 0, dachAuto: autoIst, dachSpeicher: 0, dachNetz: 0, speicherHaus: 0, netzHaus: 0 };
  f.dachHaus = Math.min(prod, haus);
  const ueberschuss = prod - bedarf;
  if (ueberschuss > 0) {
    const platz = (a.speicherKwh - ladestandKwh) / a.schrittH;
    f.dachSpeicher = Math.max(0, Math.min(ueberschuss, a.ladeleistungKw, platz));
    f.dachNetz = ueberschuss - f.dachSpeicher;
  } else {
    const fehlt = -ueberschuss;
    const vorrat = Math.max(0, ladestandKwh - min) / a.schrittH;
    f.speicherHaus = Math.min(fehlt, a.ladeleistungKw, vorrat);
    f.netzHaus = fehlt - f.speicherHaus;
  }
  return f;
}

/* Ganzer Tag in 5-Minuten-Schritten, einmal pro Saison gerechnet */
const verlaufCache = {};
export function tagesverlauf(saison) {
  const key = saisonVon(saison);
  if (verlaufCache[key]) return verlaufCache[key];
  const s = SAISONS[key];
  const a = ANLAGE;
  const schritte = Math.round(24 / a.schrittH);
  let ladestand = a.speicherKwh * s.speicherStart;
  const punkte = [];
  for (let i = 0; i <= schritte; i++) {
    const t = i * a.schrittH;
    const prod = produktionKw(t, key);
    const haus = haushaltKw(t, key);
    const f = bilanz(prod, haus, autoKw(t, key), ladestand);
    punkte.push({ t, prod, haus, ladestand, f });
    ladestand += (f.dachSpeicher - f.speicherHaus) * a.schrittH;
    ladestand = Math.min(a.speicherKwh, Math.max(0, ladestand));
  }
  verlaufCache[key] = punkte;
  return punkte;
}

/* Zustand zu einer Uhrzeit: alles, was die Szene zum Zeichnen und Ansagen braucht */
export function zustandZu(uhrzeit, saison) {
  const key = saisonVon(saison);
  const t = uhrzeitBegrenzen(uhrzeit);
  const s = SAISONS[key];
  const verlauf = tagesverlauf(key);
  const p = verlauf[Math.round(t / ANLAGE.schrittH)];
  const f = p.f;
  const x = tagAnteil(t, s);
  const verbrauch = p.haus + f.dachAuto;
  return {
    uhrzeit: t,
    saison: key,
    produktionKw: p.prod,
    verbrauchKw: verbrauch,
    autoKw: f.dachAuto,
    speicherProzent: Math.round((p.ladestand / ANLAGE.speicherKwh) * 100),
    speicherKw: f.dachSpeicher - f.speicherHaus,      // positiv: lädt
    netzKw: f.netzHaus - f.dachNetz,                  // positiv: Bezug, negativ: Einspeisung
    solaranteil: verbrauch > 0 ? Math.min(1, (f.dachHaus + f.dachAuto + f.speicherHaus) / verbrauch) : 0,
    fluesse: f,
    sonne: x === null
      ? { sichtbar: false, anteil: t < s.aufgang ? 0 : 1, hoehe: 0 }
      : { sichtbar: true, anteil: x, hoehe: s.sonnenhoeheMax * Math.sin(Math.PI * x) },
    tageslicht: tageslicht(t, s)
  };
}

/* 0 = Nacht, 1 = voller Tag. Weicher Übergang rund um Auf- und Untergang */
export function tageslicht(t, s) {
  const d = 0.9; // Dämmerung in Stunden
  if (t <= s.aufgang - d || t >= s.untergang + d) return 0;
  if (t >= s.aufgang + d && t <= s.untergang - d) return 1;
  if (t < s.aufgang + d) return (t - (s.aufgang - d)) / (2 * d);
  return ((s.untergang + d) - t) / (2 * d);
}

/* Uhrzeit dezimal zu «14.30» */
export function uhrzeitText(t) {
  const h = Math.floor(t);
  const m = Math.round((t - h) * 60);
  const hh = m === 60 ? h + 1 : h;
  const mm = m === 60 ? 0 : m;
  return `${String(hh).padStart(2, '0')}.${String(mm).padStart(2, '0')}`;
}
