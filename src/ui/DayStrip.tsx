import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { haptic } from './haptics';
import { useMotion } from './motion';
import { Text } from './Text';
import { useTheme } from './theme';
import { motion, radius, space } from './tokens';

export interface StripDay {
  /** YYYY-MM-DD. */
  date: string;
  /** Mon, Tue… */
  weekday: string;
  /** 5, 6, 7… */
  day: number;
  isToday?: boolean;
  /** A rest day: shown, quieter, number struck through. */
  rest?: boolean;
}

export interface DayStripProps {
  days: StripDay[];
  selected: string;
  onSelect: (date: string) => void;
  /** Remembers its scroll position across visits under this key. */
  memoryKey?: string;
}

const PILL = 46;
const PILL_ON = 54;
const GAP = space.sm;
/** Scroll positions by strip, for the life of the app. */
const remembered = new Map<string, number>();

function DayPill({ d, on, onPress }: { d: StripDay; on: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  const m = useMotion();
  const w = useSharedValue(on ? PILL_ON : PILL);
  useEffect(() => {
    w.set(m.spring(on ? PILL_ON : PILL, motion.snap));
  }, [on, m, w]);
  const grow = useAnimatedStyle(() => ({ width: w.get(), height: w.get() + 18 }));

  const bg = on ? theme.ink : d.rest ? theme.surface2 : theme.surface;
  const fg = on ? theme.inkOn : d.rest ? theme.ink3 : theme.ink;
  const weekdayFg = d.isToday ? theme.amber : on ? theme.inkOn : theme.ink3;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: on }}
      aria-selected={on}
      accessibilityLabel={`${d.weekday} ${d.day}${d.isToday ? ', today' : ''}${d.rest ? ', rest day' : ''}`}
      onPress={() => {
        if (!on) haptic('press');
        onPress();
      }}
    >
      <Animated.View style={[styles.pill, { backgroundColor: bg, borderColor: on ? theme.ink : theme.line }, grow]}>
        <Text variant="h2" fg={fg} style={[styles.num, d.rest && styles.struck]}>
          {d.day}
        </Text>
        <Text variant="small" fg={weekdayFg} style={styles.weekday}>
          {d.weekday}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

/** Horizontal date selector: seven days, today's pill in ink with an amber weekday. Snaps, remembers. */
export function DayStrip({ days, selected, onSelect, memoryKey = 'today' }: DayStripProps) {
  const ref = useRef<ScrollView>(null);
  const start = remembered.get(memoryKey) ?? 0;

  useEffect(() => {
    if (start) ref.current?.scrollTo({ x: start, animated: false });
  }, [start]);

  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={PILL + GAP}
      decelerationRate="fast"
      contentContainerStyle={styles.row}
      onScroll={(e) => remembered.set(memoryKey, e.nativeEvent.contentOffset.x)}
      scrollEventThrottle={64}
      accessibilityRole="tablist"
      accessibilityLabel="Days"
    >
      {days.map((d) => (
        <View key={d.date} style={styles.slot}>
          <DayPill d={d} on={d.date === selected} onPress={() => onSelect(d.date)} />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: GAP, alignItems: 'center', paddingVertical: space.xs },
  slot: { alignItems: 'center', justifyContent: 'center', minHeight: PILL_ON + 18 },
  pill: { borderRadius: radius.control, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  num: { textAlign: 'center' },
  weekday: { fontSize: 11, lineHeight: 14 },
  struck: { textDecorationLine: 'line-through' },
});
