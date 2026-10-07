import { Pressable, StyleSheet, View } from 'react-native';

import { haptic } from './haptics';
import { Text } from './Text';
import { useTheme } from './theme';
import { radius, size, space } from './tokens';

export interface ChipsProps<T extends string | number> {
  label: string;
  options: readonly { value: T; short: string; label: string }[];
  selected: readonly T[];
  onChange: (selected: T[]) => void;
}

/** Multi-select. Short text on screen ("Su"), the full name to VoiceOver ("Sunday"). */
export function Chips<T extends string | number>({ label, options, selected, onChange }: ChipsProps<T>) {
  const { theme } = useTheme();
  return (
    <View style={styles.row} accessibilityLabel={label}>
      {options.map((o) => {
        const on = selected.includes(o.value);
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            aria-checked={on}
            accessibilityLabel={o.label}
            onPress={() => {
              haptic('press');
              onChange(on ? selected.filter((v) => v !== o.value) : [...selected, o.value]);
            }}
            style={[
              styles.chip,
              on ? { backgroundColor: theme.ink, borderColor: theme.ink } : { backgroundColor: theme.surface, borderColor: theme.line2 },
            ]}
          >
            <Text variant="small" color={on ? 'inkOn' : 'ink'}>
              {o.short}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minWidth: size.hit,
    minHeight: size.hit,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
});
