import type { Json } from '@shared/database.types';

import { getAuth } from './auth/state';
import { supabase } from './supabase';

/**
 * Analytics, the plain way: a row in `events` (AGENT_TASKS: "emit from day one"). Fire-and-forget;
 * a lost event never blocks or breaks the user.
 */
export function track(name: string, props: Record<string, Json> = {}): void {
  const uid = getAuth().user?.id;
  if (!supabase || !uid) return;
  supabase
    .from('events')
    .insert({ user_id: uid, name, props })
    .then(() => {}, () => {});
}
