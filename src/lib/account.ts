import { useSyncExternalStore } from 'react';

import type { Database } from '@shared/database.types';

import { kv } from './kv';
import { requireSupabase } from './supabase';

type Tables = Database['public']['Tables'];
export type ProfileRow = Tables['profiles']['Row'];
export type SettingsRow = Tables['user_settings']['Row'];
export type ProfilePatch = Pick<Tables['profiles']['Update'], 'display_name' | 'timezone' | 'onboarded_at'>;
export type SettingsPatch = Omit<Tables['user_settings']['Update'], 'user_id' | 'updated_at'>;

export interface Account {
  uid: string;
  profile: ProfileRow;
  settings: SettingsRow;
}

interface AccountState {
  account: Account | null;
  loading: boolean;
  /** Set when the server could not be reached and we are showing the cached copy (or nothing). */
  stale: boolean;
}

// Last-known rows per user, so Settings renders offline. Not secret: no tokens, no email.
const cacheKey = (uid: string) => `stickler.account.${uid}`;

let state: AccountState = { account: null, loading: false, stale: false };
const listeners = new Set<() => void>();
function publish(next: Partial<AccountState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

let currentUid: string | null = null;

/** Loads (or clears, for null) the signed-in user's profile and settings. Cached copy first. */
export async function loadAccount(uid: string | null): Promise<void> {
  currentUid = uid;
  if (!uid) {
    publish({ account: null, loading: false, stale: false });
    return;
  }
  const cached = kv.getJSON<Account>(cacheKey(uid));
  publish({ account: cached?.uid === uid ? cached : null, loading: true, stale: false });

  const supabase = requireSupabase();
  const [p, s] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', uid).single(),
    supabase.from('user_settings').select('*').eq('user_id', uid).single(),
  ]);
  if (currentUid !== uid) return; // signed out or switched while loading
  if (p.error || s.error) {
    publish({ loading: false, stale: true });
    return;
  }
  const account: Account = { uid, profile: p.data, settings: s.data };
  kv.setJSON(cacheKey(uid), account);
  publish({ account, loading: false, stale: false });
}

export type SaveResult = { ok: true } | { ok: false; message: string };

/** Writes both rows (handle_new_user created them, so these are updates) and refreshes the copy. */
export async function saveAccount(uid: string, profile: ProfilePatch, settings: SettingsPatch): Promise<SaveResult> {
  const supabase = requireSupabase();
  const [p, s] = await Promise.all([
    supabase.from('profiles').update({ ...profile, updated_at: new Date().toISOString() }).eq('id', uid).select().single(),
    supabase.from('user_settings').update({ ...settings, updated_at: new Date().toISOString() }).eq('user_id', uid).select().single(),
  ]);
  if (p.error || s.error) {
    const offline = /network|fetch/i.test(`${p.error?.message ?? ''} ${s.error?.message ?? ''}`);
    return {
      ok: false,
      message: offline ? 'You’re offline. Nothing was saved — try again when you’re back.' : 'That didn’t save. Try again.',
    };
  }
  const account: Account = { uid, profile: p.data, settings: s.data };
  kv.setJSON(cacheKey(uid), account);
  if (currentUid === uid) publish({ account, stale: false });
  return { ok: true };
}

const get = () => state;
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useAccount(): AccountState {
  return useSyncExternalStore(subscribe, get, get);
}
