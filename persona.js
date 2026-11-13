// Islander persona: part library, SVG composer, creator / monthly-mirror editor, storage.
// The persona is identity, not reward: nothing in this file (and nothing that calls it)
// may gate a cosmetic on *what* the participant answered — only on who they say they are.
// Appearance edits are their own data (see persona_diff in the record), never an incentive.

import { $, h } from "./ui.js";

export const PERSONA_V = 1;

// ---------------- palettes ----------------
const SKINS = [
  { f: "#ffe9d6", s: "#eac3a2" }, { f: "#ffd9b3", s: "#e7b286" }, { f: "#f0b989", s: "#d29a63" },
  { f: "#cf9057", s: "#b0763f" }, { f: "#a06a3b", s: "#845427" }, { f: "#70492a", s: "#59381f" },
];
const HAIR_COLORS = [
  { f: "#2f2520", s: "#1f1713" }, { f: "#6b4226", s: "#53311a" }, { f: "#a8632d", s: "#8a4d1f" },
  { f: "#ecc368", s: "#d4a647" }, { f: "#d96a3d", s: "#b94f28" }, { f: "#b9c0c7", s: "#97a0a9" },
  { f: "#f2a9c4", s: "#d987a8" },
];
const OUTFIT_COLORS = [
  { f: "#6cc07a", s: "#3f9a58" }, { f: "#f6a04d", s: "#d98129" }, { f: "#f4a6b7", s: "#d97f95" },
  { f: "#7cc3e8", s: "#4f9cc7" }, { f: "#b79ae0", s: "#9474c4" }, { f: "#f3cf5a", s: "#d4ac2f" },
];
const INK = "#3a2d22";

// svg helpers (inline attributes only — postcards are serialized to PNG, so no CSS fills)
const P = (d, f, s, w = 3) => `<path d="${d}" fill="${f}" stroke="${s}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
const C = (cx, cy, r, f, s = "none", w = 3) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}" ${s === "none" ? "" : `stroke="${s}" stroke-width="${w}"`}/>`;
const E = (cx, cy, rx, ry, f, s = "none", w = 3) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${f}" ${s === "none" ? "" : `stroke="${s}" stroke-width="${w}"`}/>`;
const L = (d, s, w = 4) => `<path d="${d}" fill="none" stroke="${s}" stroke-width="${w}" stroke-linecap="round"/>`;

