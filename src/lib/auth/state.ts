import type { Session, User } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';

import { kv } from '../kv';
import { supabase } from '../supabase';

/**
 * Where the user stands, and therefore which part of the app they may see:
 *  - signedOut:    no session → intro (first run) / sign-in
 *  - needsProfile: signed in with an email but first-run capture not done → /welcome
 *  - ready:        a completed profile, or an anonymous trial → the app
 * Anonymous trials skip first-run capture; they meet it when they add an email (the upgrade path).
 */
export type AuthStatus = 'loading' | 'signedOut' | 'needsProfile' | 'ready';

export interface AuthSnapshot {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  isAnonymous: boolean;
}

const onboardedKey = (uid: string) => `stickler.onboarded.${uid}`;

let snapshot: AuthSnapshot = {
  status: supabase ? 'loading' : 'signedOut',
  session: null,
  user: null,
  isAnonymous: false,
};
const listeners = new Set<() => void>();

function publish(next: Partial<AuthSnapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((l) => l());
}

/** First-run done? Cached per user so a restored session works offline; asks the server otherwise. */
async function isOnboarded(user: User): Promise<boolean> {
  if (kv.get(onboardedKey(user.id)) === '1') return true;
  if (!supabase) return false;
  const { data, error } = await supabase.from('profiles').select('onboarded_at').eq('id', user.id).maybeSingle();
  if (error || !data?.onboarded_at) return false;
  kv.set(onboardedKey(user.id), '1');
  return true;
}

let resolving = 0;
async function resolve(session: Session | null) {
  const run = ++resolving;
  if (!session) {
    publish({ status: 'signedOut', session: null, user: null, isAnonymous: false });
    return;
  }
  const user = session.user;
  const isAnonymous = user.is_anonymous === true;
  const status: AuthStatus = isAnonymous || (await isOnboarded(user)) ? 'ready' : 'needsProfile';
  // A newer auth event may have arrived while we were asking the server; it wins.
  if (run === resolving) publish({ status, session, user, isAnonymous });
}

let started = false;
/** Restores the persisted session and follows auth changes for the life of the app. Idempotent. */
export function startAuth(): void {
  if (started || !supabase) return;
  started = true;
  supabase.auth.getSession().then(({ data }) => resolve(data.session));
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'INITIAL_SESSION') return; // handled by getSession above
    // supabase-js warns against awaiting its own calls inside this callback; defer.
    setTimeout(() => resolve(session), 0);
  });
}

/** Call after first-run capture is saved. */
export function markOnboarded(uid: string): void {
  kv.set(onboardedKey(uid), '1');
  if (snapshot.user?.id === uid) publish({ status: 'ready' });
}

/** Re-evaluate after the account itself changes (e.g. an anonymous user adds an email). */
export async function refreshAuth(): Promise<void> {
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  await resolve(data.session);
}

// Where to land once the new session is ready (e.g. a fresh trial goes to goal intake, not Today).
// One-shot: the root layout takes it when status reaches 'ready'.
let pendingRoute: string | null = null;
export const setPendingRoute = (route: string) => {
  pendingRoute = route;
};
export function takePendingRoute(): string | null {
  const r = pendingRoute;
  pendingRoute = null;
  return r;
}

export function getAuth(): AuthSnapshot {
  return snapshot;
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useAuth(): AuthSnapshot {
  return useSyncExternalStore(subscribe, getAuth, getAuth);
}
