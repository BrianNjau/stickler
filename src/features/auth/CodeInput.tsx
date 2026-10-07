import { useRef } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { radius, space, Text, useTheme } from '@/ui';

export const CODE_LENGTH = 6;

interface CodeInputProps {
  value: string;
  onChange: (digits: string) => void;
  /** Called once all six digits are in. */
  onComplete: (code: string) => void;
  error: boolean;
  disabled?: boolean;
}

/**
 * One real text field drawn as six cells, so iOS can offer the code from Mail ("From Mail: 123456")
 * and paste works everywhere. VoiceOver sees a single field.
 */
export function CodeInput({ value, onChange, onComplete, error, disabled }: CodeInputProps) {
  const { theme, tint } = useTheme();
  const input = useRef<TextInput>(null);
  const cells = Array.from({ length: CODE_LENGTH }, (_, i) => value[i] ?? '');
  const border = (i: number) =>
    error ? tint('blush').fg : i === Math.min(value.length, CODE_LENGTH - 1) ? theme.ink : theme.line2;

  return (
    <Pressable onPress={() => input.current?.focus()} accessible={false} style={styles.row}>
      {cells.map((d, i) => (
        <View
          key={i}
          style={[styles.cell, { borderColor: border(i), backgroundColor: error ? theme.blush : theme.surface }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Text variant="mono" style={styles.digit}>
            {d}
          </Text>
        </View>
      ))}
      <TextInput
        ref={input}
        value={value}
        onChangeText={(t) => {
          const digits = t.replace(/\D/g, '').slice(0, CODE_LENGTH);
          onChange(digits);
          if (digits.length === CODE_LENGTH) onComplete(digits);
        }}
        editable={!disabled}
        autoFocus
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
        maxLength={CODE_LENGTH}
        accessibilityLabel="Six-digit code"
        accessibilityHint={error ? 'The last code did not match' : undefined}
        caretHidden
        style={styles.hidden}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm, justifyContent: 'space-between' },
  cell: {
    flex: 1,
    maxWidth: 56,
    aspectRatio: 0.82,
    borderWidth: 1.5,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: { fontSize: 24, lineHeight: 30 },
  // Covers the cells so taps and paste land in the real field; transparent so the cells show.
  hidden: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0.011, color: 'transparent' },
});
