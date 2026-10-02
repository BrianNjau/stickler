import { StyleSheet, View } from 'react-native';

import { Card, Pill, Screen, Text, space } from '@/ui';

import { DevBackendStatus } from './DevBackendStatus';

const dateLabel = (d: Date) =>
  d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

export function TodayScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="eyebrow" tone="ink2">
          {dateLabel(new Date())}
        </Text>
        <Text variant="display" accessibilityRole="header">
          Today
        </Text>
      </View>

      <Card accessibilityLabel="No blocks planned for today">
        <Pill label="0 blocks" />
        <Text variant="title">Nothing on the strip yet</Text>
        <Text tone="ink2">Set a goal and today’s blocks, quests and timer will line up here.</Text>
      </Card>

      {__DEV__ && <DevBackendStatus />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: space.xs, paddingTop: space.sm },
});
