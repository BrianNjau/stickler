// Fixture for the session preview (docs/design/Focus · polished) until WP3 wires fn_start_session.
// The clock still derives from a round_ends_at-style timestamp, never from counting ticks.
export const sessionPreview = {
  block: 'Resilient architectures',
  mission: 'finish the VPC routing notes',
  boss: { title: 'VPC design: subnets, routing, NAT', xp: 30 },
  rounds: 3,
  round: 2,
  roundMinutes: 23,
  /** 14:38 left in round 2, as drawn. */
  startRemainingSeconds: 14 * 60 + 38,
  observedSeconds: 42 * 60 + 10,
  tabShare: 0.12,
  snitchLines: [
    'Observation in progress. Your tab count has been noted.',
    'Round closed. Paperwork filed. Attendance: suspiciously good.',
    'Block complete. I have nothing to report. This is unusual for me.',
  ],
} as const;
