import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';

import { track } from '../events';
import { requireSupabase } from '../supabase';
import { rememberDraft } from './goals';
import type { GoalRow } from './types';

export type PlanMode = { kind: 'template'; templateKey: string } | { kind: 'ai' };

export type CreatePlanResult =
  | { ok: true; planId: string }
  | { ok: false; reason: 'rate_limited' | 'failed' | 'offline' };

/**
 * The one way to make a plan. Template → fn_apply_template; AI → the generate-plan Edge Function.
 * Both write the same rows; afterwards this function makes them a *draft* in exactly the same
 * way, so nothing downstream can tell which path ran:
 *  - the plan is inactive until "Start this plan";
 *  - its quests are retired, so fn_generate_day (which draws from every un-retired quest the user
 *    owns) cannot pull an unreviewed draft into a day;
 *  - the goal keeps the user's own title (both paths overwrite it with the template's / model's).
 */
export async function createPlan(goal: GoalRow, mode: PlanMode): Promise<CreatePlanResult> {
  const supabase = requireSupabase();
  let planId: string;

  if (mode.kind === 'template') {
    const { data, error } = await supabase.rpc('fn_apply_template', { p_goal: goal.id, p_template: mode.templateKey });
    if (error || !data) return { ok: false, reason: /fetch|network/i.test(error?.message ?? '') ? 'offline' : 'failed' };
    planId = data.id;
  } else {
    const { data, error } = await supabase.functions.invoke<{ plan_id: string }>('generate-plan', {
      body: { goal_id: goal.id },
    });
    if (error) {
      if (error instanceof FunctionsHttpError && (error.context as Response | undefined)?.status === 429) {
        return { ok: false, reason: 'rate_limited' };
      }
      return { ok: false, reason: error instanceof FunctionsFetchError ? 'offline' : 'failed' };
    }
    if (!data?.plan_id) return { ok: false, reason: 'failed' };
    planId = data.plan_id;
  }

  const now = new Date().toISOString();
  const [deactivate, retire, title] = await Promise.all([
    supabase.from('plans').update({ is_active: false }).eq('id', planId),
    supabase.from('quest_items').update({ retired_at: now }).eq('plan_id', planId),
    supabase.from('goals').update({ title: goal.title }).eq('id', goal.id),
  ]);
  if (deactivate.error || retire.error || title.error) return { ok: false, reason: 'failed' };

  rememberDraft({ uid: goal.user_id, goalId: goal.id, planId });
  track('plan_generated', { goal_id: goal.id, plan_id: planId });
  return { ok: true, planId };
}
