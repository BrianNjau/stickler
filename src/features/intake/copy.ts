// Goal intake and plan review copy. Mascot banter lives here as data, like character_lines.
import type { GoalHorizon } from '@/lib/plans';

export const STEPS = 4;

export const intakeCopy = {
  goal: {
    eyebrow: 'Your goal',
    title: 'What do you want, in your own words?',
    body: 'No need to make it sound official. Include a date or how much time you have if you know it.',
    label: 'Your goal',
    placeholder: 'e.g. Pass my CPA by June. I get maybe an hour after work.',
    short: 'Short is fine. A date or a “by when” helps the plan, if you have one.',
    tooShort: 'A few words, at least, so we know what we’re planning for.',
    resumed: 'Picking up where you left off. Change anything you like.',
  },
  why: {
    eyebrow: 'Why it matters',
    title: 'Why does this matter to you?',
    body: 'Optional, but useful: on a bad day, this is what Nimbus reminds you of.',
    label: 'Why it matters',
    placeholder: 'e.g. So I stop being the cheapest person in the room.',
  },
  horizon: {
    eyebrow: 'How long',
    title: 'Roughly how far away is this?',
    body: 'A guess is fine. It sets the pace, not a deadline.',
  },
  hours: {
    eyebrow: 'Your time',
    title: 'How much time can this really get?',
    body: 'From your settings. Be honest — a plan for the hours you wish you had is a plan you’ll abandon.',
    notesLabel: 'Anything to plan around?',
    notesPlaceholder: 'e.g. Night shifts on Thursdays. No laptop at weekends.',
  },
  next: 'Next',
  back: 'Back',
} as const;

export const horizonOptions: readonly { value: GoalHorizon; label: string; detail: string }[] = [
  { value: 'weeks', label: 'A few weeks', detail: 'A sprint: one exam, one launch, one push.' },
  { value: 'months', label: 'A few months', detail: 'Most goals live here.' },
  { value: 'year', label: 'About a year', detail: 'Several milestones, one direction.' },
  { value: 'multi_year', label: 'Longer than that', detail: 'A career move, a business, a degree.' },
];

export const shapeCopy = {
  eyebrow: 'Choose a shape',
  title: 'Pick the plan shape that fits',
  body: 'Each one is a full plan: stages, milestones and a quest library. You can rename, cut and add anything on the next screen.',
  suggested: 'Closest match',
  bestStart: 'Best start',
  noFit:
    'None of the specific shapes fits your goal, so the general one is first. Every stage, milestone and quest is yours to rename, cut or replace on the next screen.',
  stages: 'stages',
  milestones: 'milestones',
  quests: 'quests',
  choose: 'Use this shape',
  building: 'Building your plan…',
  aiTitle: 'None of these fit? Stickler can draft one',
  aiBody: 'Written around your exact goal, your reasons and your hours, with real topics instead of placeholders. Takes about a minute.',
  aiCta: 'Draft my plan',
  aiLeft: (left: number, limit: number) => `${left} of ${limit} drafts left this week.`,
  aiNoneLeft: (when: string | null) =>
    `You’ve used this week’s drafts${when ? `; the next one frees up ${when}` : ''}. The shapes above are instant and just as editable.`,
  aiOff: 'Drafting is switched off on the server right now. The shapes above work as normal.',
  fallback: {
    rate_limited: 'You’ve used this week’s drafted plans. The shapes below are instant and just as editable.',
    failed: 'The plan drafter didn’t come back with a plan. Nothing is lost — pick a shape and carry on.',
    offline: 'No connection, so no drafting. Pick a shape; it works the moment you’re back online.',
    busy: 'Stickler has drafted all the plans it can for today. Pick a shape now, or try drafting again tomorrow.',
    unavailable: 'Drafting is switched off on the server right now. Pick a shape; nothing else changes.',
    invalid: 'Stickler couldn’t draft a plan that fits your goal and your hours. Pick a shape; they’re instant.',
  },
  createFailed: 'That shape didn’t load. Check your connection and try again.',
} as const;

/** Rough duration per starter. A plan_templates column would be better; until then, data here. */
export const shapeDuration: Record<string, string> = {
  cloud_cert: 'About 6 months',
  exam_prep: 'Paced to your exam date',
  side_business: 'About 4 months',
  general_goal: 'Paced to your own date',
};

export const generatingCopy = {
  eyebrow: 'Drafting',
  title: 'Writing a plan for your goal',
  honest: 'This takes about a minute: Stickler writes the plan, then checks it fits your hours and fixes it if not.',
  slow: 'Taking longer than usual. Still working, probably fixing a first draft that didn’t fit your hours. You can pick a shape instead at any time.',
  cancel: 'Pick a shape instead',
  fallingBack: 'The draft didn’t hold together. Fetching the closest starter instead…',
  banter: [
    'Measuring your goal with a very small ruler.',
    'Checking how many hours you actually have. Not the ones you wish you had.',
    'Arranging milestones in order of how scary they are.',
    'Removing “study hard” from the plan. It is not a task.',
    'Forecast: a 90% chance of a plan, clearing to brilliant.',
  ],
} as const;

export const reviewCopy = {
  eyebrow: 'Your plan',
  title: 'Make it yours, then start',
  body: 'Nothing is saved until you press Start. Rename, cut or retime anything.',
  why: 'Why this plan is shaped this way',
  fellBack: (title: string) =>
    `Stickler couldn’t draft a plan that fits your goal and your hours, so this is the closest starter instead: “${title}”. Edit it here, or go back and pick another shape.`,
  clarify: {
    eyebrow: 'One question',
    body: 'Your goal left this open. Answer it and Stickler redrafts the plan around your answer, or skip it and edit this one.',
    label: 'Your answer',
    cta: 'Redraft with this answer',
    costs: (left: number) => `Uses one of this week’s drafts (${left} left).`,
    none: 'No drafts left this week. Edit this plan instead; you can redraft next week.',
    failed: 'That answer didn’t save. Check your connection and try again.',
  },
  stages: 'Stages',
  milestones: 'Milestones',
  quests: 'Quest library',
  questsBody: 'The pool your days are built from. Estimates are honest minutes, 5 to 240.',
  target: 'When',
  add: 'Add your own quest',
  addPlaceholder: 'e.g. Redo last week’s hardest question',
  remove: 'Remove',
  restore: 'Undo',
  start: 'Start this plan',
  starting: 'Starting…',
  tooLong: (n: number) => `Longer than a whole block (${n} min). Fine for now — splitting arrives with the timer.`,
  mostlyTooLong:
    'Most of these are longer than a block, so each block will hold just one. Shorter quests make better days.',
  fewQuests: 'With fewer than five quests your days will repeat a lot. Add a few of your own.',
  noQuests: 'Keep at least one quest: days are built from them.',
} as const;
