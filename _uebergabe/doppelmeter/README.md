# Schreinerei Doppelmeter: Musterwebsite für odera.ch

Klickbare Beispiel-Website eines **frei erfundenen** Schreinereibetriebs. Sie zeigt, was ein Kunde
von ODERA Design im **Paket Standard (CHF 1’900)** bekommt: 5 Seiten, Leistungsseiten, Werkstatt
und Über uns, Kontakt mit Formular, Bildergalerie, Hinweis auf das Google-Unternehmensprofil.

Dieses README ist die Übergabe an Claude Code für den Einbau in odera.ch.

```
doppelmeter/
  index.html          Start
  kuechen.html        Küchen
  schraenke.html      Schränke, Möbel, Innenausbau, Türen
  werkstatt.html      Werkstatt und Über uns
  kontakt.html        Kontakt, Anfahrt, Formular (Demo), Impressum, Datenschutz
  assets/css/doppelmeter.css   eine CSS-Datei, alle Tokens am Anfang
  assets/js/doppelmeter.js     6 KB: Menü und Formular-Demo, sonst nichts
  assets/img/logo-doppelmeter.svg
  assets/img/favicon.svg
  bilder.md           33 Bildstellen mit Motiv, Format, Alt-Text, Suchbegriffen
  screenshots/        je Seite desktop.png (1440 px) und mobile.png (375 px, 2x)
```

Lokal ansehen: `index.html` doppelklicken. Alle Links sind relativ, es braucht keinen Server.

Kopfzeile, Beispiel-Leiste, SVG-Vorrat (Logo, Symbole), Fusszeile und Anruf-Leiste sind in allen
fünf Dateien identisch. Eine Änderung daran in allen fünf Dateien nachziehen.

---

## 1. Konzept in Kurzform

### Positionierung

Die Schreinerei aus Hobelwil, die Küchen, Schränke und Innenausbau selbst plant, in der eigenen
Werkstatt baut und selbst montiert, seit 1961 und für Jahrzehnte.

### Titelzeile: Entscheid

**«Möbel, die Ihre Enkel noch benutzen.»** statt «Möbel für Ihre Enkel.»

- Sie sagt den Nutzen (Langlebigkeit) konkret und mit Zeithorizont. «Noch benutzen» heisst:
  in 40 Jahren im Alltag, nicht in der Vitrine.
- «Möbel für Ihre Enkel» lässt sich als Kindermöbel oder Geschenk missverstehen.
- Sie steht schon so im Hero der bisherigen Vorschau auf odera.ch. Die kurze Fassung steht nur
  im Vorher/Nachher-Regler und sollte dort angeglichen werden (siehe Abschnitt 5).

### Gestaltungsidee: der Doppelmeter als Werkzeug

Ein Doppelmeter ist ein Meterstab mit zehn Gliedern zu 20 cm. Aus ihm entstehen die Details,
die die Seite unverwechselbar machen, immer dezent und nie verspielt:

| Element | Wo | Wirkung |
|---|---|---|
| **Bildzeichen:** ein «D», gefaltet aus sieben Gliedern, Gelenke als Nieten, Skala am Stiel | Logo, Favicon, «Warum Doppelmeter?» | eigenes Zeichen, einfarbig und bis 16 px lesbar |
| **Massstab-Striche** (1 cm, 5 cm, 10 cm) als reines CSS | Kennzahlen unter dem Hero, Oberkante des Anruf-Abschlusses, Unterkante der Bild-Platzhalter | Handwerk ohne Holzmaserung |
| **Masslinie** (Bemassungsstrich mit Endstrichen, wie auf einer Werkstattzeichnung) | vor jeder Vorzeile, als Bildlegende («Küche in Nussbaum, 4,20 m, Hobelwil») | präzise, ruhig, macht Masse zur Typografie |
| **Gelenke mit Niete** | Ablauf in 5 Schritten sitzt auf einem Massstab | Prozess als Messstrecke |
| **Zeitleiste als senkrechter Massstab** | Werkstatt: 1961 bis heute | Geschichte ohne Klischee |
| **Werkstatt-Dokumente** als Inhaltsform | Datenblatt (Referenzen), Stückliste (Team), Musterkarte (Materialien), Faustregel-Tabelle (Nischen) | Vertrauen durch Sachlichkeit statt Sterne |

