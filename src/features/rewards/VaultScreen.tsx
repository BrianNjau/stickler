import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Svg, { Ellipse, Path, Rect } from 'react-native-svg';

import {
  Burst,
  Button,
  Card,
  EmptyState,
  haptic,
  MascotBubble,
  motion,
  palette,
  radius,
  Screen,
  ScreenHeader,
  space,
  StatNumber,
  Text,
  useMotion,
  useTheme,
  type TintName,
} from '@/ui';
import { Lock } from '@/ui/icons';

import { vaultCopy as copy } from './copy';
import { vaultPreview as V } from './preview';

const CRATE = 120;

/** The crate, drawn: amber box, darker band, a star on the lid. The lid lifts when it opens. */
function Crate({ open }: { open: number }) {
  const m = useMotion();
  const lid = useSharedValue(0);
  const body = useSharedValue(1);

  // Each open: the lid springs up and settles, the box bumps. Still under Reduce Motion.
  useEffect(() => {
    if (!open) return;
    lid.set(m.animate(0, ({ withSequence, withSpring, withDelay }) => withSequence(withSpring(1, motion.overshoot), withDelay(500, withSpring(0, motion.spring)))));
    body.set(m.animate(1, ({ withSequence, withSpring }) => withSequence(withSpring(1.08, motion.overshoot), withSpring(1, motion.spring))));
  }, [open, m, lid, body]);

  const lidStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -lid.get() * 16 }, { rotate: `${-lid.get() * 9}deg` }] }));
  const bodyStyle = useAnimatedStyle(() => ({ transform: [{ scale: body.get() }] }));
  const amber = palette.light.amber;
  const band = palette.light.onButter;
  return (
    <View style={styles.crateBox} accessible={false}>
      <Svg width={CRATE} height={20} style={styles.shadow}>
        <Ellipse cx={CRATE / 2} cy={10} rx={CRATE / 2.3} ry={7} fill={palette.light.ink} opacity={0.35} />
      </Svg>
      <Animated.View style={bodyStyle}>
        <Svg width={CRATE} height={70}>
          <Rect x={8} y={4} width={CRATE - 16} height={62} rx={8} fill={amber} />
          <Rect x={CRATE / 2 - 9} y={4} width={18} height={62} fill={band} opacity={0.55} />
        </Svg>
      </Animated.View>
      <Animated.View style={[styles.lid, lidStyle]}>
        <Svg width={CRATE} height={40}>
          <Rect x={2} y={14} width={CRATE - 4} height={22} rx={6} fill={amber} />
          <Rect x={CRATE / 2 - 9} y={14} width={18} height={22} fill={band} opacity={0.55} />
          <Path d={`M${CRATE / 2} 0 l4 9 h9.5 l-7.7 5.6 3 9.3 -8.8 -6 -8.8 6 3 -9.3 -7.7 -5.6 h9.5 z`} fill={palette.light.inkOn} />
        </Svg>
      </Animated.View>
    </View>
  );
}

function Trophy({ name, tint, earned }: { name: string; tint: TintName | null; earned: boolean }) {
  const { theme, tint: tintOf } = useTheme();
  const look = tint ? tintOf(tint) : { bg: theme.surface2, fg: theme.ink3 };
  return (
    <View style={[styles.trophy, { backgroundColor: look.bg }]} accessible accessibilityLabel={`${name}${earned ? '' : ', not earned yet'}`}>
      {earned ? (
        <Svg width={26} height={28} viewBox="0 0 26 28">
          <Path d="M13 1 L25 8 V20 L13 27 L1 20 V8 Z" fill={look.fg} />
          <Path d="M13 9 L18 12 V17 L13 20 L8 17 V12 Z" fill={look.bg} />
        </Svg>
      ) : (
        <Lock size={22} color={look.fg} />
      )}
      <Text variant="small" fg={look.fg} style={styles.trophyName}>
        {name}
      </Text>
    </View>
  );
}

function Stat({ value, label, format }: { value: number; label: string; format?: (n: number) => string }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: theme.surface, borderColor: theme.line }]}>
      <StatNumber value={value} format={format} variant="h2" />
      <Text variant="small" color="ink2">
        {label}
      </Text>
    </View>
  );
}

