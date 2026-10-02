// src/ui/tokens.ts — the single source of visual truth.
// Every colour, size and duration in the app comes from here. A hex literal anywhere
// else in src/ is a bug; the lint rule in WP0.5 enforces it.
//
// Direction: "soft paper, loud characters" — warm near-white ground, flat pastel tinted
// cards, ink navy for every primary action, one hot amber accent that only ever marks
// live time, and the mascots carrying the personality.

export const palette = {
  light: {
    ground:   '#FBFAF7',  // app background, warm near-white
    surface:  '#FFFFFF',  // cards that need to read as "paper"
    surface2: '#F2F1EC',  // inset rows, disabled fills
    line:     '#EDEBE4',  // hairlines and card borders
    line2:    '#D8D5CC',  // checkbox borders, stronger dividers

    ink:   '#16202A',     // primary text and primary buttons
    ink2:  '#4A5661',     // secondary text  (7.2:1 on ground)
    ink3:  '#5A6671',     // meta text, 12px+ only (5.3:1 on ground)
    inkOn: '#FBFAF7',     // text on ink

    // tints: SURFACES ONLY, never text
    butter: '#FFF3D6',
    mint:   '#DCF2E7',
    sky:    '#E2EAFB',
    lilac:  '#EEE6FA',
    blush:  '#FFE2E0',

    // the dark pair for text sitting on each tint (all ≥ 4.5:1)
    onButter: '#6B4A12',
    onMint:   '#2A4A3F',
    onSky:    '#2C4870',
    onLilac:  '#4A3A63',
    onBlush:  '#8A2E28',

    amber:    '#E0902A',  // live time only: running ring, pause, streak
    amberInk: '#1B1204',  // text on amber
    good:     '#1C8A6C',
    warn:     '#C2410C',
    snitch:   '#C23A2B',  // the Snitch's red
    snitchBg: '#14090A',  // the REC strip and the Snitch's bubble
    focusBg:  '#121920',  // the focus session screen
    focusCard:'#1A242E',
  },
  dark: {
    ground:   '#121920',
    surface:  '#1A242E',
    surface2: '#212D38',
    line:     '#2A3641',
    line2:    '#3A4856',

    ink:   '#E8EDF0',
    ink2:  '#AEB9C2',
    ink3:  '#93A1AE',
    inkOn: '#121920',

    // in dark mode a tint is the light hue at 14% over the surface, not a new hex
    butter: 'rgba(224,144,42,0.14)',
    mint:   'rgba(28,138,108,0.16)',
    sky:    'rgba(47,111,176,0.18)',
    lilac:  'rgba(122,78,156,0.20)',
    blush:  'rgba(194,58,43,0.16)',

    onButter: '#F0C98A',
    onMint:   '#8FD9C0',
    onSky:    '#A8C8EC',
    onLilac:  '#C9AEE2',
    onBlush:  '#F0A79E',

    amber:    '#F0A443',
    amberInk: '#1B1204',
    good:     '#4CC4A0',
    warn:     '#FB8A5C',
    snitch:   '#FF7A68',
    snitchBg: '#14090A',
    focusBg:  '#0E141A',
    focusCard:'#18222C',
  },
} as const;

export type Theme = typeof palette.light;

/** Skill colours. A plan's skills map onto these in order; the tint pairs with the ink. */
export const skillColors = [
  { key: 'a', tint: 'sky',    solid: '#2F6FB0', on: 'onSky' },
  { key: 'b', tint: 'mint',   solid: '#1C8A6C', on: 'onMint' },
  { key: 'c', tint: 'lilac',  solid: '#7A4E9C', on: 'onLilac' },
  { key: 'd', tint: 'butter', solid: '#C27C16', on: 'onButter' },
  { key: 'e', tint: 'blush',  solid: '#C23A2B', on: 'onBlush' },
] as const;

export const type = {
  display: 'BricolageGrotesque_800ExtraBold',
  heading: 'BricolageGrotesque_600SemiBold',
  body:    'IBMPlexSans_400Regular',
  bodyMed: 'IBMPlexSans_500Medium',
  bodyBold:'IBMPlexSans_600SemiBold',
  mono:    'IBMPlexMono_500Medium',
  monoBold:'IBMPlexMono_600SemiBold',
} as const;

/** size / lineHeight / letterSpacing, in px. Scale with the OS text-size setting. */
export const text = {
  display: { size: 40, line: 42, spacing: -0.8, family: type.display },
  h1:      { size: 27, line: 31, spacing: -0.4, family: type.display },
  h2:      { size: 19, line: 23, spacing: -0.1, family: type.heading },
  h3:      { size: 16, line: 20, spacing: 0,    family: type.heading },
  body:    { size: 15, line: 22, spacing: 0,    family: type.body },
  small:   { size: 13, line: 19, spacing: 0,    family: type.body },
  label:   { size: 11, line: 14, spacing: 1.3,  family: type.mono, uppercase: true },
  timer:   { size: 54, line: 56, spacing: -1.1, family: type.monoBold },
  mono:    { size: 12, line: 17, spacing: 0,    family: type.mono },
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 14, xl: 20, xxl: 26, xxxl: 34 } as const;

export const radius = { pill: 999, control: 16, panel: 20, card: 26, sheet: 28 } as const;

export const size = {
  gutter: 20,          // screen side padding
  cardGap: 14,
  hit: 44,             // minimum touch target
  button: 52,          // primary button height
  buttonSm: 44,
  checkbox: 22,
  tabBar: 56,
} as const;

/** Elevation is borders and tints. Exactly one shadow exists, for sheets and modals. */
export const shadow = {
  sheet: {
    shadowColor: '#16202A', shadowOpacity: 0.22, shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 }, elevation: 12,
  },
} as const;

export const motion = {
  state: 180,          // pressed, toggled, colour change
  enter: 280,          // screens, sheets
  reward: 450,         // XP pop, badge, combo bump — with overshoot
  crate: 900,          // the crate sequence
  spring: { damping: 14, stiffness: 180, mass: 0.9 },  // reanimated withSpring
  overshoot: { damping: 9, stiffness: 220, mass: 0.7 },
} as const;

/** Haptics (expo-haptics) — the app's whole vibration vocabulary. */
export const haptics = {
  taskDone: 'light',
  bossDone: 'heavy',
  roundEnd: 'success',
  drift:    'warning',
  crate:    'heavy',
} as const;

export const theme = (scheme: 'light' | 'dark' = 'light'): Theme => palette[scheme];
