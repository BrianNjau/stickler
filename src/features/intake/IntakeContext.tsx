import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { GoalRow, PlanDraft } from '@/lib/plans';

interface IntakeState {
  goal: GoalRow | null;
  setGoal: (g: GoalRow) => void;
  /** The plan under review, and the version as loaded (to know what changed). */
  draft: PlanDraft | null;
  original: PlanDraft | null;
  setDraft: (d: PlanDraft) => void;
  startReview: (d: PlanDraft) => void;
  /** "Change my plan": a new version of the active goal's plan. */
  replan: boolean;
  setReplan: (r: boolean) => void;
  /** After "Start this plan": the next visit starts fresh. */
  reset: () => void;
}

const IntakeContext = createContext<IntakeState | null>(null);

export function IntakeProvider({ children }: { children: ReactNode }) {
  const [goal, setGoal] = useState<GoalRow | null>(null);
  const [draft, setDraft] = useState<PlanDraft | null>(null);
  const [original, setOriginal] = useState<PlanDraft | null>(null);
  const [replan, setReplan] = useState(false);
  const value = useMemo<IntakeState>(
    () => ({
      goal,
      setGoal,
      draft,
      original,
      setDraft,
      startReview: (d) => {
        setOriginal(d);
        setDraft(d);
      },
      replan,
      setReplan,
      reset: () => {
        setGoal(null);
        setDraft(null);
        setOriginal(null);
        setReplan(false);
      },
    }),
    [goal, draft, original, replan],
  );
  return <IntakeContext.Provider value={value}>{children}</IntakeContext.Provider>;
}

export function useIntake(): IntakeState {
  const ctx = useContext(IntakeContext);
  if (!ctx) throw new Error('useIntake must be used inside the intake layout');
  return ctx;
}
