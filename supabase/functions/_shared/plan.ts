// supabase/functions/_shared/plan.ts
// The pure half of plan generation: the planning context, the prompt, the output schema, the
// validator and the cost table. No Deno or network APIs, so Node unit tests import it directly
// (tests/unit/generatePlan.test.ts). Keep GeneratedPlan in sync with shared/types.ts.

export type Horizon = 'weeks' | 'months' | 'year' | 'multi_year';
export type Domain = 'software' | 'exams' | 'business' | 'fitness' | 'creative' | 'academic' | 'career' | 'admin' | 'other';
export type Kind = 'learn' | 'practice' | 'lab' | 'review' | 'build' | 'outreach' | 'admin';

const DOMAINS: Domain[] = ['software', 'exams', 'business', 'fitness', 'creative', 'academic', 'career', 'admin', 'other'];
const KINDS: Kind[] = ['learn', 'practice', 'lab', 'review', 'build', 'outreach', 'admin'];

export interface GeneratedPlan {
  title: string;
  domain: Domain;
  north_star: string;
  /** "Why this plan is shaped this way" — one paragraph, shown at the top of the review. */
  rationale: string;
  /** Empty string when the goal is clear enough. */
  clarifying_question: string;
  skills: { key: string; label: string; description: string }[];
  tracks: {
    key: string;
    title: string;
    goal_line: string;
    stages: { title: string; description: string; requires_milestone_titles: string[] }[];
  }[];
  milestones: {
    title: string;
    detail: string;
    coach_note: string;
    skill: string;
    due_week: number;
    target_label: string;
    is_keystone: boolean;
  }[];
  quest_items: {
    title: string;
    detail: string;
    skill: string;
    kind: Kind;
    estimate_minutes: number;
    /** How often a typical week runs this quest (0.5 = every other week). Used for the weekly-hours check. */
    times_per_week: number;
  }[];
  /** The model's own Σ estimate × times_per_week, written after the quests: a nudge to add up. Not trusted. */
  weekly_load_minutes: number;
}

/** Everything we know about the user's goal and time. Built by the Edge Function from the database. */
export interface PlanContext {
  goal: string;
  why: string | null;
  horizon: Horizon;
  /** YYYY-MM-DD in the user's timezone. */
  today: string;
  timezone: string;
  dailyMinutes: number;
  /** 0 = Sunday … 6 = Saturday. */
  restDays: number[];
  workdayStart: string;
  workdayEnd: string;
  notes: string | null;
  clarification: { question: string; answer: string } | null;
}

// ── limits the validator enforces ─────────────────────────────────────────────────────────────────
export const LIMITS = {
  minQuests: 20,
  maxQuests: 30,
  minEstimate: 10,
  maxEstimate: 90,
  minSkills: 3,
  maxSkills: 6,
  minMilestones: 3,
  maxMilestones: 10,
  maxTracks: 2,
  minStages: 4,
  maxStages: 7,
  /** A plan that uses less than this share of the stated hours isn't using what they told us. */
  minWeeklyShare: 0.4,
} as const;

/** The latest a final milestone may land, per horizon, in weeks. Loose on purpose: horizons are fuzzy. */
export const HORIZON_WEEKS: Record<Horizon, number> = { weeks: 16, months: 40, year: 64, multi_year: 260 };

const HORIZON_LABEL: Record<Horizon, string> = {
  weeks: 'a few weeks',
  months: 'a few months',
  year: 'about a year',
  multi_year: 'longer than a year',
};
const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const workingDays = (restDays: number[]) => Math.max(1, 7 - new Set(restDays.filter((d) => d >= 0 && d <= 6)).size);
export const weeklyMinutes = (ctx: Pick<PlanContext, 'dailyMinutes' | 'restDays'>) => ctx.dailyMinutes * workingDays(ctx.restDays);

/** Below this, even the smallest valid plan (every quest at minimum length, monthly) can't fit. */
export const MIN_PLANNABLE_WEEKLY = LIMITS.minQuests * LIMITS.minEstimate * 0.25;

/** Σ estimate × times_per_week — the minutes a typical week of this plan asks for. */
export const plannedWeeklyMinutes = (plan: Pick<GeneratedPlan, 'quest_items'>) =>
  Math.round(plan.quest_items.reduce((sum, q) => sum + q.estimate_minutes * q.times_per_week, 0));

