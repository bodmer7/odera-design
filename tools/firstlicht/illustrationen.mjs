// Illustrationen für Firstlicht: einheitlicher Stil (flache Flächen, Module mit feiner Kontur,
// gleiche Perspektive wie die Hero-Szene). Farben über CSS-Variablen (.illu in firstlicht.css),
// damit sie im Dunkelmodus automatisch umschalten. Keine IDs, damit mehrere Bilder auf einer Seite gehen.

const r = (n) => Math.round(n * 1000) / 1000;

// Modulraster in Einheitskoordinaten (wird per matrix() auf die Dachfläche gelegt)
function raster(spalten, zeilen, rand = 0.05, fuge = 0.014, nur = () => true) {
  const w = (1 - 2 * rand - (spalten - 1) * fuge) / spalten;
  const h = (1 - 2 * rand - (zeilen - 1) * fuge * 2.4) / zeilen;
  let s = '';
  for (let j = 0; j < zeilen; j++) {
    for (let i = 0; i < spalten; i++) {
      if (!nur(i)) continue;
      s += `<rect x="${r(rand + i * (w + fuge))}" y="${r(rand + j * (h + fuge * 2.4))}" width="${r(w)}" height="${r(h)}"/>`;
    }
  }
  return s;
}

const SONNE = { morgen: [64, 84], mittag: [204, 46], abend: [352, 60] };

function rahmen(inhalt, { variante = 'mittag', spiegeln = false, titel = '' }) {
  const [sx, sy] = SONNE[variante] || SONNE.mittag;
  const x = spiegeln ? 400 - sx : sx;
  return `<svg class="illu illu--${variante}" viewBox="0 0 400 300" ${titel ? `role="img" aria-label="${titel}"` : 'aria-hidden="true"'} focusable="false">` +
    `<rect class="ih" width="400" height="300"/><rect class="ih2" y="170" width="400" height="130"/>` +
    `<circle class="is" cx="${x}" cy="${sy}" r="20"/>` +
    `<path class="ib" d="M0 238C80 228 160 242 240 234S360 230 400 232V300H0Z"/>` +
    `<g${spiegeln ? ' transform="matrix(-1 0 0 1 400 0)"' : ''}>${inhalt}</g></svg>`;
}

