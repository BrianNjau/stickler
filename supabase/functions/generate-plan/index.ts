// supabase/functions/generate-plan/index.ts
// Turns a user's plain-language goal into a plan: tracks, stages, milestones and a quest library.
// Called from the goal-intake wizard. This is the only place an LLM key is ever used.
//
// deploy:  supabase functions deploy generate-plan --use-api
// secrets: ANTHROPIC_API_KEY (required), PLAN_MODEL (optional; defaults to claude-sonnet-5-5),
//          PLAN_EFFORT (optional; low | medium | high, default low; ignored for Haiku 4.5).
//          SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided by the platform.
//
// POST { goal_id }            → { plan_id, clarifying_question, repaired, remaining }
// POST { action: 'quota' }    → { limit, used, remaining, resets_at, configured }
// Errors: 429 rate_limited | 429 busy | 422 invalid_plan | 503 not_configured | 502 generation_failed

import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

import {
  costUsd,
  MIN_PLANNABLE_WEEKLY,
  normalisePlan,
  PLAN_SCHEMA,
  plannedWeeklyMinutes,
  repairMessage,
  SYSTEM,
  userMessage,
  validatePlan,
  weeklyMinutes,
  type GeneratedPlan,
  type Horizon,
  type PlanContext,
} from '../_shared/plan.ts';

const MODEL = Deno.env.get('PLAN_MODEL')?.trim() || 'claude-sonnet-5-5';
/**
 * Sonnet 5.5 thinks by default (it can't be switched off) and thinking counts toward
 * MAX_OUTPUT_TOKENS: at its default `high` effort it spent the whole 8000 before finishing the JSON.
 * `low` keeps some thinking for the arithmetic. Haiku 4.5 doesn't take an effort setting.
 */
