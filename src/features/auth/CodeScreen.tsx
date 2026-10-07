import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  resendUpgradeCode,
  sendSignInCode,
  verifySignInCode,
  verifyUpgradeCode,
  type AuthProblem,
} from '@/lib/auth';
import { Button, haptic, radius, size, space, Text, useTheme } from '@/ui';
import { ChevronLeft } from '@/ui/icons';

import { CODE_LENGTH, CodeInput } from './CodeInput';
import { authCopy } from './copy';

export const RESEND_AFTER_SECONDS = 30;

interface CodeScreenProps {
  email: string;
  /** signin: verify a sign-in code. upgrade: confirm the email being added to a trial account. */
  mode: 'signin' | 'upgrade';
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export function CodeScreen({ email, mode }: CodeScreenProps) {
  const { theme, tint } = useTheme();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<AuthProblem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Resend unlocks at a wall-clock time; the 1 s tick only redraws the countdown.
  const [resendAt, setResendAt] = useState(() => Date.now() + RESEND_AFTER_SECONDS * 1000);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const wait = Math.max(0, Math.ceil((resendAt - now) / 1000));

  const verify = async (digits: string) => {
    setBusy(true);
    setProblem(null);
    setNotice(null);
    const r = mode === 'signin' ? await verifySignInCode(email, digits) : await verifyUpgradeCode(email, digits);
    setBusy(false);
    if (r.ok) {
      haptic('roundEnd');
      // Routing follows the auth state: first-run capture, or straight into the app.
      return;
    }
    haptic('drift');
    setProblem(r.problem);
    setCode('');
  };

  const resend = async () => {
    setProblem(null);
    setNotice(null);
    const r = mode === 'signin' ? await sendSignInCode(email) : await resendUpgradeCode(email);
    if (r.ok) {
      setResendAt(Date.now() + RESEND_AFTER_SECONDS * 1000);
      setNotice(authCopy.code.resent);
    } else if (r.problem.kind === 'tooSoon') {
      setResendAt(Date.now() + r.problem.retryInSeconds * 1000);
      setNotice(r.problem.message);
    } else {
      setProblem(r.problem);
    }
  };

  const blush = tint('blush');

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.fill, { backgroundColor: theme.ground }]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.xl }]}
      >
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace(mode === 'signin' ? '/sign-in' : '/settings'))}
          accessibilityRole="button"
          accessibilityLabel={authCopy.code.changeEmail}
          style={styles.back}
        >
          <ChevronLeft size={20} color={theme.ink} strokeWidth={2.4} />
          <Text variant="small">{authCopy.code.changeEmail}</Text>
        </Pressable>

        <View style={styles.head}>
          <Text variant="label" color="ink3">
            {authCopy.code.eyebrow}
          </Text>
          <Text variant="h1" accessibilityRole="header">
            {authCopy.code.title}
          </Text>
          <Text color="ink2">
            {authCopy.code.sentTo} <Text color="ink">{email}</Text>. {authCopy.code.newest}
          </Text>
        </View>

        <CodeInput
          value={code}
          onChange={(d) => {
            setCode(d);
            if (problem) setProblem(null);
          }}
          onComplete={verify}
          error={!!problem}
          disabled={busy}
        />

        {problem && (
          <View style={[styles.problem, { backgroundColor: blush.bg }]} accessibilityLiveRegion="assertive" accessibilityRole="alert">
            <Text variant="small" fg={blush.fg}>
              {problem.message}
            </Text>
          </View>
        )}

        <Button
          label={busy ? authCopy.code.checking : authCopy.code.verify}
          loading={busy}
          disabled={code.length < CODE_LENGTH}
          onPress={() => verify(code)}
        />

        <View style={styles.resend} accessibilityLiveRegion="polite">
          {wait > 0 ? (
            <Text variant="small" color="ink2">
              {authCopy.code.resendIn} <Text variant="mono">{clock(wait)}</Text>
            </Text>
          ) : (
            <Button label={authCopy.code.resend} variant="quiet" size="md" block={false} onPress={resend} />
          )}
          {notice && (
            <Text variant="small" color="ink2" style={styles.center}>
              {notice}
            </Text>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: size.gutter + space.xs, gap: space.xl },
  back: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', minHeight: size.hit, marginLeft: -space.xs },
  head: { gap: space.md },
  problem: { borderRadius: radius.control, padding: space.lg },
  resend: { alignItems: 'center', gap: space.sm, minHeight: size.hit },
  center: { textAlign: 'center' },
});
