// Kopf und Menü auf den statischen Seiten unter /einblicke/ (Blog aus dem Akquise-Tool, ohne React).
// Gleiches Verhalten wie auf den übrigen Seiten (src/seite.html): Unterstrich unter dem aktiven Menüpunkt,
// Lesefortschritt, Kopf gleitet unter 1024 px beim Runterscrollen weg, blaues Vollbild-Menü mit iOS-sicherer
// Scroll-Sperre, Escape und Wisch nach unten schliessen. Kein Nachladen von Inhalten.

// Übersicht: zuerst zwei Reihen Beiträge, die dritte angeschnitten mit Verlauf, darunter «Mehr anzeigen».
// Alle Karten bleiben im HTML (Suchmaschinen, ohne JavaScript ist alles sichtbar). Nur auf der Übersicht (.eb-liste).
(function () {
  'use strict';
  var liste = document.querySelector('.eb-liste');
  if (!liste) return;
  var karten = Array.prototype.slice.call(liste.querySelectorAll('.eb-karte'));
  var mehr = null, offen = false, geplant = false;
  if (!liste.id) liste.id = 'eb-liste';

  function zuruecksetzen() {
    liste.removeAttribute('data-gekuerzt');
    liste.style.maxHeight = '';
    karten.forEach(function (k) { k.removeAttribute('inert'); });
    if (mehr) { mehr.parentNode.removeChild(mehr); mehr = null; }
  }

  function kuerzen() {
    geplant = false;
    if (offen) return;
    liste.setAttribute('data-gekuerzt', '1');
    liste.style.maxHeight = '';
    // Reihen über die Lage der Karten: drei Spalten ab 1101 px, zwei ab 768 px, darunter eine
    var reihen = [];
    karten.forEach(function (k) { if (reihen.indexOf(k.offsetTop) < 0) reihen.push(k.offsetTop); });
    reihen.sort(function (a, b) { return a - b; });
    if (reihen.length < 3) { zuruecksetzen(); return; }
    var hoehe = 0;
    karten.forEach(function (k) {
      if (k.offsetTop === reihen[2]) hoehe = Math.max(hoehe, k.offsetHeight);
      // Ab der dritten Reihe nicht erreichbar, solange gekürzt (die dritte ist nur angeschnitten zu sehen)
      if (k.offsetTop >= reihen[2]) k.setAttribute('inert', ''); else k.removeAttribute('inert');
    });
    liste.style.maxHeight = Math.round(reihen[2] + hoehe * 0.45) + 'px';
    if (!mehr) {
      mehr = document.createElement('div');
      mehr.className = 'eb-mehr';
      var knopf = document.createElement('button');
      knopf.type = 'button';
      knopf.className = 'btn btn-sekundaer';
      knopf.textContent = 'Mehr anzeigen';
      knopf.setAttribute('aria-expanded', 'false');
      knopf.setAttribute('aria-controls', liste.id);
      knopf.addEventListener('click', oeffnen);
      mehr.appendChild(knopf);
      liste.parentNode.insertBefore(mehr, liste.nextSibling);
    }
  }

  function oeffnen() {
    var erste = karten.filter(function (k) { return k.hasAttribute('inert'); })[0];
    offen = true;
    zuruecksetzen();
    var link = erste && erste.querySelector('.karte-link');
    if (link) link.focus({ preventScroll: true });
  }

  function spaeter() { if (!geplant && !offen) { geplant = true; window.requestAnimationFrame(kuerzen); } }
  kuerzen();
  window.addEventListener('resize', spaeter);
  window.addEventListener('load', spaeter);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(spaeter);
})();

