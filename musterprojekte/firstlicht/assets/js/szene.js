/* Firstlicht: Tagesverlauf-Szene im Hero
   - Regler Tageszeit, Play/Pause, Sommer/Winter
   - einmalige Startsequenz (höchstens 6 s), danach steht die Szene
   - fliessende Linien nur, solange sich die Zeit bewegt, plus kurzes Ausklingen
   - pausiert ausserhalb des Bildschirms und bei verstecktem Tab
   - reduzierte Bewegung: keine Sequenz, keine fliessenden Linien */

import { zustandZu, uhrzeitText, uhrzeitBegrenzen, SAISONS, ZEIT_MIN, ZEIT_MAX } from './szene-modell.js';

const zahl1 = new Intl.NumberFormat('de-CH', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const ganz = new Intl.NumberFormat('de-CH', { maximumFractionDigits: 0 });

/* Farben des Himmels: Nacht, Dämmerung, Tag (Sommer und Winter) */
const FARBEN = {
  nacht: { h1: [11, 17, 28], h2: [28, 39, 64], hh: [24, 33, 52], hv: [18, 26, 41], boden: [14, 20, 32] },
  daemmerung: { h1: [54, 64, 106], h2: [255, 159, 90] },
  sommer: { h1: [92, 152, 212], h2: [220, 232, 245], hh: [140, 164, 182], hv: [104, 130, 150], boden: [86, 110, 104] },
  winter: { h1: [148, 176, 204], h2: [232, 238, 244], hh: [178, 192, 206], hv: [206, 216, 226], boden: [234, 239, 244] }
};
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const rgb = (c) => `rgb(${c[0]} ${c[1]} ${c[2]})`;

export function szeneStarten(wurzel) {
  const svg = wurzel.querySelector('.szene__svg');
  const regler = wurzel.querySelector('[data-szene-zeit]');
  const play = wurzel.querySelector('[data-szene-play]');
  const saisonFeld = wurzel.querySelector('[data-szene-saison]');
  const ansage = wurzel.querySelector('[data-szene-ansage]');
  const sonne = svg.querySelector('.szene__sonne');
  const stand = svg.querySelector('.szene__speicher-stand');
  const fluesse = [...svg.querySelectorAll('[data-fluss]')];
  const werte = {};
  wurzel.querySelectorAll('[data-wert]').forEach((el) => { werte[el.dataset.wert] = el; });
  const ruhig = window.matchMedia('(prefers-reduced-motion: reduce)');

  let saison = 'sommer';
  let zeit = Number(regler.value) || 12;
  let laeuft = false;          // Play aktiv
  let sichtbar = true;
  let rafId = 0;
  let letzteZeit = 0;
  let flussBis = 0;            // bis wann die Linien fliessen
  let versatz = 0;
  let ziel = null;             // Startsequenz: { von, bis, start, dauer }
  let ansageTimer = 0;
  let aktuell = null;

  function zeichnen() {
    const z = zustandZu(zeit, saison);
    aktuell = z;
    const s = SAISONS[saison];
    const tag = z.tageslicht;
    // Dämmerung: stark in der Stunde um Auf- und Untergang
    const naehe = Math.min(Math.abs(zeit - s.aufgang), Math.abs(zeit - s.untergang));
    const daemmer = Math.max(0, 1 - naehe / 1.3) * 0.85;
    const f = FARBEN[saison];
    const n = FARBEN.nacht;
    let h1 = mix(n.h1, f.h1, tag);
    let h2 = mix(n.h2, f.h2, tag);
    h1 = mix(h1, FARBEN.daemmerung.h1, daemmer * 0.6);
    h2 = mix(h2, FARBEN.daemmerung.h2, daemmer);
    const st = svg.style;
    st.setProperty('--sz-h1', rgb(h1));
    st.setProperty('--sz-h2', rgb(h2));
    st.setProperty('--sz-hh', rgb(mix(n.hh, f.hh, tag)));
    st.setProperty('--sz-hv', rgb(mix(n.hv, f.hv, tag)));
    st.setProperty('--sz-boden', rgb(mix(n.boden, f.boden, tag)));
    st.setProperty('--sz-nacht', String(1 - tag));
    st.setProperty('--sz-tag', String(tag));
    // Erstes Licht auf dem First: leuchtet kurz nach Sonnenaufgang auf
    const nachAufgang = zeit - s.aufgang;
    const first = nachAufgang > -0.3 && nachAufgang < 1.6 ? Math.sin(Math.PI * (nachAufgang + 0.3) / 1.9) : 0;
    st.setProperty('--sz-first', first.toFixed(3));

    // Sonne auf dem Bogen. Winter: Bogen tiefer und kürzer
    const scheitel = saison === 'winter' ? 236 : 70;
    const x = 40 + 880 * z.sonne.anteil;
    const y = z.sonne.sichtbar ? 480 - (480 - scheitel) * Math.sin(Math.PI * z.sonne.anteil) : 520;
    sonne.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    sonne.style.opacity = z.sonne.sichtbar ? '1' : '0';

    stand.style.transform = `scaleY(${Math.max(0.04, z.speicherProzent / 100).toFixed(3)})`;

    for (const p of fluesse) {
      const kw = z.fluesse[p.dataset.fluss] || 0;
      const an = kw > 0.05;
      p.style.opacity = an ? '1' : '0';
      p.style.strokeWidth = an ? (2.5 + Math.min(kw, 6) * 0.9).toFixed(2) : '0';
      p.dataset.kw = kw.toFixed(2);
    }

    // Werte
    werte.uhrzeit.textContent = uhrzeitText(zeit);
    werte.produktion.textContent = zahl1.format(z.produktionKw);
    werte.verbrauch.textContent = zahl1.format(z.verbrauchKw);
    werte.speicher.textContent = ganz.format(z.speicherProzent);
    const bezug = z.netzKw > 0.05;
    werte['netz-label'].textContent = bezug ? 'Netzbezug' : z.netzKw < -0.05 ? 'Einspeisung' : 'Netz';
    werte.netz.textContent = zahl1.format(Math.abs(z.netzKw));
    regler.value = String(zeit);
    regler.setAttribute('aria-valuetext', sprechText(z));
    regler.style.setProperty('--fuellung', `${((zeit - ZEIT_MIN) / (ZEIT_MAX - ZEIT_MIN)) * 100}%`);
  }

  function sprechText(z) {
    const netz = z.netzKw > 0.05 ? `Netzbezug ${zahl1.format(z.netzKw)} kW`
      : z.netzKw < -0.05 ? `Einspeisung ${zahl1.format(-z.netzKw)} kW` : 'kein Netzbezug';
    return `${uhrzeitText(z.uhrzeit)} Uhr, Produktion ${zahl1.format(z.produktionKw)} kW, ` +
      `Verbrauch ${zahl1.format(z.verbrauchKw)} kW, Speicher ${z.speicherProzent} Prozent, ${netz}`;
  }

  // Ansage gedrosselt: erst wenn sich der Wert eine Weile nicht mehr ändert
  function ansagen() {
    clearTimeout(ansageTimer);
    ansageTimer = setTimeout(() => { if (aktuell && !laeuft && !ziel) ansage.textContent = sprechText(aktuell) + '.'; }, 900);
  }

  function schleife(jetzt) {
    rafId = 0;
    const dt = letzteZeit ? Math.min(0.05, (jetzt - letzteZeit) / 1000) : 0;
    letzteZeit = jetzt;
    if (ziel) {
      const p = Math.max(0, Math.min(1, (jetzt - ziel.start) / ziel.dauer));
      const e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
      zeit = ziel.von + (ziel.bis - ziel.von) * e;
      flussBis = jetzt + 2500;
      if (p >= 1) ziel = null; // Startsequenz: keine Ansage, niemand hat etwas ausgelöst
      zeichnen();
    } else if (laeuft) {
      zeit += dt * 1.4; // 1.4 Stunden pro Sekunde, ganzer Tag in rund 12 s
      if (zeit >= ZEIT_MAX) { zeit = ZEIT_MAX; laeuftSetzen(false); ansagen(); }
      flussBis = jetzt + 2500;
      zeichnen();
    }
    // Linien fliessen lassen
    if (!ruhig.matches && jetzt < flussBis) {
      versatz -= dt * 40;
      for (const p of fluesse) p.style.strokeDashoffset = (versatz * (0.5 + Math.min(Number(p.dataset.kw) || 0, 6) * 0.25)).toFixed(1);
    }
    if (sichtbar && (ziel || laeuft || (!ruhig.matches && jetzt < flussBis))) anstossen();
    else letzteZeit = 0;
  }

  function anstossen() {
    if (!rafId && sichtbar && !document.hidden) rafId = requestAnimationFrame(schleife);
  }

  function laeuftSetzen(an) {
    laeuft = an;
    play.setAttribute('aria-label', an ? 'Tagesverlauf anhalten' : 'Tagesverlauf abspielen');
    play.querySelector('use').setAttribute('href', an ? '#i-pause' : '#i-play');
    play.setAttribute('aria-pressed', String(an));
    if (an) { ziel = null; if (zeit >= ZEIT_MAX - 0.01) zeit = ZEIT_MIN; anstossen(); }
  }

  regler.addEventListener('input', () => {
    ziel = null;
    if (laeuft) laeuftSetzen(false);
    zeit = uhrzeitBegrenzen(regler.value);
    flussBis = performance.now() + 2500;
    zeichnen();
    anstossen();
    // Keine Live-Ansage: der Regler meldet seinen Wert selbst über aria-valuetext
  });

  play.addEventListener('click', () => {
    if (ruhig.matches) {
      // Ohne Bewegung: in Zwei-Stunden-Schritten weiter
      zeit = zeit >= ZEIT_MAX ? ZEIT_MIN : Math.min(ZEIT_MAX, zeit + 2);
      zeichnen();
      ansagen();
      return;
    }
    laeuftSetzen(!laeuft);
  });

  saisonFeld.addEventListener('change', (e) => {
    if (e.target.name !== 'saison') return;
    saison = e.target.value === 'winter' ? 'winter' : 'sommer';
    wurzel.dataset.saison = saison;
    flussBis = performance.now() + 2500;
    zeichnen();
    anstossen();
    ansagen();
  });

  // Nur arbeiten, wenn die Szene sichtbar ist
  const io = new IntersectionObserver(([eintrag]) => {
    sichtbar = eintrag.isIntersecting;
    if (sichtbar) anstossen(); else if (rafId) { cancelAnimationFrame(rafId); rafId = 0; letzteZeit = 0; }
  });
  io.observe(wurzel);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && rafId) { cancelAnimationFrame(rafId); rafId = 0; letzteZeit = 0; } else anstossen();
  });

  wurzel.classList.add('ist-bereit');
  // Startsequenz: einmal vom Morgen in den Nachmittag, höchstens 6 Sekunden
  if (!ruhig.matches) {
    zeit = 5.5;
    zeichnen();
    ziel = { von: 5.5, bis: 14, start: performance.now() + 400, dauer: 5200 };
    anstossen();
  } else {
    zeichnen();
  }
}

const wurzel = document.querySelector('[data-szene]');
if (wurzel) {
  try { szeneStarten(wurzel); } catch (e) { console.error('Szene:', e); }
}
