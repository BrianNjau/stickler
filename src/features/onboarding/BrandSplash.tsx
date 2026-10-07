import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { brand } from '@/lib/brand';
import { motion, palette, radius, Text, useReducedMotion } from '@/ui';

// The same image the native splash shows (app.json: expo-splash-screen, imageWidth 200), so the
// hand-off from native to JS is invisible. This layer adds what a static splash cannot: the bar.
const SPLASH_IMAGE = require('../../../assets/splash-icon.png');
const IMAGE_SIZE = 200;

/**
 * docs/design/Splash: mark and wordmark on ink, a short amber bar, the tagline in mono.
 * Stays up until `ready` (the persisted session has been restored), so the app never flashes the
 * wrong screen. The bar runs to 80% while waiting and completes once ready.
 */
export function BrandSplash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!reduced) progress.set(withTiming(0.8, { duration: motion.reward }));
  }, [reduced, progress]);

  useEffect(() => {
    if (!ready) return;
    // Reduce Motion: no bar, no fade — straight into the app.
    if (reduced) {
      onDone();
      return;
    }
    progress.set(withSequence(withTiming(0.8, { duration: motion.reward }), withTiming(1, { duration: motion.state })));
    opacity.set(
      withSequence(
        withTiming(1, { duration: motion.reward + motion.state }),
        withTiming(0, { duration: motion.enter }, (finished) => {
          if (finished) scheduleOnRN(onDone);
        }),
      ),
    );
  }, [ready, reduced, onDone, progress, opacity]);

  const fade = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  const fill = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.screen, fade]}
      accessible
      accessibilityLabel={`${brand.name}. ${brand.tagline}`}
    >
      <Image source={SPLASH_IMAGE} style={styles.image} resizeMode="contain" />
      <View style={[styles.footer, { bottom: 56 + insets.bottom }]}>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, fill]} />
        </View>
        <Text variant="label" fg={palette.dark.ink3}>
          {/* Mono labels drop the full stop, as drawn on the splash artboard. */}
          {brand.tagline.replace(/\.$/, '')}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Ink navy in both themes: the splash is the brand, not the theme.
  screen: { backgroundColor: palette.light.ink, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  image: { width: IMAGE_SIZE, height: IMAGE_SIZE },
  footer: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 20 },
  track: { width: 120, height: 3, borderRadius: radius.pill, backgroundColor: palette.dark.line, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: palette.light.amber },
});
