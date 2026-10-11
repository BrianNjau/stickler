import { useEffect, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { useMotion } from './motion';
import { motion } from './tokens';

/**
 * Screen enter (docs/POLISH.md §4): content rises 12 px and fades in, 40 ms apart per card.
 * Once, on mount. Under Reduce Motion it is simply there.
 */
export function Rise({ index = 0, children, style }: { index?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const m = useMotion();
  const t = useSharedValue(m.reduced ? 1 : 0);

  useEffect(() => {
    t.set(m.animate(1, ({ withDelay, withTiming, Easing }) =>
      withDelay(index * motion.stagger, withTiming(1, { duration: motion.enter, easing: Easing.out(Easing.cubic) })),
    ));
    // Mount only: re-renders must not replay the entrance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const look = useAnimatedStyle(() => ({
    opacity: t.get(),
    transform: [{ translateY: (1 - t.get()) * motion.rise }],
  }));

  return <Animated.View style={[look, style]}>{children}</Animated.View>;
}
