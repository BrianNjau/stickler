import { StyleSheet, View } from 'react-native';

import { Nimbus, type NimbusMood } from './mascots/Nimbus';
import { Snitch, type SnitchMood } from './mascots/Snitch';
import { Text } from './Text';
import { useTheme } from './theme';
import { palette, space } from './tokens';

type BubbleProps =
  | { persona: 'nimbus'; mood?: NimbusMood; children: string; avatar?: boolean }
  | { persona: 'snitch'; mood?: SnitchMood; children: string; avatar?: boolean };

const AVATAR = 52;

/**
 * A mascot speaking. Only render it when there is something to say — never as filler.
 * The text comes from `character_lines` (data), never from a literal in a component.
 */
export function MascotBubble(props: BubbleProps) {
  const { theme } = useTheme();
  const { persona, children, avatar = true } = props;
  const nimbus = persona === 'nimbus';
  const who = nimbus ? 'Nimbus' : 'The Snitch';

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${who} says: ${children}`}
      accessibilityLiveRegion="polite"
    >
      {avatar &&
        (props.persona === 'nimbus' ? (
          <Nimbus mood={props.mood ?? 'idle'} size={AVATAR} />
        ) : (
          <Snitch mood={props.mood ?? 'watch'} size={AVATAR} />
        ))}
      <View style={[styles.bubble, { backgroundColor: nimbus ? theme.sky : palette.light.snitchBg }]}>
        <Text variant="label" fg={nimbus ? theme.onSky : palette.dark.snitch}>
          {who}
        </Text>
        {nimbus ? (
          <Text fg={theme.onSky}>{children}</Text>
        ) : (
          // The Snitch files reports: mono, uppercase, always on its own near-black.
          <Text variant="mono" fg={palette.light.inkOn} style={styles.snitchText}>
            {children}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  bubble: {
    flex: 1,
    gap: space.xs,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    // The 4 px corner is the tail, pointing at the speaker on the bottom-left.
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  snitchText: { textTransform: 'uppercase', fontSize: 13, lineHeight: 19 },
});