// ---------------- parts ----------------
// Head: circle cx=100 cy=86 r=52. Torso: 134→204. Feet at (90.5, 109.5)×220.
const fringe = (c) => C(72, 45, 14, c.f) + C(100, 38, 15, c.f) + C(128, 45, 14, c.f);
const HAIRS = [
  { name: "Buzz", back: () => "", front: (c) => E(100, 42, 38, 12, c.f, c.s) },
  { name: "Short", back: (c) => C(100, 74, 56, c.f, c.s), front: fringe },
  {
    name: "Bob",
    back: (c) => P("M46,78 A54,54 0 0 1 154,78 L154,112 Q154,124 142,124 L58,124 Q46,124 46,112 Z", c.f, c.s),
    front: fringe,
  },
  {
    name: "Long",
    back: (c) => P("M46,78 A54,54 0 0 1 154,78 L154,152 Q154,166 140,166 L60,166 Q46,166 46,152 Z", c.f, c.s),
    front: fringe,
  },
  { name: "Buns", back: (c) => C(54, 36, 14, c.f, c.s) + C(146, 36, 14, c.f, c.s) + C(100, 74, 56, c.f, c.s), front: fringe },
  {
    name: "Curly",
    back: (c) => C(64, 52, 21, c.f, c.s) + C(136, 52, 21, c.f, c.s) + C(48, 78, 16, c.f, c.s) + C(152, 78, 16, c.f, c.s) + C(100, 40, 25, c.f, c.s),
    front: (c) => C(82, 42, 13, c.f) + C(118, 42, 13, c.f),
  },
  {
    name: "Ponytail",
    back: (c) => C(100, 74, 56, c.f, c.s) + P("M146,56 Q174,74 166,120 Q162,136 150,130 Q158,98 140,70 Z", c.f, c.s),
    front: fringe,
  },
  {
    name: "Pigtails",
    back: (c) => C(100, 74, 56, c.f, c.s) + E(38, 108, 13, 27, c.f, c.s) + E(162, 108, 13, 27, c.f, c.s),
    front: fringe,
  },
  { name: "Mohawk", back: () => "", front: (c) => P("M58,62 L72,28 L84,52 L100,20 L116,52 L128,28 L142,62 Q100,46 58,62 Z", c.f, c.s) },
  { name: "Afro", back: (c) => C(100, 60, 56, c.f, c.s) + C(52, 86, 20, c.f, c.s) + C(148, 86, 20, c.f, c.s), front: () => "" },
  {
    name: "Braid",
    back: (c) => P("M46,78 A54,54 0 0 1 154,78 L154,140 Q154,154 140,154 L60,154 Q46,154 46,140 Z", c.f, c.s) +
      C(146, 128, 11, c.f, c.s) + C(150, 148, 10, c.f, c.s) + C(153, 166, 9, c.f, c.s) + C(155, 182, 7, c.f, c.s),
    front: fringe,
  },
  { name: "Swept", back: (c) => C(100, 74, 56, c.f, c.s), front: (c) => C(76, 44, 17, c.f) + C(108, 38, 15, c.f) + C(134, 46, 12, c.f) + C(148, 58, 9, c.f) },
  {
    name: "Spiky",
    back: (c) => C(100, 76, 54, c.f, c.s),
    front: (c) => P("M54,64 L66,34 L78,54 L92,26 L102,50 L114,26 L126,54 L138,34 L148,64 Q100,42 54,64 Z", c.f, c.s),
  },
  {
    name: "Hime",
    back: (c) => P("M46,78 A54,54 0 0 1 154,78 L154,152 Q154,166 140,166 L60,166 Q46,166 46,152 Z", c.f, c.s),
    front: (c) => `<rect x="56" y="34" width="88" height="22" rx="10" fill="${c.f}"/>` +
      `<rect x="44" y="52" width="17" height="58" rx="8" fill="${c.f}" stroke="${c.s}" stroke-width="3"/>` +
      `<rect x="139" y="52" width="17" height="58" rx="8" fill="${c.f}" stroke="${c.s}" stroke-width="3"/>`,
  },
  { name: "Top knot", back: () => "", front: (c) => E(100, 42, 38, 12, c.f, c.s) + C(100, 22, 14, c.f, c.s) + E(100, 36, 9, 4, c.s) },
  {
    name: "Wavy",
    back: (c) => P("M46,78 A54,54 0 0 1 154,78 L154,148 Q147,162 138,150 Q130,164 119,152 Q110,166 100,152 Q90,166 81,152 Q72,164 62,150 Q53,162 46,148 Z", c.f, c.s),
    front: fringe,
  },
];
const glints = (dx = 2, dy = -2, r = 2) => C(78 + dx, 86 + dy, r, "#fff") + C(122 + dx, 86 + dy, r, "#fff");
const EYES = [
  { name: "Round", draw: () => C(78, 86, 6, INK) + C(122, 86, 6, INK) + glints() },
  { name: "Happy", draw: () => L("M70,88 Q78,79 86,88", INK) + L("M114,88 Q122,79 130,88", INK) },
  { name: "Oval", draw: () => E(78, 86, 5.5, 8.5, INK) + E(122, 86, 5.5, 8.5, INK) + glints(2, -3) },
  { name: "Sleepy", draw: () => L("M70,84 Q78,90 86,84", INK) + L("M114,84 Q122,90 130,84", INK) },
  { name: "Sparkle", draw: () => C(78, 86, 7.5, INK) + C(122, 86, 7.5, INK) + glints(2.5, -2.5, 2.6) + C(75, 89, 1.3, "#fff") + C(119, 89, 1.3, "#fff") },
];
const NOSES = [
  { name: "None", draw: () => "" },
  { name: "Dot", draw: () => `<circle cx="100" cy="97" r="2.6" fill="${INK}" fill-opacity=".45"/>` },
  { name: "Button", draw: (sk) => E(100, 97, 4.5, 3.6, sk.s) },
  { name: "Curve", draw: () => `<path d="M100,92 q4,5 0,9" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-opacity=".55"/>` },
];
const MOUTHS = [
  { name: "Smile", draw: () => L("M90,107 Q100,117 110,107", INK) },
  { name: "Grin", draw: () => P("M87,105 Q100,123 113,105 Z", "#8a4b3c", INK, 3) },
  { name: "Soft", draw: () => L("M93,110 L107,110", INK) },
  { name: "Surprised", draw: () => E(100, 111, 5, 6.5, "#8a4b3c", INK, 3) },
  { name: "Cat", draw: () => L("M88,107 Q94,114 100,107 Q106,114 112,107", INK) },
];
const EXPRS = [
  { name: "Fresh", draw: () => "" },
  { name: "Blush", draw: () => `<g fill="#f4a6b7" opacity=".75">${E(64, 102, 9, 5.5, "#f4a6b7")}${E(136, 102, 9, 5.5, "#f4a6b7")}</g>` },
  {
    name: "Freckles",
    draw: () => `<g fill="#c98e5f" opacity=".8">${[[66, 100], [74, 104], [82, 100], [118, 100], [126, 104], [134, 100]].map(([x, y]) => C(x, y, 1.6, "#c98e5f")).join("")}</g>`,
  },
  { name: "Determined", draw: () => L("M68,72 L88,76", INK) + L("M132,72 L112,76", INK) },
];
// Tomodachi-style floating hands: sleeve stub + arm curve + hand circle.
const arms = (oc, sk) =>
  L("M62,150 Q50,160 51,170", sk.f, 11) + L("M138,150 Q150,160 149,170", sk.f, 11) +
  C(60, 148, 12, oc.f, oc.s) + C(140, 148, 12, oc.f, oc.s) +
  C(51, 174, 8.5, sk.f, sk.s) + C(149, 174, 8.5, sk.f, sk.s);
