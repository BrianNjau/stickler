import { StyleSheet, View, type ViewProps } from 'react-native';

import { useTheme, type TintName } from './theme';
import { radius, space } from './tokens';

export interface CardProps extends ViewProps {
  /** One flat tint per card. Untinted cards are white paper with a hairline. */
  tint?: TintName;
}

export function Card({ tint, style, ...rest }: CardProps) {
  const { theme, tint: tintOf } = useTheme();
  const look = tint
    ? { backgroundColor: tintOf(tint).bg, borderWidth: 0 }
    : { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line };
  return <View {...rest} style={[styles.card, look, style]} />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    padding: space.xl,
    gap: space.md,
  },
});
