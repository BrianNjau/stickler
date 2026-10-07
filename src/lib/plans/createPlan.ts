import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';

import { track } from '../events';
import { requireSupabase } from '../supabase';
import { rememberDraft } from './goals';
import type { GoalRow } from './types';

export type PlanMode = { kind: 'template'; templateKey: string } | { kind: 'ai' };

/**
 * Why a plan wasn't made. Every one of these ends on the shape picker (or, for `invalid`, on the
 * closest template) with a plain sentence — never a dead end.
 *  - rate_limited: this user's drafts for the week are used up
 *  - busy: the global daily brake (DAILY_GLOBAL_CAP) is on
 *  - unavailable: AI is live in the app but the server has no key
 *  - invalid: the model's plan failed validation twice
 */
export type CreatePlanFailure = 'rate_limited' | 'busy' | 'unavailable' | 'invalid' | 'failed' | 'offline' | 'cancelled';

export type CreatePlanResult = { ok: true; planId: string; draftsLeft: number | null } | { ok: false; reason: CreatePlanFailure };

const AI_ERRORS: Record<string, CreatePlanFailure> = {
  rate_limited: 'rate_limited',
  busy: 'busy',
  not_configured: 'unavailable',
  invalid_plan: 'invalid',
};

async function aiFailure(error: unknown, signal?: AbortSignal): Promise<CreatePlanFailure> {
  if (signal?.aborted) return 'cancelled';
  if (error instanceof FunctionsFetchError) return 'offline';
  if (error instanceof FunctionsHttpError) {
    const res = error.context as Response | undefined;
    const body: unknown = await res?.json().catch(() => null);
    const code = body && typeof body === 'object' && 'error' in body && typeof body.error === 'string' ? body.error : '';
    return AI_ERRORS[code] ?? (res?.status === 429 ? 'rate_limited' : 'failed');
  }
  return 'failed';
}

/**
 * The one way to make a plan. Template → fn_apply_template; AI → the generate-plan Edge Function.
 * Both write the same rows; afterwards this function makes them a *draft* in exactly the same
 * way, so nothing downstream can tell which path ran:
 *  - the plan is inactive until "Start this plan";
 *  - its quests are retired, so fn_generate_day (which draws from every un-retired quest the user
 *    owns) cannot pull an unreviewed draft into a day;
 *  - the goal keeps the user's own title (the template path overwrites it).
 * The Edge Function already saves its plans this way; repeating it here is harmless.
 */
export async function createPlan(goal: GoalRow, mode: PlanMode, opts: { signal?: AbortSignal } = {}): Promise<CreatePlanResult> {
  const supabase = requireSupabase();
  let planId: string;
  let draftsLeft: number | null = null;

  if (mode.kind === 'template') {
    const { data, error } = await supabase.rpc('fn_apply_template', { p_goal: goal.id, p_template: mode.templateKey });
    if (error || !data) return { ok: false, reason: /fetch|network/i.test(error?.message ?? '') ? 'offline' : 'failed' };
    planId = data.id;
  } else {
    const { data, error } = await supabase.functions.invoke<{ plan_id: string; remaining?: number }>('generate-plan', {
      body: { goal_id: goal.id },
      signal: opts.signal,
    });
    if (error) {
      const reason = await aiFailure(error, opts.signal);
      track('plan_ai_failed', { goal_id: goal.id, reason });
      return { ok: false, reason };
    }
    if (!data?.plan_id) return { ok: false, reason: 'failed' };
    planId = data.plan_id;
    draftsLeft = typeof data.remaining === 'number' ? data.remaining : null;
  }
  if (opts.signal?.aborted) return { ok: false, reason: 'cancelled' };

  const now = new Date().toISOString();
  const [deactivate, retire, title] = await Promise.all([
    supabase.from('plans').update({ is_active: false }).eq('id', planId),
    supabase.from('quest_items').update({ retired_at: now }).eq('plan_id', planId),
    supabase.from('goals').update({ title: goal.title }).eq('id', goal.id),
  ]);
  if (deactivate.error || retire.error || title.error) return { ok: false, reason: 'failed' };

  rememberDraft({ uid: goal.user_id, goalId: goal.id, planId });
  track('plan_generated', { goal_id: goal.id, plan_id: planId });
  return { ok: true, planId, draftsLeft };
}

export interface AiQuota {
  limit: number;
  used: number;
  remaining: number;
  /** When the oldest draft in the rolling week drops off. */
  resetsAt: string | null;
  /** False when the server has no model key: drafting is off, templates still work. */
  configured: boolean;
}

/** This user's drafted plans for the rolling week, from the Edge Function (the caps live there). */
export async function fetchAiQuota(): Promise<AiQuota | null> {
  const { data, error } = await requireSupabase().functions.invoke<{
    limit: number;
    used: number;
    remaining: number;
    resets_at: string | null;
    configured: boolean;
  }>('generate-plan', { body: { action: 'quota' } });
  if (error || !data) return null;
  return { limit: data.limit, used: data.used, remaining: data.remaining, resetsAt: data.resets_at, configured: data.configured };
}
