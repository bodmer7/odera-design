# CLAUDE.md: Entscheidungen und offene Punkte für odera.ch

Kurzfassung für die Arbeit an diesem Repo. Technische Details stehen im `README.md`,
hier steht nur, was festgelegt wurde und was noch offen ist. Stand: 8. Oktober 2026.

## Feste Regeln

- **Sichtbare Texte:** Schweizer Rechtschreibung (ss, nie ß), Sie-Form, keine Gedankenstriche
  (– oder —). Berichte an Nico auf Deutsch im selben Stil.
- **Nichts erfinden:** keine Kundenstimmen, Kundenzahlen, Statistiken oder Auszeichnungen. Jede Zahl
  muss belegbar sein. Preise, Paketinhalte, Fristen und Garantien nie selbst ändern, nur vorschlagen.
- **Datenschutz als Markenversprechen:** Kein Tracking ohne Einwilligung, keine Cookies. Einzige
  Ausnahme ist die Statistik mit Opt-in nach Teil 11, mit eigener Datenbank odera-stats (EU) und
  ohne Personendaten. Sonst keine Pop-ups, keine Dark Patterns, keine weitere Datenbank, keine
  Secrets im Browser, keine URL-Parameter mit Personendaten.
- **Nur Gratis-Pläne:** GitHub Pages, Cloudflare Workers und Workers AI, Resend. Nie nach Schlüsseln
  im Chat fragen.
- **Veröffentlichen:** ohne weiteres OK, wenn alles grün ist (Funktionstests, Kontrast, Lighthouse
  nicht schlechter, Konsole sauber). Sonst stoppen und berichten.
- **Desktop ab 1024 px** ist abgenommen. Änderungen für kleinere Breiten gehen in den Block
  `<style id="mobil">` und werden per Pixelvergleich bei 1024 und 1440 px gegen `main` geprüft.

## Arbeitsweise

- Stack: Quelle ist `src/seite.html` mit Claude-Design-Vorlagen (`<x-dc>`), kein Astro. `index.html` und alle
  Routen sind erzeugt (nur eigener Inhalt, ohne Vorlage), die Vorlage liegt erzeugt in `assets/js/vorlage.js`.
  Tests: `node tools/funktionstest.mjs`, `node tools/links-pruefen.mjs`. Nach **jeder** Änderung
  `node tools/seo-build.mjs` laufen lassen, er erzeugt Unterseiten, Vorab-Block, Sitemap und das
  Wissen des Chat-Assistenten.
- Änderungen nur in der Vorlage ab `<x-dc>` und im `<head>`. Der Vorab-Block `<!-- vorab:… -->` wird
  überschrieben. Die rohe Vorlage enthält jedes Element ein zweites Mal unsichtbar: im Code
  `this.sichtbar(sel)` verwenden, in Tests `:visible`.
- Fallen in der dc-Laufzeit: camelCase-Attribute werden umgeschrieben (in CSS-SVGs `%76iewBox`
  schreiben); native Ereignis-Attribute und `src="{{ … }}"` laufen schon in der rohen Vorlage, darum
  iframes und Lade-Listener per Code erzeugen.
- Veröffentlichen: Feature-Branch, Fast-Forward auf `main`, Push. GitHub Actions lädt nach Infomaniak
  hoch, GitHub Pages baut parallel. Ändert sich etwas, das der Chat-Assistent wissen soll
  (`chat-proxy/src/wissen.js`), danach `chat-proxy` deployen. Ändern sich Formular oder Prüfregeln,
  zuerst `anfrage-proxy`, dann `chat-proxy` deployen.
- Commits werden über 1Password signiert und scheitern oft mit «failed to fill whole buffer».
  Mehrmals versuchen, sonst Nico bitten, 1Password zu entsperren.
- Headless-Testläufe räumen ihre Chrome-Profile im System-Temp auf. Am 1. Oktober 2026 hatten
  liegengebliebene Profile die Platte gefüllt (26 GB).

## Wichtige Entscheidungen

