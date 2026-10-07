import { requireSupabase } from '../supabase';
import { summariseShape, type PlanShape } from './shapes';

export async function listShapes(): Promise<PlanShape[]> {
  const { data, error } = await requireSupabase()
    .from('plan_templates')
    .select('key, title, domain, blurb, payload')
    .order('position');
  if (error) throw error;
  return data.map(summariseShape);
}
