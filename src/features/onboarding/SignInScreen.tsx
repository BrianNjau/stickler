import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { brand } from '@/lib/brand';
import { haptic, Nimbus, radius, size, Snitch, space, Text, type, useTheme } from '@/ui';
import { ArrowRight } from '@/ui/icons';

import { signInCopy as copy } from './copy';

/**
 * docs/design/Sign in — the top of it. The email, Apple and Google controls arrive with WP1;
 * until then nothing here pretends to sign you in, and the trial path is the way forward.
 */
export function SignInScreen() {
  const { theme, tint } = useTheme();
  const insets = useSafeAreaInsets();
  const sky = tint('sky');
  const blush = tint('blush');
  const butter = tint('butter');

  return (
    <ScrollView
      style={{ backgroundColor: theme.ground }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + space.xxxl, paddingBottom: insets.bottom + space.xl }]}
    >
      <View style={styles.head}>
        <Text variant="label" color="ink3">
          {brand.name}
        </Text>
        <Text variant="display" accessibilityRole="header">
          {copy.title}
        </Text>
        <Text color="ink2">{copy.body}</Text>
      </View>

      <View style={styles.cast}>
        <View style={[styles.castCard, { backgroundColor: sky.bg }]}>
          <Nimbus mood="happy" size={64} />
          <Text variant="h3" fg={sky.fg}>
            {copy.nimbus.name}
          </Text>
          <Text variant="small" fg={sky.fg}>
            {copy.nimbus.about}
          </Text>
        </View>
        <View style={[styles.castCard, { backgroundColor: blush.bg }]}>
          <Snitch mood="watch" size={52} />
          <Text variant="h3" fg={blush.fg}>
            {copy.snitch.name}
          </Text>
          <Text variant="small" fg={blush.fg}>
            {copy.snitch.about}
          </Text>
        </View>
      </View>

      <Text variant="small" color="ink2" style={styles.pending}>
        {copy.pending}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.trial}
        onPress={() => {
          haptic('press');
          router.replace('/');
        }}
        style={({ pressed }) => [styles.trial, { backgroundColor: butter.bg }, pressed && styles.pressed]}
      >
        <Text variant="small" fg={butter.fg} style={styles.trialText}>
          {copy.trial}
        </Text>
        <ArrowRight size={16} color={butter.fg} strokeWidth={2.4} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: size.gutter + space.xs, gap: space.xl },
  head: { gap: space.md },
  cast: { flexDirection: 'row', gap: space.lg },
  castCard: { flex: 1, borderRadius: radius.card, padding: space.lg, gap: space.xs },
  pending: { textAlign: 'center' },
  trial: {
    minHeight: size.hit,
    borderRadius: radius.control,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
  },
  trialText: { fontFamily: type.bodyBold },
  pressed: { opacity: 0.9 },
});
