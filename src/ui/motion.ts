import { useMemo, useSyncExternalStore } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import {
  Easing,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type WithSpringConfig,
} from 'react-native-reanimated';

import { motion } from './tokens';

// ── Reduce Motion, as one app-wide store ────────────────────────────────────────────────────────
// Read once and kept current, so a component mounting mid-session knows the answer on its first
// render (a per-component async read would start at "false" and animate the entrance anyway).
const REDUCE_QUERY = '(prefers-reduced-motion: reduce)';
const webQuery = Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(REDUCE_QUERY) : null;
let reducedNow = webQuery?.matches ?? false;
const listeners = new Set<() => void>();
const setReduced = (v: boolean) => {
  if (v === reducedNow) return;
  reducedNow = v;
  listeners.forEach((l) => l());
};
if (!webQuery) AccessibilityInfo.isReduceMotionEnabled().then(setReduced, () => {});
AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
webQuery?.addEventListener?.('change', (e) => setReduced(e.matches));

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

/** True when the OS asks for reduced motion. Every animation must have a still fallback. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, () => reducedNow, () => reducedNow);
}

/** The Reanimated builders, handed out only inside `animate`. */
const builders = { withDelay, withRepeat, withSequence, withSpring, withTiming, Easing } as const;
export type MotionBuilders = typeof builders;

export interface Motion {
  reduced: boolean;
  /** Spring to a value (POLISH default spring). Under Reduce Motion: the value, at once. */
  spring: (to: number, config?: WithSpringConfig) => number;
  /** Spring with overshoot (task ticked, ring pulse). */
  bounce: (to: number) => number;
  /** A timed change. */
  timing: (to: number, duration?: number) => number;
  /**
   * Anything more elaborate (sequences, loops, delays). `run` receives the builders; under Reduce
   * Motion it never runs and `still` is used instead.
   */
  animate: <T>(still: T, run: (b: MotionBuilders) => T) => T;
}

/**
 * The only door to animation in the app. Every Reanimated builder (withSpring, withTiming,
 * withRepeat…) is reachable only through here, and here checks Reduce Motion first. A lint rule
 * (eslint.config.js) forbids importing the builders anywhere else, so "Reduce Motion removes every
 * animation" holds by construction, not by review.
 */
export function useMotion(): Motion {
  const reduced = useReducedMotion();
  return useMemo<Motion>(
    () => ({
      reduced,
      spring: (to, config = motion.spring) => (reduced ? to : withSpring(to, config)),
      bounce: (to) => (reduced ? to : withSpring(to, motion.overshoot)),
      timing: (to, duration = motion.state) => (reduced ? to : withTiming(to, { duration })),
      animate: (still, run) => (reduced ? still : run(builders)),
    }),
    [reduced],
  );
}
