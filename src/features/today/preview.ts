// Fixture data for the Today previews (?state=populated | loading | empty) until WP3 wires ticking.
// Matches docs/design/Today · polished. Lines live here as data, as character_lines will in WP7.
import { XP } from '@shared/types';

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
  /** Index into the skill colours. */
  skill: number;
}

export interface TodayPreview {
  name: string;
  /** The character title earned so far (WP8). */
  title: string;
  /** 940 XP is level 4 (600–999): ticking the boss, a main and a side crosses into level 5. */
  xp: number;
  streak: number;
  restDays: number[];
  next: { start: string; title: string; rounds: number; roundMinutes: number };
  tasks: PreviewTask[];
  /** Said only when there is something to say: keyed by how many are done. */
  lines: Record<number, string>;
  levelUpLine: string;
}

export const xpFor = (p: Priority) => (p === 'rescue' ? Math.round(XP.task.side * XP.rescueMultiplier) : XP.task[p]);

export const todayPreview: TodayPreview = {
  name: 'Brian',
  title: 'YAML Whisperer',
  xp: 940,
  streak: 6,
  restDays: [0, 6],
  next: { start: '09:30', title: 'Resilient architectures', rounds: 3, roundMinutes: 23 },
  tasks: [
    { id: 't1', title: 'VPC design: subnets, routing, NAT', minutes: 25, priority: 'boss', done: false, skill: 0 },
    { id: 't2', title: 'Multi-AZ failover patterns', minutes: 20, priority: 'main', done: true, skill: 0 },
    { id: 't3', title: 'SQS vs SNS vs EventBridge: decoupling drill', minutes: 20, priority: 'main', done: false, skill: 1 },
    { id: 't4', title: 'Read the Well-Architected reliability pillar', minutes: 15, priority: 'side', done: true, skill: 2 },
    { id: 't5', title: 'Route 53 failover routing: build it', minutes: 25, priority: 'main', done: false, skill: 1 },
    { id: 't6', title: 'Re-answer last week’s wrong questions', minutes: 15, priority: 'rescue', done: false, skill: 3 },
    { id: 't7', title: 'Flashcards: storage classes', minutes: 10, priority: 'side', done: false, skill: 2 },
  ],
  lines: {
    2: 'Two down before 10am. Showing off, I see.',
    3: 'Three. The cloud is impressed, and the cloud is hard to impress.',
    5: 'Five done. At this rate the YAML will start indenting itself.',
    7: 'All seven. I’ve run out of weather puns. Almost.',
  },
  levelUpLine: 'Cloud Wrangler. The YAML fears you now.',
};
