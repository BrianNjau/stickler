import { StyleSheet, View } from 'react-native';

import { Card, radius, size, Skeleton, space } from '@/ui';

/** Loading: the populated layout's cards, as shapes. Never a spinner. */
export function TodaySkeleton() {
  return (
    <View
      style={styles.stack}
      accessible
      accessibilityLabel="Loading today’s plan"
      accessibilityState={{ busy: true }}
    >
      <Card tint="mint">
        <Skeleton width="45%" height={12} />
        <Skeleton width="75%" height={22} />
        <View style={styles.pills}>
          <Skeleton width={64} height={22} />
          <Skeleton width={84} height={22} />
        </View>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.task}>
            <Skeleton width={size.checkbox} height={size.checkbox} rounded={7} />
            <View style={styles.taskText}>
              <Skeleton width={i === 1 ? '60%' : '85%'} height={14} />
              <Skeleton width={96} height={12} />
            </View>
          </View>
        ))}
        <Skeleton height={size.button} rounded={radius.control} />
      </Card>
      <Card tint="lilac">
        <Skeleton width="35%" height={12} />
        <Skeleton width="65%" height={18} />
      </Card>
      <Card>
        <Skeleton width="20%" height={12} />
        <Skeleton width="40%" height={22} />
        <Skeleton height={8} />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: size.cardGap },
  pills: { flexDirection: 'row', gap: space.sm },
  task: { flexDirection: 'row', gap: space.md, paddingVertical: space.sm },
  taskText: { flex: 1, gap: space.sm },
});
