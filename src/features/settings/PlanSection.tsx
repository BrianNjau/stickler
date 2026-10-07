import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useAuth } from '@/lib/auth';
import { activeGoal, type GoalRow } from '@/lib/plans';
import { Button, Card, Skeleton, Text } from '@/ui';

/**
 * "Change my plan": runs the intake again for the active goal and creates a NEW plan version.
 * The current plan is kept (inactive) — re-planning never edits in place or deletes history.
 */
export function PlanSection() {
  const { user } = useAuth();
  const [state, setState] = useState<{ goal: GoalRow; version: number } | null | 'loading'>('loading');

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let live = true;
      activeGoal(user.id).then(
        (g) => live && setState(g),
        () => live && setState(null),
      );
      return () => {
        live = false;
      };
    }, [user]),
  );

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
    </Card>
  );
}
