// Stand-in data for the populated Today state until WP3 wires fn_generate_day.
// The Nimbus line lives here as data, as character_lines will in WP7 — never inline in a component.
import type { Priority } from '@/ui';

export type TodayState = 'empty' | 'loading' | 'populated';

export const parseTodayState = (raw: unknown): TodayState =>
  raw === 'loading' || raw === 'populated' ? raw : 'empty';

export interface PreviewTask {
  id: string;
  title: string;
  minutes: number;
  priority: Priority;
  done: boolean;
}

export interface PreviewBlock {
  title: string;
  start: string;
  end: string;
  minutes: number;
  rounds: number;
  skill: string;
  kind: string;
  note: string;
  tasks: PreviewTask[];
}

export interface TodayPreview {
  streak: number;
  nimbusLine: string;
  now: PreviewBlock;
  next: PreviewBlock;
  pace: { done: number; total: number; expected: number };
}

export const todayPreview: TodayPreview = {
  streak: 4,
  nimbusLine: 'Forecast for 12:30: scattered focus, clearing to brilliant.',
  now: {
    title: 'Resilient architectures',
    start: '12:30',
    end: '13:45',
    minutes: 75,
    rounds: 3,
    skill: 'AWS',
    kind: 'Study',
    note: 'The biggest exam domain, while your brain still has battery.',
    tasks: [
      { id: 't1', title: 'Decoupling: SQS vs SNS vs EventBridge', minutes: 25, priority: 'boss', done: false },
      { id: 't2', title: 'Cost optimisation: Savings Plans and Spot', minutes: 20, priority: 'main', done: true },
      { id: 't3', title: 'Caching tiers: CloudFront, ElastiCache, DAX', minutes: 20, priority: 'side', done: false },
    ],
  },
  next: {
    title: 'Step away from the screen',
    start: '13:45',
    end: '14:00',
    minutes: 15,
    rounds: 0,
    skill: 'Rest',
    kind: 'Break',
    note: 'Walk, water, zero scrolling. Yes, this counts as part of the plan.',
    tasks: [{ id: 't4', title: 'Actually left the desk', minutes: 15, priority: 'side', done: false }],
  },
  pace: { done: 3, total: 11, expected: 3 },
};