Bewusst vermieden: Holzmaserung als Hintergrund, Hammer- und Säge-Icons, «Qualität seit …» in
Schreibschrift, Stockfoto-Handschläge, Bewertungssterne, Gedankenstriche.

### Wie die Seite ohne Bewertungen Vertrauen aufbaut

- **Referenzprojekte mit Datenblatt:** Ort, Jahr, Aufgabe, Lösung, Material, Montagedauer.
- **Konkrete Zahlen:** 1961, 3. Generation, 14 Mitarbeitende, 3 Lernende, 1’400 m², 30 km Umkreis.
- **Ablauf mit Dauer pro Schritt** und Preisrahmen bei den Küchen (Fragen).
- **Ehrlichkeit:** «Was wir nicht versprechen» (nicht klimaneutral, nicht alles aus der Schweiz).
- **Menschen über Rollen** (Stückliste) und anonyme Werkstattbilder statt erfundener Gesichter.

---

## 2. Design-Tokens

Alle Tokens stehen als Custom Properties in `:root` am Anfang von `assets/css/doppelmeter.css`.

### Farben

Kontrast nach WCAG 2.2, gerechnet mit der offiziellen Formel.

| Token | Wert | Rolle | Kontrast |
|---|---|---|---|
| `--farbe-grund` | `#F6F5F1` | Seitengrund (Creme) | |
| `--farbe-grund-warm` | `#EFEAE0` | wechselnde Abschnitte, Fusszeile | |
| `--farbe-tinte` | `#14130F` | Fliesstext, Titel | 17.0 : 1 auf Grund, 15.5 : 1 auf Grund warm |
| `--farbe-text-2` | `#4A463D` | Nebentext, Einleitungen | 8.6 : 1 auf Grund, 7.8 : 1 auf Grund warm |
| `--farbe-wald` | `#2F4A3C` | primäre Knöpfe, Links | 8.9 : 1 (Creme auf Wald und umgekehrt) |
| `--farbe-wald-dunkel` | `#1F3329` | Hover, Anruf-Abschluss | 12.3 : 1 mit Creme |
| `--farbe-kupfer` | `#C2762F` | **nur Schmuck:** Striche, Nieten, aktiver Menüpunkt | 3.3 : 1 (Nicht-Text, reicht für 3 : 1) |
| `--farbe-kupfer-text` | `#95531A` | Kupfer für Text (Vorzeilen, Labels), Fokusrahmen | 5.5 : 1 auf Grund, 5.0 : 1 auf Grund warm |
| `--farbe-kupfer-hell` | `#E0A263` | Kupfer auf dunklem Grund, Links in der Beispiel-Leiste | 6.1 : 1 auf Wald dunkel, 8.4 : 1 auf Tinte |
| `--farbe-auf-dunkel-2` | `#C9C1B0` | Nebentext auf Wald dunkel | 7.5 : 1 |
| `--farbe-linie` | `#DCD5C6` | Haarlinien, nur Schmuck | |
| `--farbe-linie-stark` | `#8C8474` | Rahmen von Formularfeldern | 3.4 : 1 auf Grund, 3.7 : 1 auf Weiss |
| `--farbe-fehler` | `#A23B2A` | Fehlermeldungen | 6.0 : 1 auf Grund |

Gegenüber der alten Vorschau: Waldgrün, Creme, Kupfer und Tinte bleiben. Neu sind eine dunklere
Kupferstufe für Text (das alte Kupfer erreicht als Schrift nur 3.3 : 1) und ein dunkles Waldgrün
für den Abschluss. Holz- und Materialtöne (`--ton-eiche`, `--ton-nuss` usw.) dienen nur den
Bild-Platzhaltern und Musterkarten.

### Schriften

| Rolle | Schrift | Schnitte | Quelle und Lizenz |
|---|---|---|---|
| Titel (Serif) | **Fraunces** (Undercase Type) | 500, Achsen `SOFT 50`, `WONK 0` | Google Fonts, SIL Open Font License 1.1 |
| Text (Sans) | **Work Sans** (Wei Huang) | 400, 500, 600 | Google Fonts, SIL OFL 1.1, **liegt schon auf odera.ch** |
| Masse und Zahlen (Mono) | **IBM Plex Mono** (IBM) | 400, 500 | Google Fonts, SIL OFL 1.1, **liegt schon auf odera.ch** |

