import { StyleSheet, View, type ViewProps } from 'react-native';

import { radius, space, useColors } from './tokens';

export function Card({ style, ...rest }: ViewProps) {
  const c = useColors();
  return <View {...rest} style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, style]} />;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.lg,
    gap: space.sm,
  },
});
