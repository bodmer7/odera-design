// Statistik von odera.ch (Teil 11). Läuft nur nach Ihrer Zustimmung im Banner.
// Keine Cookies, keine IP-Adresse, keine Eingaben: nur anonyme Ereignisse an den eigenen Worker odera-stats (D1 in der EU).
// Die Wahl steht im localStorage («odera-statistik»), die zufällige Sitzungs-ID im sessionStorage dieses Tabs.
// Abschnitts-IDs, Knöpfe und Ereignisse: docs/tracking.md.
(function () {
  'use strict';
  var ZIEL = 'https://odera-stats.odera-chat-proxy.workers.dev/e';
  var WAHL = 'odera-statistik';
  var aktiv = false;
  var warteschlange = [];
  var sitzung = null, geraet = null, herkunft = null, kampagne = null;
  var seite = null, gesendet = {}, aktivSek = 0, letzteAktion = 0, fehlerZahl = 0, ersterAufruf = true;
  var vitals = { lcp: null, cls: 0, inp: null, gesendet: false };

  function speicher(art) { try { return window[art]; } catch (e) { return null; } }
  function lesen(art, k) { var s = speicher(art); try { return s ? s.getItem(k) : null; } catch (e) { return null; } }
  function schreiben(art, k, v) { var s = speicher(art); try { if (!s) return; if (v === null) s.removeItem(k); else s.setItem(k, v); } catch (e) { /* ohne Speicher keine Messung über Seiten hinweg */ } }

  // ---------- Banner ----------

  var STIL = '.st-banner{position:fixed;left:16px;right:16px;bottom:max(16px,env(safe-area-inset-bottom));z-index:2147483000;max-width:520px;margin:0 auto;' +
    'background:var(--flaeche,#fff);color:var(--tinte,#11131A);border:1px solid var(--linie,#E2DFD8);border-radius:16px;box-shadow:0 12px 40px rgba(17,19,26,.18);' +
    'padding:20px;font:inherit;font-size:15px;line-height:1.5}' +
    '.st-banner .st-titel{margin:0 0 6px;font-family:"Bricolage Grotesque",sans-serif;font-weight:700;font-size:18px;line-height:1.2}' +
    '.st-banner p{margin:0 0 14px}.st-banner a{color:var(--primaer-dunkel,#1E34B8)}' +
    '.st-knoepfe{display:flex;gap:10px;flex-wrap:wrap}' +
    '.st-knopf{flex:1 1 140px;min-height:48px;padding:0 18px;border-radius:999px;border:1.5px solid var(--tinte,#11131A);background:var(--grund,#F6F5F1);' +
    'color:var(--tinte,#11131A);font:inherit;font-size:16px;font-weight:600;cursor:pointer}' +
    '.st-knopf:hover{background:var(--tinte,#11131A);color:var(--grund,#F6F5F1)}' +
    '.st-knopf:focus-visible{outline:3px solid var(--primaer,#2D4CF0);outline-offset:3px}' +
    '.st-stand{font-size:13px;color:var(--text-2,#565D6B);margin:0 0 10px}' +
    '@media(max-width:1023px){.st-banner{bottom:calc(76px + env(safe-area-inset-bottom))}}' +
    '@media(max-width:767px){.st-banner{left:12px;right:12px;padding:16px;font-size:14px}.st-banner p{margin:0 0 12px}.st-knopf{min-height:44px}}' +
    // Desktop: kleine Karte unten links (höchstens 380 px), der Chat-Knopf unten rechts bleibt frei
    '@media(min-width:1024px){.st-banner{left:24px;right:auto;bottom:24px;max-width:380px;margin:0}}' +
    '@media print{.st-banner{display:none}}';

  var banner = null;
  // Solange das Banner sichtbar ist, bekommt die Seite unten Platz in seiner Höhe. So verdeckt es keine Links
  // am Seitenende. Der Platz kommt nur am Ende dazu, sichtbare Inhalte verschieben sich nicht (kein CLS).
  function platzUnten() {
    if (!banner) { document.body.style.paddingBottom = ''; return; }
    var r = banner.getBoundingClientRect();
    document.body.style.paddingBottom = Math.ceil(window.innerHeight - r.top + 16) + 'px';
  }
  function bannerWeg() {
    if (banner) { banner.remove(); banner = null; }
    platzUnten();
  }
  window.addEventListener('resize', function () { if (banner) platzUnten(); });
  // Escape schliesst das Banner für diesen Seitenaufruf, ohne zu speichern
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && banner) bannerWeg(); });

  function bannerZeigen(nachfrage) {
    if (banner) { banner.remove(); banner = null; }
    if (!document.getElementById('st-stil')) {
      var st = document.createElement('style'); st.id = 'st-stil'; st.textContent = STIL; document.head.appendChild(st);
    }
    var wahl = lesen('localStorage', WAHL);
    banner = document.createElement('section');
    banner.className = 'st-banner';
    banner.setAttribute('aria-labelledby', 'st-titel');
    banner.innerHTML =
      '<p class="st-titel" id="st-titel">Statistik</p>' +
      (nachfrage && wahl ? '<p class="st-stand">Zurzeit ' + (wahl === 'ja' ? 'eingeschaltet' : 'ausgeschaltet') + '.</p>' : '') +
      '<p>Darf ich zählen, wie diese Website genutzt wird? Gespeichert werden nur Angaben wie aufgerufene Seiten und Klicks, ohne Cookies, ohne IP-Adresse und ohne Ihren Namen. ' +
      'Sie können Ihre Wahl jederzeit unten auf jeder Seite ändern. <a href="/datenschutz/#ds-14">Mehr im Datenschutz</a></p>' +
      '<div class="st-knoepfe"><button type="button" class="st-knopf" data-st="ja">Zustimmen</button><button type="button" class="st-knopf" data-st="nein">Ablehnen</button></div>';
    banner.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-st]');
      if (!b) return;
      var ja = b.getAttribute('data-st') === 'ja';
      schreiben('localStorage', WAHL, ja ? 'ja' : 'nein');
      bannerWeg();
      if (ja) { if (!aktiv) { starten(); merke({ t: 'consent_yes' }); senden(); } }
      else stoppen();
    });
    document.body.appendChild(banner);
    platzUnten();
    if (nachfrage) { var k = banner.querySelector('[data-st]'); if (k) k.focus(); }
  }

  // Link «Statistik-Einstellungen» in der Fusszeile und im Datenschutz
  document.addEventListener('click', function (e) {
    var l = e.target.closest && e.target.closest('[data-statistik-einstellungen]');
    if (!l) return;
    e.preventDefault();
    bannerZeigen(true);
  });

  // ---------- Erfassen ----------

  function pfadJetzt() {
    var p = location.pathname.replace(/\/index\.html$/, '/');
    return p.endsWith('/') ? p : p + '/';
  }

  function merke(e) {
    if (!aktiv) return;
    e.p = e.p || seite || pfadJetzt();
    warteschlange.push(e);
    if (warteschlange.length >= 30) senden();
  }

  function senden() {
    if (!aktiv || !warteschlange.length) return;
    while (warteschlange.length) {
      var teil = warteschlange.splice(0, 40);
      var daten = { s: sitzung, g: geraet, k: kampagne, e: teil };
      var text = JSON.stringify(daten);
      var ok = false;
      try { ok = navigator.sendBeacon && navigator.sendBeacon(ZIEL, new Blob([text], { type: 'text/plain' })); } catch (e) { ok = false; }
      if (!ok) { try { fetch(ZIEL, { method: 'POST', body: text, keepalive: true, mode: 'cors', credentials: 'omit', headers: { 'Content-Type': 'text/plain' } }).catch(function () {}); } catch (e) { /* nichts */ } }
    }
  }

  function einmal(schluessel, e) {
    if (gesendet[schluessel]) return;
    gesendet[schluessel] = true;
    merke(e);
  }

  function seiteVerlassen() {
    if (!seite) return;
    if (aktivSek > 0) merke({ t: 'engaged', p: seite, n: Math.round(aktivSek) });
    if (!vitals.gesendet) {
      vitals.gesendet = true;
      if (vitals.lcp !== null) merke({ t: 'web_vitals', p: seite, z: 'lcp', n: Math.round(vitals.lcp) });
      merke({ t: 'web_vitals', p: seite, z: 'cls', n: Math.round(vitals.cls * 1000) / 1000 });
      if (vitals.inp !== null) merke({ t: 'web_vitals', p: seite, z: 'inp', n: Math.round(vitals.inp) });
    }
    aktivSek = 0;
  }

  function seiteAufrufen() {
    var neu = pfadJetzt();
    if (neu === seite) return;
    seiteVerlassen();
    seite = neu;
    gesendet = {};
    fehlerZahl = 0;
    // Herkunft (nur Hostname) einzig beim ersten Seitenaufruf der Sitzung
    merke(ersterAufruf ? { t: 'page_view', p: seite, erster: true, r: herkunft || '' } : { t: 'page_view', p: seite });
    ersterAufruf = false;
    setTimeout(abschnitteSuchen, 300);
    setTimeout(scrollen, 300);
  }

  // Aktive Zeit: sichtbarer Tab und eine Handlung in den letzten 30 Sekunden
  function handlung() { letzteAktion = Date.now(); }
  setInterval(function () {
    if (aktiv && document.visibilityState === 'visible' && Date.now() - letzteAktion < 30000) aktivSek++;
  }, 1000);

  function scrollen() {
    if (!aktiv) return;
    var h = document.documentElement.scrollHeight;
    if (!h) return;
    var anteil = (window.scrollY + window.innerHeight) / h * 100;
    [25, 50, 75, 100].forEach(function (s) { if (anteil >= s - (s === 100 ? 2 : 0)) einmal('scroll' + s, { t: 'scroll', n: s }); });
  }

  // Abschnitte der Startseite (data-abschnitt), nur sichtbare Fassungen
  var beobachter = null, beobachtet = typeof WeakSet === 'function' ? new WeakSet() : null;
  function abschnitteSuchen() {
    if (!aktiv || !beobachter || !beobachtet) return;
    var liste = document.querySelectorAll('[data-abschnitt]');
    for (var i = 0; i < liste.length; i++) if (!beobachtet.has(liste[i])) { beobachtet.add(liste[i]); beobachter.observe(liste[i]); }
  }

  // Projekt-Check: Schritt aus dem Fortschrittsbalken
  var schrittStart = false;
  function projektCheck() {
    if (!aktiv) return;
    var balken = document.querySelectorAll('.q-prog[aria-valuenow]');
    for (var i = 0; i < balken.length; i++) {
      if (!balken[i].offsetParent) continue;
      var n = parseInt(balken[i].getAttribute('aria-valuenow'), 10);
      if (!(n >= 1)) continue;
      if (!schrittStart) { schrittStart = true; merke({ t: 'projektcheck_start' }); }
      var bekannt = lesen('sessionStorage', 'odera-st-schritte') || '';
      if ((',' + bekannt + ',').indexOf(',' + n + ',') < 0) {
        schreiben('sessionStorage', 'odera-st-schritte', bekannt ? bekannt + ',' + n : String(n));
        merke({ t: 'projektcheck_step', n: n });
      }
    }
  }

  function kennung(text) {
    return String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').split('-').slice(0, 5).join('-').slice(0, 50);
  }

  function ausgehend(a) {
    var href = a.getAttribute('href') || '';
    if (/^mailto:/i.test(href)) return 'mailto';
    if (/^tel:/i.test(href)) return 'telefon';
    var u;
    try { u = new URL(href, location.href); } catch (e) { return null; }
    if (u.host === location.host || !/^https?:$/.test(u.protocol)) return null;
    var h = u.hostname.replace(/^www\./, '');
    if (/(^|\.)linkedin\.com$/.test(h)) return /^\/company\//.test(u.pathname) ? 'linkedin-firma' : 'linkedin';
    if (h === 'nico-bodmer.ch') return 'portfolio';
    if (/atrega/.test(h)) return 'atrega';
    return h.slice(0, 60);
  }

  function generatorBranche() {
    var c = document.querySelector('.gen-chip[aria-checked="true"]');
    return c ? c.textContent.trim() : null;
  }

  function klick(e) {
    handlung();
    if (!aktiv) return;
    var t = e.target;
    if (!t || !t.closest || t.closest('.st-banner,[data-statistik-einstellungen]')) return;
    var chip = t.closest('.gen-chip');
    if (chip) { merke({ t: 'generator_use', z: chip.textContent.trim() }); return; }
    if (t.closest('.gen-beispiel')) { merke({ t: 'generator_use', z: generatorBranche() || 'unbekannt' }); return; }
    if (t.closest('.gen-start')) { merke({ t: 'generator_cta', z: generatorBranche() || 'unbekannt' }); return; }
    var a = t.closest('a[href],button');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var muster = href.match(/\/musterprojekte\/(doppelmeter|firstlicht)\//);
    if (muster) merke({ t: 'muster_open', z: muster[1] });
    var ziel = a.tagName === 'A' ? ausgehend(a) : null;
    if (ziel) merke({ t: 'outbound_click', z: ziel });
    var quelleAttr = a.getAttribute('data-quelle');
    if (quelleAttr && quelleAttr.indexOf('paket-') === 0) merke({ t: 'pricing_click', z: quelleAttr.slice(6) });
    if (/\/projekt-check\/?/.test(href)) {
      var abschnitt = a.closest('[data-abschnitt]');
      var id = quelleAttr ? (quelleAttr.indexOf('paket-') === 0 ? quelleAttr : quelleAttr + '-projekt-check')
        : (abschnitt ? abschnitt.getAttribute('data-abschnitt') : 'seite') + '-projekt-check';
      merke({ t: 'cta_click', z: id });
    }
  }

  var generatorEingabe = false;
  function eingabe(e) {
    handlung();
    if (aktiv && !generatorEingabe && e.target && e.target.id === 'gen-name') { generatorEingabe = true; merke({ t: 'generator_use', z: generatorBranche() || 'unbekannt' }); }
  }

  function aufklappen(e) {
    var d = e.target;
    if (!aktiv || !d || d.tagName !== 'DETAILS' || !d.open) return;
    var s = d.querySelector('summary');
    if (s && d.closest('[data-abschnitt="fragen"], .fragen')) merke({ t: 'faq_open', z: kennung(s.textContent) });
  }

  // Ereignisse aus anderen Modulen (Chat, Projekt-Check senden): window.dispatchEvent(new CustomEvent('odera:messung', { detail }))
  function modulEreignis(e) {
    var d = e.detail || {};
    if (!d.t) return;
    var ev = { t: d.t };
    if (d.z) ev.z = d.t === 'chat_preset' ? kennung(d.z) : d.z;
    merke(ev);
  }

  function fehler(meldung, quelle) {
    if (!aktiv || fehlerZahl >= 5) return;
    fehlerZahl++;
    merke({ t: 'js_error', z: String(meldung || 'Fehler').slice(0, 160), i: String(quelle || '').slice(0, 120) });
  }

  function vitalsBeobachten() {
    if (typeof PerformanceObserver !== 'function') return;
    try { new PerformanceObserver(function (l) { var e = l.getEntries(); if (e.length) vitals.lcp = e[e.length - 1].startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch (e) { /* nicht unterstützt */ }
    try { new PerformanceObserver(function (l) { l.getEntries().forEach(function (x) { if (!x.hadRecentInput) vitals.cls += x.value; }); }).observe({ type: 'layout-shift', buffered: true }); } catch (e) { /* nicht unterstützt */ }
    try { new PerformanceObserver(function (l) { l.getEntries().forEach(function (x) { if (x.interactionId && (vitals.inp === null || x.duration > vitals.inp)) vitals.inp = x.duration; }); }).observe({ type: 'event', buffered: true, durationThreshold: 16 }); } catch (e) { /* nicht unterstützt */ }
  }

  // ---------- Start und Stopp ----------

  function starten() {
    aktiv = true;
    sitzung = lesen('sessionStorage', 'odera-sid');
    var neueSitzung = !sitzung;
    if (neueSitzung) {
      sitzung = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2, 12)).replace(/[^A-Za-z0-9_-]/g, '');
      schreiben('sessionStorage', 'odera-sid', sitzung);
    }
    ersterAufruf = neueSitzung;
    geraet = window.innerWidth < 768 ? 'mobil' : window.innerWidth < 1024 ? 'tablet' : 'desktop';
    var k = new URLSearchParams(location.search).get('k');
    if (k && /^(ak-\d{4}-w\d{2}|li-\d{4}-w\d{2}-(mo|mi|fr)|gbp)$/.test(k)) schreiben('sessionStorage', 'odera-k', k);
    kampagne = lesen('sessionStorage', 'odera-k');
    herkunft = null;
    if (neueSitzung) {
      try { var r = document.referrer ? new URL(document.referrer) : null; herkunft = r && r.host !== location.host ? r.hostname : ''; } catch (e) { herkunft = ''; }
    }
    if (typeof IntersectionObserver === 'function') {
      beobachter = new IntersectionObserver(function (eintraege) {
        eintraege.forEach(function (x) {
          if (!x.isIntersecting || !x.target.offsetParent) return;
          var gross = x.boundingClientRect.height > window.innerHeight;
          if (x.intersectionRatio >= 0.3 || (gross && x.intersectionRect.height >= window.innerHeight * 0.5)) {
            var id = x.target.getAttribute('data-abschnitt');
            einmal('abschnitt-' + id, { t: 'section_view', z: id });
          }
        });
      }, { threshold: [0, 0.3, 0.6] });
    }
    seite = null;
    seiteAufrufen();
    vitalsBeobachten();
  }

  function stoppen() {
    aktiv = false;
    warteschlange = [];
    if (beobachter) { beobachter.disconnect(); beobachter = null; }
    if (beobachtet) beobachtet = new WeakSet();
    schreiben('sessionStorage', 'odera-sid', null);
    schreiben('sessionStorage', 'odera-k', null);
    schreiben('sessionStorage', 'odera-st-schritte', null);
  }

  // Seitenwechsel ohne Neuladen (history.pushState) erkennen
  ['pushState', 'replaceState'].forEach(function (name) {
    var original = history[name];
    history[name] = function () {
      var r = original.apply(this, arguments);
      if (aktiv) setTimeout(seiteAufrufen, 0);
      return r;
    };
  });
  window.addEventListener('popstate', function () { if (aktiv) setTimeout(seiteAufrufen, 0); });

  var anstoss = null;
  new MutationObserver(function () {
    if (!aktiv || anstoss) return;
    anstoss = setTimeout(function () { anstoss = null; abschnitteSuchen(); projektCheck(); }, 400);
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-valuenow'] });

  document.addEventListener('click', klick, true);
  document.addEventListener('input', eingabe, true);
  document.addEventListener('keydown', handlung, true);
  document.addEventListener('toggle', aufklappen, true);
  window.addEventListener('scroll', function () { handlung(); scrollen(); }, { passive: true });
  window.addEventListener('pointermove', function () { if (Date.now() - letzteAktion > 5000) handlung(); }, { passive: true });
  window.addEventListener('odera:messung', modulEreignis);
  window.addEventListener('error', function (e) { fehler(e.message, (e.filename || '').replace(location.origin, '') + (e.lineno ? ':' + e.lineno : '')); });
  window.addEventListener('unhandledrejection', function (e) { fehler(e.reason && e.reason.message ? e.reason.message : 'Unbehandelte Ablehnung', ''); });
  setInterval(senden, 5000);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') { seiteVerlassen(); senden(); } });
  window.addEventListener('pagehide', function () { seiteVerlassen(); senden(); });

  function los() {
    var wahl = lesen('localStorage', WAHL);
    letzteAktion = Date.now();
    if (wahl === 'ja') starten();
    else if (wahl !== 'nein') {
      // Banner erst nach der ersten Handlung oder nach 2,5 s, damit er das erste Zeichnen der Seite nicht bremst (LCP)
      if (window.__bannerSofort) { bannerZeigen(false); return; }
      var gezeigt = false;
      var zeigen = function () {
        if (gezeigt) return; gezeigt = true;
        ['scroll', 'pointerdown', 'keydown'].forEach(function (n) { window.removeEventListener(n, zeigen, true); });
        bannerZeigen(false);
      };
      ['scroll', 'pointerdown', 'keydown'].forEach(function (n) { window.addEventListener(n, zeigen, { capture: true, passive: true }); });
      setTimeout(zeigen, 2500);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', los); else los();
})();
