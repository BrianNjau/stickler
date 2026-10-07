// Pure plan-shape logic (no network, no React Native), so it is unit-testable under plain Node.
import type { Json } from '@shared/database.types';
import type { GoalDomain } from '@shared/types';

/** One of the plan_templates rows, summarised for the shape picker. */
export interface PlanShape {
  key: string;
  title: string;
  domain: GoalDomain;
  blurb: string;
  stageCount: number;
  milestoneCount: number;
  questCount: number;
  /** The last milestone's fuzzy target, e.g. "Within 6 months" — the template's own sense of duration. */
  finalTarget: string | null;
  /** Total minutes across the quest library: how much work the rotation has to draw from. */
  libraryMinutes: number;
}

const isObj = (v: Json | undefined): v is { [k: string]: Json | undefined } =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const arr = (v: Json | undefined): Json[] => (Array.isArray(v) ? v : []);

/** Validates the jsonb payload rather than trusting a cast. */
export function summariseShape(row: { key: string; title: string; domain: GoalDomain; blurb: string; payload: Json }): PlanShape {
  const p = isObj(row.payload) ? row.payload : {};
  const tracks = arr(p.tracks).filter(isObj);
  const milestones = arr(p.milestones).filter(isObj);
  const quests = arr(p.quest_items).filter(isObj);
  const last = milestones[milestones.length - 1];
  return {
    key: row.key,
    title: row.title,
    domain: row.domain,
    blurb: row.blurb,
    stageCount: tracks.reduce((n, t) => n + arr(t.stages).length, 0),
    milestoneCount: milestones.length,
    questCount: quests.length,
    finalTarget: last && typeof last.target_label === 'string' ? last.target_label : null,
    libraryMinutes: quests.reduce((n, q) => n + (typeof q.estimate_minutes === 'number' ? q.estimate_minutes : 0), 0),
  };
}

// Words that point at each starter. Deliberately small and readable; misses fall through to "no fit".
const SIGNALS: Record<string, readonly string[]> = {
  software: ['aws', 'azure', 'gcp', 'cloud', 'certif', 'cert', 'kubernetes', 'k8s', 'devops', 'terraform', 'architect', 'comptia', 'cisco', 'ccna', 'developer', 'engineer'],
  exams: ['exam', 'pass', 'cpa', 'acca', 'cfa', 'cima', 'bar', 'test', 'gre', 'gmat', 'ielts', 'toefl', 'finals', 'boards', 'mcat', 'usmle', 'paper', 'resit'],
  business: ['business', 'customer', 'client', 'shop', 'store', 'launch', 'sell', 'startup', 'revenue', 'side hustle', 'bakery', 'freelance', 'product', 'brand', 'sales', 'income'],
};

/**
 * What to put first in the picker: the template whose world the goal is in, else the neutral
 * 'other'-domain starter (for goals none of the specific ones fit), else nothing.
 */
export function firstShape(goalText: string, shapes: PlanShape[]): { key: string; exact: boolean } | null {
  const exact = suggestShape(goalText, shapes);
  if (exact) return { key: exact, exact: true };
  const neutral = shapes.find((s) => s.domain === 'other');
  return neutral ? { key: neutral.key, exact: false } : null;
}

/** The template whose world the goal is in, or null if none clearly is ("learn to swim"). */
export function suggestShape(goalText: string, shapes: PlanShape[]): string | null {
  const text = goalText.toLowerCase();
  let best: { key: string; score: number } | null = null;
  for (const s of shapes) {
    const score = (SIGNALS[s.domain] ?? []).filter((w) => text.includes(w)).length;
    if (score > 0 && (!best || score > best.score)) best = { key: s.key, score };
  }
  return best?.key ?? null;
}
