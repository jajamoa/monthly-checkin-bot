// Lumi Town: the progress bar as a place. The persona walks between locations as blocks
// begin, Block B's stop is chosen by the adaptive module (topic-mirroring only — see the
// guardrails on TOWN in content.js), and each completed check-in mints a seasonal postcard.
// Postcards are completion keepsakes: they are never gated on answer content.

import { $, h, esc, FAST } from "./ui.js";
import { TOWN } from "./content.js";
import { composePersona } from "./persona.js";

const N = 6;
const pos = (i) => ((i + 0.5) / N) * 100;
let el = null, road = null, mini = null, nodes = [], locs = [], cur = -1;

// ---------------- town strip (replaces the plain progress bar) ----------------
export function buildTown(cfg) {
  el = $("#progress");
  el.className = "town";
  locs = TOWN.blockLoc.map((l) => l || "mystery");
  road = h("i");
  nodes = locs.map((id, i) => nodeEl(id, i));
  mini = h("div", { class: "tmini", html: composePersona(cfg, { cls: "islander mini" }) });
  mini.style.left = pos(0) + "%";
  el.replaceChildren(h("div", { class: "troad" }, road), ...nodes, mini);
  cur = -1;
}
function nodeEl(id, i) {
  const L = TOWN.locations[id];
  const n = h("div", { class: "tnode" }, h("div", { class: "plq" }, L.icon), h("b", {}, L.name));
  n.style.left = pos(i) + "%";
  return n;
}
/** Block B's destination becomes known only after module selection. */
export function setBlockLocation(block, id) {
  if (!el || !TOWN.locations[id]) return;
  locs[block] = id;
  const fresh = nodeEl(id, block);
  fresh.className = nodes[block].className;
  nodes[block].replaceWith(fresh);
  nodes[block] = fresh;
  if (block === cur) { // already standing there: the mystery stop reveals itself
    showScene(id);
    if (!FAST) toast(block);
  }
}
/** Same signature as the old ui.js prog(block, frac); also walks the avatar on block change. */
export function prog(block, frac = 0) {
  if (!el) return;
  road.style.width = Math.min(100, ((block + 0.5 + Math.max(0, Math.min(1, frac))) / N) * 100) + "%";
  nodes.forEach((n, i) => { n.classList.toggle("on", i === block); n.classList.toggle("done", i < block); });
  if (block !== cur) {
    cur = block;
    mini.style.left = pos(block) + "%";
    mini.classList.add("walking");
    setTimeout(() => mini.classList.remove("walking"), 1400);
    showScene(locs[block]);
    if (!FAST) toast(block);
  }
}
function toast(i) {
  const L = TOWN.locations[locs[i]];
  const t = h("div", { class: "ttoast" }, `${L.icon} ${L.name}`);
  t.style.left = pos(i) + "%";
  el.append(t);
  setTimeout(() => t.remove(), 2500);
}

// ---------------- location scenes (stage backdrop art, one per town stop) ----------------
const R = (x, y, w, hh, rx, f, s, sw = 3) => `<rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="${rx}" fill="${f}" ${s ? `stroke="${s}" stroke-width="${sw}"` : ""}/>`;
const Cc = (cx, cy, r, f, s, sw = 3) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}" ${s ? `stroke="${s}" stroke-width="${sw}"` : ""}/>`;
const Ee = (cx, cy, rx, ry, f, s, sw = 3) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${f}" ${s ? `stroke="${s}" stroke-width="${sw}"` : ""}/>`;
const Pp = (d, f, s, sw = 3) => `<path d="${d}" fill="${f}" ${s ? `stroke="${s}" stroke-width="${sw}"` : ""} stroke-linejoin="round" stroke-linecap="round"/>`;
const Ll = (d, s, sw = 3) => `<path d="${d}" fill="none" stroke="${s}" stroke-width="${sw}" stroke-linecap="round"/>`;
const sparkle = (x, y, r, f = "#f3cf5a") => Pp(`M${x},${y - r} L${x + r * 0.3},${y - r * 0.3} L${x + r},${y} L${x + r * 0.3},${y + r * 0.3} L${x},${y + r} L${x - r * 0.3},${y + r * 0.3} L${x - r},${y} L${x - r * 0.3},${y - r * 0.3} Z`, f);
const tulip = (x, col) => Ll(`M${x},200 L${x},184`, "#3f9a58", 2.5) + Cc(x, 181, 5, col) + Ll(`M${x},194 q6,-2 8,-7`, "#3f9a58", 2);
const houseWin = (x, y, lit = false) => R(x, y, 30, 26, 5, lit ? "#ffd76e" : "#bfe9f7", lit ? "#d4ac2f" : "#7a5a3c", 2.5) + Ll(`M${x + 15},${y} v26 M${x},${y + 13} h30`, lit ? "#d4ac2f" : "#7a5a3c", 2);
const shadowG = Ee(120, 208, 92, 8, "rgba(0,0,0,.1)");
const homeBase = (lit) =>
  shadowG +
  R(50, 92, 140, 112, 8, "#fffaea", "#a98563") +
  Pp("M38,96 L120,40 L202,96 Z", "#f6a04d", "#d98129") +
  R(146, 144, 32, 60, 6, "#a98563", "#7a5a3c") + Cc(152, 176, 2.5, "#5b4630") +
  houseWin(72, 120, lit) +
  R(42, 198, 156, 10, 5, "#a98563", "#7a5a3c");
