import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { levelFromXp, xpForLevel } from '@shared/types';

import { useAccount } from '@/lib/account';
import { useAuth } from '@/lib/auth';
import { loadStats, type PlayerStats } from '@/lib/plans';
import { Card, EmptyState, ErrorState, radius, Ring, Screen, ScreenHeader, size, Skeleton, space, StatNumber, Text, useTheme } from '@/ui';
import { Settings } from '@/ui/icons';

import { youCopy as copy } from './copy';

function LevelHero({ stats }: { stats: PlayerStats }) {
  const { theme, hero } = useTheme();
  const level = levelFromXp(stats.xp);
  const start = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const into = (stats.xp - start) / Math.max(1, next - start);
  return (
    <Card elevation="hero" style={styles.hero}>
      <Ring value={into} size={86} color={theme.amber} track={hero.track} label={`${copy.level} ${level}`}>
        <StatNumber value={level} variant="h1" fg={hero.fg} />
      </Ring>
      <View style={styles.grow}>
        <Text variant="label" fg={theme.amber}>
          {copy.level} {level}
        </Text>
        <StatNumber value={stats.xp} format={(n) => `${n.toLocaleString()} XP`} variant="h2" fg={hero.fg} />
        <Text variant="small" fg={hero.fg2}>
          {copy.toNext(next - stats.xp, level + 1)} · {copy.streak(stats.streak)}
        </Text>
      </View>
    </Card>
  );
}

/** You: level, XP and streak (live, read-only), with skills and trophies to come (WP8). */
export function YouScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { account } = useAccount();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    if (!user) return;
    let live = true;
    setFailed(false);
    loadStats(user.id).then(
      (s) => live && setStats(s),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [user]);
  useFocusEffect(load);

  return (
    <Screen>
      <ScreenHeader
        title={account?.profile.display_name ?? copy.title}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.settings}
            onPress={() => router.push('/settings')}
            style={[styles.gear, { backgroundColor: theme.surface, borderColor: theme.line }]}
          >
            <Settings size={20} color={theme.ink} />
          </Pressable>
        }
      />
      {failed && !stats ? (
        <ErrorState hero message={copy.loadFailed.message} action={{ label: copy.loadFailed.action, onPress: () => load() }} />
      ) : stats ? (
        <LevelHero stats={stats} />
      ) : (
        <Card elevation="hero" style={styles.hero} accessible accessibilityLabel="Loading your level" accessibilityState={{ busy: true }}>
          <Skeleton onHero width={86} height={86} rounded={43} />
          <View style={[styles.grow, styles.gap]}>
            <Skeleton onHero width="40%" height={11} />
            <Skeleton onHero width="70%" height={20} />
            <Skeleton onHero width="85%" height={12} />
          </View>
        </Card>
      )}
      <EmptyState mascot={{ persona: 'nimbus', mood: 'cool' }} line={copy.empty.line} action={{ label: copy.empty.action, onPress: () => router.navigate('/') }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  gap: { gap: space.sm },
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  gear: { width: size.hit, height: size.hit, borderRadius: radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
