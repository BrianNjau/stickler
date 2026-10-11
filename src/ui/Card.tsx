import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { haptic } from './haptics';
import { useMotion } from './motion';
import { useTheme, type TintName } from './theme';
import { elevation as ladder, motion, radius, space, type Elevation } from './tokens';

export interface CardProps extends ViewProps {
  /** One flat tint per card. Untinted cards are white paper with a hairline. */
  tint?: TintName;
  /**
   * The ladder (docs/POLISH.md §2). `hero` is the one element per screen that floats: an ink card
   * with the deep shadow. `raised` is for sheets and the FAB. Everything else stays `flat`.
   */
  elevation?: Elevation;
  /** Pressable card: scales to 0.97 over 120 ms and springs back. */
  onPress?: () => void;
  accessibilityHint?: string;
  children?: ReactNode;
}

export function Card({ tint, elevation = 'flat', onPress, style, children, accessibilityLabel, accessibilityHint, ...rest }: CardProps) {
  const { theme, tint: tintOf, hero } = useTheme();
  const m = useMotion();
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const look: StyleProp<ViewStyle> =
    elevation === 'hero'
      ? [{ backgroundColor: hero.bg, borderWidth: 1, borderColor: hero.border }, ladder.hero]
      : tint
        ? { backgroundColor: tintOf(tint).bg, borderWidth: 0 }
        : [{ backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line }, elevation === 'raised' && ladder.raised];

  // The hero is tagged so the polish checks can count it: exactly one per screen.
  const heroTag = elevation === 'hero' ? { testID: 'hero' } : null;

  if (!onPress) {
    return (
      <View {...rest} {...heroTag} accessibilityLabel={accessibilityLabel} style={[styles.card, look, style]}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPressIn={() => scale.set(m.timing(0.97, motion.press))}
      onPressOut={() => scale.set(m.spring(1))}
      onPress={() => {
        haptic('press');
        onPress();
      }}
    >
      <Animated.View {...rest} {...heroTag} style={[styles.card, look, style, pressStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    padding: space.xl,
    gap: space.md,
  },
});
