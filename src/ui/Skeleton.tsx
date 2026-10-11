import { useEffect, useState } from 'react';
import { View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { useMotion } from './motion';
import { useTheme } from './theme';
import { radius } from './tokens';

export interface SkeletonProps {
  width?: DimensionValue;
  height: number;
  rounded?: number;
  style?: StyleProp<ViewStyle>;
  /** Sitting on an ink (hero) card: the shape and the shimmer use the hero's own tones. */
  onHero?: boolean;
}

const SWEEP_MS = 1300;

/**
 * A placeholder in the real layout's shape. Every loading state in the app is built from these;
 * there are no spinners. A soft band sweeps across (a solid band, not a gradient: the one gradient
 * is reserved for live time). Under Reduce Motion the shape holds still.
 */
export function Skeleton({ width = '100%', height, rounded = radius.pill, style, onHero }: SkeletonProps) {
  const { theme, isDark } = useTheme();
  const m = useMotion();
  const [w, setW] = useState(0);
  const x = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(x);
    x.set(0);
    if (!w) return;
    x.set(m.animate(0, ({ withRepeat, withTiming }) => withRepeat(withTiming(1, { duration: SWEEP_MS }), -1, false)));
  }, [m, w, x]);

  const band = Math.max(24, w * 0.4);
  const sweep = useAnimatedStyle(() => ({ transform: [{ translateX: -band + x.get() * (w + band) }] }));
  const base = onHero ? (isDark ? theme.line : theme.ink2) : theme.surface2;
  const shine = onHero ? (isDark ? theme.line2 : theme.ink3) : isDark ? theme.line : theme.surface;

  return (
    <View
      accessible={false}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={[{ width, height, borderRadius: rounded, backgroundColor: base, overflow: 'hidden' }, style]}
    >
      {!m.reduced && w > 0 && (
        <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, width: band, backgroundColor: shine, opacity: 0.7 }, sweep]} />
      )}
    </View>
  );
}
