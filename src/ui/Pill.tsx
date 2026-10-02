import type { LucideIcon } from './icons';
import { StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { useTheme, type TintName } from './theme';
import { radius, space } from './tokens';

export type Priority = 'boss' | 'main' | 'side' | 'rescue';

export interface PillProps {
  label: string;
  /** Tinted pill. Omit for a neutral meta pill. */
  tint?: TintName;
  /** Live time (a running round): the one place a pill may be amber. */
  live?: boolean;
  /** Pill sitting on a tinted card: white paper, text in the card's ink. */
  onTint?: TintName;
  icon?: LucideIcon;
}

export function Pill({ label, tint, live, onTint, icon: Icon }: PillProps) {
  const { theme, tint: tintOf } = useTheme();
  const look = live
    ? { bg: theme.amber, fg: theme.amberInk }
    : tint
      ? tintOf(tint)
      : onTint
        ? { bg: theme.surface, fg: tintOf(onTint).fg }
        : { bg: theme.surface2, fg: theme.ink2 };

  return (
    <View style={[styles.pill, { backgroundColor: look.bg }]}>
      {Icon && <Icon size={12} color={look.fg} strokeWidth={2.4} />}
      <Text variant="label" fg={look.fg}>
        {label}
      </Text>
    </View>
  );
}

// Colour never carries meaning alone: every priority also says its name.
const priorityLook: Record<Priority, { label: string; tint?: TintName }> = {
  boss: { label: 'Boss', tint: 'blush' },
  main: { label: 'Main', tint: 'sky' },
  side: { label: 'Side' },
  rescue: { label: 'Rescue ×1.5', tint: 'butter' },
};

export function PriorityPill({ priority }: { priority: Priority }) {
  const p = priorityLook[priority];
  return <Pill label={p.label} tint={p.tint} />;
}

export const priorityLabel = (p: Priority) => priorityLook[p].label;

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm + 2,
    paddingVertical: space.xs,
  },
});
