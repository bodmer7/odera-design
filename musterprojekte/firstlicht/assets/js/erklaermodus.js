/* ODERA-Erklärmodus: nummerierte Markierungen erklären KMU-Inhabern, was an dieser Beispielseite besonders ist.
   Eigene Ebene in ODERA-Farben, getrennt von Firstlicht. Wird erst beim Einschalten geladen. */

const TEXTE = {
  ladezeit: ['Schnell geladen', 'Diese Seite holt nichts von fremden Servern und braucht darum kein Cookie-Banner. Schnelle Seiten verlieren weniger Besucher, und so baut ODERA jede Website.'],
  szene: ['Interaktive Erklär-Grafik', 'Die Tagesverlauf-Szene zeigt in Sekunden, was eine Solaranlage den ganzen Tag tut. So eine Grafik für Ihr Produkt ist eine individuelle Erweiterung, Preis nach Aufwand.'],
  barrierefrei: ['Für alle bedienbar', 'Regler, Kompass und Schalter funktionieren auch mit Tastatur und Screenreader. ODERA prüft das bei jeder Website mit automatischen Tests.'],
  zaehler: ['Zahlen, die wirken', 'Kennzahlen zählen hoch, sobald man sie sieht, und machen Erfahrung greifbar. Lässt sich in jede ODERA-Website einbauen.'],
  minirechner: ['Mini-Rechner', 'Zwei Regler, sofort ein Ergebnis: Das holt Unentschlossene ab und führt zur Anfrage. Ein Rechner für Ihre Branche ist eine individuelle Erweiterung, Preis nach Aufwand.'],
  glossar: ['Fachbegriffe erklärt', 'Unterstrichene Begriffe öffnen eine kurze Erklärung. So verstehen auch Laien Ihr Angebot, ohne die Seite zu verlassen.'],
  theme: ['Tag und Nacht', 'Die Seite folgt der Einstellung des Geräts und merkt sich Ihre Wahl. ODERA richtet das auf Wunsch für Ihre Website ein.'],
  rechner: ['Rechner mit offenen Annahmen', 'Ein Rechner, der jede Zahl belegt, schafft Vertrauen und liefert vorbereitete Anfragen. Für Ihre Branche umgesetzt ist das eine individuelle Erweiterung, Preis nach Aufwand.'],
  teilen: ['Teilen, drucken, übernehmen', 'Das Ergebnis lässt sich als Link teilen, als PDF drucken und direkt ins Anfrageformular übernehmen. So geht keine Angabe verloren.'],
  baukasten: ['Konfigurator', 'Kunden stellen ihr Angebot selbst zusammen und sehen sofort den Nutzen. Individuelle Erweiterung, Preis nach Aufwand.'],
  monitoring: ['Produkt zum Anfassen', 'Eine kleine Demo zeigt, wie Ihr Produkt im Alltag aussieht, mit klar markierten Beispieldaten. Individuelle Erweiterung, Preis nach Aufwand.'],
  filter: ['Referenzen mit Filter', 'Referenzen gehören ab Paket Standard dazu. Filter, teilbare Links und Detailansicht wie hier sind eine Erweiterung.'],
  formular: ['Formular in drei Schritten', 'Kurze Schritte, klare Fehlermeldungen und ein Terminwunsch bringen mehr vollständige Anfragen. Erweiterte Formulare und Terminbuchung gehören zum Paket Pro.'],
  zeitleiste: ['Ablauf mit Dauern', 'Wer weiss, was ihn erwartet, fragt eher an. Eine Seite zu Ablauf und Leistungen gehört ab Paket Standard dazu.'],
  stellen: ['Offene Stellen', 'Ein eigener Bereich für Stelleninserate gehört zum Paket Pro. So finden Sie Fachkräfte über die eigene Website.']
};

const CHECK = '/projekt-check/?quelle=firstlicht';
let ebene = null;
let panel = null;
let blase = null;
let ziele = [];
let aktiv = -1;
let geplant = false;
let ro = null;

function cssLaden() {
  if (document.getElementById('erklaeren-css')) return;
  const link = document.createElement('link');
  link.id = 'erklaeren-css';
  link.rel = 'stylesheet';
  link.href = new URL('../css/erklaeren.css', import.meta.url).href;
  document.head.append(link);
}

