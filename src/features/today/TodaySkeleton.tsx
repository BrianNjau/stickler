import { StyleSheet, View } from 'react-native';

import { Card, radius, size, Skeleton, space, useTheme } from '@/ui';

/**
 * Loading: the populated layout as shapes (the hero card, then task cards). Never a spinner.
 * The hero placeholder keeps the hero slot, so the screen has exactly one hero while it loads.
 */
export function TodaySkeleton() {
  const { theme } = useTheme();
  return (
    <View style={styles.stack} accessible accessibilityLabel="Loading today’s plan" accessibilityState={{ busy: true }}>
      <Card elevation="hero" style={styles.hero}>
        <View style={styles.row}>
          <Skeleton onHero width={86} height={86} rounded={43} />
          <View style={styles.text}>
            <Skeleton onHero width="45%" height={11} />
            <Skeleton onHero width="85%" height={20} />
            <Skeleton onHero width="70%" height={12} />
          </View>
        </View>
        <Skeleton onHero height={size.button} rounded={radius.control} />
      </Card>
      <View style={styles.row}>
        <Skeleton width={70} height={20} />
        <View style={styles.text} />
        <Skeleton width={130} height={34} />
      </View>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.task, { borderColor: theme.line, backgroundColor: theme.surface }]}>
          <Skeleton width={26} height={26} rounded={8} />
          <View style={styles.text}>
            <Skeleton width={i === 1 ? '60%' : '85%'} height={14} />
            <Skeleton width={96} height={18} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: size.cardGap },
  hero: { gap: space.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  text: { flex: 1, gap: space.sm },
  task: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderWidth: 1, borderRadius: radius.panel, padding: space.lg },
});
