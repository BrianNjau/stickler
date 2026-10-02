import { Tabs } from 'expo-router/tabs';

import { useColors } from '@/ui';

// The nav is always visible (CLAUDE.md design principles): every feature is one tab away from Today.
export default function TabsLayout() {
  const c = useColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.ink,
        tabBarInactiveTintColor: c.ink2,
        tabBarActiveBackgroundColor: c.accentSoft,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.line },
        // Text-only tabs until an icon set is chosen; centre the label in the space the icon left.
        tabBarIconStyle: { display: 'none' },
        tabBarItemStyle: { justifyContent: 'center' },
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
        tabBarLabelPosition: 'below-icon',
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="path" options={{ title: 'Path' }} />
      <Tabs.Screen name="character" options={{ title: 'Character' }} />
      <Tabs.Screen name="rewards" options={{ title: 'Rewards' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
