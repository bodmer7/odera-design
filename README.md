# ODERA Design – Website

Website von ODERA Design, der Geschäftsbezeichnung von Nico Robin Bodmer:
Webseiten für Schweizer Betriebe zum Fixpreis. Das Design wurde in Claude
Design erstellt und als Export übernommen. Für dieses Repository wurde es nur
geordnet und technisch bereinigt, am Inhalt ist nichts geändert.

Wie die Seite automatisch bei jedem Push online geht, steht im Abschnitt
„Veröffentlichung“ (Pipeline mit GitHub Actions und Infomaniak).

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
tools/portfolio-sync.mjs    Holt das aktuelle Portfolio als Musterprojekt (muster/portfolio/)
logo.dc.html                Komponente: Logo (Zeichen und Wortmarke)
kapazitaet.dc.html          Komponente: Auslastungsanzeige
musterpreview.dc.html       Komponente: Vorschau der Musterprojekte
muster/
  doppelmeter.html          Musterprojekt Schreinerei (öffnet im Overlay)
  portfolio.html            Rahmen für das Musterprojekt Portfolio
  portfolio/                Kopie des echten Portfolios (erzeugt, siehe „Portfolio-Muster“)
assets/
  js/support.js             Claude-Design-Laufzeit (unverändert aus dem Export)
  js/vendor/                React 18.3.1 und ReactDOM, Produktionsfassungen
  fonts/                    Schriften als WOFF2, pro Seite eine CSS-Datei
  fonts/lizenzen/           Lizenztexte der Schriften (SIL Open Font License)
  img/                      Küchenfoto (Unsplash), Porträt, Vorschaubild für die Portfolio-Kachel
.github/workflows/          Automatischer Upload zu Infomaniak
```

Jede Seite lädt ihre eigene Schrift-CSS (`assets/fonts/index.css`,
`doppelmeter.css`, `portfolio.css`, `portfolio-muster.css`). Sie enthält
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

## Portfolio-Muster

Das zweite Musterprojekt ist eine Kopie deines echten Portfolios
(`github.com/bodmer7/nicobodmer`, live unter nico-bodmer.ch). Sie liegt in
`muster/portfolio/`, der Rahmen `muster/portfolio.html` zeigt sie im Overlay.
Die Kopie wird nicht von Hand bearbeitet. Nach jeder Änderung am Portfolio:

```bash
node tools/portfolio-sync.mjs
node tools/seo-build.mjs
```

Danach die Änderungen einchecken. Das Skript braucht die GitHub-Anmeldung
(`gh auth status`), weil das Portfolio-Repository privat ist. Gegenüber dem
Original ändert es nur vier Dinge, damit die Kopie zu den Zusagen dieser
Website passt: Die Schriften kommen von diesem Server statt von Google Fonts,
das Portfolio merkt sich Farbschema und Sprache nicht im Browser, die Kopie ist
`noindex` und hat kein `canonical`, und ein Kommentar nennt Quelle und Stand.
Findet das Skript eine der Stellen nicht mehr, weil sich das Portfolio
verändert hat, bricht es mit einer Meldung ab.

Die kleine Vorschau der Kachel auf der Musterprojekte-Seite ist von Hand
nachgezeichnet (`musterpreview.dc.html`, Bild `assets/img/portfolio-vorschau.webp`).
Ändert sich der Hero des Portfolios, muss sie mit angepasst werden.

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
| `HOSTING_AUSLAND_CHF`, `HOSTING_SCHWEIZ_CHF`, `STUNDENSATZ_CHF` | 240, 480 und 120 | Einzige Quelle für die Hostingpreise und den Stundensatz. Sie erscheinen auf der Angebotsseite, der Ablaufseite, in den AGB (Paragraf 7), im Ergebnis des Projekt-Checks und im Mailtext. Nach einer Änderung `node tools/seo-build.mjs` ausführen. |
| Fragenzahl des Projekt-Checks | 13 in Teil 1, 27 insgesamt | Die Zahl 27 steht als Text auf der Startseite, der Ablaufseite, der Seite „Über mich“, im Seitentitel, in der klebenden Leiste und im Kurz-Ergebnis. Die Zähler im Formular rechnen selbst. Ändert sich die Zahl der Fragen, alle Stellen mit `grep -n "Fragen" index.html` prüfen. Die Fragen werden im Code über ihre Reihenfolge angesprochen (Feld `Q`), eine Frage in der Mitte verschiebt die folgenden. |
| `SITE` | `https://odera.ch` | Adresse der Website in canonical, Sitemap und Vorschau-Angaben. Nach einer Änderung `node tools/seo-build.mjs` ausführen. |
| `EMAIL` und feste Texte | `kontakt@odera.ch`, `odera.ch` | Setzen die Domain odera.ch voraus, auch die Mailtexte aus dem Projekt-Check. Das Postfach `kontakt@odera.ch` muss existieren, bevor die Seite online geht. |
| Portfolio-Muster (`muster/portfolio/`) | Stand vom 21.09.2026 (Design v8) | Ändert sich das Portfolio, `node tools/portfolio-sync.mjs` ausführen. Siehe „Portfolio-Muster“. |
| Datenschutz „2. Besuch dieser Website“ | Infomaniak, Schweiz | Stimmt nur, solange die Seite bei Infomaniak liegt. |

## Veröffentlichung

Ziel ist ein Web Hosting bei Infomaniak. Bei jedem Push auf `main` lädt eine
Pipeline (GitHub Actions) die Seite hoch. Sie ist danach sofort live, weil auf
dem Server nichts gebaut wird. Die Dateien werden so bereitgestellt, wie sie im
Repository liegen.

### Welches Angebot

