import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { useSnitchEnabled } from './mascotPrefs';
import { Nimbus, type NimbusMood } from './mascots/Nimbus';
import { Snitch, type SnitchMood } from './mascots/Snitch';
import { useMotion } from './motion';
import { Text } from './Text';
import { useTheme } from './theme';
import { motion, palette, space } from './tokens';

/**
 * Mascot speaks (docs/POLISH.md §4): the bubble scales 0.9 → 1 from its tail and the text types in
 * at 14 ms a character. The full line is the accessibility label from the start; Reduce Motion
 * shows it whole.
 */
function useSpeaking(line: string, tail: 'left' | 'right') {
  const m = useMotion();
  const [typed, setTyped] = useState(m.reduced ? line.length : 0);
  const s = useSharedValue(m.reduced ? 1 : 0.9);

  useEffect(() => {
    s.set(m.animate(1, ({ withSpring }) => withSpring(1, motion.spring)));
    if (m.reduced) {
      const id = requestAnimationFrame(() => setTyped(line.length));
      return () => cancelAnimationFrame(id);
    }
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      setTyped(n);
      if (n >= line.length) clearInterval(id);
    }, motion.typeMs);
    return () => clearInterval(id);
  }, [line, m, s]);

  const pop = useAnimatedStyle(() => ({ transform: [{ scale: s.get() }] }));
  // Scales from the tail: a static style (web rejects transform-origin in an animated one).
  const origin = { transformOrigin: tail === 'left' ? 'left bottom' : 'right bottom' } as const;
  return { text: line.slice(0, typed), pop, origin };
}

interface Common {
  children: string;
  avatar?: boolean;
  /** Which side the speaker sits on. The bubble's 4 px tail corner points at them. */
  side?: 'left' | 'right';
}

type BubbleProps =
  | (Common & { persona: 'nimbus'; mood?: NimbusMood; tint?: 'sky' | 'butter' | 'mint' })
  | (Common & { persona: 'snitch'; mood?: SnitchMood });

const AVATAR = 60;

/**
 * A mascot speaking. Only render it when there is something to say — never as filler.
 * The text comes from data (`character_lines`, onboarding copy), never from a literal in a component.
 */
export function MascotBubble(props: BubbleProps) {
  const snitchEnabled = useSnitchEnabled();
  // snitch_intensity = 0 means silent, everywhere: the bubble is simply not there.
  if (props.persona === 'snitch' && !snitchEnabled) return null;
  return <Bubble {...props} />;
}

function Bubble(props: BubbleProps) {
  const { tint: tintOf } = useTheme();
  const { children, avatar = true, side = 'left' } = props;
  const { text: typed, pop, origin } = useSpeaking(children, side);
  // The untyped rest is laid out but invisible, so the bubble never resizes while it types.
  const line = (
    <>
      {typed}
      <Text style={styles.ghost}>{children.slice(typed.length)}</Text>
    </>
  );
  const who = props.persona === 'nimbus' ? 'Nimbus' : 'The Snitch';
  const nimbusTint = props.persona === 'nimbus' ? (props.tint ?? 'sky') : 'sky';
  const look =
    props.persona === 'nimbus'
      ? tintOf(nimbusTint)
      : // The Snitch files reports on its own near-black, in both themes.
        { bg: palette.light.snitchBg, fg: palette.light.inkOn };

  return (
    <View
      style={[styles.row, side === 'right' && styles.reverse]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${who} says: ${children}`}
      accessibilityLiveRegion="polite"
    >
      {avatar &&
        (props.persona === 'nimbus' ? (
          <Nimbus mood={props.mood ?? 'idle'} size={AVATAR} fill={nimbusTint} />
        ) : (
          <Snitch mood={props.mood ?? 'watch'} size={AVATAR} />
        ))}
      <Animated.View
        style={[
          styles.bubble,
          side === 'left' ? styles.tailLeft : styles.tailRight,
          { backgroundColor: look.bg },
          origin,
          pop,
        ]}
      >
        <Text variant="label" fg={props.persona === 'nimbus' ? look.fg : palette.dark.snitch}>
          {who}
        </Text>
        {props.persona === 'nimbus' ? (
          <Text variant="small" fg={look.fg}>
            {line}
          </Text>
        ) : (
          <Text variant="mono" fg={look.fg} style={styles.snitchText}>
            {line}
          </Text>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  reverse: { flexDirection: 'row-reverse' },
  bubble: {
    flex: 1,
    gap: space.xs,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: 16,
  },
  tailLeft: { borderBottomLeftRadius: 4 },
  tailRight: { borderBottomRightRadius: 4 },
  ghost: { opacity: 0 },
  snitchText: { textTransform: 'uppercase', fontSize: 13, lineHeight: 19 },
});
