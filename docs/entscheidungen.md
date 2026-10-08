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
