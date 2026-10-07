import { router, type Href } from 'expo-router';
import { ChevronLeft } from './icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { useTheme } from './theme';
import { size, space } from './tokens';

export interface ScreenHeaderProps {
  title: string;
  /** Small mono line above the title (a date, a section). */
  eyebrow?: string;
  /** Shows a Back control. Falls back to `fallbackHref` when there is no history (e.g. a web deep link). */
  back?: { fallbackHref: Href };
  right?: ReactNode;
}

export function ScreenHeader({ title, eyebrow, back, right }: ScreenHeaderProps) {
  const { theme } = useTheme();
  return (
    <View style={styles.wrap}>
      {back && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          onPress={() => (router.canGoBack() ? router.back() : router.replace(back.fallbackHref))}
          style={styles.back}
        >
          <ChevronLeft size={20} color={theme.ink} strokeWidth={2.4} />
          <Text variant="small" color="ink">
            Back
          </Text>
        </Pressable>
      )}
      <View style={styles.row}>
        <View style={styles.titles}>
          {eyebrow && (
            <Text variant="label" color="ink3">
              {eyebrow}
            </Text>
          )}
          <Text variant="h1" accessibilityRole="header">
            {title}
          </Text>
        </View>
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  back: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', minHeight: size.hit, marginLeft: -space.xs },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
  titles: { flex: 1, gap: space.xs },
});
