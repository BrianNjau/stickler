// First-run copy, from docs/design/Intro 1–3 and Sign in. Data, not literals in components — including the
// mascot lines, which follow the same voice rules as character_lines (CLAUDE.md).

export const introCards = [
  {
    key: 'say-it',
    title: 'Say it once. Get a plan.',
    body: 'Describe the goal in your own words. Stickler turns it into dated milestones and a daily set of tasks small enough to actually finish.',
  },
  {
    key: 'honest-day',
    title: 'It tells you when the day is a lie.',
    body: 'Stickler learns how long things really take you, counts your commute, and says so before you waste the evening finding out.',
  },
  {
    key: 'characters',
    title: 'One cheers. One keeps receipts.',
    body: 'Nimbus talks you back from a wandering afternoon. The Snitch notices you wandered. You can turn either of them down, any time.',
  },
] as const;

export type IntroKey = (typeof introCards)[number]['key'];

/** The worked examples drawn inside each card's illustration. */
export const introArt = {
  sayIt: {
    typedLabel: 'You type',
    typed: '“Pass my CPA by June. I get maybe an hour after work.”',
    block: {
      when: 'Tomorrow, 18:30',
      title: 'Audit standards, part one',
      tasks: [
        { title: 'Read and summarise ISA 315', minutes: 25 },
        { title: '20 questions, timed', minutes: 30 },
      ],
    },
    later: { when: 'Thursday', title: 'Mock exam, 90 minutes' },
  },
  honestDay: {
    verdict: 'Not possible',
    overBy: 'over by 70 min',
    have: 'have',
    need: 'need',
    reason: '45 min commute, and you start 9 min late on average. I counted.',
    cutLabel: 'Cut these two and it fits',
    cuts: [
      { title: 'Read the extra case study', minutes: 30 },
      { title: 'Flashcards, second pass', minutes: 40 },
    ],
    resolved: 'Moved to Saturday. Day fits.',
  },
  characters: [
    { persona: 'nimbus', mood: 'happy', tint: 'sky', line: 'Two tasks down before lunch. I’d high-five you, but I’m a cloud.' },
    { persona: 'snitch', mood: 'angry', line: 'You left this tab for 4 minutes 12 seconds. Infraction logged.' },
    { persona: 'nimbus', mood: 'focus', tint: 'butter', line: 'Ignore it. Breathe out slowly, pick the smallest next thing, five minutes. Go.' },
  ],
} as const;
