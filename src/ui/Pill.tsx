import { StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { radius, space, useColors, type ColorTokens } from './tokens';

type Tone = 'neutral' | 'accent' | 'boss' | 'good';

const toneColors = (c: ColorTokens, tone: Tone) =>
  ({
    neutral: { bg: c.surface2, border: c.line },
    accent: { bg: c.accentSoft, border: c.accent },
    boss: { bg: c.bossSoft, border: c.boss },
    good: { bg: c.labSoft, border: c.good },
  })[tone];

export interface PillProps {
  label: string;
  tone?: Tone;
}

export function Pill({ label, tone = 'neutral' }: PillProps) {
  const t = toneColors(useColors(), tone);
  return (
    <View style={[styles.pill, { backgroundColor: t.bg, borderColor: t.border }]}>
      <Text variant="eyebrow" tone="ink2">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm + 2,
    paddingVertical: 3,
  },
});