Warum: Fraunces ist eine warme Old-Style-Serif mit weichen Tropfen, die an gerundete Holzkanten
erinnert, wirkt aber nicht verspielt, solange `WONK 0` gesetzt ist. Playfair Display (bisher) ist
eine Mode- und Restaurant-Schrift mit hohem Kontrast und passt schlechter zu einem Handwerksbetrieb.
Work Sans ist ruhig, gut lesbar und hat genug Charakter. Plex Mono trägt alle Masse, Jahreszahlen
und die Telefonnummer, das ist der «Werkstattzeichnungs»-Ton.

### Schrift-Skala (6 Stufen)

| Token | Grösse | Verwendung |
|---|---|---|
| `--fs-1` | 14 px | Labels, Masse, Legenden |
| `--fs-2` | 16 px | Navigation, Knöpfe, Kartentext |
| `--fs-3` | 18 px | Fliesstext |
| `--fs-4` | 20 bis 24 px | H3, Einleitungen |
| `--fs-5` | 30 bis 50 px | H2 |
| `--fs-6` | 40 bis 84 px | H1 |

Stufen 4 bis 6 skalieren fliessend mit `clamp()`.

### Abstände, Raster, Breakpoints

- Abstands-Skala `--s-1` bis `--s-10`: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128 px.
- Abschnitte oben und unten: `--abschnitt` 64 bis 128 px.
- Inhaltsbreite 1216 px (`--breite`), Seitenrand 16 bis 48 px, Spaltenabstand 16 bis 32 px.
- Raster: 12 Spalten ab 1024 px, sonst 1 bis 2 Spalten.
- Breakpoints: 45em (720 px, Tablet), 64em (1024 px, Desktop), 80em (1280 px, Logo-Zusatz).
- Ecken: 4 px. Präzise wie eine gefaste Kante, nicht rund wie eine App.

### Komponenten

| Komponente | Klasse | Hinweis |
|---|---|---|
| Knopf primär | `.knopf.knopf--primaer` | Waldgrün, auf dunklem Grund Creme |
| Knopf sekundär | `.knopf.knopf--sekundaer` | Rahmen in Tinte |
| Pfeil-Link | `.pfeil-link` | für Weiterführendes |
| Vorzeile | `.vorzeile` | Mono, Versalien, mit Masslinie |
| Bild mit Platzhalter | `figure.bild[data-bild][data-ton]` | siehe `bilder.md` |
| Leistungskarte | `.leistung` | ganze Karte klickbar, auf dem Handy kompakt mit Bild links |
| Referenz mit Datenblatt | `.referenz`, `.datenblatt` | |
| Kennzahlen am Massstab | `.massband` | |
| Ablauf | `.schritte` | waagrecht ab 1024 px, sonst senkrecht |
| Musterkarte | `.musterkarte` | Farbmuster statt Fotos |
| Galerie | `.galerie` | Rhythmus 8+4 / 4+8 / 6+6 auf Desktop |
| Fragen | `details.frage` | ohne JavaScript |
| Zeitleiste | `.zeitleiste` | |
| Tabelle | `.tabelle` | Nischen, Stückliste, Öffnungszeiten |
| Formularfelder | `.feld`, `.eingabe`, `.auswahl`, `.option` | Fehler mit Symbol und Text, nicht nur Farbe |
| Hinweis | `.hinweis`, `.hinweis--erfolg` | zwei Varianten |
| Anruf-Abschluss | `.anruf` | dunkel, grosse Nummer |
| Anruf-Leiste | `.anruf-leiste` | nur Handy, fixiert |

### Bewegung

Wenig, ruhig, gezielt: Farbwechsel 160 ms, Kupferstrich unter dem Menüpunkt, Pfeil rückt 4 px,
Kartenbild zoomt 2 %. Keine Scroll-Animationen, kein Parallax. `prefers-reduced-motion` schaltet
alles ab, auch das weiche Scrollen.

---

## 3. Seitenübersicht

