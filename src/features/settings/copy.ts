// Settings copy for the 0–3 mascot dials. Index = the stored value.

export const snitchLevels = [
  {
    short: 'Off',
    name: 'Off. Truly off.',
    about: 'No bubbles, no infractions, no notifications. The camera is unplugged and facing the wall.',
  },
  { short: 'Quiet', name: 'Quiet', about: 'Files the paperwork, rarely reads it aloud.' },
  { short: 'Normal', name: 'On duty', about: 'Notices drifts and says so, briefly and bureaucratically.' },
  { short: 'Relentless', name: 'Relentless', about: 'Treats your to-do list like a federal investigation. You asked for this.' },
] as const;

export const humourLevels = [
  { short: 'Plain', name: 'Plain', about: 'Nimbus keeps it to encouragement. No puns.' },
  { short: 'Light', name: 'Light', about: 'The occasional pun, filed under “necessary”.' },
  { short: 'Silly', name: 'Silly', about: 'Puns most days. Nimbus is very proud of them.' },
  { short: 'Absurd', name: 'Absurd', about: 'Full weather-system comedy. Sunglasses may be involved.' },
] as const;
