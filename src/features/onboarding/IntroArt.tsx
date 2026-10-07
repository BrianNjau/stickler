import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { MascotBubble, radius, space, Text, type, useTheme } from '@/ui';
import { ArrowDown, Check, Minus } from '@/ui/icons';

import { introArt, type IntroKey } from './copy';

/** Decorative: VoiceOver reads the card's headline and body instead. */
function Art({ children }: { children: ReactNode }) {
  return (
    <View style={styles.art} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {children}
    </View>
  );
}

function SayIt() {
  const { theme, tint } = useTheme();
  const a = introArt.sayIt;
  const mint = tint('mint');
  const butter = tint('butter');
  return (
    <Art>
      <View style={[styles.card, styles.tiltLeft, { backgroundColor: theme.surface, borderColor: theme.line, borderWidth: 1 }]}>
        <Text variant="label" color="ink3">
          {a.typedLabel}
        </Text>
        <Text variant="small">{a.typed}</Text>
      </View>
      <View style={styles.arrow}>
        <ArrowDown size={22} color={theme.amber} strokeWidth={2.6} />
      </View>
      <View style={[styles.card, styles.tiltRight, { backgroundColor: mint.bg }]}>
        <Text variant="label" fg={mint.fg}>
          {a.block.when}
        </Text>
        <Text variant="h3" fg={mint.fg}>
          {a.block.title}
        </Text>
        {a.block.tasks.map((t) => (
          <View key={t.title} style={styles.taskRow}>
            <View style={[styles.box, { borderColor: mint.fg }]} />
            <Text variant="small" fg={mint.fg} style={styles.grow}>
              {t.title}
            </Text>
            <Text variant="mono" fg={mint.fg}>
              {t.minutes}m
            </Text>
          </View>
        ))}
      </View>
      <View style={[styles.strip, styles.tiltSlight, { backgroundColor: butter.bg }]}>
        <Text variant="label" fg={butter.fg}>
          {a.later.when}
        </Text>
        <Text variant="small" fg={butter.fg}>
          {a.later.title}
        </Text>
      </View>
    </Art>
  );
}

function HonestDay() {
  const { theme, tint } = useTheme();
  const a = introArt.honestDay;
  const blush = tint('blush');
  const mint = tint('mint');
  return (
    <Art>
      <View style={[styles.card, { backgroundColor: blush.bg }]}>
        <View style={styles.row}>
          <View style={[styles.verdict, { backgroundColor: theme.snitch }]}>
            <Text variant="label" fg={theme.inkOn}>
              {a.verdict}
            </Text>
          </View>
          <Text variant="mono" fg={blush.fg}>
            {a.overBy}
          </Text>
        </View>
        <View style={styles.row}>
          <View style={styles.bars}>
            {[
              { label: a.have, height: 44, color: theme.ink },
              { label: a.need, height: 70, color: theme.snitch },
            ].map((b) => (
              <View key={b.label} style={styles.barCol}>
                <View style={[styles.bar, { height: b.height, backgroundColor: b.color }]} />
                <Text variant="mono" fg={blush.fg} style={styles.barLabel}>
                  {b.label}
                </Text>
              </View>
            ))}
          </View>
          <Text variant="small" fg={blush.fg} style={styles.grow}>
            {a.reason}
          </Text>
        </View>
      </View>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line, borderWidth: 1 }]}>
        <Text variant="label" color="ink3">
          {a.cutLabel}
        </Text>
        {a.cuts.map((c) => (
          <View key={c.title} style={styles.taskRow}>
            <View style={[styles.box, styles.minusBox, { backgroundColor: theme.surface2 }]}>
              <Minus size={12} color={theme.ink2} strokeWidth={3} />
            </View>
            <Text variant="small" color="ink3" style={[styles.grow, styles.struck]}>
              {c.title}
            </Text>
            <Text variant="mono" color="ink2">
              {c.minutes}m
            </Text>
          </View>
        ))}
        <View style={[styles.resolved, { backgroundColor: mint.bg }]}>
          <Check size={16} color={theme.good} strokeWidth={3} />
          <Text variant="small" fg={mint.fg} style={styles.bold}>
            {a.resolved}
          </Text>
        </View>
      </View>
    </Art>
  );
}

function Characters() {
  return (
    <Art>
      {introArt.characters.map((c) =>
        c.persona === 'nimbus' ? (
          <MascotBubble key={c.line} persona="nimbus" mood={c.mood} tint={c.tint}>
            {c.line}
          </MascotBubble>
        ) : (
          <MascotBubble key={c.line} persona="snitch" mood={c.mood} side="right">
            {c.line}
          </MascotBubble>
        ),
      )}
    </Art>
  );
}

export function IntroArt({ which }: { which: IntroKey }) {
  if (which === 'say-it') return <SayIt />;
  if (which === 'honest-day') return <HonestDay />;
  return <Characters />;
}

const styles = StyleSheet.create({
  art: { width: '100%', gap: space.md, paddingHorizontal: space.xl },
  card: { borderRadius: radius.panel, padding: space.lg, gap: space.sm },
  strip: {
    borderRadius: radius.control,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  // The artboard's cards sit slightly off-true, like notes on a desk.
  tiltLeft: { transform: [{ rotate: '-2deg' }] },
  tiltRight: { transform: [{ rotate: '1.5deg' }] },
  tiltSlight: { transform: [{ rotate: '-0.5deg' }] },
  arrow: { alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 28 },
  grow: { flex: 1 },
  box: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, opacity: 0.55 },
  minusBox: { borderWidth: 0, opacity: 1, alignItems: 'center', justifyContent: 'center' },
  struck: { textDecorationLine: 'line-through' },
  verdict: { borderRadius: radius.pill, paddingHorizontal: space.sm + 2, paddingVertical: space.xs },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  barCol: { alignItems: 'center', gap: space.xs },
  bar: { width: 22, borderRadius: 6 },
  barLabel: { fontSize: 10, lineHeight: 12 },
  resolved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderRadius: radius.control,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    marginTop: space.xs,
  },
  bold: { fontFamily: type.bodyBold },
});