const GEBAEUDE = {
  efh: (mitModulen, opt) =>
    `<path class="iw2" d="M80 252V178L130 108L180 178V252Z"/>` +
    `<rect class="iw" x="180" y="178" width="160" height="74"/>` +
    `<path class="id" d="M130 108H300L340 178H180Z"/>` +
    (mitModulen || opt.halb ? `<g class="im" transform="matrix(170 0 40 70 130 108)">${raster(6, 2, 0.05, 0.014, (i) => !opt.halb || i < 3)}</g>` : '') +
    (mitModulen && opt.halb ? `<g class="im im--neu" transform="matrix(170 0 40 70 130 108)">${raster(6, 2, 0.05, 0.014, (i) => i >= 3)}</g>` : '') +
    `<path class="ifirst" d="M130 108H300"/>` +
    `<rect class="ifen" x="200" y="196" width="30" height="26" rx="2"/><rect class="ifen" x="248" y="196" width="30" height="26" rx="2"/>` +
    `<rect class="id" x="300" y="206" width="24" height="46" rx="2"/><rect class="ifen" x="112" y="200" width="36" height="26" rx="2"/>` +
    (opt.wallbox ? `<rect class="id" x="352" y="214" width="12" height="18" rx="2"/><path class="il" d="M358 232V252"/>` : ''),
  mfh: (mitModulen) => {
    let reihen = '';
    if (mitModulen) for (let k = 0; k < 4; k++) reihen += `<path class="im" d="M${96 + k * 9} ${108 - k * 4}H${288 + k * 9}L${292 + k * 9} ${101 - k * 4}H${100 + k * 9}Z"/>`;
    let fenster = '';
    for (let z = 0; z < 4; z++) for (let sp = 0; sp < 5; sp++) if (!(z === 3 && sp === 2)) fenster += `<rect class="ifen" x="${96 + sp * 42}" y="${126 + z * 30}" width="22" height="18" rx="2"/>`;
    return `<path class="iw2" d="M300 252V112L340 96V236Z"/>` +
      `<rect class="iw" x="80" y="112" width="220" height="140"/>` +
      `<path class="id" d="M80 112H300L340 96H120Z"/>` + reihen + fenster +
      `<rect class="id" x="178" y="218" width="26" height="34" rx="2"/>`;
  },
  gewerbe: (mitModulen, opt) => {
    let reihen = '';
    if (mitModulen) for (let k = 0; k < 4; k++) reihen += `<path class="im" d="M${52 + k * 6} ${164 - k * 4}H${318 + k * 6}L${322 + k * 6} ${158 - k * 4}H${56 + k * 6}Z"/>`;
    return `<path class="iw2" d="M330 252V168L362 150V234Z"/>` +
      `<rect class="iw" x="40" y="168" width="290" height="84"/>` +
      `<path class="id" d="M40 168H330L362 150H72Z"/>` + reihen +
      `<rect class="id" x="62" y="196" width="58" height="56" rx="2"/><rect class="id" x="136" y="196" width="58" height="56" rx="2"/>` +
      `<rect class="ifen" x="214" y="186" width="96" height="16" rx="2"/>` +
      (opt.ladepunkte ? `<g class="id"><rect x="226" y="218" width="9" height="16" rx="2"/><rect x="248" y="218" width="9" height="16" rx="2"/><rect x="270" y="218" width="9" height="16" rx="2"/><rect x="292" y="218" width="9" height="16" rx="2"/></g>` : '');
  },
  hof: (mitModulen) =>
    `<rect class="iw2" x="22" y="140" width="34" height="112" rx="16"/>` +
    `<path class="iholz" d="M60 252V170L110 92L160 170V252Z"/>` +
    `<rect class="iholz2" x="160" y="170" width="200" height="82"/>` +
    `<path class="id" d="M110 92H320L360 170H160Z"/>` +
    (mitModulen ? `<g class="im" transform="matrix(210 0 40 78 110 92)">${raster(8, 3, 0.04)}</g>` : '') +
    `<path class="ifirst" d="M110 92H320"/>` +
    `<rect class="id" x="232" y="196" width="64" height="56" rx="2"/><path class="il" d="M232 196L296 252M296 196L232 252"/>` +
    `<path class="il il--fein" d="M180 178V252M200 178V252M316 178V252M336 178V252"/>`,

  // Nahansichten für Speicher, Wallbox und Energiemanagement: Hauswand mit Vordach und Modulen
  speicher: () =>
    `<rect class="iw" x="40" y="96" width="270" height="156"/>` +
    `<path class="id" d="M24 96H326L306 64H44Z"/>` +
    `<g class="im" transform="matrix(250 0 -20 32 54 64)">${raster(7, 1, 0.04)}</g>` +
    `<rect class="ifen" x="64" y="122" width="44" height="40" rx="2"/>` +
    `<rect class="iw2" x="128" y="160" width="50" height="40" rx="4"/><path class="il il--fein" d="M136 172H170M136 182H162"/>` +
    `<rect class="id" x="206" y="148" width="64" height="104" rx="6"/>` +
    `<rect class="is" x="220" y="210" width="36" height="10" rx="2"/><rect class="is" x="220" y="194" width="36" height="10" rx="2"/><rect class="is" x="220" y="178" width="36" height="10" rx="2" opacity="0.35"/>` +
    `<path class="il" d="M153 160V108M178 180H206"/>`,
  wallbox: () =>
    `<rect class="iw" x="210" y="112" width="160" height="140"/>` +
    `<path class="id" d="M196 112H384L370 86H210Z"/>` +
    `<g class="im" transform="matrix(156 0 -12 22 214 88)">${raster(5, 1, 0.04)}</g>` +
    `<rect class="id" x="246" y="160" width="30" height="42" rx="5"/><circle class="is" cx="261" cy="174" r="4"/>` +
    `<path class="il" d="M261 202C261 236 214 236 196 220"/>` +
    `<path class="iw2" d="M28 236V214C28 206 34 202 42 200L74 194L100 172C106 167 112 165 120 165H164C172 165 178 168 182 174L196 196C202 198 206 204 206 212V236Z"/>` +
    `<path class="ifen" d="M108 176C111 173 114 172 118 172H136V194H88Z"/><path class="ifen" d="M144 172H164C168 172 171 174 173 177L184 194H144Z"/>` +
    `<circle class="id" cx="68" cy="238" r="16"/><circle class="id" cx="170" cy="238" r="16"/><circle class="iw" cx="68" cy="238" r="6"/><circle class="iw" cx="170" cy="238" r="6"/>`,
  wp: () =>
    `<rect class="iw" x="30" y="104" width="250" height="148"/>` +
    `<path class="id" d="M14 104H296L276 70H34Z"/>` +
    `<g class="im" transform="matrix(232 0 -20 34 44 70)">${raster(6, 1, 0.04)}</g>` +
    `<rect class="ifen" x="56" y="130" width="46" height="42" rx="2"/><rect class="ifen" x="194" y="130" width="46" height="42" rx="2"/>` +
    `<rect class="id" x="126" y="140" width="40" height="30" rx="4"/><rect class="is" x="133" y="157" width="6" height="7" rx="1"/><rect class="is" x="143" y="151" width="6" height="13" rx="1"/><rect class="is" x="153" y="147" width="6" height="17" rx="1"/>` +
    `<rect class="iw2" x="296" y="196" width="78" height="56" rx="5"/><circle class="ifen" cx="324" cy="224" r="18"/><path class="il il--fein" d="M324 208V240M308 224H340M352 210V238M362 210V238"/>` +
    `<path class="il" d="M146 104V140M166 156H232C250 156 262 180 296 206"/>`
};

