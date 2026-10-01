// Gemeinsamer Teil von seo-build.mjs und wissen-build.mjs:
// ein kleiner Webserver für index.html und ein Chrome ohne Fenster, der jede Seite rendert.

import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

export const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Tabelle PAGES aus index.html
export function leseSeiten(quelle) {
  const pagesText = quelle.match(/ {2}PAGES = (\{[\s\S]*?\n {2}\});/);
  if (!pagesText) throw new Error('Tabelle PAGES in index.html nicht gefunden.');
  return new Function('return ' + pagesText[1])();
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.txt': 'text/plain', '.xml': 'application/xml' };
export function startServer(PAGES) {
  const server = createServer((req, res) => {
    const pfad = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const route = pfad.replace(/\/index\.html$/, '/').replace(/\/+$/, '') || '/';
    let datei = null;
    if (extname(pfad) && existsSync(join(ROOT, pfad)) && !pfad.endsWith('/index.html')) datei = join(ROOT, pfad);
    else if (PAGES[route]) datei = join(ROOT, 'index.html');
    if (!datei) { res.writeHead(404); res.end('nicht gefunden'); return; }
    res.writeHead(200, { 'content-type': TYPES[extname(datei)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(readFileSync(datei));
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}

export async function startChrome() {
  const kandidaten = [process.env.CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean);
  const pfad = kandidaten.find((p) => existsSync(p));
  if (!pfad) throw new Error('Chrome nicht gefunden. Pfad über die Variable CHROME angeben.');
  const port = 9600 + Math.floor(Math.random() * 300);
  const profil = mkdtempSync(join(tmpdir(), 'seo-build-'));
  const proc = spawn(pfad, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`,
    `--user-data-dir=${profil}`, '--no-first-run', '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });
  let ziele;
  for (let i = 0; i < 60; i++) {
    try { ziele = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); if (ziele.length) break; } catch {}
    await sleep(200);
  }
  if (!ziele) throw new Error('Chrome hat nicht gestartet.');
  const ws = new WebSocket(ziele.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0; const offen = new Map();
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && offen.has(m.id)) { const { res, rej } = offen.get(m.id); offen.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); }
  });
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; offen.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  // Ohne Bewegung, damit Zähler und Animationen sofort ihren Endwert zeigen
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  return {
    send, // direkter Zugriff auf das DevTools-Protokoll (zum Beispiel für Screenshots)
    async ausfuehren(url, ausdruck) {
      await send('Page.navigate', { url });
      for (let i = 0; i < 50; i++) {
        await sleep(200);
        const r = await send('Runtime.evaluate', { expression: `!!document.querySelector('#dc-root main h1')`, returnByValue: true });
        if (r.result.value) break;
      }
      await sleep(700);
      const r = await send('Runtime.evaluate', { expression: ausdruck, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    },
    schliessen() { try { ws.close(); } catch {} proc.kill(); try { rmSync(profil, { recursive: true, force: true }); } catch {} },
  };
}

