import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createPlan, firstShape, listShapes, loadDraft, type CreatePlanResult, type GoalRow } from '@/lib/plans';
import { Button, Card, MascotBubble, radius, size, Skeleton, space, Text, useReducedMotion, useTheme } from '@/ui';

import { generatingCopy, reviewCopy } from './copy';
import { useIntake } from './IntakeContext';

/** Measured: 40–80 s for a draft plus its repair (Sonnet 5.5, low effort). Past this, say so. */
const SLOW_AFTER_MS = 75_000;

/**
 * One request per goal at a time. Every draft costs the user one of their weekly three, so a
 * remount (React dev double-effects, a fast back-and-forward) must join the request already in
 * flight rather than start a second one.
 */
let inflight: { goalId: string; ctrl: AbortController; result: Promise<CreatePlanResult> } | null = null;

function draftFor(goal: GoalRow) {
  if (inflight && inflight.goalId === goal.id && !inflight.ctrl.signal.aborted) return inflight;
  const ctrl = new AbortController();
  const result = createPlan(goal, { kind: 'ai' }, { signal: ctrl.signal });
  const mine = { goalId: goal.id, ctrl, result };
  inflight = mine;
  result.finally(() => {
    if (inflight === mine) inflight = null;
  });
  return mine;
}

/**
 * AI_MODE=live only. Honest about the wait, never a dead end: rate-limited, failed and offline go
 * back to the shape picker with a plain sentence; a plan that failed validation twice becomes the
 * closest template, and the review says so.
 */
export function GeneratingStep() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { goal, startReview } = useIntake();
  const [line, setLine] = useState(0);
  const [slow, setSlow] = useState(false);
  const [fallingBack, setFallingBack] = useState(false);

  // Banter rotates while the model works; held still under Reduce Motion.
  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setLine((n) => (n + 1) % generatingCopy.banter.length), 3500);
    return () => clearInterval(id);
  }, [reduced]);

  useEffect(() => {
    const id = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!goal) return;
    let live = true;
    const toShape = (fallback: string) => live && router.replace({ pathname: '/intake/shape', params: { fallback } });

    draftFor(goal).result.then(async (r) => {
      if (!live) return;
      try {
        if (r.ok) {
          startReview(await loadDraft(r.planId));
          if (live) router.replace('/intake/review');
          return;
        }
        if (r.reason === 'cancelled') return;
        if (r.reason !== 'invalid') return toShape(r.reason);

        // Validation failed twice: the closest template, and a plain sentence about why.
        setFallingBack(true);
        const shapes = await listShapes();
        const pick = firstShape(`${goal.raw_input} ${goal.why ?? ''}`, shapes);
        const shape = shapes.find((s) => s.key === pick?.key);
        if (!pick || !shape) return toShape('invalid');
        const t = await createPlan(goal, { kind: 'template', templateKey: pick.key });
        if (!t.ok) return toShape('invalid');
        startReview(await loadDraft(t.planId), reviewCopy.fellBack(shape.title));
        if (live) router.replace('/intake/review');
      } catch {
        toShape('failed');
      }
    });
    return () => {
      live = false;
    };
    // One generation per visit to this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal?.id]);

  if (!goal) return <Redirect href="/intake" />;

  const cancel = () => {
    // The server may still finish, but the result is dropped: no draft to resume, nothing live.
    if (inflight?.goalId === goal.id) inflight.ctrl.abort();
    router.replace('/intake/shape');
  };

  return (
    <View style={[styles.fill, { backgroundColor: theme.ground, paddingTop: insets.top + space.xxl }]}>
      <View style={styles.column}>
        <Text variant="label" color="ink3">
          {generatingCopy.eyebrow}
        </Text>
        <Text variant="h1" accessibilityRole="header">
          {generatingCopy.title}
        </Text>
        <Text color="ink2" accessibilityLiveRegion="polite">
          {fallingBack ? generatingCopy.fallingBack : slow ? generatingCopy.slow : generatingCopy.honest}
        </Text>
        <MascotBubble persona="nimbus" mood="focus">
          {generatingCopy.banter[line] ?? generatingCopy.banter[0]}
        </MascotBubble>
        <Card accessible accessibilityLabel="Drafting your plan" accessibilityState={{ busy: true }}>
          <Skeleton width="50%" height={14} />
          <Skeleton height={18} />
          <Skeleton width="80%" height={18} />
          <Skeleton width="65%" height={18} rounded={radius.pill} />
        </Card>
        <Button label={generatingCopy.cancel} variant="quiet" size="md" onPress={cancel} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  column: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: size.gutter, gap: space.xl },
});
