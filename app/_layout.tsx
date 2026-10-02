import { DarkTheme, DefaultTheme, Slot, ThemeProvider, type Theme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { palettes } from '@/ui';

function navTheme(scheme: 'light' | 'dark'): Theme {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const c = palettes[scheme];
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: c.accent,
      background: c.ground,
      card: c.surface,
      text: c.ink,
      border: c.line,
      notification: c.boss,
    },
  };
}

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return (
    <ThemeProvider value={navTheme(scheme)}>
      <StatusBar style="auto" />
      <Slot />
    </ThemeProvider>
  );
}
