import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { env } from '@/lib/env';
import { createPlan, fetchAiQuota, firstShape, listShapes, loadDraft, type AiQuota, type PlanShape } from '@/lib/plans';
import { formatDuration } from '@/lib/time';
import { Button, Card, ErrorState, Nimbus, Pill, radius, Rise, ScreenHeader, size, Skeleton, space, Text, useTheme } from '@/ui';
import { ArrowRight } from '@/ui/icons';

import { shapeCopy, shapeDuration } from './copy';
import { useIntake } from './IntakeContext';

type Fallback = keyof typeof shapeCopy.fallback;
const isFallback = (v: unknown): v is Fallback => typeof v === 'string' && Object.prototype.hasOwnProperty.call(shapeCopy.fallback, v);
const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : null;

/**
 * The shape picker. Drafting a plan comes first (most people want less work): the hero card at the
 * top when AI is live and a draft is available. The ready-made shapes follow, still a full,
 * first-class choice; when drafting can't run, the suggested shape is the hero instead.
 */
export function ShapeStep() {
  const { theme, tint, hero } = useTheme();
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
  const blocked = !isFallback(fallback);
  // Drafting comes first, as the hero, whenever it can run. Otherwise the suggested shape is the hero.
  const aiShown = aiLive && blocked && canDraft;
  const heroKey = aiShown ? 'ai' : suggested;

  return (
    <ScrollView style={{ backgroundColor: theme.ground }} contentContainerStyle={[styles.content, { paddingTop: insets.top + space.xl }]}>
      <ScreenHeader eyebrow={shapeCopy.eyebrow} title={aiShown ? shapeCopy.titleAi : shapeCopy.title} back={{ fallbackHref: '/intake' }} />
      <Rise index={0}>
        <Text color="ink2">{aiShown ? shapeCopy.bodyAi : shapeCopy.body}</Text>
      </Rise>

      {isFallback(fallback) && (
        <View style={[styles.note, { backgroundColor: butter.bg }]} accessibilityRole="alert">
          <Text variant="small" fg={butter.fg}>
            {shapeCopy.fallback[fallback]}
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

      {aiShown && (
        <Rise index={1}>
          <Card elevation="hero">
            <View style={styles.aiHead}>
              <Nimbus mood="focus" size={56} fill="sky" />
              <View style={styles.grow}>
                <Pill label={shapeCopy.aiRecommended} live />
                <Text variant="h2" fg={hero.fg}>
                  {shapeCopy.aiTitle}
                </Text>
              </View>
            </View>
            <Text variant="small" fg={hero.fg2}>
              {shapes && !first?.exact ? shapeCopy.noFitAi : shapeCopy.aiBody}
            </Text>
            {quota && (
              <Text variant="small" fg={hero.fg2}>
                {shapeCopy.aiLeft(quota.remaining, quota.limit)}
              </Text>
            )}
            <Button
              label={shapeCopy.aiCta}
              icon={ArrowRight}
              iconPosition="trailing"
              variant="secondary"
              disabled={!!busy}
              onPress={() => router.push('/intake/generating')}
            />
          </Card>
        </Rise>
      )}
      {aiLive && blocked && !canDraft && quota && (
        <View style={[styles.note, { backgroundColor: sky.bg }]}>
          <Text variant="small" fg={sky.fg}>
            {!quota.configured ? shapeCopy.aiOff : shapeCopy.aiNoneLeft(day(quota.resetsAt))}
          </Text>
        </View>
      )}

      {aiShown && (
        <View style={styles.sectionHead}>
          <Text variant="h2" accessibilityRole="header">
            {shapeCopy.templatesTitle}
          </Text>
          <Text variant="small" color="ink2">
            {shapeCopy.templatesBody}
          </Text>
        </View>
      )}
      {!aiShown && shapes && !first?.exact && (
        <View style={[styles.note, { backgroundColor: sky.bg }]}>
          <Text variant="small" fg={sky.fg}>
            {shapeCopy.noFit}
          </Text>
        </View>
      )}

      {!shapes && !loadError && [0, 1, 2].map((i) => (
        // Without the drafting card, the first shape is the hero, so it is while loading too.
        <Card key={i} elevation={i === 0 && !aiShown ? 'hero' : 'flat'} accessible accessibilityLabel="Loading plan shapes" accessibilityState={{ busy: true }}>
          <Skeleton onHero={i === 0 && !aiShown} width="60%" height={18} />
          <Skeleton onHero={i === 0 && !aiShown} height={14} />
          <Skeleton onHero={i === 0 && !aiShown} width="40%" height={22} rounded={radius.pill} />
        </Card>
      ))}
      {loadError && (
        <ErrorState
          message={shapeCopy.loadFailed}
          action={{ label: shapeCopy.retry, onPress: () => listShapes().then((x) => { setLoadError(false); setShapes(x); }, () => setLoadError(true)) }}
        />
      )}

      {ordered.map((s, i) => {
        const isHero = s.key === heroKey;
        const fg = isHero ? hero.fg : undefined;
        const fg2 = isHero ? hero.fg2 : undefined;
        return (
          <Rise key={s.key} index={i + 2}>
            <Card elevation={isHero ? 'hero' : 'flat'}>
              {s.key === suggested && <Pill label={first?.exact ? shapeCopy.suggested : shapeCopy.bestStart} tint="mint" />}
              <Text variant="h2" fg={fg}>
                {s.title}
              </Text>
              <Text variant="small" color="ink2" fg={fg2}>
                {s.blurb}
              </Text>
              <View style={styles.meta}>
                <Pill label={`${s.stageCount} ${shapeCopy.stages}`} />
                <Pill label={`${s.milestoneCount} ${shapeCopy.milestones}`} />
                <Pill label={`${s.questCount} ${shapeCopy.quests}`} />
              </View>
              <Text variant="small" color="ink2" fg={fg2}>
                {shapeDuration[s.key] ?? s.finalTarget ?? ''} · <Text variant="mono" fg={fg}>{formatDuration(s.libraryMinutes)}</Text> of quests to rotate
              </Text>
              <Button
                label={busy === s.key ? shapeCopy.building : shapeCopy.choose}
                variant={isHero ? 'secondary' : s.key === suggested && !aiShown ? 'primary' : 'secondary'}
                loading={busy === s.key}
                disabled={!!busy}
                onPress={() => choose(s.key)}
              />
            </Card>
          </Rise>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: size.gutter, paddingBottom: space.xxxl, gap: size.cardGap },
  note: { borderRadius: radius.control, padding: space.lg },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  aiHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  sectionHead: { gap: space.xs, marginTop: space.md },
  grow: { flex: 1 },
});
