export const pathCopy = {
  title: 'Your path',
  track: 'Track',
  tracks: 'Tracks',
  stagesDone: (done: number, of: number) => `${done} of ${of} stages · ${Math.round((done / of) * 100)}%`,
  youAreHere: 'You are here',
  ticksItself: 'Ticks itself when these are done',
  stageProgress: (pct: number) => `${pct}% of this stage`,
  empty: { line: 'Your path draws itself from your plan’s stages and milestones. The full map arrives with the weekly review.', action: 'See today' },
} as const;
