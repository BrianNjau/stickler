import { Children, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Rise } from './Rise';
import { useTheme } from './theme';
import { size, space } from './tokens';

export interface ScreenProps {
  children: ReactNode;
  /** Fixed above the scroll: the FAB, a takeover. */
  overlay?: ReactNode;
  /** Extra room at the bottom so the last card clears the FAB. */
  clearFab?: boolean;
}

/**
 * A calm tab screen: warm ground, one scrolling column, gutter padding. Each top-level child
 * rises in on mount, 40 ms after the one before (still under Reduce Motion).
 */
export function Screen({ children, overlay, clearFab }: ScreenProps) {
  const { theme } = useTheme();
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.fill, { backgroundColor: theme.ground }]}>
      <ScrollView contentContainerStyle={[styles.content, clearFab && styles.clearFab]}>
        {Children.toArray(children).map((child, i) => (
          <Rise key={i} index={i}>
            {child}
          </Rise>
        ))}
      </ScrollView>
      {overlay && <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>{overlay}</View>}
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
  clearFab: { paddingBottom: 60 + space.xxxl * 2 },
});