function sichtbar(el) {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
}

function platzieren() {
  geplant = false;
  ziele.forEach((z) => {
    if (!sichtbar(z.el)) { z.marke.hidden = true; return; }
    const r = z.el.getBoundingClientRect();
    z.marke.hidden = false;
    z.marke.style.left = `${Math.max(4, r.left + window.scrollX - 14)}px`;
    z.marke.style.top = `${Math.max(4, r.top + window.scrollY - 14)}px`;
  });
  if (blase && aktiv >= 0) blasePlatzieren(ziele[aktiv]);
}
const neuPlatzieren = () => { if (!geplant) { geplant = true; requestAnimationFrame(platzieren); } };

function blasePlatzieren(z) {
  const m = z.marke.getBoundingClientRect();
  const b = blase.getBoundingClientRect();
  let left = m.left + window.scrollX;
  left = Math.min(left, window.scrollX + document.documentElement.clientWidth - b.width - 12);
  left = Math.max(window.scrollX + 12, left);
  let top = m.bottom + window.scrollY + 10;
  blase.style.left = `${left}px`;
  blase.style.top = `${top}px`;
}

function blaseZu(fokusZurueck = true) {
  if (!blase) return;
  const z = ziele[aktiv];
  blase.remove();
  blase = null;
  if (z) z.marke.setAttribute('aria-expanded', 'false');
  if (fokusZurueck && z) z.marke.focus();
  aktiv = -1;
}

function blaseAuf(i) {
  blaseZu(false);
  const z = ziele[i];
  if (!z) return;
  aktiv = i;
  const [titel, text] = TEXTE[z.id];
  blase = document.createElement('div');
  blase.className = 'erklaer-blase';
  blase.setAttribute('role', 'dialog');
  blase.setAttribute('aria-labelledby', 'erklaer-blase-titel');
  const letzte = i === ziele.length - 1;
  blase.innerHTML = `<p class="erklaer-blase__nr">ODERA erklärt · ${i + 1} von ${ziele.length}</p>
    <h2 id="erklaer-blase-titel"></h2><p class="erklaer-blase__text"></p>
    <div class="erklaer-blase__knoepfe">
      ${letzte ? `<a class="erklaer-knopf erklaer-knopf--lime" href="${CHECK}" target="_top">So eine Seite für Ihren Betrieb</a>` : '<button type="button" class="erklaer-knopf erklaer-knopf--lime" data-weiter>Nächste Stelle</button>'}
      <button type="button" class="erklaer-knopf" data-zu>Schliessen</button>
    </div>`;
  blase.querySelector('h2').textContent = titel;
  blase.querySelector('.erklaer-blase__text').textContent = text;
  ebene.append(blase);
  z.marke.setAttribute('aria-expanded', 'true');
  blasePlatzieren(z);
  const reduziert = matchMedia('(prefers-reduced-motion: reduce)').matches;
  z.el.scrollIntoView({ block: 'center', behavior: reduziert ? 'auto' : 'smooth' });
  setTimeout(() => { if (blase) { blasePlatzieren(z); blase.querySelector('h2').tabIndex = -1; blase.querySelector('h2').focus({ preventScroll: true }); } }, reduziert ? 0 : 450);
  blase.addEventListener('click', (e) => {
    if (e.target.closest('[data-weiter]')) blaseAuf(i + 1);
    else if (e.target.closest('[data-zu]')) blaseZu();
  });
}

