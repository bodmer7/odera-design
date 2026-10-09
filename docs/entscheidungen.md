# Entscheidungen zum Redesign (Oktober 2026)

Hier steht, was ich beim Umbau nach dem Auftrag «odera.ch hochwertiger, ruhiger, messbar und bei Google
sichtbar machen» selbst entschieden habe, mit Begründung. Nicos Antworten auf die offenen Fragen stehen
ganz oben.

## Antworten von Nico (8. Oktober 2026)

| Frage | Antwort |
|---|---|
| Zweites Musterprojekt | Kein neues Gastro-Projekt. Es gibt bereits **Firstlicht Solartechnik** (Paket Pro, seit 7. Oktober live). Startseite und Musterprojekte zeigen genau zwei Musterprojekte: Doppelmeter (Standard) und Firstlicht (Pro). Kein Portfolio mehr dort, nur noch auf Über mich. Mess-ID `firstlicht`. Die Branchenseite für Restaurants nutzt das Vorschau-Werkzeug mit der Branche Gastronomie. Ein Gastro-Muster kann später als eigener Auftrag folgen. |
| Referenz Atrega Treuhand AG | Nein. Keine Referenz auf der Website. |
| Strassenadresse in den strukturierten Daten | Nein. Nur Berikon, 8965, AG, CH. |
| Statistik (Teil 11) | Ja, vollständig umsetzen und live schalten. D1 in der EU, Worker selbst deployen. Zuerst Datenschutz live, dann Banner und Skript. |

## Ausgangslage im Repository

- Der GitHub-Stand (`origin/main`) war 15 Commits weiter als der lokale Stand (Musterprojekt Firstlicht aus einer
  Cloud-Sitzung vom 7. Oktober). Ich habe zuerst `main` auf `origin/main` vorgespult und den lokalen Commit mit
  `CLAUDE.md` darauf gesetzt. Die beiden Fassungen von `CLAUDE.md` sind zusammengeführt.
- Die Website ist **eine** Vorlage (`<x-dc>` in `index.html`) mit allen Seiten. `assets/js/support.js` baut sie im
  Browser mit React. `tools/seo-build.mjs` rendert jede Route in Chrome und kopiert `index.html` samt Vorlage in
  jede Route. Darum stehen heute in jeder Route die Inhalte aller Seiten (12 `h1`, 680 Platzhalter `{{`).

## Teil 1: Handy-Verlinkung der Musterprojekte

### Nachgestellt (390 px, Touch-Emulation iPhone 13 und Pixel 7, `tools/links-pruefen.mjs`)

| Wo | Was passiert |
|---|---|
| `/musterprojekte/`, Knöpfe «01 Doppelmeter», «02 Firstlicht», «03 Portfolio» oben | **Nichts.** Die Seite bleibt oben stehen (`scrollY` 0). |
| Startseite, Karte «Firstlicht ansehen» und Bild darüber | Führt auf `/musterprojekte/#mp-firstlicht`, also auf die Übersicht und nicht ins Musterprojekt. Auf dem Handy landet man irgendwo auf der Seite. |
| Startseite, Karte «Portfolio» | Führt nur auf die Übersicht `/musterprojekte/`, nicht zu einem Musterprojekt. |
| Links «Ganze Seite ansehen» und die Gerätebilder | Funktionieren (unter 768 px öffnet der Link die Seite direkt, kein Overlay). |

### Ursache

Die Musterprojekte-Seite hat pro Projekt zwei Fassungen: `.mp-desk` (ab 1024 px) und `.mp-card` (Handy und
Tablet). Die Sprungziele `#mp-1`, `#mp-firstlicht` und `#mp-2` hingen nur an der Desktop-Fassung. Auf dem Handy ist
sie mit `display: none` ausgeblendet. `jumpToSection` und der Link-Handler suchten das Ziel mit `getElementById`,
fanden das unsichtbare Element und scrollten an die Position 0. Kein verdecktes Element und kein Hover-Problem:
Das Prüfskript fand auf keiner Route einen verdeckten Link.

### Behoben

- Die IDs hängen jetzt an einem Rahmen (`.mp-projekt`) um beide Fassungen.
- Neue Methode `sprungziel(id)`: sucht das **sichtbare** Element mit dieser ID. Alle drei Stellen, die Sprungmarken
  auflösen (Inhaltsverzeichnisse, Klick auf `#…`-Links, Sprungmarke in der Adresse), nutzen sie.
- Die Startseiten-Karten verlinken direkt auf das Musterprojekt (`/musterprojekte/firstlicht/`,
  `/musterprojekte/doppelmeter/`), mit Overlay auf dem Desktop wie die übrigen Musterprojekt-Links.
