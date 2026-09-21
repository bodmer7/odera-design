# ODERA Design – Website

Website von ODERA Design, der Geschäftsbezeichnung von Nico Robin Bodmer:
Webseiten für Schweizer Betriebe zum Fixpreis. Das Design wurde in Claude
Design erstellt und als Export übernommen. Für dieses Repository wurde es nur
geordnet und technisch bereinigt, am Inhalt ist nichts geändert.

## Wie die Seite funktioniert

- Die Seite selbst braucht keinen Build. Die Dateien werden so, wie sie sind,
  auf den Webserver geladen. Nur die Suchmaschinen-Dateien (Unterseiten,
  Sitemap) erzeugt ein Skript, siehe „Suchmaschinen“.
- Die Seiten sind Claude-Design-Vorlagen (Block `<x-dc>`). Das Programm
  `assets/js/support.js` baut sie im Browser mit React zusammen.
- Jede Seite hat eine echte Adresse: `/`, `/angebot/`, `/ablauf/`,
  `/musterprojekte/`, `/ueber-mich/`, `/projekt-check/`, `/impressum/`,
  `/datenschutz/`, `/agb/`. Der Inhalt aller Seiten steht in `index.html`.
  Klickt man einen internen Link, wechselt die Seite ohne Neuladen und die
  Adresszeile folgt (History-API). Alte Adressen mit `#/` (z. B. `/#/angebot`)
  werden beim Laden auf die echte Adresse umgeleitet. Unbekannte Adressen
  zeigen die 404-Seite.
- Damit jede Adresse für Suchmaschinen eine eigene Seite ist, erzeugt
  `tools/seo-build.mjs` aus `index.html` je Adresse eine Datei
  (`angebot/index.html` usw.). Siehe „Suchmaschinen“.
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

Die Seite muss im Wurzelverzeichnis einer Domain liegen (`/assets/...`,
`/angebot/`). In einem Unterordner funktioniert sie nicht. Für die 404-Seite
verhält sich `python3 -m http.server` anders als der Webserver bei Infomaniak:
eine unbekannte Adresse zeigt dort die einfache Fehlermeldung von Python.

## Ordner

```
index.html                  Startseite und Quelle für alle Unterseiten (Inhalte, Rechtstexte)
angebot/, ablauf/, ...      Erzeugte Kopien von index.html mit eigenen Suchmaschinen-Angaben
404.html                    Erzeugte Fehlerseite, der Webserver liefert sie bei unbekannten Adressen
favicon.svg                 Seitensymbol
robots.txt, sitemap.xml     Erzeugt, für Suchmaschinen
.htaccess                   Einstellungen für den Apache-Webserver (Fehlerseite, Kompression, Zwischenspeicher)
tools/seo-build.mjs         Erzeugt die Dateien oben
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

## Suchmaschinen

Was für die Auffindbarkeit im Code steckt und wie es gepflegt wird:

- **Echte Adressen.** Suchmaschinen behandeln alles nach einem `#` als dieselbe
  Seite. Vorher waren Angebot, Ablauf usw. deshalb für Google keine eigenen
  Seiten.
- **Eigene Angaben je Seite** im `<head>`: Titel, Beschreibung, `canonical`,
  `robots`, Vorschau-Angaben für Links (Open Graph). Dazu `lang="de-CH"` und
  ein Seitensymbol als Datei. Auf der Startseite steht zusätzlich
  strukturierte Auszeichnung (Schema.org: `WebSite` und `ProfessionalService`
  mit Name, Adresse der Website, E-Mail, Einzugsgebiet Schweiz). Die
  Wohnadresse steht bewusst nicht darin.
- **Text ohne JavaScript.** Jede Seite enthält den sichtbaren Text als
  `<noscript>`-Block. Programme, die kein JavaScript ausführen (manche
  Suchmaschinen, KI-Werkzeuge, Vorschau in Chat-Programmen), sehen so den
  Inhalt statt der Vorlage mit `{{ ... }}`. Der Projekt-Check braucht
  JavaScript, dort steht ein Hinweis mit der E-Mail-Adresse.
- **Nicht in der Suche** (`noindex`): Projekt-Check, Impressum, Datenschutz,
  AGB, 404-Seite und die drei Musterseiten unter `muster/`. Das Impressum
  enthält die Wohnadresse, und die Musterseiten zeigen einen erfundenen Betrieb
  mit erfundener Telefonnummer. Die Seiten bleiben erreichbar und verlinkt.
- **`sitemap.xml` und `robots.txt`** mit den fünf Seiten, die in die Suche
  sollen.

