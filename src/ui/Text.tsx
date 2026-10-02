import { Platform, Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useTheme, type TintName } from './theme';
import { text, type Theme } from './tokens';

export type TextVariant = keyof typeof text;

/** Palette keys that are legal as text. Tints and surfaces are excluded on purpose. */
export type TextColor = Exclude<
  keyof Theme,
  TintName | 'ground' | 'surface' | 'surface2' | 'line' | 'line2' | 'snitchBg' | 'focusBg' | 'focusCard'
>;

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: TextColor;
  /** Raw colour for text on a tint — pass `tint(name).fg`. Wins over `color`. */
  fg?: string;
}

const isMono = (family: string) => family.startsWith('IBMPlexMono');
const isDisplay = (family: string) => family.startsWith('Bricolage');

// Web takes a CSS stack, so the system font holds the layout until the brand font arrives.
function family(name: string, ready: boolean): string | undefined {
  const fallback = isMono(name)
    ? 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    : isDisplay(name)
      ? 'ui-sans-serif, system-ui, sans-serif'
      : 'system-ui, -apple-system, "Segoe UI", sans-serif';
  if (Platform.OS === 'web') return `${name}, ${fallback}`;
  return ready ? name : undefined;
}

export function Text({ variant = 'body', color = 'ink', fg, style, allowFontScaling = true, ...rest }: TextProps) {
  const { theme, fontsReady } = useTheme();
  const t = text[variant];
  const numeric = isMono(t.family);

  return (
    <RNText
      allowFontScaling={allowFontScaling}
      {...rest}
      style={[
        {
          fontFamily: family(t.family, fontsReady),
          fontSize: t.size,
          lineHeight: t.line,
          letterSpacing: t.spacing,
          color: fg ?? theme[color],
        },
        'uppercase' in t && t.uppercase && { textTransform: 'uppercase' },
        numeric && { fontVariant: ['tabular-nums'] },
        style,
      ]}
    />
  );
}
