import { track } from '../events';
import { kv } from '../kv';
import { requireSupabase } from '../supabase';
import { titleFrom } from './titles';
import type { GoalConstraints, GoalHorizon, GoalRow, GoalUpdate } from './types';

export async function createGoal(uid: string, rawInput: string): Promise<GoalRow> {
  const { data, error } = await requireSupabase()
    .from('goals')
    .insert({ user_id: uid, raw_input: rawInput.trim(), title: titleFrom(rawInput) })
    .select()
    .single();
  if (error) throw error;
  track('goal_created', { goal_id: data.id, words: rawInput.trim().split(/\s+/).length });
  return data;
}

export interface GoalPatch {
  raw_input?: string;
  why?: string | null;
  horizon?: GoalHorizon;
  constraints?: GoalConstraints;
}

/** Saves each wizard step as it happens, so a dropped session is recoverable. */
export async function updateGoal(goalId: string, patch: GoalPatch): Promise<GoalRow> {
  const update: GoalUpdate = { updated_at: new Date().toISOString() };
  if (patch.raw_input !== undefined) {
    update.raw_input = patch.raw_input.trim();
    update.title = titleFrom(patch.raw_input);
  }
  if (patch.why !== undefined) update.why = patch.why;
  if (patch.horizon !== undefined) update.horizon = patch.horizon;
  if (patch.constraints !== undefined) update.constraints = patch.constraints;
  const { data, error } = await requireSupabase().from('goals').update(update).eq('id', goalId).select().single();
  if (error) throw error;
  return data;
}

export async function getGoal(goalId: string): Promise<GoalRow | null> {
  const { data } = await requireSupabase().from('goals').select('*').eq('id', goalId).maybeSingle();
  return data;
}

/** The goal behind the user's active plan (for "Change my plan"), if any. */
export async function activeGoal(uid: string): Promise<{ goal: GoalRow; version: number } | null> {
  const supabase = requireSupabase();
  const { data: plan } = await supabase
    .from('plans')
    .select('goal_id, version')
    .eq('user_id', uid)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!plan) return null;
  const goal = await getGoal(plan.goal_id);
  return goal ? { goal, version: plan.version } : null;
}

/** A goal started in the wizard but never given a plan: resume it instead of starting over. */
export async function unfinishedGoal(uid: string): Promise<GoalRow | null> {
  const { data } = await requireSupabase()
    .from('goals')
    .select('*, plans(id)')
    .eq('user_id', uid)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(5);
  const row = data?.find((g) => (g.plans ?? []).length === 0);
  if (!row) return null;
  const { plans: _plans, ...goal } = row;
  return goal;
}

export const constraintsOf = (g: GoalRow): GoalConstraints => {
  const c = g.constraints;
  if (!c || typeof c !== 'object' || Array.isArray(c)) return {};
  return {
    daily_minutes: typeof c.daily_minutes === 'number' ? c.daily_minutes : undefined,
    notes: typeof c.notes === 'string' ? c.notes : undefined,
  };
};

// ── Device-local pointer to a draft under review (UI state never goes in the database) ─────────
const DRAFT_KEY = 'stickler.intake.draft';
export interface DraftPointer {
  uid: string;
  goalId: string;
  planId: string;
}
export const rememberDraft = (p: DraftPointer) => kv.setJSON(DRAFT_KEY, p);
export const forgetDraft = () => kv.remove(DRAFT_KEY);
export const pendingDraft = (uid: string): DraftPointer | null => {
  const p = kv.getJSON<DraftPointer>(DRAFT_KEY);
  return p && p.uid === uid ? p : null;
};
