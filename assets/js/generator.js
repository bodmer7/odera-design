// Live-Vorschau auf der Musterprojekte-Seite: «Sehen Sie Ihren Betrieb in zehn Sekunden».
// Läuft ganz im Browser. Nichts wird gespeichert oder an einen Server gesendet.
// index.html lädt das Modul erst, wenn der Abschnitt in die Nähe des Bildschirms kommt (generatorBeobachten).

// Linien-Icons für den Info-Streifen und das Schloss in der Adressleiste
const ICON = {
  uhr: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  pin: '<path d="M12 21s6.5-6 6.5-11a6.5 6.5 0 0 0-13 0c0 5 6.5 11 6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>',
  schloss: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
};
const svg = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICON[n]}</svg>`;

// Branchen. {Name} = Firmenname. Text in [eckigen Klammern] erscheint nur, wenn ein Ort eingegeben ist.
// check: Antwort im Projekt-Check (Frage «Branche»), nur zum Vorausfüllen.
const BRANCHEN = [
  { k: 'handwerk', label: 'Handwerk', beispiel: 'Schreinerei Huber', akzent: '#B4541F',
    nav: ['Leistungen', 'Referenzen', 'Über uns', 'Offerte'], head: 'Handwerk, auf das Sie zählen können.',
    unter: '{Name} plant, baut und repariert[ in {Ort} und Umgebung].', cta: 'Offerte anfragen',
    karten: [['Neubau', 'Vom ersten Plan bis zur Montage.'], ['Renovation', 'Aus alt wird wieder schön.'], ['Reparatur', 'Schnell da, sauber erledigt.']],
    info: 'Antwort innert 24 Stunden', alt: 'Werkzeugwand in einer Werkstatt', check: 'Handwerk und Bau' },
  { k: 'praxis', label: 'Praxis', beispiel: 'Physio Seeblick', akzent: '#2B7178',
    nav: ['Angebot', 'Team', 'Praxis', 'Termin'], head: 'Wieder gut in Bewegung.',
    unter: 'Therapie und Beratung bei {Name}[ in {Ort}].', cta: 'Termin vereinbaren',
    karten: [['Behandlung', 'Genau auf Sie abgestimmt.'], ['Beratung', 'Wir nehmen uns Zeit.'], ['Nachsorge', 'Damit es so bleibt.']],
    info: 'Termine auch am Abend', alt: 'Behandlung an der Schulter in einer Praxis', check: 'Gesundheit und Therapie' },
  { k: 'beratung', label: 'Beratung', beispiel: 'Keller Beratung', akzent: '#1F3A5F',
    nav: ['Leistungen', 'Über uns', 'Team', 'Kontakt'], head: 'Klarheit für Ihre nächsten Schritte.',
    unter: '{Name} begleitet Sie persönlich[ in {Ort}].', cta: 'Erstgespräch vereinbaren',
    karten: [['Analyse', 'Wo Sie heute stehen.'], ['Strategie', 'Wohin es gehen soll.'], ['Umsetzung', 'Damit es nicht beim Plan bleibt.']],
    info: 'Erstgespräch kostenlos', alt: 'Team bespricht sich vor einem Bildschirm', check: 'Beratung und Treuhand' },
  { k: 'gastronomie', label: 'Gastronomie', beispiel: 'Restaurant Linde', akzent: '#8C2F39',
    nav: ['Menü', 'Über uns', 'Reservation', 'Kontakt'], head: 'Willkommen bei {Name}.',
    unter: 'Saisonale Küche mit Zutaten aus der Region[ in {Ort}].', cta: 'Tisch reservieren',
    karten: [['Mittagsmenü', 'Täglich frisch gekocht.'], ['Abendkarte', 'Zeit für Genuss.'], ['Anlässe', 'Ihr Fest bei uns.']],
    info: 'Di bis Sa, 11 bis 23 Uhr', alt: 'Restaurant mit Lichterketten und gedeckten Tischen', check: 'Gastronomie und Hotellerie' },
  { k: 'verkauf', label: 'Verkauf', beispiel: 'Laden am Platz', akzent: '#8A6316',
    nav: ['Sortiment', 'Neuheiten', 'Über uns', 'Besuch'], head: 'Schön, dass Sie da sind.',
    unter: 'Ausgewählte Produkte und ehrliche Beratung bei {Name}[ in {Ort}].', cta: 'Sortiment ansehen',
    karten: [['Sortiment', 'Was im Laden bereitsteht.'], ['Beratung', 'Wir nehmen uns Zeit.'], ['Service', 'Reparatur und Umtausch.']],
    info: 'Mo bis Sa geöffnet', alt: 'Beleuchtete Regale mit Produkten in einem Laden', check: 'Laden und Handel' },
  { k: 'verein', label: 'Verein', beispiel: 'Turnverein Linde', akzent: '#C8233A',
    nav: ['Verein', 'Agenda', 'Mitglied werden', 'Kontakt'], head: 'Gemeinsam mehr erleben.',
    unter: '{Name}[ aus {Ort}] freut sich auf neue Gesichter.', cta: 'Mitglied werden',
    karten: [['Agenda', 'Alle Anlässe auf einen Blick.'], ['Mitmachen', 'Training, Proben, Helfen.'], ['Vorstand', 'Ansprechpersonen und Kontakt.']],
    info: 'Nächster Anlass: Samstag, 14 Uhr', alt: 'Junge Fussballer bei einem Spiel', check: 'Andere', checkText: 'Verein' },
];

// ---------- Hilfen ----------
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// «Bäckerei Müller GmbH» ergibt baeckerei-mueller.ch
export function domain(name) {
  let t = String(name || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
  t = t.normalize('NFD').replace(/[̀-ͯ]/g, '');
  t = t.replace(/&/g, ' ').replace(/(^|[^a-z0-9])(gmbh|ag)(?=[^a-z0-9]|$)/g, '$1 ');
  t = t.trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '');
  return (t || 'ihr-betrieb') + '.ch';
}

// Initialen, höchstens zwei Buchstaben, ohne GmbH, AG und &
export function initialen(name) {
  const w = String(name || '').replace(/&/g, ' ').split(/\s+/).filter((x) => x && !/^(gmbh|ag)$/i.test(x) && /[\p{L}\d]/u.test(x));
  return w.slice(0, 2).map((x) => [...x.replace(/[^\p{L}\d]/gu, '')][0] || '').join('').toUpperCase();
}

// [ … ] nur mit Ort; {Name} und {Ort} einsetzen
export function fuellen(t, name, ort) {
  return t.replace(/\[([^\]]*)\]/g, (_, innen) => (ort ? innen : '')).replace(/\{Name\}/g, name).replace(/\{Ort\}/g, ort);
}

// ---------- Darstellung ----------
const STIL = `
.gen{display:grid;grid-template-columns:minmax(0,38fr) minmax(0,62fr);gap:56px;align-items:start}
.gen-steuer{display:flex;flex-direction:column;gap:20px;min-width:0}
.gen-feld label{display:block;margin:0 0 8px;font-size:16px;font-weight:500;color:var(--tinte,#11131A)}
.gen-feld input{box-sizing:border-box;width:100%;max-width:420px;min-height:56px;padding:0 20px;border:1px solid var(--linie-feld,#80879A);border-radius:12px;background:var(--flaeche,#FFFFFF);color:var(--tinte,#11131A);font:inherit;font-size:16px}
.gen-feld input::placeholder{color:var(--text-2,#565D6B)}
.gen-feld input:focus{outline:none;border-color:var(--primaer,#2D4CF0)}
.gen-feld input:focus-visible{outline:3px solid var(--primaer,#2D4CF0);outline-offset:2px}
.gen-chips{display:flex;flex-wrap:wrap;gap:10px;margin:4px 0 0}
.gen-chip{min-height:44px;padding:0 20px;border:1px solid var(--linie-feld,#80879A);border-radius:999px;background:var(--flaeche,#FFFFFF);color:var(--tinte,#11131A);font:inherit;font-size:16px;font-weight:500;cursor:pointer;outline:none;box-shadow:none;transition:background-color 160ms ease,color 160ms ease,border-color 160ms ease;-webkit-tap-highlight-color:transparent}
.gen-chip[aria-checked="true"]{border-color:var(--primaer,#2D4CF0);background:var(--primaer,#2D4CF0);color:#FFFFFF}
.gen-chip:focus{outline:none}
.gen-chip:focus-visible{outline:3px solid var(--tinte,#11131A);outline-offset:3px}
@media(hover:hover){.gen-chip[aria-checked="false"]:hover{border-color:var(--tinte,#11131A)}}
.gen-skizze{margin:4px 0 0;font-size:13px;line-height:1.5;color:var(--text-2,#565D6B)}
.gen-steuer .btn{align-self:flex-start}
.gen-vorschau{display:flex;flex-direction:column;gap:14px;min-width:0}
.gen-fenster{overflow:hidden;border-radius:14px;background:#FFFFFF;box-shadow:0 60px 100px -40px rgba(17,19,26,0.45),0 20px 40px -24px rgba(17,19,26,0.25),0 0 0 1px rgba(17,19,26,0.06)}
.gen-leiste{display:flex;align-items:center;gap:7px;height:36px;padding:0 14px;background:#EDEEF0;border-bottom:1px solid #DCDEE2}
.gen-leiste i{flex:none;width:10px;height:10px;border-radius:50%;background:#C4C7CD}
.gen-adresse{display:flex;align-items:center;justify-content:center;gap:6px;min-width:0;max-width:64%;height:24px;margin:0 auto;padding:0 14px;border-radius:7px;background:#FFFFFF;color:#3C4049;font-size:13px;font-weight:500;white-space:nowrap}
.gen-adresse svg{flex:none;width:13px;height:13px;color:#5B606B}
.gen-adresse span{overflow:hidden;text-overflow:ellipsis}
.gen-blick{position:relative;overflow:hidden;background:#FFFFFF}
.gen-blick>.ms-rahmen{position:absolute;left:0;top:0;transform-origin:0 0}
.gen-hinweis{margin:0;font-size:13px;line-height:1.5;color:var(--text-2,#565D6B)}
.gen-sr{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
@media(max-width:1023px){.gen{grid-template-columns:minmax(0,1fr);gap:36px}}
@media(max-width:767px){.gen-chip{padding:0 16px}.gen-feld input{max-width:none}}

/* Mini-Seite, gezeichnet in Entwurfsgrösse und auf die Vorschau skaliert */
.ms{--a:#B4541F;box-sizing:border-box;background:#FFFFFF;color:#1D2027;font-family:Inter,system-ui,sans-serif;font-size:16px;line-height:1.5;-webkit-font-smoothing:antialiased}
.ms *{box-sizing:border-box}
.ms-logo,.ms-knopf,.ms-karte,.ms-info svg,.ms-bild{transition:background-color 350ms ease,border-color 350ms ease,color 350ms ease}
.ms-t{transition:opacity 175ms ease}
.ms[data-wechsel="1"] .ms-t{opacity:0}
.ms-kopf{display:flex;align-items:center;gap:14px;height:64px;padding:0 40px;border-bottom:1px solid #ECEDF0}
.ms-logo{flex:none;display:grid;place-items:center;width:40px;height:40px;border-radius:50%;background:var(--a);color:#FFFFFF;font-weight:700;font-size:15px;letter-spacing:0.02em}
.ms-name{min-width:0;max-width:420px;overflow:hidden;font-weight:700;font-size:18px;line-height:1.2;white-space:nowrap;text-overflow:ellipsis}
.ms-nav{display:flex;gap:26px;margin-left:auto;font-size:15px;color:#4A4F5A;white-space:nowrap}
.ms-burger{display:none;flex-direction:column;gap:5px;margin-left:auto}
.ms-burger i{display:block;width:22px;height:2px;border-radius:2px;background:#1D2027}
.ms-hero{position:relative;height:380px;overflow:hidden;color:#FFFFFF}
.ms-bild{position:absolute;inset:0;background:linear-gradient(120deg,var(--a),#11131A)}
.ms-foto{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 350ms ease}
.ms-foto.da{opacity:1}
.ms-hero::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,10,16,0.82) 0%,rgba(8,10,16,0.55) 48%,rgba(8,10,16,0.12) 100%)}
.ms-text{position:relative;z-index:1;max-width:640px;padding:62px 48px 0}
.ms-h1{margin:0 0 14px;font-weight:700;font-size:50px;line-height:1.08;letter-spacing:-0.02em;color:#FFFFFF;overflow-wrap:normal;word-break:normal;hyphens:manual}
.ms-unter{max-width:36ch;margin:0 0 24px;font-size:18px;line-height:1.5;color:rgba(255,255,255,0.92)}
.ms-knoepfe{display:flex;flex-wrap:wrap;gap:12px}
.ms-knopf,.ms-knopf2{display:inline-flex;align-items:center;height:48px;padding:0 22px;border-radius:999px;font-size:16px;font-weight:600;white-space:nowrap}
.ms-knopf{background:var(--a);color:#FFFFFF}
.ms-knopf2{background:rgba(255,255,255,0.94);color:#1D2027}
.ms-karten{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;padding:22px 40px}
.ms-karte{padding:16px 18px;border:1px solid #E6E7EA;border-top:3px solid var(--a);border-radius:10px;background:#FFFFFF}
.ms-karte b{display:block;margin:0 0 4px;font-size:16px}
.ms-karte p{margin:0;font-size:14px;line-height:1.45;color:#5B606B}
.ms-info{display:flex;flex-wrap:wrap;align-items:center;gap:8px 28px;padding:12px 40px;background:#F3F4F6;font-size:14px;color:#3C4049}
.ms-info span{display:inline-flex;align-items:center;gap:7px;min-width:0}
.ms-info svg{flex:none;width:17px;height:17px;color:var(--a)}
/* Handy: Burger statt Navigation, alles untereinander */
.ms[data-geraet="handy"] .ms-kopf{height:56px;padding:0 16px;gap:10px}
.ms[data-geraet="handy"] .ms-logo{width:34px;height:34px;font-size:13px}
.ms[data-geraet="handy"] .ms-name{max-width:240px;font-size:16px}
.ms[data-geraet="handy"] .ms-nav{display:none}
.ms[data-geraet="handy"] .ms-burger{display:flex}
.ms[data-geraet="handy"] .ms-hero{height:330px}
.ms[data-geraet="handy"] .ms-hero::after{background:linear-gradient(90deg,rgba(8,10,16,0.82) 0%,rgba(8,10,16,0.6) 70%,rgba(8,10,16,0.35) 100%)}
.ms[data-geraet="handy"] .ms-text{padding:40px 18px 0}
.ms[data-geraet="handy"] .ms-h1{font-size:31px;margin-bottom:10px}
.ms[data-geraet="handy"] .ms-unter{margin-bottom:18px;font-size:15px}
.ms[data-geraet="handy"] .ms-knopf,.ms[data-geraet="handy"] .ms-knopf2{height:42px;padding:0 16px;font-size:14px}
.ms[data-geraet="handy"] .ms-karten{grid-template-columns:minmax(0,1fr);gap:10px;padding:18px 16px}
.ms[data-geraet="handy"] .ms-info{flex-direction:column;align-items:flex-start;padding:14px 16px}
@media(prefers-reduced-motion:reduce){.ms *,.gen-chip{transition:none!important}}
`;

const MASS = { desktop: 1100, handy: 390 };
// Titelgrösse: Start, kleinste, höchstens Zeilen
const TITEL = { desktop: [50, 26, 3], handy: [31, 20, 4] };

// Zustand nur im Arbeitsspeicher, damit er einen Seitenwechsel überlebt
const zustand = { name: '', ort: '', branche: 'handwerk' };
let wurzel = null, opts = {}, ro = null, geraet = 'desktop', gezeigt = null, liveZeit = null, wechselZeit = null;
const $ = (s) => wurzel.querySelector(s);
const $$ = (s) => [...wurzel.querySelectorAll(s)];
const br = () => BRANCHEN.find((b) => b.k === zustand.branche) || BRANCHEN[0];
const name = () => zustand.name.trim() || br().beispiel;

function geruest() {
  const chips = BRANCHEN.map((b) => `<button type="button" role="radio" class="gen-chip" data-branche="${b.k}" aria-checked="${b.k === zustand.branche}" tabindex="${b.k === zustand.branche ? 0 : -1}">${esc(b.label)}</button>`).join('');
  return `<div class="gen">
  <div class="gen-steuer">
    <div class="gen-feld"><label for="gen-name">Firmenname</label><input id="gen-name" type="text" maxlength="40" autocomplete="organization" enterkeyhint="next"></div>
    <div class="gen-feld"><label for="gen-ort">Ort (optional)</label><input id="gen-ort" type="text" maxlength="40" autocomplete="address-level2" placeholder="z.B. Berikon" enterkeyhint="done"></div>
    <div><p id="gen-branche-t" class="gen-sr">Branche</p><div class="gen-chips" role="radiogroup" aria-labelledby="gen-branche-t">${chips}</div></div>
    <p class="gen-skizze">Eine Skizze, kein Entwurf. Ihre echte Seite bauen wir zusammen.</p>
    <a class="btn btn-primaer gen-start" href="/projekt-check/">So weitermachen: Projekt-Check starten</a>
    <p class="gen-sr" id="gen-live" aria-live="polite"></p>
  </div>
  <div class="gen-vorschau" role="group" aria-label="Vorschau Ihrer Startseite">
    <div class="gen-fenster"><div class="gen-leiste"><i></i><i></i><i></i><div class="gen-adresse">${svg('schloss')}<span class="gen-domain"></span></div></div><div class="gen-blick"><div class="ms-rahmen"></div></div></div>
    <p class="gen-hinweis">Beispielbilder. Auf Ihrer Seite verwenden wir Ihre eigenen Fotos.</p>
  </div>
</div>`;
}

function miniSeite() {
  return `<div class="ms" data-geraet="${geraet}" aria-hidden="true">
  <header class="ms-kopf"><span class="ms-logo"></span><span class="ms-name"></span><nav class="ms-nav"><span class="ms-t"></span><span class="ms-t"></span><span class="ms-t"></span><span class="ms-t"></span></nav><span class="ms-burger"><i></i><i></i><i></i></span></header>
  <section class="ms-hero"><div class="ms-bild"></div><div class="ms-text"><p class="ms-h1 ms-t"></p><p class="ms-unter ms-t"></p><div class="ms-knoepfe"><span class="ms-knopf ms-t"></span><span class="ms-knopf2">Mehr erfahren</span></div></div></section>
  <section class="ms-karten">${'<div class="ms-karte"><b class="ms-t"></b><p class="ms-t"></p></div>'.repeat(3)}</section>
  <section class="ms-info"><span class="ms-info-k ms-t"></span><span class="ms-info-o"></span><span class="ms-info-m"></span></section>
</div>`;
}

function bauen() {
  $('.ms-rahmen').innerHTML = miniSeite();
  gezeigt = null;
  texte(); bild(); skalieren();
}

function skalieren() {
  const blick = $('.gen-blick'); const rahmen = $('.ms-rahmen'); const ms = $('.ms'); if (!blick || !ms) return;
  const b = MASS[geraet]; const s = blick.clientWidth / b;
  rahmen.style.width = b + 'px'; rahmen.style.transform = `scale(${s})`;
  titel();
  blick.style.height = Math.ceil(ms.offsetHeight * s) + 'px';
}

// Lange Namen: Titel kleiner, bis kein Wort mehr überläuft und die Zeilenzahl passt
function titel() {
  const h = $('.ms-h1'); if (!h) return;
  const [start, min, zeilen] = TITEL[geraet]; let g = start; h.style.fontSize = g + 'px';
  const lh = () => parseFloat(getComputedStyle(h).lineHeight) || g * 1.08;
  while (g > min && (h.scrollWidth > h.clientWidth + 1 || h.offsetHeight > lh() * zeilen + 2)) { g -= 1; h.style.fontSize = g + 'px'; }
}

function texte() {
  const b = br(); const n = name(); const ort = zustand.ort.trim(); const d = domain(n);
  const ms = $('.ms'); ms.style.setProperty('--a', b.akzent);
  $('.ms-logo').textContent = initialen(n);
  $('.ms-name').textContent = n;
  $$('.ms-nav span').forEach((x, i) => { x.textContent = b.nav[i]; });
  const head = fuellen(b.head, n, ort), unter = fuellen(b.unter, n, ort);
  $('.ms-h1').textContent = head; $('.ms-unter').textContent = unter; $('.ms-knopf').textContent = b.cta;
  $$('.ms-karte').forEach((k, i) => { k.querySelector('b').textContent = b.karten[i][0]; k.querySelector('p').textContent = b.karten[i][1]; });
  $('.ms-info-k').innerHTML = svg('uhr') + esc(b.info);
  const o = $('.ms-info-o'); o.innerHTML = ort ? svg('pin') + esc(ort) : ''; o.style.display = ort ? '' : 'none';
  $('.ms-info-m').innerHTML = svg('mail') + esc('kontakt@' + d);
  $('.gen-domain').textContent = d;
  $('#gen-name').placeholder = 'z. B. ' + b.beispiel;
  clearTimeout(liveZeit);
  liveZeit = setTimeout(() => { const l = $('#gen-live'); if (l) l.textContent = `Vorschau: ${head} ${unter}`; }, 700);
  requestAnimationFrame(skalieren);
}

// Nur das Foto der gewählten Branche laden. Fehlt es, bleibt der Verlauf in der Akzentfarbe stehen.
function bild() {
  const b = br(); const ziel = $('.ms-bild'); if (!ziel || gezeigt === b.k) return;
  gezeigt = b.k;
  const img = new Image(); img.className = 'ms-foto'; img.alt = b.alt; img.decoding = 'async';
  const alte = [...ziel.querySelectorAll('.ms-foto')];
  img.onload = () => { if (gezeigt !== b.k) { img.remove(); return; } requestAnimationFrame(() => img.classList.add('da')); setTimeout(() => alte.forEach((x) => x.remove()), opts.reduce ? 0 : 400); };
  img.onerror = () => { img.remove(); if (gezeigt === b.k) alte.forEach((x) => x.remove()); };
  img.src = `/assets/img/generator/${b.k}.webp`;
  ziel.appendChild(img);
}

function branche(k, fokus) {
  if (k === zustand.branche) return;
  zustand.branche = k;
  $$('.gen-chip').forEach((x) => { const an = x.dataset.branche === k; x.setAttribute('aria-checked', an); x.tabIndex = an ? 0 : -1; if (an && fokus) x.focus(); });
  const ms = $('.ms');
  $('#gen-name').placeholder = 'z. B. ' + br().beispiel;
  if (opts.reduce) { texte(); bild(); return; }
  // Foto, Farbe und Texte blenden gemeinsam über (350 ms): Texte kurz aus, tauschen, wieder ein
  ms.style.setProperty('--a', br().akzent);
  bild();
  ms.dataset.wechsel = '1';
  clearTimeout(wechselZeit);
  wechselZeit = setTimeout(() => { texte(); ms.dataset.wechsel = ''; }, 175);
}

function tasten(e) {
  const t = e.target.closest('.gen-chip'); if (!t) return;
  const alle = $$('.gen-chip'); const i = alle.indexOf(t); let n = null;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % alle.length;
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + alle.length) % alle.length;
  else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = alle.length - 1;
  if (n === null) return;
  e.preventDefault(); branche(alle[n].dataset.branche, true);
}

// Einstieg aus index.html
export function starten(ziel, o = {}) {
  opts = o; wurzel = ziel;
  if (!document.getElementById('gen-stil')) { const st = document.createElement('style'); st.id = 'gen-stil'; st.textContent = STIL; document.head.appendChild(st); }
  wurzel.innerHTML = geruest();
  $('#gen-name').value = zustand.name; $('#gen-ort').value = zustand.ort;
  $('#gen-name').addEventListener('input', (e) => { zustand.name = e.target.value; texte(); });
  $('#gen-ort').addEventListener('input', (e) => { zustand.ort = e.target.value; texte(); });
  wurzel.addEventListener('keydown', tasten);
  wurzel.addEventListener('click', (e) => {
    const c = e.target.closest('.gen-chip'); if (c) { branche(c.dataset.branche, false); return; }
    if (e.target.closest('.gen-start') && opts.weiter) { const b = br(); opts.weiter({ name: zustand.name.trim(), ort: zustand.ort.trim(), branche: b.check, brancheText: b.checkText || '' }); }
  });
  // Ist die Vorschau schmaler als 560 px, zeichnet sie die Handy-Fassung der Mini-Seite
  const passend = () => ($('.gen-blick').clientWidth < 560 ? 'handy' : 'desktop');
  geraet = passend();
  if (ro) ro.disconnect();
  ro = new ResizeObserver(() => { const g = passend(); if (g !== geraet) { geraet = g; bauen(); } else skalieren(); });
  ro.observe($('.gen-blick'));
  bauen();
  wurzel.dataset.bereit = '1';
}

export const _test = { BRANCHEN, zustand };