function panelBauen() {
  panel = document.createElement('aside');
  panel.className = 'erklaer-panel';
  panel.setAttribute('aria-labelledby', 'erklaer-panel-titel');
  panel.innerHTML = `<p class="erklaer-panel__marke">ODERA Design</p>
    <h2 id="erklaer-panel-titel">Was ist hier besonders?</h2>
    <p>${ziele.length} Stellen auf dieser Seite sind nummeriert.</p>
    <div class="erklaer-panel__knoepfe">
      <button type="button" class="erklaer-knopf erklaer-knopf--lime" data-rundgang>Rundgang starten</button>
      <button type="button" class="erklaer-knopf" data-liste aria-expanded="false" aria-controls="erklaer-liste">Alle Stellen</button>
    </div>
    <ol class="erklaer-panel__liste" id="erklaer-liste" hidden></ol>
    <p class="erklaer-panel__fuss"><a href="${CHECK}" target="_top">Projekt-Check auf odera.ch</a> · <button type="button" data-aus>Ausblenden</button></p>`;
  panel.querySelector('[data-rundgang]').addEventListener('click', () => blaseAuf(0));
  panel.querySelector('[data-liste]').addEventListener('click', (e) => {
    const l = panel.querySelector('#erklaer-liste');
    l.hidden = !l.hidden;
    e.currentTarget.setAttribute('aria-expanded', String(!l.hidden));
  });
  const ol = panel.querySelector('ol');
  ziele.forEach((z, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = TEXTE[z.id][0];
    b.addEventListener('click', () => blaseAuf(i));
    li.append(b);
    ol.append(li);
  });
  panel.querySelector('[data-aus]').addEventListener('click', () => {
    const s = document.querySelector('[data-erklaeren-schalter]');
    if (s) s.setAttribute('aria-pressed', 'false');
    ausschalten();
    if (s) s.focus();
  });
  ebene.append(panel);
}

// Interne Links behalten den Modus, damit man auf der nächsten Seite weiterlesen kann
function linksSetzen(an) {
  document.querySelectorAll('a[href$=".html"], a[href*=".html?"], a[href*=".html#"]').forEach((a) => {
    const url = new URL(a.getAttribute('href'), location.href);
    if (url.origin !== location.origin || !url.pathname.includes('/firstlicht/')) return;
    if (an) url.searchParams.set('erklaeren', '1'); else url.searchParams.delete('erklaeren');
    a.setAttribute('href', url.pathname.split('/').pop() + url.search + url.hash);
  });
}

function adresseSetzen(an) {
  const p = new URLSearchParams(location.search);
  if (an) p.set('erklaeren', '1'); else p.delete('erklaeren');
  history.replaceState(history.state, '', location.pathname + (p.toString() ? `?${p}` : '') + location.hash);
}

export function einschalten({ start = false } = {}) {
  if (ebene) return;
  cssLaden();
  ebene = document.createElement('div');
  ebene.className = 'erklaer-ebene';
  ziele = [...document.querySelectorAll('[data-erklaeren]')].filter((el) => TEXTE[el.dataset.erklaeren]).map((el, i) => {
    const marke = document.createElement('button');
    marke.type = 'button';
    marke.className = 'erklaer-marke';
    marke.textContent = String(i + 1);
    marke.setAttribute('aria-label', `Erklärung ${i + 1}: ${TEXTE[el.dataset.erklaeren][0]}`);
    marke.setAttribute('aria-expanded', 'false');
    ebene.append(marke);
    el.classList.add('ist-erklaert');
    return { id: el.dataset.erklaeren, el, marke };
  });
  ziele.forEach((z, i) => z.marke.addEventListener('click', () => (aktiv === i ? blaseZu() : blaseAuf(i))));
  document.body.append(ebene);
  panelBauen();
  platzieren();
  window.addEventListener('resize', neuPlatzieren);
  window.addEventListener('scroll', neuPlatzieren, { passive: true });
  ro = new ResizeObserver(neuPlatzieren);
  ro.observe(document.body);
  document.addEventListener('keydown', taste);
  linksSetzen(true);
  adresseSetzen(true);
  if (start) panel.querySelector('h2').setAttribute('tabindex', '-1');
}

function taste(e) {
  if (e.key === 'Escape' && blase) { e.stopPropagation(); blaseZu(); }
}

export function ausschalten() {
  if (!ebene) return;
  blaseZu(false);
  ebene.remove();
  ebene = null;
  panel = null;
  ziele.forEach((z) => z.el.classList.remove('ist-erklaert'));
  ziele = [];
  window.removeEventListener('resize', neuPlatzieren);
  window.removeEventListener('scroll', neuPlatzieren);
  if (ro) { ro.disconnect(); ro = null; }
  document.removeEventListener('keydown', taste);
  linksSetzen(false);
  adresseSetzen(false);
}
