// WP2: goals, plan creation (template or AI, one interface), review drafts, commit, today's list.
export { createPlan, type CreatePlanResult, type PlanMode } from './createPlan';
export { addDays, commitDraft, loadDraft, type CommitResult } from './draft';
export {
  activeGoal,
  constraintsOf,
  createGoal,
  forgetDraft,
  getGoal,
  pendingDraft,
  unfinishedGoal,
  updateGoal,
  type DraftPointer,
  type GoalPatch,
} from './goals';
export { firstShape, suggestShape, summariseShape, type PlanShape } from './shapes';
export { listShapes } from './templates';
export { titleFrom } from './titles';
export { loadToday, type TodayBlock, type TodayData, type TodayTask } from './today';
export * from './types';
