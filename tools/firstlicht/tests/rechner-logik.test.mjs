// Tests der Rechner-Logik:  node --test tools/firstlicht/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as R from '../../../musterprojekte/firstlicht/assets/js/rechner-logik.js';

const A = JSON.parse(readFileSync(new URL('../../../musterprojekte/firstlicht/daten/annahmen.json', import.meta.url)));
const rechne = (e) => R.berechnen(e, A);

test('Annahmen: jeder Eintrag hat Wert, Einheit, Quelle, Datum und Status', () => {
  for (const [k, v] of Object.entries(A)) {
    if (k.startsWith('_')) continue;
    assert.ok('wert' in v, k + ' ohne wert');
    for (const f of ['einheit', 'quelle', 'abgerufen', 'status', 'hinweis']) assert.ok(v[f], `${k} ohne ${f}`);
    assert.match(v.quelle, /^https:\/\//, k);
    assert.ok(['verifiziert', 'nicht verifiziert'].includes(v.status), k);
  }
});

test('Monatsverteilungen ergeben 100 Prozent', () => {
  for (const liste of Object.values(A.monatsverteilung.wert)) {
    assert.equal(liste.length, 12);
    assert.ok(Math.abs(liste.reduce((s, x) => s + x, 0) - 100) < 0.01);
  }
});

test('Stichprobe: 10 kWp, Süd, 30 Grad, Mittelland ergibt 9000 bis 10000 kWh', () => {
  const r = rechne({ groesseArt: 'manuell', kwp: 10, flaeche: 200, azimut: 180, neigung: 30, region: 'mittelland' });
  assert.ok(Math.abs(r.kwp - 10) < 0.25, 'kWp ' + r.kwp);
  assert.ok(r.ertrag.wert >= 9000 && r.ertrag.wert <= 10000, 'Ertrag ' + r.ertrag.wert);
  assert.equal(r.ertrag.wert % 100, 0);
});

test('Standard: plausible Ergebnisse', () => {
  const r = rechne({});
  assert.ok(r.kwp > 7 && r.kwp < 9, 'kWp ' + r.kwp);           // 60 m² * 0.7 / 5 = 8.4
  assert.equal(r.module, Math.round(r.kwp / 0.44));
  assert.ok(r.belegt <= 60 * 0.7 + 0.01);
  assert.ok(r.autarkie > 0.25 && r.autarkie < 0.45, 'Autarkie ohne Speicher ' + r.autarkie);
  assert.ok(r.eigenverbrauchQuote > 0.1 && r.eigenverbrauchQuote < 0.4);
  assert.ok(r.ersparnis.wert > 0);
  // Amortisation: günstiger Fall innerhalb der Betrachtungsdauer, ungünstiger Fall darf darüber liegen (bis = null)
  assert.ok(r.amortisation && r.amortisation.von >= 8 && r.amortisation.von <= A.jahre.wert, JSON.stringify(r.amortisation));
  assert.ok(r.amortisation.bis === null || r.amortisation.bis > r.amortisation.von);
  assert.equal(r.investition.brutto % 50, 0);
  assert.equal(r.monate.length, 12);
  assert.ok(Math.abs(r.monate.reduce((s, x) => s + x, 0) - r.ertrag.roh) < 1);
});

test('Speicher erhöht Autarkie und Investition', () => {
  const ohne = rechne({ speicher: false });
  const mit = rechne({ speicher: true, speicherKwh: 10 });
  assert.ok(mit.autarkie > ohne.autarkie + 0.15, `${ohne.autarkie} -> ${mit.autarkie}`);
  assert.ok(mit.autarkie < 0.85);
  assert.ok(mit.investition.brutto > ohne.investition.brutto);
  assert.ok(mit.vergleich.mit.autarkie > mit.vergleich.ohne.autarkie);
});

test('Grenzfall: 0 m² ergibt leere Anlage ohne Fehler', () => {
  const r = rechne({ flaeche: 0 });
  assert.equal(r.leer, true);
  assert.equal(r.kwp, 0);
  assert.equal(r.module, 0);
  assert.equal(r.ertrag.wert, 0);
  assert.equal(r.amortisation, null);
  assert.ok(r.hinweise.includes('leer'));
  assert.ok(Number.isFinite(r.ersparnis.wert));
});

test('Grenzfall: 1 Person, kleine Fläche unter 2 kWp ohne Einmalvergütung', () => {
  const r = rechne({ personen: 1, flaeche: 12 });
  assert.ok(r.kwp < 2);
  assert.equal(r.eiv, 0);
  assert.ok(r.hinweise.includes('klein'));
});

test('Flachdach ignoriert Ausrichtung und nutzt eigene Belegung', () => {
  const a = rechne({ dach: 'flach', azimut: 0, flaeche: 100 });
  const b = rechne({ dach: 'flach', azimut: 180, flaeche: 100 });
  assert.equal(a.ertrag.wert, b.ertrag.wert);
  assert.ok(Math.abs(a.maxKwp - 100 * 0.6 / 5) < 1e-9);
  assert.ok(!a.hinweise.includes('nord'));
});

test('Nordausrichtung: deutlich weniger Ertrag und Hinweis', () => {
  const sued = rechne({ azimut: 180 });
  const nord = rechne({ azimut: 0 });
  assert.ok(nord.ertrag.roh < sued.ertrag.roh * 0.7);
  assert.ok(nord.hinweise.includes('nord'));
});

test('Ausrichtungsfaktor: Eckwerte und Symmetrie Ost/West', () => {
  assert.equal(R.ausrichtungsFaktor(30, 180, A), 1);
  assert.equal(R.ausrichtungsFaktor(0, 37, A), 0.87);
  assert.equal(R.ausrichtungsFaktor(30, 90, A), R.ausrichtungsFaktor(30, 270, A));
  const mitte = R.ausrichtungsFaktor(22.5, 180 - 22.5, A);
  assert.ok(mitte > 0.9 && mitte <= 1);
});

test('Extreme Strompreise werden begrenzt', () => {
  const hoch = rechne({ strompreis: 999 });
  const tief = rechne({ strompreis: -5 });
  assert.equal(hoch.eingaben.strompreis, A.strompreis.max);
  assert.equal(tief.eingaben.strompreis, A.strompreis.min);
  assert.ok(hoch.ersparnis.wert > tief.ersparnis.wert);
});

test('Sehr grosse Fläche: gestaffelte Einmalvergütung und Hinweis', () => {
  const r = rechne({ flaeche: 2000 });
  assert.ok(r.kwp > 100);
  assert.ok(r.hinweise.includes('gross'));
  const eiv = R.einmalverguetung(150, 1e9, A);
  assert.equal(eiv, 30 * 360 + 70 * 300 + 50 * 250);
});

test('Einmalvergütung höchstens 30 Prozent der Investition', () => {
  assert.equal(R.einmalverguetung(10, 10000, A), 3000);
  assert.equal(R.einmalverguetung(10, 100000, A), 3600);
  assert.equal(R.einmalverguetung(1.9, 100000, A), 0);
});

test('Ungültige Eingaben: NaN, Text, unbekannte Werte', () => {
  const r = rechne({ flaeche: 'abc', neigung: NaN, region: 'mond', personen: 99, azimut: 'x', verschattung: 'viel', km: -3 });
  const s = R.standardEingaben(A);
  assert.equal(r.eingaben.flaeche, s.flaeche);
  assert.equal(r.eingaben.neigung, s.neigung);
  assert.equal(r.eingaben.region, 'mittelland');
  assert.equal(r.eingaben.personen, 6);
  assert.equal(r.eingaben.verschattung, 'keine');
  assert.equal(r.eingaben.km, 0);
  assert.ok(Number.isFinite(r.ertrag.wert));
});

test('Zahlen mit Tausendertrennzeichen und Komma', () => {
  assert.equal(R.begrenzen("4'500", 0, 10000, 1), 4500);
  assert.equal(R.begrenzen('4’500', 0, 10000, 1), 4500);
  assert.equal(R.begrenzen('27,5', 0, 100, 1), 27.5);
});

test('Azimut wird auf 0 bis 359 normalisiert', () => {
  assert.equal(R.eingabenPruefen({ azimut: 360 }, A).azimut, 0);
  assert.equal(R.eingabenPruefen({ azimut: -45 }, A).azimut, 315);
  assert.equal(R.richtungName(225), 'Südwest');
  assert.equal(R.richtungName(350), 'Nord');
});

test('Wärmepumpe erhöht Verbrauch, aber Autarkie sinkt', () => {
  const ohne = rechne({});
  const mit = rechne({ waermepumpe: true });
  assert.ok(mit.verbrauch.total > ohne.verbrauch.total + 5000);
  assert.ok(mit.autarkie < ohne.autarkie);
  assert.ok(mit.eigenverbrauchKwh >= ohne.eigenverbrauchKwh);
});

test('Manuelle Grösse nie grösser als das Dach', () => {
  const r = rechne({ groesseArt: 'manuell', kwp: 50, flaeche: 40 });
  assert.ok(r.kwp <= 40 * 0.7 / 5 + 1e-9);
});

test('Verlauf über die Betrachtungsdauer mit Break-even', () => {
  const r = rechne({ eauto: true, waermepumpe: true });
  const v = r.verlauf;
  assert.equal(v.punkte.length, A.jahre.wert + 1);
  assert.ok(v.punkte[0].kumuliert < 0);
  assert.ok(v.breakEven > 5 && v.breakEven < A.jahre.wert, 'Break-even ' + v.breakEven);
  // Break-even liegt innerhalb der Amortisationsspanne
  assert.ok(v.breakEven >= r.amortisation.von && (r.amortisation.bis === null || v.breakEven <= r.amortisation.bis));
  // Degradation: Zuwachs nimmt ab
  const d1 = v.punkte[2].kumuliert - v.punkte[1].kumuliert;
  const d20 = v.punkte[21].kumuliert - v.punkte[20].kumuliert;
  assert.ok(d20 < d1);
});

test('Adresse: Hin- und Rückweg ergibt dieselben Eingaben', () => {
  const e = R.eingabenPruefen({ flaeche: 85, azimut: 225, speicher: true, strompreis: 31.5, waermepumpe: true, region: 'jura' }, A);
  const p = R.zuParametern(e, A);
  assert.ok(!p.has('n'), 'Standardwerte stehen nicht in der Adresse');
  const zurueck = R.eingabenPruefen(R.ausParametern(p.toString()), A);
  assert.deepEqual(zurueck, e);
});

test('Amortisation und Verlauf nach derselben Methode', () => {
  for (const x of [{}, { speicher: true }, { eauto: true, waermepumpe: true }, { flaeche: 100 }]) {
    const r = rechne(x);
    const be = r.verlauf.breakEven;
    if (be === null) assert.equal(r.amortisation.bis, null);
    else {
      assert.ok(r.amortisation.von !== null && be >= r.amortisation.von, JSON.stringify([x, be, r.amortisation]));
      assert.ok(r.amortisation.bis === null || be <= r.amortisation.bis);
    }
  }
});

test('Kleinstanlage ohne Einmalvergütung zahlt sich innerhalb der Betrachtungsdauer nicht aus', () => {
  const r = rechne({ flaeche: 12 });
  assert.ok(r.amortisation === null || (r.amortisation.von === null && r.amortisation.bis === null), JSON.stringify(r.amortisation));
});
