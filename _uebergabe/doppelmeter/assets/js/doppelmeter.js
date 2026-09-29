/* Schreinerei Doppelmeter, Beispielseite von ODERA Design
   Zwei Aufgaben, sonst nichts:
   1. Menü auf Handy und Tablet ein- und ausklappen
   2. Kontaktformular prüfen und eine Demo-Bestätigung zeigen (es wird nichts gesendet)
   Ohne JavaScript funktioniert die Seite weiter: Der Menü-Knopf führt dann zur
   Navigation in der Fusszeile, das Formular sendet nichts (method="dialog"). */

(function () {
  'use strict';

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
     ------------------------------------------------------------------ */
  var MELDUNGEN = {
    name: 'Bitte geben Sie Ihren Namen an.',
    telefon: 'Bitte geben Sie eine Telefonnummer an, unter der wir Sie erreichen.',
    telefonFormat: 'Diese Telefonnummer scheint unvollständig. Bitte mit Vorwahl, zum Beispiel 079 123 45 67.',
    email: 'Diese E-Mail-Adresse stimmt nicht ganz. Beispiel: name@beispiel.ch',
    anliegen: 'Bitte wählen Sie aus, worum es geht.'
  };

  function formularEinrichten() {
    var form = document.querySelector('[data-demo-formular]');
    if (!form) return;

    // Eigene Prüfung statt der Browser-Blasen
    form.setAttribute('novalidate', '');

    var bestaetigung = document.getElementById('formular-bestaetigung');

    function fehlerSetzen(feld, text) {
      var ausgabe = document.getElementById(feld.id + '-fehler');
      if (!ausgabe) return;
      if (text) {
        ausgabe.textContent = text;
        ausgabe.hidden = false;
        feld.setAttribute('aria-invalid', 'true');
      } else {
        ausgabe.textContent = '';
        ausgabe.hidden = true;
        feld.removeAttribute('aria-invalid');
      }
    }

    function pruefen(feld) {
      var wert = feld.value.trim();
      switch (feld.name) {
        case 'name':
          return wert.length >= 2 ? '' : MELDUNGEN.name;
        case 'telefon':
          if (!wert) return MELDUNGEN.telefon;
          // Mindestens 9 Ziffern, erlaubt sind Ziffern, Leerzeichen, +, (, ), / und .
          return /^[+()\d\s./]+$/.test(wert) && wert.replace(/\D/g, '').length >= 9 ? '' : MELDUNGEN.telefonFormat;
        case 'email':
          if (!wert) return '';
          return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(wert) ? '' : MELDUNGEN.email;
        case 'anliegen':
          return wert ? '' : MELDUNGEN.anliegen;
        default:
          return '';
      }
    }

    var felder = form.querySelectorAll('[data-pruefen]');

    // Fehler erst nach dem ersten Verlassen des Felds zeigen, danach laufend aktualisieren
    Array.prototype.forEach.call(felder, function (feld) {
      feld.addEventListener('blur', function () {
        if (feld.value.trim() || feld.hasAttribute('aria-invalid')) fehlerSetzen(feld, pruefen(feld));
      });
      feld.addEventListener('input', function () {
        if (feld.hasAttribute('aria-invalid')) fehlerSetzen(feld, pruefen(feld));
      });
      feld.addEventListener('change', function () {
        if (feld.hasAttribute('aria-invalid')) fehlerSetzen(feld, pruefen(feld));
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var erstesFalsches = null;

      Array.prototype.forEach.call(felder, function (feld) {
        var text = pruefen(feld);
        fehlerSetzen(feld, text);
        if (text && !erstesFalsches) erstesFalsches = feld;
      });

      if (erstesFalsches) {
        erstesFalsches.focus();
        return;
      }

      // Demo: nichts senden, nur bestätigen
      var name = form.elements.name.value.trim().split(/\s+/)[0];
      bestaetigung.querySelector('[data-name]').textContent = name ? ', ' + name : '';
      form.hidden = true;
      bestaetigung.hidden = false;
      bestaetigung.focus();
    });

    // "Neue Anfrage" setzt die Demo zurück
    var zurueck = bestaetigung && bestaetigung.querySelector('[data-zuruecksetzen]');
    if (zurueck) {
      zurueck.addEventListener('click', function () {
        form.reset();
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
