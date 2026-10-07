import { StyleSheet, View } from 'react-native';

import type { TodayBlock } from '@/lib/plans';
import { space, Text } from '@/ui';

/**
 * WP2's proof that the rotation ran: today's generated blocks and tasks, plainly. No styling work;
 * WP3 turns this into the real Today (block cards, timer, rounds).
 */
export function TodayList({ localDate, blocks }: { localDate: string; blocks: TodayBlock[] }) {
  return (
    <View style={styles.list} accessibilityLabel={`Today’s plan, ${localDate}`}>
      {blocks.map((b) => (
        <View key={b.id} style={styles.block}>
          <Text variant="h3" accessibilityRole="header">
            <Text variant="mono">
              {b.start}–{b.end}
            </Text>{' '}
            {b.title}
          </Text>
          {b.kind === 'break' ? (
            <Text variant="small" color="ink2">
              Break — no tasks, on purpose.
            </Text>
          ) : b.tasks.length === 0 ? (
            <Text variant="small" color="ink2">
              Nothing fits this block yet.
            </Text>
          ) : (
            b.tasks.map((t) => (
              <Text key={t.id} variant="small" color={t.done ? 'ink3' : 'ink'}>
                •{' '}
                {t.title}
                {t.estimateMinutes != null && <Text variant="mono"> {t.estimateMinutes}m</Text>}
                {` · ${t.priority}`}
                {t.isRescue ? ' · rescue' : ''}
              </Text>
            ))
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.xl },
  block: { gap: space.xs },
});