const torsoRect = (oc) => `<rect x="66" y="134" width="68" height="70" rx="22" fill="${oc.f}" stroke="${oc.s}" stroke-width="3"/>`;
const OUTFITS = [
  { name: "Tee", draw: (oc, sk) => torsoRect(oc) + arms(oc, sk) },
  {
    name: "Hoodie",
    draw: (oc, sk) => torsoRect(oc) + E(100, 142, 28, 11, oc.s) +
      `<rect x="82" y="170" width="36" height="20" rx="9" fill="${oc.f}" stroke="${oc.s}" stroke-width="3"/>` +
      L("M94,150 v12 M106,150 v12", "#fff", 2.5) + arms(oc, sk),
  },
  {
    name: "Overalls",
    draw: (oc, sk) => `<rect x="66" y="134" width="68" height="70" rx="22" fill="#fff6dc" stroke="#e2cf9f" stroke-width="3"/>` +
      L("M79,150 L68,138", oc.s, 5) + L("M121,150 L132,138", oc.s, 5) +
      `<rect x="79" y="146" width="42" height="26" rx="7" fill="${oc.f}" stroke="${oc.s}" stroke-width="3"/>` +
      `<rect x="66" y="176" width="68" height="28" rx="14" fill="${oc.f}" stroke="${oc.s}" stroke-width="3"/>` +
      C(84, 151, 2.5, "#fff") + C(116, 151, 2.5, "#fff") + arms({ f: "#fff6dc", s: "#e2cf9f" }, sk),
  },
  {
    name: "Dress",
    draw: (oc, sk) => P("M74,132 Q100,140 126,132 L142,198 Q142,206 132,206 L68,206 Q58,206 58,198 Z", oc.f, oc.s) + arms(oc, sk),
  },
];
const SHOES = [
  {
    name: "Sneakers",
    draw: (x) => `<rect x="${x - 12}" y="214" width="24" height="13" rx="6" fill="#fff" stroke="#cfd4da" stroke-width="3"/>` + L(`M${x - 12},221 h24`, "#e25b4a", 3),
  },
  {
    name: "Boots",
    draw: (x) => `<rect x="${x - 11}" y="208" width="22" height="20" rx="6" fill="#8a5a33" stroke="#6d4323" stroke-width="3"/>` +
      `<rect x="${x - 11}" y="222" width="22" height="6" rx="3" fill="#5d3a1e"/>`,
  },
  {
    name: "Sandals",
    draw: (x) => `<rect x="${x - 12}" y="222" width="24" height="6" rx="3" fill="#d9a564" stroke="#b9854a" stroke-width="2.5"/>` +
      L(`M${x - 9},222 Q${x},210 ${x + 9},222`, "#b9854a", 3),
  },
  {
    name: "Slip-ons",
    draw: (x) => E(x, 221, 12, 8, "#e25b4a", "#bf4030", 3) + L(`M${x - 11},218 Q${x},212 ${x + 11},218`, "#bf4030", 2.5),
  },
  {
    name: "High-tops",
    draw: (x) => `<rect x="${x - 11}" y="206" width="22" height="22" rx="6" fill="#4f9cc7" stroke="#3a7ba3" stroke-width="3"/>` +
      E(x, 226, 11, 5, "#fff", "#cfd4da", 2.5) + L(`M${x - 5},211 h10 M${x - 5},216 h10`, "#fff", 2),
  },
  {
    name: "Mary Janes",
    draw: (x) => E(x, 222, 12, 7, "#c94f5f", "#a53a49", 3) + L(`M${x - 10},217 Q${x},212 ${x + 10},217`, "#a53a49", 2.5) + C(x, 214.5, 2, "#fff"),
  },
  { name: "Loafers", draw: (x) => E(x, 222, 12, 7, "#8a5a33", "#6d4323", 3) + `<rect x="${x - 8}" y="214" width="16" height="5" rx="2.5" fill="#6d4323"/>` },
  {
    name: "Rain boots",
    draw: (x) => `<rect x="${x - 11}" y="204" width="22" height="24" rx="6" fill="#f3cf5a" stroke="#d4ac2f" stroke-width="3"/>` +
      `<rect x="${x - 11}" y="204" width="22" height="6" rx="3" fill="#d4ac2f"/>`,
  },
  { name: "Flip-flops", draw: (x) => E(x, 226, 12, 4.5, "#7cc3e8", "#4f9cc7", 2.5) + L(`M${x - 8},226 L${x},217 L${x + 8},226`, "#4f9cc7", 2.5) },
  {
    name: "Ballet flats",
    draw: (x) => E(x, 223, 12, 6, "#f4a6b7", "#d97f95", 3) + C(x - 3, 217, 2.5, "#d97f95") + C(x + 3, 217, 2.5, "#d97f95") + C(x, 217, 1.6, "#fff"),
  },
  {
    name: "Cowboy boots",
    draw: (x) => `<rect x="${x - 11}" y="206" width="22" height="22" rx="5" fill="#c98e5f" stroke="#a56f41" stroke-width="3"/>` +
      L(`M${x - 11},214 Q${x},220 ${x + 11},214`, "#a56f41", 2),
  },
  {
    name: "Cleats",
    draw: (x) => `<rect x="${x - 12}" y="213" width="24" height="12" rx="6" fill="#6cc07a" stroke="#3f9a58" stroke-width="3"/>` +
      C(x - 6, 227, 2, "#3f9a58") + C(x, 227, 2, "#3f9a58") + C(x + 6, 227, 2, "#3f9a58"),
  },
  {
    name: "Fuzzy slippers",
    draw: (x) => E(x, 222, 13, 8, "#fff", "#e0d8c8", 3) + C(x - 6, 215, 3.5, "#f5efe2") + C(x, 213, 3.5, "#f5efe2") + C(x + 6, 215, 3.5, "#f5efe2"),
  },
  {
    name: "Clogs",
    draw: (x) => P(`M${x - 12},227 Q${x - 12},213 ${x},213 Q${x + 12},213 ${x + 12},227 Z`, "#f6a04d", "#d98129") +
      `<rect x="${x - 12}" y="224" width="24" height="5" rx="2.5" fill="#d98129"/>`,
  },
];
const leg = (x, sk) => `<rect x="${x}" y="196" width="11" height="22" rx="5" fill="${sk.f}" stroke="${sk.s}" stroke-width="3"/>`;

