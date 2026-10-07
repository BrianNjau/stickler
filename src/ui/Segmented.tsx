import { Pressable, StyleSheet, View } from 'react-native';

import { haptic } from './haptics';
import { Text } from './Text';
import { useTheme } from './theme';
import { radius, size, space } from './tokens';

export interface SegmentedProps<T extends string | number> {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/** A single choice from a few. Selected segment is ink, like a primary action. */
export function Segmented<T extends string | number>({ label, options, value, onChange }: SegmentedProps<T>) {
  const { theme } = useTheme();
  return (
    <View style={[styles.track, { backgroundColor: theme.surface2 }]} accessibilityRole="radiogroup" accessibilityLabel={label}>
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
            style={[styles.seg, on && { backgroundColor: theme.ink }]}
          >
            <Text variant="small" color={on ? 'inkOn' : 'ink2'} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: radius.control, padding: 3, gap: 3 },
  seg: {
    flex: 1,
    minHeight: size.hit - 6,
    borderRadius: radius.control - 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xs,
  },
});
