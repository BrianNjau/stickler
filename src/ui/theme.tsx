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
}

function build(isDark: boolean, fontsReady: boolean): ThemeValue {
  const theme: Theme = isDark ? palette.dark : palette.light;
  return {
    theme,
    isDark,
    fontsReady,
    tint: (name) => ({ bg: theme[name], fg: theme[onTint[name]] }),
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