### Nach jeder Änderung an index.html

Titel, Beschreibung und `noindex` je Seite stehen in der Tabelle `PAGES`, die
Adresse der Website in der Konstante `SITE`, beide in `index.html`. Nach jeder
Änderung an Texten, Seiten, `PAGES` oder `SITE` die Dateien neu erzeugen und
mit einchecken:

```bash
node tools/seo-build.mjs
```

Das braucht Node 22 oder neuer und Google Chrome. Das Skript startet Chrome
unsichtbar, rendert jede Seite und schreibt Ergebnis und Textauszug in die
Dateien. Ohne diesen Schritt zeigen die Unterseiten alten Text im
`<noscript>`-Block.

Die Beschreibung der Angebotsseite nennt die drei Preise. Bei einer
Preisänderung `desc` in `PAGES` mit ändern.

### Google Search Console

Search Console zeigt dir, über welche Suchbegriffe man dich findet und ob
Google alle Seiten liest. Sie setzt keinen Code in die Seite und misst keine
Besucher. Einrichten, sobald die Domain online ist:

1. <https://search.google.com/search-console> öffnen und die Domain
   `odera.ch` als „Domain“-Eigenschaft hinzufügen.
2. Google nennt einen TXT-Eintrag. Diesen bei dem Anbieter eintragen, bei dem
   die Domain liegt (bei Infomaniak im Manager unter „DNS-Zonen“).
3. Unter „Sitemaps“ `sitemap.xml` einreichen.
4. Unter „URL-Prüfung“ die Startseite prüfen und „Indexierung beantragen“.

## Rechtliche Seiten

Alle drei stehen in `index.html`:

| Seite | Adresse | Beginnt bei |
|---|---|---|
| Impressum | `/impressum/` | `<sc-if value="{{ isImpressum }}"` |
| Datenschutz | `/datenschutz/` | `<sc-if value="{{ isDatenschutz }}"` |
| AGB | `/agb/` | `<sc-if value="{{ isAgb }}"` |

Der Absatz „4. Schriften“ der Datenschutzerklärung steht nicht im Seitentext,
sondern im Skript unter `fontsPrivacyText`.

Das Datum „Stand:“ unter allen drei Seiten kommt aus der Konstante
`STAND_RECHTSTEXTE` im Skript von `index.html`. Ändere es nur, wenn du die
Rechtstexte tatsächlich änderst.

Die Musterseiten verlinken auf dieselben drei Seiten (`/impressum/` usw.).

## Stellen, die du pflegen musst

Alle Werte stehen im Skript am Ende von `index.html`, in der Klasse
`Component`.

| Stelle | Heutiger Wert | Was zu tun ist |
|---|---|---|
| `STAND_RECHTSTEXTE` | 18.09.2026, provisorisch | Vor dem Aufschalten auf das Datum setzen, an dem die Seite online geht. |
| `PLAETZE_TOTAL`, `PLAETZE_FREI` | 2 und 1 | Auf den tatsächlichen Stand setzen. Die Werte sind **zweimal** definiert, beide Stellen ändern. |
| `DURCHSCHNITT_SEKUNDEN` | 0 | Solange 0, bleibt die Vergleichsleiste der Ladezeitmessung ausgeblendet. Nur mit belegtem Wert eintragen und die Quelle in der Fussnote nennen. |
| `SITE` | `https://odera.ch` | Adresse der Website in canonical, Sitemap und Vorschau-Angaben. Nach einer Änderung `node tools/seo-build.mjs` ausführen. |
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
kopieren: alles ausser `README.md`, `tools/`, `.github/`, `.gitignore` und
lokalen Ordnern, also `index.html`, die Ordner der Unterseiten (`angebot/`,
`ablauf/`, `musterprojekte/`, `ueber-mich/`, `projekt-check/`, `impressum/`,
`datenschutz/`, `agb/`), `404.html`, `favicon.svg`, `robots.txt`,
`sitemap.xml`, `.htaccess`, `logo.dc.html`, `kapazitaet.dc.html`,
`musterpreview.dc.html`, `muster/` und `assets/`. Die Datei `.htaccess`
beginnt mit einem Punkt und ist im Finder unsichtbar, im SFTP-Programm ist sie
über „Versteckte Dateien anzeigen“ sichtbar.

Im Infomaniak Manager ausserdem einstellen: HTTPS erzwingen, und
`www.odera.ch` auf `odera.ch` weiterleiten. Beides gehört nicht in die
`.htaccess`, weil eine doppelte Weiterleitung Schleifen erzeugen kann.
