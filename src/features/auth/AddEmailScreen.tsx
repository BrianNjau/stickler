import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { isEmail, sendUpgradeCode, type AuthProblem } from '@/lib/auth';
import { Button, Card, radius, Screen, ScreenHeader, space, Text, TextField, useTheme } from '@/ui';

import { authCopy } from './copy';

const copy = authCopy.upgrade;

/**
 * The upgrade path: an anonymous trial adds an email and keeps everything. Same Supabase user id,
 * so every row already belongs to them under RLS; nothing is copied or migrated.
 */
export function AddEmailScreen() {
  const { tint } = useTheme();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<AuthProblem | null>(null);
  const [touched, setTouched] = useState(false);

  const send = async () => {
    setTouched(true);
    if (!isEmail(email)) return;
    setBusy(true);
    setProblem(null);
    const r = await sendUpgradeCode(email);
    setBusy(false);
    if (r.ok || r.problem.kind === 'tooSoon') router.push({ pathname: '/confirm-email', params: { email: email.trim() } });
    else setProblem(r.problem);
  };

  const blush = tint('blush');

  return (
    <Screen>
      <ScreenHeader eyebrow={copy.eyebrow} title={copy.title} back={{ fallbackHref: '/settings' }} />
      <Card>
        <Text color="ink2">{copy.body}</Text>
        <TextField
          label={authCopy.signIn.emailLabel}
          placeholder={authCopy.signIn.emailPlaceholder}
          value={email}
          onChangeText={setEmail}
          onBlur={() => setTouched(true)}
          onSubmitEditing={send}
          error={touched && email.length > 0 && !isEmail(email) ? authCopy.signIn.badEmail : null}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
        />
        {problem && (
          <View style={[styles.problem, { backgroundColor: blush.bg }]} accessibilityRole="alert">
            <Text variant="small" fg={blush.fg}>
              {problem.message}
            </Text>
          </View>
        )}
        <Button label={copy.send} loading={busy} onPress={send} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  problem: { borderRadius: radius.control, padding: space.lg },
});
