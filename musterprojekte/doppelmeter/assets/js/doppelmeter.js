/* Schreinerei Doppelmeter, Beispielseite von ODERA Design
   Zwei Aufgaben, sonst nichts:
   1. Menü auf Handy und Tablet ein- und ausklappen
   2. Kontaktformular prüfen und eine Demo-Bestätigung zeigen (es wird nichts gesendet)
   Ohne JavaScript funktioniert die Seite weiter: Der Menü-Knopf führt dann zur
   Navigation in der Fusszeile, das Formular sendet nichts (method="dialog"). */

(function () {
  'use strict';

  /* 0. Im Overlay von odera.ch: Die Overlay-Leiste zeigt den Hinweis auf die
     Beispielseite, die eigene Leiste entfällt dort. Nur bei gleicher Herkunft
     und vorhandener Overlay-Leiste, sonst bleibt alles wie es ist. */
  try {
    if (window.self !== window.top && window.parent.location.origin === location.origin &&
        window.parent.document.querySelector('.mp-ovbar')) {
      document.documentElement.classList.add('im-rahmen');
    }
  } catch (e) { /* fremde Herkunft: Leiste bleibt sichtbar */ }

  /* 1. Menü
     ------------------------------------------------------------------ */
  function menuEinrichten() {
    var link = document.querySelector('[data-menu-knopf]');
    var nav = document.getElementById('hauptnav');
    if (!link || !nav) return;

    // Aus dem Link wird ein echter Knopf mit aria-expanded
    var knopf = document.createElement('button');
    knopf.type = 'button';
    knopf.className = link.className;
    knopf.innerHTML = link.innerHTML;
    knopf.setAttribute('aria-expanded', 'false');
    knopf.setAttribute('aria-controls', 'hauptnav');
    link.parentNode.replaceChild(knopf, link);

    function setzen(offen) {
      knopf.setAttribute('aria-expanded', String(offen));
      nav.classList.toggle('ist-offen', offen);
      knopf.querySelector('span:last-child').textContent = offen ? 'Schliessen' : 'Menü';
    }

    knopf.addEventListener('click', function () {
      setzen(knopf.getAttribute('aria-expanded') !== 'true');
    });

    // Escape schliesst das Menü und setzt den Fokus zurück
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && knopf.getAttribute('aria-expanded') === 'true') {
        setzen(false);
        knopf.focus();
      }
    });

    // Klick ausserhalb schliesst das Menü
    document.addEventListener('click', function (e) {
      if (knopf.getAttribute('aria-expanded') === 'true' && !nav.contains(e.target) && !knopf.contains(e.target)) {
        setzen(false);
      }
    });

    // Beim Wechsel auf Desktop-Breite zurücksetzen
    var desktop = window.matchMedia('(min-width: 64em)');
    var zuruecksetzen = function () { if (desktop.matches) setzen(false); };
    if (desktop.addEventListener) desktop.addEventListener('change', zuruecksetzen);
  }

  /* 2. Kontaktformular (Demo)
     Gleiches Verhalten wie der Projekt-Check auf odera.ch: Pflichtfelder gekennzeichnet,
     Knopf nie gesperrt, Fehler am Feld mit Symbol, Fokus ins erste Feld, Zusammenfassung
     ab zwei Fehlern, Zeile «Noch offen» unter dem Knopf, Tippfehler-Vorschlag bei der E-Mail.
     ------------------------------------------------------------------ */
  var MELDUNGEN = {
    name: 'Bitte geben Sie Ihren Namen ein.',
    telefon: 'Bitte geben Sie Ihre Telefonnummer ein, damit wir Sie zurückrufen können.',
    telefonFormat: 'Diese Telefonnummer scheint unvollständig. Beispiel: 079 123 45 67',
    email: 'Diese E-Mail-Adresse scheint unvollständig. Beispiel: anna@ihrbetrieb.ch',
    anliegen: 'Bitte wählen Sie eine Antwort.'
  };
  var LABEL = { name: 'Name', telefon: 'Telefon', email: 'E-Mail', anliegen: 'Anliegen' };
  // Dieselben Muster wie ANFRAGE.pruefung in odera.ch (index.html)
  var EMAIL = /^[^\s@<>()[\]\\,;:"]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;
  var DOMAINS = ['gmail.com', 'googlemail.com', 'gmx.ch', 'gmx.net', 'gmx.de', 'bluewin.ch', 'hotmail.com', 'hotmail.ch', 'outlook.com', 'live.com',
    'icloud.com', 'me.com', 'yahoo.com', 'yahoo.de', 'sunrise.ch', 'hispeed.ch', 'protonmail.com', 'proton.me', 'web.de', 'quickline.ch'];

  function telefonOk(v) {
    if (!/^\+?[0-9 ().\/-]+$/.test(v)) return false;
    var z = v.replace(/\D/g, '');
    if (z.length < 9 || z.length > 15) return false;
    if (v.charAt(0) !== '+' && /^0[1-9]/.test(z)) return z.length === 10;
    return true;
  }

  function abstand(a, b) {
    var d = [], i, j;
    for (i = 0; i <= a.length; i++) d[i] = [i];
    for (j = 1; j <= b.length; j++) d[0][j] = j;
    for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }

  function mailVorschlag(v) {
    var t = v.toLowerCase(), at = t.lastIndexOf('@');
    if (at < 1) return '';
    var dom = t.slice(at + 1), best = '', bestD = 9;
    if (!dom || DOMAINS.indexOf(dom) >= 0) return '';
    DOMAINS.forEach(function (x) { var n = abstand(dom, x); if (n < bestD) { bestD = n; best = x; } });
    return bestD === 1 || (bestD === 2 && dom.length >= 9) ? t.slice(0, at + 1) + best : '';
  }

  function formularEinrichten() {
    var form = document.querySelector('[data-demo-formular]');
    if (!form) return;
    form.setAttribute('novalidate', '');

    var bestaetigung = document.getElementById('formular-bestaetigung');
    var zusammen = document.getElementById('formular-zusammen');
    var offenZeile = document.getElementById('formular-offen');
    var felder = form.querySelectorAll('[data-pruefen]');
    var versucht = false, bearbeitet = {};
    var bewegung = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function pruefen(feld) {
      var wert = feld.value.trim();
      switch (feld.name) {
        case 'name': return wert ? '' : MELDUNGEN.name;
        case 'telefon': return !wert ? MELDUNGEN.telefon : telefonOk(wert) ? '' : MELDUNGEN.telefonFormat;
        case 'email': return !wert || EMAIL.test(wert) ? '' : MELDUNGEN.email;
        case 'anliegen': return wert ? '' : MELDUNGEN.anliegen;
        default: return '';
      }
    }

    function vorschlagZeigen(feld) {
      if (feld.name !== 'email') return;
      var box = document.getElementById('f-email-vorschlag');
      var v = (versucht || bearbeitet.email) && feld.value.trim() ? mailVorschlag(feld.value.trim()) : '';
      box.hidden = !v;
      box.textContent = '';
      if (!v) return;
      var knopf = document.createElement('button');
      knopf.type = 'button'; knopf.className = 'knopf-link'; knopf.textContent = v;
      knopf.addEventListener('click', function () { feld.value = v; anzeigen(feld); offenAktualisieren(); feld.focus(); });
      box.append('Meinten Sie ', knopf, '?');
    }

    function fehlerSetzen(feld, text) {
      var ausgabe = document.getElementById(feld.id + '-fehler');
      var hatte = feld.getAttribute('aria-invalid') === 'true';
      if (!ausgabe) return;
      if (text) {
        ausgabe.textContent = text;
        ausgabe.hidden = false;
        feld.setAttribute('aria-invalid', 'true');
      } else {
        ausgabe.textContent = '';
        ausgabe.hidden = true;
        feld.setAttribute('aria-invalid', 'false');
        // Behoben: kurz ein Häkchen
        if (hatte) { var feldBox = feld.closest('.feld'); feldBox.classList.remove('ist-ok'); void feldBox.offsetWidth; feldBox.classList.add('ist-ok'); }
      }
    }

    function anzeigen(feld) { fehlerSetzen(feld, pruefen(feld)); vorschlagZeigen(feld); }

    function offenAktualisieren() {
      var offen = [];
      Array.prototype.forEach.call(felder, function (f) { if (pruefen(f)) offen.push(LABEL[f.name]); });
      offenZeile.textContent = offen.length ? 'Noch offen: ' + offen.join(', ') : '';
    }

    function aufleuchten(feld) {
      var box = feld.closest('.feld');
      box.classList.remove('ist-fehler-puls');
      void box.offsetWidth;
      if (bewegung) box.classList.add('ist-fehler-puls');
    }

    // Erst prüfen, wenn jemand im Feld etwas getan hat oder nach dem ersten Absenden
    Array.prototype.forEach.call(felder, function (feld) {
      feld.addEventListener('input', function () {
        bearbeitet[feld.name] = true;
        if (versucht || feld.getAttribute('aria-invalid') === 'true') anzeigen(feld);
        offenAktualisieren();
      });
      feld.addEventListener('change', function () { bearbeitet[feld.name] = true; if (versucht) anzeigen(feld); offenAktualisieren(); });
      feld.addEventListener('blur', function () { if (bearbeitet[feld.name]) anzeigen(feld); });
    });
    offenAktualisieren();

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      versucht = true;
      var falsche = [];
      Array.prototype.forEach.call(felder, function (feld) {
        anzeigen(feld);
        if (pruefen(feld)) { falsche.push(feld); aufleuchten(feld); }
      });
      zusammen.textContent = '';
      zusammen.hidden = falsche.length < 2;
      if (falsche.length >= 2) {
        var titel = document.createElement('p');
        titel.textContent = 'Bitte prüfen Sie ' + falsche.length + ' Angaben:';
        var liste = document.createElement('ul');
        falsche.forEach(function (f) {
          var li = document.createElement('li'), a = document.createElement('a');
          a.href = '#' + f.id; a.textContent = LABEL[f.name];
          a.addEventListener('click', function (ev) { ev.preventDefault(); f.focus(); });
          li.appendChild(a); liste.appendChild(li);
        });
        zusammen.append(titel, liste);
      }
      if (falsche.length) { falsche[0].focus(); return; }

      // Demo: nichts senden, nur bestätigen
      var name = form.elements.name.value.trim().split(/\s+/)[0];
      bestaetigung.querySelector('[data-name]').textContent = name ? ', ' + name : '';
      form.hidden = true;
      bestaetigung.hidden = false;
      bestaetigung.focus();
    });

    // «Neue Anfrage» setzt die Demo zurück
    var zurueck = bestaetigung && bestaetigung.querySelector('[data-zuruecksetzen]');
    if (zurueck) {
      zurueck.addEventListener('click', function () {
        form.reset(); versucht = false; bearbeitet = {};
        Array.prototype.forEach.call(felder, function (f) { fehlerSetzen(f, ''); f.closest('.feld').classList.remove('ist-ok'); });
        document.getElementById('f-email-vorschlag').hidden = true;
        zusammen.hidden = true; offenAktualisieren();
        bestaetigung.hidden = true;
        form.hidden = false;
        form.elements.name.focus();
      });
    }
  }

  function start() {
    menuEinrichten();
    formularEinrichten();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
