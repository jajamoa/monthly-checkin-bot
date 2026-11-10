// Animal-Crossing-style dialog UI + voice-first answer widgets.
// Every question is answered by speaking (Web Speech API). Tapping / typing remain as fallbacks.

export const FAST = new URLSearchParams(location.search).has("fast");
export const $ = (s) => document.querySelector(s);
export const sleep = (ms) => new Promise((r) => setTimeout(r, FAST ? 0 : ms));
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
}

// =====================================================================
// Speech → data parsing
// =====================================================================
const UNITS = { zero: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

/** Extract numbers (digits or English words) with their token index. */
export function extractNumbers(txt) {
  const toks = txt.toLowerCase().replace(/(\d),(\d{3})/g, "$1$2").match(/\d+(?:\.\d+)?|[a-z']+/g) || [];
  const out = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    let v = null, span = 1;
    if (/^\d/.test(t)) v = parseFloat(t);
    else if (t in TENS) { v = TENS[t]; if (toks[i + 1] in UNITS && UNITS[toks[i + 1]] < 10 && UNITS[toks[i + 1]] > 0) { v += UNITS[toks[i + 1]]; span = 2; } }
    else if (t in UNITS) v = UNITS[t];
    else if (t === "hundred") v = 100;
    else if (t === "half") v = 0.5;
    if (v == null) continue;
    let j = i + span;
    if (toks[j] === "hundred" && v < 10) { v *= 100; j++; }
    if (toks[j] === "point" && toks[j + 1] != null && (/^\d$/.test(toks[j + 1]) || toks[j + 1] in UNITS)) { v += (/^\d$/.test(toks[j + 1]) ? +toks[j + 1] : UNITS[toks[j + 1]]) / 10; j += 2; }
    else if (toks[j] === "and" && toks[j + 1] === "a" && toks[j + 2] === "half") { v += 0.5; j += 3; }
    else if (toks[j] === "and" && toks[j + 1] === "half") { v += 0.5; j += 2; }
    out.push({ value: v, idx: i });
    i = j - 1;
  }
  return out;
}
export const parseNumber = (txt) => { const n = extractNumbers(txt)[0]; return n ? n.value : null; };

const STOP = new Set("a an the of to in on at for and or is it i my me we be do you your that this one with about"
  .split(" ").concat(["out", "notable", "event", "situation", "living", "i'm", "it's", "um", "uh", "like", "would", "say", "choose", "pick", "go", "take", "answer", "think", "maybe", "probably"]));
const SYN = { yeah: "yes", yep: "yes", yup: "yes", correct: "yes", nope: "no", nah: "no", later: "days", wait: "days", future: "days", sooner: "today", now: "today",
  chance: "gamble", risk: "gamble", risky: "gamble", sure: "sure", certain: "sure", safe: "sure" };
const stem = (w) => w.replace(/(ing|s)$/, "");
const norm = (s) => s.toLowerCase().replace(/[“”"]/g, "").replace(/not sure|don'?t know|no idea/g, "unsure").replace(/[^a-z0-9$%.' ]+/g, " ");
const tokensOf = (s) => (norm(s).match(/[a-z']+/g) || []);
const ORD = { first: 0, second: 1, third: 2, fourth: 3, fifth: 4, sixth: 5, seventh: 6, "1st": 0, "2nd": 1, "3rd": 2, last: -1 };

/** Map a spoken phrase to one of `options` ({label,value}). Returns the option, or null when unsure. */
export function matchOption(txt, options) {
  const t = norm(txt);
  const nums = extractNumbers(txt).map((n) => n.value);
  const labelNum = (o) => (/^\d+$/.test(o.label.trim()) ? +o.label : null);

  // 1. numeric ladder ("seven")
  if (nums.length && options.every((o) => labelNum(o) != null)) {
    const m = options.filter((o) => labelNum(o) === nums[0]);
    if (m.length === 1) return m[0];
  }
  // 2. dollar amounts / digits quoted inside labels ("seven hundred" → "$700 in 30 days")
  if (nums.length) {
    const m = options.filter((o) => (o.label.replace(/,/g, "").match(/\d+(?:\.\d+)?/g) || []).some((d) => nums.includes(+d)));
    if (m.length === 1) return m[0];
  }
  // 3. whole-label match (word boundaries so "agree" ≠ "disagree"); longest wins ("very often" > "often")
  const scored = options.map((o) => {
    const lab = norm(o.label).trim().replace(/[$\d,]+/g, "").trim();
    if (lab && new RegExp(`\\b${lab.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(t)) return { o, s: 2 + lab.length / 100 };
    const lt = tokensOf(o.label).filter((w) => !STOP.has(w));
    const have = new Set(tokensOf(txt).flatMap((w) => [w, SYN[w]].filter(Boolean)));
    const hit = lt.filter((w) => have.has(w)).length;
    return { o, s: lt.length ? hit / lt.length + hit * 0.01 : 0 };
  }).sort((a, b) => b.s - a.s);
  const contained = scored.filter((x) => x.s >= 2);
  if (contained.length > 1) { // several whole labels heard: ok only if shorter ones are parts of the longest ("often" ⊂ "very often")
    const top = norm(contained[0].o.label).trim();
    if (contained.slice(1).some((x) => !top.includes(norm(x.o.label).trim()))) return null;
  }
  if (scored[0].s > 0 && (!scored[1] || scored[0].s - scored[1].s > 0.001)) return scored[0].o;

  // 4. ordinals ("the second one", "option three")
  const w = tokensOf(txt);
  for (const x of w) if (x in ORD) return options.at(ORD[x]);
  const ordIdx = /\b(option|number|choice|answer)\b/.test(t) && nums.length ? nums[0] - 1 : null;
  if (ordIdx != null && options[ordIdx]) return options[ordIdx];
  return null;
}

/** Multi-select: which options were mentioned? Empty array for "nothing / none". */
export function matchMulti(txt, options) {
  const have = new Set(tokensOf(txt).map(stem));
  const hit = options.filter((o) => tokensOf(o.label).filter((w) => !STOP.has(w)).some((w) => have.has(stem(w))));
  return hit;
}
export const saidNothing = (txt) => /\b(nothing|none|nope|nah|no|neither|nothing else)\b/i.test(txt);

const ALLOC_KW = {
  Save: ["save", "saving", "savings"], Essentials: ["essentials", "essential", "bills", "necessities", "needs"],
  Treats: ["treats", "treat", "fun", "myself"], "Give to others": ["give", "giving", "others", "donate", "gift", "charity"],
  Invest: ["invest", "investing", "investment"], Rest: ["rest", "sleep", "relax", "relaxing"],
  Socializing: ["socializing", "social", "friends", "socialize"], "Work / study": ["work", "study", "working", "studying"],
  Exercise: ["exercise", "workout", "gym", "exercising"], Entertainment: ["entertainment", "games", "movies", "tv", "fun"],
};
/** "save forty, essentials thirty, treats ten…" → {Save:40, ...}. Each number goes to the nearest category word. */
export function parseAlloc(txt, labels) {
  const toks = txt.toLowerCase().replace(/(\d),(\d{3})/g, "$1$2").match(/\d+(?:\.\d+)?|[a-z']+/g) || [];
  const kws = [];
  toks.forEach((w, i) => labels.forEach((l) => { if ((ALLOC_KW[l] || [l.toLowerCase()]).includes(w)) kws.push({ l, i }); }));
  const res = {};
  for (const n of extractNumbers(txt)) {
    let best = null;
    for (const k of kws) {
      const d = Math.abs(k.i - n.idx) + (k.i > n.idx ? 0.5 : 0); // slight preference for "category, number"
      if (!best || d < best.d) best = { l: k.l, d };
    }
    if (best && best.d <= 4 && res[best.l] == null) res[best.l] = n.value;
  }
  return res;
}

// =====================================================================
// Scene: character, dialog, log, sound
// =====================================================================
let pendingAck = false, muted = false, audioCtx = null, skip = false, typing = false;
const logItems = [];

export function initScene() {
  const tpl = $("#lumi-svg");
  $("#lumi").append(tpl.content.cloneNode(true));
  $("#btn-sound").addEventListener("click", () => { muted = !muted; $("#btn-sound").textContent = muted ? "🔇" : "🔊"; });
  $("#btn-log").addEventListener("click", () => { $("#log").hidden = !$("#log").hidden; renderLog(); });
  $("#log-close").addEventListener("click", () => ($("#log").hidden = true));
  $("#lumi").addEventListener("click", () => { const s = $("#stage"); s.classList.remove("hop"); void s.offsetWidth; s.classList.add("hop"); blip(true); });
  $("#dialog").addEventListener("click", () => { if (typing) skip = true; });
}
export function mountSetupLumi() { $("#setup-lumi").append($("#lumi-svg").content.cloneNode(true)); }
export function waveHello() { const s = $("#stage"); s.classList.add("wave"); setTimeout(() => s.classList.remove("wave"), 1800); }

function blip(high = false) {
  if (muted || FAST) return;
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = "triangle"; o.frequency.value = (high ? 620 : 300) + Math.random() * 160;
    g.gain.setValueAtTime(0.045, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.07);
    o.connect(g).connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 0.08);
  } catch { /* audio unavailable */ }
}

function logPush(who, html, tag) {
  logItems.push({ who, html, tag });
  if (!$("#log").hidden) renderLog();
}
function renderLog() {
  const list = $("#log-list");
  list.replaceChildren(...logItems.map((m) => h("div", { class: "m " + (m.who === "u" ? "u" : "") },
    h("b", {}, m.who === "u" ? "You" : "Lumi" + (m.tag ? " · " + m.tag : "")), h("span", { html: m.html }))));
  list.scrollTop = list.scrollHeight;
}

function waitTap() {
  return new Promise((res) => {
    if (FAST) return res();
    const done = () => { $("#dialog").removeEventListener("click", done); document.removeEventListener("keydown", key); res(); };
    const key = (e) => { if (["Enter", " ", "ArrowRight"].includes(e.key) && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName)) { e.preventDefault(); done(); } };
    setTimeout(() => { $("#dialog").addEventListener("click", done); document.addEventListener("keydown", key); }, 120);
  });
}
function typeText(el, str) {
  return new Promise((res) => {
    let i = 0; skip = false; typing = true; $("#stage").classList.add("talking");
    const step = () => {
      if (skip || FAST || i >= str.length) {
        el.textContent = str; typing = false; $("#stage").classList.remove("talking"); return res();
      }
      i++; el.textContent = str.slice(0, i);
      if (i % 2 === 0 && /\S/.test(str[i - 1])) blip();
      $("#dialog").scrollTop = $("#dialog").scrollHeight;
      setTimeout(step, 17);
    };
    step();
  });
}

export async function bot(content, { html = false, tag = null, stem: stemTxt = null, cls = "" } = {}) {
  if (pendingAck) { $("#dlg-next").hidden = false; await waitTap(); $("#dlg-next").hidden = true; }
  pendingAck = false;
  $("#dialog").className = "dialog " + cls;
  const tagEl = $("#dlg-tag"), stemEl = $("#dlg-stem"), text = $("#dlg-text");
  tagEl.hidden = !tag; tagEl.textContent = tag || "";
  stemEl.hidden = !stemTxt; stemEl.textContent = stemTxt || "";
  text.className = "dlg-text" + (html ? " html" : ""); text.textContent = "";
  $("#dialog").scrollTop = 0;
  if (html) text.innerHTML = content; else await typeText(text, content);
  pendingAck = true;
  logPush("b", html ? content : esc(content), tag);
  return text;
}

let youTimer;
export function user(text) {
  logPush("u", esc(text));
  const y = $("#you"); y.hidden = false; y.classList.remove("out"); y.textContent = text;
  clearTimeout(youTimer); youTimer = setTimeout(() => y.classList.add("out"), 3200);
}

// =====================================================================
// Voice bar (shared by every widget)
// =====================================================================
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let activeSay = null, currentBar = null;
export let lastSpoken = "";
window.__say = (t) => activeSay && activeSay(t); // test / accessibility hook: injects a "spoken" answer

function voiceBar({ hint = "", continuous = false, silenceMs = 1300, onHeard }) {
  let rec = null, dead = false, listening = false, delivered = false, manualStop = false, retries = 0, finalText = "", interim = "", timer = null, cancelConfirm = null;
  const mic = h("button", { class: "mic", type: "button", "aria-label": "Microphone" }, "🎤");
  const status = h("div", { class: "vstatus" }), live = h("div", { class: "vlive" });
  const typeInput = h("input", { type: "text", placeholder: "Type your answer", autocomplete: "off" });
  const typeRow = h("div", { class: "vtyperow", hidden: true }, typeInput, h("button", { class: "chip", type: "button", onclick: () => submitTyped() }, "Send"));
  const typeLink = h("button", { class: "vtype", type: "button", onclick: () => { typeRow.hidden = !typeRow.hidden; typeInput.focus(); } }, "⌨ type instead");
  const el = h("div", { class: "vbar" }, h("div", { class: "vrow" }, mic, h("div", { class: "vtext" }, status, live)), hint && h("div", { class: "vhint" }, hint), typeRow, typeLink);
  const setStatus = (t, cls = "") => { status.textContent = t; status.className = "vstatus " + cls; };

  function deliver(txt) {
    txt = txt.trim();
    if (!txt || delivered || dead) return;
    delivered = true; listening = false; el.classList.remove("on"); clearTimeout(timer);
    lastSpoken = txt;
    setStatus("Heard you ✓", "ok"); live.textContent = `“${txt}”`;
    onHeard(txt, api);
  }
  function submitTyped() { const v = typeInput.value.trim(); if (v) { delivered = false; deliver(v); typeInput.value = ""; } }
  typeInput.addEventListener("keydown", (e) => e.key === "Enter" && submitTyped());

  function start() {
    if (dead || listening) return;
    cancelConfirm?.(); cancelConfirm = null;
    delivered = false; manualStop = false; finalText = ""; interim = "";
    if (!SR) { typeRow.hidden = false; setStatus("Voice isn't supported in this browser, so please type (Chrome, Edge or Safari work best)."); return; }
    try { rec = new SR(); } catch { typeRow.hidden = false; return; }
    rec.lang = "en-US"; rec.interimResults = true; rec.continuous = continuous; rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      let f = "", i = "";
      for (const r of e.results) (r.isFinal ? (f += r[0].transcript + " ") : (i += r[0].transcript));
      finalText = f; interim = i; live.textContent = (f + i).trim();
      clearTimeout(timer); timer = setTimeout(() => { try { rec.stop(); } catch {} }, silenceMs);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") { manualStop = true; typeRow.hidden = false; setStatus("Microphone is blocked. Allow it in your browser, or type instead.", "warn"); }
    };
    rec.onend = () => {
      listening = false; el.classList.remove("on"); clearTimeout(timer);
      const txt = (finalText + " " + interim).trim();
      if (dead || delivered) return;
      if (txt) deliver(txt);
      else if (!manualStop && retries++ < 2) start();
      else setStatus("Tap the mic and speak");
    };
    try { rec.start(); listening = true; el.classList.add("on"); setStatus("Listening… answer in your own words"); live.textContent = ""; }
    catch { setStatus("Tap the mic and speak"); }
  }
  mic.addEventListener("click", () => {
    if (listening) { manualStop = true; try { rec.stop(); } catch {} } else { retries = 0; start(); }
  });

  const api = {
    el, start,
    retry(msg) { setStatus(msg, "warn"); delivered = false; retries = 0; setTimeout(start, FAST ? 0 : 500); },
    note(msg, cls = "") { setStatus(msg, cls); },
    /** Show a short "locking in" countdown the user can interrupt with the Change button. */
    confirmIn(ms, label, fn) {
      cancelConfirm?.();
      let t;
      const btn = h("button", { class: "chip", type: "button" }, "Change");
      const cancel = () => { clearTimeout(t); btn.remove(); cancelConfirm = null; };
      btn.addEventListener("click", () => { cancel(); setStatus("Okay, say it again"); start(); });
      live.append(" ", btn); setStatus(label, "ok");
      cancelConfirm = cancel;
      t = setTimeout(() => { cancel(); fn(); }, FAST ? 0 : ms);
      return cancel;
    },
    cancelConfirm() { cancelConfirm?.(); },
    destroy() { dead = true; clearTimeout(timer); cancelConfirm?.(); try { rec?.abort(); } catch {} if (activeSay === say) activeSay = null; },
  };
  const say = (t) => { delivered = false; listening = false; deliver(t); };
  activeSay = say;
  setTimeout(start, 80);
  return api;
}

function dock(bar, ...nodes) {
  currentBar?.destroy();
  currentBar = bar;
  pendingAck = false;
  $("#dock").replaceChildren(h("div", { class: "dock-inner" }, bar.el, ...nodes));
}
export function clearDock() { currentBar?.destroy(); currentBar = null; $("#dock").replaceChildren(); }

// =====================================================================
// Answer widgets (voice-first, tap/type fallback)
// =====================================================================
export function askText({ placeholder = "Your answer will appear here…", chips = [], min = 2 } = {}) {
  return new Promise((res) => {
    const ta = h("textarea", { rows: 2, placeholder });
    const finish = (v, label) => { clearDock(); user(label ?? v); res(v); };
    const chipOpts = chips.map((c) => ({ label: c.label, value: c.value }));
    const bar = voiceBar({
      hint: "Speak freely: pause when you're done and I'll send it. You can edit the text first.",
      continuous: true, silenceMs: 2200,
      onHeard: (txt, b) => {
        const chip = chipOpts.length && txt.split(/\s+/).length <= 6 ? matchOption(txt, chipOpts) : null;
        if (chip && norm(txt).includes(norm(chip.label).slice(0, 8))) return b.confirmIn(1500, `“${chip.label}”`, () => finish(chip.value, chip.label));
        ta.value = txt;
        if (txt.length < min) return b.retry("That was a bit short. Could you say a little more?");
        b.confirmIn(2600, "Sending…", () => finish(txt));
      },
    });
    ta.addEventListener("input", () => { bar.cancelConfirm(); });
    dock(bar, ta, h("div", { class: "dock-actions" },
      h("div", { class: "chips" }, chips.map((c) => h("button", { class: "chip", type: "button", onclick: () => finish(c.value, c.label) }, c.label))),
      h("button", { class: "send", type: "button", onclick: () => ta.value.trim() && finish(ta.value.trim()) }, "Send")));
  });
}

export function askChoice(options, { cls = "col", anchors = null } = {}) {
  return new Promise((res) => {
    let bar;
    const pick = (o, said) => { lastSpoken = said || ""; clearDock(); user(said && said.toLowerCase() !== o.label.toLowerCase() ? `${o.label}  (“${said}”)` : o.label); res(o.value); };
    const wrap = h("div", { class: "opts " + cls }, options.map((o) => h("button", { class: "opt", type: "button", onclick: () => pick(o, "") }, o.label)));
    bar = voiceBar({
      hint: `You can say it your own way, like “${options[Math.min(1, options.length - 1)].label}”.`,
      silenceMs: 1100,
      onHeard: (txt, b) => {
        const m = matchOption(txt, options);
        if (!m) return b.retry(`I heard “${txt}”, but I'm not sure which option that is. Say it again, or tap one.`);
        [...wrap.children].forEach((c, i) => c.classList.toggle("sel", options[i] === m));
        setTimeout(() => pick(m, txt), FAST ? 0 : 450);
      },
    });
    dock(bar, wrap, anchors && h("div", { class: "anchors" }, h("span", {}, anchors[0]), h("span", {}, anchors[1])));
  });
}

export function askMulti(options, { exact = null, min = 0, label = "Done" } = {}) {
  return new Promise((res) => {
    const sel = new Set();
    const btn = h("button", { class: "send", type: "button" }, label);
    const buttons = options.map((o) => {
      const b = h("button", { class: "opt", type: "button", style: "flex:0 0 auto" }, o.label);
      b.addEventListener("click", () => toggle(o, b));
      return b;
    });
    const sync = () => { btn.disabled = exact ? sel.size !== exact : sel.size < min; };
    const toggle = (o, b, force) => {
      const on = force ?? !sel.has(o.value);
      if (on && exact && sel.size >= exact && !sel.has(o.value)) return;
      on ? sel.add(o.value) : sel.delete(o.value); b.classList.toggle("sel", on); sync();
    };
    const finish = () => {
      const vals = options.filter((o) => sel.has(o.value));
      clearDock(); user(vals.length ? vals.map((o) => o.label).join(", ") : "Nothing else"); res(vals.map((o) => o.value));
    };
    btn.addEventListener("click", finish);
    const bar = voiceBar({
      hint: exact ? `Say ${exact} of these, like “${options[0].label}, ${options[2].label} and ${options[4].label}”.` : "Say any that apply, or “nothing else”.",
      continuous: true, silenceMs: 1800,
      onHeard: (txt, b) => {
        const hit = matchMulti(txt, options);
        if (!hit.length && saidNothing(txt) && !exact) return b.confirmIn(1500, "Nothing else", finish);
        if (!hit.length) return b.retry(`I heard “${txt}”. Which of these did you mean?`);
        options.forEach((o, i) => toggle(o, buttons[i], hit.includes(o)));
        if (exact && sel.size < exact) return b.retry(`I got ${sel.size}. Please name ${exact} in total.`);
        if (exact && hit.length > exact) { return b.retry(`That's ${hit.length}. Pick exactly ${exact}.`); }
        b.confirmIn(2200, "Locking in…", finish);
      },
    });
    sync();
    dock(bar, h("div", { class: "opts" }, buttons), h("div", { class: "dock-actions" }, h("span", { class: "hint" }, exact ? `Pick ${exact}` : ""), btn));
  });
}

export function askNumber({ prefix = "", suffix = "", placeholder = "", min = 0, max = 100000 } = {}) {
  return new Promise((res) => {
    const input = h("input", { type: "number", min, max, step: "any", placeholder, inputmode: "decimal" });
    const send = h("button", { class: "send", type: "button", disabled: true }, "Send");
    const finish = (v) => { clearDock(); user(`${prefix}${v}${suffix}`); res(v); };
    const bar = voiceBar({
      hint: "Just say the number, like “thirty-five”.", silenceMs: 1300,
      onHeard: (txt, b) => {
        const v = parseNumber(txt);
        if (v == null || v < min || v > max) return b.retry(`I heard “${txt}”. Could you say a number between ${min} and ${max}?`);
        input.value = v; send.disabled = false;
        b.confirmIn(1800, `${prefix}${v}${suffix}?`, () => finish(v));
      },
    });
    input.addEventListener("input", () => { bar.cancelConfirm(); const v = parseFloat(input.value); send.disabled = isNaN(v) || v < min || v > max; });
    send.addEventListener("click", () => finish(parseFloat(input.value)));
    dock(bar, h("div", { class: "num-row" }, prefix && h("span", { class: "affix" }, prefix), input, suffix && h("span", { class: "affix" }, suffix), send));
  });
}

export function askSlider({ min = 0, max = 100, step = 1, init = 50, unit = "%" } = {}) {
  return new Promise((res) => {
    const out = h("div", { class: "slider-big" }, "—");
    const r = h("input", { type: "range", min, max, step, value: init });
    const send = h("button", { class: "send", type: "button", disabled: true }, "Confirm");
    const finish = () => { clearDock(); user(r.value + unit); res(Number(r.value)); };
    const set = (v) => { r.value = v; out.textContent = r.value + unit; send.disabled = false; };
    const bar = voiceBar({
      hint: "Say a percentage like “seventy”, or “definitely” / “no way”.", silenceMs: 1300,
      onHeard: (txt, b) => {
        let v = parseNumber(txt);
        if (v == null) v = /\b(definitely|absolutely|for sure|of course)\b/i.test(txt) ? 100 : /\b(no way|never|not at all|absolutely not)\b/i.test(txt) ? 0 : /\b(fifty[- ]fifty|maybe|toss ?up)\b/i.test(txt) ? 50 : null;
        if (v == null || v < min || v > max) return b.retry(`I heard “${txt}”. How likely, from ${min} to ${max} percent?`);
        set(Math.round(v / step) * step);
        b.confirmIn(1800, `${r.value}${unit}?`, finish);
      },
    });
    r.addEventListener("input", () => { bar.cancelConfirm(); set(r.value); });
    send.addEventListener("click", finish);
    dock(bar, out, r, h("div", { class: "anchors" }, h("span", {}, min + unit), h("span", {}, max + unit)),
      h("div", { class: "dock-actions", style: "justify-content:flex-end" }, send));
  });
}

export function askAlloc({ labels, total, step, unit, show }) {
  return new Promise((res) => {
    const vals = Object.fromEntries(labels.map((l) => [l, 0]));
    const sum = () => +Object.values(vals).reduce((a, b) => a + b, 0).toFixed(2);
    const foot = h("span", {});
    const btn = h("button", { class: "send", type: "button", disabled: true }, "Confirm");
    const outs = {}, ranges = {};
    const refresh = () => {
      for (const l of labels) { outs[l].textContent = show(vals[l]); ranges[l].value = vals[l]; }
      const rem = +(total - sum()).toFixed(2);
      foot.textContent = rem === 0 ? "All allocated ✓" : `Left to allocate: ${unit === "%" ? rem + "%" : rem + " h"}`;
      btn.disabled = rem !== 0;
    };
    const finish = () => { clearDock(); user(labels.map((l) => `${l} ${show(vals[l])}`).join(" · ")); res({ ...vals }); };
    const eg = unit === "%" ? `“${labels[0]} forty, ${labels[1]} thirty, ${labels[2]} twenty, ${labels[3]} ten”` : `“${labels[0]} two, ${labels[1]} one and a half, ${labels[2]} two, ${labels[3]} half an hour”`;
    const bar = voiceBar({
      hint: `Say your split, like ${eg}.`, continuous: true, silenceMs: 2400,
      onHeard: (txt, b) => {
        const p = parseAlloc(txt, labels);
        if (!Object.keys(p).length) return b.retry(`I heard “${txt}”. Please name each category with an amount.`);
        for (const l of labels) vals[l] = Math.max(0, Math.min(total, Math.round((p[l] ?? 0) / step) * step));
        refresh();
        if (sum() === total) b.confirmIn(3200, "Looks complete. Locking in…", finish);
        else b.retry(`That adds up to ${sum()}${unit === "%" ? "%" : " h"} of ${total}${unit === "%" ? "%" : " h"}. Say the whole split again, or drag the sliders.`);
      },
    });
    const rows = labels.map((l) => {
      const r = h("input", { type: "range", min: 0, max: total, step, value: 0 });
      outs[l] = h("output", {}); ranges[l] = r;
      r.addEventListener("input", () => {
        bar.cancelConfirm();
        const others = sum() - vals[l];
        vals[l] = Math.min(Number(r.value), +(total - others).toFixed(2)); refresh();
      });
      return h("div", { class: "alloc-row" }, h("span", {}, l), r, outs[l]);
    });
    btn.addEventListener("click", finish);
    refresh();
    dock(bar, ...rows, h("div", { class: "alloc-foot" }, foot, btn));
  });
}

// =====================================================================
// Progress
// =====================================================================
const BLOCKS = ["Recap", "A · Core", "B · Adaptive", "C · Choices", "D · What-ifs", "Close"];
export function buildProgress() {
  $("#progress").replaceChildren(...BLOCKS.map((b) => h("div", { class: "seg" }, h("div", { class: "bar" }, h("i")), h("span", {}, b))));
}
export function prog(block, frac = 0) {
  [...$("#progress").children].forEach((seg, i) => {
    seg.classList.toggle("on", i === block);
    seg.querySelector("i").style.width = (i < block ? 100 : i === block ? Math.round(frac * 100) : 0) + "%";
  });
}
