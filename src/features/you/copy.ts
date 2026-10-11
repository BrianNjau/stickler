export const youCopy = {
  title: 'You',
  settings: 'Settings',
  level: 'Level',
  toNext: (n: number, level: number) => `${n.toLocaleString()} XP to level ${level}`,
  streak: (n: number) => (n === 1 ? '1 day streak' : `${n} day streak`),
  loadFailed: { message: 'Your level didn’t load. Your connection dropped on the way.', action: 'Try again' },
  empty: { line: 'Skills and trophies fill in as you finish quests. The first one is closer than it looks.', action: 'See today' },
} as const;
