// Installs a synchronous, SQLite-backed `localStorage` on iOS/Android (a no-op on web).
import 'expo-sqlite/localStorage/install';

import { useSyncExternalStore } from 'react';

// Device-local on purpose: the intro is about this install, not the account.
const INTRO_SEEN_KEY = 'stickler.intro.seen';

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function read(): boolean {
  try {
    return localStorage.getItem(INTRO_SEEN_KEY) === '1';
  } catch {
    // Storage unavailable (private mode, quota): treat as seen rather than trap the user in the intro.
    return true;
  }
}

function write(seen: boolean): void {
  try {
    if (seen) localStorage.setItem(INTRO_SEEN_KEY, '1');
    else localStorage.removeItem(INTRO_SEEN_KEY);
  } catch {
    // Best effort; the in-memory notify below still moves the user on.
  }
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