export function gebaeude(typ, { module = true, variante = 'mittag', spiegeln = false, titel = '', halb = false, wallbox = false, ladepunkte = false } = {}) {
  const zeichnen = GEBAEUDE[typ] || GEBAEUDE.efh;
  return rahmen(zeichnen(module, { halb, wallbox, ladepunkte }), { variante, spiegeln, titel });
}

// Kleine Linien-Symbole (24 × 24) für Leistungen, im gleichen Strich wie die übrigen Icons
export const SYMBOLE = {
  'i-haus': '<path d="M3 11.5L12 4l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/><path d="M9.5 20v-5h5v5"/>',
  'i-mfh': '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M11 21v-3h2v3"/>',
  'i-gewerbe': '<path d="M3 20V10l5 3V10l5 3V10l5 3V5h3v15z"/><path d="M7 20v-3h3v3M14 20v-3h3v3"/>',
  'i-speicher': '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M10 2h4M12.5 8l-2.5 4h4l-2.5 4"/>',
  'i-wallbox': '<rect x="5" y="3" width="10" height="13" rx="2"/><path d="M10 6.5l-1.5 3h3L10 12.5M10 16v5M15 8h2a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2"/>',
  'i-wp': '<rect x="3" y="6" width="18" height="13" rx="2"/><circle cx="9" cy="12.5" r="3.5"/><path d="M9 9v7M5.5 12.5h7M15 10h3M15 13h3M15 16h3"/>',
  'i-wartung': '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3.5 17.5a1.8 1.8 0 1 0 2.5 2.5l5.8-5.8a4 4 0 0 0 5.4-5.4l-2.3 2.3-2.2-.4-.4-2.2z"/>',
  'i-erweitern': '<rect x="3" y="11" width="8" height="8" rx="1"/><rect x="13" y="11" width="8" height="8" rx="1" stroke-dasharray="2.5 2.5"/><path d="M17 4v5M14.5 6.5h5"/>',
  'i-sonne': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  'i-check': '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  'i-link': '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  'i-druck': '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
  'i-filter': '<path d="M4 5h16l-6 7.5V19l-4 2v-8.5z"/>',
  'i-kalender': '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  'i-karte': '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.5"/>',
  'i-mail': '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5"/>',
  'i-uhr': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  'i-zurueck': '<path d="M20 12H5M11 6l-6 6 6 6"/>'
};

