import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  costUsd,
  MIN_PLANNABLE_WEEKLY,
  normalisePlan,
  PLAN_SCHEMA,
  plannedWeeklyMinutes,
  repairMessage,
  userMessage,
  validatePlan,
  weeklyMinutes,
  type GeneratedPlan,
  type PlanContext,
} from '../../supabase/functions/_shared/plan.ts';

const ctx: PlanContext = {
  goal: 'Pass the ACCA Financial Reporting (FR) exam in June',
  why: 'Last applied skills paper before the strategic ones.',
  horizon: 'months',
  today: '2026-10-07',
  timezone: 'Africa/Nairobi',
  dailyMinutes: 60,
  restDays: [0],
  workdayStart: '08:00',
  workdayEnd: '18:00',
  notes: 'Failed once with 46%. Consolidations and IFRS 16 are weak.',
  clarification: null,
};

/** A plan that passes: 20 quests × 30 min × 0.5/week = 300 of 360 weekly minutes. */
function validPlan(): GeneratedPlan {
  return {
    title: 'ACCA FR in June',
    domain: 'exams',
    north_star: 'Walk into FR knowing consolidations cold.',
    rationale: 'Weak areas first, then mocks to the clock.',
    clarifying_question: '',
    skills: [
      { key: 'consolidation', label: 'Consolidations', description: 'Group accounts' },
      { key: 'ifrs16', label: 'Leases', description: 'IFRS 16' },
      { key: 'exam_technique', label: 'Exam technique', description: 'Timing' },
    ],
    tracks: [
      {
        key: 'exam',
        title: 'FR',
        goal_line: 'Pass in June',
        stages: [
          { title: 'Consolidations solid', description: '', requires_milestone_titles: ['Consolidation mock above 60%'] },
          { title: 'Leases solid', description: '', requires_milestone_titles: [] },
          { title: 'Mocks above pass', description: '', requires_milestone_titles: ['Full mock above 50%'] },
          { title: 'Exam sat', description: '', requires_milestone_titles: ['FR exam'] },
        ],
      },
    ],
    milestones: [
      { title: 'Consolidation mock above 60%', detail: '', coach_note: 'Do the goodwill working first.', skill: 'consolidation', due_week: 8, target_label: 'Early Dec 2026', is_keystone: false },
      { title: 'Full mock above 50%', detail: '', coach_note: 'Sit it to the clock.', skill: 'exam_technique', due_week: 26, target_label: 'Early Apr 2027', is_keystone: true },
      { title: 'FR exam', detail: '', coach_note: 'Book it before you feel ready.', skill: 'exam_technique', due_week: 35, target_label: 'June 2027', is_keystone: true },
    ],
    quest_items: Array.from({ length: 20 }, (_, i) => ({
      title: `IAS ${i + 1}: 6 practice questions`,
      detail: '',
      skill: (['consolidation', 'ifrs16', 'exam_technique'] as const)[i % 3] ?? 'consolidation',
      kind: 'practice' as const,
      estimate_minutes: 30,
      times_per_week: 0.5,
    })),
    weekly_load_minutes: 300,
  };
}

test('a plan that fits their hours, skills and milestones passes', () => {
  assert.equal(weeklyMinutes(ctx), 360);
  assert.equal(plannedWeeklyMinutes(validPlan()), 300);
  assert.deepEqual(validatePlan(validPlan(), ctx), []);
});

test('an over-stuffed plan is rejected by the weekly-hours check, with numbers the model can act on', () => {
  const stuffed = validPlan();
  stuffed.quest_items = stuffed.quest_items.map((q) => ({ ...q, estimate_minutes: 60, times_per_week: 2 }));
  const problems = validatePlan(stuffed, ctx);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /needs 2400 minutes .* but they have 360 minutes a week/);
  // The re-prompt lists exactly that problem.
  assert.match(repairMessage(problems), /- A typical week of this plan needs 2400 minutes/);
  assert.match(repairMessage(['x'], { planned: 300, budget: 360 }), /currently 300 of 360 minutes.*do not raise any times_per_week/);
});

test('a plan that ignores most of their hours is rejected too', () => {
  const thin = validPlan();
  thin.quest_items = thin.quest_items.map((q) => ({ ...q, estimate_minutes: 10, times_per_week: 0.25 }));
  assert.match(validatePlan(thin, ctx).join(' '), /uses only 50 of their 360 weekly minutes/);
});

