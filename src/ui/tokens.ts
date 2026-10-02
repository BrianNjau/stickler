import { Platform, useColorScheme } from 'react-native';

// Palette lifted from prototype/focus-strip.html (:root and its dark variant).
export interface ColorTokens {
  ground: string;
  surface: string;
  surface2: string;
  line: string;
  ink: string;
  /** Secondary text. Meets 4.5:1 on ground and surface in both schemes. */
  ink2: string;
  /** Decorative only (dividers, disabled glyphs): below 4.5:1 on light ground, never use for text. */
  ink3: string;
  accent: string;
  /** Text/icons placed on an `accent` fill. */
  accentInk: string;
  accentSoft: string;
  study: string;
  studySoft: string;
  lab: string;
  labSoft: string;
  rest: string;
  restSoft: string;
  review: string;
  reviewSoft: string;
  boss: string;
  bossSoft: string;
  good: string;
  warn: string;
}

const light: ColorTokens = {
  ground: '#EEF1EC',
  surface: '#FFFFFF',
  surface2: '#F6F8F4',
  line: '#D7DDD3',
  ink: '#16202A',
  ink2: '#4A5661',
  ink3: '#7C8792',
  accent: '#E0902A',
  accentInk: '#1B1204',
  accentSoft: '#FBEBD3',
  study: '#2F6FB0',
  studySoft: '#E1ECF7',
  lab: '#1C8A6C',
  labSoft: '#DDF1EA',
  rest: '#8A949C',
  restSoft: '#ECEFF0',
  review: '#7A4E9C',
  reviewSoft: '#EEE5F4',
  boss: '#C23A2B',
  bossSoft: '#FBE3DF',
  good: '#1C8A6C',
  warn: '#C2410C',
};

const dark: ColorTokens = {
  ground: '#0F151B',
  surface: '#161E26',
  surface2: '#1B252E',
  line: '#2A3641',
  ink: '#E8EDF0',
  ink2: '#AEB9C2',
  ink3: '#7D8A95',
  accent: '#F0A443',
  accentInk: '#1B1204',
  accentSoft: '#3A2A14',
  study: '#6FA8E6',
  studySoft: '#172A3E',
  lab: '#4CC4A0',
  labSoft: '#12302A',
  rest: '#8F9AA3',
  restSoft: '#1F2830',
  review: '#B990DA',
  reviewSoft: '#2A1F35',
  boss: '#FF7A68',
  bossSoft: '#3B1C18',
  good: '#4CC4A0',
  warn: '#FB8A5C',
};

export const palettes = { light, dark } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 10, md: 12, lg: 16, pill: 999 } as const;

/** Minimum touch target (Apple HIG / WCAG 2.5.5). */
export const hitTarget = 44;

// Brand fonts (Bricolage Grotesque / IBM Plex) are not bundled yet; system stacks until then.
export const fonts = {
  display: undefined,
  body: undefined,
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  }),
} as const;

export const typeScale = {
  display: { fontSize: 32, lineHeight: 36, fontWeight: '800' },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  eyebrow: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 1 },
  mono: { fontSize: 15, lineHeight: 20, fontWeight: '500' },
} as const;

export type TypeVariant = keyof typeof typeScale;

export function useColors(): ColorTokens {
  return useColorScheme() === 'dark' ? dark : light;
}
