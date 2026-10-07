import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { env } from '@/lib/env';
import { createPlan, fetchAiQuota, firstShape, listShapes, loadDraft, type AiQuota, type PlanShape } from '@/lib/plans';
import { formatDuration } from '@/lib/time';
import { Button, Card, Nimbus, Pill, radius, ScreenHeader, size, Skeleton, space, Text, useTheme } from '@/ui';
import { ArrowRight } from '@/ui/icons';

import { shapeCopy, shapeDuration } from './copy';
import { useIntake } from './IntakeContext';

type Fallback = keyof typeof shapeCopy.fallback;
const isFallback = (v: unknown): v is Fallback => typeof v === 'string' && Object.prototype.hasOwnProperty.call(shapeCopy.fallback, v);
const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : null;

/**
 * The shape picker: the three starters, as a first-class choice. When AI_MODE is live, a drafted
 * plan is offered below them; if drafting fails we come back here with a plain explanation.
 */
export function ShapeStep() {
  const { theme, tint } = useTheme();
  const insets = useSafeAreaInsets();
  const { goal, startReview } = useIntake();
  const { fallback } = useLocalSearchParams<{ fallback?: string }>();
  const [shapes, setShapes] = useState<PlanShape[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<AiQuota | null>(null);
  const aiLive = env.aiMode === 'live';

  useEffect(() => {
    listShapes().then(setShapes, () => setLoadError(true));
  }, []);
  // On focus, not mount: the picker stays mounted under the review, and drafts get used meanwhile.
  useFocusEffect(
    useCallback(() => {
      if (!aiLive) return;
      let live = true;
      fetchAiQuota().then(
        (q) => live && setQuota(q),
        () => live && setQuota(null),
      );
      return () => {
        live = false;
      };
    }, [aiLive]),
  );

  if (!goal) return <Redirect href="/intake" />;

  const first = shapes ? firstShape(`${goal.raw_input} ${goal.why ?? ''}`, shapes) : null;
  const suggested = first?.key ?? null;
  const ordered = shapes ? [...shapes].sort((a, b) => Number(b.key === suggested) - Number(a.key === suggested)) : [];
  const canDraft = !quota || (quota.configured && quota.remaining > 0);

  const choose = async (key: string) => {
    setBusy(key);
    setError(null);
    const r = await createPlan(goal, { kind: 'template', templateKey: key });
    if (!r.ok) {
      setBusy(null);
      setError(shapeCopy.createFailed);
      return;
    }
    try {
      startReview(await loadDraft(r.planId));
      router.push('/intake/review');
    } catch {
      setError(shapeCopy.createFailed);
    } finally {
      setBusy(null);
    }
  };

  const butter = tint('butter');
  const sky = tint('sky');

  return (
    <ScrollView style={{ backgroundColor: theme.ground }} contentContainerStyle={[styles.content, { paddingTop: insets.top + space.xl }]}>
      <ScreenHeader eyebrow={shapeCopy.eyebrow} title={shapeCopy.title} back={{ fallbackHref: '/intake' }} />
      <Text color="ink2">{shapeCopy.body}</Text>

      {isFallback(fallback) && (
        <View style={[styles.note, { backgroundColor: butter.bg }]} accessibilityRole="alert">
          <Text variant="small" fg={butter.fg}>
            {shapeCopy.fallback[fallback]}
          </Text>
        </View>
      )}
      {shapes && !first?.exact && (
        <View style={[styles.note, { backgroundColor: sky.bg }]}>
          <Text variant="small" fg={sky.fg}>
            {shapeCopy.noFit}
          </Text>
        </View>
      )}
      {error && (
        <View style={[styles.note, { backgroundColor: tint('blush').bg }]} accessibilityRole="alert">
          <Text variant="small" fg={tint('blush').fg}>
            {error}
          </Text>
        </View>
      )}

      {!shapes && !loadError && [0, 1, 2].map((i) => (
        <Card key={i} accessible accessibilityLabel="Loading plan shapes" accessibilityState={{ busy: true }}>
          <Skeleton width="60%" height={18} />
          <Skeleton height={14} />
          <Skeleton width="40%" height={22} rounded={radius.pill} />
        </Card>
      ))}
      {loadError && (
        <Card>
          <Text>{shapeCopy.createFailed}</Text>
          <Button label="Try again" variant="secondary" size="md" onPress={() => listShapes().then(setShapes, () => setLoadError(true))} />
        </Card>
      )}

      {ordered.map((s) => (
        <Card key={s.key}>
          {s.key === suggested && <Pill label={first?.exact ? shapeCopy.suggested : shapeCopy.bestStart} tint="mint" />}
          <Text variant="h2">{s.title}</Text>
          <Text variant="small" color="ink2">
            {s.blurb}
          </Text>
          <View style={styles.meta}>
            <Pill label={`${s.stageCount} ${shapeCopy.stages}`} />
            <Pill label={`${s.milestoneCount} ${shapeCopy.milestones}`} />
            <Pill label={`${s.questCount} ${shapeCopy.quests}`} />
          </View>
          <Text variant="small" color="ink2">
            {shapeDuration[s.key] ?? s.finalTarget ?? ''} · <Text variant="mono">{formatDuration(s.libraryMinutes)}</Text> of quests to rotate
          </Text>
          <Button
            label={busy === s.key ? shapeCopy.building : shapeCopy.choose}
            variant={s.key === suggested ? 'primary' : 'secondary'}
            loading={busy === s.key}
            disabled={!!busy}
            onPress={() => choose(s.key)}
          />
        </Card>
      ))}

      {aiLive && !isFallback(fallback) && (
        <Card tint="sky">
          <View style={styles.aiHead}>
            <Nimbus mood="focus" size={56} fill="sky" />
            <View style={styles.grow}>
              <Text variant="h3" fg={sky.fg}>
                {shapeCopy.aiTitle}
              </Text>
              <Text variant="small" fg={sky.fg}>
                {shapeCopy.aiBody}
              </Text>
            </View>
          </View>
          {quota && (
            <Text variant="small" fg={sky.fg}>
              {!quota.configured
                ? shapeCopy.aiOff
                : quota.remaining > 0
                  ? shapeCopy.aiLeft(quota.remaining, quota.limit)
                  : shapeCopy.aiNoneLeft(day(quota.resetsAt))}
            </Text>
          )}
          {canDraft && (
            <Button label={shapeCopy.aiCta} icon={ArrowRight} iconPosition="trailing" disabled={!!busy} onPress={() => router.push('/intake/generating')} />
          )}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: size.gutter, paddingBottom: space.xxxl, gap: size.cardGap },
  note: { borderRadius: radius.control, padding: space.lg },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  aiHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  grow: { flex: 1 },
});
