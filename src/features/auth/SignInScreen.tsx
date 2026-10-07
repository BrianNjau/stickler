import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  continueWith,
  isEmail,
  sendSignInCode,
  setPendingRoute,
  SOCIAL_AUTH_ENABLED,
  startTrial,
  takePendingRoute,
  type AuthProblem,
  type SocialProvider,
} from '@/lib/auth';
import { brand } from '@/lib/brand';
import { deviceTimezone } from '@/lib/time';
import { Button, haptic, Nimbus, radius, size, Snitch, space, Text, TextField, type, useTheme } from '@/ui';
import { ArrowRight } from '@/ui/icons';

import { authCopy } from './copy';

const copy = authCopy.signIn;

/** docs/design/Sign in. Email OTP only until the dev build; Apple/Google are hidden behind a flag. */
export function SignInScreen() {
  const { theme, tint } = useTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<'code' | 'trial' | SocialProvider | null>(null);
  const [problem, setProblem] = useState<AuthProblem | null>(null);
  const [touched, setTouched] = useState(false);
  const emailError = touched && email.length > 0 && !isEmail(email) ? copy.badEmail : null;

  const send = async () => {
    setTouched(true);
    if (!isEmail(email)) return;
    setBusy('code');
    setProblem(null);
    const r = await sendSignInCode(email);
    setBusy(null);
    // A throttle still means a code is on its way from the last request: carry on to the code screen.
    if (r.ok || r.problem.kind === 'tooSoon') router.push({ pathname: '/verify', params: { email: email.trim() } });
    else setProblem(r.problem);
  };

  const trial = async () => {
    setBusy('trial');
    setProblem(null);
    setPendingRoute('/intake');
    const r = await startTrial(deviceTimezone());
    setBusy(null);
    if (!r.ok) {
      takePendingRoute(); // don't let a failed trial redirect a later email sign-in
      setProblem(r.problem);
    }
    // On success the auth state flips to 'ready' and the root layout takes us to goal intake.
  };

  const social = async (provider: SocialProvider) => {
    setBusy(provider);
    const r = await continueWith(provider);
    setBusy(null);
    if (!r.ok) setProblem(r.problem);
  };

  const sky = tint('sky');
  const blush = tint('blush');
  const butter = tint('butter');

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.fill, { backgroundColor: theme.ground }]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
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

        <View style={styles.form}>
          <TextField
            label={copy.emailLabel}
            placeholder={copy.emailPlaceholder}
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (problem) setProblem(null);
            }}
            onBlur={() => setTouched(true)}
            onSubmitEditing={send}
            error={emailError}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="send"
          />
          <Button label={busy === 'code' ? copy.sending : copy.send} loading={busy === 'code'} onPress={send} disabled={!!busy} />
          {problem && (
            <View style={[styles.problem, { backgroundColor: blush.bg }]} accessibilityRole="alert" accessibilityLiveRegion="assertive">
              <Text variant="small" fg={blush.fg}>
                {problem.message}
              </Text>
            </View>
          )}
        </View>

        {/* Hidden, not disabled, until the dev build: SOCIAL_AUTH_ENABLED in src/lib/auth/social.ts. */}
        {SOCIAL_AUTH_ENABLED && (
          <View style={styles.form}>
            <View style={styles.divider}>
              <View style={[styles.rule, { backgroundColor: theme.line }]} />
              <Text variant="small" color="ink3">
                {copy.or}
              </Text>
              <View style={[styles.rule, { backgroundColor: theme.line }]} />
            </View>
            <Button label={copy.apple} variant="secondary" loading={busy === 'apple'} onPress={() => social('apple')} />
            <Button label={copy.google} variant="secondary" loading={busy === 'google'} onPress={() => social('google')} />
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.trial}
          accessibilityState={{ busy: busy === 'trial', disabled: !!busy }}
          disabled={!!busy}
          onPress={() => {
            haptic('press');
            trial();
          }}
          style={({ pressed }) => [styles.trial, { backgroundColor: butter.bg }, (pressed || busy === 'trial') && styles.pressed]}
        >
          <Text variant="small" fg={butter.fg} style={styles.trialText}>
            {copy.trial}
          </Text>
          <ArrowRight size={16} color={butter.fg} strokeWidth={2.4} />
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: size.gutter + space.xs, gap: space.xl },
  head: { gap: space.md },
  cast: { flexDirection: 'row', gap: space.lg },
  castCard: { flex: 1, borderRadius: radius.card, padding: space.lg, gap: space.xs },
  form: { gap: space.md },
  problem: { borderRadius: radius.control, padding: space.lg },
  divider: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rule: { flex: 1, height: StyleSheet.hairlineWidth },
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
  pressed: { opacity: 0.85 },
});
