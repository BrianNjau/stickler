import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, radius, ScreenHeader, size, space, Text, useTheme } from '@/ui';

import { intakeCopy, STEPS } from './copy';

interface WizardStepProps {
  step: number;
  eyebrow: string;
  title: string;
  body?: string;
  children: ReactNode;
  nextLabel?: string;
  nextDisabled?: boolean;
  busy?: boolean;
  onNext: () => void;
  error?: string | null;
}

/** One question per screen, a progress line, Back always available, one primary action. */
export function WizardStep({ step, eyebrow, title, body, children, nextLabel, nextDisabled, busy, onNext, error }: WizardStepProps) {
  const { theme, tint } = useTheme();
  const insets = useSafeAreaInsets();
  const blush = tint('blush');
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.fill, { backgroundColor: theme.ground }]}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingTop: insets.top + space.xl }]}>
        <ScreenHeader eyebrow={`Step ${step} of ${STEPS} · ${eyebrow}`} title={title} back={{ fallbackHref: '/' }} />
        <View
          style={[styles.track, { backgroundColor: theme.surface2 }]}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel="Goal intake progress"
          accessibilityValue={{ min: 0, max: STEPS, now: step }}
        >
          <View style={[styles.fill2, { width: `${(step / STEPS) * 100}%`, backgroundColor: theme.ink }]} />
        </View>
        {body && <Text color="ink2">{body}</Text>}
        {children}
        {error && (
          <View style={[styles.error, { backgroundColor: blush.bg }]} accessibilityRole="alert">
            <Text variant="small" fg={blush.fg}>
              {error}
            </Text>
          </View>
        )}
        <Button label={nextLabel ?? intakeCopy.next} loading={busy} disabled={nextDisabled} onPress={onNext} />
        {step > 1 && <Button label={intakeCopy.back} variant="quiet" size="md" onPress={() => router.back()} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: size.gutter, paddingBottom: space.xxxl, gap: space.xl },
  track: { height: 4, borderRadius: radius.pill, overflow: 'hidden' },
  fill2: { height: '100%', borderRadius: radius.pill },
  error: { borderRadius: radius.control, padding: space.lg },
});