(function () {
  'use strict';
  var html = document.documentElement;
  var kopf = document.querySelector('.kopf');
  var menue = document.getElementById('menue');
  // Ab 1024 px (bis das Menü in den Kopf passt) zeigt die Website das dunkle Menü, darunter das blaue.
  var menueAlt = document.querySelector('.menue-alt');
  var knopf = document.querySelector('.kopf .burger-knopf');
  if (!kopf) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var offen = false;
  var menueY = 0;
  var letztesY = window.scrollY || 0;

  function unterstrich() {
    var a = document.querySelector('.navmid a[aria-current="page"]');
    var u = document.querySelector('.navmid > span[aria-hidden="true"]');
    if (!a || !u) return;
    u.style.left = a.offsetLeft + 'px';
    u.style.width = a.offsetWidth + 'px';
    u.style.opacity = a.offsetWidth ? '1' : '0';
  }

  function scrollen() {
    var y = window.scrollY || 0;
    var dy = y - letztesY;
    letztesY = y;
    kopf.setAttribute('data-scroll', y > 40 ? '1' : '0');
    var weg = kopf.getAttribute('data-weg') === '1';
    if (window.innerWidth >= 1024 || offen || y < 80) weg = false;
    else if (dy > 6) weg = true;
    else if (dy < -4) weg = false;
    kopf.setAttribute('data-weg', weg ? '1' : '0');
    var max = document.body.scrollHeight - window.innerHeight;
    var faden = document.getElementById('thread');
    if (faden) faden.style.width = (max > 0 ? Math.min(1, Math.max(0, y / max)) * 100 : 0) + '%';
  }

  function sperren(an) {
    document.querySelectorAll('main, footer').forEach(function (x) { x.inert = an; });
  }

  function aufraeumen(zurueck) {
    if (!html.hasAttribute('data-menue')) return;
    var b = document.body.style;
    b.position = ''; b.top = ''; b.left = ''; b.right = ''; b.width = '';
    html.removeAttribute('data-menue');
    sperren(false);
    if (zurueck) { window.scrollTo({ top: menueY, behavior: 'instant' }); letztesY = menueY; }
  }

  function auf() {
    if (offen || !menue) return;
    offen = true;
    menueY = window.scrollY || 0;
    if (window.innerWidth < 1024) {
      var b = document.body.style;
      b.position = 'fixed'; b.top = -menueY + 'px'; b.left = '0'; b.right = '0'; b.width = '100%';
      html.setAttribute('data-menue', '1');
      sperren(true);
    }
    menue.hidden = false;
    if (menueAlt) menueAlt.hidden = false;
    menue.setAttribute('data-zu', '0');
    kopf.setAttribute('data-menue', '1');
    kopf.setAttribute('data-weg', '0');
    knopf.setAttribute('aria-expanded', 'true');
    knopf.setAttribute('aria-label', 'Menü schliessen');
    setTimeout(function () {
      var l = menue.querySelector('.menue-link');
      if (l && window.innerWidth < 1024) l.focus({ preventScroll: true });
    }, 60);
  }

  function zu(fokus, sofort) {
    if (!offen) return;
    var fertig = function () {
      aufraeumen(true);
      menue.hidden = true;
      if (menueAlt) menueAlt.hidden = true;
      menue.setAttribute('data-zu', '0');
      offen = false;
      kopf.setAttribute('data-menue', '0');
      knopf.setAttribute('aria-expanded', 'false');
      knopf.setAttribute('aria-label', 'Menü öffnen');
      if (fokus) knopf.focus({ preventScroll: true });
    };
    if (sofort || window.innerWidth >= 1024) { fertig(); return; }
    menue.setAttribute('data-zu', '1');
    setTimeout(fertig, reduce ? 120 : 220);
  }

  if (knopf && menue) {
    knopf.addEventListener('click', function () { if (offen) zu(true); else auf(); });
    var altZu = document.querySelector('.menue-alt-zu');
    if (altZu) altZu.addEventListener('click', function () { zu(true); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && offen) zu(true); });
    // Link im Menü: Scroll-Sperre lösen, bevor die neue Seite lädt
    [menue, menueAlt].forEach(function (m) {
      if (!m) return;
      m.addEventListener('click', function (e) {
        var a = e.target.closest && e.target.closest('a[href]');
        if (a && offen) aufraeumen(false);
      });
    });
    // Menü nach unten wischen schliesst es (ab 80 px), das Menü folgt dem Finger
    var wischY = null;
    var wischD = 0;
    document.addEventListener('touchstart', function (e) {
      var m = e.target.closest && e.target.closest('#menue');
      wischY = m && m.scrollTop <= 0 && offen && menue.getAttribute('data-zu') !== '1' ? e.touches[0].clientY : null;
      wischD = 0;
    }, { passive: true });
    document.addEventListener('touchmove', function (e) {
      if (wischY === null) return;
      wischD = e.touches[0].clientY - wischY;
      if (wischD > 0) { menue.style.animation = 'none'; menue.style.transform = 'translateY(' + Math.round(wischD * 0.6) + 'px)'; }
    }, { passive: true });
    document.addEventListener('touchend', function () {
      if (wischY === null) return;
      menue.style.transition = 'transform 200ms ease-out';
      menue.style.transform = '';
      setTimeout(function () { menue.style.transition = ''; menue.style.animation = ''; }, 220);
      if (wischD > 80) zu(true);
      wischY = null;
    }, { passive: true });
    // Zurück aus dem Zwischenspeicher des Browsers: Menü geschlossen
    window.addEventListener('pageshow', function (e) { if (e.persisted && offen) zu(false, true); });
  }

  window.addEventListener('scroll', scrollen, { passive: true });
  window.addEventListener('resize', unterstrich);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(unterstrich);
  unterstrich();
  scrollen();
})();
