// Static interview content: scales, modules, shock library, templates.
// The bot never free-generates questions: everything the participant sees comes from here,
// with slot-filled values (names, amounts) only.

export const VERSION = "monthly-checkin-bot@0.1.0";

export const DOMAINS = {
  work: "Work / school",
  money: "Money",
  health: "Health & sleep",
  relationships: "Relationships",
  living: "Living situation",
  other: "Other notable event",
};

const DOMAIN_RX = {
  money: /money|rent|bill|debt|saving|spen[dt]|bought|trip|booked|paid|budget|loan|tax|invest|expens|\$|钱|买/i,
  work: /\bjob\b|work|boss|promot|raise|salary|hired|fired|laid off|quit|intern|class|exam|school|thesis|deadline|project|office|colleague|semester|midterm|finals?\b|工作|考试|学校/i,
  health: /sick|\bill\b|illness|injur|surgery|hospital|doctor|sleep|insomnia|pain|covid|\bflu\b|gym|workout|diet|health|therapy|病|睡/i,
  relationships: /partner|girlfriend|boyfriend|dating|broke up|breakup|married|wedding|engag|divorc|friend|family|parent|\bmom\b|\bdad\b|sibling|baby|relationship|朋友|恋/i,
  living: /\bmoved\b|moving|\bmove\b|apartment|roommate|landlord|house|relocat|\bcity\b|lease|commute|搬/i,
};

export function parseEvents(text) {
  const t = text.trim();
  if (!t || /^(nothing|nope|no|not much|nada|none|nothing much|没什么|没有)\b[.!\s]*$/i.test(t)) return [];
  return t
    .split(/[.;!?\n。；！？]+|,\s*(?:and|but|also)\s+|\s+(?:and then|plus)\s+/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 3)
    .slice(0, 5);
}

export function tagDomain(text) {
  let best = "other", n = 0;
  for (const [d, rx] of Object.entries(DOMAIN_RX)) {
    const m = text.match(new RegExp(rx.source, "gi"));
    if (m && m.length > n) { best = d; n = m.length; }
  }
  return best;
}

// ---------- Core scales (Block A). Fixed order, fixed wording. ----------
const FREQ4 = ["Not at all", "Several days", "More than half the days", "Nearly every day"];
const FREQ5 = ["Never", "Almost never", "Sometimes", "Fairly often", "Very often"];
const opt = (labels, start = 0) => labels.map((label, i) => ({ label, value: i + start }));

export const CORE_SCALES = [
  {
    id: "pss4", name: "Stress · past month", options: opt(FREQ5),
    items: [
      { id: "pss1", text: "In the last month, how often have you felt that you were unable to control the important things in your life?" },
      { id: "pss2", text: "In the last month, how often have you felt confident about your ability to handle your personal problems?", reverse: true },
      { id: "pss3", text: "In the last month, how often have you felt that things were going your way?", reverse: true },
      { id: "pss4", text: "In the last month, how often have you felt difficulties were piling up so high that you could not overcome them?" },
    ],
  },
  {
    id: "phq4", name: "Mood & anxiety · past 2 weeks", options: opt(FREQ4),
    stem: "Over the last 2 weeks, how often have you been bothered by the following problem?",
    items: [
      { id: "phq1", text: "Feeling nervous, anxious or on edge", sub: "anx" },
      { id: "phq2", text: "Not being able to stop or control worrying", sub: "anx" },
      { id: "phq3", text: "Little interest or pleasure in doing things", sub: "dep" },
      { id: "phq4", text: "Feeling down, depressed, or hopeless", sub: "dep" },
    ],
  },
  {
    id: "ucla3", name: "Connection", options: opt(["Hardly ever", "Some of the time", "Often"], 1),
    items: [
      { id: "ucla1", text: "How often do you feel that you lack companionship?" },
      { id: "ucla2", text: "How often do you feel left out?" },
      { id: "ucla3", text: "How often do you feel isolated from others?" },
    ],
  },
  {
    id: "cantril", name: "Life satisfaction",
    options: Array.from({ length: 11 }, (_, i) => ({ label: String(i), value: i })),
    anchors: ["Worst possible life", "Best possible life"],
    items: [{
      id: "cantril",
      text: "Please imagine a ladder with steps numbered from zero at the bottom to ten at the top. The top of the ladder represents the best possible life for you and the bottom of the ladder represents the worst possible life for you. On which step of the ladder would you say you personally feel you stand at this time?",
    }],
  },
  {
    id: "fwb5", name: "Financial well-being",
    options: opt(["Not at all", "Very little", "Somewhat", "Very much", "Completely"]),
    stem: "How well does this statement describe you or your situation?",
    items: [
      { id: "fwb1", text: "I could handle a major unexpected expense" },
      { id: "fwb2", text: "I am securing my financial future" },
      { id: "fwb3", text: "Because of my money situation, I feel like I will never have the things I want in life", reverse: true },
      { id: "fwb4", text: "I am just getting by financially", reverse: true },
      { id: "fwb5", text: "I am concerned that the money I have or will save won't last", reverse: true },
    ],
  },
  {
    id: "timepress", name: "Time pressure", options: opt(["Never", "Rarely", "Sometimes", "Often", "Always"], 1),
    items: [
      { id: "tp1", text: "In the past month, how often did you feel you did not have enough time to do what you needed to do?" },
      { id: "tp2", text: "In the past month, how often did you feel rushed?" },
    ],
  },
  {
    id: "sleep", name: "Sleep & energy",
    items: [
      { id: "sl1", text: "Over the past month, how would you rate your sleep quality overall?", options: opt(["Very bad", "Bad", "Okay", "Good", "Very good"], 1) },
      { id: "sl2", text: "Over the past month, how would you rate your energy level during the day?", options: opt(["Very low", "Low", "Moderate", "High", "Very high"], 1) },
    ],
  },
];

