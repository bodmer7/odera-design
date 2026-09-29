// Chat-Assistent von odera.ch. Wird erst geladen, wenn jemand den Knopf «Fragen?» anklickt.
// Kein Cookie, kein localStorage: Der Verlauf lebt nur in dieser Variablen, also im Arbeitsspeicher des Tabs.
// Antworten kommen im Format Server-Sent Events vom Proxy (chat-proxy/), der ein Sprachmodell über Cloudflare Workers AI fragt.

import { VORLAGEN } from './chat-vorlagen.js';

// Vorschläge mit fester Antwort (assets/js/chat-vorlagen.js): kosten keine Anfrage an das Sprachmodell
const VORSCHLAEGE = Object.keys(VORLAGEN);
// Fragen zu Preis, Ablauf oder Start: danach den Projekt-Check anbieten
const CHECK_THEMA = /preis|kost|chf|franken|teuer|günstig|budget|ablauf|wie läuft|vorgehen|start|anfangen|beginnen|offerte|angebot|anfrage|entwurf/i;
const MAX_VERLAUF = 6;
const MAIL = 'kontakt@odera.ch';

let verlauf = [];           // [{ role: 'user' | 'assistant', content }]
let root = null, log = null, eingabe = null, senden = null, intro = null;
let ausloeser = null, endpoint = '', laufend = null, offen = false, starten = null;
let scrollVorher = '';

// ---------- Darstellung ----------
const STIL = `
.oc-root{position:fixed;right:24px;bottom:24px;z-index:70;width:400px;height:min(640px,calc(100vh - 48px));display:flex;flex-direction:column;background:#F6F5F1;color:#11131A;border:1px solid #E2DFD8;border-radius:20px;box-shadow:0 24px 60px rgba(17,19,26,0.22);font-family:'Inter',system-ui,sans-serif;overflow:hidden;animation:ocIn 200ms ease-out}
@keyframes ocIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.oc-root *{box-sizing:border-box}
.oc-kopf{display:flex;align-items:center;gap:8px;padding:14px 12px 14px 20px;background:#FFFFFF;border-bottom:1px solid #E2DFD8}
.oc-kopf-t{flex:1;min-width:0}
.oc-titel{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:20px;letter-spacing:-0.02em;margin:0}
.oc-unter{font-size:13px;line-height:1.4;color:#5B6270;margin:2px 0 0}
.oc-knopf{min-height:44px;padding:0 12px;border:none;border-radius:999px;background:none;color:#1E34B8;font:inherit;font-size:13px;font-weight:600;text-decoration:underline;text-underline-offset:3px;cursor:pointer}
.oc-zu{width:44px;min-height:44px;padding:0;text-decoration:none;font-size:26px;line-height:1;color:#11131A}
.oc-log{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:14px;scroll-behavior:smooth}
.oc-hinweis{font-size:13px;line-height:1.5;color:#5B6270;margin:0;padding:12px 14px;background:#FFFFFF;border:1px solid #E2DFD8;border-radius:14px}
.oc-chips{display:flex;flex-wrap:wrap;gap:8px}
.oc-chip{min-height:44px;padding:8px 14px;border:1px solid #11131A;border-radius:999px;background:#FFFFFF;color:#11131A;font:inherit;font-size:13px;line-height:1.3;text-align:left;cursor:pointer}
.oc-chip:hover{background:#EDEFFF}
.oc-msg{max-width:88%;padding:12px 14px;border-radius:16px;font-size:16px;line-height:1.55;overflow-wrap:anywhere}
.oc-msg p{margin:0 0 8px}.oc-msg p:last-child{margin:0}
.oc-msg ul,.oc-msg ol{margin:0 0 8px;padding-left:20px}.oc-msg li{margin:0 0 4px}
.oc-msg a{color:#1E34B8;text-decoration:underline;text-underline-offset:3px}
.oc-ich{align-self:flex-end;background:#2D4CF0;color:#FFFFFF;border-bottom-right-radius:6px;white-space:pre-wrap}
.oc-ki{align-self:flex-start;background:#FFFFFF;border:1px solid #E2DFD8;border-bottom-left-radius:6px}
.oc-fehler{align-self:flex-start;background:#FFF4F1;border:1px solid #FF5A3C;color:#11131A}
.oc-tippt{display:inline-flex;gap:5px;align-items:center;min-height:22px}
.oc-tippt span{width:7px;height:7px;border-radius:999px;background:#5B6270;animation:ocPunkt 1.2s ease-in-out infinite}
.oc-tippt span:nth-child(2){animation-delay:150ms}.oc-tippt span:nth-child(3){animation-delay:300ms}
@keyframes ocPunkt{0%,80%,100%{opacity:0.25}40%{opacity:1}}
.oc-form{display:flex;align-items:flex-end;gap:8px;padding:12px;background:#FFFFFF;border-top:1px solid #E2DFD8}
.oc-eingabe{flex:1;min-height:48px;max-height:140px;padding:12px 14px;border:1px solid #A8B0BD;border-radius:14px;background:#FFFFFF;color:#11131A;font:inherit;font-size:16px;line-height:1.4;resize:none}
.oc-eingabe:focus{outline:3px solid #11131A;outline-offset:1px}
.oc-senden{min-height:48px;padding:0 18px;border:none;border-radius:999px;background:#2D4CF0;color:#FFFFFF;font:inherit;font-size:16px;font-weight:600;cursor:pointer}
.oc-senden:disabled{background:#E2DFD8;color:#5B6270;cursor:not-allowed}
.oc-fuss{padding:0 12px 12px;background:#FFFFFF}
.oc-cta{display:flex;align-items:center;justify-content:center;min-height:48px;border-radius:999px;background:#D6F24B;color:#11131A;font-size:16px;font-weight:600;text-decoration:none}
.oc-cta:hover{background:#BFEE7C}
.oc-start{align-self:flex-start;display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 18px;border:none;border-radius:999px;background:#D6F24B;color:#11131A;font:inherit;font-size:16px;font-weight:600;cursor:pointer}
.oc-start:hover{background:#BFEE7C}
.oc-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.oc-root :focus-visible{outline:3px solid #11131A;outline-offset:2px}
@media(max-width:560px){.oc-root{inset:0;width:auto;height:auto;border:none;border-radius:0;box-shadow:none}.oc-kopf{padding-left:16px}.oc-log{padding:16px}}
@media(prefers-reduced-motion:reduce){.oc-root,.oc-tippt span{animation:none}.oc-log{scroll-behavior:auto}}
`;

