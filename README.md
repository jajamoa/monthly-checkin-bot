# Monthly Check-in Interview Bot

A ~15 minute chat-style interview that tracks month-to-month changes in psychological state and behavioral tendencies. The UI is an Animal-Crossing-style scene: a character (Lumi) talking through a name-tagged dialog box with typewriter text and blip sounds, a stitched answer panel, and a leaf-green progress bar. Click Lumi to make it hop; click the dialog to skip typing; "Log" shows the whole conversation.

## Input modes

Open-ended questions are voice-first (Web Speech API: Chrome, Edge, Safari): the recap thought
bubbles, the two open-ended probes (stored verbatim in `open_ended`), and the closing note,
with typing as the fallback (mic blocked, unsupported browser, accessibility). Numbers and the
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
| Recap | **Thought bubbles**: the persona's thoughts pop up in parallel — Relationships (friends · family · romance), Job/school, Hobbies (movies · shows · music · games · sports · books, one answer covers all), Sleep, Mood, Finance, + optional Others. Tap a bubble → speak/type → keep or retake (retake count logged). All six required before continuing; **no "nothing changed" shortcut** — bare "nothing/same" answers are nudged and re-asked. Each kept thought is domain-tagged and marked *factual change* yes/no |
| A · Core scales | PSS-4, PHQ-4, UCLA-3, Cantril ladder, CFPB FWB-5, time pressure (2), sleep + energy (2). Fixed order, one item per screen, rendered as buttons |
| B · Adaptive | Event → module map (burnout+job sat, relationship CSI-4 + attachment, social support, physical function, financial anxiety, deadline stress). Max 2; rotating default if no events |
| C · Choices | Time preference & risk (3-step bisection staircase), windfall split, time allocation, reservation wage, social approach. Dollar amounts = monthly income × fixed fraction × ±10% seeded jitter per participant-month |
| D · What-ifs | Shocks from a fixed 9-item library, phase = `(month-1) % 3`, so each recurs every 3 months. No factual change → 3 shocks; factual change → 2 shocks + 2 contextual items (counterfactual judgment + counterfactual re-run of a C task, stored as `perceived_effect`) |
| Close | "Anything we missed?" + distress check (PHQ-4 ≥ 6 or a subscale ≥ 3, or crisis language) → support resources + escalation flag |

Design rules honoured: questions come from fixed templates with slot-filled values only; block order is constant; `bot_version` is written into every record; random-incentive selection (10%) is recorded.

## Data

Completed check-ins are stored in `localStorage` per participant (`mci:history:<id>`) and can be downloaded as JSON. The check-in # counts actual sittings (`mci:seq:<id>`, advanced whenever an interview begins, so abandoned runs don't repeat #1); the change-since-last-month summary compares against the last *completed* record. The persona lives in `mci:persona:<id>` and the postcard album in `mci:album:<id>`; each record also snapshots `persona`, `persona_prev`, `persona_diff`, `persona_editor` and `postcard`.

## Before real use — read this

- **Scale wording must be verified.** PSS-4, PHQ-4, UCLA-3, Cantril and the FWB items are written from memory of the published instruments. The adaptive modules (OLBI-short, CSI-4, MSPSS-short, PROMIS, financial anxiety, deadline stress), time-pressure and sleep/energy items are *approximations*. Replace `content.js` text with the licensed/verbatim versions before collecting data.
- Event parsing and domain tagging are keyword rules (`content.js`). Swap in an LLM that only **selects a template and fills slots** if you want better recall handling.
- Escalation is a flag in the record only; wire it to your study's real protocol. Not clinical advice.
- Payouts, objective-data validation (steps, sleep, transactions) and a server are out of scope here.