### Projekt-Check (Formular)
- Jedes Feld ist als Pflichtfeld oder optional gekennzeichnet. «Weiter» ist nie gesperrt, darunter
  steht «Noch offen: …». Fehler zeigen sich am Feld, mit Fokus auf dem ersten Fehler, ab zwei
  Fehlern mit Zusammenfassung. Tippfehler-Vorschläge «Meinten Sie …?».
- Browser und Worker prüfen mit denselben Regeln (`anfrage-proxy/src/regeln.js`).
- Fehlerfarbe `#B42318` (AA auf allen Flächen).
- Mindestdauer bis zum Senden: 20 s (voll), 6 s (Kurzversion). Schnellere Anfragen lehnt der Worker
  ab, auch in Tests.

### Musterprojekt Doppelmeter
- Eigene statische Seite unter `/musterprojekte/doppelmeter/`, `noindex`, nicht in der Sitemap.
  `/muster/doppelmeter.html` leitet weiter. Schriften lokal, Fotos von Unsplash, Nachweise im Impressum.
- Overlay auf der Musterprojekte-Seite mit Ladezustand und «In neuem Tab öffnen». Das iframe entsteht
  erst beim Öffnen. Unter 768 px öffnet der Link die Seite direkt.
- Angezeigte Ladezeit aus der Konstante `LADEZEIT` in `index.html`.

### Handy und Tablet (unter 1024 px)
- Eigenes blaues Vollbild-Menü, iOS-sichere Scroll-Sperre, Wisch nach unten schliesst,
  `theme-color` wird blau. Kopf 56 px, gleitet beim Runterscrollen weg.
- Startseite: erster Bildschirm nur Titel, Satz, vier Antwort-Chips und Vertrauenszeile.
- Pakete und Betriebsarten als wischbare Karten (Klasse `wisch`), Standard zuerst. Begründung: ein
  statt zweieinhalb Bildschirme.
- Projekt-Check: Weiter-Leiste über der Tastatur (`visualViewport`, `--tastatur`).
- Chat unter 768 px als Blatt von unten.

### Generator «Sehen Sie Ihren Betrieb in zehn Sekunden» (Seite Musterprojekte)
- Modul `assets/js/generator.js`, lädt erst beim Heranscrollen. Nichts wird gespeichert oder gesendet.
- Sechs Branchen (Handwerk, Praxis, Beratung, Gastronomie, Verkauf, Verein) mit den Fotos, Texten und
  Farben aus Nicos Vorgabe. Fotos in `assets/img/generator/`, von Nico geliefert, Unsplash-Lizenz,
  Fotografen im Impressum. Das frühere Vereinsfoto mit Kindern ist bewusst entfernt.
- Umschalter Desktop/Handy, «Beispiel zeigen», Suchergebnis-Karte mit Hinweis zur Platzierung.
- Übergabe an den Projekt-Check nur über eine JavaScript-Variable (`generatorCheck`), keine
  URL-Parameter. Nur vorausfüllen. Verein und andere unbekannte Branchen kommen als «Andere» mit Text.
- Eine frühere Fassung mit zwölf Branchen und drei Stilen wurde auf Nicos Wunsch verworfen.

### Rechtstexte
- Datenschutz, AGB und Impressum teilen ein Stand-Datum: `STAND_RECHTSTEXTE` (zurzeit «Oktober 2026»).
- Die Datenschutzerklärung hat zwei Varianten für die Abschnitte 5 bis 7 (`dsMail` und `dsDirekt`).
  Live ist die Variante mit direktem Senden.
- Neu im Oktober 2026: Datenschutz Abschnitt 9 «Website-Vorschau», AGB Paragrafen 16 bis 18
  (Online-Vorschau, Lizenzbilder, Domain), Bildnachweis der Vorschau im Impressum. Inhalte und
  Bildrechte der Kunden regelt der bestehende Paragraf 11, darum dort nichts ergänzt.
- Bestehende Klauseln werden nie umformuliert, nur ergänzt und sauber weiternummeriert.

### Musterprojekte (`musterprojekte/`), Regeln für jedes Muster

Beispielseiten erfundener Betriebe (Doppelmeter, Firstlicht). Für jedes Muster gilt:

