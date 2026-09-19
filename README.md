# ODERA Design – Website

Website von ODERA Design, der Geschäftsbezeichnung von Nico Robin Bodmer:
Webseiten für Schweizer Betriebe zum Fixpreis. Das Design wurde in Claude
Design erstellt und als Export übernommen. Für dieses Repository wurde es nur
geordnet und technisch bereinigt, am Inhalt ist nichts geändert.

## Wie die Seite funktioniert

- Es gibt keinen Build-Schritt. Die Dateien werden so, wie sie sind, auf den
  Webserver geladen.
- Die Seiten sind Claude-Design-Vorlagen (Block `<x-dc>`). Das Programm
  `assets/js/support.js` baut sie im Browser mit React zusammen.
- Alle Unterseiten der Hauptseite stecken in `index.html` und werden über die
  Adresse nach dem `#` umgeschaltet: `#/angebot`, `#/ablauf`,
  `#/musterprojekte`, `#/ueber-mich`, `#/projekt-check`, `#/impressum`,
  `#/datenschutz`, `#/agb`. Unbekannte Adressen zeigen die 404-Seite.
- Die Komponenten `logo.dc.html`, `kapazitaet.dc.html` und
  `musterpreview.dc.html` lädt `support.js` beim Aufruf nach. Sie müssen im
  selben Ordner wie `index.html` liegen. Der Dateiname muss dem Namen in
  `<dc-import name="…">` entsprechen, plus `.dc.html`.
- Beim Laden wird nichts von fremden Servern abgerufen. React, Schriften und
  Bilder liegen alle im Repository. In `support.js` stehen die unpkg-Adressen
  von React noch als Rückfall. Der greift aber nicht, weil React vorher lokal
  geladen wird.

## Lokal öffnen

Ein Doppelklick auf `index.html` funktioniert nicht, weil der Browser das
Nachladen der Komponenten über `file://` blockiert. Starte stattdessen im
Projektordner einen kleinen Webserver:

```bash
python3 -m http.server 8000
```

Danach im Browser <http://localhost:8000> öffnen. Beenden mit `Ctrl+C`.

## Ordner

```
index.html                  Hauptseite mit allen Unterseiten und Rechtstexten
logo.dc.html                Komponente: Logo (Zeichen und Wortmarke)
kapazitaet.dc.html          Komponente: Auslastungsanzeige
musterpreview.dc.html       Komponente: Vorschau der Musterprojekte
muster/
  doppelmeter.html          Musterprojekt Schreinerei (öffnet im Overlay)
  portfolio.html            Rahmen für das Musterprojekt Portfolio
  portfolio-quelle.html     Inhalt des Musterprojekts Portfolio
assets/
  js/support.js             Claude-Design-Laufzeit (unverändert aus dem Export)
  js/vendor/                React 18.3.1 und ReactDOM, Produktionsfassungen
  fonts/                    Schriften als WOFF2, pro Seite eine CSS-Datei
  fonts/lizenzen/           Lizenztexte der Schriften (SIL Open Font License)
  img/                      Küchenfoto (Unsplash) und Porträt
  img/portfolio/            Bilder des Portfolio-Musterprojekts
.github/workflows/          Automatischer Upload zu Infomaniak
```

Jede Seite lädt ihre eigene Schrift-CSS (`assets/fonts/index.css`,
`doppelmeter.css`, `portfolio.css`, `portfolio-quelle.css`). Sie enthält
genau die Schnitte, die diese Seite darstellt, in den Zeichensätzen latin und
latin-ext. Wenn neue Schriftschnitte dazukommen, muss die passende CSS-Datei
ergänzt werden, sonst ersetzt der Browser den Schnitt durch den nächstliegenden.

## Rechtliche Seiten

Alle drei stehen in `index.html`:

| Seite | Adresse | Beginnt bei |
|---|---|---|
| Impressum | `#/impressum` | `<sc-if value="{{ isImpressum }}"` |
| Datenschutz | `#/datenschutz` | `<sc-if value="{{ isDatenschutz }}"` |
| AGB | `#/agb` | `<sc-if value="{{ isAgb }}"` |

