import { requireSupabase } from '../supabase';
import type { TaskPriority } from './types';

export interface TodayTask {
  id: string;
  title: string;
  estimateMinutes: number | null;
  priority: TaskPriority;
  isReview: boolean;
  isRescue: boolean;
  done: boolean;
}

export interface TodayBlock {
  id: string;
  title: string;
  kind: string;
  start: string;
  end: string;
  tasks: TodayTask[];
}

export type TodayData = { kind: 'noPlan' } | { kind: 'day'; localDate: string; blocks: TodayBlock[] };

const hhmm = (t: string) => t.slice(0, 5);

/**
 * Today's blocks and tasks. With an active plan, makes sure the day exists first: fn_generate_day
 * without p_force returns an existing day untouched, so this is safe on every open.
 * (WP3 replaces the plain rendering; the data path stays.)
 */
export async function loadToday(uid: string): Promise<TodayData> {
  const supabase = requireSupabase();
  const { count } = await supabase
    .from('plans')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', uid)
    .eq('is_active', true);
  if (!count) return { kind: 'noPlan' };

  const day = await supabase.rpc('fn_generate_day', {});
  if (day.error || !day.data) throw day.error ?? new Error('no day');

  const { data, error } = await supabase
    .from('blocks')
    .select('id, title, kind, start_local, end_local, position, tasks(id, title, estimate_minutes, priority, is_review, is_rescue, completed_at, position, parent_task_id)')
    .eq('day_plan_id', day.data.id)
    .order('position');
  if (error) throw error;

  return {
    kind: 'day',
    localDate: day.data.local_date,
    blocks: data.map((b) => ({
      id: b.id,
      title: b.title,
      kind: b.kind,
      start: hhmm(b.start_local),
      end: hhmm(b.end_local),
      tasks: [...b.tasks]
        .filter((t) => !t.parent_task_id)
        .sort((x, y) => x.position - y.position)
        .map((t) => ({
          id: t.id,
          title: t.title,
          estimateMinutes: t.estimate_minutes,
          priority: t.priority,
          isReview: t.is_review,
          isRescue: t.is_rescue,
          done: !!t.completed_at,
        })),
    })),
  };
}

const toTasks = (rows: { id: string; title: string; estimate_minutes: number | null; priority: TaskPriority; is_review: boolean; is_rescue: boolean; completed_at: string | null; position: number; parent_task_id: string | null }[]): TodayTask[] =>
  [...rows]
    .filter((t) => !t.parent_task_id)
    .sort((x, y) => x.position - y.position)
    .map((t) => ({
      id: t.id,
      title: t.title,
      estimateMinutes: t.estimate_minutes,
      priority: t.priority,
      isReview: t.is_review,
      isRescue: t.is_rescue,
      done: !!t.completed_at,
    }));

/**
 * Any other day on the strip, read only: never generates one. Days are planned ahead by
 * "Start this plan" (today and tomorrow) and, from WP3, each evening. Null when nothing is planned.
 */
export async function loadDay(uid: string, localDate: string): Promise<TodayBlock[] | null> {
  const supabase = requireSupabase();
  const { data: day, error } = await supabase
    .from('day_plans')
    .select('id')
    .eq('user_id', uid)
    .eq('local_date', localDate)
    .maybeSingle();
  if (error) throw error;
  if (!day) return null;
  const { data, error: e2 } = await supabase
    .from('blocks')
    .select('id, title, kind, start_local, end_local, position, tasks(id, title, estimate_minutes, priority, is_review, is_rescue, completed_at, position, parent_task_id)')
    .eq('day_plan_id', day.id)
    .order('position');
  if (e2) throw e2;
  return data.map((b) => ({ id: b.id, title: b.title, kind: b.kind, start: hhmm(b.start_local), end: hhmm(b.end_local), tasks: toTasks(b.tasks) }));
}

export interface PlayerStats {
  xp: number;
  streak: number;
}

/** XP (v_xp_totals) and the streak (fn_streak), read-only. The client never writes either. */
export async function loadStats(uid: string): Promise<PlayerStats> {
  const supabase = requireSupabase();
  const [xp, streak] = await Promise.all([
    supabase.from('v_xp_totals').select('xp').eq('user_id', uid).maybeSingle(),
    supabase.rpc('fn_streak', {}),
  ]);
  return { xp: xp.data?.xp ?? 0, streak: typeof streak.data === 'number' ? streak.data : 0 };
}