- Beispiel-Leiste auf jeder Seite («Beispielseite von ODERA Design. Der Betrieb
  ist frei erfunden.») mit Link zurück zu odera.ch und zum Projekt-Check
  (`?quelle=<muster>`, passender Eintrag in `EINSTIEGE` in `index.html`).
  Hinweis im Fuss wiederholen.
- Im Overlay von odera.ch blenden die Muster ihre Beispiel-Leiste aus (`html.im-rahmen`),
  die Overlay-Leiste zeigt dann den Hinweis. Neue Muster brauchen dieselbe Erkennung.
- `noindex`, nicht in der Sitemap. `seo-build` lässt `musterprojekte/<name>/` stehen.
- Nur erfundene Kontaktdaten. Keine Bewertungen, Sterne, Zitate, Labels,
  Zertifikate, Verbände oder Herstellermarken. Keine erkennbaren Gesichter,
  Kennzeichen, Hausnummern oder Strassenschilder.
- Demo-Formulare senden nichts.
- Impressum nennt ODERA Design als Betreiberin und verlinkt das echte Impressum.
- Schweizer Hochdeutsch, Sie-Form, kein ß, keine Halbgeviert- oder Geviertstriche
  im sichtbaren Text, Zahlen über `Intl.NumberFormat('de-CH')`.
- Keine externen Anfragen zur Laufzeit: Schriften, Bilder, Daten lokal.
- Tatsachen mit Quelle belegen (Firstlicht: `faktencheck.md`, `daten/annahmen.json`).

### Firstlicht

- Seiten in `musterprojekte/firstlicht/*.html` sind erzeugt. Bearbeiten in
  `tools/firstlicht/vorlagen/` und `tools/firstlicht/css/`, dann
  `npm run firstlicht:build`. Die CSP enthält Hashes der Inline-Skripte.
- Vor dem Commit: `npm run firstlicht:qa` (Build, Tests, Regelprüfung, Browser).
  In der Cloud `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` setzen.
- Details, Annahmen-Pflege und Befehle: `musterprojekte/firstlicht/README.md`.

## Offene Punkte

- [ ] **Ladezeit Doppelmeter auf dem Handy:** 1,65 bis 2,5 s mit gedrosseltem Netz, Ziel war 1 s.
      Desktop 0,4 bis 0,5 s.
- [ ] **Vereinsfoto:** Auf dem Ball ist der Schriftzug «adidas» lesbar. Nico entscheidet, ob der
      Ausschnitt geändert wird.
- [ ] **Link «nico-bodmer.ch»** in der Portfolio-Karte hat 4 px mehr Innenabstand (Tippfläche,
      Lighthouse). Nico kann das zurücknehmen lassen.
- [ ] **Test auf echtem iPhone** nach Nicos Checkliste (Menü, Wischen, Projekt-Check mit Tastatur,
      Chat, untere Leiste) steht aus. Echte Tastatur und VoiceOver wurden nur simuliert.
- [ ] **Cloudflare im Datenschutz:** Registerstatus am 28. September 2026 «Active, Re-certification
      under Review». Status nachprüfen und Text bei Bedarf anpassen.
- [ ] **Testskripte liegen nicht im Repo**, nur im Scratchpad einer Claude-Sitzung. macOS hat einen
      Teil gelöscht, darunter den Test für den Preis-Rechner. Testreihe in `tools/` übernehmen.
- [ ] **Unzuverlässiger Test:** `einstiege` bei 390 px scheitert manchmal beim Senden, wenn er direkt
      nach anderen Tests läuft. Einzeln grün.
- [ ] **`README.md` ist öffentlich** unter odera.ch/README.md erreichbar (GitHub Pages). Prüfen, ob
      das gewollt ist. `CLAUDE.md` ist von beiden Hosts ausgeschlossen.
- [ ] **Alte lokale Branches** aufräumen (`fehler`, `mobil`, `generator`, `generator2` und ältere
      sind in `main` enthalten). Ausnahme: `chat-assistent` hat Commits, die nicht in `main` sind.
      Vor dem Löschen prüfen.
