#!/usr/bin/env node
// Erzeugt die Wissensbasis für den Chat-Assistenten.
//
//   node tools/wissen-build.mjs      (läuft auch automatisch am Ende von tools/seo-build.mjs)
//
// Quelle ist dieselbe wie für die Website: src/seite.html. Das Skript rendert jede öffentliche Seite in
// Chrome und übernimmt den sichtbaren Text wörtlich. Dazu kommen einige Angaben, die nur im Code
// stehen (Wochenplan der Erreichbarkeit, Referenzpreise, Hinweis im Projekt-Check). Nichts wird von Hand ergänzt.
//
// Damit das Gratis-Kontingent von Workers AI möglichst viele Nachrichten trägt, wird der Text verdichtet
// (Bedienelemente, Inhaltsverzeichnisse und Doppeltes fallen weg) und in Teile gegliedert:
//   - Teile mit immer: true gehen bei jeder Frage mit (Angebot, Ablauf, Kontakt, Projekt-Check).
//   - Die übrigen Teile (AGB, Datenschutz, Impressum, Über mich, Musterprojekte) gehen nur mit,
//     wenn die Frage eines ihrer Stichworte enthält. Die Auswahl macht chat-proxy/src/prompt.js.
//
// Ergebnis: chat-proxy/src/wissen.js. Danach den Proxy neu veröffentlichen (siehe chat-proxy/README.md).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { ROOT, QUELLE, leseSeiten, startServer, startChrome } from './lib/browser.mjs';

const ZIEL = join(ROOT, 'chat-proxy', 'src', 'wissen.js');
const quelle = readFileSync(QUELLE, 'utf8');
const PAGES = leseSeiten(quelle);
const SITE = (quelle.match(/ {2}SITE = '([^']+)';/) || [])[1];
const urlOf = (p) => (p === '/' ? '/' : p + '/');

// Stichworte in Kleinbuchstaben, als Teil des Textes gesucht (Deutsch, Französisch, Englisch)
const SEITEN = [
  { pfad: '/', titel: 'Startseite', immer: true },
  { pfad: '/angebot', titel: 'Angebot und Preise', immer: true },
  { pfad: '/ablauf', titel: 'Ablauf', immer: true },
  { pfad: '/ueber-mich', titel: 'Über mich und Kontakt', stichworte: ['nico', 'bodmer', 'wer ', 'über dich', 'über sie', 'person', 'erfahrung', 'ausbildung', 'lehre', 'studium', 'studier', 'beruf', 'hintergrund', 'team', 'allein', 'technik', 'werkzeug', 'womit', 'tool', 'framework', 'programm', 'kundenstimm', 'referenz', 'bewertung', 'erreich', 'telefon', 'anruf', 'treffen', 'about', 'who ', 'experience', 'qui ', 'expérience', 'témoign', 'review', 'testimonial'] },
  { pfad: '/musterprojekte', titel: 'Musterprojekte', stichworte: ['muster', 'beispiel', 'portfolio', 'doppelmeter', 'arbeiten', 'projekte', 'referenz', 'kunden', 'gastro', 'restaurant', 'zeigen', 'example', 'sample', 'exemple', 'réalisation'] },
  { pfad: '/agb', titel: 'Allgemeine Geschäftsbedingungen', stichworte: ['agb', 'bedingung', 'vertrag', 'haftung', 'gewährleist', 'garantie', 'künd', 'frist', 'zahlung', 'rechnung', 'mahnung', 'verzug', 'urheber', 'nutzungsrecht', 'rechte', 'eigentum', 'gehört', 'backup', 'sicherung', 'rücktritt', 'abbruch', 'storn', 'mehrwertsteuer', 'mwst', 'gerichtsstand', 'recht', 'ki-', 'terms', 'contract', 'liabil', 'warrant', 'cancel', 'refund', 'invoice', 'owner', 'conditions', 'contrat', 'résili', 'paiement', 'propriét'] },
  { pfad: '/datenschutz', titel: 'Datenschutzerklärung', stichworte: ['datenschutz', 'daten', 'cookie', 'tracking', 'speicher', 'gespeichert', 'ip-', 'ip ', 'cloudflare', 'github', 'server', 'privat', 'dsg', 'dsgvo', 'löschen', 'löschung', 'privacy', 'data', 'gdpr', 'données', 'confidentialité', 'chat', 'assistent', 'ki ', 'künstlich'] },
  { pfad: '/impressum', titel: 'Impressum', stichworte: ['impressum', 'adresse', 'anschrift', 'sitz', 'wohn', 'uid', 'firma', 'rechtsform', 'einzelunternehm', 'inhaber', 'berikon', 'legal notice', 'imprint', 'address', 'mentions'] },
];