function el(tag, attrs = {}, kinder = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const k of [].concat(kinder)) if (k) e.appendChild(typeof k === 'string' ? document.createTextNode(k) : k);
  return e;
}

// ---------- Sicheres Mini-Markdown: fett, Listen, Links. Nie rohes HTML. ----------
const INTERN = /^https:\/\/(www\.)?odera\.ch(\/[^\s]*)?$/;
const PORTFOLIO = /^https:\/\/(www\.)?nico-bodmer\.ch(\/[^\s]*)?$/;

function sichererLink(adresse, text) {
  let a = String(adresse || '').trim();
  if (a === MAIL) a = 'mailto:' + MAIL;
  if (a.startsWith('/') && !a.startsWith('//')) a = 'https://odera.ch' + a;
  if (a === 'mailto:' + MAIL) return el('a', { href: a, text });
  if (INTERN.test(a)) {
    const u = new URL(a);
    return el('a', { href: u.pathname + u.search + u.hash, text, onclick: () => { if (window.innerWidth <= 560 || u.pathname.startsWith('/projekt-check')) schliessen(); } });
  }
  if (PORTFOLIO.test(a)) return el('a', { href: a, text, target: '_blank', rel: 'noopener' });
  return document.createTextNode(text); // nicht erlaubte Adresse: nur der Text
}