**Auf jeder Seite:** Sprungmarke «Zum Inhalt», Beispiel-Leiste (Text, «Zurück zu odera.ch»,
auf Desktop zusätzlich «So eine Seite für Ihren Betrieb» zum Projekt-Check), Kopfzeile mit Logo,
Navigation (Start, Küchen, Schränke, Werkstatt, Kontakt) und Telefonknopf (ab Tablet, klebt oben),
Fusszeile mit Kontakt, Öffnungszeiten, Navigation und Beispiel-Hinweis, auf dem Handy die fixierte
Anruf-Leiste. Die Telefonnummer ist in allen drei Breiten auf jedem Bildschirm sichtbar
(automatisch geprüft, siehe Abschnitt 6).

| Seite | Sektionen |
|---|---|
| `index.html` | Hero (Titelzeile, ein Satz, «Jetzt anrufen», «Arbeiten ansehen», Erreichbarkeit) · Kennzahlen am Massstab · Leistungen (4 Karten) · 3 Referenzprojekte mit Datenblatt · Werkstatt und Menschen mit Fakten · Ablauf in 5 Schritten mit Dauer · Anruf-Abschluss |
| `kuechen.html` | Seitenkopf · Was wir machen (neu, erneuern, Einzelstücke) · Materialien: Fronten (6) und Arbeitsplatten (4) als Musterkarte · Ablauf Küche · Galerie (6) · 4 Fragen · Anruf-Abschluss |
| `schraenke.html` | Seitenkopf mit Sprungnavigation · Einbauschränke · Möbel nach Mass · Innenausbau · Türen · Tabelle «Was in Ihre Nische passt» · Galerie (6) · Anruf-Abschluss |
| `werkstatt.html` | Seitenkopf · Warum Doppelmeter? · Zeitleiste 1961 bis heute · Team als Stückliste mit 2 anonymen Bildern · Holz und Nachhaltigkeit (Musterkarte Holzarten, «Was wir tun», «Was wir nicht versprechen») · Lehrbetrieb · Anruf-Abschluss «Kommen Sie vorbei» |
| `kontakt.html` | Grosse Telefonnummer · Kontaktdaten, Öffnungszeiten, Hinweis «Auch auf Google zu finden» · Anfahrt als statische SVG-Skizze mit Text · Demo-Formular (Name, Telefon, E-Mail, Anliegen, Nachricht, Rückruf-Zeitfenster) · Impressum und Datenschutz als Beispieltext |

**Paket Standard eingehalten:** 5 Seiten, Galerie, Google-Hinweis, Kontaktformular.
Nicht enthalten: Terminbuchung, Login, Shop, zweite Sprache, Stellenbereich, Inhaltsverwaltung.
Der Lehrbetrieb wird erwähnt («Wer schnuppern möchte, ruft an»), ohne Stelleninserate.

**Erfundene Angaben:** Telefon `056 000 00 00`, E-Mail `info@doppelmeter.example`, Adresse
Sägereiweg 7, 5999 Hobelwil. Orte der Referenzen ebenfalls erfunden (Brettikon, Zapfenau,
Nutenbach, Spanwil), alle nach Schreiner-Begriffen benannt. Keine Personennamen.

---

## 4. Vor dem Einbau anpassen

| Was | Wo | Was tun |
|---|---|---|
| **Vorschau-Schriften von Google Fonts** | alle 5 HTML-Dateien im `<head>`, zwischen `NUR VORSCHAU, VOR EINBAU ENTFERNEN` und `ENDE NUR VORSCHAU` (3 Zeilen) | entfernen, lokale Schrift-CSS einbinden (Abschnitt 5) |
| **Bild-Platzhalter** (33) | `figure.bild` mit `data-bild`, `src` ist ein transparentes 1×1-GIF | Fotos gemäss `bilder.md` einsetzen |
| **Canonical** | alle 5 HTML-Dateien, Kommentar `PLATZHALTER` | Adresse prüfen: `https://odera.ch/musterprojekte/doppelmeter/…` |
| **Vorschaubild für geteilte Links** | `og:image` in allen 5 Dateien, Kommentar `PLATZHALTER` | `assets/img/og-doppelmeter.jpg` (1200 × 630) erstellen oder Zeile entfernen |
| **Google-Unternehmensprofil** | `kontakt.html`, Kommentar `ECHTER BETRIEB` | bleibt ohne Link, weil der Betrieb erfunden ist |
| **Formular** | `kontakt.html`, `method="dialog"`, Prüfung in `doppelmeter.js` | bleibt Demo. Für echte Kunden `action` auf einen Formular-Dienst setzen (wie `anfrage-proxy/` von odera.ch) |
| **Impressum, Datenschutz** | Ende von `kontakt.html`, markiert «Beispieltext» | bleibt so. Bei echten Kunden ersetzen und prüfen lassen |
| **Pfade zu Schriften** | nach dem Einbau | `/assets/fonts/doppelmeter.css` absolut einbinden (siehe unten) |

