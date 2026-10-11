import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { levelFromXp } from '@shared/types';

import { useAccount } from '@/lib/account';
import { useAuth } from '@/lib/auth';
import { loadDay, loadStats, loadToday, type PlayerStats, type TodayBlock } from '@/lib/plans';
import { timeToMinutes } from '@/lib/time';
import { Button, LevelUp, skillColors, space, type Priority } from '@/ui';

import { todayCopy as copy } from './copy';
import { dayPart, localIso, stripDays, weekdayName } from './days';
import { DevBackendStatus } from './DevBackendStatus';
import { parseTodayState, todayPreview, xpFor, type PreviewTask, type TodayState } from './preview';
import { TodayView, type DayVM, type NextVM, type TodayTaskVM } from './TodayView';

const greetingFor = (name: string | null) => copy.greetingNamed(copy.greeting[dayPart(new Date().getHours())], name);

/** Development-only: the design states (?state= on web), or back to live data. */
function DevTools({ current }: { current: TodayState | 'live' }) {
  if (!__DEV__) return null;
  return (
    <View style={styles.dev}>
      <View style={styles.devRow}>
        {(['live', 'empty', 'loading', 'populated'] as const).map((s) => (
          <Button
            key={s}
            label={s}
            size="md"
            block={false}
            variant={s === current ? 'primary' : 'secondary'}
            onPress={() => router.setParams({ state: s === 'live' ? undefined : s })}
          />
        ))}
      </View>
      <DevBackendStatus />
    </View>
  );
}

// ── Preview: the artboard, fully interactive on local state. Nothing is written anywhere. ────
function PreviewToday({ state, roundSeconds }: { state: TodayState; roundSeconds?: string }) {
  const today = localIso();
  const [selected, setSelected] = useState(today);
  const [tasks, setTasks] = useState<PreviewTask[]>(todayPreview.tasks);
  const [xp, setXp] = useState(todayPreview.xp);
  const [levelUp, setLevelUp] = useState<{ from: number; to: number } | null>(null);

  const toggle = (id: string) => {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    const gain = t.done ? -xpFor(t.priority) : xpFor(t.priority);
    const before = levelFromXp(xp);
    const after = levelFromXp(xp + gain);
    setTasks((ts) => ts.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
    setXp(xp + gain);
    // Let the tick, the float and the burst land before the takeover.
    if (after > before) setTimeout(() => setLevelUp({ from: before, to: after }), 900);
  };

  const backToToday = { label: copy.future('').action, onPress: () => setSelected(today) };
  const done = tasks.filter((t) => t.done).length;
  const day: DayVM =
    state === 'loading'
      ? { kind: 'loading' }
      : state === 'empty'
        ? { kind: 'empty', line: copy.noPlan.line, action: { label: copy.noPlan.action, onPress: () => router.push('/intake') } }
        : selected < today
          ? { kind: 'empty', line: copy.past(weekdayName(selected)).line, action: backToToday }
          : selected > today
            ? { kind: 'empty', line: copy.future(weekdayName(selected)).line, action: backToToday }
            : {
                kind: 'day',
                next: todayPreview.next,
                line: todayPreview.lines[done] ?? null,
                tasks: tasks.map((t) => ({
                  id: t.id,
                  title: t.title,
                  priority: t.priority,
                  minutes: t.minutes,
                  done: t.done,
                  xp: xpFor(t.priority),
                  color: skillColors[t.skill % skillColors.length]?.solid,
                })),
              };

  return (
    <>
      <TodayView
        greeting={greetingFor(state === 'populated' ? todayPreview.name : null)}
        title={state === 'populated' ? todayPreview.title : null}
        xp={state === 'populated' ? xp : 0}
        streak={state === 'populated' ? todayPreview.streak : 0}
        days={stripDays(today, todayPreview.restDays)}
        selected={selected}
        onSelect={setSelected}
        day={day}
        onToggle={toggle}
        // ?roundSeconds=N passes through, so a round can end on camera without a 23-minute wait.
        onStart={() => router.push({ pathname: '/session', params: roundSeconds ? { preview: '1', roundSeconds } : { preview: '1' } })}
        onAdd={(title) => setTasks((ts) => [...ts, { id: `n${ts.length + 1}`, title, minutes: 15, priority: 'side', done: false, skill: 2 }])}
        takeover={
          levelUp && (
            <LevelUp from={levelUp.from} to={levelUp.to} title={copy.levelUp} line={todayPreview.levelUpLine} onClose={() => setLevelUp(null)} />
          )
        }
        footer={<DevTools current={state} />}
      />
    </>
  );
}

// ── Live: the real day, read-only until WP3 wires ticking and the timer. ─────────────────────
const priorityOf = (t: { priority: 'side' | 'main' | 'boss'; isRescue: boolean }): Priority => (t.isRescue ? 'rescue' : t.priority);

function toTasks(blocks: TodayBlock[]): TodayTaskVM[] {
  return blocks
    .filter((b) => b.kind !== 'break')
    .flatMap((b, bi) =>
      b.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        priority: priorityOf(t),
        minutes: t.estimateMinutes,
        done: t.done,
        xp: xpFor(priorityOf(t)),
        color: skillColors[bi % skillColors.length]?.solid,
      })),
    );
}