const EFFORT = MODEL.startsWith('claude-haiku-4-5') ? null : Deno.env.get('PLAN_EFFORT')?.trim() || 'low';
const PROMPT_VERSION = 'plan-v2';
const MAX_GENERATIONS_PER_WEEK = 3; // per user, rolling 7 days; a repair re-prompt is part of the same generation
const DAILY_GLOBAL_CAP = 150; // model calls across all users per UTC day
const MAX_OUTPUT_TOKENS = 8000;
/** Supabase stops a request at 150 s; leave room to save the plan and answer. */
const DEADLINE_MS = 135_000;
/** Don't start a repair re-prompt with less time than this left. */
const MIN_CALL_MS = 35_000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Message = { role: 'user' | 'assistant'; content: string };
type Usage = { input_tokens?: number; output_tokens?: number };
type CallResult =
  | { ok: true; raw: unknown; text: string; truncated: boolean; usage: Usage | null }
  | { ok: false; error: string; usage: Usage | null };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const started = Date.now();

  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return json({ error: 'unauthorized' }, 401);

  const body = await req.json().catch(() => ({}));
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  const quota = await weeklyQuota(admin, user.id);

  if (body?.action === 'quota') return json({ ...quota, configured: !!apiKey });

  // Read as the user, so RLS decides: someone else's goal is simply not found.
  const goalId = typeof body?.goal_id === 'string' ? body.goal_id : '';
  const ctx = await planContext(asUser, goalId);
  if (!ctx) return json({ error: 'goal_not_found' }, 404);

  if (!apiKey) {
    // A missing key must never crash a screen: the app falls back to the templates.
    console.error('[generate-plan] ANTHROPIC_API_KEY is not set; refusing to generate');
    return json({ error: 'not_configured' }, 503);
  }
  if (quota.remaining <= 0) {
    return json({ error: 'rate_limited', message: 'Plan generation limit reached for this week.', resets_at: quota.resets_at }, 429);
  }
  const utcMidnight = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z').toISOString();
  const { count: today } = await admin.from('ai_generations').select('id', { count: 'exact', head: true }).gte('created_at', utcMidnight);
  if ((today ?? 0) >= DAILY_GLOBAL_CAP) {
    console.error(`[generate-plan] DAILY_GLOBAL_CAP (${DAILY_GLOBAL_CAP}) reached`);
    return json({ error: 'busy', message: 'Stickler has drafted all the plans it can today.' }, 429);
  }

  // A plan can't fit this little time at all: say so without spending a model call.
  if (weeklyMinutes(ctx.plan) < MIN_PLANNABLE_WEEKLY) {
    const problem = `${weeklyMinutes(ctx.plan)} minutes a week is too little for a drafted plan (minimum ${MIN_PLANNABLE_WEEKLY}).`;
    return json({ error: 'invalid_plan', problems: [problem] }, 422);
  }

  // ── attempt 1, then at most one repair ──────────────────────────────────────────────────────
  const messages: Message[] = [{ role: 'user', content: userMessage(ctx.plan) }];
  let plan: GeneratedPlan | null = null;
  let problems: string[] = [];
  for (const attempt of [1, 2] as const) {
    const left = DEADLINE_MS - (Date.now() - started);
    if (attempt === 2 && left < MIN_CALL_MS) {
      problems = [...problems, 'No time left for a second attempt.'];
      break;
    }
    const kind = attempt === 1 ? 'plan' : 'plan_repair';
    const logId = await logStart(admin, user.id, goalId, kind);
    const r = await callModel(apiKey, messages, left);
    if (!r.ok) {
      await logEnd(admin, logId, r.usage, 'error', r.error);
      // A failed repair (usually the clock) still has a plan that didn't validate: fall back to a template.
      if (attempt === 2) return json({ error: 'invalid_plan', problems: [...problems, `Repair attempt failed: ${r.error.slice(0, 120)}`] }, 422);
      return json({ error: 'generation_failed' }, 502);
    }
    const candidate = normalisePlan(r.raw);
    problems = r.truncated
      ? ['The plan was cut off at the output limit. Make it shorter: fewer quests and one-line details.']
      : r.raw === null
        ? ['The answer was not valid JSON for the schema.']
        : validatePlan(candidate, ctx.plan);
    await logEnd(admin, logId, r.usage, problems.length ? 'invalid' : 'ok', problems.length ? problems.join(' | ').slice(0, 1000) : null);
    console.log(JSON.stringify({
      event: 'plan_attempt', attempt, model: MODEL, ms: Date.now() - started, problems: problems.length,
      weekly: { planned: plannedWeeklyMinutes(candidate), budget: weeklyMinutes(ctx.plan) },
    }));
    if (!problems.length) {
      plan = candidate;
      break;
    }
    messages.push({ role: 'assistant', content: r.text }, { role: 'user', content: repairMessage(problems, { planned: plannedWeeklyMinutes(candidate), budget: weeklyMinutes(ctx.plan) }) });
  }

  if (!plan) {
    // The app falls back to the closest template and says so plainly.
    return json({ error: 'invalid_plan', problems }, 422);
  }

  const saved = await savePlan(admin, user.id, goalId, plan);
  if (!saved.ok) {
    console.error('[generate-plan] save failed:', saved.error);
    return json({ error: 'generation_failed' }, 502);
  }

  await admin.from('events').insert({
    user_id: user.id,
    name: 'plan_generated_ai',
    props: { goal_id: goalId, ms: Date.now() - started, quests: plan.quest_items.length, repaired: messages.length > 1, model: MODEL },
  });

  return json({
    plan_id: saved.planId,
    clarifying_question: plan.clarifying_question || null,
    repaired: messages.length > 1,
    remaining: Math.max(0, quota.remaining - 1),
  });
});

// ── context ─────────────────────────────────────────────────────────────────────────────────────
const HORIZONS: Horizon[] = ['weeks', 'months', 'year', 'multi_year'];

