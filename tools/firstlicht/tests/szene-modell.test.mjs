// Tests des Szenen-Modells (Beispieltag)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../../../musterprojekte/firstlicht/assets/js/szene-modell.js';

test('Nachts keine Produktion, mittags am meisten', () => {
  for (const s of ['sommer', 'winter']) {
    assert.equal(M.zustandZu(5, 'winter').produktionKw, 0);
    assert.equal(M.zustandZu(22, s).produktionKw, 0);
    const mittag = M.zustandZu(13.5, s).produktionKw;
    assert.ok(mittag > M.zustandZu(10, s).produktionKw);
    assert.ok(mittag > M.zustandZu(16, s).produktionKw);
  }
});

test('Winter produziert weniger, Sonne steht tiefer', () => {
  const so = M.zustandZu(13, 'sommer');
  const wi = M.zustandZu(13, 'winter');
  assert.ok(wi.produktionKw < so.produktionKw / 2);
  assert.ok(wi.sonne.hoehe < so.sonne.hoehe / 2);
});

test('Energiebilanz geht in jedem Schritt auf', () => {
  for (const s of ['sommer', 'winter']) {
    for (const p of M.tagesverlauf(s)) {
      const f = p.f;
      const quellen = f.dachHaus + f.speicherHaus + f.netzHaus;
      assert.ok(Math.abs(quellen - p.haus) < 1e-9, `Haus ${s} ${p.t}`);
      const pv = f.dachHaus + f.dachAuto + f.dachSpeicher + f.dachNetz;
      assert.ok(Math.abs(pv - p.prod) < 1e-9, `PV ${s} ${p.t}`);
      for (const v of Object.values(f)) assert.ok(v >= -1e-12);
      assert.ok(p.ladestand >= 0 && p.ladestand <= 10 + 1e-9);
    }
  }
});

test('Speicher: lädt mittags, versorgt abends', () => {
  const morgen = M.zustandZu(9, 'sommer');
  const abend = M.zustandZu(21, 'sommer');
  assert.ok(M.zustandZu(15, 'sommer').speicherProzent > morgen.speicherProzent);
  assert.ok(abend.fluesse.speicherHaus > 0);
  assert.ok(M.zustandZu(13, 'sommer').netzKw < 0, 'Mittags Einspeisung');
  assert.ok(M.zustandZu(19, 'winter').netzKw > 0, 'Winterabend Netzbezug');
});

test('Ungültige Uhrzeit und Saison werden abgefangen', () => {
  assert.equal(M.zustandZu(NaN, 'x').uhrzeit, 12);
  assert.equal(M.zustandZu(99, 'sommer').uhrzeit, M.ZEIT_MAX);
  assert.equal(M.zustandZu(-3, 'sommer').uhrzeit, M.ZEIT_MIN);
  assert.equal(M.zustandZu(12, 'herbst').saison, 'sommer');
});

test('Uhrzeit als Text', () => {
  assert.equal(M.uhrzeitText(14.5), '14.30');
  assert.equal(M.uhrzeitText(5), '05.00');
  assert.equal(M.uhrzeitText(21.999), '22.00');
});
