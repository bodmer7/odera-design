// Projekt-Check direkt senden: Sicherheitsprüfung (Cloudflare Turnstile) und Versand an den Worker anfrage-proxy/.
// Wird erst im Projekt-Check geladen (index.html, anfrageVorladen). c ist die Komponente aus index.html.

// Turnstile erst auf der letzten Seite zeichnen, unsichtbar ausser im Zweifelsfall
export function tsSicher(c) {
  if (!c.direkt()) return;
  setTimeout(() => {
    if (!document.getElementById('ts-box')) return;
    const zeichnen = () => {
      const box = document.getElementById('ts-box');
      if (!window.turnstile || !box) return;
      if (c.tsId !== undefined && box.childElementCount) return;
      c.tsToken = null;
      c.tsId = window.turnstile.render('#ts-box', {
        sitekey: c.TURNSTILE_SITEKEY, appearance: 'interaction-only', language: 'de',
        callback: (t) => { c.tsToken = t; }, 'expired-callback': () => { c.tsToken = null; }, 'error-callback': () => { c.tsToken = null; },
      });
    };
    if (window.turnstile) { zeichnen(); return; }
    if (!c.tsLaedt) {
      c.tsLaedt = true;
      const sc = document.createElement('script');
      sc.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      sc.async = true; sc.defer = true;
      sc.onload = zeichnen;
      sc.onerror = () => { c.tsLaedt = false; };
      document.head.appendChild(sc);
    }
  }, 150);
}

async function tokenHolen(c) {
  for (let i = 0; i < 60 && !c.tsToken; i++) {
    if (i === 0) tsSicher(c);
    await new Promise((r) => setTimeout(r, 250));
  }
  return c.tsToken;
}

function tsNeu(c) {
  c.tsToken = null;
  try { if (window.turnstile && c.tsId !== undefined) window.turnstile.reset(c.tsId); } catch (e) { /* neu zeichnen beim nächsten Mal */ }
}

export async function senden(c) {
  const s = c.state;
  if (s.senden === 'laeuft' || s.gesendet || !c.direkt()) return;
  if (!s.consent) { c.setState({ senden: 'fehler', sendFehler: 'einwilligung' }); return; }
  if (navigator.onLine === false) { c.setState({ offline: true }); return; }
  const art = s.quick ? 'kurz' : 'voll';
  const felder = art === 'kurz' ? c.felderKurz() : c.felderVoll();
  const mail = felder.KONTAKT_MAIL || '';
  if ((art === 'voll' && !felder.KONTAKT_NAME) || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) { c.setState({ senden: 'fehler', sendFehler: 'kontakt' }); return; }
  c.setState({ senden: 'laeuft', sendFehler: '' });
  if (!c.idem) c.idem = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2));
  const token = await tokenHolen(c);
  if (!token) { c.setState({ senden: 'fehler', sendFehler: 'pruefung' }); tsNeu(c); return; }
  let antwort = null, status = 0;
  try {
    const r = await fetch(c.ANFRAGE_ENDPOINT, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ art, felder, kopie: s.kopieWunsch, token, website: s.hp, dauerSek: Math.round((Date.now() - (c.startZeit || Date.now())) / 1000), idem: c.idem }),
    });
    status = r.status;
    antwort = await r.json().catch(() => null);
  } catch (e) { status = 0; }
  tsNeu(c);
  if (!antwort || !antwort.ok) {
    const fehler = status === 429 ? 'limit' : (antwort && antwort.fehler === 'pruefung') ? 'pruefung' : status === 0 ? 'netz' : 'versand';
    c.setState({ senden: 'fehler', sendFehler: fehler });
    return;
  }
  const vorname = (felder.KONTAKT_NAME || '').trim().split(/\s+/)[0];
  const fertig = () => {
    c.idem = null; c.startZeit = Date.now();
    c.setState({
      gesendet: { referenz: antwort.referenz, vorname, mail, kopie: !!antwort.kopie },
      senden: 'bereit', sendFehler: '', fensterWeg: false,
      ans: {}, txt: {}, step: 0, timing: 1, consent: false, reached: 0, result: false, review: false, editing: false, quick: false, mid: false, kopieWunsch: false, hp: '',
    });
    c.focusHead();
  };
  c.setState({ fensterWeg: true });
  setTimeout(fertig, c.reduce ? 200 : 650);
}
