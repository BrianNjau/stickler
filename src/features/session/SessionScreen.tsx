import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Button,
  chime,
  elevation,
  glow,
  haptic,
  Ring,
  SessionGlow,
  Sheet,
  size,
  Snitch,
  space,
  TaskCard,
  Text,
  TextField,
  ThemeOverride,
  useMotion,
  useSnitchEnabled,
  useTheme,
} from '@/ui';
import { BookOpen, CircleParking, Pause, Play, X } from '@/ui/icons';

import { sessionCopy as copy } from './copy';
import { sessionPreview as P } from './preview';

const RING = 268;
const GLOW = 380;

const clock = (s: number) => {
  const t = Math.max(0, Math.ceil(s));
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};
const hms = (s: number) => {
  const t = Math.floor(s);
  return `${String(Math.floor(t / 3600)).padStart(2, '0')}:${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

/** The Snitch's REC strip: it is the one doing the observing, so it goes when the Snitch does. */
function RecStrip({ observed, share }: { observed: number; share: number }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.rec, { backgroundColor: theme.snitchBg }]} accessible accessibilityLabel={`${copy.observed} ${hms(observed)}. ${copy.tabs(Math.round(share * 100))}`}>
      <View style={[styles.recDot, { backgroundColor: theme.snitch }]} />
      <Text variant="label" fg={theme.snitch}>
        {copy.rec}
      </Text>
      <Text variant="label" fg={theme.ink2} style={styles.grow}>
        {copy.observed} {hms(observed)}
      </Text>
      <Text variant="mono" fg={theme.ink2}>
        {Math.round(share * 100)}%
      </Text>
      <View style={[styles.recBar, { backgroundColor: theme.line }]}>
        <View style={[styles.recFill, { width: `${share * 100}%`, backgroundColor: theme.snitch }]} />
      </View>
    </View>
  );
}

function Pips({ round, of, done }: { round: number; of: number; done: boolean }) {
  const { theme } = useTheme();
  return (
    <View style={styles.pipsRow} accessible accessibilityLabel={copy.round(round, of)}>
      {Array.from({ length: of }, (_, i) => (
        <View key={i} style={[styles.pip, { backgroundColor: done || i < round ? theme.amber : theme.line2 }]} />
      ))}
      <Text variant="mono" color="ink3" style={styles.pipText}>
        {copy.round(round, of)}
      </Text>
    </View>
  );
}

function RoundButton({ label, icon: Icon, onPress }: { label: string; icon: typeof BookOpen; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptic('press');
        onPress();
      }}
      style={[styles.round, { backgroundColor: theme.focusCard, borderColor: theme.line2 }]}
    >
      <Icon size={20} color={theme.ink} />
    </Pressable>
  );
}

function SnitchTile({ line }: { line: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.snitchRow} accessible accessibilityLabel={`The Snitch says: ${line}`} accessibilityLiveRegion="polite">
      <View style={[styles.snitchBubble, { backgroundColor: theme.snitchBg, borderColor: theme.snitch }]}>
        <Text variant="label" fg={theme.snitch}>
          The Snitch
        </Text>
        <Text variant="mono" fg={theme.ink} style={styles.snitchText}>
          {line}
        </Text>
      </View>
      <View style={[styles.snitchTile, { backgroundColor: theme.focusCard, borderColor: theme.line2 }, elevation.raised]}>
        <Snitch mood="watch" size={48} />
        <View style={[styles.snitchLed, { backgroundColor: theme.snitch }]} />
      </View>
    </View>
  );
}

function SessionBody({ demoSeconds }: { demoSeconds: number | null }) {
  const { theme } = useTheme();
  const m = useMotion();
  const snitchOn = useSnitchEnabled();
  const roundTotal = demoSeconds ?? P.roundMinutes * 60;
  const [mountedAt] = useState(() => Date.now());
  const [round, setRound] = useState<number>(P.round);
  const [endsAt, setEndsAt] = useState(() => Date.now() + (demoSeconds ?? P.startRemainingSeconds) * 1000);
  const [pausedLeft, setPausedLeft] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [pulse, setPulse] = useState(0);
  const [bossDone, setBossDone] = useState(false);
  const [snitchLine, setSnitchLine] = useState<string>(P.snitchLines[0]);
  const [sheet, setSheet] = useState<'trip' | 'park' | null>(null);
  const [parked, setParked] = useState('');
  const ended = useRef(0);
  const glowLevel = useSharedValue(glow.rest / glow.peak);

  // Re-render a few times a second; the time itself always comes from endsAt and the wall clock.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const left = pausedLeft ?? Math.max(0, (endsAt - now) / 1000);

  useEffect(() => {
    if (done || pausedLeft != null || left > 0 || ended.current === round) return;
    ended.current = round;
    // Round ends: ring pulses once, the glow brightens 20% → 32% and settles, success haptic, chime.
    haptic('roundEnd');
    chime();
    glowLevel.set(
      m.animate(glow.rest / glow.peak, ({ withSequence, withTiming }) =>
        withSequence(withTiming(1, { duration: 260 }), withTiming(glow.rest / glow.peak, { duration: 1400 })),
      ),
    );
    const id = setTimeout(() => {
      setPulse((p) => p + 1);
      if (round >= P.rounds) {
        setDone(true);
        setSnitchLine(P.snitchLines[2]);
      } else {
        setSnitchLine(P.snitchLines[1]);
        setRound(round + 1);
        setEndsAt(Date.now() + roundTotal * 1000);
      }
    }, 0);
    return () => clearTimeout(id);
  }, [left, done, pausedLeft, round, roundTotal, m, glowLevel]);

  const glowStyle = useAnimatedStyle(() => ({ opacity: glowLevel.get() }));
  const paused = pausedLeft != null;
  const togglePause = () => {
    if (paused) {
      setEndsAt(Date.now() + pausedLeft * 1000);
      setPausedLeft(null);
    } else {
      setPausedLeft(left);
    }
  };

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: theme.focusBg }]} edges={['top', 'bottom', 'left', 'right']}>
      {snitchOn && <RecStrip observed={P.observedSeconds + (now - mountedAt) / 1000} share={P.tabShare} />}
      <View style={styles.column}>
        <View style={styles.top}>
          <Pips round={round} of={P.rounds} done={done} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.close}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={[styles.close, { borderColor: theme.line2, backgroundColor: theme.focusCard }]}
          >
            <X size={20} color={theme.ink} />
          </Pressable>
        </View>

        {/* The hero: the ring, on its glow. */}
        <View style={styles.ringSlot} testID="hero">
          <Animated.View style={[styles.glow, glowStyle]} pointerEvents="none">
            <SessionGlow size={GLOW} intensity={glow.peak} />
          </Animated.View>
          <Ring
            value={done ? 1 : left / roundTotal}
            size={RING}
            stroke={14}
            color={done ? theme.good : paused ? theme.ink3 : 'live'}
            track={theme.focusCard}
            knob={done ? undefined : theme.ink}
            pulse={pulse}
            label={done ? copy.doneTitle : `${clock(left)} ${copy.leftInRound}`}
          >
            <Text style={styles.timer} fg={theme.ink} accessibilityElementsHidden importantForAccessibility="no">
              {done ? clock(0) : clock(left)}
            </Text>
            <Text variant="label" color="ink3">
              {done ? copy.doneTitle : paused ? copy.paused : copy.leftInRound}
            </Text>
          </Ring>
        </View>

        <View style={styles.titles}>
          <Text variant="h1" style={styles.center} accessibilityRole="header">
            {done ? copy.doneTitle : P.block}
          </Text>
          <Text variant="small" color="ink2" style={styles.center}>
            {done ? (
              copy.doneBody(P.rounds)
            ) : (
              <>
                <Text variant="small" fg={theme.amber} style={styles.bold}>
                  {copy.mission}
                </Text>{' '}
                {P.mission}
              </>
            )}
          </Text>
        </View>

        {!done && <TaskCard title={P.boss.title} priority="boss" xp={P.boss.xp} done={bossDone} onToggle={() => setBossDone((d) => !d)} />}

        {done ? (
          <Button label={copy.doneCta} onPress={() => router.replace('/')} />
        ) : (
          <View style={styles.controls}>
            <Button label={paused ? copy.resume : copy.pause} icon={paused ? Play : Pause} variant="live" onPress={togglePause} style={styles.grow} />
            <RoundButton label={copy.studyTrip} icon={BookOpen} onPress={() => setSheet('trip')} />
            <RoundButton label={copy.park} icon={CircleParking} onPress={() => setSheet('park')} />
          </View>
        )}

        <View style={styles.grow} />
        {snitchOn && <SnitchTile line={snitchLine} />}
      </View>

      <Sheet visible={sheet === 'trip'} title={copy.studyTrip} onClose={() => setSheet(null)}>
        <Text color="ink2">{copy.studyTripBody}</Text>
        <Button label={copy.studyTripCta} onPress={() => setSheet(null)} />
      </Sheet>
      <Sheet visible={sheet === 'park'} title={copy.park} onClose={() => setSheet(null)}>
        <TextField label={copy.parkLabel} value={parked} onChangeText={setParked} placeholder={copy.parkPlaceholder} />
        <Button
          label={copy.parkCta}
          disabled={!parked.trim()}
          onPress={() => {
            setParked('');
            setSheet(null);
          }}
        />
      </Sheet>
    </SafeAreaView>
  );
}

/**
 * The session (docs/design/Focus · polished). Always dark. Preview only until WP3: ?preview=1, and
 * ?roundSeconds=N for a short round (to see a round end without waiting 23 minutes).
 */
export function SessionScreen() {
  const { preview, roundSeconds } = useLocalSearchParams<{ preview?: string; roundSeconds?: string }>();
  const demo = Number(roundSeconds);
  useEffect(() => {
    if (!preview) router.replace('/focus');
  }, [preview]);
  if (!preview) return null;
  return (
    <ThemeOverride dark>
      <StatusBar style="light" />
      <SessionBody demoSeconds={Number.isFinite(demo) && demo > 0 ? demo : null} />
    </ThemeOverride>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  grow: { flex: 1 },
  column: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: size.gutter, paddingBottom: space.lg, gap: space.xl },
  rec: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: size.gutter, minHeight: 34 },
  recDot: { width: 8, height: 8, borderRadius: 4 },
  recBar: { width: 40, height: 4, borderRadius: 2, overflow: 'hidden' },
  recFill: { height: 4 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: space.lg },
  pipsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pip: { width: 26, height: 5, borderRadius: 3 },
  pipText: { marginLeft: space.sm },
  close: { width: size.hit, height: size.hit, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  ringSlot: { alignSelf: 'center', width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: GLOW, height: GLOW, left: (RING - GLOW) / 2, top: (RING - GLOW) / 2 },
  timer: { fontFamily: 'IBMPlexMono_600SemiBold', fontSize: 60, lineHeight: 66, letterSpacing: -1.2, fontVariant: ['tabular-nums'] },
  titles: { gap: space.xs },
  center: { textAlign: 'center' },
  bold: { fontWeight: '600' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  round: { width: 54, height: 54, borderRadius: 27, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  snitchRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
  snitchBubble: { flex: 1, gap: space.xs, borderWidth: 1, borderRadius: 16, borderBottomRightRadius: 4, paddingHorizontal: space.lg, paddingVertical: space.md },
  snitchText: { textTransform: 'uppercase' },
  snitchTile: { width: 64, height: 64, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  snitchLed: { position: 'absolute', top: 7, right: 7, width: 8, height: 8, borderRadius: 4 },
});
