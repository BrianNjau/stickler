// Fixture for the Vault preview (docs/design/Rewards, polished) until WP6 wires fn_open_crate.
export const vaultPreview = {
  tokens: 3,
  rewards: ['A proper coffee, the expensive one', 'One episode, guilt-free', 'A long walk with no podcast', 'Order in tonight'],
  lastClaimed: 'A proper coffee, the expensive one',
  nimbusLine: 'Did you actually take it? Rewards only count if you collect them.',
  trophies: [
    { name: 'Monk Mode', tint: 'mint', earned: true },
    { name: 'On Fire', tint: 'butter', earned: true },
    { name: 'Centurion', tint: null, earned: false },
  ],
  trophyCount: { earned: 7, of: 20 },
  stats: { focusHours: 41.5, bestCombo: 4, streak: 6 },
} as const;
