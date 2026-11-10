# Monthly Check-in Interview Bot

A ~15 minute chat-style interview that tracks month-to-month changes in psychological state and behavioral tendencies. The UI is an Animal-Crossing-style scene: a character (Lumi) talking through a name-tagged dialog box with typewriter text and blip sounds, a stitched answer panel, and a leaf-green progress bar. Click Lumi to make it hop; click the dialog to skip typing; "Log" shows the whole conversation.

## Voice-first input

Every question is answered by speaking (Web Speech API: Chrome, Edge, Safari). Multiple-choice items are also answered in your own words ("pretty often", "the later one", "seven"). The spoken phrase is mapped to the closest option, the raw phrase is kept next to the mapped value (`<item>__said`), and if the match is unclear the bot asks again. Numbers, sliders, percentage/hour splits and "pick three" lists are parsed from speech too. Two short open-ended spoken probes (after Block A and after Block C) are stored verbatim in `open_ended`. Tapping and typing remain as fallbacks (mic blocked, unsupported browser, accessibility).

Privacy: browser speech recognition may send audio to the browser vendor. For a study, swap `voiceBar` in `ui.js` for a self-hosted Whisper endpoint. For tests, `window.__say("text")` injects a spoken answer.


No build step, no backend: open `index.html` through any static server.

```bash
python3 -m http.server 8765   # then open http://localhost:8765
# add ?fast=1 to skip typing delays when testing
```

## Protocol implemented

| Block | What happens |
|---|---|
| Recap | Free recall → events split + domain-tagged → 6-domain checklist → each event marked *factual change* yes/no |
| A · Core scales | PSS-4, PHQ-4, UCLA-3, Cantril ladder, CFPB FWB-5, time pressure (2), sleep + energy (2). Fixed order, one item per screen, rendered as buttons |
| B · Adaptive | Event → module map (burnout+job sat, relationship CSI-4 + attachment, social support, physical function, financial anxiety, deadline stress). Max 2; rotating default if no events |
| C · Choices | Time preference & risk (3-step bisection staircase), windfall split, time allocation, reservation wage, social approach. Dollar amounts = monthly income × fixed fraction × ±10% seeded jitter per participant-month |
| D · What-ifs | Shocks from a fixed 9-item library, phase = `(month-1) % 3`, so each recurs every 3 months. No factual change → 3 shocks; factual change → 2 shocks + 2 contextual items (counterfactual judgment + counterfactual re-run of a C task, stored as `perceived_effect`) |
| Close | "Anything we missed?" + distress check (PHQ-4 ≥ 6 or a subscale ≥ 3, or crisis language) → support resources + escalation flag |

Design rules honoured: questions come from fixed templates with slot-filled values only; block order is constant; `bot_version` is written into every record; random-incentive selection (10%) is recorded.

## Data

Completed check-ins are stored in `localStorage` per participant (`mci:history:<id>`) and can be downloaded as JSON. Month number and the change-since-last-month summary come from that history.

## Before real use — read this

- **Scale wording must be verified.** PSS-4, PHQ-4, UCLA-3, Cantril and the FWB items are written from memory of the published instruments. The adaptive modules (OLBI-short, CSI-4, MSPSS-short, PROMIS, financial anxiety, deadline stress), time-pressure and sleep/energy items are *approximations*. Replace `content.js` text with the licensed/verbatim versions before collecting data.
- Event parsing and domain tagging are keyword rules (`content.js`). Swap in an LLM that only **selects a template and fills slots** if you want better recall handling.
- Escalation is a flag in the record only; wire it to your study's real protocol. Not clinical advice.
- Payouts, objective-data validation (steps, sleep, transactions) and a server are out of scope here.