function VaultPreview() {
  const { hero, tint } = useTheme();
  const [tokens, setTokens] = useState<number>(V.tokens);
  const [claimed, setClaimed] = useState<string>(V.lastClaimed);
  const [won, setWon] = useState(false);
  const [open, setOpen] = useState(0);
  const butter = tint('butter');

  const openCrate = () => {
    if (tokens < 1) return;
    haptic('crate');
    setOpen((n) => n + 1);
    setTokens((t) => t - 1);
    const next = V.rewards[(V.rewards.indexOf(claimed as (typeof V.rewards)[number]) + 1) % V.rewards.length] ?? V.rewards[0];
    setTimeout(() => {
      setClaimed(next);
      setWon(true);
    }, 650);
  };

  return (
    <Screen>
      <ScreenHeader title={copy.title} />
      <Text color="ink2">{copy.intro}</Text>
      <Card elevation="hero" style={styles.hero}>
        <View>
          <Crate open={open} />
          {open > 0 && <Burst key={open} distance={90} size={9} />}
        </View>
        <View style={styles.tokens} accessible accessibilityLabel={`${tokens} ${copy.tokensReady(tokens)}`}>
          <StatNumber value={tokens} variant="display" fg={hero.fg} style={styles.tokenNumber} />
          <Text variant="label" fg={hero.fg2}>
            {copy.tokensReady(tokens)}
          </Text>
        </View>
        {tokens > 0 ? (
          <Button label={copy.open} variant="accent" onPress={openCrate} />
        ) : (
          <Text variant="small" fg={hero.fg2} style={styles.center}>
            {copy.empty}
          </Text>
        )}
      </Card>

      <Card tint="butter">
        <Text variant="label" fg={butter.fg}>
          {won ? copy.justWon : copy.lastClaimed}
        </Text>
        <Text variant="h3" fg={butter.fg}>
          {claimed}
        </Text>
        <MascotBubble key={claimed} persona="nimbus" tint="butter" avatar={false}>
          {V.nimbusLine}
        </MascotBubble>
      </Card>

      <View style={styles.sectionHead}>
        <Text variant="h2" accessibilityRole="header" style={styles.grow}>
          {copy.trophies}
        </Text>
        <Text variant="mono" color="ink3">
          {V.trophyCount.earned} / {V.trophyCount.of}
        </Text>
      </View>
      <View style={styles.grid}>
        {V.trophies.map((t) => (
          <Trophy key={t.name} name={t.name} tint={t.tint} earned={t.earned} />
        ))}
      </View>
      <View style={styles.grid}>
        <Stat value={V.stats.focusHours * 10} format={(n) => (n / 10).toFixed(1)} label={copy.focusHours} />
        <Stat value={V.stats.bestCombo} format={(n) => `x${n}`} label={copy.bestCombo} />
        <Stat value={V.stats.streak} label={copy.dayStreak} />
      </View>
    </Screen>
  );
}

/** The Vault. Crates and tokens (WP6) are a preview for now (?state=preview); live shows the empty state. */
export function VaultScreen() {
  const { state } = useLocalSearchParams<{ state?: string }>();
  if (state === 'preview') return <VaultPreview />;
  return (
    <Screen>
      <ScreenHeader title={copy.title} />
      <EmptyState hero line={copy.liveEmpty.line} action={{ label: copy.liveEmpty.action, onPress: () => router.navigate('/') }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  center: { textAlign: 'center' },
  hero: { alignItems: 'stretch', gap: space.lg, paddingTop: space.xxl },
  crateBox: { alignSelf: 'center', width: CRATE, height: 118, justifyContent: 'flex-end' },
  lid: { position: 'absolute', top: 6, left: 0 },
  shadow: { position: 'absolute', bottom: -12 },
  tokens: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: space.sm, marginTop: space.md },
  tokenNumber: { fontSize: 36, lineHeight: 40 },
  sectionHead: { flexDirection: 'row', alignItems: 'center' },
  grid: { flexDirection: 'row', gap: space.sm },
  trophy: { flex: 1, alignItems: 'center', gap: space.sm, borderRadius: radius.panel, paddingVertical: space.lg },
  trophyName: { textAlign: 'center', fontWeight: '600' },
  stat: { flex: 1, borderWidth: 1, borderRadius: radius.panel, padding: space.lg, gap: 2 },
});