// Isometrisches Haus für den Energie-Baukasten. Teile mit data-teil werden per Schalter ein- und ausgeblendet.
export function baukasten() {
  const S = 14, OX = 250, OY = 180;
  const p = (x, y, z) => `${(OX + (x - y) * 0.866 * S).toFixed(1)} ${(OY + (x + y) * 0.5 * S - z * S).toFixed(1)}`;
  const poly = (cls, pts, extra = '') => `<path class="${cls}" d="M${pts.map((q) => p(...q)).join('L')}Z"${extra}/>`;
  const box = (x0, x1, y0, y1, z0, z1, cls = 'bk-box') =>
    poly(`${cls} bk-seite`, [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]]) +
    poly(`${cls} bk-front`, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]) +
    poly(`${cls} bk-oben`, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]);
  const linie = (cls, ...pts) => `<path class="${cls}" d="M${pts.map((q) => p(...q)).join('L')}"/>`;
  const kurve = (teil, a, b, c) => `<path class="bk-fluss" data-fluss="${teil}" d="M${p(...a)}Q${p(...b)} ${p(...c)}"/>`;

  // Module auf der vorderen Dachfläche: von First (y=4, z=10) bis Traufe (y=8, z=6)
  let module = '';
  const spalten = 5, zeilen = 2;
  for (let j = 0; j < zeilen; j++) {
    for (let i = 0; i < spalten; i++) {
      const u0 = 0.6 + i * 1.8, u1 = u0 + 1.65;
      const t0 = 0.08 + j * 0.45, t1 = t0 + 0.41;
      const q = (u, t) => [u, 4 + 4 * t, 10 - 4 * t];
      module += poly('bk-modul', [q(u0, t0), q(u1, t0), q(u1, t1), q(u0, t1)]);
    }
  }

  return `<svg class="illu baukasten__svg" viewBox="0 0 520 380" role="img" aria-labelledby="bk-titel" focusable="false">
<title id="bk-titel" data-bk-beschreibung>Einfamilienhaus mit Solaranlage</title>
${poly('bk-boden', [[-4, -3, 0], [14.5, -3, 0], [14.5, 14, 0], [-4, 14, 0]])}
<g data-teil="netz">${linie('bk-mast', [-3, 11, 0], [-3, 11, 11])}${linie('bk-mast bk-mast--quer', [-3, 10, 10.5], [-3, 12, 10.5])}${linie('bk-draht', [-3, 11, 10.5], [0, 8, 5.5])}</g>
${box(0, 10, 0, 8, 0, 6, 'bk-haus')}
${poly('bk-dach bk-dach--hinten', [[0, 0, 6], [10, 0, 6], [10, 4, 10], [0, 4, 10]])}
${poly('bk-giebel', [[10, 0, 6], [10, 8, 6], [10, 4, 10]])}
${poly('bk-dach', [[0, 4, 10], [10, 4, 10], [10, 8, 6], [0, 8, 6]])}
<g class="bk-teil" data-teil="pv">${module}${linie('bk-first', [0, 4, 10], [10, 4, 10])}</g>
${poly('bk-fenster', [[1.5, 8, 2.5], [3.5, 8, 2.5], [3.5, 8, 4.5], [1.5, 8, 4.5]])}
${poly('bk-fenster', [[5, 8, 2.5], [7, 8, 2.5], [7, 8, 4.5], [5, 8, 4.5]])}
${poly('bk-tuer', [[8, 8, 0], [9.3, 8, 0], [9.3, 8, 3.4], [8, 8, 3.4]])}
${poly('bk-fenster', [[10, 2, 2.5], [10, 4.5, 2.5], [10, 4.5, 4.5], [10, 2, 4.5]])}
<g class="bk-teil" data-teil="speicher">${box(10, 11.2, 5.4, 7, 0, 3.2, 'bk-geraet')}${poly('bk-led', [[11.2, 6, 2], [11.2, 6.6, 2], [11.2, 6.6, 2.5], [11.2, 6, 2.5]])}</g>
<g class="bk-teil" data-teil="waermepumpe">${box(11.6, 13.6, 1, 3, 0, 1.8, 'bk-geraet')}<circle class="bk-luefter" cx="${p(13.6, 2, 0.9).split(' ')[0]}" cy="${p(13.6, 2, 0.9).split(' ')[1]}" r="9"/></g>
<g class="bk-teil" data-teil="wallbox">${box(1, 1.5, 9.6, 10, 0, 3.4, 'bk-geraet')}${box(3, 9, 10.2, 13, 0, 1.4, 'bk-auto')}${box(4.3, 7.6, 10.5, 12.7, 1.4, 2.6, 'bk-auto bk-auto--dach')}${linie('bk-kabel', [1.5, 10, 2.2], [3, 11.5, 1])}</g>
<g class="bk-fluesse" fill="none">
${kurve('netzHaus', [-3, 11, 10], [-1.5, 9.5, 8], [0, 8, 4])}
${kurve('dachHaus', [5, 6, 8], [5, 7.5, 7], [5, 8, 3.2])}
${kurve('dachSpeicher', [9.5, 7.5, 6.4], [10.6, 7.6, 5.2], [10.6, 6.2, 3.3])}
${kurve('dachWp', [10, 6.4, 7], [12.6, 4.5, 6], [12.6, 2, 1.9])}
${kurve('dachAuto', [1.5, 7.8, 6.4], [1.2, 9, 5.2], [1.25, 9.8, 3.5])}
</g>
</svg>`;
}
