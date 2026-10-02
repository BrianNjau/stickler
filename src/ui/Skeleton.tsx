import { useEffect } from 'react';
import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useReducedMotion } from './motion';
import { useTheme } from './theme';
import { radius } from './tokens';

export interface SkeletonProps {
  width?: DimensionValue;
  height: number;
  rounded?: number;
  style?: StyleProp<ViewStyle>;
}

/** A placeholder shape. Pulses gently; holds still under Reduce Motion. */
export function Skeleton({ width = '100%', height, rounded = radius.pill, style }: SkeletonProps) {
  const { theme } = useTheme();
  const reduced = useReducedMotion();
  const o = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(o);
    o.set(reduced ? 1 : withRepeat(withTiming(0.5, { duration: 900 }), -1, true));
  }, [reduced, o]);

  const pulse = useAnimatedStyle(() => ({ opacity: o.get() }));

  return (
    <Animated.View
      accessible={false}
      style={[{ width, height, borderRadius: rounded, backgroundColor: theme.surface2 }, pulse, style]}
    />
  );
}
