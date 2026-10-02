import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, radius, Screen, ScreenHeader, space, Text, useTheme } from '@/ui';
import { Flame } from '@/ui/icons';

import { DevBackendStatus } from './DevBackendStatus';
import { parseTodayState, todayPreview, type TodayState } from './preview';
import { TodayEmpty } from './TodayEmpty';
import { TodayPopulated } from './TodayPopulated';
import { TodaySkeleton } from './TodaySkeleton';

const dateLabel = (d: Date) => d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

function Streak({ days }: { days: number }) {
  const { theme } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${days} day streak`}
      style={[styles.streak, { backgroundColor: theme.butter }]}
    >
      <Flame size={16} color={theme.amber} fill={theme.amber} />
      <Text variant="mono" color="onButter">
        {days}
      </Text>
    </View>
  );
}

/** Development-only: flip between the three states on a device (?state= does the same on web). */
function DevStatePicker({ current }: { current: TodayState }) {
  return (
    <View style={styles.devRow}>
      {(['empty', 'loading', 'populated'] as const).map((s) => (
        <Button
          key={s}
          label={s}
          size="md"
          block={false}
          variant={s === current ? 'primary' : 'secondary'}
          onPress={() => router.setParams({ state: s })}
        />
      ))}
    </View>
  );
}

export function TodayScreen() {
  // Until WP3 wires fn_generate_day, the state comes from ?state= and defaults to the honest one: no plan.
  const state = parseTodayState(useLocalSearchParams<{ state?: string }>().state);

  return (
    <Screen>
      <ScreenHeader
        eyebrow={dateLabel(new Date())}
        title="Today"
        right={state === 'populated' ? <Streak days={todayPreview.streak} /> : undefined}
      />

      {state === 'empty' && <TodayEmpty />}
      {state === 'loading' && <TodaySkeleton />}
      {state === 'populated' && <TodayPopulated data={todayPreview} />}

      {__DEV__ && (
        <>
          <DevStatePicker current={state} />
          <DevBackendStatus />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    minHeight: 32,
    borderRadius: radius.pill,
  },
  devRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.xl },
});
