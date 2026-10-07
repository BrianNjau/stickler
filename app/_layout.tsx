import { BricolageGrotesque_600SemiBold } from '@expo-google-fonts/bricolage-grotesque/600SemiBold';
import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque/800ExtraBold';
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono/500Medium';
import { IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono/600SemiBold';
import { IBMPlexSans_400Regular } from '@expo-google-fonts/ibm-plex-sans/400Regular';
import { IBMPlexSans_500Medium } from '@expo-google-fonts/ibm-plex-sans/500Medium';
import { IBMPlexSans_600SemiBold } from '@expo-google-fonts/ibm-plex-sans/600SemiBold';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavThemeProvider, type Theme as NavTheme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { BrandSplash } from '@/features/onboarding';
import { useIntroSeen } from '@/lib/firstRun';
import { palette, ThemeProvider, type, useReducedMotion } from '@/ui';

SplashScreen.preventAutoHideAsync().catch(() => {});

function navTheme(isDark: boolean): NavTheme {
  const base = isDark ? DarkTheme : DefaultTheme;
  const c = isDark ? palette.dark : palette.light;
  return {
    ...base,
    colors: { ...base.colors, primary: c.ink, background: c.ground, card: c.surface, text: c.ink, border: c.line, notification: c.snitch },
  };
}

export default function RootLayout() {
  const isDark = useColorScheme() === 'dark';
  const [loaded, error] = useFonts({
    [type.display]: BricolageGrotesque_800ExtraBold,
    [type.heading]: BricolageGrotesque_600SemiBold,
    [type.body]: IBMPlexSans_400Regular,
    [type.bodyMed]: IBMPlexSans_500Medium,
    [type.bodyBold]: IBMPlexSans_600SemiBold,
    [type.mono]: IBMPlexMono_500Medium,
    [type.monoBold]: IBMPlexMono_600SemiBold,
  });
  const settled = loaded || !!error;
  const introSeen = useIntroSeen();
  const reduced = useReducedMotion();
  const [splashDone, setSplashDone] = useState(false);
  const endSplash = useCallback(() => setSplashDone(true), []);

  useEffect(() => {
    if (error) console.warn('[fonts] brand fonts failed to load; using system fonts.', error);
    // The JS brand splash (same image, same ink) is on screen by now, so the hand-off is seamless.
    if (settled) SplashScreen.hideAsync().catch(() => {});
  }, [settled, error]);

  // Hold the native splash until fonts settle so nothing reflows. A load failure still renders, in system fonts.
  if (!settled) return null;

  return (
    <GestureHandlerRootView style={styles.fill}>
      <ThemeProvider fontsReady={loaded}>
        <NavThemeProvider value={navTheme(isDark)}>
          <StatusBar style={!splashDone || isDark ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false, animation: reduced ? 'none' : 'default' }}>
            {/* First run: only the intro exists until it has been seen (or skipped) once. */}
            <Stack.Protected guard={!introSeen}>
              <Stack.Screen name="intro" />
            </Stack.Protected>
            <Stack.Protected guard={introSeen}>
              <Stack.Screen name="(tabs)" />
            </Stack.Protected>
            <Stack.Screen name="sign-in" />
          </Stack>
          {!splashDone && <BrandSplash onDone={endSplash} />}
        </NavThemeProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
