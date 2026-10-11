import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  DayStrip,
  EmptyState,
  ErrorState,
  Fab,
  LevelUp,
  LiveGradient,
  MascotBubble,
  radius,
  Ring,
  Screen,
  ScreenHeader,
  Segmented,
  Skeleton,
  space,
  StatNumber,
  TaskCard,
  Text,
  useTheme,
  type StripDay,
} from '@/ui';

import { kitCopy } from './copy';

const days: StripDay[] = [
  { date: '2026-10-05', weekday: 'Mon', day: 5 },
  { date: '2026-10-06', weekday: 'Tue', day: 6 },
  { date: '2026-10-07', weekday: 'Wed', day: 7, isToday: true },
  { date: '2026-10-08', weekday: 'Thu', day: 8 },
  { date: '2026-10-09', weekday: 'Fri', day: 9 },
  { date: '2026-10-10', weekday: 'Sat', day: 10, rest: true },
  { date: '2026-10-11', weekday: 'Sun', day: 11 },
];

/** Dev only: every WP2.7 primitive on one screen, against docs/design/Polish kit. */
export function KitScreen() {
  const { theme, hero } = useTheme();
  const [pct, setPct] = useState(0.6);
  const [xp, setXp] = useState(1240);
  const [day, setDay] = useState('2026-10-07');
  const [tab, setTab] = useState<'left' | 'done'>('left');
  const [done, setDone] = useState({ a: false, b: false });
  const [level, setLevel] = useState(false);

  return (
    <Screen
      clearFab
      overlay={
        <>
          <Fab label={kitCopy.fab} onPress={() => setLevel(true)} />
          {level && <LevelUp from={4} to={5} title={kitCopy.levelTitle} line={kitCopy.levelLine} onClose={() => setLevel(false)} />}
        </>
      }
    >
      <ScreenHeader eyebrow="Polish pass" title="Depth, one gradient, and motion with a job" />

      <Card>
        <Text variant="h3">Elevation ladder</Text>
        <Card>
          <Text color="ink2">0 · flat card, border only</Text>
        </Card>
        <Card elevation="raised">
          <Text color="ink2">1 · raised: sheets, FAB rest</Text>
        </Card>
        <Card elevation="hero">
          <Text fg={hero.fg}>2 · hero: one per screen, only</Text>
        </Card>
      </Card>

      <Card>
        <Text variant="h3">The one gradient</Text>
        <View style={styles.swatch}>
          <LiveGradient radius={radius.control} />
        </View>
        <Text variant="mono" color="ink3">
          liveGradient · 135°
        </Text>
      </Card>

      <Card>
        <Text variant="h3">Progress rings</Text>
        <View style={styles.row}>
          <Ring value={pct} size={86} color="live" label={`${Math.round(pct * 100)}%`}>
            <StatNumber value={Math.round(pct * 100)} format={(n) => `${n}%`} variant="h2" />
          </Ring>
          <Ring value={0.7} size={56} color={theme.ink} label="Level 4">
            <Text variant="mono">Lv4</Text>
          </Ring>
        </View>
        <View style={styles.row}>
          <Button label="−10%" variant="secondary" size="md" block={false} onPress={() => setPct((p) => Math.max(0, p - 0.1))} />
          <Button label="+10%" variant="secondary" size="md" block={false} onPress={() => setPct((p) => Math.min(1, p + 0.1))} />
        </View>
      </Card>

      <Card>
        <Text variant="h3">Numbers that change</Text>
        <StatNumber value={xp} format={(n) => `${n.toLocaleString()} XP`} variant="h1" />
        <Button label="+30 XP" variant="secondary" size="md" block={false} onPress={() => setXp((v) => v + 30)} />
      </Card>

      <DayStrip days={days} selected={day} onSelect={setDay} memoryKey="kit" />

      <View style={styles.between}>
        <Text variant="h2">Tasks</Text>
        <View style={styles.segment}>
          <Segmented
            size="sm"
            label="Show"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'left', label: 'Left' },
              { value: 'done', label: 'Done' },
            ]}
          />
        </View>
      </View>
      <TaskCard title="VPC design: subnets, routing, NAT" priority="boss" minutes={25} xp={30} done={done.a} onToggle={() => setDone((d) => ({ ...d, a: !d.a }))} />
      <TaskCard title="Multi-AZ failover patterns" priority="main" minutes={20} xp={20} done={done.b} onToggle={() => setDone((d) => ({ ...d, b: !d.b }))} />

      <MascotBubble persona="nimbus" tint="sky">
        {kitCopy.nimbus}
      </MascotBubble>

      <Card>
        <Skeleton width="60%" height={14} />
        <Skeleton height={14} />
        <Skeleton width="40%" height={14} />
      </Card>
      <EmptyState line={kitCopy.empty} action={{ label: kitCopy.emptyAction, onPress: () => setPct(0) }} />
      <ErrorState message={kitCopy.error} action={{ label: kitCopy.errorAction, onPress: () => setPct(0.6) }} />
      <Button label="Saving" loading />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xl },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  segment: { width: 140 },
  swatch: { height: 52, borderRadius: radius.control, overflow: 'hidden' },
});