export function scoreScale(scale, answers) {
  const max = Math.max(...(scale.options || scale.items[0].options).map((o) => o.value));
  const min = Math.min(...(scale.options || scale.items[0].options).map((o) => o.value));
  let total = 0, anx = 0, dep = 0;
  for (const it of scale.items) {
    let v = answers[it.id];
    if (v == null) continue;
    if (it.reverse) v = max + min - v;
    total += v;
    if (it.sub === "anx") anx += v;
    if (it.sub === "dep") dep += v;
  }
  return scale.id === "phq4" ? { total, anx, dep } : { total };
}

// ---------- Adaptive modules (Block B) ----------
const AGREE = opt(["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"], 1);
const FREQ_NA = opt(["Never", "Rarely", "Sometimes", "Often", "Always"], 1);

export const MODULES = {
  burnout_job: {
    name: "Work & energy", options: AGREE,
    items: [
      { id: "bo1", text: "There are days when I feel tired before I arrive at work." },
      { id: "bo2", text: "After work, I tend to need more time than in the past to relax and feel better." },
      { id: "bo3", text: "I feel full of energy at work.", reverse: true },
      { id: "js1", text: "Overall, how satisfied are you with your job?", options: opt(["Very dissatisfied", "Dissatisfied", "Neutral", "Satisfied", "Very satisfied"], 1) },
    ],
  },
  relationship: {
    name: "Relationship & attachment",
    items: [
      { id: "csi1", text: "Please indicate the degree of happiness, all things considered, of your relationship.", options: opt(["Extremely unhappy", "Fairly unhappy", "A little unhappy", "Happy", "Very happy", "Extremely happy", "Perfect"]), onlyIfOngoing: true },
      { id: "csi2", text: "I have a warm and comfortable relationship with my partner.", options: opt(["Not at all", "A little", "Somewhat", "Mostly", "Almost completely", "Completely"]), onlyIfOngoing: true },
      { id: "csi3", text: "How rewarding is your relationship with your partner?", options: opt(["Not at all", "A little", "Somewhat", "Mostly", "Almost completely", "Completely"]), onlyIfOngoing: true },
      { id: "csi4", text: "In general, how satisfied are you with your relationship?", options: opt(["Not at all", "A little", "Somewhat", "Mostly", "Almost completely", "Completely"]), onlyIfOngoing: true },
      { id: "att1", text: "Right now, I worry that the people closest to me might not really care about me.", options: AGREE },
      { id: "att2", text: "Right now, I feel comfortable depending on people close to me.", options: AGREE, reverse: true },
    ],
  },
  support: {
    name: "Social support", options: AGREE,
    items: [
      { id: "ms1", text: "There is a special person who is around when I am in need." },
      { id: "ms2", text: "I can talk about my problems with my friends." },
      { id: "ms3", text: "My family really tries to help me." },
      { id: "ms4", text: "I have friends with whom I can share my joys and sorrows." },
    ],
  },
  physical: {
    name: "Physical health",
    items: [
      { id: "ph1", text: "In the past 7 days, how much did pain interfere with your day-to-day activities?", options: opt(["Not at all", "A little bit", "Somewhat", "Quite a bit", "Very much"], 1) },
      { id: "ph2", text: "Are you able to do chores such as vacuuming or yard work?", options: opt(["Unable to do", "With much difficulty", "With some difficulty", "With a little difficulty", "Without any difficulty"], 1) },
      { id: "ph3", text: "Are you able to climb up five steps?", options: opt(["Unable to do", "With much difficulty", "With some difficulty", "With a little difficulty", "Without any difficulty"], 1) },
    ],
  },
  finance_anx: {
    name: "Financial anxiety", options: FREQ_NA,
    items: [
      { id: "fa1", text: "In the past month, how often have you worried about being able to pay your bills?" },
      { id: "fa2", text: "In the past month, how often have you felt anxious when thinking about your finances?" },
    ],
  },
  deadline: {
    name: "Deadlines & procrastination", options: FREQ_NA,
    items: [
      { id: "dl1", text: "In the past month, how often did deadlines or exams feel overwhelming?" },
      { id: "dl2", text: "In the past month, how often did you put off tasks until the last minute?" },
      { id: "dl3", text: "In the past month, how often did you feel behind on what you needed to do?" },
    ],
  },
};