---

## 5. Einbau in odera.ch (Anleitung für Claude Code)

### 5.1 Ablage

1. Ordnerinhalt nach `musterprojekte/doppelmeter/` im Repository `odera-design` kopieren
   (ohne `README.md`, `bilder.md` und `screenshots/`, die nur für die Übergabe sind; der
   Deploy-Workflow lädt `README.md` ohnehin nicht hoch).
2. Die Seite ist dann unter `https://odera.ch/musterprojekte/doppelmeter/` erreichbar
   (Apache liefert `index.html` im Ordner).
3. Der Router von odera.ch fängt nur Links auf Adressen aus der Tabelle `PAGES` ab
   (`onLinkClick` in `index.html`). `/musterprojekte/doppelmeter/` steht nicht darin, Links dorthin
   laden also normal. Nicht in `PAGES` aufnehmen.
4. Prüfen, dass `node tools/seo-build.mjs` beim Schreiben von `musterprojekte/index.html` den
   Unterordner `musterprojekte/doppelmeter/` nicht löscht.
5. `noindex` bleibt auf allen fünf Seiten. Nicht in `sitemap.xml` aufnehmen.
6. **Die alte Musterseite `muster/doppelmeter.html` ersetzen.** Sie zeigt andere Eckdaten (1954,
   5 Mitarbeitende, erfundene Personennamen) und die Telefonnummer **044 512 30 80**, die einer
   echten Person oder Firma gehören kann. Datei löschen oder per `.htaccess` auf
   `/musterprojekte/doppelmeter/` umleiten und alle Verweise (`data-src="muster/doppelmeter.html"`)
   anpassen.

### 5.2 Schriften lokal hosten, wie beim Rest von odera.ch

Die Datei `assets/fonts/doppelmeter.css` gibt es schon (für die alte Musterseite). Sie enthält
Work Sans 400/500/600 und IBM Plex Mono 400 und Playfair Display 900. Anpassen:

1. **Playfair Display entfernen**, sofern keine andere Seite sie über diese Datei braucht.
2. **IBM Plex Mono 500 ergänzen** (Datei `ibm-plex-mono-500-latin.woff2` und `-latin-ext` liegen
   schon in `assets/fonts/`).
3. **Fraunces ergänzen** als statische Instanz, damit die Datei klein bleibt
   (getestet: latin rund 18 KB statt 34 KB mit variabler optischer Grösse):

   ```bash
   # Fraunces[SOFT,WONK,opsz,wght].ttf von github.com/undercasetype/Fraunces (OFL)
   fonttools varLib.instancer "Fraunces[SOFT,WONK,opsz,wght].ttf" wght=500 SOFT=50 WONK=0 opsz=72 -o fraunces-500.ttf
   pyftsubset fraunces-500.ttf --flavor=woff2 --layout-features='*' \
     --unicodes="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD" \
     --output-file=fraunces-500-latin.woff2
   # dasselbe mit dem latin-ext-Bereich aus doppelmeter.css für fraunces-500-latin-ext.woff2
   ```

   Lizenztext nach `assets/fonts/lizenzen/fraunces-OFL.txt` legen und die Datenschutzerklärung von
   odera.ch (Abschnitt Schriften, `fontsPrivacyText`) um Fraunces ergänzen.
