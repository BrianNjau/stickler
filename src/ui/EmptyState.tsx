import { StyleSheet, View } from 'react-native';

import { Button } from './Button';
import { Card } from './Card';
import type { LucideIcon } from './icons';
import { useSnitchEnabled } from './mascotPrefs';
import { Nimbus, type NimbusMood } from './mascots/Nimbus';
import { Snitch, type SnitchMood } from './mascots/Snitch';
import { Text } from './Text';
import { useTheme } from './theme';
import { space } from './tokens';

type Mascot = { persona: 'nimbus'; mood?: NimbusMood } | { persona: 'snitch'; mood?: SnitchMood };

export interface EmptyStateProps {
  /** Who is there instead of the content. The Snitch falls back to Nimbus when it is switched off. */
  mascot?: Mascot;
  /** One line of copy. Data, not a literal in the calling component. */
  line: string;
  /** One action. Every empty state has a way forward. */
  action: { label: string; onPress: () => void; icon?: LucideIcon };
  /** The empty state is the whole screen: its action is the screen's one hero. */
  hero?: boolean;
}

/** The kit's empty state: a mascot, one line, one action, on sky. No screen ships empty without one. */
export function EmptyState({ mascot = { persona: 'nimbus' }, line, action, hero }: EmptyStateProps) {
  const { tint } = useTheme();
  const snitchOn = useSnitchEnabled();
  const sky = tint('sky');
  // snitch_intensity = 0: the Snitch never appears, Nimbus stands in.
  const who: Mascot = mascot.persona === 'snitch' && !snitchOn ? { persona: 'nimbus', mood: 'idle' } : mascot;
  return (
    <Card tint="sky" style={styles.card}>
      <View style={styles.art}>
        {who.persona === 'snitch' ? <Snitch mood={who.mood ?? 'watch'} size={84} /> : <Nimbus mood={who.mood ?? 'idle'} size={96} fill="sky" />}
      </View>
      <Text fg={sky.fg} style={styles.line}>
        {line}
      </Text>
      <Button hero={hero} label={action.label} icon={action.icon} variant="primary" size="md" block={false} onPress={action.onPress} style={styles.action} />
    </Card>
  );
}

export interface ErrorStateProps {
  /** What broke, in one sentence. Never a code. */
  message: string;
  /** The button that fixes it. */
  action: { label: string; onPress: () => void };
  /** The error stands in for the screen's content: its button is the screen's one hero. */
  hero?: boolean;
}

/** The kit's error state: on blush, what broke and the button that fixes it. */
export function ErrorState({ message, action, hero }: ErrorStateProps) {
  const { tint } = useTheme();
  const blush = tint('blush');
  return (
    <Card tint="blush" accessibilityRole="alert">
      <Text variant="label" fg={blush.fg}>
        Error
      </Text>
      <Text fg={blush.fg}>{message}</Text>
      <Button hero={hero} label={action.label} variant="secondary" size="md" block={false} onPress={action.onPress} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: space.lg, paddingVertical: space.xxl },
  art: { alignItems: 'center' },
  line: { textAlign: 'center', maxWidth: 360 },
  action: { alignSelf: 'center' },
});
