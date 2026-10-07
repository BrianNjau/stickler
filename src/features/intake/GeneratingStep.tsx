import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createPlan, loadDraft } from '@/lib/plans';
import { Button, Card, MascotBubble, radius, size, Skeleton, space, Text, useReducedMotion, useTheme } from '@/ui';

import { generatingCopy } from './copy';
import { useIntake } from './IntakeContext';

/**
 * AI_MODE=live only. Honest about the wait, never a dead end: any failure returns to the shape
 * picker with a plain sentence about what happened.
 */
export function GeneratingStep() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { goal, startReview } = useIntake();
  const [line, setLine] = useState(0);

  // Banter rotates while the model works; held still under Reduce Motion.
  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setLine((n) => (n + 1) % generatingCopy.banter.length), 3500);
    return () => clearInterval(id);
  }, [reduced]);

  useEffect(() => {
    if (!goal) return;
    let live = true;
    createPlan(goal, { kind: 'ai' }).then(async (r) => {
      if (!live) return;
      if (!r.ok) return router.replace({ pathname: '/intake/shape', params: { fallback: r.reason } });
      try {
        startReview(await loadDraft(r.planId));
        if (live) router.replace('/intake/review');
      } catch {
        if (live) router.replace({ pathname: '/intake/shape', params: { fallback: 'failed' } });
      }
    });
    return () => {
      live = false;
    };
    // One generation per visit to this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal?.id]);

  if (!goal) return <Redirect href="/intake" />;

  return (
    <View style={[styles.fill, { backgroundColor: theme.ground, paddingTop: insets.top + space.xxl }]}>
      <View style={styles.column}>
        <Text variant="label" color="ink3">
          {generatingCopy.eyebrow}
        </Text>
        <Text variant="h1" accessibilityRole="header">
          {generatingCopy.title}
        </Text>
        <Text color="ink2">{generatingCopy.honest}</Text>
        <MascotBubble persona="nimbus" mood="focus">
          {generatingCopy.banter[line] ?? generatingCopy.banter[0]}
        </MascotBubble>
        <Card accessible accessibilityLabel="Drafting your plan" accessibilityState={{ busy: true }}>
          <Skeleton width="50%" height={14} />
          <Skeleton height={18} />
          <Skeleton width="80%" height={18} />
          <Skeleton width="65%" height={18} rounded={radius.pill} />
        </Card>
        <Button label={generatingCopy.cancel} variant="quiet" size="md" onPress={() => router.replace('/intake/shape')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  column: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: size.gutter, gap: space.xl },
});
