import type { LucideIcon } from './icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { LiveGradient } from './gradient';
import { haptic } from './haptics';
import { useMotion } from './motion';
import { Text } from './Text';
import { useTheme } from './theme';
import { elevation, motion, radius, size, space, type Theme } from './tokens';

/**
 * - primary: ink, the one main action on a screen
 * - live: the gradient. Only for the primary action of live time (start / pause / resume a session).
 * - accent: flat amber, live-time secondary
 */
export type ButtonVariant = 'primary' | 'live' | 'secondary' | 'accent' | 'destructive' | 'quiet';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: ButtonVariant;
  size?: 'lg' | 'md';
  icon?: LucideIcon;
  /** Leading by default; trailing for forward actions ("Let's go →"). */
  iconPosition?: 'leading' | 'trailing';
  /** Busy: the label stays and a shimmer runs across the button. Never a spinner. */
  loading?: boolean;
  /** Full width by default; pass false for an inline button. */
  block?: boolean;
  /**
   * This button is the screen's hero (the one element that floats). For screens whose one obvious
   * thing is an action: sign-in, the code, the first-run form, the intro.
   */
  hero?: boolean;
  style?: StyleProp<ViewStyle>;
}

function colorsFor(variant: ButtonVariant, t: Theme) {
  switch (variant) {
    case 'primary':
      return { bg: t.ink, fg: t.inkOn, border: t.ink };
    case 'live':
      return { bg: 'transparent', fg: t.amberInk, border: 'transparent' };
    case 'secondary':
      return { bg: t.surface, fg: t.ink, border: t.line2 };
    case 'accent':
      return { bg: t.amber, fg: t.amberInk, border: t.amber };
    case 'destructive':
      return { bg: t.blush, fg: t.onBlush, border: t.blush };
    case 'quiet':
      return { bg: 'transparent', fg: t.ink, border: 'transparent' };
  }
}

/** The busy shimmer: a soft band crossing the button, in the label's own colour. */
function Busy({ color }: { color: string }) {
  const m = useMotion();
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(x);
    if (w) x.set(m.animate(0.5, ({ withRepeat, withTiming }) => withRepeat(withTiming(1, { duration: 1100 }), -1, false)));
  }, [m, w, x]);
  const band = Math.max(28, w * 0.3);
  const sweep = useAnimatedStyle(() => ({ transform: [{ translateX: -band + x.get() * (w + band) }] }));
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.busy]} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 && <Animated.View style={[styles.band, { width: band, backgroundColor: color }, sweep]} />}
    </View>
  );
}

export function Button({
  label,
  variant = 'primary',
  size: s = 'lg',
  icon: Icon,
  iconPosition = 'leading',
  loading = false,
  block = true,
  hero = false,
  disabled,
  onPress,
  onPressIn,
  onPressOut,
  style,
  ...rest
}: ButtonProps) {
  const { theme } = useTheme();
  const m = useMotion();
  const c = colorsFor(variant, theme);
  const scale = useSharedValue(1);
  const inactive = disabled || loading;

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!inactive, busy: loading }}
      disabled={inactive}
      onPressIn={(e) => {
        scale.set(m.timing(0.97, motion.press));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(m.spring(1));
        onPressOut?.(e);
      }}
      onPress={(e) => {
        haptic('press');
        onPress?.(e);
      }}
      style={[block ? styles.block : styles.inline, style]}
      {...rest}
    >
      <Animated.View
        testID={hero ? 'hero' : undefined}
        style={[
          hero && elevation.hero,
          styles.body,
          {
            minHeight: s === 'lg' ? size.button : size.buttonSm,
            backgroundColor: c.bg,
            borderColor: c.border,
          },
          inactive && !loading && styles.disabled,
          animated,
        ]}
      >
        {variant === 'live' && <LiveGradient radius={radius.control} />}
        <View style={[styles.content, iconPosition === 'trailing' && styles.reverse, loading && styles.dim]}>
          {Icon && <Icon size={18} color={c.fg} strokeWidth={2.2} />}
          <Text variant={s === 'lg' ? 'h3' : 'small'} fg={c.fg} style={styles.label}>
            {label}
          </Text>
        </View>
        {loading && <Busy color={c.fg} />}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: { alignSelf: 'stretch' },
  inline: { alignSelf: 'flex-start' },
  body: {
    borderRadius: radius.control,
    borderWidth: 1,
    paddingHorizontal: space.xl,
    paddingVertical: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Positioned, so it paints above the live variant's (absolutely positioned) gradient on web too.
  content: { flexDirection: 'row', alignItems: 'center', gap: space.sm, position: 'relative', zIndex: 1 },
  reverse: { flexDirection: 'row-reverse' },
  label: { textAlign: 'center' },
  dim: { opacity: 0.55 },
  disabled: { opacity: 0.45 },
  busy: { borderRadius: radius.control, overflow: 'hidden' },
  band: { position: 'absolute', top: 0, bottom: 0, opacity: 0.18 },
});
