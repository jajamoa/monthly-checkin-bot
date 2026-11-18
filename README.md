# Monthly Check-in Interview Bot

A ~15 minute chat-style interview that tracks month-to-month changes in psychological state and behavioral tendencies. The UI is an Animal-Crossing-style scene: a character (Lumi) talking through a name-tagged dialog box with typewriter text and blip sounds, a stitched answer panel, and a leaf-green progress bar. Click Lumi to make it hop; click the dialog to skip typing; "Log" shows the whole conversation.

## Input modes

The recap thought bubbles are **strictly voice** — no text box, no "type instead" fallback: a
working microphone is required to answer them (a blocked mic shows instructions to enable it;
for testing, `window.__say("…")` injects a spoken answer). The other open-ended questions — the
two probes (stored verbatim in `open_ended`), the counterfactual probe, and the closing note —
remain voice-first with a text box fallback. Everything structured — multiple-choice scales,
yes/no items, pick-N lists, allocation sliders, the probability slider, and numeric entry — is
**tap/type-only with no voice bar**. Numbers and the
probability slider can also be spoken ("thirty-five"). Everything else — multiple-choice
scales, yes/no items, "pick N" lists and the split/allocation tasks — is **tap-only**: no
voice mapping, participants press the option they mean.

Privacy: browser speech recognition may send audio to the browser vendor. For a study, swap `voiceBar` in `ui.js` for a self-hosted Whisper endpoint. For tests, `window.__say("text")` injects a spoken answer.


No build step, no backend: open `index.html` through any static server.

```bash
python3 -m http.server 8765   # then open http://localhost:8765
# add ?fast=1 to skip typing delays when testing
# add ?fast=1&drive=1 for a fully self-answering end-to-end run (drive.js)
```

## Lumi Town (persona & gamification layer)

Tomodachi-Life-style framing so participants feel ownership of the panel. The interview is
reframed as Lumi walking around town with the participant's **islander** — a customizable
persona created on first login (6 skin tones, 16 hairstyles × 7 colors, 5 eyes, 4 noses,
5 mouths, 4 expressions, 4 outfits × 6 colors, 14 shoes; SVG paper-doll in `persona.js`).