test('every rule in the brief is checked: skills, 10–90 estimates, 20 quests, real milestone titles', () => {
  const bad = validPlan();
  bad.quest_items = bad.quest_items.slice(0, 18);
  bad.quest_items[0] = { ...bad.quest_items[0]!, skill: 'astrology' };
  bad.quest_items[1] = { ...bad.quest_items[1]!, estimate_minutes: 5 };
  bad.quest_items[2] = { ...bad.quest_items[2]!, estimate_minutes: 120 };
  bad.tracks[0]!.stages[0]!.requires_milestone_titles = ['A milestone nobody wrote'];
  const all = validatePlan(bad, ctx).join('\n');
  assert.match(all, /18 quest items; at least 20/);
  assert.match(all, /skill that is not in the skills list .*astrology/);
  assert.match(all, /estimate_minutes must be a whole number from 10 to 90.*\(5\).*\(120\)/);
  assert.match(all, /longer than the 60 minutes they have in a day/);
  assert.match(all, /requires milestones that don't exist: "A milestone nobody wrote"/);
});

test('milestones must land within the horizon and carry a coaching note', () => {
  const late = validPlan();
  late.milestones[2] = { ...late.milestones[2]!, due_week: 80, coach_note: '' };
  const all = validatePlan(late, { ...ctx, horizon: 'months' }).join('\n');
  assert.match(all, /due in week 80, beyond their horizon/);
  assert.match(all, /no coach_note: "FR exam"/);
});

test('only unambiguous slips are mended before validation: case and spacing of keys and titles', () => {
  const raw = JSON.parse(JSON.stringify(validPlan()));
  raw.quest_items[0].skill = ' Consolidation ';
  raw.tracks[0].stages[0].requires_milestone_titles = ['consolidation  mock above 60%'];
  raw.domain = 'astrology';
  raw.quest_items[1].estimate_minutes = 5;
  const p = normalisePlan(raw);
  assert.equal(p.quest_items[0]?.skill, 'consolidation');
  assert.deepEqual(p.tracks[0]?.stages[0]?.requires_milestone_titles, ['Consolidation mock above 60%']);
  assert.equal(p.domain, 'other');
  assert.equal(p.quest_items[1]?.estimate_minutes, 10, 'below the floor is raised to it');
  assert.deepEqual(validatePlan(p, ctx), []);
  // Garbage in: a plan full of problems, never a crash.
  assert.ok(validatePlan(normalisePlan('not json'), ctx).length > 5);
});

test('the prompt carries every fact we hold about the goal and the time', () => {
  const m = userMessage({ ...ctx, clarification: { question: 'Which sitting?', answer: 'June 2027' } });
  for (const fact of [ctx.goal, ctx.why!, ctx.notes!, 'TODAY: 2026-10-07 (Africa/Nairobi)', 'DAILY MINUTES: 60 on each of 6 working days', 'WEEKLY MINUTES: 360', '08:00–18:00', 'rest days: Sunday', 'a few months', 'answered "June 2027"'])
    assert.ok(m.includes(fact), `missing: ${fact}`);
});

test('the output schema satisfies structured-output rules: every object closed and fully required', () => {
  const walk = (s: unknown): void => {
    if (!s || typeof s !== 'object') return;
    const o = s as Record<string, unknown>;
    if (o.type === 'object') {
      assert.equal(o.additionalProperties, false);
      assert.deepEqual(o.required, Object.keys(o.properties as object));
    }
    for (const k of ['minimum', 'maximum', 'maxItems']) assert.equal(k in o, false, `unsupported keyword ${k}`);
    Object.values(o).forEach(walk);
  };
  walk(PLAN_SCHEMA);
});

test('cost is logged per model, and too little time is refused before any call', () => {
  assert.equal(costUsd('claude-sonnet-5-5', { input_tokens: 2000, output_tokens: 5000 }), 0.054);
  assert.equal(costUsd('claude-haiku-4-5-20251001', { input_tokens: 2000, output_tokens: 5000 }), 0.027);
  assert.equal(costUsd('some-future-model', { input_tokens: 1e6, output_tokens: 0 }), 3);
  assert.equal(costUsd('claude-sonnet-5-5', null), null);
  assert.equal(MIN_PLANNABLE_WEEKLY, 50);
  assert.ok(weeklyMinutes({ dailyMinutes: 15, restDays: [0, 1, 2, 3, 4, 5] }) < MIN_PLANNABLE_WEEKLY);
});
