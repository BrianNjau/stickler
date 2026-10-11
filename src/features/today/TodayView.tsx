import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { levelFromXp, xpForLevel } from '@shared/types';

import {
  Button,
  Card,
  DayStrip,
  EmptyState,
  ErrorState,
  Fab,
  LiveGradient,
  MascotBubble,
  radius,
  Ring,
  Screen,
  Segmented,
  SessionGlow,
  Sheet,
  space,
  StatNumber,
  TaskCard,
  Text,
  TextField,
  useTheme,
  type Priority,
  type StripDay,
} from '@/ui';
import { Flame, Play } from '@/ui/icons';

import { todayCopy as copy } from './copy';
import { TodaySkeleton } from './TodaySkeleton';

export interface TodayTaskVM {
  id: string;
  title: string;
  priority: Priority;
  minutes: number | null;
  done: boolean;
  xp: number;
  color?: string;
}

export interface NextVM {
  start: string;
  title: string;
  rounds: number | null;
  roundMinutes: number | null;
}

export type DayVM =
  | { kind: 'loading' }
  | { kind: 'error'; retry: () => void }
  | { kind: 'empty'; line: string; action: { label: string; onPress: () => void } }
  | { kind: 'day'; next: NextVM | null; tasks: TodayTaskVM[]; line: string | null };

export interface TodayViewProps {
  greeting: string;
  title: string | null;
  xp: number;
  streak: number;
  days: StripDay[];
  selected: string;
  onSelect: (date: string) => void;
  day: DayVM;
  /** Absent: tasks are read-only (ticking arrives with WP3 on live data). */
  onToggle?: (id: string) => void;
  /** Absent: no start button (the live timer arrives with WP3). */
  onStart?: () => void;
  /** Absent: no FAB. */
  onAdd?: (title: string) => void;
  /** Rendered above everything (the level-up takeover). */
  takeover?: ReactNode;
  /** Rendered last in the scroll (dev tools). */
  footer?: ReactNode;
}

const LINGER_MS = 1300;

function Header({ greeting, title, xp, streak }: Pick<TodayViewProps, 'greeting' | 'title' | 'xp' | 'streak'>) {
  const { theme } = useTheme();
  const level = levelFromXp(xp);
  const into = (xp - xpForLevel(level)) / Math.max(1, xpForLevel(level + 1) - xpForLevel(level));
  return (
    <View style={styles.header}>
      <Ring value={into} size={46} stroke={5} color={theme.amber} label={`${copy.levelLabel(level)}, ${Math.round(into * 100)}% to the next`}>
        <StatNumber value={level} variant="h3" accessibilityLabel={copy.levelLabel(level)} />
      </Ring>
      <View style={styles.grow}>
        <Text variant="h2" accessibilityRole="header" numberOfLines={1}>
          {greeting}
        </Text>
        <Text variant="small" color="ink2" numberOfLines={1}>
          {title ? `${title} · ` : ''}
          <StatNumber value={xp} format={(n) => `${n.toLocaleString()} XP`} variant="small" color="ink2" />
        </Text>
      </View>
      <View style={styles.streak} accessible accessibilityLabel={copy.streak(streak)}>
        <LiveGradient radius={radius.pill} opacity={0.18} />
        <Flame size={16} color={theme.amber} fill={theme.amber} />
        <StatNumber value={streak} variant="mono" color="ink" />
      </View>
    </View>
  );
}

function NextHero({ next, done, total, onStart }: { next: NextVM | null; done: number; total: number; onStart?: () => void }) {
  const { theme, hero } = useTheme();
  const pct = total ? done / total : 0;
  return (
    <Card elevation="hero" style={styles.hero}>
      <View style={styles.heroRow}>
        <View style={styles.ringSlot}>
          <View style={styles.glow} pointerEvents="none">
            <SessionGlow size={150} />
          </View>
          <Ring value={pct} size={86} color="live" track={hero.track} label={`${Math.round(pct * 100)}% ${copy.ofToday}`}>
            <StatNumber value={Math.round(pct * 100)} format={(n) => `${n}%`} variant="h2" fg={hero.fg} />
            <Text variant="small" fg={hero.fg2} style={styles.ofToday}>
              {copy.ofToday}
            </Text>
          </Ring>
        </View>
        <View style={styles.grow}>
          {next ? (
            <>
              <Text variant="label" fg={theme.amber}>
                {copy.upNext} · {next.start}
              </Text>
              <Text variant="h2" fg={hero.fg} accessibilityRole="header">
                {next.title}
              </Text>
              <Text variant="small" fg={hero.fg2}>
                {next.rounds && next.roundMinutes ? `${copy.rounds(next.rounds, next.roundMinutes)} · ` : ''}
                {copy.tasksDone(done, total)}
              </Text>
            </>
          ) : (
            <>
              <Text variant="h2" fg={hero.fg} accessibilityRole="header">
                {copy.dayDone.title}
              </Text>
              <Text variant="small" fg={hero.fg2}>
                {copy.dayDone.body}
              </Text>
            </>
          )}
        </View>
      </View>
      {next && onStart && <Button label={copy.start} variant="live" icon={Play} onPress={onStart} />}
    </Card>
  );
}