// event → module triggers, checked in this priority order
const MODULE_RULES = [
  ["finance_anx", /debt|unexpected|bills?\b|lost (my )?money|fine\b|medical bill|can'?t afford|laid off|rent (went|increase)/i],
  ["burnout_job", /new job|\bjob\b|overwork|overtime|promot|laid off|quit|boss|workload|burn(ed)? ?out|raise/i],
  ["relationship", /girlfriend|boyfriend|partner|dating|broke up|breakup|married|engag|divorc|relationship/i],
  ["physical", /sick|\bill\b|injur|surgery|hospital|pain|covid|\bflu\b|broke my/i],
  ["support", /\bmoved\b|moving|\bmove\b|new apartment|relocat|roommate|new city/i],
  ["deadline", /exam|deadline|thesis|midterm|finals?\b|submission|due\b|paper/i],
];
const ROTATING_DEFAULT = ["support", "finance_anx", "deadline"];

export function pickModules(events, month) {
  const picked = [];
  const ordered = [...events].sort((a, b) => Number(b.factual) - Number(a.factual));
  for (const [id, rx] of MODULE_RULES) {
    if (picked.length >= 2) break;
    if (ordered.some((e) => rx.test(e.text))) picked.push({ id, why: ordered.find((e) => rx.test(e.text)).text });
  }
  if (!picked.length) picked.push({ id: ROTATING_DEFAULT[(month - 1) % 3], why: null });
  return picked;
}

// ---------- Shock library (Block D). Phase = (month-1) % 3, so each recurs every 3 months. ----------
export const SHOCKS = [
  { id: "inc_down", phase: 0, rerun: "windfall", incomeFactor: 0.8, cut3: true,
    text: (s) => `Imagine your take-home pay next month comes in 20% lower than expected (about $${s.amt20} less).` },
  { id: "work_x2", phase: 0, rerun: "timeAlloc",
    text: () => "Imagine your workload (work or study) doubles for the next month." },
  { id: "friend_moves", phase: 0, rerun: "social",
    text: () => "Imagine a close friend of yours moves away to another country next month." },
  { id: "sleep5", phase: 1, rerun: "resWage",
    text: () => "Imagine that for the next two weeks you can only sleep about 5 hours a night." },
  { id: "inc_up", phase: 1, rerun: "risk", incomeFactor: 1.2,
    text: (s) => `Imagine your take-home pay next month comes in 20% higher than expected (about $${s.amt20} more).` },
  { id: "rent_up", phase: 1, rerun: "windfall", incomeFactor: 0.85,
    text: () => "Imagine your rent or housing cost goes up by 15% starting next month." },
  { id: "bill", phase: 2, rerun: "timePref",
    text: (s) => `Imagine you receive an unexpected bill of about $${s.bill} that is due next week.` },
  { id: "gap", phase: 2, rerun: "resWage", incomeFactor: 0.5,
    text: () => "Imagine your main source of income stops for the next two months." },
  { id: "city", phase: 2, rerun: "social",
    text: () => "Imagine you are offered a great opportunity that requires moving to a city where you know no one." },
];

export const EXPENSES = ["Rent / housing", "Groceries", "Eating out", "Subscriptions", "Transport", "Travel", "Shopping", "Entertainment", "Savings contributions", "Gifts / donations"];

export const WINDFALL_CATS = ["Save", "Essentials", "Treats", "Give to others", "Invest"];
export const TIME_CATS = ["Rest", "Socializing", "Work / study", "Exercise", "Entertainment"];

// counterfactual task chosen by the domain of the factual event
export const CONTEXTUAL_TASK = { work: "timePref", money: "risk", health: "timeAlloc", relationships: "social", living: "windfall", other: "resWage" };

export const SUPPORT = `
<strong>If you're struggling, support is available.</strong><br>
• US: call or text <strong>988</strong> (Suicide &amp; Crisis Lifeline) · text <strong>HOME</strong> to <strong>741741</strong> (Crisis Text Line)<br>
• Elsewhere: <a href="https://findahelpline.com" target="_blank" rel="noopener">findahelpline.com</a> lists free local helplines<br>
• In immediate danger, contact local emergency services.`;

export const CRISIS_RX = /suicid|kill myself|end (my|it all)|self[- ]?harm|hurt myself|don'?t want to (live|be here)|想死|自杀/i;