// category key → option list (single source of truth for editor, randomize, diff)
export const PARTS = {
  skin: SKINS, hair: HAIRS, hairColor: HAIR_COLORS, eyes: EYES, nose: NOSES,
  mouth: MOUTHS, expr: EXPRS, outfit: OUTFITS, outfitColor: OUTFIT_COLORS, shoes: SHOES,
};
const CFG_KEYS = Object.keys(PARTS);
export const DEFAULT_CFG = { skin: 1, hair: 1, hairColor: 1, eyes: 0, nose: 1, mouth: 0, expr: 1, outfit: 0, outfitColor: 0, shoes: 0 };
const clampCfg = (cfg) => {
  const out = {};
  for (const k of CFG_KEYS) {
    const n = PARTS[k].length, v = Math.trunc(Number(cfg?.[k]));
    out[k] = Number.isFinite(v) ? ((v % n) + n) % n : DEFAULT_CFG[k];
  }
  return out;
};

// ---------------- composer ----------------
export function composePersona(cfg, { cls = "islander" } = {}) {
  const c = clampCfg(cfg);
  const sk = SKINS[c.skin], hc = HAIR_COLORS[c.hairColor], oc = OUTFIT_COLORS[c.outfitColor];
  return `<svg class="${cls}" viewBox="0 0 200 240" aria-hidden="true">
  <ellipse cx="100" cy="230" rx="46" ry="7" fill="rgba(0,0,0,.12)"/>
  <g class="pbody">
    ${HAIRS[c.hair].back(hc)}
    ${leg(85, sk)}${leg(104, sk)}
    ${SHOES[c.shoes].draw(90.5)}${SHOES[c.shoes].draw(109.5)}
    ${OUTFITS[c.outfit].draw(oc, sk)}
    <circle cx="100" cy="86" r="52" fill="${sk.f}" stroke="${sk.s}" stroke-width="3.5"/>
    ${EYES[c.eyes].draw()}
    ${NOSES[c.nose].draw(sk)}
    ${MOUTHS[c.mouth].draw()}
    ${EXPRS[c.expr].draw(sk)}
    ${HAIRS[c.hair].front(hc)}
  </g></svg>`;
}
export function personaEl(cfg, opts) {
  const d = document.createElement("div");
  d.innerHTML = composePersona(cfg, opts);
  return d.firstElementChild;
}
export function mountIslander(cfg) { $("#islander").replaceChildren(personaEl(cfg)); }

