// shared/types.ts — the contract between app, Edge Functions and Postgres.
// Generate the DB half with: supabase gen types typescript --local > shared/database.types.ts
// and keep these hand-written types for things that cross the wire as JSON.

export type GoalDomain = 'software'|'exams'|'business'|'fitness'|'creative'|'academic'|'career'|'admin'|'other';
export type QuestKind  = 'learn'|'practice'|'lab'|'review'|'build'|'outreach'|'admin'|'rest';
export type Priority   = 'side'|'main'|'boss';
export type BlockKind  = 'study'|'lab'|'review'|'admin'|'break'|'commute'|'buffer';
export type SessionState = 'running'|'paused'|'break'|'completed'|'abandoned';
export type Persona    = 'nimbus'|'snitch'|'system';

export const XP = {
  task:   { side: 10, main: 20, boss: 30 },
  rescueMultiplier: 1.5,
  round: 15, block: 50, cleanBlockBonus: 25, breakBlock: 20,
  day: 100, receipt: 15, park: 2, comeback: 10, urgeSurfed: 5,
  attentionCheck: 5, preflight: 10, badge: 100,
  comboStep: 0.25, comboMax: 2.0,
} as const;

export const TOKENS = { block: 1, day: 3, milestone: 3, keystone: 5, stage: 5, cratePrice: 1 } as const;

/** Level n begins at 100 * (n-1)n/2 XP: 0, 100, 300, 600, 1000, 1500 … */
export const levelFromXp = (xp: number) => Math.max(1, Math.floor((1 + Math.sqrt(1 + (8 * Math.max(xp, 0)) / 100)) / 2));
export const xpForLevel  = (n: number) => (100 * (n - 1) * n) / 2;

// ── Edge Function payloads ──────────────────────────────────────────────────
// generate-plan. The model's output shape (GeneratedPlan) and its validator live in
// supabase/functions/_shared/plan.ts; the plan is saved as a draft and read back like any other.
export type GeneratePlanRequest  = { goal_id: string } | { action: 'quota' };
export interface GeneratePlanResponse {
  plan_id: string; clarifying_question: string | null; repaired: boolean; remaining: number;
}
export interface GeneratePlanQuota {
  limit: number; used: number; remaining: number; resets_at: string | null; configured: boolean;
}
export type GeneratePlanError = 'rate_limited' | 'busy' | 'invalid_plan' | 'not_configured' | 'generation_failed';

export interface GeneratedPlan {
  title: string; domain: GoalDomain; north_star: string;
  rationale: string;               // saved as plans.summary
  clarifying_question: string;     // '' when the goal is clear; saved as plans.clarifying_question
  skills: { key: string; label: string; description: string }[];
  tracks: { key: string; title: string; goal_line: string;
            stages: { title: string; description: string; requires_milestone_titles: string[] }[] }[];
  milestones: { title: string; detail: string; coach_note: string; skill: string; due_week: number;
                target_label: string; is_keystone: boolean }[];
  quest_items: { title: string; detail: string; skill: string; kind: Exclude<QuestKind,'rest'>;
                 estimate_minutes: number; times_per_week: number }[];
  weekly_load_minutes: number;     // the model's own sum; the validator recomputes it
}

export interface CommuteCheckRequest  { local_date: string }
export interface CommuteCheckResponse { feasibility: Feasibility; cuts: SuggestedCut[]; live_calls: number }

export interface Feasibility {
  verdict: 'fits'|'tight'|'not_possible';
  available_minutes: number; required_minutes: number;
  travel_minutes: number; ramp_minutes: number;
  pace_factor: number; overflow_minutes?: number;
}
export interface SuggestedCut { task_id: string; title: string; minutes: number; reason: string }

export interface Pace { total: number; done: number; expected: number; behind: number; as_of: string }

// ── RPC names, so the app never stringly-types them ─────────────────────────
export const RPC = {
  generateDay:      'fn_generate_day',
  completeTask:     'fn_complete_task',
  uncompleteTask:   'fn_uncomplete_task',
  startSession:     'fn_start_session',
  endRound:         'fn_end_round',
  resumeRound:      'fn_resume_round',
  logInterruption:  'fn_log_interruption',
  logReceipt:       'fn_log_receipt',
  completeBlock:    'fn_complete_block',
  completeMilestone:'fn_complete_milestone',
  openCrate:        'fn_open_crate',
  pace:             'fn_pace',
  feasibility:      'fn_feasibility',
  suggestCuts:      'fn_suggest_cuts',
  streak:           'fn_streak',
  checkBadges:      'fn_check_badges',
} as const;

// ── local-only state (never leaves the device) ──────────────────────────────
export interface OutboxItem {
  id: string; kind: 'rpc'|'insert'|'update'|'delete';
  table?: string; fn?: string; payload: unknown;
  created_at: number; attempts: number;
}
