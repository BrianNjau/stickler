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
