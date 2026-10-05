/* Firstlicht: gemeinsames Skript für alle Seiten
   Jede Aufgabe läuft für sich. Ein Fehler in einem Teil legt die anderen nicht lahm.
   Seitenteile (Szene, Rechner, Projekte ...) werden nur geladen, wenn die Seite sie enthält. */

import { bewegungAus, speicher } from './hilfen.js';

const sicher = (name, fn) => { try { fn(); } catch (e) { console.error(name + ':', e); } };
const html = document.documentElement;

/* 1. Theme: Tag und Nacht */
function themeEinrichten() {
  const knopf = document.querySelector('[data-theme-schalter]');
  if (!knopf) return;
  const metas = document.querySelectorAll('meta[name="theme-color"]');
  const setzen = (t, merken) => {
    html.setAttribute('data-theme', t);
    knopf.setAttribute('aria-label', t === 'dunkel' ? 'Helles Design einschalten' : 'Dunkles Design einschalten');
    knopf.setAttribute('aria-pressed', String(t === 'dunkel'));
    metas.forEach((m) => m.setAttribute('content', t === 'dunkel' ? '#0E1420' : '#F7F5F0'));
    if (merken) speicher.schreiben('firstlicht-theme', t);
  };
  setzen(html.getAttribute('data-theme') === 'dunkel' ? 'dunkel' : 'hell', false);
  knopf.addEventListener('click', () => setzen(html.getAttribute('data-theme') === 'dunkel' ? 'hell' : 'dunkel', true));
}

/* 2. Kopfzeile: kompakt beim Scrollen, weg beim Runterscrollen, zurück beim Hochscrollen */
function kopfEinrichten() {
  const kopf = document.querySelector('[data-kopf]');
  if (!kopf) return;
  let letzte = window.scrollY;
  let geplant = false;
  const pruefen = () => {
    geplant = false;
    const y = window.scrollY;
    kopf.classList.toggle('ist-kompakt', y > 8);
    const runter = y > letzte + 4;
    const hoch = y < letzte - 4;
    if (runter && y > 160 && !html.classList.contains('menue-offen')) kopf.classList.add('ist-weg');
    else if (hoch || y < 160) kopf.classList.remove('ist-weg');
    letzte = y;
  };
  window.addEventListener('scroll', () => { if (!geplant) { geplant = true; requestAnimationFrame(pruefen); } }, { passive: true });
  pruefen();
}

/* 3. Handy-Menü: Vollbild-Dialog mit Fokusfalle (nativ), Escape schliesst, Hintergrund scrollt nicht */
function menueEinrichten() {
  const link = document.querySelector('[data-menue-knopf]');
  const dialog = document.getElementById('menue');
  if (!link || !dialog || typeof dialog.showModal !== 'function') return;
  const knopf = document.createElement('button');
  knopf.type = 'button';
  knopf.className = link.className;
  knopf.innerHTML = link.innerHTML;
  knopf.setAttribute('aria-haspopup', 'dialog');
  knopf.setAttribute('aria-controls', 'menue');
  link.replaceWith(knopf);
  knopf.addEventListener('click', () => { dialog.showModal(); html.classList.add('menue-offen'); });
  dialog.addEventListener('close', () => { html.classList.remove('menue-offen'); });
  dialog.querySelector('[data-menue-zu]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target.closest('a')) dialog.close(); });
  window.matchMedia('(min-width: 64em)').addEventListener('change', (e) => { if (e.matches && dialog.open) dialog.close(); });
}

/* 4. Glossar: Popover mit Positionierung am Begriff, Rückfall ohne popover-Unterstützung */
function glossarEinrichten() {
  const knoepfe = document.querySelectorAll('.glossar[popovertarget]');
  if (!knoepfe.length) return;
  const kannPopover = typeof HTMLElement !== 'undefined' && 'popover' in HTMLElement.prototype;
  let ausloeser = null;
  const platzieren = (pop, btn) => {
    const r = btn.getBoundingClientRect();
    const b = pop.offsetWidth;
    const h = pop.offsetHeight;
    let left = Math.min(Math.max(12, r.left + r.width / 2 - b / 2), window.innerWidth - b - 12);
    let top = r.bottom + 10;
    if (top + h > window.innerHeight - 12) top = Math.max(12, r.top - h - 10);
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
  };
  knoepfe.forEach((btn) => {
    const pop = document.getElementById(btn.getAttribute('popovertarget'));
    if (!pop) return;
    btn.setAttribute('aria-expanded', 'false');
    if (!kannPopover) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const auf = !pop.classList.contains('ist-offen');
        document.querySelectorAll('.glossar-pop.ist-offen').forEach((p) => p.classList.remove('ist-offen'));
        pop.classList.toggle('ist-offen', auf);
        btn.setAttribute('aria-expanded', String(auf));
        if (auf) platzieren(pop, btn);
      });
    } else {
      btn.addEventListener('click', () => { ausloeser = btn; });
    }
  });
  if (kannPopover) {
    document.querySelectorAll('.glossar-pop').forEach((pop) => {
      pop.addEventListener('toggle', (e) => {
        const offen = e.newState === 'open';
        if (offen && ausloeser) platzieren(pop, ausloeser);
        document.querySelectorAll(`.glossar[popovertarget="${pop.id}"]`).forEach((b) => b.setAttribute('aria-expanded', String(offen && b === ausloeser)));
      });
    });
    window.addEventListener('scroll', () => document.querySelectorAll('.glossar-pop:popover-open').forEach((p) => p.hidePopover()), { passive: true });
  } else {
    document.addEventListener('click', () => document.querySelectorAll('.glossar-pop.ist-offen').forEach((p) => p.classList.remove('ist-offen')));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.querySelectorAll('.glossar-pop.ist-offen').forEach((p) => p.classList.remove('ist-offen')); });
  }
}

