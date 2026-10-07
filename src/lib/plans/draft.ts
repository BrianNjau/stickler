import type { Json } from '@shared/database.types';

import { track } from '../events';
import { requireSupabase } from '../supabase';
import { forgetDraft } from './goals';
import { clampEstimate, isNewQuest, type PlanDraft, type PlanSkill } from './types';

const skillsFrom = (v: Json): PlanSkill[] =>
  (Array.isArray(v) ? v : []).flatMap((s) =>
    s && typeof s === 'object' && !Array.isArray(s) && typeof s.key === 'string'
      ? [{ key: s.key, label: typeof s.label === 'string' ? s.label : s.key }]
      : [],
  );

/** Reads a plan into the editable shape the review screen works on. Same for every creation path. */
export async function loadDraft(planId: string): Promise<PlanDraft> {
  const supabase = requireSupabase();
  const [plan, tracks, milestones, quests] = await Promise.all([
    supabase.from('plans').select('*').eq('id', planId).single(),
    supabase.from('tracks').select('*, stages(*)').eq('plan_id', planId).order('position'),
    supabase.from('milestones').select('*').eq('plan_id', planId).order('position'),
    supabase.from('quest_items').select('*').eq('plan_id', planId).order('created_at'),
  ]);
  if (plan.error) throw plan.error;
  if (tracks.error) throw tracks.error;
  if (milestones.error) throw milestones.error;
  if (quests.error) throw quests.error;
  const p = plan.data;

  return {
    planId,
    goalId: p.goal_id,
    version: p.version,
    northStar: p.north_star ?? '',
    summary: p.summary ?? '',
    skills: skillsFrom(p.skills),
    tracks: tracks.data.map((t) => ({
      id: t.id,
      title: t.title,
      goalLine: t.goal_line,
      stages: [...t.stages]
        .sort((a, b) => a.position - b.position)
        .map((s) => ({
          id: s.id,
          title: s.title,
          description: s.description,
          requiresMilestones: s.requires_milestones ?? [],
          deleted: false,
        })),
    })),
    milestones: milestones.data.map((m) => ({
      id: m.id,
      title: m.title,
      detail: m.detail,
      skill: m.skill,
      targetLabel: m.target_label ?? '',
      isKeystone: m.is_keystone,
      deleted: false,
    })),
    quests: quests.data.map((q) => ({
      id: q.id,
      title: q.title,
      skill: q.skill,
      kind: q.kind,
      estimateMinutes: q.estimate_minutes,
      deleted: false,
    })),
  };
}

export type CommitResult = { ok: true; today: string } | { ok: false; message: string };

const fail = (message: string): CommitResult => ({ ok: false, message });
const TRY_AGAIN = 'That didn’t save. Nothing is lost — try “Start this plan” again.';

/**
 * "Start this plan": the only commit point. Applies the review edits, makes this the one active
 * plan (older plans stay as history, their quests retired), then generates today and tomorrow so
 * the rotation is proven end to end. Every step is safe to repeat if a later one fails.
 */
export async function commitDraft(draft: PlanDraft, original: PlanDraft, uid: string): Promise<CommitResult> {
  const supabase = requireSupabase();
  const before = new Map(original.quests.map((q) => [q.id, q]));
  const liveMilestones = new Set(draft.milestones.filter((m) => !m.deleted).map((m) => m.id));

  // 1. Stages: renames and deletions. Requirements pointing at deleted milestones are dropped.
  const stageWrites = await Promise.all(
    draft.tracks.flatMap((t) => t.stages).map((s) =>
      s.deleted
        ? supabase.from('stages').delete().eq('id', s.id)
        : supabase
            .from('stages')
            .update({
              title: s.title.trim() || 'Untitled stage',
              requires_milestones: s.requiresMilestones.filter((id) => liveMilestones.has(id)),
            })
            .eq('id', s.id),
    ),
  );
  if (stageWrites.some((r) => r.error)) return fail(TRY_AGAIN);

  // 2. Milestones: renames, retimes and deletions.
  const milestoneWrites = await Promise.all(
    draft.milestones.map((m) =>
      m.deleted
        ? supabase.from('milestones').delete().eq('id', m.id)
        : supabase
            .from('milestones')
            .update({ title: m.title.trim() || 'Untitled milestone', target_label: m.targetLabel.trim() || null })
            .eq('id', m.id),
    ),
  );
  if (milestoneWrites.some((r) => r.error)) return fail(TRY_AGAIN);

  // 3. Quests: edits, removals and the user's own additions. Estimates clamp to the column's 5–240.
  const added = draft.quests.filter((q) => isNewQuest(q) && !q.deleted && q.title.trim());
  if (added.length) {
    const r = await supabase.from('quest_items').insert(
      added.map((q) => ({
        user_id: uid,
        plan_id: draft.planId,
        title: q.title.trim(),
        skill: q.skill,
        kind: q.kind,
        estimate_minutes: clampEstimate(q.estimateMinutes),
        default_priority: clampEstimate(q.estimateMinutes) >= 30 ? ('main' as const) : ('side' as const),
        source: 'user',
        retired_at: null,
      })),
    );
    if (r.error) return fail(TRY_AGAIN);
  }
  const questWrites = await Promise.all(
    draft.quests
      .filter((x) => !isNewQuest(x))
      .map((q) =>
        q.deleted
          ? supabase.from('quest_items').delete().eq('id', q.id)
          : supabase
              .from('quest_items')
              .update({
                title: q.title.trim() || before.get(q.id)?.title || 'Untitled quest',
                estimate_minutes: clampEstimate(q.estimateMinutes),
                retired_at: null, // drafts are created retired; committing brings them into rotation
              })
              .eq('id', q.id),
      ),
  );
  if (questWrites.some((r) => r.error)) return fail(TRY_AGAIN);

  // 4. Exactly one active plan: this one. Older plans and their quests stay, retired, as history.
  const now = new Date().toISOString();
  const retireOld = await supabase
    .from('quest_items')
    .update({ retired_at: now })
    .eq('user_id', uid)
    .neq('plan_id', draft.planId)
    .is('retired_at', null);
  const deactivate = await supabase.from('plans').update({ is_active: false }).eq('user_id', uid).neq('id', draft.planId);
  const activate = await supabase.from('plans').update({ is_active: true }).eq('id', draft.planId);
  if (retireOld.error || deactivate.error || activate.error) return fail(TRY_AGAIN);

  // 5. Prove the rotation: today and tomorrow, regenerated from the new library.
  const today = await supabase.rpc('fn_generate_day', { p_force: true });
  if (today.error || !today.data) return fail('Your plan is saved, but today couldn’t be laid out. Open Today to try again.');
  const tomorrow = await supabase.rpc('fn_generate_day', { p_date: addDays(today.data.local_date, 1), p_force: true });
  if (tomorrow.error) return fail('Your plan is saved, but tomorrow couldn’t be laid out yet. Today is ready.');

  forgetDraft();
  track('plan_edited', {
    plan_id: draft.planId,
    stages_removed: draft.tracks.flatMap((t) => t.stages).filter((s) => s.deleted).length,
    milestones_removed: draft.milestones.filter((m) => m.deleted).length,
    quests_added: added.length,
    quests_removed: draft.quests.filter((q) => q.deleted && !isNewQuest(q)).length,
  });
  track('day_generated', { local_date: today.data.local_date, source: 'plan_start' });
  return { ok: true, today: today.data.local_date };
}

/** "2026-10-07" + 1 → "2026-10-08", in calendar terms (no timezone drift). */
export function addDays(isoDate: string, n: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const t = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + n));
  return t.toISOString().slice(0, 10);
}