4. In allen fünf Seiten den Vorschau-Block im `<head>` ersetzen durch:

   ```html
   <link rel="preload" href="/assets/fonts/fraunces-500-latin.woff2" as="font" type="font/woff2" crossorigin>
   <link rel="stylesheet" href="/assets/fonts/doppelmeter.css">
   ```

   Die CSS-Datei der Seite braucht keine Änderung: Sie ruft `"Fraunces"`, `"Work Sans"` und
   `"IBM Plex Mono"` mit Rückfallschriften auf. `font-variation-settings` bleibt wirkungslos, wenn
   die Achsen fest eingerechnet sind.

### 5.3 Bilder

- Fotos gemäss `bilder.md` besorgen (Unsplash oder Pexels), **Lizenz prüfen und Quelle notieren**.
  Keine erkennbaren Gesichter als «Team», keine Firmenschilder.
- Als **AVIF und WebP** in zwei Grössen exportieren (Breite aus `bilder.md` und die Hälfte),
  mit `<picture>` oder `srcset`/`sizes` einbinden. `width`, `height` und `alt` stehen schon.
- Ziel: jedes Bild unter 150 KB, Hero unter 200 KB. Nur die vier Hero-Bilder laden sofort.
- Die breiten Kopfbilder (21:9) werden auf dem Handy per CSS zu 3:2 beschnitten: Motiv mittig.

### 5.4 Ladezeit messen

odera.ch wirbt mit «Ladezeit 0,9 s» (Startseite, Musterprojekte-Karte, Vergleichsbalken
`duelBLabel: '0,9 s'`). Diese Zahl ist für die neue Seite **noch nicht gemessen**, weil Schriften
und Fotos noch fehlen.

1. Nach dem Einbau mit echten Fotos und lokalen Schriften messen, zum Beispiel mit PageSpeed
   Insights oder Lighthouse (Desktop und Mobil) und WebPageTest (Standort Zürich oder Frankfurt).
2. Festlegen, welcher Wert gemeint ist (Vorschlag: Largest Contentful Paint auf Desktop, Median
   aus drei Läufen) und das in einer Notiz im Repository festhalten.
3. Liegt der Wert über 0,9 s: Bilder verkleinern, Hero-Bild vorladen
   (`<link rel="preload" as="image" imagesrcset=…>`), CSS minifizieren (heute 57 KB roh, 11 KB
   gzip). Reicht das nicht, die Zahl auf odera.ch ehrlich anpassen.

Heutiger Stand ohne Fotos: HTML je rund 30 KB (9 KB gzip), CSS 57 KB (11 KB gzip), JS 6 KB,
keine externen Anfragen ausser den Vorschau-Schriften.

### 5.5 odera.ch angleichen

| Stelle | Datei, Suchbegriff | Änderung |
|---|---|---|
| Vorschau-Grafik Doppelmeter (Desktop und Handy) | `musterpreview.dc.html`, Block `isDm` | an neues Design angleichen: Fraunces statt Playfair, Bildzeichen «D» vor der Wortmarke, Vorzeile «Schreinerei in Hobelwil, seit 1961», eckige Knöpfe (4 px) statt Pillen |
| Vorher/Nachher-Regler, rechte Hälfte («neu») | `index.html`, Suche nach `Möbel für Ihre Enkel.` | Titelzeile auf «Möbel, die Ihre Enkel noch benutzen.», Schrift, Logo und Knopf wie oben |
| Karte auf der Startseite | `index.html`, Suche nach `badge badge-akzent">Firmenseite` | Badge in «Beispiel-Firmenseite» ändern |
| Musterprojekte-Seite | `index.html`, Suche nach `Firmenseite für einen Kunden` (Badge und `mp-jump-sub`) | ersetzen durch «Beispiel-Firmenseite», weil der Betrieb erfunden ist |
| Knopf «Live ansehen» | `index.html`, Suche nach `data-src="muster/doppelmeter.html"` | zusätzlich oder anstelle von «Ganze Seite ansehen» einen Link `<a class="btn btn-primaer" href="/musterprojekte/doppelmeter/">Live ansehen</a>` (normaler Link, öffnet die echte Seite) |
| Eckdaten-Texte | `index.html`, Suche nach `SEIT 1961`, `14 Mitarbeitende` | stimmen schon, nur prüfen |
| Suchmaschinen-Dateien | `node tools/seo-build.mjs` | nach allen Änderungen an `index.html` neu erzeugen und einchecken |

