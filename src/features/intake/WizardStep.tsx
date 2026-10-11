import { router } from 'expo-router';
import { Children, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackLink, Button, Card, radius, Ring, Rise, size, space, StatNumber, Text, useTheme } from '@/ui';

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

/**
 * One question per screen. The question is the screen's hero: an ink card with a ring for how far
 * along the four steps you are. Back is always available, one primary action.
 */
export function WizardStep({ step, eyebrow, title, body, children, nextLabel, nextDisabled, busy, onNext, error }: WizardStepProps) {
  const { theme, tint, hero } = useTheme();
  const insets = useSafeAreaInsets();
  const blush = tint('blush');
  const parts: ReactNode[] = [
    <Card key="q" elevation="hero">
      <View style={styles.heroRow}>
        <Ring value={step / STEPS} size={56} color={theme.amber} track={hero.track} label={`Step ${step} of ${STEPS}`}>
          <StatNumber value={step} format={(n) => `${n}/${STEPS}`} variant="mono" fg={hero.fg} />
        </Ring>
        <Text variant="label" fg={theme.amber} style={styles.grow}>
          {eyebrow}
        </Text>
      </View>
      <Text variant="h1" fg={hero.fg} accessibilityRole="header">
        {title}
      </Text>
      {body && <Text fg={hero.fg2}>{body}</Text>}
    </Card>,
    ...Children.toArray(children),
  ];
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.fill, { backgroundColor: theme.ground }]}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingTop: insets.top + space.xl }]}>
        <BackLink fallbackHref="/" />
        {parts.map((p, i) => (
          <Rise key={i} index={i}>
            {p}
          </Rise>
        ))}
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
  grow: { flex: 1 },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: size.gutter, paddingBottom: space.xxxl, gap: space.xl },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  error: { borderRadius: radius.control, padding: space.lg },
});
