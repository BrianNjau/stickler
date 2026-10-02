import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from './theme';
import { size, space } from './tokens';

/** A calm tab screen: warm ground, one scrolling column, gutter padding. */
export function Screen({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.fill, { backgroundColor: theme.ground }]}>
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: {
    width: '100%',
    // The kit is a phone layout; on wide screens the column stays phone-readable and centred.
    maxWidth: 640,
    alignSelf: 'center',
    paddingHorizontal: size.gutter,
    paddingTop: space.xl,
    paddingBottom: space.xxxl,
    gap: size.cardGap,
  },
});