function inline(text, ziel, fett = true) {
  const muster = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)|(https:\/\/(?:www\.)?(?:odera\.ch|nico-bodmer\.ch)[^\s)<]*)|(kontakt@odera\.ch)/g;
  let pos = 0, m;
  while ((m = muster.exec(text))) {
    if (m.index > pos) ziel.appendChild(document.createTextNode(text.slice(pos, m.index)));
    if (m[1] !== undefined) {
      if (fett) { const b = el('strong'); inline(m[1], b, false); ziel.appendChild(b); } else ziel.appendChild(document.createTextNode(m[1]));
    } else if (m[2] !== undefined) {
      ziel.appendChild(sichererLink(m[3], m[2]));
    } else if (m[4] !== undefined) {
      let url = m[4], rest = '';
      while (/[.,;:!?]$/.test(url)) { rest = url.slice(-1) + rest; url = url.slice(0, -1); }
      ziel.appendChild(sichererLink(url, url.replace(/^https:\/\//, '')));
      if (rest) ziel.appendChild(document.createTextNode(rest));
    } else if (m[5] !== undefined) {
      ziel.appendChild(sichererLink(MAIL, MAIL));
    }
    pos = muster.lastIndex;
  }
  if (pos < text.length) ziel.appendChild(document.createTextNode(text.slice(pos)));
}

// Keine Gedankenstriche in sichtbaren Texten
export function ohneStriche(t) {
  return t.replace(/(\d)\s*[–—]\s*(\d)/g, '$1 bis $2').replace(/\s+[–—]\s+/g, ', ').replace(/[–—]/g, ', ');
}

export function markdown(text, ziel) {
  ziel.textContent = '';
  const zeilen = ohneStriche(text).replace(/\r/g, '').split('\n');
  let liste = null, absatz = null;
  const listeZu = () => { liste = null; };
  for (const roh of zeilen) {
    const z = roh.replace(/^#{1,6}\s+/, '');
    const punkt = /^\s*[-*•]\s+(.*)$/.exec(z), nummer = /^\s*\d+[.)]\s+(.*)$/.exec(z);
    if (punkt || nummer) {
      absatz = null;
      const art = punkt ? 'ul' : 'ol';
      if (!liste || liste.tagName.toLowerCase() !== art) { liste = el(art); ziel.appendChild(liste); }
      const li = el('li'); inline((punkt || nummer)[1], li); liste.appendChild(li);
    } else if (!z.trim()) {
      listeZu(); absatz = null;
    } else {
      listeZu();
      if (!absatz) { absatz = el('p'); ziel.appendChild(absatz); } else absatz.appendChild(el('br'));
      inline(z, absatz);
    }
  }
}

// ---------- Nachrichten ----------
function zuUnterst() { log.scrollTop = log.scrollHeight; }

function blase(art, inhalt) {
  const b = el('div', { class: 'oc-msg ' + art });
  if (art === 'oc-ich') b.textContent = inhalt; else if (inhalt) markdown(inhalt, b);
  log.appendChild(b); zuUnterst();
  return b;
}

function checkAnbieten(text) {
  if (!starten || !CHECK_THEMA.test(text) || location.pathname.startsWith('/projekt-check')) return;
  const k = el('button', { type: 'button', class: 'oc-start', text: 'Projekt-Check hier starten', onclick: () => { schliessen(false); starten(); } });
  log.appendChild(k); zuUnterst();
}

// Feste Antwort auf einen Vorschlag, ohne Anfrage an das Sprachmodell
function vorlage(text) {
  if (laufend) return;
  if (intro) { const warImIntro = intro.contains(document.activeElement); intro.remove(); intro = null; if (warImIntro) eingabe.focus(); }
  blase('oc-ich', text);
  blase('oc-ki', VORLAGEN[text]);
  verlauf.push({ role: 'user', content: text }, { role: 'assistant', content: VORLAGEN[text] });
  while (verlauf.length > MAX_VERLAUF) verlauf.splice(0, 2);
  checkAnbieten(text);
}

function fehlermeldung(text) {
  const b = el('div', { class: 'oc-msg oc-fehler', role: 'alert' });
  markdown(text, b); log.appendChild(b); zuUnterst();
}

const NICHT_VERFUEGBAR = `Der Assistent ist gerade nicht verfügbar. Schreiben Sie an ${MAIL} oder starten Sie den [Projekt-Check](/projekt-check/).`;
const AUSGELASTET = `Der Assistent ist für heute ausgelastet. Schreiben Sie mir an ${MAIL} oder starten Sie den [Projekt-Check](/projekt-check/).`;

async function frage(text) {
  text = text.trim();
  if (!text || laufend) return;
  if (text.length > 1000) { fehlermeldung('Bitte fassen Sie sich kürzer, höchstens 1000 Zeichen.'); return; }
  if (intro) { const warImIntro = intro.contains(document.activeElement); intro.remove(); intro = null; if (warImIntro) eingabe.focus(); }
  blase('oc-ich', text);
  eingabe.value = ''; groesse();
  const antwort = blase('oc-ki', '');
  antwort.appendChild(el('span', { class: 'oc-tippt', 'aria-label': 'Antwort wird geschrieben' }, [el('span'), el('span'), el('span')]));
  log.setAttribute('aria-busy', 'true');
  senden.disabled = true;
  const steuerung = new AbortController();
  laufend = steuerung;
  let roh = '', fehler = null, fertig = false;
  try {
    const res = await fetch(endpoint, {
      method: 'POST', signal: steuerung.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: verlauf.slice(-MAX_VERLAUF) }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      if (res.status === 429 && d.fehler === 'ausgelastet') fehler = AUSGELASTET;
      else if (res.status === 429 && d.fehler === 'limit') {
        const min = Math.max(1, Math.ceil((d.wiederInSek || 60) / 60));
        fehler = `Sie haben in kurzer Zeit viele Fragen gestellt. Bitte versuchen Sie es in ${min === 1 ? 'einer Minute' : min + ' Minuten'} wieder, oder schreiben Sie an ${MAIL}.`;
      } else if (res.status === 400 && d.text) fehler = d.text;
      else fehler = NICHT_VERFUEGBAR;
    } else {
      const leser = res.body.getReader(), dec = new TextDecoder();
      let puffer = '';
      for (;;) {
        const { value, done } = await leser.read();
        if (done) break;
        puffer += dec.decode(value, { stream: true });
        let i;
        while ((i = puffer.indexOf('\n\n')) >= 0) {
          const block = puffer.slice(0, i); puffer = puffer.slice(i + 2);
          const e = /^event: (.+)$/m.exec(block), d = /^data: (.+)$/m.exec(block);
          if (!e || !d) continue;
          const daten = JSON.parse(d[1]);
          if (e[1] === 'text') { roh += daten.t; markdown(roh, antwort); zuUnterst(); }
          else if (e[1] === 'ende') fertig = true;
          else if (e[1] === 'fehler') fehler = daten.art === 'ausgelastet' ? AUSGELASTET : NICHT_VERFUEGBAR;
        }
      }
      if (!fehler && (!fertig || !roh.trim())) fehler = NICHT_VERFUEGBAR;
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return;
    fehler = NICHT_VERFUEGBAR;
  } finally {
    if (laufend === steuerung) {
      laufend = null;
      if (senden) senden.disabled = false;
      if (log) log.setAttribute('aria-busy', 'false');
    }
  }
  if (fehler) {
    if (roh.trim()) markdown(roh, antwort); else antwort.remove();
    fehlermeldung(fehler);
    return;
  }
  const sauber = ohneStriche(roh.trim());
  verlauf.push({ role: 'user', content: text }, { role: 'assistant', content: sauber });
  while (verlauf.length > MAX_VERLAUF) verlauf.splice(0, 2);
  checkAnbieten(text);
}

// ---------- Aufbau ----------
function introBauen() {
  intro = el('div', { class: 'oc-intro', style: 'display:flex;flex-direction:column;gap:14px' });
  const hinweis = el('p', { class: 'oc-hinweis' }, ['Ihre Nachrichten werden zur Beantwortung an Cloudflare übermittelt und dort von einem KI-Modell verarbeitet, möglicherweise ausserhalb der Schweiz. Bitte geben Sie keine persönlichen Daten ein. Mehr dazu in der ']);
  hinweis.appendChild(el('a', { href: '/datenschutz/#ds-8', text: 'Datenschutzerklärung', onclick: () => { if (window.innerWidth <= 560) schliessen(); } }));
  hinweis.appendChild(document.createTextNode('.'));
  const chips = el('div', { class: 'oc-chips', role: 'group', 'aria-label': 'Vorschläge' });
  for (const v of VORSCHLAEGE) chips.appendChild(el('button', { type: 'button', class: 'oc-chip', text: v, onclick: () => vorlage(v) }));
  intro.append(hinweis, chips);
  log.appendChild(intro);
}

function neuStarten() {
  if (laufend) { laufend.abort(); laufend = null; senden.disabled = false; log.setAttribute('aria-busy', 'false'); }
  verlauf = [];
  log.textContent = '';
  introBauen();
  eingabe.focus();
}

function groesse() {
  eingabe.style.height = 'auto';
  eingabe.style.height = Math.min(140, eingabe.scrollHeight + 2) + 'px';
}

function fokussierbar() {
  return [...root.querySelectorAll('a[href],button:not([disabled]),textarea,[tabindex="0"]')].filter((e) => e.offsetParent !== null);
}

function tasten(e) {
  e.stopPropagation(); // Tastenkürzel der Seite (k, f) nicht auslösen
  if (e.key === 'Escape') { e.preventDefault(); schliessen(); return; }
  if (e.key === 'Tab') {
    const f = fokussierbar(); if (!f.length) return;
    const erst = f[0], letzt = f[f.length - 1];
    if (e.shiftKey && document.activeElement === erst) { e.preventDefault(); letzt.focus(); }
    else if (!e.shiftKey && document.activeElement === letzt) { e.preventDefault(); erst.focus(); }
  }
}

function bauen() {
  if (!document.getElementById('oc-stil')) document.head.appendChild(el('style', { id: 'oc-stil', text: STIL }));
  root = el('div', { class: 'oc-root', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'oc-titel', 'aria-describedby': 'oc-unter', onkeydown: tasten });
  const kopf = el('div', { class: 'oc-kopf' }, [
    el('div', { class: 'oc-kopf-t' }, [el('p', { id: 'oc-titel', class: 'oc-titel', text: 'ODERA Assistent' }), el('p', { id: 'oc-unter', class: 'oc-unter', text: 'KI-Assistent. Antworten sind unverbindlich.' })]),
    el('button', { type: 'button', class: 'oc-knopf', text: 'Neu starten', onclick: neuStarten }),
    el('button', { type: 'button', class: 'oc-knopf oc-zu', 'aria-label': 'Assistent schliessen', text: '×', onclick: () => schliessen() }),
  ]);
  log = el('div', { class: 'oc-log', role: 'log', 'aria-live': 'polite', 'aria-busy': 'false', 'aria-label': 'Gespräch', tabindex: '0' });
  eingabe = el('textarea', { id: 'oc-eingabe', class: 'oc-eingabe', rows: '1', maxlength: '1000', placeholder: 'Ihre Frage', autocomplete: 'off' });
  eingabe.addEventListener('input', groesse);
  eingabe.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); frage(eingabe.value); } });
  senden = el('button', { type: 'submit', class: 'oc-senden', text: 'Senden' });
  const form = el('form', { class: 'oc-form', onsubmit: (e) => { e.preventDefault(); frage(eingabe.value); } },
    [el('label', { class: 'oc-sr', for: 'oc-eingabe', text: 'Ihre Frage an den Assistenten' }), eingabe, senden]);
  const fuss = el('div', { class: 'oc-fuss' }, [el('a', { href: '/projekt-check/', class: 'oc-cta', text: 'Projekt-Check starten', onclick: (e) => { schliessen(false); if (starten && !e.metaKey && !e.ctrlKey) { e.preventDefault(); starten(); } } })]);
  root.append(kopf, log, form, fuss);
  introBauen();
}

