import { useSyncExternalStore } from 'react';

import { kv } from './kv';

// Device-local on purpose: the intro is about this install, not the account.
const INTRO_SEEN_KEY = 'stickler.intro.seen';

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

// If storage is unavailable, kv.get returns null and the intro shows; finishing it still moves the
// user on through the in-memory notify below, so nobody is trapped.
let memorySeen = false;
const read = (): boolean => memorySeen || kv.get(INTRO_SEEN_KEY) === '1';

function write(seen: boolean): void {
  memorySeen = seen;
  if (seen) kv.set(INTRO_SEEN_KEY, '1');
  else kv.remove(INTRO_SEEN_KEY);
  notify();
}

export const markIntroSeen = () => write(true);

/** Development aid: show the intro again on next navigation. */
export const resetIntro = () => write(false);

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useIntroSeen(): boolean {
  return useSyncExternalStore(subscribe, read, read);
}
