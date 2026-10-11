import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Card,
  EmptyState,
  MascotBubble,
  radius,
  Ring,
  Screen,
  ScreenHeader,
  Segmented,
  size,
  skillColors,
  space,
  StatNumber,
  Text,
  useTheme,
} from '@/ui';
import { Check } from '@/ui/icons';

import { pathCopy as copy } from './copy';
import { pathPreview, type PathStage, type PathTrack } from './preview';

function Dot({ state, n }: { state: PathStage['state']; n: number }) {
  const { theme } = useTheme();
  if (state === 'done')
    return (
      <View style={[styles.dot, { backgroundColor: theme.good, borderColor: theme.good }]}>
        <Check size={16} color={theme.inkOn} strokeWidth={3} />
      </View>
    );
  return (
    <View style={[styles.dot, { backgroundColor: theme.surface, borderColor: state === 'current' ? theme.amber : theme.line2 }]}>
      <Text variant="mono" color={state === 'current' ? 'ink' : 'ink3'}>
        {n}
      </Text>
    </View>
  );
}

/** The current stage: the screen's one hero. */
function CurrentStage({ stage, n }: { stage: PathStage; n: number }) {
  const { theme, hero } = useTheme();
  const ms = stage.milestones ?? [];
  const pct = ms.length ? ms.filter((m) => m.done).length / ms.length : 0;
  return (
    <Card elevation="hero">
      <View style={styles.heroTop}>
        <Ring value={pct} size={56} color={theme.amber} track={hero.track} label={copy.stageProgress(Math.round(pct * 100))}>
          <Text variant="mono" fg={hero.fg}>
            {n}
          </Text>
        </Ring>
        <View style={styles.grow}>
          <Text variant="label" fg={theme.amber}>
            {copy.youAreHere}
          </Text>
          <Text variant="h2" fg={hero.fg} accessibilityRole="header">
            {stage.title}
          </Text>
        </View>
      </View>
      <Text variant="small" fg={hero.fg2}>
        {stage.body}
      </Text>
      {ms.length > 0 && (
        <View style={[styles.checklist, { borderColor: hero.track }]}>
          <Text variant="mono" fg={hero.fg2}>
            {copy.ticksItself}
          </Text>
          {ms.map((m) => (
            <View key={m.title} style={styles.msRow} accessible accessibilityLabel={`${m.title}, ${m.when}${m.done ? ', done' : ''}`}>
              <View style={[styles.box, m.done ? { backgroundColor: theme.good, borderColor: theme.good } : { borderColor: hero.track }]}>
                {m.done && <Check size={12} color={theme.inkOn} strokeWidth={3} />}
              </View>
              <Text fg={hero.fg} style={[styles.grow, m.done && styles.struck]}>
                {m.title}
              </Text>
              <Text variant="mono" fg={hero.fg2}>
                {m.when}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

function TrackView({ track }: { track: PathTrack }) {
  const { theme, tint } = useTheme();
  const sky = tint('sky');
  const done = track.stages.filter((s) => s.state === 'done').length;
  return (
    <View style={styles.track}>
      <Card tint="sky">
        <Text variant="label" fg={sky.fg}>
          {copy.track} {track.label.split(' · ')[0]?.replace('Track ', '')}
        </Text>
        <Text variant="h2" fg={sky.fg}>
          {track.goal}
        </Text>
        <View style={[styles.bar, { backgroundColor: theme.surface }]} accessible={false}>
          <View style={[styles.barFill, { width: `${(done / track.stages.length) * 100}%`, backgroundColor: skillColors[0].solid }]} />
        </View>
        <StatNumber value={done} format={(n) => copy.stagesDone(n, track.stages.length)} variant="mono" fg={sky.fg} />
      </Card>
      {track.stages.map((s, i) =>
        s.state === 'current' ? (
          <CurrentStage key={s.title} stage={s} n={i + 1} />
        ) : (
          <View key={s.title} style={styles.stage}>
            <Dot state={s.state} n={i + 1} />
            <View style={styles.grow}>
              <Text variant="h3" color={s.state === 'next' ? 'ink2' : 'ink'} style={s.state === 'done' && styles.struck}>
                {s.title}
              </Text>
              <Text variant="small" color="ink2">
                {s.body}
              </Text>
            </View>
          </View>
        ),
      )}
    </View>
  );
}

function PathPreview() {
  const [key, setKey] = useState(pathPreview.tracks[0]?.key ?? '');
  const track = pathPreview.tracks.find((t) => t.key === key) ?? pathPreview.tracks[0];
  if (!track) return null;
  return (
    <Screen>
      <ScreenHeader title={copy.title} />
      <Text color="ink2">{pathPreview.intro}</Text>
      <Segmented label={copy.tracks} value={key} onChange={setKey} options={pathPreview.tracks.map((t) => ({ value: t.key, label: t.label }))} />
      <TrackView key={track.key} track={track} />
      <MascotBubble persona="snitch">{pathPreview.snitchLine}</MascotBubble>
    </Screen>
  );
}

/** Path. The full map (WP10) is a preview for now (?state=preview); live shows the empty state. */
export function PathScreen() {
  const { state } = useLocalSearchParams<{ state?: string }>();
  if (state === 'preview') return <PathPreview />;
  return (
    <Screen>
      <ScreenHeader title={copy.title} />
      <EmptyState hero mascot={{ persona: 'nimbus', mood: 'focus' }} line={copy.empty.line} action={{ label: copy.empty.action, onPress: () => router.navigate('/') }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  track: { gap: size.cardGap },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  checklist: { borderWidth: 1, borderRadius: radius.control, padding: space.lg, gap: space.sm },
  msRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 28 },
  box: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  struck: { textDecorationLine: 'line-through' },
  stage: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.xs },
  dot: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  bar: { height: 8, borderRadius: radius.pill, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: radius.pill },
});
