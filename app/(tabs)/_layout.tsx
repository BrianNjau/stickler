import { Tabs } from 'expo-router/tabs';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, size, Text, useTheme } from '@/ui';
import { CalendarDays, CircleUser, Gift, Route, Timer, type LucideIcon } from '@/ui/icons';

function TabIcon({ Icon, focused }: { Icon: LucideIcon; focused: boolean }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.chip, focused && { backgroundColor: theme.sky }]}>
      <Icon size={20} color={focused ? theme.onSky : theme.ink3} strokeWidth={focused ? 2.4 : 2} />
    </View>
  );
}

const icon = (Icon: LucideIcon) =>
  function TabBarIcon({ focused }: { focused: boolean }) {
    return <TabIcon Icon={Icon} focused={focused} />;
  };

const label = (title: string) =>
  function TabBarLabel({ focused }: { focused: boolean }) {
    return (
      <Text variant="small" color={focused ? 'ink' : 'ink3'} style={styles.label} numberOfLines={1}>
        {title}
      </Text>
    );
  };

// The nav is always visible: every feature is one tab from Today, and the hidden routes
// below (settings, goal intake) render inside this navigator so the bar never disappears.
export default function TabsLayout() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.line,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: size.tabBar + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 4,
        },
        tabBarItemStyle: { gap: 2 },
        // React Navigation moves labels beside the icon on wide screens; keep the phone layout everywhere.
        tabBarLabelPosition: 'below-icon',
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: icon(CalendarDays), tabBarLabel: label('Today') }} />
      <Tabs.Screen name="path" options={{ title: 'Path', tabBarIcon: icon(Route), tabBarLabel: label('Path') }} />
      <Tabs.Screen name="focus" options={{ title: 'Focus', tabBarIcon: icon(Timer), tabBarLabel: label('Focus') }} />
      <Tabs.Screen name="rewards" options={{ title: 'Rewards', tabBarIcon: icon(Gift), tabBarLabel: label('Rewards') }} />
      <Tabs.Screen name="character" options={{ title: 'You', tabBarIcon: icon(CircleUser), tabBarLabel: label('You') }} />
      <Tabs.Screen name="settings" options={{ href: null, title: 'Settings' }} />
      <Tabs.Screen name="intake" options={{ href: null, title: 'New goal' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  chip: { width: 44, height: 28, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, lineHeight: 14 },
});