- **First check-in**: full creator with a name field — the look is set once, here.
  **Every later check-in**: the "vibe check" — only eyes, mouth and expression are editable
  (with 🎲 Surprise me limited to those, and ↩ Reset back to last month's vibe); skin, hair,
  outfit, shoes and nose are locked after creation. Time spent in the editor and the
  field-level vibe diff are logged (`persona_editor`, `persona_diff`) — ownership ritual and
  a monthly self-presented-mood measure in one.
- **Town strip as progress bar** (`town.js`): the islander walks between locations as blocks
  begin — Front Porch (recap), Wellness Cabin (core scales), a Block-B stop chosen by the
  adaptive module (office / park / neighborhood / gym / bank / library), Market Square
  (choices), Observatory (what-ifs), Home at sunset (close, with a dusk sky). Each stop is
  drawn as a **scene backdrop** on stage (flat SVG art in `town.js`); before Block B reveals
  its destination, the strip teases "Somewhere new…" with a fairground ferris wheel.
- **Postcards**: every completed check-in mints a seasonal postcard (persona + Lumi, month
  stamp), downloadable as PNG and stored in a per-participant album.

**Research-integrity guardrails** (see comments on `TOWN` in `content.js`):
locations mirror *topics* only (block structure + module choice — the module is already
picked from recap text), never answer severity; keepsakes are granted on *completion* only,
never answer content; the persona's expression is only ever what the participant chose,
never a mirror of their scores; scale item wording is never slot-filled — only Lumi's
framing lines take the persona's name; the crisis/support path keeps its sober styling.

Testing hooks: `window.__say("text")` injects a spoken answer, `window.__creatorConfirm()`
confirms the persona editor, and `?drive=1` (with `?fast=1`) self-answers the whole
interview by tapping — headless check:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --dump-dom \
  --virtual-time-budget=90000 "http://localhost:8765/index.html?fast=1&drive=1" \
  | grep -o "<title>E2E_[A-Z]*"   # expect E2E_PASS
```

## Protocol implemented

| Block | What happens |
|---|---|
| Recap | **Thought bubbles**: the persona's thoughts pop up in parallel — Relationships (friends · family · romance), Job/school, Hobbies (movies · shows · music · games · sports · books, one answer covers all), Sleep, Mood, Finance, + optional Others. Tap a bubble → speak/type (few-shot example shown) → keep or retake (retake count logged). All six required before continuing; **no "nothing changed" shortcut** — bare "nothing/same" answers are nudged and re-asked. The **event harness** (`llm.js`) then labels each thought as *eventful* (any action/occurrence, not only changes) vs a pure state, extracts a short event phrase, and — with a model configured — picks the most interesting events and writes their counterfactual questions; the participant gets one skippable tap-to-fix screen instead of per-event yes/no questions (corrections logged in `event_detection`) |
| A · Core scales | PSS-4, PHQ-4, UCLA-3, Cantril ladder, CFPB FWB-5, time pressure (2), sleep + energy (2). Fixed order, one item per screen, rendered as buttons |
| B · Adaptive | Event → module map (burnout+job sat, relationship CSI-4 + attachment, social support, physical function, financial anxiety, deadline stress). Max 2; rotating default if no events |
| C · Choices | Time preference & risk (3-step bisection staircase), windfall split, time allocation, reservation wage, social approach. Dollar amounts = monthly income × fixed fraction × ±10% seeded jitter per participant-month |
| D · What-ifs | Shocks from a fixed 9-item library, phase = `(month-1) % 3`, so each recurs every 3 months. No eventful item → 3 shocks; eventful → 2 shocks + 2 contextual items: a **counterfactual probe** (model-written question about the most interesting event when the harness is enabled, `COUNTERFACTUAL_TEMPLATE` otherwise; open spoken answer) + counterfactual re-run of a C task, stored as `perceived_effect` |
| Close | "Anything we missed?" + distress check (PHQ-4 ≥ 6 or a subscale ≥ 3, or crisis language) → support resources + escalation flag |

Design rules honoured: questions come from fixed templates with slot-filled values only; block order is constant; `bot_version` is written into every record; random-incentive selection (10%) is recorded.

## Data

Completed check-ins are stored in `localStorage` per participant (`mci:history:<id>`) and can be downloaded as JSON. The check-in # counts actual sittings (`mci:seq:<id>`, advanced whenever an interview begins, so abandoned runs don't repeat #1); the change-since-last-month summary compares against the last *completed* record. The persona lives in `mci:persona:<id>` and the postcard album in `mci:album:<id>`; each record also snapshots `persona`, `persona_prev`, `persona_diff`, `persona_editor` and `postcard`.

## Before real use — read this

- **Scale wording must be verified.** PSS-4, PHQ-4, UCLA-3, Cantril and the FWB items are written from memory of the published instruments. The adaptive modules (OLBI-short, CSI-4, MSPSS-short, PROMIS, financial anxiety, deadline stress), time-pressure and sleep/energy items are *approximations*. Replace `content.js` text with the licensed/verbatim versions before collecting data.
- **Event harness** (`llm.js`) ships with keyword rules (`EVENT_RX` in `content.js`) as the
  zero-config default. To enable the model, set
  `window.MCI_LLM = { key: "sk-ant-…", model: "claude-opus-4-8" }` (or the `mci:llm`
  localStorage key). The model labels each thought as *eventful* (anything that actually
  happened — a market trip counts, not only life changes) vs a pure state, extracts a ≤8-word
  event phrase in the participant's words, picks a domain from a fixed enum, **and for the 1–2
  most interesting events writes the Block D counterfactual question** ("If you hadn't …, what
  would you have done instead?"). That generated question is the one sanctioned exception to the
  fixed-template rule: it's constrained (single second-person question, ≤25 words, grounded only
  in the participant's words, no advice), validated client-side (anything off-contract drops to
  `COUNTERFACTUAL_TEMPLATE`), and `question_source: "model"|"template"` is logged with every
  probe. Few-shot prompt + strict JSON schema (`output_config.format`); invalid/missing labels
  fall back to rules per-item and any transport error falls back entirely, so the interview
  never stalls on the model. `event_detection` in each record logs method, model, and how many
  labels the participant corrected on the quick-check screen (a free harness-accuracy measure).
  A browser-held API key is for piloting only — proxy the call through your study server before
  real data collection.
- Escalation is a flag in the record only; wire it to your study's real protocol. Not clinical advice.
- Payouts, objective-data validation (steps, sleep, transactions) and a server are out of scope here.
