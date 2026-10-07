import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAuth } from '@/lib/auth';
import { loadToday, type TodayData } from '@/lib/plans';
import { Button, Card, radius, Screen, ScreenHeader, space, Text, useTheme } from '@/ui';
import { Flame } from '@/ui/icons';

import { DevBackendStatus } from './DevBackendStatus';
import { parseTodayState, todayPreview, type TodayState } from './preview';
import { TodayEmpty } from './TodayEmpty';
import { TodayList } from './TodayList';
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

/** Development-only: the WP0.5 design states (?state= on web), or back to live data. */
function DevStatePicker({ current }: { current: TodayState | 'live' }) {
  return (
    <View style={styles.devRow}>
      {(['live', 'empty', 'loading', 'populated'] as const).map((s) => (
        <Button
          key={s}
          label={s}
          size="md"
          block={false}
          variant={s === current ? 'primary' : 'secondary'}
          onPress={() => router.setParams({ state: s === 'live' ? undefined : s })}
        />
      ))}
    </View>
  );
}

function DevTools({ current }: { current: TodayState | 'live' }) {
  if (!__DEV__) return null;
  return (
    <>
      <DevStatePicker current={current} />
      <DevBackendStatus />
    </>
  );
}

/** The design states from WP0.5, for screenshots and review. Fixture data, no backend. */
function PreviewToday({ state }: { state: TodayState }) {
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
      <DevTools current={state} />
    </Screen>
  );
}

/** The real day: no plan → the goal prompt; otherwise today's generated blocks, plainly (WP3 styles it). */
function LiveToday() {
  const { user } = useAuth();
  const [data, setData] = useState<TodayData | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    if (!user) return;
    let live = true;
    loadToday(user.id).then(
      (d) => {
        if (!live) return;
        setFailed(false);
        setData(d);
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [user]);

  // Reload on every visit, so a plan started a moment ago shows up immediately.
  useFocusEffect(load);

  return (
    <Screen>
      <ScreenHeader eyebrow={dateLabel(new Date())} title="Today" />
      {failed && !data ? (
        <Card>
          <Text>Today couldn’t load. Check your connection.</Text>
          <Button label="Try again" variant="secondary" size="md" onPress={() => load()} />
        </Card>
      ) : !data ? (
        <TodaySkeleton />
      ) : data.kind === 'noPlan' ? (
        <TodayEmpty />
      ) : (
        <TodayList localDate={data.localDate} blocks={data.blocks} />
      )}
      <DevTools current="live" />
    </Screen>
  );
}

export function TodayScreen() {
  const { state } = useLocalSearchParams<{ state?: string }>();
  return state ? <PreviewToday state={parseTodayState(state)} /> : <LiveToday />;
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
