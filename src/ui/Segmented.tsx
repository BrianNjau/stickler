import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { haptic } from './haptics';
import { useMotion } from './motion';
import { Text } from './Text';
import { useTheme } from './theme';
import { elevation, radius, size, space } from './tokens';

export interface SegmentedProps<T extends string | number> {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** `sm`: the compact Left/Done switch in a section header. */
  size?: 'md' | 'sm';
}

const PAD = 3;

/**
 * A single choice from a few: a pill track in surface2, the selected thumb white with the `raised`
 * shadow, sliding to the choice on a spring.
 */
export function Segmented<T extends string | number>({ label, options, value, onChange, size: s = 'md' }: SegmentedProps<T>) {
  const { theme, isDark } = useTheme();
  const m = useMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const segW = width > 0 ? (width - PAD * 2) / options.length : 0;
  const x = useSharedValue(index * segW);

  useEffect(() => {
    x.set(m.spring(index * segW));
  }, [index, segW, m, x]);

  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  const height = s === 'sm' ? 34 : size.buttonSm;

  return (
    <View
      style={[styles.track, { backgroundColor: theme.surface2, minHeight: height }]}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {segW > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.thumb,
            { width: segW, backgroundColor: isDark ? theme.line2 : theme.surface },
            elevation.raised,
            styles.softer,
            thumb,
          ]}
        />
      )}
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            aria-checked={on}
            accessibilityLabel={o.label}
            onPress={() => {
              if (!on) haptic('press');
              onChange(o.value);
            }}
            style={[styles.seg, { minHeight: height - PAD * 2 }]}
          >
            <Text variant="small" color={on ? 'ink' : 'ink2'} numberOfLines={1} style={on && styles.on}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: radius.pill, padding: PAD },
  thumb: { position: 'absolute', top: PAD, bottom: PAD, left: PAD, borderRadius: radius.pill },
  // A thumb is small: the raised shadow, at a size that suits it.
  softer: { shadowOpacity: 0.14, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  seg: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.md },
  on: { fontWeight: '600' },
});
