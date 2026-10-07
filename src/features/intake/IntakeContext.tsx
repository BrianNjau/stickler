import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { GoalRow, PlanDraft } from '@/lib/plans';

interface IntakeState {
  goal: GoalRow | null;
  setGoal: (g: GoalRow) => void;
  /** The plan under review, and the version as loaded (to know what changed). */
  draft: PlanDraft | null;
  original: PlanDraft | null;
  setDraft: (d: PlanDraft) => void;
  /** `notice`: one plain sentence shown above the plan, e.g. why a template replaced the draft. */
  startReview: (d: PlanDraft, notice?: string | null) => void;
  notice: string | null;
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
  const [notice, setNotice] = useState<string | null>(null);
  const value = useMemo<IntakeState>(
    () => ({
      goal,
      setGoal,
      draft,
      original,
      setDraft,
      startReview: (d, n = null) => {
        setOriginal(d);
        setDraft(d);
        setNotice(n);
      },
      notice,
      replan,
      setReplan,
      reset: () => {
        setGoal(null);
        setDraft(null);
        setOriginal(null);
        setReplan(false);
        setNotice(null);
      },
    }),
    [goal, draft, original, replan, notice],
  );
  return <IntakeContext.Provider value={value}>{children}</IntakeContext.Provider>;
}

export function useIntake(): IntakeState {
  const ctx = useContext(IntakeContext);
  if (!ctx) throw new Error('useIntake must be used inside the intake layout');
  return ctx;
}