const ferrisGondolas = ["#f3cf5a", "#7cc3e8", "#e25b4a", "#6cc07a", "#f4a6b7", "#b79ae0"]
  .map((col, i) => { const a = (i / 6) * 2 * Math.PI; return Cc(120 + 68 * Math.cos(a), 104 + 68 * Math.sin(a), 10, col, "#7a5a3c", 2.5); }).join("");

const SCENES = {
  porch: homeBase(false) +
    R(20, 160, 6, 44, 3, "#7a5a3c") + R(8, 144, 32, 20, 9, "#e25b4a", "#bf4030", 2.5) + Ll("M40,150 l8,-8", "#bf4030", 2.5),
  cabin: shadowG +
    R(56, 100, 128, 102, 8, "#c89a6a", "#8a5a33") +
    Ll("M58,126 h124 M58,150 h124 M58,174 h124", "rgba(138,90,51,.4)", 2) +
    Pp("M44,104 L120,50 L196,104 Z", "#6cc07a", "#3f9a58") +
    Pp("M120,50 C 112,38 100,38 97,44 C 104,50 114,52 120,48 Z", "#3f9a58") +
    R(104, 152, 32, 50, 6, "#8a5a33", "#6d4323") +
    Cc(80, 132, 12, "#bfe9f7", "#8a5a33") +
    R(148, 118, 32, 26, 4, "#fff", "#8a5a33", 2.5) + R(161, 122, 6, 18, 2, "#3f9a58") + R(155, 128, 18, 6, 2, "#3f9a58") +
    tulip(62, "#f4a6b7") + tulip(76, "#f3cf5a") + tulip(90, "#e25b4a"),
  office: shadowG +
    R(60, 62, 120, 140, 6, "#9fb4c7", "#6b8299") +
    R(54, 52, 132, 14, 5, "#6b8299", "#54687c", 2.5) + Ll("M120,52 v-16", "#54687c", 3) + Cc(120, 32, 3.5, "#e25b4a") +
    [0, 1, 2].map((r) => R(78, 80 + r * 30, 24, 18, 4, "#d8ecf7", "#6b8299", 2.5) + R(138, 80 + r * 30, 24, 18, 4, "#d8ecf7", "#6b8299", 2.5)).join("") +
    R(104, 168, 32, 34, 4, "#bfe9f7", "#6b8299", 2.5) + R(96, 160, 48, 8, 4, "#4f9cc7"),
  park: shadowG +
    R(70, 148, 12, 52, 5, "#8a5a33", "#6d4323", 2.5) +
    Cc(58, 136, 20, "#6cc07a", "#3f9a58") + Cc(94, 136, 20, "#6cc07a", "#3f9a58") + Cc(76, 116, 32, "#6cc07a", "#3f9a58") +
    R(168, 162, 9, 38, 4, "#8a5a33", "#6d4323", 2.5) + Cc(172, 140, 26, "#7fd08c", "#3f9a58") +
    R(108, 152, 56, 7, 3, "#a98563", "#7a5a3c", 2.5) + R(108, 172, 56, 8, 3, "#a98563", "#7a5a3c", 2.5) +
    R(112, 180, 6, 20, 2, "#7a5a3c") + R(154, 180, 6, 20, 2, "#7a5a3c") +
    Ee(34, 198, 22, 12, "#7fd08c", "#3f9a58", 2.5) +
    Cc(136, 108, 4, "#f4a6b7") + Cc(142, 106, 4, "#f4a6b7"),
  friends: Ee(120, 210, 104, 8, "rgba(0,0,0,.1)") +
    R(26, 122, 84, 80, 6, "#f8d9e0", "#d97f95") + Pp("M18,126 L68,80 L118,126 Z", "#d97f95", "#c06a80") +
    houseWin(40, 140) + R(82, 162, 22, 40, 5, "#c06a80") +
    R(132, 134, 82, 68, 6, "#cfe6f7", "#4f9cc7") + Pp("M124,138 L173,96 L222,138 Z", "#4f9cc7", "#3a7ba3") +
    houseWin(182, 150) + R(144, 158, 22, 44, 5, "#3a7ba3"),
  gym: shadowG +
    R(60, 102, 120, 100, 8, "#cdeedb", "#3f9a58") +
    R(104, 152, 32, 50, 6, "#3f9a58", "#2f7a44", 2.5) +
    R(86, 118, 68, 7, 3.5, "#5b4630") + Cc(86, 121, 10, "#5b4630") + Cc(154, 121, 10, "#5b4630") +
    Cc(42, 194, 10, "#5b4630") + Ll("M34,188 Q42,176 50,188", "#5b4630", 4),
  bank: shadowG +
    R(48, 192, 144, 10, 3, "#d9cdab", "#b7a97f", 2.5) + R(56, 182, 128, 10, 3, "#e5dcc0", "#b7a97f", 2.5) +
    R(60, 104, 120, 80, 4, "#efe6d2", "#b7a97f") +
    Pp("M50,106 L120,62 L190,106 Z", "#efe6d2", "#b7a97f") +
    R(72, 112, 14, 70, 6, "#fff", "#b7a97f", 2.5) + R(113, 112, 14, 70, 6, "#fff", "#b7a97f", 2.5) + R(154, 112, 14, 70, 6, "#fff", "#b7a97f", 2.5) +
    Cc(120, 88, 11, "#f3cf5a", "#d4ac2f", 2.5) + Ll("M120,82 v12", "#d4ac2f", 2.5),
  library: shadowG +
    R(56, 98, 128, 104, 6, "#e8c9a0", "#a9825a") + R(48, 88, 144, 13, 5, "#a9825a", "#8a6a44", 2.5) +
    Pp("M104,202 L104,162 Q120,146 136,162 L136,202 Z", "#7a5a3c", "#5d4426") +
    houseWin(66, 116) + houseWin(144, 116) +
    Pp("M94,128 Q107,120 120,128 Q133,120 146,128 L146,142 Q133,136 120,142 Q107,136 94,142 Z", "#fff", "#a9825a", 2.5) + Ll("M120,128 v14", "#a9825a", 2) +
    R(34, 190, 22, 6, 2, "#e25b4a") + R(36, 182, 22, 6, 2, "#4f9cc7") + R(38, 174, 20, 6, 2, "#6cc07a"),
  market: shadowG +
    R(56, 112, 8, 88, 4, "#8a5a33", "#6d4323", 2) + R(176, 112, 8, 88, 4, "#8a5a33", "#6d4323", 2) +
    R(46, 84, 148, 30, 8, "#e25b4a", "#bf4030") +
    R(64, 84, 22, 30, 0, "#fff") + R(108, 84, 22, 30, 0, "#fff") + R(152, 84, 22, 30, 0, "#fff") +
    R(52, 152, 136, 48, 6, "#a98563", "#7a5a3c") +
    Cc(78, 146, 8, "#f6a04d", "#d98129", 2) + Cc(96, 146, 8, "#f6a04d", "#d98129", 2) + Cc(87, 136, 8, "#f6a04d", "#d98129", 2) +
    Cc(126, 146, 7, "#e25b4a", "#bf4030", 2) + Cc(141, 146, 7, "#e25b4a", "#bf4030", 2) +
    Ee(166, 144, 10, 7, "#7fd08c", "#3f9a58", 2) +
    R(198, 178, 30, 22, 3, "#c89a6a", "#8a5a33", 2.5) + Ll("M198,189 h30", "#8a5a33", 2),
  observatory: Ee(120, 206, 110, 26, "#7fc971", "#5aa964") +
    R(84, 122, 72, 76, 6, "#fffaea", "#a98563") +
    Pp("M74,126 A46,46 0 0 1 166,126 Z", "#7cc3e8", "#4f9cc7") +
    R(112, 80, 16, 28, 7, "#4f9cc7", "#3a7ba3", 2.5) +
    Ll("M126,96 L152,66", "#5b4630", 7) + Cc(154, 64, 5.5, "#5b4630") +
    R(108, 168, 24, 30, 4, "#8a5a33", "#6d4323", 2.5) +
    sparkle(48, 60, 7) + sparkle(190, 44, 9) + sparkle(206, 96, 6) + Cc(34, 104, 4, "#f3cf5a"),
  home: homeBase(true) +
    R(96, 54, 14, 26, 3, "#a98563", "#7a5a3c", 2.5) +
    Cc(103, 40, 6, "rgba(255,255,255,.75)") + Cc(112, 30, 4.5, "rgba(255,255,255,.6)") +
    Pp("M156,118 c0,-5 8,-5 8,0 c0,-5 8,-5 8,0 c0,6 -8,10 -8,12 c0,-2 -8,-6 -8,-12 Z", "#e25b4a") +
    Cc(32, 38, 13, "#f3cf5a", "#d4ac2f", 2.5) + sparkle(62, 26, 5) + sparkle(200, 32, 6),
  mystery: Ee(120, 210, 100, 8, "rgba(0,0,0,.1)") +
    Ll("M120,104 L92,204 M120,104 L148,204", "#a98563", 7) +
    Cc(120, 104, 72, "none", "#d97f95", 5) +
    [0, 1, 2].map((i) => { const a = (i / 3) * Math.PI; return Ll(`M${120 - 66 * Math.cos(a)},${104 - 66 * Math.sin(a)} L${120 + 66 * Math.cos(a)},${104 + 66 * Math.sin(a)}`, "#d97f95", 3); }).join("") +
    Cc(120, 104, 11, "#f4a6b7", "#d97f95") +
    ferrisGondolas +
    sparkle(36, 56, 7, "#b79ae0") + sparkle(206, 70, 6, "#f3cf5a") +
    `<text x="196" y="40" font-family="Fredoka, Nunito, sans-serif" font-size="34" font-weight="600" fill="#b79ae0">?</text>`,
};

