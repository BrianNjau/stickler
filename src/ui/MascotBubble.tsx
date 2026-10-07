import { StyleSheet, View } from 'react-native';

import { Nimbus, type NimbusMood } from './mascots/Nimbus';
import { Snitch, type SnitchMood } from './mascots/Snitch';
import { Text } from './Text';
import { useTheme } from './theme';
import { palette, space } from './tokens';

interface Common {
  children: string;
  avatar?: boolean;
  /** Which side the speaker sits on. The bubble's 4 px tail corner points at them. */
  side?: 'left' | 'right';
}

type BubbleProps =
  | (Common & { persona: 'nimbus'; mood?: NimbusMood; tint?: 'sky' | 'butter' })
  | (Common & { persona: 'snitch'; mood?: SnitchMood });

const AVATAR = 60;

/**
 * A mascot speaking. Only render it when there is something to say — never as filler.
 * The text comes from data (`character_lines`, onboarding copy), never from a literal in a component.
 */
export function MascotBubble(props: BubbleProps) {
  const { tint: tintOf } = useTheme();
  const { children, avatar = true, side = 'left' } = props;
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
      <View
        style={[
          styles.bubble,
          side === 'left' ? styles.tailLeft : styles.tailRight,
          { backgroundColor: look.bg },
        ]}
      >
        <Text variant="label" fg={props.persona === 'nimbus' ? look.fg : palette.dark.snitch}>
          {who}
        </Text>
        {props.persona === 'nimbus' ? (
          <Text variant="small" fg={look.fg}>
            {children}
          </Text>
        ) : (
          <Text variant="mono" fg={look.fg} style={styles.snitchText}>
            {children}
          </Text>
        )}
      </View>
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
  snitchText: { textTransform: 'uppercase', fontSize: 13, lineHeight: 19 },
});