// ---------------- storage & diff ----------------
const key = (pid) => `mci:persona:${pid}`;
export const loadPersona = (pid) => { try { return JSON.parse(localStorage.getItem(key(pid))); } catch { return null; } };
export const savePersona = (pid, p) => { try { localStorage.setItem(key(pid), JSON.stringify(p)); } catch { /* storage may be unavailable */ } };
/** Field-level appearance changes, oldest cfg first. Stored in the record as its own measure. */
export function personaDiff(a, b) {
  return CFG_KEYS.filter((k) => (a?.[k] ?? null) !== (b?.[k] ?? null))
    .map((k) => ({ field: k, from: a?.[k] ?? null, to: b?.[k] ?? null }));
}
export const randomCfg = () => Object.fromEntries(CFG_KEYS.map((k) => [k, Math.floor(Math.random() * PARTS[k].length)]));

// ---------------- editor (first-time creator / monthly vibe check) ----------------
const CATS = [
  ["skin", "Skin", "swatch"], ["hair", "Hair", "cycle"], ["hairColor", "Hair color", "swatch"],
  ["eyes", "Eyes", "cycle"], ["nose", "Nose", "cycle"], ["mouth", "Mouth", "cycle"],
  ["expr", "Expression", "cycle"], ["outfit", "Outfit", "cycle"], ["outfitColor", "Outfit color", "swatch"],
  ["shoes", "Shoes", "cycle"],
];
// After creation the look is fixed; only the monthly "vibe" (facial mood) can change.
const VIBE = ["eyes", "mouth", "expr"];

/**
 * Show the islander editor. First visit (no saved persona): full creator with a name field.
 * Return visits: "vibe check" — only eyes / mouth / expression are editable, nothing else.
 * onDone({ name, cfg, seconds }).
 */
