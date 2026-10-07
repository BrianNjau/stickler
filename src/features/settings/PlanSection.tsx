import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useAuth } from '@/lib/auth';
import { env } from '@/lib/env';
import { activeGoal, fetchAiQuota, type AiQuota, type GoalRow } from '@/lib/plans';
import { Button, Card, Skeleton, Text } from '@/ui';

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : null;

/** "3 of 3 drafted plans left this week" — or why drafting is off. AI_MODE=live only. */
function quotaLine(q: AiQuota | null | 'loading'): string | null {
  if (q === 'loading') return null;
  if (!q) return 'Couldn’t check your drafted plans just now.';
  if (!q.configured) return 'Plan drafting is switched off on the server right now. The plan shapes work as normal.';
  if (q.remaining > 0) return `${q.remaining} of ${q.limit} drafted plans left this week.`;
  const when = day(q.resetsAt);
  return `No drafted plans left this week${when ? `; the next one frees up ${when}` : ''}. The plan shapes are always available.`;
}

/**
 * "Change my plan": runs the intake again for the active goal and creates a NEW plan version.
 * The current plan is kept (inactive) — re-planning never edits in place or deletes history.
 */
export function PlanSection() {
  const { user } = useAuth();
  const [state, setState] = useState<{ goal: GoalRow; version: number } | null | 'loading'>('loading');
  const [quota, setQuota] = useState<AiQuota | null | 'loading'>('loading');
  const aiLive = env.aiMode === 'live';

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let live = true;
      activeGoal(user.id).then(
        (g) => live && setState(g),
        () => live && setState(null),
      );
      if (aiLive) {
        fetchAiQuota().then(
          (q) => live && setQuota(q),
          () => live && setQuota(null),
        );
      }
      return () => {
        live = false;
      };
    }, [user, aiLive]),
  );

  const drafts = aiLive ? quotaLine(quota) : null;

  return (
    <Card>
      <Text variant="label" color="ink3" accessibilityRole="header">
        Your plan
      </Text>
      {state === 'loading' ? (
        <Skeleton width="60%" height={16} />
      ) : state ? (
        <>
          <Text variant="h3">{state.goal.title}</Text>
          <Text variant="small" color="ink2">
            Plan version <Text variant="mono">{state.version}</Text>. Changing it starts a new version; this one is kept.
          </Text>
          <Button
            label="Change my plan"
            variant="secondary"
            size="md"
            onPress={() => router.push({ pathname: '/intake', params: { replan: '1' } })}
          />
        </>
      ) : (
        <>
          <Text color="ink2">No plan yet.</Text>
          <Button label="Set a goal" variant="secondary" size="md" onPress={() => router.push('/intake')} />
        </>
      )}
      {aiLive && (quota === 'loading' ? <Skeleton width="70%" height={14} /> : <Text variant="small" color="ink2">{drafts}</Text>)}
    </Card>
  );
}