/** Swap the stage backdrop to a location's scene (with a little pop). */
export function showScene(id) {
  const host = $("#scenery");
  if (!host) return;
  host.innerHTML = SCENES[id] ? `<svg viewBox="0 0 240 220" aria-hidden="true">${SCENES[id]}</svg>` : "";
  host.classList.remove("pop");
  void host.offsetWidth;
  host.classList.add("pop");
}

// ---------------- postcards ----------------
const SEASONS = {
  winter: { sky: ["#cfe3f6", "#eef6fb"], h1: "#e4ecf4", h2: "#d2e0ec", stamp: "⛄" },
  spring: { sky: ["#cfeef7", "#eafae6"], h1: "#9ad98a", h2: "#7fc971", stamp: "🌸" },
  summer: { sky: ["#bfe9f7", "#fdf4cf"], h1: "#8ed47e", h2: "#6fc161", stamp: "☀️" },
  autumn: { sky: ["#d9ecf2", "#faeecf"], h1: "#d9a65e", h2: "#c08b45", stamp: "🍂" },
};
export const seasonOf = (date) => { const m = date.getMonth(); return m === 11 || m <= 1 ? "winter" : m <= 4 ? "spring" : m <= 7 ? "summer" : "autumn"; };
const DECOS = {
  winter: [[40, 40], [90, 70], [150, 35], [230, 60], [300, 30], [350, 75], [190, 95]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#fff" opacity=".9"/>`).join(""),
  spring: [[50, 50], [120, 35], [210, 55], [290, 38], [345, 68]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#f8c3d4" opacity=".85"/>`).join(""),
  summer: `<circle cx="62" cy="52" r="22" fill="#ffd76e" stroke="#e8b84a" stroke-width="3"/>`,
  autumn: [[60, 60], [140, 40], [250, 65], [330, 45]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="5" ry="3" fill="#d98129" opacity=".85"/>`).join(""),
};
// Mini Lumi with inline fills (document CSS doesn't survive SVG→PNG serialization).
const LUMI_MINI = `<svg x="52" y="94" width="118" height="130" viewBox="0 0 200 220">
  <ellipse cx="100" cy="208" rx="62" ry="9" fill="rgba(0,0,0,.12)"/>
  <path d="M100 22 C 84 4, 62 6, 56 16 C 70 28, 90 32, 100 24 C 110 32, 130 28, 144 16 C 138 6, 116 4, 100 22 Z" fill="#6cc07a" stroke="#3f9a58" stroke-width="3" stroke-linejoin="round"/>
  <path d="M100 24 L100 40" stroke="#3f9a58" stroke-width="3" stroke-linecap="round"/>
  <ellipse cx="100" cy="122" rx="78" ry="82" fill="#8fd3d6" stroke="#5fb3b8" stroke-width="4"/>
  <ellipse cx="100" cy="146" rx="50" ry="52" fill="#fff6dc"/>
  <ellipse cx="72" cy="98" rx="22" ry="25" fill="#fff" stroke="#5fb3b8" stroke-width="3"/>
  <ellipse cx="128" cy="98" rx="22" ry="25" fill="#fff" stroke="#5fb3b8" stroke-width="3"/>
  <circle cx="76" cy="100" r="11" fill="#4a3a2a"/><circle cx="124" cy="100" r="11" fill="#4a3a2a"/>
  <circle cx="80" cy="95" r="4" fill="#fff"/><circle cx="128" cy="95" r="4" fill="#fff"/>
  <path d="M90 120 L110 120 L100 136 Z" fill="#f6a04d" stroke="#d98129" stroke-width="3" stroke-linejoin="round"/>
  <ellipse cx="50" cy="126" rx="10" ry="6" fill="#f4a6b7" opacity=".7"/><ellipse cx="150" cy="126" rx="10" ry="6" fill="#f4a6b7" opacity=".7"/>
  <path d="M26 120 C 8 140, 18 168, 38 168 C 40 150, 38 134, 26 120 Z" fill="#75c3c8" stroke="#5fb3b8" stroke-width="3"/>
  <path d="M174 120 C 192 140, 182 168, 162 168 C 160 150, 162 134, 174 120 Z" fill="#75c3c8" stroke="#5fb3b8" stroke-width="3"/>
</svg>`;

/** Build the end-of-check-in postcard. Returns { el, season }. */
export function makePostcard({ name, cfg, month, date }) {
  const season = seasonOf(date);
  const S = SEASONS[season];
  const when = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const d = document.createElement("div");
  d.innerHTML = `<svg class="postcard" viewBox="0 0 400 260" width="400" height="260" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="pcsky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${S.sky[0]}"/><stop offset="1" stop-color="${S.sky[1]}"/>
    </linearGradient>
    <clipPath id="pcclip"><rect x="8" y="8" width="384" height="208" rx="8"/></clipPath>
  </defs>
  <rect x="2" y="2" width="396" height="256" rx="14" fill="#fff" stroke="#a98563" stroke-width="3"/>
  <g clip-path="url(#pcclip)">
    <rect x="8" y="8" width="384" height="208" fill="url(#pcsky)"/>
    <ellipse cx="90" cy="236" rx="220" ry="58" fill="${S.h1}"/>
    <ellipse cx="330" cy="246" rx="230" ry="60" fill="${S.h2}"/>
    ${DECOS[season]}
    ${LUMI_MINI}
    <svg x="212" y="80" width="130" height="156" viewBox="0 0 200 240">${composePersona(cfg, { cls: "pc-islander" }).replace(/^<svg[^>]*>|<\/svg>$/g, "")}</svg>
  </g>
  <rect x="346" y="16" width="40" height="48" rx="4" fill="#fff" stroke="#a98563" stroke-width="2" stroke-dasharray="4 3"/>
  <text x="366" y="48" text-anchor="middle" font-size="18">${S.stamp}</text>
  <circle cx="338" cy="30" r="14" fill="none" stroke="rgba(122,90,60,.35)" stroke-width="2"/>
  <rect x="8" y="222" width="384" height="30" rx="8" fill="#fffaea" stroke="#e5cf95" stroke-width="2"/>
  <text x="20" y="242" font-family="Fredoka, Nunito, sans-serif" font-size="13" font-weight="600" fill="#5b4630">${esc(name)} in Lumi Town · check-in #${month}</text>
  <text x="384" y="242" text-anchor="end" font-family="Fredoka, Nunito, sans-serif" font-size="12" fill="#8a6f4d">${when}</text>
</svg>`;
  return { el: d.firstElementChild, season };
}

export async function downloadPostcardPNG(svgEl, filename) {
  const xml = new XMLSerializer().serializeToString(svgEl);
  const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const c = document.createElement("canvas");
    c.width = 800; c.height = 520;
    c.getContext("2d").drawImage(img, 0, 0, 800, 520);
    c.toBlob((b) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    }, "image/png");
  } finally { URL.revokeObjectURL(url); }
}

// ---------------- album (localStorage, per participant) ----------------
const albumKey = (pid) => `mci:album:${pid}`;
export const loadAlbum = (pid) => { try { return JSON.parse(localStorage.getItem(albumKey(pid)) || "[]"); } catch { return []; } };
/** Append a postcard entry; returns the new album size (0 if storage is unavailable). */
export function saveAlbumEntry(pid, entry) {
  try {
    const album = loadAlbum(pid);
    album.push(entry);
    localStorage.setItem(albumKey(pid), JSON.stringify(album));
    return album.length;
  } catch { return 0; }
}