- Das Portfolio verschwindet in Teil 5 ganz von der Startseite.

### Prüfskript

`node tools/links-pruefen.mjs [basis-url] [--banner]` prüft bei 390 px auf allen Routen jeden sichtbaren Link und
Knopf per `document.elementFromPoint()` und tippt jedes Musterprojekt an. Bei Links über mehrere Zeilen zählt die
erste Zeile. Ziel ist eine leere Liste. Ergebnis nach Teil 1: keine verdeckten Links, alle Musterprojekte antippbar.

## Teil 1: Favicon und Logo

- `favicon.svg` enthält jetzt das «O» aus Bricolage Grotesque 800 als Pfad, mit demselben Schnitt wie die
  Bildmarke im Logo (`logo.dc.html`). Die alte Fassung nutzte die Systemschrift «Arial Black» und sah je nach Gerät
  anders aus.
- `tools/icons.mjs` erzeugt daraus `favicon.ico` (16, 32, 48), `icon-48/96/192/512.png`, `apple-touch-icon.png`
  (180 px, deckend, mit Innenrand), `site.webmanifest` und `assets/img/odera-logo-512.png` (Marke auf Papier für
  Google).
- `theme-color` ist jetzt immer Kobalt `#2D4CF0`, wie im Auftrag. Bisher war es Papier und wurde nur bei offenem
  Handy-Menü blau. Das Menü bleibt blau, nach dem Schliessen bleibt die Farbe Kobalt.
- Das alte `assets/img/apple-touch-icon.png` bleibt liegen, damit gespeicherte Lesezeichen kein Bild verlieren.

## Teil 2: Technisches SEO-Fundament

- **Weg:** Kein neuer Build mit `react-dom/server`, sondern der bestehende Weg weitergedacht. `tools/seo-build.mjs`
  rendert jede Route schon heute in Chrome (Vorab-Block). Neu ist nur, dass die Vorlage `<x-dc>` mit allen Seiten
  nicht mehr in jede Route kopiert wird, sondern nach `assets/js/vorlage.js` kommt. Die Laufzeit setzt sie nach dem
  ersten Zeichnen ins Dokument. So bleibt `support.js` unverändert, Seitenwechsel ohne Neuladen funktionieren weiter
  und jede Route enthält nur ihren eigenen Inhalt. Quelle ist jetzt `src/seite.html`.
- **React** wird weiterhin auf allen Seiten geladen, weil die Laufzeit auch Kopf, Menü, Chat und Seitenwechsel steuert.
  Es kommt erst nach dem grössten Inhalt (LCP), darum ohne Einfluss auf die erste Darstellung.
- **Ohne JavaScript** ist der Vorab-Block jetzt sichtbar (vorher versteckt, dafür ein zweiter Textblock in `<noscript>`).
  So gibt es pro Route genau ein `h1`. Nur der Projekt-Check zeigt ohne JavaScript einen Hinweis mit der E-Mail-Adresse.
- **Seitengewicht** (ausgeliefertes HTML): vorher 374 bis 446 KB, nachher 117 bis 154 KB. Die Vorlage (305 KB,
  gzip rund 78 KB) wird einmal geladen und zwischengespeichert.
- Kein CI-Build nötig: Die erzeugten Dateien werden wie bisher eingecheckt (`npm run build` = `node tools/seo-build.mjs`).

## Teil 3 bis 9: Gestaltung

- **Tokens** im Block `<style id="system">`: Flächen Papier `#F6F5F1`, Papier tief `#ECE9E1`, Tinte `#11131A`,
  Tinte hell `#1B1E28`, Kobalt `#2D4CF0`; sieben Schriftgrössen (13, 15, 17, 20, 28, 40, 60 px, mobil per `clamp`);
  Abschnitte 88/64/56 px; zwei Schatten; drei Radien (10, 16, 24 px). Die alten Namen (`--fs-text` usw.) zeigen auf
  die neue Skala, darum wirken die Tokens auch in noch nicht umgebauten Teilen (Projekt-Check, Chat).
- **Weiss** ist nirgends mehr Abschnittshintergrund. Jede Hauptseite hat mindestens zwei Bänder auf Tinte oder Kobalt.
- **Einblenden** beim Scrollen nur mit JavaScript, ohne reduzierte Bewegung und nur für Elemente unterhalb des ersten
  Bildschirms (LCP und Vorab-Block bleiben unberührt).
- **Startseite:** Reihenfolge wie im Vorschlag. Der Kennzahlen-Streifen erscheint ab 1024 px. Darunter bleibt die
  abgenommene Handy-Fassung (Titel, Satz, vier Antwort-Chips, Vertrauenszeile).
