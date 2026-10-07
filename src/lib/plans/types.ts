import type { Database } from '@shared/database.types';

type Tables = Database['public']['Tables'];
type Enums = Database['public']['Enums'];

export type GoalRow = Tables['goals']['Row'];
export type GoalUpdate = Tables['goals']['Update'];
export type GoalHorizon = Enums['goal_horizon'];
export type QuestKind = Enums['quest_kind'];
export type TaskPriority = Enums['task_priority'];

/** quest_items.estimate_minutes has `check (estimate_minutes between 5 and 240)`. */
export const ESTIMATE_MIN = 5;
export const ESTIMATE_MAX = 240;
/** Longer than this and a quest can't fit one default block (75 min minus the 5-min margin). */
export const BLOCK_BUDGET_MINUTES = 70;

export const clampEstimate = (n: number) =>
  Math.min(ESTIMATE_MAX, Math.max(ESTIMATE_MIN, Math.round(Number.isFinite(n) ? n : ESTIMATE_MIN)));

/**
 * What the intake wizard stores in goals.constraints. Sent to the plan generator as-is.
 * A type alias (not an interface) so it is assignable to the Json column type.
 */
export type GoalConstraints = {
  daily_minutes?: number;
  notes?: string;
};

// ── The plan being reviewed ───────────────────────────────────────────────────────────────────
// Loaded from the database the same way whichever path created it, so no screen can tell the
// template path from the AI path. Edits live here until "Start this plan" commits them.

export interface DraftStage {
  id: string;
  title: string;
  description: string | null;
  requiresMilestones: string[];
  deleted: boolean;
}

export interface DraftTrack {
  id: string;
  title: string;
  goalLine: string | null;
  stages: DraftStage[];
}

export interface DraftMilestone {
  id: string;
  title: string;
  detail: string | null;
  skill: string | null;
  targetLabel: string;
  isKeystone: boolean;
  deleted: boolean;
}

export interface DraftQuest {
  /** Database id, or `new:<n>` for a quest the user added during review. */
  id: string;
  title: string;
  skill: string | null;
  kind: QuestKind;
  estimateMinutes: number;
  deleted: boolean;
}

export interface PlanSkill {
  key: string;
  label: string;
}

export interface PlanDraft {
  planId: string;
  goalId: string;
  version: number;
  northStar: string;
  summary: string;
  skills: PlanSkill[];
  tracks: DraftTrack[];
  milestones: DraftMilestone[];
  quests: DraftQuest[];
}

export const isNewQuest = (q: DraftQuest) => q.id.startsWith('new:');
