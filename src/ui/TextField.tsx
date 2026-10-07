import { forwardRef, useState } from 'react';
import { Platform, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Text } from './Text';
import { useTheme } from './theme';
import { radius, size, space, text, type } from './tokens';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  /** Shown under the field, and announced. Turns the border to the error colour. */
  error?: string | null;
  hint?: string;
}

/** Labelled single-line input. Label is a mono eyebrow above the field, as on the sign-in artboard. */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, hint, onFocus, onBlur, ...rest },
  ref,
) {
  const { theme, tint, fontsReady } = useTheme();
  const [focused, setFocused] = useState(false);
  const border = error ? tint('blush').fg : focused ? theme.ink : theme.line2;

  return (
    <View style={styles.wrap}>
      <Text variant="label" color="ink3">
        {label}
      </Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        placeholderTextColor={theme.ink3}
        allowFontScaling
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
        style={[
          styles.input,
          {
            color: theme.ink,
            backgroundColor: theme.surface,
            borderColor: border,
            fontFamily: Platform.OS === 'web' || fontsReady ? type.body : undefined,
          },
        ]}
      />
      {error ? (
        <Text variant="small" fg={tint('blush').fg} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="small" color="ink2">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  input: {
    minHeight: size.button,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: space.lg + 2,
    fontSize: text.body.size,
  },
});
