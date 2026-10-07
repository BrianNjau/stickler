import { Pressable, StyleSheet, View } from 'react-native';

import { haptic } from './haptics';
import { Minus, Plus } from './icons';
import { Text } from './Text';
import { useTheme } from './theme';
import { radius, size, space } from './tokens';

export interface StepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (next: number) => void;
  /** How the value reads on screen and to VoiceOver, e.g. minutes → "2 h 30 min". */
  format: (value: number) => string;
}

/** − value +. One control on screen, one adjustable element to VoiceOver (swipe up/down). */
export function Stepper({ label, value, min, max, step, onChange, format }: StepperProps) {
  const { theme } = useTheme();
  const set = (v: number) => {
    const next = Math.min(max, Math.max(min, v));
    if (next !== value) {
      haptic('press');
      onChange(next);
    }
  };
  const button = (dir: -1 | 1) => {
    const Icon = dir < 0 ? Minus : Plus;
    const disabled = dir < 0 ? value <= min : value >= max;
    return (
      <Pressable
        onPress={() => set(value + dir * step)}
        disabled={disabled}
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={[styles.btn, { backgroundColor: theme.surface2 }, disabled && styles.disabled]}
      >
        <Icon size={18} color={theme.ink} strokeWidth={2.4} />
      </Pressable>
    );
  };

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value, text: format(value) }}
      // react-native-web ignores accessibilityValue; the aria-* props reach browser screen readers.
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={format(value)}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => set(value + (e.nativeEvent.actionName === 'increment' ? step : -step))}
    >
      <Text style={styles.label}>{label}</Text>
      {button(-1)}
      <Text variant="mono" style={styles.value}>
        {format(value)}
      </Text>
      {button(1)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: size.hit },
  label: { flex: 1 },
  btn: { width: size.hit, height: size.hit, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
  value: { minWidth: 84, textAlign: 'center', fontSize: 15, lineHeight: 20 },
});