### 5.6 Beispiel-Leiste

Die Leiste oben bleibt auf allen fünf Seiten. Sie verlinkt heute auf
`https://odera.ch/musterprojekte/` («Zurück zu odera.ch») und auf Desktop auf
`https://odera.ch/projekt-check/` («So eine Seite für Ihren Betrieb»). Der Fuss wiederholt beide Links.

- Nach dem Einbau die absoluten Adressen in relative ändern (`/musterprojekte/`, `/projekt-check/`).
- Optional: Der Projekt-Check kennt den Einstieg `doppelmeter` (`EINSTIEGE` in `index.html`,
  Vorbelegung Branche «Handwerk und Bau», bis 5 Seiten, Ziel «Anrufen»). Er wird heute nur per
  Klick innerhalb von odera.ch gesetzt (`data-quelle`). Wenn die Vorbelegung auch von der
  Beispielseite aus greifen soll, einen URL-Parameter ergänzen (z. B. `/projekt-check/?quelle=doppelmeter`)
  und im Check auswerten.

---

## 6. Selbstkontrolle, offene Punkte und Annahmen

### Geprüft

- **Screenshots** in 1440, 768 und 375 px, zwei Runden mit Korrekturen (u. a. Bestätigung des
  Formulars war wegen `display: grid` trotz `hidden` sichtbar, Galerie mit Lücke, Beschriftungen
  der Skizze überlappend, Telefonknopf im Kopf auf dem Handy, zu lange Handy-Seiten).
- **axe-core 4 (WCAG 2.0 bis 2.2 A und AA, Best Practices):** 0 Verstösse auf allen 5 Seiten,
  Desktop und Handy. Kontraste der Farbtokens von Hand gerechnet (Tabelle oben).
- **html-validate:** 0 Fehler.
- **Touch-Flächen:** alle Bedienelemente mindestens 44 px hoch (Links im Fliesstext ausgenommen).
- **Tastatur:** Sprungmarke, sichtbarer Fokus (3 px Kupfer), Menü mit `aria-expanded`, Escape
  schliesst und setzt den Fokus zurück, Formular setzt den Fokus aufs erste falsche Feld und
  danach auf die Bestätigung.
- **Telefonnummer sichtbar:** auf jedem Bildschirm beim Durchscrollen aller Seiten in allen drei
  Breiten (Skript, 196 von 196 Bildschirmen).
- **Ohne JavaScript:** Menü-Knopf führt zur Navigation im Fuss, Formular sendet nichts
  (`method="dialog"`), Fragen funktionieren (`<details>`).
- **Formular-Demo:** nach dem Absenden 0 Netzwerkanfragen, Meldung «Dies ist eine Beispielseite,
  es wurde nichts gesendet.»
- **Texte:** kein Eszett, keine Gedankenstriche (weder Halbgeviert- noch Geviertstrich), Sie-Form, Schweizer Schreibweise
  (CHF 30’000, 7.00 Uhr, «Guillemets»). Automatisch gesucht.
- **Keine Cookies, keine Tracker, kein `localStorage`, keine Karteneinbettung.**
- **Eine H1 pro Seite**, Landmarks `header`, `nav`, `main`, `footer`, `aside`.

### Recherche (Phase 1): was möglich war

Webzugang war nur teilweise da: Die Websuche funktionierte, **der direkte Aufruf der Seiten war
durch die Netzwerkrichtlinie der Arbeitsumgebung gesperrt**. Ich habe also Suchergebnisse und
Kurzauszüge gesehen, keine Seiten und keine Screenshots. Die Prinzipien unten stammen aus diesen
Auszügen und aus meinem Fachwissen und sind entsprechend einzuordnen.

Angeschaut (über Suchauszüge): Schneebeli AG, Schweighauser AG, Aegerter Küchen, Kälin AG,
Kaufmann Schreinerei, r+s Schreinerei, Handwerkskollektiv Zürich (Referenzprojekte), Reseda,
Mätzler AG, H. Hasler AG, Vögeli Holzbau (Schweiz); Werkraum Bregenzerwald und Tischlereien wie
Künzler, holzig, Tischlar (Vorarlberg); uno form, Multiform, &SHUFL, Carl Hansen & Søn inkl.
Lehrwerkstatt (Dänemark); deVOL und Plain English (England, als herausragende Websites kleiner
Manufakturen); dazu Sammlungen guter Handwerker-Websites.

