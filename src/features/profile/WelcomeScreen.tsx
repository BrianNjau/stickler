import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { saveAccount, useAccount, type Account } from '@/lib/account';
import { markOnboarded, signOut } from '@/lib/auth';
import { deviceTimezone } from '@/lib/time';
import { Button, Card, Nimbus, radius, size, Skeleton, space, Text, useTheme } from '@/ui';

import { dayProfileFrom, dayProfilePatches, dayProfileProblem, ProfileForm, type DayProfile } from './ProfileForm';

/** The form, once the rows handle_new_user seeded have arrived. State starts from them. */
function FirstRunForm({ account }: { account: Account }) {
  const { tint } = useTheme();
  const [form, setForm] = useState<DayProfile>(() => dayProfileFrom(account, deviceTimezone()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const problem = dayProfileProblem(form);

  const save = async () => {
    if (problem) return;
    setSaving(true);
    setError(null);
    const { profile, settings } = dayProfilePatches(form);
    const r = await saveAccount(account.uid, { ...profile, onboarded_at: new Date().toISOString() }, settings);
    setSaving(false);
    if (r.ok) markOnboarded(account.uid); // routing moves on to the app
    else setError(r.message);
  };

  const blush = tint('blush');
  return (
    <>
      <Card>
        <ProfileForm value={form} onChange={setForm} />
      </Card>
      {(problem || error) && (
        <View style={[styles.problem, { backgroundColor: blush.bg }]} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Text variant="small" fg={blush.fg}>
            {problem ?? error}
          </Text>
        </View>
      )}
      <Button label="Save and continue" loading={saving} disabled={!!problem} onPress={save} />
    </>
  );
}

/** First-run capture, once per account: who you are, where your day is, how much of it is yours. */
export function WelcomeScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { account, stale } = useAccount();

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.fill, { backgroundColor: theme.ground }]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.xl }]}
      >
        <View style={styles.head}>
          <Nimbus mood="happy" size={72} />
          <Text variant="label" color="ink3">
            Before the first plan
          </Text>
          <Text variant="h1" accessibilityRole="header">
            Tell us about your day
          </Text>
          <Text color="ink2">
            A plan only works if it fits the hours you really have. You can change all of this in Settings.
          </Text>
        </View>

        {account ? (
          <FirstRunForm key={account.uid} account={account} />
        ) : (
          <Card accessible accessibilityLabel="Loading your profile" accessibilityState={{ busy: true }}>
            <Skeleton width="40%" height={12} />
            <Skeleton height={52} rounded={radius.control} />
            <Skeleton width="30%" height={12} />
            <Skeleton height={52} rounded={radius.control} />
            {stale && (
              <Text variant="small" color="ink2">
                We can’t reach the server. Check your connection; this screen will fill in when it’s back.
              </Text>
            )}
          </Card>
        )}

        {/* Never a trap: the wrong account can always back out. */}
        <Button label="Not you? Sign out" variant="quiet" size="md" onPress={() => signOut()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: size.gutter, gap: size.cardGap },
  head: { gap: space.sm, paddingBottom: space.sm },
  problem: { borderRadius: radius.control, padding: space.lg },
});