// ── prompt ───────────────────────────────────────────────────────────────────────────────────────
export const SYSTEM = `You design realistic personal plans for a productivity app called Stickler.

The user describes a goal in their own words and gives their real constraints. You return ONE plan
as tracks → stages → milestones, plus a library of repeatable quest items that the app rotates
into the user's daily blocks.

Be specific to THIS goal. This is the whole point of the plan.
- Quest titles name real topics, standards, tools, techniques, places or activities from the goal's
  own domain. For "ACCA Financial Reporting": "IAS 16 revaluations: 6 practice questions", not
  "Read one syllabus topic". For an AWS certification: "VPC peering vs Transit Gateway: build both",
  not "Study networking". A title that could appear in anybody's plan is a failure.
- Use every fact in the context: their words, their reason, the date they mention, their notes.
  The north_star and rationale should sound like they were written for this person.

Fit the time they actually have.
- WEEKLY MINUTES is a hard budget. Give each quest times_per_week (0.25–7; 0.5 = every other
  week, 0.25 = monthly). The sum of estimate_minutes × times_per_week over all quests must be at
  most WEEKLY MINUTES and at least ${Math.round(LIMITS.minWeeklyShare * 100)}% of it. Aim for TARGET WEEKLY LOAD.
- The library is a rotation pool, not a weekly to-do list: with 20+ quests, most of them should
  be 0.25 or 0.5 a week, and only the 3–5 core habits 1 or more. Add up the sum before answering.
- No single quest may be longer than DAILY MINUTES.
- Estimates are what a normal, slightly tired person needs, ${LIMITS.minEstimate}–${LIMITS.maxEstimate} minutes, whole numbers.

Milestones and dates.
- Milestones are checkable events. due_week is weeks from TODAY (1 = this coming week). Give each a
  fuzzy target_label computed from TODAY and due_week, like "Mid-Nov 2026" or "Early March 2027".
- If the goal names a date ("in June", "by March"), the final milestone lands on or before it. Otherwise
  the final milestone lands within the stated HORIZON.
- The pace must be honest for their hours: if the date is too tight for the time they have, say so in
  the rationale and plan the most valuable subset rather than an impossible one.
- Mark the genuinely big ones (exams, certifications, launches, first revenue) is_keystone.
- coach_note: one or two sentences of practical coaching for that milestone, the thing people get
  wrong. For example: "Most people underestimate this one. Book the exam before you feel ready."

Structure.
- ${LIMITS.minSkills}–${LIMITS.maxSkills} skills with short snake_case keys. Every quest and milestone uses one of these keys exactly.
- 1–${LIMITS.maxTracks} tracks (two only for two genuinely parallel ambitions), each with ${LIMITS.minStages}–${LIMITS.maxStages} stages.
  Stages are outcomes ("First paying customer"), not activities ("Do marketing").
- requires_milestone_titles copies milestone titles exactly, or is empty.
- ${LIMITS.minQuests}–${LIMITS.maxQuests} quest items: concrete, single-sitting units of work. Keep every detail and description
  under 12 words: the titles carry the specifics.
- weekly_load_minutes: after writing the quests, add up estimate_minutes × times_per_week and write
  the total. If it is over WEEKLY MINUTES, lower times_per_week before you finish.
- rationale: one paragraph (3–5 sentences) on why the plan is shaped this way: the order, the pace,
  and what you did with their hours and date.

Clarifying question.
- If the goal is too vague to plan well (no clear outcome, level or date), still produce the best
  plan you can, and set clarifying_question to exactly ONE short question whose answer would change
  the plan most. If the goal is clear, or a CLARIFICATION is given, set it to "".

Safety and tone.
- No medical, legal or financial advice. For health and physical goals keep to habits and training
  structure, recommend qualified instruction where safety matters (e.g. swimming lessons), and never
  prescribe diets, calories or treatment.
- Plain, warm, specific. Never scold. Plain text only: no markdown, asterisks or bullet characters.`;