async function planContext(asUser: SupabaseClient, goalId: string): Promise<{ plan: PlanContext } | null> {
  if (!goalId) return null;
  const [goal, settings, profile] = await Promise.all([
    asUser.from('goals').select('*').eq('id', goalId).maybeSingle(),
    asUser.from('user_settings').select('*').maybeSingle(),
    asUser.from('profiles').select('timezone').maybeSingle(),
  ]);
  const g = goal.data;
  if (!g) return null;
  const s = settings.data ?? {};
  const c = g.constraints && typeof g.constraints === 'object' ? g.constraints : {};
  const timezone = validZone(profile.data?.timezone) ?? 'UTC';
  const clar = c.clarification;
  return {
    plan: {
      goal: String(g.raw_input ?? ''),
      why: g.why ? String(g.why) : null,
      horizon: HORIZONS.find((h) => h === g.horizon) ?? 'months',
      today: new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date()),
      timezone,
      dailyMinutes: Number(c.daily_minutes) || Number(s.daily_capacity_minutes) || 120,
      restDays: Array.isArray(s.rest_days) ? s.rest_days.map(Number) : [0],
      workdayStart: String(s.workday_start ?? '08:00').slice(0, 5),
      workdayEnd: String(s.workday_end ?? '18:00').slice(0, 5),
      notes: typeof c.notes === 'string' && c.notes.trim() ? c.notes.trim() : null,
      clarification:
        clar && typeof clar.question === 'string' && typeof clar.answer === 'string' && clar.answer.trim()
          ? { question: clar.question, answer: clar.answer.trim() }
          : null,
    },
  };
}

function validZone(tz: unknown): string | null {
  if (typeof tz !== 'string' || !tz) return null;
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz });
    return tz;
  } catch {
    return null;
  }
}

// ── quota and the ledger ────────────────────────────────────────────────────────────────────────
async function weeklyQuota(admin: SupabaseClient, uid: string) {
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  // Failed calls (API errors) don't use up a user's week; invalid and pending ones do.
  const { data } = await admin
    .from('ai_generations')
    .select('created_at')
    .eq('user_id', uid)
    .eq('kind', 'plan')
    .neq('status', 'error')
    .gte('created_at', since)
    .order('created_at', { ascending: true });
  const used = data?.length ?? 0;
  const oldest = data?.[0]?.created_at;
  return {
    limit: MAX_GENERATIONS_PER_WEEK,
    used,
    remaining: Math.max(0, MAX_GENERATIONS_PER_WEEK - used),
    resets_at: oldest ? new Date(new Date(oldest).getTime() + 7 * 864e5).toISOString() : null,
  };
}

/** One row per model call, written before the call so a crash or timeout still leaves a trace. */
async function logStart(admin: SupabaseClient, uid: string, goalId: string, kind: string): Promise<string | null> {
  const { data } = await admin
    .from('ai_generations')
    .insert({ user_id: uid, kind, goal_id: goalId, model: MODEL, prompt_version: PROMPT_VERSION, status: 'pending' })
    .select('id')
    .single();
  return data?.id ?? null;
}

async function logEnd(admin: SupabaseClient, id: string | null, usage: Usage | null, status: string, error: string | null) {
  const cost = costUsd(MODEL, usage);
  console.log(JSON.stringify({ event: 'plan_call', model: MODEL, status, input_tokens: usage?.input_tokens ?? null, output_tokens: usage?.output_tokens ?? null, cost_usd: cost }));
  if (!id) return;
  await admin
    .from('ai_generations')
    .update({ input_tokens: usage?.input_tokens ?? null, output_tokens: usage?.output_tokens ?? null, cost_usd: cost, status, error })
    .eq('id', id);
}

// ── the model ───────────────────────────────────────────────────────────────────────────────────
async function callModel(apiKey: string, messages: Message[], timeLeftMs: number): Promise<CallResult> {
  let res: Response;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: AbortSignal.timeout(Math.max(5_000, timeLeftMs)),
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        system: SYSTEM,
        messages,
        output_config: { format: { type: 'json_schema', schema: PLAN_SCHEMA }, ...(EFFORT ? { effort: EFFORT } : {}) },
      }),
    });
  } catch (e) {
    return { ok: false, error: `fetch: ${e instanceof Error ? e.message : String(e)}`, usage: null };
  }
  const payload = await res.json().catch(() => null);
  const usage: Usage | null = payload?.usage ?? null;
  if (!res.ok) return { ok: false, error: `${res.status}: ${JSON.stringify(payload?.error ?? payload).slice(0, 500)}`, usage };
  if (payload?.stop_reason === 'refusal') return { ok: false, error: 'refusal', usage };
  const text: string = (payload?.content ?? []).filter((c: { type?: string }) => c.type === 'text').map((c: { text?: string }) => c.text ?? '').join('');
  let raw: unknown = null;
  try {
    raw = JSON.parse(text);
  } catch {
    raw = null;
  }
  return { ok: true, raw, text, truncated: payload?.stop_reason === 'max_tokens', usage };
}

