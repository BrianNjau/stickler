import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, Nimbus, space, Text, useTheme } from '@/ui';

/**
 * OAuth lands here (social sign-in, behind SOCIAL_AUTH_ENABLED). On web, supabase-js finishes the
 * exchange from the URL and the auth guards move the user on; this screen is what shows meanwhile.
 */
export default function AuthCallbackRoute() {
  const { theme } = useTheme();
  return (
    <View style={[styles.fill, { backgroundColor: theme.ground }]}>
      <Nimbus mood="focus" size={80} />
      <Text variant="h2" accessibilityRole="header">
        Signing you in…
      </Text>
      <Button label="Back to sign in" variant="quiet" size="md" block={false} onPress={() => router.replace('/sign-in')} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, padding: space.xl },
});
