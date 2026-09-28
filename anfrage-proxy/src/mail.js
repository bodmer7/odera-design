// E-Mails aus einer geprüften Anfrage: an Nico (kontakt@odera.ch) und die optionale Kopie an die anfragende Person.
// Alle Werte werden HTML-maskiert. Adressen in Freitexten werden entschärft, damit sie nicht als Link erscheinen.
import { ANFRAGE } from './schema.js';
import { FELD_REIHENFOLGE, feldInfo, einzeilig } from './regeln.js';

const FARBE = { tinte: '#11131A', papier: '#F6F5F1', kobalt: '#2D4CF0', linie: '#E2DFD8', grau: '#5B6270', limette: '#D6F24B' };
const SCHRIFT = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif";

export function maskiere(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
// Nach dem Maskieren: Adressen in Freitext brechen, damit Mailprogramme keinen Link daraus machen
function entschaerft(s) {
  return maskiere(s)
    .replace(/(https?|ftp):\/\//gi, '$1:&#8203;//')
    .replace(/\bwww\./gi, 'www&#8203;.')
    .replace(/\n/g, '<br>');
}

function datum(jetzt = new Date()) {
  return jetzt.toLocaleDateString('de-CH', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Zurich' }) + ', ' +
    jetzt.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' }) + ' Uhr';
}

function abschnitteVon(felder) {
  return ANFRAGE.abschnitte.map((titel) => ({
    titel,
    zeilen: FELD_REIHENFOLGE.filter((k) => felder[k] && feldInfo(k).abschnitt === titel).map((k) => [feldInfo(k).label, felder[k]]),
  })).filter((a) => a.zeilen.length);
}

function zeilenHtml(zeilen, mitLinks) {
  return zeilen.map(([l, v]) => `<tr><td style="padding:8px 16px 8px 0;vertical-align:top;width:34%;color:${FARBE.grau};font-size:14px">${maskiere(l)}</td>` +
    `<td style="padding:8px 0;vertical-align:top;color:${FARBE.tinte};font-size:15px;line-height:1.5">${mitLinks ? mitLinks(l, v) : entschaerft(v)}</td></tr>`).join('');
}

function rahmen(kopf, inhalt, fuss) {
  return `<!doctype html><html lang="de-CH"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>ODERA Design</title></head>` +
    `<body style="margin:0;padding:0;background:${FARBE.papier};${SCHRIFT}">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${FARBE.papier}"><tr><td align="center" style="padding:24px 12px">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#FFFFFF;border:1px solid ${FARBE.linie};border-radius:14px;overflow:hidden">` +
    `<tr><td style="background:${FARBE.kobalt};padding:20px 24px;color:#FFFFFF">${kopf}</td></tr>` +
    `<tr><td style="padding:8px 24px 24px">${inhalt}</td></tr>` +
    `<tr><td style="padding:16px 24px;border-top:1px solid ${FARBE.linie};color:${FARBE.grau};font-size:12px;line-height:1.6">${fuss}</td></tr>` +
    `</table></td></tr></table></body></html>`;
}

function abschnittHtml(titel, zeilenInhalt) {
  return `<h2 style="margin:24px 0 4px;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;color:${FARBE.kobalt}">${maskiere(titel)}</h2>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${FARBE.linie}">${zeilenInhalt}</table>`;
}

/** E-Mail an Nico. Gibt { betreff, html, text }. */
export function mailAnNico({ art, felder }, referenz, jetzt = new Date()) {
  const f = felder;
  const wer = f.FIRMA || f.KONTAKT_NAME;
  const betreff = einzeilig(`Projekt-Check: ${wer} (${art === 'kurz' ? 'Kurzversion' : (f.PAKET || 'ohne Paket')}) · ${referenz}`).slice(0, 180);
  const uebersicht = [
    ['Name', f.KONTAKT_NAME], ['Firma', f.FIRMA], ['E-Mail', f.KONTAKT_MAIL], ['Telefon', f.KONTAKT_TEL],
    ['Paket', [f.PAKET, f.PREIS].filter(Boolean).join(', ')], ['Wunschtermin', f.TERMIN],
  ].filter(([, v]) => v);
  const abschnitte = abschnitteVon(f);

  const kopf = `<div style="font-size:13px;letter-spacing:0.06em;text-transform:uppercase;opacity:0.85">ODERA Design · Projekt-Check</div>` +
    `<div style="font-size:22px;font-weight:700;margin-top:6px">${maskiere(art === 'kurz' ? 'Kurzversion' : 'Neue Anfrage')}: ${maskiere(wer)}</div>` +
    `<div style="font-size:14px;margin-top:6px"><span style="background:${FARBE.limette};color:${FARBE.tinte};padding:2px 8px;border-radius:999px;font-weight:600">${referenz}</span></div>`;
  const inhalt = abschnittHtml('Kurzübersicht', zeilenHtml(uebersicht)) +
    abschnitte.map((a) => abschnittHtml(a.titel, zeilenHtml(a.zeilen))).join('');
  const fuss = `Eingegangen über den Projekt-Check auf odera.ch am ${maskiere(datum(jetzt))}, ${art === 'kurz' ? 'Kurzversion mit drei Fragen' : 'vollständiger Projekt-Check'}.<br>` +
    `Eine Antwort auf diese E-Mail geht direkt an ${maskiere(f.KONTAKT_MAIL)}.`;

  const text = [
    `Projekt-Check von odera.ch, ${referenz}`, `${art === 'kurz' ? 'Kurzversion' : 'Vollständiger Projekt-Check'}, ${datum(jetzt)}`, '',
    'KURZÜBERSICHT', ...uebersicht.map(([l, v]) => `${l}: ${v}`), '',
    ...abschnitte.flatMap((a) => [a.titel.toUpperCase(), ...a.zeilen.map(([l, v]) => `${l}: ${v}`), '']),
    `Eine Antwort auf diese E-Mail geht direkt an ${f.KONTAKT_MAIL}.`,
  ].join('\n');
  return { betreff, html: rahmen(kopf, inhalt, fuss), text };
}

/** Kopie an die anfragende Person. Gibt { betreff, html, text }. */
export function mailKopie({ art, felder }, referenz, jetzt = new Date()) {
  const f = felder;
  const vorname = einzeilig(f.KONTAKT_NAME).split(' ')[0];
  const betreff = `Ihre Anfrage bei ODERA Design · ${referenz}`;
  const abschnitte = abschnitteVon(f);
  const schritte = ANFRAGE.naechsteSchritte;

  const kopf = `<div style="font-size:13px;letter-spacing:0.06em;text-transform:uppercase;opacity:0.85">ODERA Design</div>` +
    `<div style="font-size:22px;font-weight:700;margin-top:6px">Danke, ${maskiere(vorname)}. Ihre Anfrage ist angekommen.</div>` +
    `<div style="font-size:14px;margin-top:6px">Referenz <span style="background:${FARBE.limette};color:${FARBE.tinte};padding:2px 8px;border-radius:999px;font-weight:600">${referenz}</span></div>`;
  const schritteHtml = `<ol style="margin:8px 0 0;padding-left:20px;color:${FARBE.tinte};font-size:15px;line-height:1.6">` +
    schritte.map(([t, s]) => `<li style="margin:0 0 6px"><strong>${maskiere(t)}:</strong> ${maskiere(s)}</li>`).join('') + '</ol>';
  const inhalt = `<p style="margin:20px 0 0;font-size:15px;line-height:1.6;color:${FARBE.tinte}">Guten Tag ${maskiere(f.KONTAKT_NAME)}<br><br>` +
    `Danke für Ihre Anfrage über den Projekt-Check. Hier ist eine Kopie Ihrer Angaben.</p>` +
    abschnittHtml('So geht es weiter', `<tr><td>${schritteHtml}</td></tr>`) +
    abschnitte.map((a) => abschnittHtml(a.titel, zeilenHtml(a.zeilen))).join('');
  const fuss = `Sie erhalten diese E-Mail, weil Sie im Projekt-Check eine Kopie gewünscht haben (${maskiere(datum(jetzt))}). ` +
    `Fragen oder Ergänzungen? Antworten Sie einfach auf diese E-Mail.<br>ODERA Design · Nico Robin Bodmer · kontakt@odera.ch`;
  const text = [
    `Guten Tag ${f.KONTAKT_NAME}`, '', 'Danke für Ihre Anfrage über den Projekt-Check. Hier ist eine Kopie Ihrer Angaben.', `Referenz: ${referenz}`, '',
    'SO GEHT ES WEITER', ...schritte.map(([t, s]) => `${t}: ${s}`), '',
    ...abschnitte.flatMap((a) => [a.titel.toUpperCase(), ...a.zeilen.map(([l, v]) => `${l}: ${v}`), '']),
    'Fragen oder Ergänzungen? Antworten Sie einfach auf diese E-Mail.', 'ODERA Design, Nico Robin Bodmer, kontakt@odera.ch',
  ].join('\n');
  return { betreff, html: rahmen(kopf, inhalt, fuss), text };
}
