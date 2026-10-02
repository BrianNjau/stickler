import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { space, useColors } from './tokens';

/** Standard tab screen: safe area top, scrolling column capped at the prototype's content width. */
export function Screen({ children }: { children: ReactNode }) {
  const c = useColors();
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.fill, { backgroundColor: c.ground }]}>
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
    padding: space.lg,
    paddingBottom: space.xxl,
    gap: space.lg,
  },
});
