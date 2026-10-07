import type { LucideIcon } from './icons';
import { StyleSheet, View } from 'react-native';

import { XP } from '@shared/types';

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
// Tokens sheet: "BOSS · 30" on blush, "MAIN · 20" on butter, "SIDE · 10" neutral, "RESCUE · 1.5×" on mint.
// The numbers come from the XP table, so the pill can never disagree with what is awarded.
const priorityLook: Record<Priority, { name: string; reward: string; tint?: TintName }> = {
  boss: { name: 'Boss', reward: String(XP.task.boss), tint: 'blush' },
  main: { name: 'Main', reward: String(XP.task.main), tint: 'butter' },
  side: { name: 'Side', reward: String(XP.task.side) },
  rescue: { name: 'Rescue', reward: `${XP.rescueMultiplier}×`, tint: 'mint' },
};

export function PriorityPill({ priority }: { priority: Priority }) {
  const p = priorityLook[priority];
  return <Pill label={`${p.name} · ${p.reward}`} tint={p.tint} />;
}

/** The priority's name, for screen-reader labels ("Boss quest"). */
export const priorityLabel = (p: Priority) => priorityLook[p].name;

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