Prinzipien, die ich übernommen habe (nicht kopiert):

1. **Werkstatt und Herkunft zeigen:** Die starken Seiten nennen den Ort der Werkstatt und laden
   zum Besuch ein (deVOL, Plain English, Vögeli). Hier: «Werkstatt besuchen», Anfahrt, Zeitleiste.
2. **Material benennen, konkret:** Holzarten, Oberflächen, Verbindungen (Multiform, uno form).
   Hier: Musterkarte mit Herkunft und Pflegehinweis.
3. **Referenzen als Geschichten** mit Aufgabe und Lösung (Handwerkskollektiv, Holzdesign-Beispiele
   für Dachschrägen). Hier: Datenblatt.
4. **Nachwuchs als Qualitätszeichen** (Carl Hansen «The Lab», Schweizer Lehrbetriebe). Hier:
   Lehrbetrieb seit 1974.
5. **Ein Weg zum Kontakt, überall gleich:** Telefon oben, Abschluss mit Nummer, auf dem Handy
   fixiert.
6. **Klischees vermeiden:** Holzmaserung als Hintergrund, Werkzeug-Icons, Schreibschrift,
   «Qualität seit»-Siegel wirken austauschbar und altbacken.

### Annahmen

- **PLZ 5999** gewählt, weil sie nach meinem Wissen nicht vergeben ist, und 056 passt zum Aargau.
  Nicht amtlich geprüft. Falls die PLZ existiert: auf `0000` oder eine andere freie Zahl ändern.
- **Hobelwil, Brettikon, Zapfenau, Nutenbach, Spanwil:** per Websuche keinen gleichnamigen Ort
  gefunden. «Schreinerei Doppelmeter» ebenfalls nicht als Firma gefunden.
- **Preisrahmen Küche (CHF 30’000 bis 60’000), Dauer der Schritte, 1’400 m², 9 Holzarten:** plausible
  Beispielwerte für einen Betrieb dieser Grösse, keine Marktzahlen.
- **Telefon-Symbol:** Umriss nach Feather Icons (MIT-Lizenz), Hinweis im HTML.
- **Wortmarke:** Fraunces-Glyphen in Pfade umgewandelt (OFL erlaubt das für Logos).

### Offen

- Fotos (33 Stellen) und Vorschaubild für geteilte Links fehlen, siehe `bilder.md`.
- Schriften lokal einbinden (Abschnitt 5.2). Bis dahin laden die Vorschau-Schriften von Google.
- Ladezeit nach dem Einbau messen (Abschnitt 5.4).
- Die Anfahrtsskizze ist auf dem Handy klein beschriftet (rund 9 px). Alle Angaben stehen zusätzlich
  als Text darunter. Wenn gewünscht: eigene, höhere Handy-Fassung der Skizze.
- Screenshots zeigen die Platzhalter. Nach dem Bildeinbau neu erstellen.

### Strukturierte Daten (nur Beispiel, bewusst nicht aktiv)

Weil der Betrieb erfunden ist, steht **kein** `LocalBusiness` im HTML. Für einen echten Kunden
sähe es so aus (auskommentiert, damit es niemand versehentlich übernimmt):

```html
<!--
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "HomeAndConstructionBusiness",
  "name": "Schreinerei Doppelmeter AG",
  "url": "https://www.doppelmeter.example/",
  "telephone": "+41 56 000 00 00",
  "email": "info@doppelmeter.example",
  "foundingDate": "1961",
  "numberOfEmployees": { "@type": "QuantitativeValue", "value": 14 },
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Sägereiweg 7",
    "postalCode": "5999",
    "addressLocality": "Hobelwil",
    "addressCountry": "CH"
  },
  "openingHoursSpecification": [
    { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"], "opens": "07:00", "closes": "12:00" },
    { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"], "opens": "13:00", "closes": "17:00" }
  ],
  "areaServed": "Hobelwil und Umgebung, rund 30 km"
}
</script>
-->
```
