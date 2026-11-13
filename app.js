import {
  VERSION, DOMAINS, tagDomain, CORE_SCALES, scoreScale, MODULES, pickModules,
  SHOCKS, EXPENSES, WINDFALL_CATS, TIME_CATS, CONTEXTUAL_TASK, SUPPORT, CRISIS_RX, TOWN,
  BUBBLES, BUBBLE_DOMAIN, RECAP_REJECT_RX, RECAP_NUDGE,
} from "./content.js";
import {
  $, h, esc, sleep, bot, user, askText, askChoice, askMulti, askNumber, askSlider, askAlloc,
  initScene, mountSetupLumi, waveHello, bubbleBoard,
} from "./ui.js";
import { loadPersona, savePersona, personaDiff, personaEl, mountIslander, openEditor } from "./persona.js";
import { buildTown, prog, setBlockLocation, makePostcard, downloadPostcardPNG, saveAlbumEntry } from "./town.js";

const fmt$ = (n) => "$" + Math.round(n).toLocaleString("en-US");
// seeded RNG so jitter is stable per participant-month
function rng(seedStr) {
  let a = 0;
  for (const c of seedStr) a = (Math.imul(a ^ c.charCodeAt(0), 2654435761) + 0x9e3779b9) | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const nice = (x) => {
  const step = x < 100 ? 5 : x < 1000 ? 10 : x < 5000 ? 50 : 100;
  return Math.max(step, Math.round(x / step) * step);
};

// ---------------- history (localStorage) ----------------
const histKey = (pid) => `mci:history:${pid}`;
const loadHistory = (pid) => { try { return JSON.parse(localStorage.getItem(histKey(pid)) || "[]"); } catch { return []; } };
// The check-in # counts actual sittings: it advances every time an interview BEGINS, so an
// abandoned run doesn't greet the participant with "check-in #1" forever. Completed records
// keep their own month numbers; summaries compare against the last completed one.
const seqKey = (pid) => `mci:seq:${pid}`;
const lastSeq = (pid) => {
  try { return Math.max(parseInt(localStorage.getItem(seqKey(pid)), 10) || 0, loadHistory(pid).length); }
  catch { return loadHistory(pid).length; }
};
const beginMonth = (pid) => {
  const m = lastSeq(pid) + 1;
  try { localStorage.setItem(seqKey(pid), String(m)); } catch { /* storage may be unavailable */ }
  return m;
};
const saveRecord = (rec) => {
  try {
    const hist = loadHistory(rec.participant_id);
    hist.push(rec);
    localStorage.setItem(histKey(rec.participant_id), JSON.stringify(hist));
  } catch { /* storage may be unavailable */ }
};


// ---------------- scale runner ----------------
async function runScale(scale, store, blockIdx, baseFrac, spanFrac, { skip = () => false } = {}) {
  const items = scale.items.filter((it) => !skip(it));
  let n = 0;
  for (const it of items) {
    const options = it.options || scale.options;
    const isLadder = options.length > 6;
    const b = await bot(it.text, {
      tag: items.length > 1 ? `${scale.name} · ${++n} of ${items.length}` : scale.name,
      stem: scale.stem || null,
    });
    store[it.id] = await askChoice(options.map((o) => ({ label: o.label, value: o.value })),
      { cls: isLadder ? "ladder" : options.length > 5 ? "col" : "scale", anchors: scale.anchors });
    prog(blockIdx, baseFrac + spanFrac * (n / items.length));
  }
}

// ---------------- recap: the persona's thought bubbles ----------------
// One kept response per bubble (retakes allowed; "Others" optional). No "nothing changed"
// shortcut exists: bare "nothing / same" answers are nudged and re-asked.
async function askBubble(st, b) {
  const prev = st.recap_bubbles[b.id];
  let retakes = prev ? prev.retakes + 1 : 0; // re-opening a kept bubble counts as a retake
  await bot(b.prompt, { tag: `${st.persona.name}'s thoughts · ${b.label}` });
  while (true) {
    const text = (await askText({ placeholder: "Tell me in your own words…" })).trim();
    if (text.length < 5 || RECAP_REJECT_RX.test(text)) {
      await bot(RECAP_NUDGE, { tag: b.label });
      continue;
    }
    await bot(`Here's what I got:\n“${text}”`, { tag: b.label });
    const keep = await askChoice([{ label: "✓ Keep it", value: true }, { label: "🔁 Say it again", value: false }], { cls: "scale" });
    if (keep) { st.recap_bubbles[b.id] = { text, retakes }; return; }
    retakes++;
    await bot("No problem — go ahead, say it again.", { tag: b.label });
  }
}

async function recap(st) {
  prog(0, 0);
  await bot(`${TOWN.lines.porch(st.persona.name)} Thanks for taking the time. This is check-in #${st.month}. It takes about 15 minutes, and I'll ask the same core questions each month so we can see how things shift. Everything here is voice-first: when you see the mic light up, just talk to me in your own words.`);
  await bot(`${st.persona.name} has a few things on their mind — tap each thought bubble and tell me about that part of your month, in your own words. Every thought needs a real answer (ordinary is fine!); “Others” is optional.`, { tag: "Thoughts" });
  st.recap_bubbles = {};
  const done = new Set();
  const required = BUBBLES.filter((b) => !b.optional).length;
  while (true) {
    const pick = await bubbleBoard({ items: BUBBLES, done });
    if (pick === "__continue") break;
    const b = BUBBLES.find((x) => x.id === pick);
    await askBubble(st, b);
    done.add(b.id);
    prog(0, 0.8 * (Math.min(done.size, required) / required));
  }
  st.recap_text = BUBBLES.map((b) => st.recap_bubbles[b.id]?.text).filter(Boolean).join("\n");

  // each kept thought becomes an event for the adaptive (B) and what-if (D) blocks
  st.events = BUBBLES.filter((b) => st.recap_bubbles[b.id]).map((b) => ({
    text: st.recap_bubbles[b.id].text,
    domain: BUBBLE_DOMAIN[b.id] || tagDomain(st.recap_bubbles[b.id].text),
    topic: b.id, source: "bubble",
  }));
  let n = 0;
  for (const e of st.events) {
    await bot(`“${e.text}”\nIs this a concrete change from how things were before (e.g., new job, a move), rather than business as usual?`, { tag: `${BUBBLES.find((b) => b.id === e.topic).label} · event` });
    e.factual = await askChoice([{ label: "Yes, something actually changed", value: true }, { label: "No, more of the same", value: false }], { cls: "scale" });
    prog(0, 0.8 + 0.2 * (++n / st.events.length));
  }
  prog(0, 1);
  await bot(`Got it. Here's what I noted:<ul>${st.events.map((e) => `<li>${esc(e.text)} <em>(${esc(DOMAINS[e.domain])}${e.factual ? ", changed" : ""})</em></li>`).join("")}</ul>`, { html: true });
}

// Open-ended spoken probe (stored verbatim, to be coded later)
async function openEnded(st, key, prompt) {
  await bot(prompt, { tag: "In your own words" });
  const text = await askText({ placeholder: "Your words appear here…", chips: [{ label: "Nothing to add", value: "" }] });
  (st.open_ended ||= []).push({ key, prompt, text });
}

// ---------------- Block A ----------------
async function blockA(st) {
  prog(1, 0);
  await bot(`${TOWN.lines.cabin(st.persona.name)} They're the same every month, so please answer based on how things have been recently.`, { tag: "Block A · Core scales" });
  st.scales = {};
  for (let i = 0; i < CORE_SCALES.length; i++) {
    const sc = CORE_SCALES[i];
    const a = {};
    await runScale(sc, a, 1, i / CORE_SCALES.length, 1 / CORE_SCALES.length);
    st.scales[sc.id] = { answers: a, score: scoreScale(sc, a) };
  }
  prog(1, 1);
  await openEnded(st, "after_core_scales", "Thanks! Before we move on: in your own words, what has been behind how you've been feeling this past month?");
}

// ---------------- Block B ----------------
async function blockB(st) {
  prog(2, 0);
  const mods = pickModules(st.events, st.month);
  st.adaptive = {};
  // town stop mirrors the module TOPIC (already chosen from event text), never severity
  const loc = TOWN.moduleLoc[mods[0].id] || "friends";
  setBlockLocation(2, loc);
  await bot(`${TOWN.lines[loc](st.persona.name)} ` + (mods[0].why
    ? "Based on what you told me, a couple of follow-up sets of questions — these are short."
    : "A short extra set of questions for this month."), { tag: "Block B · Adaptive" });
  for (let i = 0; i < mods.length; i++) {
    const m = MODULES[mods[i].id];
    let ongoing = true;
    if (mods[i].id === "relationship") {
      await bot("Is the relationship you mentioned currently ongoing?");
      ongoing = await askChoice([{ label: "Yes", value: true }, { label: "No", value: false }], { cls: "scale" });
    }
    const a = {};
    await runScale(m, a, 2, i / mods.length, 1 / mods.length, { skip: (it) => it.onlyIfOngoing && !ongoing });
    st.adaptive[mods[i].id] = { triggered_by: mods[i].why, answers: a };
  }
  prog(2, 1);
}

// ---------------- Block C tasks ----------------
// Each task takes an effective monthly income, optional framing prefix, and returns a result object.
const T = {
  async timePref(st, inc, pre, tag) {
    const N = nice(inc * 0.12 * st.jit.timePref);
    let lo = N, hi = N * 2; const steps = [];
    for (let i = 0; i < 3; i++) {
      const X = nice((lo + hi) / 2);
      await bot(i === 0 ? `${pre}Would you rather have ${fmt$(N)} today or ${fmt$(X)} in 30 days?` : `${pre}Same choice, with a different later amount: ${fmt$(N)} today, or ${fmt$(X)} in 30 days?`, { tag: `${tag} · ${i + 1} of 3` });
      const c = await askChoice([{ label: `${fmt$(N)} today`, value: "now" }, { label: `${fmt$(X)} in 30 days`, value: "later" }], { cls: "scale" });
      steps.push({ now: N, later: X, choice: c });
      if (c === "later") hi = X; else lo = X;
    }
    const x = (lo + hi) / 2;
    return { now: N, indifference_later: x, implied_monthly_rate: +(x / N - 1).toFixed(3), steps, value: x };
  },
  async risk(st, inc, pre, tag) {
    const S = nice(inc * 0.09 * st.jit.risk);
    let lo = S, hi = S * 4; const steps = [];
    for (let i = 0; i < 3; i++) {
      const X = nice((lo + hi) / 2);
      await bot(i === 0 ? `${pre}${fmt$(S)} for sure, or a 50/50 chance at ${fmt$(X)} or $0?` : `${pre}Same choice, new prize: ${fmt$(S)} for sure, or a 50/50 chance at ${fmt$(X)} or $0?`, { tag: `${tag} · ${i + 1} of 3` });
      const c = await askChoice([{ label: `Take the sure ${fmt$(S)}`, value: "sure" }, { label: `Gamble: 50/50 for ${fmt$(X)} or $0`, value: "gamble" }], { cls: "scale" });
      steps.push({ sure: S, prize: X, choice: c });
      if (c === "gamble") hi = X; else lo = X;
    }
    const x = (lo + hi) / 2;
    return { sure: S, indifference_prize: x, certainty_equivalent_ratio: +(x / 2 / S).toFixed(3), steps, value: x };
  },
  async windfall(st, inc, pre, tag) {
    const W = nice(inc * 0.15 * st.jit.windfall);
    await bot(`${pre}You unexpectedly get ${fmt$(W)}. Split it across these uses:`, { tag });
    const a = await askAlloc({ labels: WINDFALL_CATS, total: 100, step: 5, unit: "%", show: (v) => `${v}% (${fmt$(W * v / 100)})` });
    return { amount: W, split_pct: a, value: a };
  },
  async timeAlloc(st, inc, pre, tag) {
    await bot(`${pre}You get 6 extra free hours next week. Split them across:`, { tag });
    const a = await askAlloc({ labels: TIME_CATS, total: 6, step: 0.5, unit: "h", show: (v) => `${v} h` });
    return { hours: 6, split_hours: a, value: a };
  },
  async resWage(st, inc, pre, tag) {
    await bot(`${pre}Someone offers you 3 hours of extra work this weekend. What's the lowest hourly rate you'd accept?`, { tag });
    const v = await askNumber({ prefix: "$", suffix: "/hour", placeholder: "e.g. 35", min: 0, max: 2000 });
    return { hourly_rate: v, value: v };
  },
  async social(st, inc, pre, tag) {
    await bot(`${pre}A friend you're not very close to invites you to dinner on Friday on short notice. What's the chance you'd go?`, { tag });
    const v = await askSlider({ min: 0, max: 100, step: 5, init: 50, unit: "%" });
    return { probability_pct: v, value: v };
  },
};
const TASK_NAME = { timePref: "Time preference", risk: "Risk", windfall: "Windfall split", timeAlloc: "Time allocation", resWage: "Reservation wage", social: "Social approach" };
const C_ORDER = ["timePref", "risk", "windfall", "timeAlloc", "resWage", "social"];

function perceivedDiff(a, b) {
  if (typeof a === "number" && typeof b === "number") return +(b - a).toFixed(3);
  if (a && b && typeof a === "object") {
    return +(Object.keys(a).reduce((s, k) => s + Math.abs((b[k] ?? 0) - a[k]), 0) / 2).toFixed(2); // L1/2 shift
  }
  return null;
}

async function blockC(st) {
  prog(3, 0);
  await bot(`${TOWN.lines.market(st.persona.name)} Now some choices — there are no right answers, just go with what you'd really do. Amounts are scaled to your situation.`, { tag: "Block C · Choices" });
  st.tasks = {};
  for (let i = 0; i < C_ORDER.length; i++) {
    const k = C_ORDER[i];
    st.tasks[k] = await T[k](st, st.income, "", TASK_NAME[k]);
    prog(3, (i + 1) / C_ORDER.length);
  }
  await openEnded(st, "after_choices", "Those were tricky! In your own words, how did you decide on those choices? Was there any reasoning that stood out?");
}

// ---------------- Block D ----------------
async function blockD(st) {
  prog(4, 0);
  st.hypothetical = []; st.contextual = [];
  const factual = st.events.filter((e) => e.factual);
  const phase = (st.month - 1) % 3;
  const pool = SHOCKS.filter((s) => s.phase === phase);
  const n = factual.length ? 2 : 3;
  const total = n + (factual.length ? 2 : 0);
  let done = 0;
  await bot(`${TOWN.lines.observatory(st.persona.name)} Now a few “what if” scenarios. Imagine each one as vividly as you can and tell me what you'd do.`, { tag: "Block D · What-ifs" });

  for (const s of pool.slice(0, n)) {
    const slots = { amt20: fmt$(nice(st.income * 0.2)), bill: nice(st.income * 0.25).toLocaleString("en-US") };
    await bot(s.text(slots), { tag: "Scenario" });
    const rec = { shock_id: s.id, phase };
    if (s.cut3) {
      await bot("Which three expenses would you cut first?");
      rec.cut_first = await askMulti(EXPENSES.map((x) => ({ label: x, value: x })), { exact: 3 });
    }
    await bot("Keeping that scenario in mind:", {});
    const res = await T[s.rerun](st, st.income * (s.incomeFactor || 1), "Under that scenario: ", `${TASK_NAME[s.rerun]} (re-run)`);
    rec.task = s.rerun; rec.result = res;
    rec.shift_vs_baseline = perceivedDiff(st.tasks[s.rerun].value, res.value);
    st.hypothetical.push(rec);
    prog(4, ++done / total);
  }

  if (factual.length) {
    const main = factual[0];
    const other = st.events.find((e) => e !== main);
    await bot(`Now a couple of questions about something you mentioned: “${main.text}”`, { tag: "Contextual" });
    await bot(other
      ? `Suppose that had not happened. Would you still have this one: “${other.text}”?`
      : "Suppose that had not happened. Would the rest of your month have gone about the same?");
    const yn = await askChoice([{ label: "Yes", value: "yes" }, { label: "No", value: "no" }, { label: "Unsure", value: "unsure" }], { cls: "scale" });
    await bot("In one line, why?");
    const why = await askText({ placeholder: "One line…" });
    st.contextual.push({ type: "counterfactual_judgment", event: main.text, other_event: other?.text ?? null, answer: yn, reason: why });
    prog(4, ++done / total);

    const k = CONTEXTUAL_TASK[main.domain] || "resWage";
    const res = await T[k](st, st.income, "Suppose that had not happened. ", `${TASK_NAME[k]} (counterfactual)`);
    st.contextual.push({
      type: "counterfactual_task", event: main.text, task: k, result: res,
      perceived_effect: perceivedDiff(res.value, st.tasks[k].value), // actual − counterfactual; perceived, not causal
    });
    prog(4, ++done / total);
  }
  prog(4, 1);
}

// ---------------- Close ----------------
async function close(st) {
  prog(5, 0);
  document.body.classList.add("dusk"); // sunset on the walk home
  await bot(`${TOWN.lines.home(st.persona.name)} Almost done. Is there anything important from this month that we didn't cover?`, { tag: "Close" });
  const last = await askText({ placeholder: "Anything at all…", chips: [{ label: "Nothing more", value: "" }] });
  st.closing_note = last;

  const phq = st.scales.phq4.score;
  const elevated = phq.total >= 6 || phq.anx >= 3 || phq.dep >= 3;
  const crisis = CRISIS_RX.test(last) || CRISIS_RX.test(st.recap_text || "");
  st.flags = { phq4_elevated: elevated, crisis_language: crisis };
  if (elevated || crisis) {
    await bot(crisis
      ? "I'm really sorry things feel this heavy. Your safety matters more than this survey."
      : "Thank you for sharing honestly. Some of your answers suggest this month has been hard.", {});
    await bot(SUPPORT, { html: true, cls: "support" });
    st.flags.escalation = "Flagged for study-team follow-up per escalation protocol (demo: not transmitted anywhere).";
  }
  prog(5, 1);
}

// ---------------- finish & summary ----------------
function incentive(st) {
  const r = rng(`${st.pid}:${st.month}:incentive`);
  const picked = r() < 0.1;
  if (!picked) return { selected: false };
  const pool = [["timePref", st.tasks.timePref], ["risk", st.tasks.risk]];
  const [task, res] = pool[Math.floor(r() * pool.length)];
  const step = res.steps[Math.floor(r() * res.steps.length)];
  return { selected: true, task, step };
}

async function finish(st) {
  st.completed_at = new Date().toISOString();
  st.incentive = incentive(st);
  // postcard = completion keepsake: minted for every finished check-in, never keyed to answers
  const pc = makePostcard({ name: st.persona.name, cfg: st.persona.cfg, month: st.month, date: new Date() });
  st.postcard = { season: pc.season, created_at: st.completed_at };
  const hist = loadHistory(st.pid);
  const prev = hist[hist.length - 1];
  saveRecord(st);
  const albumCount = saveAlbumEntry(st.pid, { month: st.month, season: pc.season, name: st.persona.name, cfg: st.persona.cfg, date: st.completed_at });

  const rows = [
    ["Stress (PSS-4, 0–16)", (r) => r.scales.pss4.score.total, true],
    ["Mood & anxiety (PHQ-4, 0–12)", (r) => r.scales.phq4.score.total, true],
    ["Loneliness (UCLA-3, 3–9)", (r) => r.scales.ucla3.score.total, true],
    ["Life ladder (0–10)", (r) => r.scales.cantril.score.total, false],
    ["Financial well-being (0–20)", (r) => r.scales.fwb5.score.total, false],
    ["Sleep quality (1–5)", (r) => r.scales.sleep.answers.sl1, false],
  ].map(([label, f, higherIsWorse]) => {
    const v = f(st); let d = "";
    if (prev) {
      const diff = v - f(prev);
      if (diff !== 0) d = ` <span class="delta ${(diff > 0) === higherIsWorse ? "up" : "down"}">${diff > 0 ? "+" : ""}${diff}</span>`;
      else d = ` <span class="delta">±0</span>`;
    }
    return `<tr><td>${label}</td><td><strong>${v}</strong>${d}</td></tr>`;
  }).join("");

  const b0 = await bot(`That's everything — thank you for walking with me, ${esc(st.persona.name)}! Your check-in is saved on this device, and here's this month's postcard${albumCount ? ` — number ${albumCount} in your album` : ""}.
    <div class="postcard-slot"></div>
    <div class="dl"><button id="dl-card">Save postcard (PNG)</button></div>`, { html: true });
  b0.querySelector(".postcard-slot").append(pc.el);
  b0.querySelector("#dl-card").onclick = () => downloadPostcardPNG(pc.el, `postcard_${st.pid}_m${st.month}.png`);
  const b = await bot(`<strong>This month at a glance</strong>${prev ? `<br><span class="hint">Change since check-in #${prev.month}</span>` : ""}<table>${rows}</table>
    ${st.incentive.selected ? `<p>🎲 One of your money choices was randomly selected for a small real payout in the full study (demo only: ${esc(st.incentive.task)}).</p>` : ""}
    <div class="dl"><button id="dl-json">Download my data (JSON)</button><button id="restart">Start over</button></div>`, { html: true });
  b.querySelector("#dl-json").onclick = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(st, null, 2)], { type: "application/json" }));
    h("a", { href: url, download: `checkin_${st.pid}_m${st.month}.json` }).click();
    URL.revokeObjectURL(url);
  };
  b.querySelector("#restart").onclick = () => location.reload();
  window.__lastRecord = st;
}

// ---------------- boot ----------------
// Between setup and the interview: first visit → islander creator; return visit → the
// "mirror moment" (last month's look, change anything). Edits are logged, not judged.
function beginCheckin(pid, income) {
  const saved = loadPersona(pid);
  $("#setup").hidden = true;
  openEditor({
    saved,
    onDone: ({ name, cfg, seconds }) => {
      const prev = saved?.cfg ?? null;
      savePersona(pid, { v: 1, name, cfg, saved_at: new Date().toISOString() });
      start(pid, income, {
        name, cfg,
        prev,
        diff: prev ? personaDiff(prev, cfg) : null,
        editor: { seconds: +seconds.toFixed(1), first_time: !saved },
      });
    },
  });
}

async function start(pid, income, p) {
  const month = beginMonth(pid);
  const r = rng(`${pid}:${month}`);
  const jit = () => 0.9 + 0.2 * r(); // ±10% per month
  const st = {
    bot_version: VERSION, participant_id: pid, pid, month, income,
    persona: { name: p.name, cfg: p.cfg },
    persona_prev: p.prev, persona_diff: p.diff, persona_editor: p.editor,
    started_at: new Date().toISOString(),
    jit: { timePref: jit(), risk: jit(), windfall: jit(), timeAlloc: jit(), resWage: jit(), social: jit() },
  };
  $("#app").hidden = false;
  $("#badge").textContent = `${p.name} · check-in #${month}`;
  initScene(); mountIslander(p.cfg); waveHello(); buildTown(p.cfg); prog(0, 0);
  $("#islander").addEventListener("click", () => {
    const w = $("#islander"); w.classList.remove("hop"); void w.offsetWidth; w.classList.add("hop");
  });
  try {
    await recap(st); await blockA(st); await blockB(st); await blockC(st); await blockD(st); await close(st); await finish(st);
  } catch (e) { console.error(e); await bot("Something went wrong on our side. Your earlier answers are not lost on this page; please reload to restart."); }
}

$("#pid").addEventListener("input", () => {
  const id = $("#pid").value.trim();
  const n = lastSeq(id);
  const p = loadPersona(id);
  $("#history-note").textContent = n
    ? `Welcome back${p ? `, ${p.name}` : ""} — this will be check-in #${n + 1}.`
    : p ? `${p.name} is all set up and waiting in Lumi Town.` : "";
  $("#setup-persona").replaceChildren(...(p ? [personaEl(p.cfg)] : []));
});
$("#setup-form").addEventListener("submit", (e) => {
  e.preventDefault();
  beginCheckin($("#pid").value.trim(), Number($("#income").value));
});

mountSetupLumi();
