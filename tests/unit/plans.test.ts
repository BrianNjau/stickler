import assert from 'node:assert/strict';
import { test } from 'node:test';

import { firstShape, suggestShape, summariseShape, type PlanShape } from '../../src/lib/plans/shapes.ts';
import { titleFrom } from '../../src/lib/plans/titles.ts';
import { clampEstimate, ESTIMATE_MAX, ESTIMATE_MIN } from '../../src/lib/plans/types.ts';

const shapes: PlanShape[] = [
  { key: 'cloud_cert', domain: 'software' },
  { key: 'exam_prep', domain: 'exams' },
  { key: 'side_business', domain: 'business' },
  { key: 'general_goal', domain: 'other' },
].map((s) => ({ ...s, title: s.key, blurb: '', stageCount: 0, milestoneCount: 0, questCount: 0, finalTarget: null, libraryMinutes: 0 }) as PlanShape);

test('the closest template is suggested for each starter world', () => {
  assert.equal(suggestShape('Get my AWS Solutions Architect Associate certification by March', shapes), 'cloud_cert');
  assert.equal(suggestShape('Pass the ACCA Financial Reporting exam in June', shapes), 'exam_prep');
  assert.equal(suggestShape('Launch a weekend cake business and land 10 paying customers', shapes), 'side_business');
});

test('a goal no template fits gets no suggestion (the picker says so instead of guessing)', () => {
  assert.equal(suggestShape('Learn to swim', shapes), null);
  assert.equal(suggestShape('', shapes), null);
});

test('a goal no specific template fits starts on the neutral template, marked as not exact', () => {
  assert.deepEqual(firstShape('Learn to swim', shapes), { key: 'general_goal', exact: false });
  assert.deepEqual(firstShape('Pass the CFA level 1 exam', shapes), { key: 'exam_prep', exact: true });
  assert.equal(firstShape('Learn to swim', shapes.filter((s) => s.domain !== 'other')), null);
});

test('a template payload is summarised from the jsonb, defensively', () => {
  const s = summariseShape({
    key: 'k',
    title: 'T',
    domain: 'exams',
    blurb: 'b',
    payload: {
      tracks: [{ stages: [{}, {}, {}] }, { stages: [{}] }],
      milestones: [{ target_label: 'Week 2' }, { target_label: 'The date' }],
      quest_items: [{ estimate_minutes: 30 }, { estimate_minutes: 15 }, { title: 'no estimate' }],
    },
  });
  assert.equal(s.stageCount, 4);
  assert.equal(s.milestoneCount, 2);
  assert.equal(s.questCount, 3);
  assert.equal(s.finalTarget, 'The date');
  assert.equal(s.libraryMinutes, 45);
  // Garbage in, zeros out — never a crash.
  const junk = summariseShape({ key: 'j', title: 'J', domain: 'other', blurb: '', payload: 'not an object' });
  assert.equal(junk.stageCount + junk.questCount + junk.milestoneCount, 0);
});

test('absurd estimates are clamped to what the database accepts (5–240 min)', () => {
  assert.equal(clampEstimate(0), ESTIMATE_MIN);
  assert.equal(clampEstimate(-90), ESTIMATE_MIN);
  assert.equal(clampEstimate(99999), ESTIMATE_MAX);
  assert.equal(clampEstimate(Number.NaN), ESTIMATE_MIN);
  assert.equal(clampEstimate(Number.POSITIVE_INFINITY), ESTIMATE_MIN);
  assert.equal(clampEstimate(27.6), 28);
  assert.equal(clampEstimate(25), 25);
});

test('goal titles come from the user’s own words, short', () => {
  assert.equal(titleFrom('pass my cpa by june. i get maybe an hour after work'), 'Pass my cpa by june');
  assert.equal(titleFrom('Learn to swim'), 'Learn to swim');
  assert.equal(titleFrom('   '), 'My goal');
  assert.equal(titleFrom('one two three four five six seven eight'), 'One two three four five six');
  assert.equal(titleFrom('Launch a weekend cake business and land my first 10 paying customers'), 'Launch a weekend cake business');
});