// Läuft im Browser: sichtbarer Text von <main>, ohne tageszeitabhängige und dekorative Teile.
const AUSZUG = `(() => {
  document.querySelectorAll('details').forEach(d => { d.open = true; });
  const st = document.createElement('style');
  // dc-Komponenten: Logo und Vorschauen der Musterprojekte mit erfundenen Beispieltexten.
  // .cmpcol: Vorher-Nachher-Regler auf der Startseite. ol mit Sprungmarken: Inhaltsverzeichnisse.
  st.textContent = '[data-nosnap],[aria-hidden="true"],.printonly,svg,[data-sc-name="musterpreview"],[data-sc-name="logo"],.cmpcol,[role="switch"],ol:has(> li > a[href^="#"]){display:none!important}';
  document.head.appendChild(st);
  const main = document.querySelector('#dc-root main');
  const foot = document.querySelector('#dc-root footer');
  const sauber = (t) => t.split('\\n').map(z => z.replace(/\\s+/g, ' ').trim()).filter(Boolean).join('\\n');
  return { main: sauber(main ? main.innerText : ''), footer: sauber(foot ? foot.innerText : '') };
})()`;

// ---------- Verdichten ----------
const RAUSCHEN = new Set(['Details ansehen', 'Ganze Seite ansehen', 'Desktop', 'Handy', 'mache ich selbst', 'RECHTLICHES', 'INHALT',
  'Weiter', 'Start', 'Angebot', 'Ablauf', 'Musterprojekte', 'Über mich', 'Impressum', 'Datenschutz', 'AGB', 'Schweiz',
  'Tipp: Taste k öffnet den Projekt-Check.', 'Gebaut mit derselben Technik wie Ihre Seite', 'Alle Details im Angebot',
  'Was das kostet', 'Musterprojekte ansehen', 'Projekt-Check starten', 'Beispielbetrieb, frei erfunden.']);