export function userMessage(ctx: PlanContext): string {
  const days = workingDays(ctx.restDays);
  const rest = ctx.restDays.length ? ctx.restDays.map((d) => DAY[d] ?? '?').join(', ') : 'none';
  return [
    `TODAY: ${ctx.today} (${ctx.timezone})`,
    `GOAL (their words): ${ctx.goal}`,
    ctx.why ? `WHY IT MATTERS TO THEM: ${ctx.why}` : 'WHY IT MATTERS TO THEM: (not given)',
    `HORIZON: ${HORIZON_LABEL[ctx.horizon]} (final milestone by week ${HORIZON_WEEKS[ctx.horizon]} at the latest, unless the goal names a date)`,
    `DAILY MINUTES: ${ctx.dailyMinutes} on each of ${days} working days`,
    `WEEKLY MINUTES: ${weeklyMinutes(ctx)}`,
    `TARGET WEEKLY LOAD: about ${Math.round(weeklyMinutes(ctx) * 0.8)} minutes (sum of estimate_minutes × times_per_week)`,
    `WORKDAY WINDOW: ${ctx.workdayStart}–${ctx.workdayEnd}; rest days: ${rest}`,
    ctx.notes ? `THEIR CONSTRAINTS AND NOTES: ${ctx.notes}` : 'THEIR CONSTRAINTS AND NOTES: (none given)',
    ctx.clarification
      ? `CLARIFICATION: you asked "${ctx.clarification.question}" and they answered "${ctx.clarification.answer}"`
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/** The re-prompt: the exact problems, plus where the weekly load stands, so a fix can't quietly break it. */
export const repairMessage = (problems: string[], load?: { planned: number; budget: number }) =>
  [
    'That plan cannot be saved yet. Fix exactly these problems and return the whole corrected plan:',
    ...problems.map((p) => `- ${p}`),
    load
      ? `The weekly load is currently ${load.planned} of ${load.budget} minutes. It must end at or below ${load.budget}: do not raise any times_per_week, and lower some if you add or lengthen a quest.`
      : '',
    'Keep everything that was already right, including how specific the quests are.',
  ]
    .filter(Boolean)
    .join('\n');

// ── output schema (Anthropic structured outputs: no numeric bounds or maxItems, so the validator
//    below enforces those) ───────────────────────────────────────────────────────────────────────
const str = { type: 'string' } as const;
const obj = (properties: Record<string, unknown>) => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

export const PLAN_SCHEMA = obj({
  title: str,
  domain: { type: 'string', enum: DOMAINS },
  north_star: str,
  rationale: str,
  clarifying_question: str,
  skills: { type: 'array', items: obj({ key: str, label: str, description: str }) },
  tracks: {
    type: 'array',
    items: obj({
      key: str,
      title: str,
      goal_line: str,
      stages: { type: 'array', items: obj({ title: str, description: str, requires_milestone_titles: { type: 'array', items: str } }) },
    }),
  },
  milestones: {
    type: 'array',
    items: obj({
      title: str,
      detail: str,
      coach_note: str,
      skill: str,
      due_week: { type: 'integer' },
      target_label: str,
      is_keystone: { type: 'boolean' },
    }),
  },
  quest_items: {
    type: 'array',
    items: obj({
      title: str,
      detail: str,
      skill: str,
      kind: { type: 'string', enum: KINDS },
      estimate_minutes: { type: 'integer' },
      times_per_week: { type: 'number' },
    }),
  },
  weekly_load_minutes: { type: 'integer' },
});

// ── validation ──────────────────────────────────────────────────────────────────────────────────
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number.NaN);

/**
 * Turns whatever came back into a GeneratedPlan, mending only what is unambiguous: whitespace,
 * the case of a skill key, a milestone title referenced with different spacing or case. Anything
 * that needs judgement is left for validatePlan to report.
 */
export function normalisePlan(raw: unknown): GeneratedPlan {
  const r = isObj(raw) ? raw : {};
  const skills = arr(r.skills).filter(isObj).map((s) => ({ key: text(s.key), label: text(s.label), description: text(s.description) }));
  const skillKey = new Map(skills.map((s) => [norm(s.key), s.key]));
  const fixSkill = (v: unknown) => skillKey.get(norm(text(v))) ?? text(v);
  const milestones = arr(r.milestones).filter(isObj).map((m) => ({
    title: text(m.title),
    detail: text(m.detail),
    coach_note: text(m.coach_note),
    skill: fixSkill(m.skill),
    due_week: num(m.due_week),
    target_label: text(m.target_label),
    is_keystone: m.is_keystone === true,
  }));
  const msTitle = new Map(milestones.map((m) => [norm(m.title), m.title]));
  const domain = DOMAINS.find((d) => d === r.domain) ?? 'other';
  return {
    title: text(r.title),
    domain,
    north_star: text(r.north_star),
    rationale: text(r.rationale),
    clarifying_question: text(r.clarifying_question),
    skills,
    tracks: arr(r.tracks).filter(isObj).map((t) => ({
      key: text(t.key),
      title: text(t.title),
      goal_line: text(t.goal_line),
      stages: arr(t.stages).filter(isObj).map((s) => ({
        title: text(s.title),
        description: text(s.description),
        requires_milestone_titles: arr(s.requires_milestone_titles).map((x) => msTitle.get(norm(text(x))) ?? text(x)).filter(Boolean),
      })),
    })),
    milestones,
    quest_items: arr(r.quest_items).filter(isObj).map((q) => ({
      title: text(q.title),
      detail: text(q.detail),
      skill: fixSkill(q.skill),
      kind: KINDS.find((k) => k === q.kind) ?? 'learn',
      // Below the floor is unambiguous: a 5-minute task becomes a 10-minute one. Above the ceiling is not.
      estimate_minutes: Number.isFinite(num(q.estimate_minutes)) ? Math.max(LIMITS.minEstimate, Math.round(num(q.estimate_minutes))) : Number.NaN,
      times_per_week: num(q.times_per_week),
    })),
    weekly_load_minutes: num(r.weekly_load_minutes),
  };
}

const list = (items: string[], max = 4) =>
  items.length <= max ? items.map((s) => `"${s}"`).join(', ') : `${items.slice(0, max).map((s) => `"${s}"`).join(', ')} and ${items.length - max} more`;

/** Every reason this plan can't be saved, worded so the model can fix it. Empty = valid. */
export function validatePlan(plan: GeneratedPlan, ctx: Pick<PlanContext, 'dailyMinutes' | 'restDays' | 'horizon'>): string[] {
  const problems: string[] = [];
  const L = LIMITS;
  const keys = new Set(plan.skills.map((s) => s.key));
  const budget = weeklyMinutes(ctx);

  if (!plan.title) problems.push('title is empty.');
  if (!plan.north_star) problems.push('north_star is empty.');
  if (!plan.rationale) problems.push('rationale is empty: write one paragraph on why the plan is shaped this way.');
  if ((plan.clarifying_question.match(/\?/g) ?? []).length > 1) problems.push('clarifying_question must be exactly one question, or "".');

  // skills
  if (plan.skills.length < L.minSkills || plan.skills.length > L.maxSkills)
    problems.push(`There are ${plan.skills.length} skills; use ${L.minSkills}–${L.maxSkills}.`);
  if (keys.size !== plan.skills.length || plan.skills.some((s) => !s.key)) problems.push('Skill keys must be non-empty and unique.');

  // quests
  const q = plan.quest_items;
  if (q.length < L.minQuests) problems.push(`There are ${q.length} quest items; at least ${L.minQuests} are needed.`);
  if (q.length > L.maxQuests) problems.push(`There are ${q.length} quest items; at most ${L.maxQuests}.`);
  const badEstimate = q.filter((x) => !Number.isInteger(x.estimate_minutes) || x.estimate_minutes < L.minEstimate || x.estimate_minutes > L.maxEstimate);
  if (badEstimate.length)
    problems.push(`estimate_minutes must be a whole number from ${L.minEstimate} to ${L.maxEstimate}; these are not: ${list(badEstimate.map((x) => `${x.title} (${x.estimate_minutes})`))}.`);
  const overDay = q.filter((x) => x.estimate_minutes > ctx.dailyMinutes);
  if (overDay.length) problems.push(`These quests are longer than the ${ctx.dailyMinutes} minutes they have in a day: ${list(overDay.map((x) => x.title))}.`);
  const badSkill = q.filter((x) => !keys.has(x.skill));
  if (badSkill.length) problems.push(`These quests use a skill that is not in the skills list (${[...keys].join(', ')}): ${list(badSkill.map((x) => `${x.title} → ${x.skill || 'none'}`))}.`);
  const badCadence = q.filter((x) => !(x.times_per_week >= 0.25 && x.times_per_week <= 7));
  if (badCadence.length) problems.push(`times_per_week must be between 0.25 and 7; these are not: ${list(badCadence.map((x) => x.title))}.`);
  if (!badCadence.length && !badEstimate.length) {
    const planned = plannedWeeklyMinutes(plan);
    if (planned > budget)
    {
      const top = [...q]
        .sort((x, y) => y.estimate_minutes * y.times_per_week - x.estimate_minutes * x.times_per_week)
        .slice(0, 5)
        .map((x) => `${x.title} (${x.estimate_minutes} × ${x.times_per_week} = ${Math.round(x.estimate_minutes * x.times_per_week)})`);
      problems.push(
        `A typical week of this plan needs ${planned} minutes (sum of estimate_minutes × times_per_week), but they have ${budget} minutes a week. ` +
          `Bring it to about ${Math.round(budget * 0.8)} by lowering times_per_week (most quests 0.25–0.5) or shortening quests. Biggest contributors: ${top.join('; ')}.`,
      );
    }
    else if (planned < Math.round(budget * L.minWeeklyShare))
      problems.push(`A typical week of this plan uses only ${planned} of their ${budget} weekly minutes. Use at least ${Math.round(budget * L.minWeeklyShare)}.`);
  }

  // milestones
  const ms = plan.milestones;
  if (ms.length < L.minMilestones || ms.length > L.maxMilestones) problems.push(`There are ${ms.length} milestones; use ${L.minMilestones}–${L.maxMilestones}.`);
  const titles = new Set(ms.map((m) => m.title));
  if (titles.size !== ms.length) problems.push('Milestone titles must be unique.');
  const msSkill = ms.filter((m) => !keys.has(m.skill));
  if (msSkill.length) problems.push(`These milestones use a skill that is not in the skills list: ${list(msSkill.map((m) => `${m.title} → ${m.skill || 'none'}`))}.`);
  const noNote = ms.filter((m) => !m.coach_note);
  if (noNote.length) problems.push(`These milestones have no coach_note: ${list(noNote.map((m) => m.title))}.`);
  const badWeek = ms.filter((m) => !Number.isInteger(m.due_week) || m.due_week < 1);
  if (badWeek.length) problems.push(`due_week must be a whole number of weeks from today, 1 or more: ${list(badWeek.map((m) => m.title))}.`);
  const last = Math.max(0, ...ms.map((m) => (Number.isFinite(m.due_week) ? m.due_week : 0)));
  if (last > HORIZON_WEEKS[ctx.horizon])
    problems.push(`The last milestone is due in week ${last}, beyond their horizon (${HORIZON_LABEL[ctx.horizon]}, week ${HORIZON_WEEKS[ctx.horizon]} at the latest).`);
  if (!ms.some((m) => m.is_keystone)) problems.push('Mark at least one milestone as is_keystone.');

  // tracks and stages
  if (plan.tracks.length < 1 || plan.tracks.length > L.maxTracks) problems.push(`There are ${plan.tracks.length} tracks; use 1–${L.maxTracks}.`);
  for (const t of plan.tracks) {
    if (t.stages.length < L.minStages || t.stages.length > L.maxStages)
      problems.push(`Track "${t.title}" has ${t.stages.length} stages; use ${L.minStages}–${L.maxStages}.`);
    for (const s of t.stages) {
      const missing = s.requires_milestone_titles.filter((x) => !titles.has(x));
      if (missing.length) problems.push(`Stage "${s.title}" requires milestones that don't exist: ${list(missing)}. Copy titles exactly or leave it empty.`);
    }
  }
  if (new Set(plan.tracks.map((t) => t.key)).size !== plan.tracks.length) problems.push('Track keys must be unique.');

  return problems;
}

// ── cost ────────────────────────────────────────────────────────────────────────────────────────
/** USD per million tokens, from platform.claude.com/docs/en/about-claude/pricing (checked 2026-10-07). */
export const PRICES: Record<string, { input: number; output: number }> = {
  'claude-sonnet-5-5': { input: 2, output: 10 },
  'claude-haiku-4-5-20251001': { input: 1, output: 5 },
  'claude-haiku-4-5': { input: 1, output: 5 },
};

/** Unknown models are priced at the Sonnet 4.x rate so the ledger errs high, never at zero. */
export function costUsd(model: string, usage: { input_tokens?: number; output_tokens?: number } | null | undefined): number | null {
  if (!usage) return null;
  const p = PRICES[model] ?? { input: 3, output: 15 };
  return +(((usage.input_tokens ?? 0) / 1e6) * p.input + ((usage.output_tokens ?? 0) / 1e6) * p.output).toFixed(4);
}
