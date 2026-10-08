// Erzeugt mit tools/anfrage-schema.mjs aus src/seite.html (Konstante ANFRAGE). Nicht von Hand ändern.
export const ANFRAGE = {
 "gesamtMax": 20000,
 "abschnitte": [
  "Ihr Betrieb",
  "Das Ziel der Website",
  "Was die Seite können soll",
  "Inhalte und Stil",
  "Technik und Zeitplan",
  "Kontakt",
  "Empfehlung"
 ],
 "felder": [
  [
   "FIRMA",
   "Betrieb",
   "Ihr Betrieb",
   120
  ],
  [
   "ORT",
   "Ort",
   "Ihr Betrieb",
   80
  ],
  [
   "BRANCHE",
   "Branche",
   "Ihr Betrieb",
   140
  ],
  [
   "ANGEBOT",
   "Angebot",
   "Ihr Betrieb",
   300
  ],
  [
   "REGION",
   "Kunden aus",
   "Ihr Betrieb",
   60
  ],
  [
   "ZIEL",
   "Besucher sollen",
   "Das Ziel der Website",
   60
  ],
  [
   "KUNDEN",
   "Typische Kunden",
   "Das Ziel der Website",
   40
  ],
  [
   "WEBSITE_HEUTE",
   "Website heute",
   "Das Ziel der Website",
   10
  ],
  [
   "WEBSITE_URL",
   "Adresse heute",
   "Das Ziel der Website",
   300
  ],
  [
   "WEBSITE_PROBLEME",
   "Was stört",
   "Das Ziel der Website",
   400
  ],
  [
   "FUNKTIONEN",
   "Funktionen",
   "Was die Seite können soll",
   500
  ],
  [
   "SEITENZAHL",
   "Seitenzahl",
   "Was die Seite können soll",
   40
  ],
  [
   "LOGO",
   "Logo",
   "Inhalte und Stil",
   40
  ],
  [
   "TEXTE",
   "Texte",
   "Inhalte und Stil",
   40
  ],
  [
   "FOTOS",
   "Fotos",
   "Inhalte und Stil",
   40
  ],
  [
   "STIL",
   "Stil",
   "Inhalte und Stil",
   60
  ],
  [
   "VORBILDER",
   "Vorbilder",
   "Inhalte und Stil",
   500
  ],
  [
   "FARBEN",
   "Firmenfarben",
   "Inhalte und Stil",
   200
  ],
  [
   "DOMAIN",
   "Domain",
   "Technik und Zeitplan",
   220
  ],
  [
   "HOSTING",
   "Betrieb danach",
   "Technik und Zeitplan",
   100
  ],
  [
   "TERMIN",
   "Online bis",
   "Technik und Zeitplan",
   60
  ],
  [
   "KONTAKT_NAME",
   "Name",
   "Kontakt",
   120
  ],
  [
   "KONTAKT_MAIL",
   "E-Mail",
   "Kontakt",
   200
  ],
  [
   "KONTAKT_TEL",
   "Telefon",
   "Kontakt",
   40
  ],
  [
   "KONTAKTWEG",
   "Kontakt am liebsten per",
   "Kontakt",
   20
  ],
  [
   "REFERENZ",
   "Referenz",
   "Kontakt",
   80
  ],
  [
   "SONSTIGES",
   "Sonstiges",
   "Kontakt",
   2000
  ],
  [
   "PAKET",
   "Paket",
   "Empfehlung",
   40
  ],
  [
   "PREIS",
   "Richtpreis",
   "Empfehlung",
   60
  ],
  [
   "ZUSAETZE",
   "Zusätze",
   "Empfehlung",
   400
  ],
  [
   "HINWEIS",
   "Hinweis",
   "Empfehlung",
   300
  ],
  [
   "EINSTIEG",
   "Einstieg",
   "Empfehlung",
   60
  ]
 ],
 "pflicht": {
  "voll": [
   "FIRMA",
   "BRANCHE",
   "ANGEBOT",
   "ZIEL",
   "KONTAKT_NAME",
   "KONTAKT_MAIL"
  ],
  "kurz": [
   "ANGEBOT",
   "KONTAKT_MAIL"
  ]
 },
 "mindestSek": {
  "voll": 20,
  "kurz": 6
 },
 "naechsteSchritte": [
  [
   "Ich melde mich",
   "Antwort spätestens am nächsten Abend, ausser am Wochenende"
  ],
  [
   "Kostenloser Entwurf",
   "Innert fünf Arbeitstagen sehen Sie Ihre fertige Seite."
  ],
  [
   "Zahlung",
   "Sie zahlen erst, wenn Ihnen der Entwurf gefällt."
  ]
 ],
 "pruefung": {
  "email": "^[^\\s@<>()[\\]\\\\,;:\"]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\\.[A-Za-z]{2,}$",
  "telefonZeichen": "^\\+?[0-9 ().\\/-]+$",
  "telefonZiffern": [
   9,
   15
  ],
  "telefonCh": 10,
  "pflichtWenn": {
   "KONTAKT_TEL": [
    "KONTAKTWEG",
    "Telefon"
   ]
  },
  "formular": {
   "firma": "FIRMA",
   "angebot": "ANGEBOT",
   "name": "KONTAKT_NAME",
   "email": "KONTAKT_MAIL",
   "tel": "KONTAKT_TEL"
  },
  "domains": [
   "gmail.com",
   "googlemail.com",
   "gmx.ch",
   "gmx.net",
   "gmx.de",
   "bluewin.ch",
   "hotmail.com",
   "hotmail.ch",
   "outlook.com",
   "live.com",
   "icloud.com",
   "me.com",
   "yahoo.com",
   "yahoo.de",
   "sunrise.ch",
   "hispeed.ch",
   "protonmail.com",
   "proton.me",
   "web.de",
   "quickline.ch"
  ],
  "meldungen": {
   "KONTAKT_NAME": "Bitte geben Sie Ihren Namen ein.",
   "KONTAKT_MAIL": "Bitte geben Sie Ihre E-Mail-Adresse ein, damit ich Ihnen antworten kann.",
   "KONTAKT_TEL": "Sie möchten lieber angerufen werden. Bitte geben Sie Ihre Telefonnummer ein.",
   "FIRMA": "Bitte geben Sie den Namen Ihres Betriebs ein.",
   "ANGEBOT": "Bitte beschreiben Sie Ihr Angebot in einem Satz.",
   "wahl": "Bitte wählen Sie eine Antwort.",
   "email": "Diese E-Mail-Adresse scheint unvollständig. Beispiel: anna@ihrbetrieb.ch",
   "telefon": "Diese Telefonnummer scheint unvollständig. Beispiel: 079 123 45 67"
  }
 },
 "eingabeMax": {
  "firma": 120,
  "ort": 80,
  "branche": 120,
  "angebot": 300,
  "url": 300,
  "stoerung": 200,
  "sprache": 60,
  "vorbilder": 500,
  "farben": 200,
  "domain": 200,
  "name": 120,
  "email": 200,
  "tel": 40,
  "sonstiges": 2000
 }
};