const KNOPF = /^(Website|Standard|Pro|Logo) anfragen$/;
const ANHANG = /^(\d+([.,]\d+)?( ?(Min|s|h|Minuten|Stunden|Tage))?|CHF [\d'’]+.*|einmalig|gratis|pro Jahr|erforderlich|optional)$/i;

function verdichte(text, gesehen) {
  const aus = [];
  const zeilen = text.split('\n');
  for (let i = 0; i < zeilen.length; i++) {
    let z = zeilen[i].trim();
    if (!z || RAUSCHEN.has(z) || KNOPF.test(z)) continue;
    if (/^Stand: /.test(z)) continue;
    if (z === '✓' && zeilen[i + 1]) { z = '- ' + zeilen[++i].trim(); }
    else if (/^0\d$/.test(z) && zeilen[i + 1]) { z = z + ' ' + zeilen[++i].trim(); }
    if (ANHANG.test(z) && aus.length) { aus[aus.length - 1] += ', ' + z; continue; }
    // Nur ganze Sätze gelten als doppelt. Kurze Listenpunkte (z. B. je Paket) bleiben stehen.
    if (z.length >= 45) { if (gesehen.has(z)) continue; gesehen.add(z); }
    aus.push(z);
  }
  return aus.join('\n');
}

// ---------- Angaben, die nur im Code stehen ----------
function wert(name) {
  const m = quelle.match(new RegExp(' {2}' + name + ' = (\\{[\\s\\S]*?\\n {2}\\});|' + ' {2}' + name + ' = ([^;\\n]+);'));
  if (!m) throw new Error(name + ' in src/seite.html nicht gefunden.');
  return new Function('return ' + (m[1] || m[2]))();
}
const TAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
function wochenplan() {
  const plan = wert('WOCHENPLAN');
  return [1, 2, 3, 4, 5, 6, 0].map((t) => {
    let von = 0;
    const teile = plan[t].map(([bis, text]) => {
      const zeit = von === 0 && bis === 24 ? 'ganzer Tag' : von === 0 ? `bis ${bis} Uhr` : bis === 24 ? `ab ${von} Uhr` : `${von} bis ${bis} Uhr`;
      von = bis;
      return `${zeit} «${text}»`;
    });
    return `${TAGE[t]}, ${teile.join(', ')}`;
  }).join('\n');
}
function referenz() {
  const preise = wert('PAKET_PREIS');
  const ref = quelle.match(/const refMap = (\{[^}]+\});/);
  if (!ref) throw new Error('refMap in src/seite.html nicht gefunden.');
  const map = new Function('return ' + ref[1])();
  const absatz = quelle.match(/REFERENZ_SATZ = '(Ich suche zwei Betriebe, deren Website ich zeigen darf\.[^']*)';/);
  if (!absatz) throw new Error('Text zum Referenzpreis nicht gefunden.');
  const fmt = (n) => 'CHF ' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  const zeilen = ['Website', 'Standard', 'Pro'].map((n, i) => `${n}: ${fmt(preise[i])}, als Referenz ${fmt(map[n])}`);
  return absatz[1].replace('Dafür bekommen Sie {betrag} Rabatt.', 'Dafür bekommen Sie einen Rabatt, die Beträge stehen unten.') +
    '\nDie Frage nach der Referenz steht im Projekt-Check. Der Referenzpreis gilt nur für die Website, nicht für Logo oder Betrieb.\n' + zeilen.join('\n');
}
function projektCheck() {
  const hinweis = quelle.match(/<p [^>]*>(Dieses Formular ist eine unverbindliche Projektanfrage\.[^<]*)</);
  const fragen = (quelle.match(/ {2}Q = \[([\s\S]*?)\n {2}\];/) || [])[1];
  if (!hinweis || !fragen) throw new Error('Angaben zum Projekt-Check nicht gefunden.');
  // Fragen ohne Folgefragen (wenn:) und ohne die E-Mail-Frage der Kurzversion (nurKurz)
  const anzahl = fragen.split(/\n    \{ key: '/).slice(1).filter((f) => !/nurKurz: true|wenn: /.test(f)).length;
  const minuten = (quelle.match(/ {2}CHECK_MINUTEN = (\d+);/) || [])[1];
  if (!minuten) throw new Error('CHECK_MINUTEN nicht gefunden.');
  // Schalter «direkt senden»: beide Konstanten gesetzt
  const konst = (n) => (quelle.match(new RegExp(' {2}' + n + " = '([^']*)';")) || [])[1] || '';
  const direkt = !!(konst('ANFRAGE_ENDPOINT') && konst('TURNSTILE_SITEKEY'));
  const varianten = quelle.match(/hinweisErsterSchritt: this\.direkt\(\)\s*\? '([^']+)'\s*: '([^']+)'/);
  if (!varianten) throw new Error('Varianten von hinweisErsterSchritt nicht gefunden.');
  const hinweisText = hinweis[1].replace('{{ hinweisErsterSchritt }}', direkt ? varianten[1] : varianten[2]);
  return [
    `Adresse: ${SITE}/projekt-check/`,
    `Der Projekt-Check hat ${anzahl} Fragen in sechs Abschnitten und dauert rund ${minuten} Minuten, fast alles per Klick. Eine Kurzschätzung mit drei Fragen gibt es unter ${SITE}/projekt-check/?kurz=1.`,
    direkt
      ? 'Am Schluss zeigt der Projekt-Check eine Paketempfehlung mit Richtpreis und die fertige Anfrage. Mit einem Klick auf «Senden» geht sie direkt an Nico. Auf Wunsch kommt eine Kopie an die eigene E-Mail-Adresse. Danach erscheint eine Referenznummer.'
      : 'Am Schluss zeigt der Projekt-Check eine Paketempfehlung mit Richtpreis und öffnet eine vorbereitete E-Mail, die man selbst absendet.',
    hinweisText.replace(/\s*Mehr dazu in der\s*$/, ''),
  ].join('\n');
}

// ---------- Ablauf ----------
const server = await startServer(PAGES);
const basis = `http://127.0.0.1:${server.address().port}`;
const chrome = await startChrome();
const roh = [];
let fuss = '';
try {
  for (const s of SEITEN) {
    if (!PAGES[s.pfad]) throw new Error('Seite fehlt in PAGES: ' + s.pfad);
    const t = await chrome.ausfuehren(basis + urlOf(s.pfad), AUSZUG);
    if (!t.main || t.main.length < 80) throw new Error('Leerer Text für ' + s.pfad);
    roh.push({ ...s, text: t.main });
    if (!fuss) fuss = t.footer;
  }
} finally {
  chrome.schliessen();
  server.close();
}

// Kernteile zuerst verdichten, damit Doppeltes in den optionalen Teilen wegfällt und nicht umgekehrt.
// Optionale Teile verdichten nur gegen den Kern, nicht gegeneinander (sie können einzeln mitgehen).
const kernGesehen = new Set();
const TEILE = [];
const kern = (id, titel, text) => TEILE.push({ id, titel, immer: true, text: verdichte(text, kernGesehen) });
for (const s of roh.filter((r) => r.immer)) kern(s.pfad, s.titel, `Adresse: ${SITE}${urlOf(s.pfad)}\n${s.text}`);
kern('projekt-check', 'Projekt-Check (Anfrageformular)', projektCheck());
kern('referenz', 'Referenzpreis', referenz());
kern('erreichbarkeit', 'Erreichbarkeit nach Wochentag', 'So antwortet Nico auf Anfragen, je nach Wochentag und Uhrzeit:\n' + wochenplan());
kern('kontakt', 'Kontakt', fuss);
for (const s of roh.filter((r) => !r.immer)) {
  TEILE.push({ id: s.pfad, titel: s.titel, immer: false, stichworte: s.stichworte, text: verdichte(`Adresse: ${SITE}${urlOf(s.pfad)}\n${s.text}`, new Set(kernGesehen)) });
}

const alles = TEILE.map((t) => t.text).join('\n');
if (/[–—]/.test(alles)) console.warn('Hinweis: Die Wissensbasis enthält Gedankenstriche.');
mkdirSync(dirname(ZIEL), { recursive: true });
writeFileSync(ZIEL, `// Erzeugt mit tools/wissen-build.mjs aus src/seite.html. Nicht von Hand ändern.\n` +
  `export const TEILE = ${JSON.stringify(TEILE, null, 1)};\n`);
const kernZeichen = TEILE.filter((t) => t.immer).reduce((s, t) => s + t.text.length, 0);
console.log(`chat-proxy/src/wissen.js: Kern ${kernZeichen} Zeichen, dazu je nach Frage ` +
  TEILE.filter((t) => !t.immer).map((t) => `${t.titel} ${t.text.length}`).join(', '));

// ---------- Feste Antworten für die vier Vorschläge im Chat ----------
// Kosten keine Anfrage an das Sprachmodell. Beträge und Texte kommen aus src/seite.html, damit nichts veraltet.
{
  const liste = (name) => new Function('return ' + (quelle.match(new RegExp(' {2}' + name + ' = (\\[[\\s\\S]*?\\n {2}\\]);')) || [])[1])();
  const chf = (n) => 'CHF ' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '’');
  const preise = wert('PAKET_PREIS');
  // Platzhalter wie in src/seite.html (werte()): Zahlen kommen aus denselben Konstanten
  const zahlwort = wert('ZAHLWORT'), tage = wert('ENTWURF_TAGE');
  // Fragenzahl wie fragenZahl() im Projekt-Check: ohne Folgefragen und ohne Frage nur für die Kurzversion
  const fragenText = (quelle.match(/ {2}Q = \[([\s\S]*?)\n {2}\];/) || [])[1] || '';
  const fragen = fragenText.split(/\n    \{ key: '/).slice(1).filter((f) => !/nurKurz: true|wenn: /.test(f)).length;
  const platz = { MIN: String(wert('CHECK_MINUTEN')), FRAGEN: String(fragen), TAGE: tage + ' Arbeitstagen', TAGE_WORT: (zahlwort[tage] || tage) + ' Arbeitstagen', PREIS_STD: chf(preise[1]) };
  const werte = (t) => String(t).replace(/\{([A-Z_]+)\}/g, (m, k) => { if (platz[k] === undefined) throw new Error('Platzhalter {' + k + '} in fester Chat-Antwort nicht auflösbar.'); return platz[k]; });
  const phasen = liste('PHASES').map((p) => Object.assign({}, p, { sie: werte(p.sie), ich: werte(p.ich), dauer: werte(p.dauer) }));
  const nichtDrin = [...(quelle.match(/<p class="pr-h">Was nicht im Preis ist<\/p>\s*<ul class="pr-ul">([\s\S]*?)<\/ul>/) || ['', ''])[1].matchAll(/<li>([^<]+)<\/li>/g)].map((m) => m[1]);
  if (!/ohne Anzahlung/.test((phasen || [])[2] && phasen[2].sie)) throw new Error('Ablauf sagt nicht mehr «ohne Anzahlung»: feste Chat-Antwort prüfen.');
  if (!phasen || phasen.length !== 4 || nichtDrin.length < 5) throw new Error('Angaben für die festen Chat-Antworten nicht gefunden.');
  const vorlagen = {
    'Was kostet eine Website?': [
      'Es gibt drei Pakete mit Fixpreis, einmalig und ohne Abonnement:',
      `- **Website** ${chf(preise[0])}: eine Seite mit allen Abschnitten und Kontaktformular`,
      `- **Standard** ${chf(preise[1])}: bis 5 Unterseiten, Bildergalerie, Google-Unternehmensprofil`,
      `- **Pro** ${chf(preise[2])}: bis 10 Seiten, Online-Terminbuchung, zweite Sprache, Texte selbst bearbeiten`,
      '',
      `Dazu optional: ein Logo für ${chf(wert('LOGO_MIT_WEBSITE_CHF'))} zusammen mit der Website, Texte von Nico für ${chf(wert('TEXT_PRO_SEITE_CHF'))} pro Seite. Den Betrieb danach übernehmen Sie selbst oder Nico ab ${chf(wert('HOSTING_AUSLAND_CHF'))} pro Jahr.`,
      '',
      'Welches Paket zu Ihnen passt, zeigt der [Preis-Rechner](/angebot/#rechner).',
    ].join('\n'),
    'Wie läuft ein Projekt ab?': [
      'In vier Phasen:',
      // Handelt in einer Phase zuerst Nico (Entwurf), steht sein Satz vorne, sonst fehlt der Bezug («Sie sehen ihn an»)
      ...phasen.map((p, i) => `${i + 1}. **${p.t}** (${p.dauer}): ${p.zuerst === 'ich' ? p.ich + ' ' + p.sie : p.sie}`),
      '',
      'Der Entwurf ist kostenlos. Bezahlt wird erst, wenn er Ihnen gefällt. Mehr dazu auf der Seite [Ablauf](/ablauf/).',
    ].join('\n'),
    'Was ist nicht inbegriffen?': ['Nicht im Preis sind:', ...nichtDrin.map((x) => '- ' + x), '', 'Alles Übrige steht im [Angebot](/angebot/).'].join('\n'),
    'Muss ich etwas anzahlen?': 'Nein. Der Entwurf ist kostenlos und unverbindlich. Die Rechnung über den Fixpreis kommt erst, wenn Sie den Entwurf annehmen, einmal und ohne Anzahlung.',
  };
  const erwartet = wert('CHAT_VORSCHLAEGE');
  if (JSON.stringify(Object.keys(vorlagen)) !== JSON.stringify(erwartet)) throw new Error('CHAT_VORSCHLAEGE in src/seite.html passt nicht zu den festen Antworten: ' + erwartet.join(' | '));
  const ZIEL_V = join(ROOT, 'assets', 'js', 'chat-vorlagen.js');
  writeFileSync(ZIEL_V, '// Erzeugt mit tools/wissen-build.mjs aus src/seite.html. Nicht von Hand ändern.\n// Feste Antworten auf die Vorschläge im Chat, ohne Anfrage an das Sprachmodell.\n' +
    `export const VORLAGEN = ${JSON.stringify(vorlagen, null, 1)};\n`);
  console.log(`assets/js/chat-vorlagen.js: ${Object.keys(vorlagen).length} feste Antworten`);
}
