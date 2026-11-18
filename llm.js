// Event harness for the recap: labels each thought as EVENTFUL (something actually happened —
// any action/occurrence/decision, not only life changes) vs a pure state, extracts a short
// event phrase, picks the 1–2 MOST INTERESTING events, and writes a counterfactual question
// for them ("If you hadn't …, what would you have …?"). Replaces the old per-event
// "is this a concrete change?" interrogation.
//
// Scaffolding rules:
//  • The counterfactual question is the ONE sanctioned exception to the fixed-template rule:
//    the model may write it, but it is constrained (second person, one question, ≤ 25 words,
//    grounded only in what the participant said, no advice) and VALIDATED here — anything that
//    fails validation drops to the fixed COUNTERFACTUAL_TEMPLATE. question_source is logged.
//  • Everything else the model does is label/extract/pick from enums.
//  • Strict JSON schema via output_config; per-item fallback to keyword rules on any invalid
//    item; full fallback on any transport/parse error. The interview can never stall on the model.
//  • Zero-config default is keyword rules (EVENT_RX in content.js). To enable the model:
//      window.MCI_LLM = { key: "sk-ant-…" }                      // or
//      localStorage.setItem("mci:llm", '{"key":"sk-ant-…"}')
//    Optional fields: model (default claude-opus-4-8), url (default api.anthropic.com).
//    NOTE: a browser-held API key is for piloting only — proxy through your study server
//    before real data collection.

import { DOMAINS, BUBBLE_DOMAIN, tagDomain, EVENT_RX, extractEventPhrase } from "./content.js";

const DEFAULT_MODEL = "claude-opus-4-8";
const TIMEOUT_MS = 15000;
const MAX_QUESTIONS = 2;

const SYSTEM = `You label monthly check-in responses for a research panel and write counterfactual probes.

For every input item output one label object:
- "topic": copied exactly from the input item.
- "eventful": true if the response describes something that actually HAPPENED this month — any concrete action, occurrence, or decision (a trip, a purchase, a conversation, a breakup, receiving news). Pure ongoing states, routines, feelings, or opinions with no specific occurrence are eventful=false, even when intense or negative.
- "event": a short phrase (at most 8 words) naming the event if eventful, else summarizing the state. Reuse the participant's own words wherever possible; never add information they did not state.
- "domain": the life domain of the response — one of work, money, health, relationships, living, other.
- "question": null for most items. Only for the 1-2 MOST INTERESTING eventful items (specific, consequential, emotionally charged, or unusual), write ONE counterfactual question inviting the participant to imagine the event had not happened and describe what they would have done or felt instead. Second person, a single question of at most 25 words, grounded only in what they said, no advice, no assumptions beyond their words.

You are a labeler, not an interviewer or counselor: no advice, no commentary — only the JSON labels.

Examples:
input:  {"topic":"others","text":"I went to the farmer's market on Saturday morning"}
output: {"topic":"others","eventful":true,"event":"went to the farmer's market","domain":"other","question":"If you hadn't gone to the farmer's market on Saturday, what would you have done with that morning instead?"}
input:  {"topic":"job","text":"finally got the response about my grant application, it was approved"}
output: {"topic":"job","eventful":true,"event":"grant application approved","domain":"work","question":"If that response hadn't arrived this month, what would you have done differently at work?"}
input:  {"topic":"sleep","text":"about six hours a night, kept waking up at 3am before my deadline"}
output: {"topic":"sleep","eventful":false,"event":"short sleep, 3am waking","domain":"health","question":null}
input:  {"topic":"mood","text":"steady most days, a bit anxious before meetings"}
output: {"topic":"mood","eventful":false,"event":"steady, some meeting anxiety","domain":"health","question":null}`;

const SCHEMA = {
  type: "object",
  properties: {
    labels: {
      type: "array",
      items: {
        type: "object",
        properties: {
          topic: { type: "string" },
          eventful: { type: "boolean" },
          event: { type: "string" },
          domain: { type: "string", enum: Object.keys(DOMAINS) },
          question: { anyOf: [{ type: "string" }, { type: "null" }] },
        },
        required: ["topic", "eventful", "event", "domain", "question"],
        additionalProperties: false,
      },
    },
  },
  required: ["labels"],
  additionalProperties: false,
};

const rulesLabel = (it) => ({
  topic: it.topic,
  eventful: EVENT_RX.test(it.text),
  event: extractEventPhrase(it.text),
  domain: BUBBLE_DOMAIN[it.topic] || tagDomain(it.text),
  question: null, // rules can't write questions — app falls back to COUNTERFACTUAL_TEMPLATE
});

/** A generated question must look like one short second-person question, or it's discarded. */
function validQuestion(q) {
  if (typeof q !== "string") return null;
  const t = q.trim();
  if (!t || t.length > 220 || !t.endsWith("?")) return null;
  if ((t.match(/\?/g) || []).length > 1) return null;
  return t;
}

function config() {
  try { return window.MCI_LLM || JSON.parse(localStorage.getItem("mci:llm")) || null; }
  catch { return null; }
}

async function callClaude(cfg, items) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(cfg.url || "https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: ac.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": cfg.key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: cfg.model || DEFAULT_MODEL,
        max_tokens: 1024,
        system: SYSTEM,
        messages: [{
          role: "user",
          content: JSON.stringify({ responses: items.map(({ topic, text }) => ({ topic, text })) }),
        }],
        output_config: { format: { type: "json_schema", schema: SCHEMA } },
      }),
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const msg = await res.json();
    if (msg.stop_reason === "refusal") throw new Error("model refused");
    const text = (msg.content || []).find((b) => b.type === "text")?.text;
    if (!text) throw new Error("no text block in response");
    const labels = JSON.parse(text).labels;
    if (!Array.isArray(labels)) throw new Error("labels is not an array");
    return labels;
  } finally { clearTimeout(timer); }
}

/**
 * Label the recap thoughts and pick interesting events with counterfactual questions.
 * items: [{ topic, text }]
 * → { method: "rules"|"llm", model?, events: [{topic, eventful, event, domain, question}] }
 */
export async function detectEvents(items) {
  const cfg = config();
  if (!cfg?.key) return { method: "rules", events: items.map(rulesLabel) };
  try {
    const byTopic = new Map((await callClaude(cfg, items)).map((l) => [l.topic, l]));
    let questions = 0;
    const events = items.map((it) => {
      const l = byTopic.get(it.topic);
      if (!l || typeof l.eventful !== "boolean" || typeof l.event !== "string" || !l.event.trim()) {
        return rulesLabel(it); // per-item fallback: the model skipped or mangled this topic
      }
      let question = validQuestion(l.question);
      if (question && (!l.eventful || ++questions > MAX_QUESTIONS)) question = null; // enforce the contract
      return {
        topic: it.topic,
        eventful: l.eventful,
        event: l.event.trim().slice(0, 80),
        domain: DOMAINS[l.domain] ? l.domain : (BUBBLE_DOMAIN[it.topic] || tagDomain(it.text)),
        question,
      };
    });
    return { method: "llm", model: cfg.model || DEFAULT_MODEL, events };
  } catch (e) {
    console.warn("event detection fell back to keyword rules:", e);
    return { method: "rules", events: items.map(rulesLabel) };
  }
}
