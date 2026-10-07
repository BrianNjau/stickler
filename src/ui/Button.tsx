import type { LucideIcon } from './icons';
import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { haptic } from './haptics';
import { useReducedMotion } from './motion';
import { Text } from './Text';
import { useTheme } from './theme';
import { motion, radius, size, space, type Theme } from './tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'destructive' | 'quiet';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: ButtonVariant;
  size?: 'lg' | 'md';
  icon?: LucideIcon;
  /** Leading by default; trailing for forward actions ("Let's go →"). */
  iconPosition?: 'leading' | 'trailing';
  loading?: boolean;
  /** Full width by default; pass false for an inline button. */
  block?: boolean;
  style?: StyleProp<ViewStyle>;
}

function colorsFor(variant: ButtonVariant, t: Theme) {
  switch (variant) {
    case 'primary':
      return { bg: t.ink, fg: t.inkOn, border: t.ink };
    case 'secondary':
      return { bg: t.surface, fg: t.ink, border: t.line2 };
    case 'accent': // amber: live time only (pause, resume)
      return { bg: t.amber, fg: t.amberInk, border: t.amber };
    case 'destructive':
      return { bg: t.blush, fg: t.onBlush, border: t.blush };
    case 'quiet':
      return { bg: 'transparent', fg: t.ink, border: 'transparent' };
  }
}

export function Button({
  label,
  variant = 'primary',
  size: s = 'lg',
  icon: Icon,
  iconPosition = 'leading',
  loading = false,
  block = true,
  disabled,
  onPress,
  onPressIn,
  onPressOut,
  style,
  ...rest
}: ButtonProps) {
  const { theme } = useTheme();
  const reduced = useReducedMotion();
  const c = colorsFor(variant, theme);
  const pressed = useSharedValue(0);
  const inactive = disabled || loading;

  const animated = useAnimatedStyle(() => ({
    opacity: 1 - pressed.get() * 0.1,
    transform: [{ scale: reduced ? 1 : 1 - pressed.get() * 0.03 }],
  }));

  const to = (v: number) => pressed.set(reduced ? v : withTiming(v, { duration: motion.state }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!inactive, busy: loading }}
      disabled={inactive}
      onPressIn={(e) => {
        to(1);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        to(0);
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
        style={[
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
        {/* The label stays mounted while loading so the button keeps its width. */}
        <View style={[styles.content, iconPosition === 'trailing' && styles.reverse, loading && styles.hidden]}>
          {Icon && <Icon size={18} color={c.fg} strokeWidth={2.2} />}
          <Text variant={s === 'lg' ? 'h3' : 'small'} fg={c.fg} style={styles.label}>
            {label}
          </Text>
        </View>
        {loading && <ActivityIndicator color={c.fg} style={StyleSheet.absoluteFill} />}
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
  content: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  reverse: { flexDirection: 'row-reverse' },
  label: { textAlign: 'center' },
  hidden: { opacity: 0 },
  disabled: { opacity: 0.45 },
});