/* 5. Zähler: zählen hoch, sobald sie sichtbar werden. Im HTML steht der Endwert. */
function zaehlerEinrichten() {
  const alle = document.querySelectorAll('[data-zaehler]');
  if (!alle.length || bewegungAus() || !('IntersectionObserver' in window)) return;
  const fmt = new Intl.NumberFormat('de-CH');
  const io = new IntersectionObserver((eintraege) => {
    for (const e of eintraege) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      const el = e.target;
      const ziel = Number(el.dataset.zaehler);
      const start = performance.now();
      const dauer = 1300;
      const schritt = (jetzt) => {
        const p = Math.min(1, (jetzt - start) / dauer);
        const w = 1 - (1 - p) ** 3;
        el.textContent = fmt.format(Math.round(ziel * w));
        if (p < 1) requestAnimationFrame(schritt);
      };
      requestAnimationFrame(schritt);
    }
  }, { threshold: 0.6 });
  alle.forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) return; // schon sichtbar: stehen lassen
    el.textContent = '0';
    io.observe(el);
  });
}

/* 6. Einblenden: Rückfall, wo Scroll-getriebene Animationen fehlen */
function einblendenEinrichten() {
  if (bewegungAus() || (window.CSS && CSS.supports('animation-timeline: view()'))) return;
  const alle = document.querySelectorAll('.einblenden');
  if (!alle.length) return;
  const io = new IntersectionObserver((eintraege) => {
    for (const e of eintraege) if (e.isIntersecting) { e.target.classList.add('ist-da'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -10% 0px' });
  alle.forEach((el) => io.observe(el));
}

/* 7. Lichtschein auf Karten folgt dem Zeiger (nur mit Maus) */
function scheinEinrichten() {
  if (!window.matchMedia('(hover: hover)').matches || bewegungAus()) return;
  let geplant = null;
  document.addEventListener('pointermove', (e) => {
    const karte = e.target.closest && e.target.closest('.schein');
    if (!karte) return;
    geplant = { karte, x: e.clientX, y: e.clientY };
    requestAnimationFrame(() => {
      if (!geplant) return;
      const r = geplant.karte.getBoundingClientRect();
      geplant.karte.style.setProperty('--mx', `${geplant.x - r.left}px`);
      geplant.karte.style.setProperty('--my', `${geplant.y - r.top}px`);
      geplant = null;
    });
  }, { passive: true });
}

/* 8. Erklärmodus von ODERA: Code erst bei Bedarf laden */
function erklaerenEinrichten() {
  const schalter = document.querySelector('[data-erklaeren-schalter]');
  if (!schalter) return;
  let modul = null;
  const laden = () => (modul ||= import('./erklaermodus.js'));
  schalter.addEventListener('click', async () => {
    const an = schalter.getAttribute('aria-pressed') !== 'true';
    schalter.setAttribute('aria-pressed', String(an));
    const m = await laden();
    an ? m.einschalten() : m.ausschalten();
  });
  if (new URLSearchParams(location.search).get('erklaeren') === '1') {
    schalter.setAttribute('aria-pressed', 'true');
    laden().then((m) => m.einschalten({ start: true }));
  }
}

/* 9. Seitenteile nachladen */
function teileLaden() {
  const teile = [
    ['[data-szene]', './szene.js'],
    ['[data-mini-rechner]', './rechner-mini.js'],
    ['[data-rechner]', './rechner.js'],
    ['[data-baukasten]', './baukasten.js'],
    ['[data-projekte]', './projekte.js'],
    ['[data-formular]', './formular.js'],
    ['[data-vorher-nachher]', './vorher-nachher.js']
  ];
  for (const [wahl, pfad] of teile) {
    if (document.querySelector(wahl)) import(pfad).catch((e) => console.error(pfad, e));
  }
  // Monitoring erst laden, wenn es in die Nähe kommt
  const mon = document.querySelector('[data-monitoring]');
  if (mon) {
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { io.disconnect(); import('./monitoring.js').catch((err) => console.error(err)); }
    }, { rootMargin: '400px' });
    io.observe(mon);
  }
}

sicher('Theme', themeEinrichten);
sicher('Kopf', kopfEinrichten);
sicher('Menü', menueEinrichten);
sicher('Glossar', glossarEinrichten);
sicher('Zähler', zaehlerEinrichten);
sicher('Einblenden', einblendenEinrichten);
sicher('Schein', scheinEinrichten);
sicher('Erklärmodus', erklaerenEinrichten);
sicher('Teile', teileLaden);
