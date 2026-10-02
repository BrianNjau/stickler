import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { fonts, typeScale, useColors, type ColorTokens, type TypeVariant } from './tokens';

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  /** Text colours only; `ink3` is excluded because it fails contrast as text. */
  tone?: 'ink' | 'ink2' | 'accentInk' | 'boss' | 'good' | 'warn';
}

export function Text({ variant = 'body', tone = 'ink', style, ...rest }: TextProps) {
  const colors: ColorTokens = useColors();
  const fontFamily = variant === 'mono' ? fonts.mono : variant === 'display' ? fonts.display : fonts.body;

  return (
    <RNText
      {...rest}
      style={[
        typeScale[variant],
        { color: colors[tone], fontFamily },
        variant === 'eyebrow' && { textTransform: 'uppercase' },
        variant === 'mono' && { fontVariant: ['tabular-nums'] },
        style,
      ]}
    />
  );
}
