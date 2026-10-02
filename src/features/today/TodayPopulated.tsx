import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, MascotBubble, Pill, radius, Sheet, space, TaskRow, Text, text, useTheme } from '@/ui';
import { ChevronRight, Play } from '@/ui/icons';

import type { PreviewBlock, PreviewTask, TodayPreview } from './preview';

function useTasks(initial: PreviewTask[]) {
  const [tasks, setTasks] = useState(initial);
  return {
    tasks,
    toggle: (id: string) => setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t))),
    remove: (id: string) => setTasks((ts) => ts.filter((t) => t.id !== id)),
  };
}

function NowCard({ block }: { block: PreviewBlock }) {
  const { tint } = useTheme();
  const fg = tint('mint').fg;
  const { tasks, toggle, remove } = useTasks(block.tasks);

  return (
    <Card tint="mint">
      <View style={styles.between}>
        <Text variant="label" fg={fg}>
          Now · {block.start}–{block.end}
        </Text>
        <Pill label={`${block.minutes} min`} onTint="mint" />
      </View>
      <Text variant="h2" fg={fg} accessibilityRole="header">
        {block.title}
      </Text>
      <View style={styles.pills}>
        <Pill label={`${block.rounds} rounds`} onTint="mint" />
        <Pill label={block.skill} onTint="mint" />
      </View>
      <View>
        {tasks.map((t) => (
          <TaskRow
            key={t.id}
            tint="mint"
            title={t.title}
            minutes={t.minutes}
            priority={t.priority}
            done={t.done}
            onToggle={() => toggle(t.id)}
            onDelete={() => remove(t.id)}
          />
        ))}
      </View>
      <Button label="Start block" icon={Play} onPress={() => router.push('/focus')} />
    </Card>
  );
}

function NextCard({ block, onOpen }: { block: PreviewBlock; onOpen: () => void }) {
  const { tint } = useTheme();
  const fg = tint('lilac').fg;
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`Up next: ${block.title}, ${block.start} to ${block.end}`}
      accessibilityHint="Opens the block details"
    >
      <Card tint="lilac" style={styles.nextCard}>
        <View style={styles.nextText}>
          <Text variant="label" fg={fg}>
            Up next · {block.start}–{block.end}
          </Text>
          <Text variant="h3" fg={fg}>
            {block.title}
          </Text>
          <Text variant="small" fg={fg}>
            {block.kind} · {block.note}
          </Text>
        </View>
        <ChevronRight size={20} color={fg} />
      </Card>
    </Pressable>
  );
}

function PaceCard({ pace }: { pace: TodayPreview['pace'] }) {
  const { theme } = useTheme();
  const behind = Math.max(0, pace.expected - pace.done);
  const pct = (n: number) => `${Math.min(100, (n / pace.total) * 100)}%` as const;

  return (
    <Card>
      <View style={styles.between}>
        <Text variant="label" color="ink3">
          Pace
        </Text>
        <Pill label={behind === 0 ? 'On pace' : `Behind by ${behind}`} tint={behind === 0 ? 'mint' : 'butter'} />
      </View>
      <View style={styles.paceRow}>
        <Text variant="mono" style={styles.bigNumber}>
          {pace.done}/{pace.total}
        </Text>
        <Text color="ink2">tasks done</Text>
      </View>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Tasks done today"
        accessibilityValue={{ min: 0, max: pace.total, now: pace.done }}
        style={[styles.track, { backgroundColor: theme.surface2 }]}
      >
        <View style={[styles.fill, { width: pct(pace.done), backgroundColor: theme.good }]} />
        <View style={[styles.expected, { left: pct(pace.expected), backgroundColor: theme.ink }]} />
      </View>
      <Text variant="small" color="ink2">
        The line marks where the clock expects you to be.
      </Text>
    </Card>
  );
}

export function TodayPopulated({ data }: { data: TodayPreview }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { tasks, toggle } = useTasks(data.next.tasks);

  return (
    <>
      <MascotBubble persona="nimbus" mood="happy">
        {data.nimbusLine}
      </MascotBubble>
      <NowCard block={data.now} />
      <NextCard block={data.next} onOpen={() => setSheetOpen(true)} />
      <PaceCard pace={data.pace} />

      <Sheet visible={sheetOpen} title={data.next.title} onClose={() => setSheetOpen(false)}>
        <View style={styles.pills}>
          <Pill label={`${data.next.start}–${data.next.end}`} />
          <Pill label={`${data.next.minutes} min`} />
          <Pill label={data.next.kind} tint="lilac" />
        </View>
        <Text color="ink2">{data.next.note}</Text>
        {tasks.map((t) => (
          <TaskRow
            key={t.id}
            title={t.title}
            minutes={t.minutes}
            priority={t.priority}
            done={t.done}
            onToggle={() => toggle(t.id)}
          />
        ))}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  nextCard: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  nextText: { flex: 1, gap: space.xs },
  paceRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  bigNumber: { fontSize: text.h1.size, lineHeight: text.h1.line },
  track: { height: 8, borderRadius: radius.pill, overflow: 'hidden', minHeight: 8 },
  fill: { height: '100%', borderRadius: radius.pill },
  expected: { position: 'absolute', top: 0, bottom: 0, width: 2, marginLeft: -1 },
});
