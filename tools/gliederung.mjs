#!/usr/bin/env node
// Gibt pro Route die Gliederung h1 bis h3 aus dem ausgelieferten HTML aus (ohne JavaScript) und prüft sie:
// genau ein h1, keine übersprungene Ebene, keine {{ }}. Ausgabe als Markdown für docs/seo.md.
//
//   node tools/gliederung.mjs
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const ROUTEN = ['/', '/angebot/', '/ablauf/', '/musterprojekte/', '/ueber-mich/', '/website-fuer-handwerker/', '/website-fuer-restaurants/',
  '/website-fuer-praxen/', '/website-fuer-laeden/', '/projekt-check/', '/datenschutz/', '/impressum/', '/agb/'];
const text = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&shy;|­/g, '').replace(/\s+/g, ' ').trim();
let fehler = 0;
const aus = [];
for (const r of ROUTEN) {
  const datei = join(ROOT, r === '/' ? 'index.html' : r.slice(1) + 'index.html');
  if (!existsSync(datei)) continue;
  const html = readFileSync(datei, 'utf8');
  const body = html.slice(html.indexOf('<body'));
  const titel = [...body.matchAll(/<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/g)].map((m) => [Number(m[1]), text(m[2])]);
  const probleme = [];
  if (titel.filter((t) => t[0] === 1).length !== 1) probleme.push('nicht genau ein h1');
  for (let i = 1; i < titel.length; i++) if (titel[i][0] > titel[i - 1][0] + 1) probleme.push(`Ebene übersprungen vor «${titel[i][1]}»`);
  if (html.includes('{{')) probleme.push('Platzhalter {{ im HTML');
  fehler += probleme.length;
  aus.push(`### \`${r}\`${probleme.length ? ' ✗ ' + probleme.join(', ') : ' ✓'}\n\n` + titel.map((t) => `${'  '.repeat(t[0] - 1)}- h${t[0]} ${t[1]}`).join('\n') + '\n');
}
console.log(aus.join('\n'));
process.exit(fehler ? 1 : 0);