function AddSheet({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (title: string) => void }) {
  const [title, setTitle] = useState('');
  const add = () => {
    if (!title.trim()) return;
    onAdd(title.trim());
    setTitle('');
    onClose();
  };
  return (
    <Sheet visible={open} title={copy.addTitle} onClose={onClose}>
      <TextField label={copy.addLabel} value={title} onChangeText={setTitle} placeholder={copy.addPlaceholder} onSubmitEditing={add} />
      <Button label={copy.addCta} onPress={add} disabled={!title.trim()} />
    </Sheet>
  );
}

/**
 * Today (docs/design/Today · polished): header with the level ring and streak, the day strip, the
 * next block as the screen's one hero, task cards with a Left/Done switch, Nimbus only when there
 * is something to say, and the FAB. Shared by the preview and the live day.
 */
export function TodayView(props: TodayViewProps) {
  const { greeting, title, xp, streak, days, selected, onSelect, day, onToggle, onStart, onAdd, takeover, footer } = props;
  const [show, setShow] = useState<'left' | 'done'>('left');
  const [adding, setAdding] = useState(false);
  // A task ticked under "Left" stays put for a beat, so its tick, float and burst are seen.
  const [lingering, setLingering] = useState<string[]>([]);

  const tasks = day.kind === 'day' ? day.tasks : [];
  const doneCount = tasks.filter((t) => t.done).length;
  const visible = tasks.filter((t) => (show === 'left' ? !t.done || lingering.includes(t.id) : t.done));
  const toggle = onToggle
    ? (id: string) => {
        const t = tasks.find((x) => x.id === id);
        if (t && !t.done && show === 'left') {
          setLingering((l) => [...l, id]);
          setTimeout(() => setLingering((l) => l.filter((x) => x !== id)), LINGER_MS);
        }
        onToggle(id);
      }
    : undefined;

  return (
    <Screen
      clearFab={!!onAdd}
      overlay={
        <>
          {onAdd && day.kind === 'day' && <Fab label={copy.fab} onPress={() => setAdding(true)} />}
          {takeover}
        </>
      }
    >
      <Header greeting={greeting} title={title} xp={xp} streak={streak} />
      <DayStrip days={days} selected={selected} onSelect={onSelect} />

      {day.kind === 'loading' && <TodaySkeleton />}
      {day.kind === 'error' && <ErrorState hero message={copy.loadFailed.message} action={{ label: copy.loadFailed.action, onPress: day.retry }} />}
      {day.kind === 'empty' && <EmptyState hero line={day.line} action={day.action} />}

      {day.kind === 'day' && <NextHero next={day.next} done={doneCount} total={tasks.length} onStart={onStart} />}
      {day.kind === 'day' && (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text variant="h2" accessibilityRole="header">
              {copy.tasks}
            </Text>
            <StatNumber value={doneCount} format={(n) => `${n} / ${tasks.length}`} variant="mono" color="ink3" style={styles.grow} />
            <View style={styles.switch}>
              <Segmented
                size="sm"
                label={copy.tasks}
                value={show}
                onChange={setShow}
                options={[
                  { value: 'left', label: copy.left },
                  { value: 'done', label: copy.done },
                ]}
              />
            </View>
          </View>
          {visible.length === 0 ? (
            <Text variant="small" color="ink2">
              {show === 'left' ? copy.allLeftDone : copy.noneDone}
            </Text>
          ) : (
            visible.map((t) => (
              <TaskCard
                key={t.id}
                title={t.title}
                priority={t.priority}
                minutes={t.minutes}
                done={t.done}
                xp={t.xp}
                color={t.color}
                onToggle={toggle ? () => toggle(t.id) : undefined}
              />
            ))
          )}
        </View>
      )}
      {day.kind === 'day' && day.line && (
        <MascotBubble key={day.line} persona="nimbus" mood="happy" tint="mint">
          {day.line}
        </MascotBubble>
      )}
      {onAdd && <AddSheet open={adding} onClose={() => setAdding(false)} onAdd={onAdd} />}
      {footer}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  grow: { flex: 1 },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    minHeight: 34,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  hero: { gap: space.xl },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  ringSlot: { width: 86, height: 86, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 150, height: 150, left: -32, top: -32 },
  ofToday: { fontSize: 10, lineHeight: 12, marginTop: -2 },
  section: { gap: space.md },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  switch: { width: 136 },
});
