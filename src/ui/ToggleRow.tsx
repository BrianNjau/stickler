import { StyleSheet, Switch, View } from 'react-native';

import { Text } from './Text';
import { useTheme } from './theme';
import { size, space } from './tokens';

export interface ToggleRowProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

/** A labelled switch. The whole row is one switch to VoiceOver. */
export function ToggleRow({ label, description, value, onChange }: ToggleRowProps) {
  const { theme } = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.text} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Text>{label}</Text>
        {description && (
          <Text variant="small" color="ink2">
            {description}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        accessibilityHint={description}
        trackColor={{ false: theme.line2, true: theme.ink }}
        thumbColor={theme.surface}
        ios_backgroundColor={theme.line2}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: size.hit, paddingVertical: space.xs },
  text: { flex: 1, gap: 2 },
});