// Esc schliesst auch, wenn der Fokus gerade ausserhalb des Fensters liegt
function escSeite(e) { if (e.key === 'Escape' && offen) { e.preventDefault(); schliessen(); } }

function beiNavigation() { if (offen && location.pathname.startsWith('/projekt-check')) schliessen(false); }

export function oeffnen(opts = {}) {
  endpoint = opts.endpoint || endpoint;
  starten = opts.starten || starten;
  ausloeser = opts.ausloeser || document.activeElement;
  if (!root) bauen();
  if (!offen) {
    document.body.appendChild(root);
    offen = true;
    window.addEventListener('popstate', beiNavigation);
    window.addEventListener('keydown', escSeite);
    if (window.innerWidth <= 560) { scrollVorher = document.documentElement.style.overflow; document.documentElement.style.overflow = 'hidden'; }
  }
  zuUnterst();
  eingabe.focus();
}

export function schliessen(fokusZurueck = true) {
  if (!offen) return;
  offen = false;
  root.remove();
  window.removeEventListener('popstate', beiNavigation);
  window.removeEventListener('keydown', escSeite);
  document.documentElement.style.overflow = scrollVorher;
  if (fokusZurueck && ausloeser && document.contains(ausloeser)) ausloeser.focus();
}

export function istOffen() { return offen; }