Es braucht das **Web Hosting** (Apache/PHP), nicht den Starter. Der Starter
erlaubt nur FTP auf Port 21 ohne Verschlüsselung. Damit würde die Pipeline das
Passwort im Klartext senden. Web Hosting unterstützt SFTP (Port 22), FTPS und
SSH. Quellen: Infomaniak-Hilfe „Understanding Web Transfer Protocols“ und
„Manage FTP / SSH accounts“.

### Einmalig einrichten

1. **Bestellen.** Im Infomaniak Manager ein Web Hosting bestellen und die Domain
   `odera.ch` registrieren oder verbinden. Die Domain gehört bei Infomaniak
   nicht zum Web Hosting und wird separat bezahlt.
2. **Postfach.** `kontakt@odera.ch` anlegen (im Web Hosting ist eine Adresse
   inbegriffen). Die Seite und ihre Mails verweisen darauf.
3. **FTP/SSH-Konto.** Im Manager das Hosting anklicken, links „FTP / SSH“ öffnen.
   Bei einer neuen Website legt Infomaniak dort ein Konto automatisch an. Sonst
   „Hinzufügen“ und den Typ „FTP + SSH“ wählen und ein starkes Passwort setzen.
   Oben auf dieser Seite steht der Servername (Form `xxxx.ftp.infomaniak.com`).
   Der Benutzername hat die Form `xxxx_name`.
4. **Ordner der Website.** Im Manager dort „Web FTP“ öffnen und nachsehen, in
   welchem Ordner die Startseite der Domain liegt. Er heisst meist
   `/sites/odera.ch`. Massgebend ist, was der Manager als Stammverzeichnis der
   Website nennt.
5. **Verbindung testen** (Terminal, Passwort eingeben, dann `ls` und `exit`):

   ```bash
   sftp BENUTZER@SERVERNAME
   ```

6. **Secrets auf GitHub.** Im Repository unter Settings → Secrets and variables
   → Actions → Secrets vier Repository Secrets anlegen:
   - `INFOMANIAK_SFTP_HOST`: der Servername
   - `INFOMANIAK_SFTP_USER`: der Benutzername
   - `INFOMANIAK_SFTP_PASSWORD`: das Passwort
   - `INFOMANIAK_SFTP_PATH`: der Ordner aus Schritt 4
7. **Erster Lauf.** Unter Actions den Workflow „Veröffentlichen auf Infomaniak“
   wählen, „Run workflow“ klicken und das Protokoll lesen.
8. **Optional: Live-Test.** Unter Settings → Secrets and variables → Actions →
   Variables die Variable `SITE_URL` mit `https://odera.ch` anlegen. Dann prüft
   der Workflow nach jedem Upload, ob die wichtigen Adressen antworten (200),
   die Startseite den richtigen Titel hat und eine unbekannte Adresse 404 liefert.
9. **Im Manager** „HTTPS erzwingen“ einschalten und `www.odera.ch` auf
   `odera.ch` weiterleiten. Beides gehört nicht in die `.htaccess`, weil eine
   doppelte Weiterleitung Schleifen erzeugen kann.

Solange die Secrets fehlen, überspringt der Workflow den Upload und meldet das
im Protokoll.

### Was bei jedem Push passiert

1. Prüfung: Fehlen erzeugte Dateien (Unterseiten, Sitemap, `.htaccess`), bricht
   der Workflow ab, bevor etwas hochgeladen wird.
2. Upload aller Dateien per SFTP. Ausgenommen sind `README.md`, `tools/`,
   `.github/`, `.gitignore` und lokale Ordner.
3. Live-Test, falls `SITE_URL` gesetzt ist.

Der Upload überschreibt geänderte Dateien, löscht auf dem Server aber nichts.
Umbenannte oder entfernte Dateien bleiben dort liegen, bis du sie im Web FTP
von Hand löschst. Soll eine Änderung zurück, den Commit mit `git revert`
zurücknehmen und pushen. Danach stehen die alten Inhalte wieder auf dem Server.

### Wenn etwas nicht klappt

| Meldung im Protokoll | Ursache |
|---|---|
| „Upload übersprungen“ | Mindestens eines der vier Secrets fehlt oder ist leer. |
| „Login failed“ oder „Access failed: Login incorrect“ | Benutzername oder Passwort falsch, oder das Konto ist ein reines FTP-Konto ohne SSH. |
| „Fatal error: Host name lookup failure“ | Servername falsch geschrieben. |
| „No such file or directory“ | `INFOMANIAK_SFTP_PATH` zeigt auf einen Ordner, den es nicht gibt. |
| Upload grün, Seite zeigt alte oder fremde Inhalte | Falscher Ordner, oder die Domain zeigt noch nicht auf das Hosting. |
| „Datei fehlt: …“ | Erzeugte Dateien fehlen. `node tools/seo-build.mjs` ausführen und einchecken. |
| Live-Test meldet 404 oder 403 | Ordner falsch oder `.htaccess` wird nicht ausgewertet. |

### Später

- **SSH-Schlüssel statt Passwort.** Infomaniak erlaubt ihn beim Web Hosting. Er
  muss vom Typ `ed25519` sein, ein RSA-Schlüssel wird abgelehnt. Das ist sicherer
  als ein Passwort in den Secrets.
- **Konto nur für einen Ordner.** Ein „FTP+SSH“-Konto sieht das ganze Hosting.
  Sobald dort auch Kundenprojekte liegen, ein reines FTP-Konto verwenden, das
  auf den Ordner von `odera.ch` beschränkt ist (dann über FTPS statt SFTP).
- Der Workflow vertraut dem Server beim ersten Kontakt automatisch
  (`sftp:auto-confirm`). Den Fingerabdruck fest zu hinterlegen wäre strenger.

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
