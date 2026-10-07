import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { allTimezones, nowIn, timezoneLabel } from '@/lib/time';
import { Sheet, size, space, Text, TextField, useTheme } from '@/ui';
import { Check } from '@/ui/icons';

interface TimezoneSheetProps {
  visible: boolean;
  value: string;
  onPick: (zone: string) => void;
  onClose: () => void;
}

export function TimezoneSheet({ visible, value, onPick, onClose }: TimezoneSheetProps) {
  const { theme } = useTheme();
  const [query, setQuery] = useState('');
  const zones = useMemo(() => allTimezones(), []);
  const q = query.trim().toLowerCase().replace(/\s+/g, '_');
  const shown = q ? zones.filter((z) => z.toLowerCase().includes(q)) : zones;

  return (
    <Sheet visible={visible} title="Your timezone" onClose={onClose}>
      <TextField
        label="Search"
        placeholder="City or region, e.g. Nairobi"
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        autoCapitalize="none"
      />
      <FlatList
        data={shown}
        keyExtractor={(z) => z}
        style={styles.list}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={20}
        renderItem={({ item }) => {
          const on = item === value;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              aria-checked={on}
              accessibilityLabel={`${timezoneLabel(item)}, ${nowIn(item) ?? ''}`}
              onPress={() => {
                onPick(item);
                onClose();
              }}
              style={[styles.row, { borderBottomColor: theme.line }]}
            >
              <View style={styles.rowText}>
                <Text>{timezoneLabel(item)}</Text>
                <Text variant="mono" color="ink3">
                  {item}
                </Text>
              </View>
              <Text variant="mono" color="ink2">
                {nowIn(item) ?? ''}
              </Text>
              {on && <Check size={18} color={theme.ink} strokeWidth={2.6} />}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Text color="ink2" style={styles.empty}>
            No timezone matches that. Try a nearby big city.
          </Text>
        }
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { maxHeight: 360 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: size.hit + space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1 },
  empty: { paddingVertical: space.lg },
});