// ── saving ──────────────────────────────────────────────────────────────────────────────────────
/**
 * Saved as a draft from the start: inactive, quests retired, the goal's title untouched. The app
 * makes template plans a draft the same way, and "Start this plan" is the only thing that makes a
 * plan live — so a generation the user abandoned can never leak into their days.
 */
async function savePlan(admin: SupabaseClient, uid: string, goalId: string, plan: GeneratedPlan): Promise<{ ok: true; planId: string } | { ok: false; error: string }> {
  const { data: prev } = await admin.from('plans').select('version').eq('goal_id', goalId).order('version', { ascending: false }).limit(1);
  const { data: planRow, error } = await admin
    .from('plans')
    .insert({
      user_id: uid,
      goal_id: goalId,
      version: (prev?.[0]?.version ?? 0) + 1,
      summary: plan.rationale,
      north_star: plan.north_star,
      skills: plan.skills,
      clarifying_question: plan.clarifying_question || null,
      generated_by: 'ai',
      model: MODEL,
      is_active: false,
    })
    .select('id')
    .single();
  if (error || !planRow) return { ok: false, error: error?.message ?? 'no plan row' };
  const planId: string = planRow.id;
  const fail = async (msg: string) => {
    await admin.from('plans').delete().eq('id', planId); // cascades to tracks, stages, milestones, quests
    return { ok: false as const, error: msg };
  };

  const ms = await admin
    .from('milestones')
    .insert(plan.milestones.map((m, i) => ({
      plan_id: planId, user_id: uid, title: m.title, detail: m.detail || null, coach_note: m.coach_note, skill: m.skill,
      target_label: m.target_label, is_keystone: m.is_keystone, position: i,
      xp_value: m.is_keystone ? 500 : 300, token_value: m.is_keystone ? 5 : 3,
    })))
    .select('id, title');
  if (ms.error) return fail(ms.error.message);
  const msId = new Map((ms.data ?? []).map((m: { id: string; title: string }) => [m.title, m.id]));

  for (const [ti, t] of plan.tracks.entries()) {
    const tr = await admin
      .from('tracks')
      .insert({ plan_id: planId, user_id: uid, key: t.key || `track_${ti + 1}`, title: t.title, goal_line: t.goal_line, position: ti })
      .select('id')
      .single();
    if (tr.error || !tr.data) return fail(tr.error?.message ?? 'no track row');
    const st = await admin.from('stages').insert(t.stages.map((s, si) => ({
      track_id: tr.data.id, user_id: uid, title: s.title, description: s.description, position: si,
      requires_milestones: s.requires_milestone_titles.map((x) => msId.get(x)).filter(Boolean),
    })));
    if (st.error) return fail(st.error.message);
  }

  const retired = new Date().toISOString();
  const qi = await admin.from('quest_items').insert(plan.quest_items.map((q) => ({
    user_id: uid, plan_id: planId, title: q.title, detail: q.detail || null, skill: q.skill, kind: q.kind,
    estimate_minutes: q.estimate_minutes, source: 'ai', retired_at: retired,
    default_priority: q.estimate_minutes >= 30 ? 'main' : 'side',
  })));
  if (qi.error) return fail(qi.error.message);

  // The domain helps later (mascot lines per world). The title stays the user's own.
  await admin.from('goals').update({ domain: plan.domain }).eq('id', goalId);
  return { ok: true, planId };
}

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...CORS, 'content-type': 'application/json' } });
}