function nextBlock(blocks: TodayBlock[], roundMinutes: number, breakMinutes: number): NextVM | null {
  const now = new Date().getHours() * 60 + new Date().getMinutes();
  const b = blocks.find((x) => x.kind !== 'break' && timeToMinutes(x.end) > now);
  if (!b) return null;
  const length = timeToMinutes(b.end) - timeToMinutes(b.start);
  return { start: b.start, title: b.title, rounds: Math.max(1, Math.round(length / (roundMinutes + breakMinutes))), roundMinutes };
}

function LiveToday() {
  const { user } = useAuth();
  const { account } = useAccount();
  const [today, setToday] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<TodayBlock[] | null | 'noPlan'>(null);
  const [stats, setStats] = useState<PlayerStats>({ xp: 0, streak: 0 });
  const [failed, setFailed] = useState(false);

  const load = useCallback(
    (date: string | null) => {
      if (!user) return;
      let live = true;
      setFailed(false);
      loadStats(user.id).then((s) => live && setStats(s), () => {});
      const day = !date || date === today ? loadToday(user.id) : loadDay(user.id, date).then((b) => ({ kind: 'other' as const, blocks: b }));
      day.then(
        (d) => {
          if (!live) return;
          if ('kind' in d && d.kind === 'noPlan') return setBlocks('noPlan');
          if (d.kind === 'day') {
            setToday(d.localDate);
            setSelected((s) => s ?? d.localDate);
            return setBlocks(d.blocks);
          }
          setBlocks(d.blocks ?? []);
        },
        () => live && setFailed(true),
      );
      return () => {
        live = false;
      };
    },
    [user, today],
  );

  // Reload on every visit, so a plan started a moment ago shows up immediately.
  useFocusEffect(useCallback(() => load(selected), [load, selected]));

  const todayIso = today ?? localIso();
  const settings = account?.settings;
  const backToToday = { label: copy.future('').action, onPress: () => setSelected(todayIso) };
  const day: DayVM = failed
    ? { kind: 'error', retry: () => load(selected) }
    : blocks === null
      ? { kind: 'loading' }
      : blocks === 'noPlan'
        ? { kind: 'empty', line: copy.noPlan.line, action: { label: copy.noPlan.action, onPress: () => router.push('/intake') } }
        : (selected ?? todayIso) !== todayIso && blocks.length === 0
          ? {
              kind: 'empty',
              line: ((selected ?? todayIso) < todayIso ? copy.past : copy.future)(weekdayName(selected ?? todayIso)).line,
              action: backToToday,
            }
          : {
              kind: 'day',
              next: (selected ?? todayIso) === todayIso ? nextBlock(blocks, settings?.round_minutes ?? 25, settings?.break_minutes ?? 3) : null,
              tasks: toTasks(blocks),
              line: null,
            };

  return (
    <TodayView
      greeting={greetingFor(account?.profile.display_name ?? null)}
      title={null}
      xp={stats.xp}
      streak={stats.streak}
      days={stripDays(todayIso, settings?.rest_days ?? [0])}
      selected={selected ?? todayIso}
      onSelect={(d) => {
        setSelected(d);
        setBlocks(null);
      }}
      day={day}
      footer={<DevTools current="live" />}
    />
  );
}

export function TodayScreen() {
  const { state, roundSeconds } = useLocalSearchParams<{ state?: string; roundSeconds?: string }>();
  return state ? <PreviewToday state={parseTodayState(state)} roundSeconds={roundSeconds} /> : <LiveToday />;
}

const styles = StyleSheet.create({
  dev: { gap: space.md, marginTop: space.xl },
  devRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
