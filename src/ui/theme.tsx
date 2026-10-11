import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { palette, type Theme } from './tokens';

export type TintName = 'butter' | 'mint' | 'sky' | 'lilac' | 'blush';

const onTint = {
  butter: 'onButter',
  mint: 'onMint',
  sky: 'onSky',
  lilac: 'onLilac',
  blush: 'onBlush',
} as const satisfies Record<TintName, keyof Theme>;

export interface ThemeValue {
  theme: Theme;
  isDark: boolean;
  /** A tint and the only text colour allowed on it, so a card can never mix them up. */
  tint: (name: TintName) => { bg: string; fg: string };
  /** False if the brand fonts failed to load; `Text` then falls back to system fonts. */
  fontsReady: boolean;
  /**
   * The hero card's colours (one per screen). Light: an ink card. Dark: ink on ink would vanish,
   * so the hero is the lifted surface with a stronger hairline.
   */
  hero: { bg: string; fg: string; fg2: string; track: string; border: string };
}

function build(isDark: boolean, fontsReady: boolean): ThemeValue {
  const theme: Theme = isDark ? palette.dark : palette.light;
  return {
    theme,
    isDark,
    fontsReady,
    tint: (name) => ({ bg: theme[name], fg: theme[onTint[name]] }),
    hero: isDark
      ? { bg: palette.dark.surface2, fg: palette.dark.ink, fg2: palette.dark.ink2, track: palette.dark.line2, border: palette.dark.line2 }
      : { bg: palette.light.ink, fg: palette.light.inkOn, fg2: palette.dark.ink2, track: palette.dark.line2, border: palette.light.ink },
  };
}

const ThemeContext = createContext<ThemeValue>(build(false, false));

export function ThemeProvider({ children, fontsReady }: { children: ReactNode; fontsReady: boolean }) {
  const isDark = useColorScheme() === 'dark';
  const value = useMemo(() => build(isDark, fontsReady), [isDark, fontsReady]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}

/** Renders a subtree in one scheme whatever the device says (the session screen is always dark). */
export function ThemeOverride({ dark, children }: { dark: boolean; children: ReactNode }) {
  const { fontsReady } = useContext(ThemeContext);
  const value = useMemo(() => build(dark, fontsReady), [dark, fontsReady]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
