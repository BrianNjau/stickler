import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { Burst } from './Burst';
import { haptic } from './haptics';
import { Check } from './icons';
import { useMotion } from './motion';
import { PriorityPill, priorityLabel, type Priority } from './Pill';
import { Text } from './Text';
import { useTheme } from './theme';
import { motion, radius, size, space } from './tokens';

export interface TaskCardProps {
  title: string;
  priority: Priority;
  minutes?: number | null;
  done: boolean;
  /** XP this task awards (from the XP table): shown as "+20" once done, and floated on the tick. */
  xp: number;
  /** The task's skill colour; fills the box when done. */
  color?: string;
  /** Absent: a read-only card (no box), e.g. a day that can't be ticked from here yet. */
  onToggle?: () => void;
}

/** "+20 XP" rises 44 px and fades. */
function XpFloat({ xp, onDone }: { xp: number; onDone: () => void }) {
  const { theme } = useTheme();
  const m = useMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(m.animate(1, ({ withTiming, Easing }) => withTiming(1, { duration: 760, easing: Easing.out(Easing.cubic) })));
    const id = setTimeout(onDone, 800);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const look = useAnimatedStyle(() => ({
    opacity: 1 - t.get() * t.get(),
    transform: [{ translateY: -motion.float * t.get() }, { scale: 0.9 + t.get() * 0.2 }],
  }));
  if (m.reduced) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.float, look]}>
      <Text variant="mono" fg={theme.good} style={styles.floatText}>
        +{xp} XP
      </Text>
    </Animated.View>
  );
}

/**
 * A task as a card: box, title, and the priority pill on a second line. Ticking it: the box springs
 * 1 → 1.25 → 1, "+20 XP" floats up and fades, a light haptic. A boss adds a 12-piece burst and a
 * heavy haptic. Under Reduce Motion the box is simply ticked and "+20" appears in place.
 */
export function TaskCard({ title, priority, minutes, done, xp, color, onToggle }: TaskCardProps) {
  const { theme } = useTheme();
  const m = useMotion();
  const box = useSharedValue(1);
  const press = useSharedValue(1);
  const [floats, setFloats] = useState<number[]>([]);
  const [burst, setBurst] = useState(0);
  const wasDone = useRef(done);

  useEffect(() => {
    const ticked = done && !wasDone.current;
    wasDone.current = done;
    if (!ticked) return;
    box.set(m.animate(1, ({ withSequence, withSpring }) => withSequence(withSpring(1.25, motion.overshoot), withSpring(1, motion.overshoot))));
    if (m.reduced) return;
    const id = setTimeout(() => {
      setFloats((f) => [...f, Date.now()]);
      if (priority === 'boss') setBurst(Date.now());
    }, 0);
    return () => clearTimeout(id);
  }, [done, priority, m, box]);

  const boxStyle = useAnimatedStyle(() => ({ transform: [{ scale: box.get() }] }));
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.get() }] }));
  const fill = color ?? theme.ink;
  const minutesLabel = minutes != null ? `, ${minutes} minutes` : '';

  const body = (
    <Animated.View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }, pressStyle]}>
      {onToggle && (
        <View style={styles.boxSlot}>
          <Animated.View
            style={[
              styles.box,
              done ? { backgroundColor: fill, borderColor: fill } : { backgroundColor: theme.surface, borderColor: theme.line2 },
              boxStyle,
            ]}
          >
            {done && <Check size={15} color={theme.inkOn} strokeWidth={3} />}
          </Animated.View>
          {burst > 0 && <Burst key={burst} onDone={() => setBurst(0)} />}
          {floats.map((k) => (
            <XpFloat key={k} xp={xp} onDone={() => setFloats((f) => f.filter((x) => x !== k))} />
          ))}
        </View>
      )}
      <View style={styles.text}>
        <Text color={done ? 'ink3' : 'ink'} style={done ? styles.doneTitle : undefined}>
          {title}
        </Text>
        {!done && (
          <View style={styles.meta}>
            <PriorityPill priority={priority} />
            {minutes != null && (
              <Text variant="mono" color="ink3">
                {minutes}m
              </Text>
            )}
          </View>
        )}
      </View>
      {done && (
        <Text variant="mono" fg={theme.good} accessibilityLabel={`${xp} XP earned`}>
          +{xp}
        </Text>
      )}
    </Animated.View>
  );

  if (!onToggle) {
    return (
      <View accessible accessibilityLabel={`${title}${minutesLabel}, ${priorityLabel(priority)} quest`}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      aria-checked={done}
      accessibilityLabel={`${title}${minutesLabel}, ${priorityLabel(priority)} quest`}
      onPressIn={() => press.set(m.timing(0.97, motion.press))}
      onPressOut={() => press.set(m.spring(1))}
      onPress={() => {
        if (!done) haptic(priority === 'boss' ? 'bossDone' : 'taskDone');
        onToggle();
      }}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderWidth: 1,
    borderRadius: radius.panel,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    minHeight: size.hit + space.md,
  },
  boxSlot: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  box: { width: 26, height: 26, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: space.xs },
  doneTitle: { textDecorationLine: 'line-through' },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.sm },
  float: { position: 'absolute', bottom: 22, left: -6, width: 80 },
  floatText: { fontSize: 13 },
});
