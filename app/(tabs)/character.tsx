import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { Card, radius, Screen, ScreenHeader, size, Text, useTheme } from '@/ui';
import { Settings } from '@/ui/icons';

export default function CharacterRoute() {
  const { theme } = useTheme();
  return (
    <Screen>
      <ScreenHeader
        title="You"
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            onPress={() => router.push('/settings')}
            style={[styles.gear, { backgroundColor: theme.surface, borderColor: theme.line }]}
          >
            <Settings size={20} color={theme.ink} />
          </Pressable>
        }
      />
      <Card>
        <Text color="ink2">Level, skills and trophies will live here.</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gear: {
    width: size.hit,
    height: size.hit,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