Der Absatz „4. Schriften“ der Datenschutzerklärung steht nicht im Seitentext,
sondern im Skript unter `fontsPrivacyText`.

Das Datum „Stand:“ unter allen drei Seiten kommt aus der Konstante
`STAND_RECHTSTEXTE` im Skript von `index.html`. Ändere es nur, wenn du die
Rechtstexte tatsächlich änderst.

Die Musterseiten verlinken auf dieselben drei Seiten (`../#/impressum` usw.).

## Stellen, die du pflegen musst

Alle Werte stehen im Skript am Ende von `index.html`, in der Klasse
`Component`.

| Stelle | Heutiger Wert | Was zu tun ist |
|---|---|---|
| `STAND_RECHTSTEXTE` | 18.09.2026, provisorisch | Vor dem Aufschalten auf das Datum setzen, an dem die Seite online geht. |
| `PLAETZE_TOTAL`, `PLAETZE_FREI` | 2 und 1 | Auf den tatsächlichen Stand setzen. Die Werte sind **zweimal** definiert, beide Stellen ändern. |
| `DURCHSCHNITT_SEKUNDEN` | 0 | Solange 0, bleibt die Vergleichsleiste der Ladezeitmessung ausgeblendet. Nur mit belegtem Wert eintragen und die Quelle in der Fussnote nennen. |
| `EMAIL` und feste Texte | `kontakt@odera.ch`, `odera.ch` | Setzen die Domain odera.ch voraus, auch die Mailtexte aus dem Projekt-Check. Das Postfach `kontakt@odera.ch` muss existieren, bevor die Seite online geht. |
| Platzhalter im Portfolio-Muster (`muster/portfolio-quelle.html`, Abschnitt „04 Websites“) | `[domain.ch]`, `[Website 2 — Name]`, `[Monat JJJJ]`, `[Ein Satz zu Auftrag und Ergebnis.]` | Sind für Besucher sichtbar, wenn sie das Portfolio-Muster öffnen. Ersetzen oder den Abschnitt entfernen. Ebenso der Satz „Screenshots eines echten Projekts folgen.“ |
| Datenschutz „2. Besuch dieser Website“ | Infomaniak, Schweiz | Stimmt nur, solange die Seite bei Infomaniak liegt. |

## Veröffentlichung

Ziel ist das Webhosting bei Infomaniak. Hochgeladen wird alles ausser
`README.md`, `.gitignore`, `.github/` und lokalen Ordnern.

### Automatisch bei jedem Push

Der Workflow `.github/workflows/veroeffentlichen.yml` lädt bei jedem Push auf
`main` per SFTP hoch. Solange die Zugangsdaten nicht hinterlegt sind,
überspringt er den Upload und meldet das im Protokoll.

Einmalig einrichten:

1. Im Infomaniak Manager beim Webhosting einen FTP/SSH-Benutzer anlegen.
   Dort stehen auch der Servername und der Ordner der Website.
2. Auf GitHub im Repository unter Settings → Secrets and variables → Actions
   vier Repository Secrets anlegen:
   - `INFOMANIAK_SFTP_HOST`: Servername, z. B. `xxxx.ftp.infomaniak.com`
   - `INFOMANIAK_SFTP_USER`: Benutzername
   - `INFOMANIAK_SFTP_PASSWORD`: Passwort
   - `INFOMANIAK_SFTP_PATH`: Zielordner der Website auf dem Server
3. Unter Actions den Workflow „Veröffentlichen auf Infomaniak“ einmal von Hand
   starten (Run workflow) und das Protokoll prüfen.

Der Upload überschreibt geänderte Dateien, löscht auf dem Server aber nichts.
Umbenannte oder entfernte Dateien bleiben dort liegen, bis du sie von Hand
löschst.

### Von Hand per SFTP

Mit einem SFTP-Programm (z. B. Cyberduck oder FileZilla) mit denselben
Zugangsdaten verbinden und diese Dateien und Ordner in den Zielordner
kopieren: `index.html`, `logo.dc.html`, `kapazitaet.dc.html`,
`musterpreview.dc.html`, `muster/`, `assets/`.