- **Musterprojekte:** genau zwei Projekte, Doppelmeter auf Papier, Firstlicht auf Tinte (passt zur dunklen Firstlicht-Seite).
  Jedes Projekt hat einen eigenen Umschalter Desktop/Handy (Wunsch Nico, vorher schaltete einer alle um). Die Bilder
  waren abgeschnitten (`background-size: cover` in 4:3- und 9:16-Rahmen) und unscharf (1120 und 300 px Breite).
  Neu: `tools/screenshots-muster.mjs`, Desktop 16:9 in 1280 und 2560 px, Handy 390 × 760 in 390 und 780 px,
  AVIF und WebP mit `srcset`, als `<img>` im gleichen Seitenverhältnis wie der Rahmen.
- **Ablauf:** Die Minuten stimmen mit dem Code überein (81 und 116 Minuten). Phase 3 zeigt «ohne Aufwand für Sie»
  statt «0 Min». Die mitlaufende Fortschrittslinie nutzt die bestehende Berechnung `phFill`.
- **Angebot:** Die vollständigen Paketlisten stehen wörtlich im aufklappbaren Teil, auf den Karten höchstens fünf
  Punkte daraus. Keine Kreuztabelle, weil sie Leistungen zuordnen müsste, die nicht ausdrücklich in einem Paket stehen.
- **Vergleich Startseite:** Symbole erfüllt, je nach Anbieter, nicht erfüllt. Die Zuordnung folgt den bisherigen Sätzen.
- **LinkedIn:** gewöhnliche Links mit `target="_blank"` und `rel="noopener noreferrer"`, keine Skripte. Das Abzeichen
  am Porträt erscheint bei Maus und Fokus, auf Touch-Geräten ist es immer sichtbar.
- **Rechtstexte:** nur Layout geändert. Die alte Fassung der Datenschutz-Abschnitte 5 bis 7 (`dsMail`) ist aus der
  Vorlage entfernt. Ergänzt: der LinkedIn-Satz unter «Externe Links» und der Linkname «Statistik-Einstellungen»
  in Abschnitt 14 (der Link in der Fusszeile heisst jetzt so).
- **theme-color** dauerhaft Kobalt (Teil 1).

## Teil 10: SEO

- Branchenseiten unter `/website-fuer-handwerker/`, `/website-fuer-restaurants/`, `/website-fuer-praxen/`,
  `/website-fuer-laeden/`, eine Vorlage, Inhalt in `BRANCHEN_SEITEN`. Nur Aussagen aus Angebot und Paketen.
  Restaurants, Praxen und Läden zeigen das Vorschau-Werkzeug mit vorgewählter Branche (neue Option `branche` in
  `assets/js/generator.js`). Der Projekt-Check startet mit vorgewählter Branche (`EINSTIEGE` `branche-…`).
- Indexierbar neu: Projekt-Check, Datenschutz, AGB.

## Konflikte mit dem Auftrag (mit Vorschlag)

| Punkt | Auftrag | Umgesetzt | Grund und Vorschlag |
|---|---|---|---|
| Impressum | Rechtsseiten indexierbar | Impressum bleibt `noindex` | Es nennt die Wohnadresse, und Nico wollte die Strasse nicht in den strukturierten Daten. Wenn das Impressum doch in die Suche soll: `noindex` in `PAGES` entfernen. |
| Wortbudget Ablauf | höchstens 55 % (322 Wörter) | 377 Wörter (64 %) | Die im Auftrag wörtlich vorgegebenen Phasen-Zeilen, Kennzahlen und Sätze ergeben allein schon über 300 Wörter. Kürzer ginge nur, wenn die Phasen-Zeilen gekürzt werden dürfen. |
| Abschnitt «Statistik» | nach «Website-Vorschau», Abschnitt 3 heisst «Cookies und Statistik» | Abschnitt 14 am Schluss, Titel von Abschnitt 3 «Keine Cookies, Statistik nur mit Einwilligung» | So hat es die Statistik-Sitzung am 8. Oktober veröffentlicht. Umnummerieren hätte bestehende Verweise (#ds-8 usw.) verschoben. Inhaltlich vollständig. |
| Statistik-Banner | Desktop unten links, höchstens 380 px | jetzt so | War in der Statistik-Sitzung mittig und 520 px breit; angepasst, dazu Platz am Seitenende und Escape. |
| Branchenseiten | 350 bis 500 Wörter | 276 bis 318 sichtbar, mit den aufklappbaren Antworten rund 340 bis 390 | Keine Füllwörter. Mehr Text nur mit weiteren belegbaren Aussagen. |
