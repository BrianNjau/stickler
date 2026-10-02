import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { Text } from './Text';
import { hitTarget, radius, space, useColors } from './tokens';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: 'primary' | 'ghost';
}

export function Button({ label, variant = 'primary', disabled, style, ...rest }: ButtonProps) {
  const c = useColors();
  const primary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      {...rest}
      style={(state) => [
        styles.base,
        primary
          ? { backgroundColor: c.accent, borderColor: c.accent }
          : { backgroundColor: c.surface, borderColor: c.line },
        state.pressed && styles.pressed,
        disabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      <Text variant="label" tone={primary ? 'accentInk' : 'ink'}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: hitTarget,
    paddingHorizontal: space.lg,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
});