export function openEditor({ saved, onDone }) {
  const first = !saved;
  const cfg = clampCfg(saved?.cfg ?? DEFAULT_CFG);
  const initialCfg = { ...cfg }; // last saved look (or the starting default) — for Reset
  const cats = first ? CATS : CATS.filter(([k]) => VIBE.includes(k));
  const editable = cats.map(([k]) => k);
  const t0 = performance.now();
  let finished = false;

  $("#creator-ribbon").textContent = first ? "Create your islander" : "This month's vibe";
  const body = $("#creator-body");
  const preview = h("div", { class: "creator-preview" });
  const syncs = [];
  const render = () => { preview.innerHTML = composePersona(cfg); syncs.forEach((f) => f()); };

  const nameInput = h("input", { id: "iname", maxlength: "20", placeholder: "e.g. Momo", autocomplete: "off" });
  const rows = cats.map(([k, label, type]) => {
    const opts = PARTS[k];
    let ctl;
    if (type === "swatch") {
      const btns = opts.map((o, i) => {
        const b = h("button", { class: "swatch", type: "button", style: `background:${o.f}`, "aria-label": `${label} ${i + 1}` });
        b.addEventListener("click", () => { cfg[k] = i; render(); });
        return b;
      });
      syncs.push(() => btns.forEach((b, i) => b.classList.toggle("sel", i === cfg[k])));
      ctl = h("div", { class: "swatches" }, btns);
    } else {
      const val = h("span", { class: "cyc-val" });
      const step = (d) => { cfg[k] = (cfg[k] + d + opts.length) % opts.length; render(); };
      syncs.push(() => { val.textContent = opts[cfg[k]].name; });
      ctl = h("div", { class: "cyc-row" },
        h("button", { class: "cyc", type: "button", "aria-label": `Previous ${label}`, onclick: () => step(-1) }, "◀"),
        val,
        h("button", { class: "cyc", type: "button", "aria-label": `Next ${label}`, onclick: () => step(1) }, "▶"));
    }
    return h("div", { class: "crow" }, h("span", { class: "crl" }, label), ctl);
  });

  const finish = () => {
    if (finished) return;
    const name = first ? nameInput.value.trim() : saved.name;
    if (first && !name) { nameInput.classList.add("err"); nameInput.focus(); return; }
    finished = true;
    $("#creator").hidden = true;
    window.__creatorConfirm = null;
    // return visits can only ever change the vibe fields, whatever happened to cfg
    const outCfg = first ? { ...cfg } : { ...clampCfg(saved.cfg), ...Object.fromEntries(VIBE.map((k) => [k, cfg[k]])) };
    onDone({ name, cfg: outCfg, seconds: (performance.now() - t0) / 1000 });
  };
  window.__creatorConfirm = finish; // test / accessibility hook (like window.__say)

  body.replaceChildren(
    h("p", { class: "sub" }, first
      ? "This is you in Lumi Town! Make yourself at home — your look is set here once, so take your time. You'll pick a fresh vibe each month."
      : `Here's ${saved.name}! How are they feeling this month? Set the vibe — eyes, mouth, expression. The rest of their look stays the same.`),
    h("div", { class: "creator-grid" },
      preview,
      h("div", { class: "creator-rows" },
        ...(first ? [h("label", { class: "crow name-row" }, h("span", { class: "crl" }, "Name"), nameInput)] : []),
        rows)),
    h("div", { class: "creator-actions" },
      h("div", { class: "chips" },
        h("button", {
          class: "chip", type: "button", // surprise only shuffles what's editable in this mode
          onclick: () => { const r = randomCfg(); for (const k of editable) cfg[k] = r[k]; render(); },
        }, "🎲 Surprise me"),
        h("button", {
          class: "chip", type: "button", title: first ? "Back to the starting look" : "Back to last month's saved vibe",
          onclick: () => { for (const k of editable) cfg[k] = initialCfg[k]; render(); },
        }, "↩ Reset")),
      h("button", { class: "send", type: "button", onclick: finish }, first ? "All set — into town!" : "That's the vibe — let's go!")));
  render();
  nameInput.addEventListener("input", () => nameInput.classList.remove("err"));
  $("#creator").hidden = false;
  if (first) nameInput.focus();
}
