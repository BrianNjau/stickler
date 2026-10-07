import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';
import {
  BLOCK_BUDGET_MINUTES,
  clampEstimate,
  commitDraft,
  ESTIMATE_MAX,
  ESTIMATE_MIN,
  type DraftMilestone,
  type DraftQuest,
  type DraftStage,
  type PlanDraft,
} from '@/lib/plans';
import { Button, Card, Pill, radius, size, space, Stepper, Text, type, useTheme } from '@/ui';
import { Plus, Trash } from '@/ui/icons';

import { reviewCopy as copy } from './copy';
import { useIntake } from './IntakeContext';

const minutes = (n: number) => `${n} min`;

/** A plain, bordered single-line edit used throughout the review. */
function Inline(props: TextInputProps & { label: string; struck?: boolean }) {
  const { theme, fontsReady } = useTheme();
  const { label, struck, style, ...rest } = props;
  return (
    <TextInput
      accessibilityLabel={label}
      placeholderTextColor={theme.ink3}
      editable={!struck}
      {...rest}
      style={[
        styles.inline,
        {
          color: struck ? theme.ink3 : theme.ink,
          borderColor: theme.line2,
          backgroundColor: theme.surface,
          fontFamily: fontsReady ? type.body : undefined,
          textDecorationLine: struck ? 'line-through' : 'none',
        },
        style,
      ]}
    />
  );
}

function RemoveToggle({ removed, what, onToggle }: { removed: boolean; what: string; onToggle: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={removed ? `${copy.restore}: ${what}` : `${copy.remove}: ${what}`}
      hitSlop={6}
      style={[styles.iconBtn, { backgroundColor: removed ? theme.surface2 : theme.blush }]}
    >
      {removed ? (
        <Text variant="small" color="ink">
          {copy.restore}
        </Text>
      ) : (
        <Trash size={16} color={theme.onBlush} />
      )}
    </Pressable>
  );
}

function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <View style={styles.sectionHead}>
      <Text variant="h2" accessibilityRole="header" style={styles.grow}>
        {title}
      </Text>
      <Text variant="mono" color="ink3">
        {count}
      </Text>
    </View>
  );
}

let newIds = 0;

function ReviewBody({ draft, original, uid }: { draft: PlanDraft; original: PlanDraft; uid: string }) {
  const { theme, tint } = useTheme();
  const insets = useSafeAreaInsets();
  const { setDraft, reset } = useIntake();
  const [addTitle, setAddTitle] = useState('');
  const [addMinutes, setAddMinutes] = useState(25);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setStage = (id: string, patch: Partial<DraftStage>) =>
    setDraft({ ...draft, tracks: draft.tracks.map((t) => ({ ...t, stages: t.stages.map((s) => (s.id === id ? { ...s, ...patch } : s)) })) });
  const setMilestone = (id: string, patch: Partial<DraftMilestone>) =>
    setDraft({ ...draft, milestones: draft.milestones.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  const setQuest = (id: string, patch: Partial<DraftQuest>) =>
    setDraft({ ...draft, quests: draft.quests.map((q) => (q.id === id ? { ...q, ...patch } : q)) });

  const addQuest = () => {
    if (!addTitle.trim()) return;
    const skill = draft.skills[0]?.key ?? null;
    setDraft({
      ...draft,
      quests: [
        ...draft.quests,
        { id: `new:${++newIds}`, title: addTitle.trim(), skill, kind: 'learn', estimateMinutes: clampEstimate(addMinutes), deleted: false },
      ],
    });
    setAddTitle('');
  };

  const live = draft.quests.filter((q) => !q.deleted);
  const tooLong = live.filter((q) => q.estimateMinutes > BLOCK_BUDGET_MINUTES);
  const liveStages = draft.tracks.flatMap((t) => t.stages).filter((s) => !s.deleted);
  const skillLabel = (k: string | null) => draft.skills.find((s) => s.key === k)?.label ?? k ?? '';
  const blocking = live.length === 0 ? copy.noQuests : null;
  const warning = blocking
    ? null
    : tooLong.length > live.length / 2
      ? copy.mostlyTooLong
      : live.length < 5
        ? copy.fewQuests
        : null;

  const start = async () => {
    if (blocking) return;
    setBusy(true);
    setError(null);
    const r = await commitDraft(draft, original, uid);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    reset();
    router.replace('/');
  };

  const butter = tint('butter');
  const blush = tint('blush');

  return (
    <ScrollView style={{ backgroundColor: theme.ground }} keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.content, { paddingTop: insets.top + space.xl }]}>
      <View style={styles.head}>
        <Text variant="label" color="ink3">
          {copy.eyebrow}
        </Text>
        <Text variant="h1" accessibilityRole="header">
          {copy.title}
        </Text>
        <Text color="ink2">{copy.body}</Text>
      </View>

      <Card tint="lilac">
        <Text variant="h3" fg={tint('lilac').fg}>
          {draft.northStar}
        </Text>
        <Text variant="small" fg={tint('lilac').fg}>
          {draft.summary}
        </Text>
      </Card>

      <Card>
        <SectionTitle title={copy.stages} count={liveStages.length} />
        {draft.tracks.map((t) => (
          <View key={t.id} style={styles.group}>
            {draft.tracks.length > 1 && (
              <Text variant="label" color="ink3">
                {t.title}
              </Text>
            )}
            {t.stages.map((s, i) => (
              <View key={s.id} style={styles.row}>
                <Text variant="mono" color="ink3" style={styles.index}>
                  {i + 1}
                </Text>
                <Inline label={`Stage ${i + 1} title`} value={s.title} struck={s.deleted} onChangeText={(v) => setStage(s.id, { title: v })} style={styles.grow} />
                <RemoveToggle removed={s.deleted} what={s.title} onToggle={() => setStage(s.id, { deleted: !s.deleted })} />
              </View>
            ))}
          </View>
        ))}
      </Card>

      <Card>
        <SectionTitle title={copy.milestones} count={draft.milestones.filter((m) => !m.deleted).length} />
        {draft.milestones.map((m) => (
          <View key={m.id} style={[styles.item, { borderBottomColor: theme.line }]}>
            <View style={styles.row}>
              <Inline label="Milestone title" value={m.title} struck={m.deleted} onChangeText={(v) => setMilestone(m.id, { title: v })} style={styles.grow} />
              <RemoveToggle removed={m.deleted} what={m.title} onToggle={() => setMilestone(m.id, { deleted: !m.deleted })} />
            </View>
            {!m.deleted && (
              <View style={styles.row}>
                <Text variant="label" color="ink3" style={styles.whenLabel}>
                  {copy.target}
                </Text>
                <Inline label={`When: ${m.title}`} value={m.targetLabel} placeholder="e.g. Mid-March" onChangeText={(v) => setMilestone(m.id, { targetLabel: v })} style={styles.grow} />
                {m.isKeystone && <Pill label="Keystone" tint="butter" />}
              </View>
            )}
          </View>
        ))}
      </Card>

      <Card>
        <SectionTitle title={copy.quests} count={live.length} />
        <Text variant="small" color="ink2">
          {copy.questsBody}
        </Text>
        {draft.quests.map((q) => (
          <View key={q.id} style={[styles.item, { borderBottomColor: theme.line }]}>
            <View style={styles.row}>
              <Inline label="Quest" value={q.title} struck={q.deleted} onChangeText={(v) => setQuest(q.id, { title: v })} style={styles.grow} />
              <RemoveToggle removed={q.deleted} what={q.title} onToggle={() => setQuest(q.id, { deleted: !q.deleted })} />
            </View>
            {!q.deleted && (
              <>
                <Stepper
                  label={skillLabel(q.skill) || 'Minutes'}
                  value={q.estimateMinutes}
                  min={ESTIMATE_MIN}
                  max={ESTIMATE_MAX}
                  step={5}
                  format={minutes}
                  onChange={(v) => setQuest(q.id, { estimateMinutes: v })}
                />
                {q.estimateMinutes > BLOCK_BUDGET_MINUTES && (
                  <Text variant="small" fg={butter.fg}>
                    {copy.tooLong(BLOCK_BUDGET_MINUTES)}
                  </Text>
                )}
              </>
            )}
          </View>
        ))}

        <View style={styles.add}>
          <Text variant="label" color="ink3">
            {copy.add}
          </Text>
          <Inline label="New quest title" value={addTitle} placeholder={copy.addPlaceholder} onChangeText={setAddTitle} onSubmitEditing={addQuest} />
          <Stepper label="Minutes" value={addMinutes} min={ESTIMATE_MIN} max={ESTIMATE_MAX} step={5} format={minutes} onChange={setAddMinutes} />
          <Button label={copy.add} icon={Plus} variant="secondary" size="md" disabled={!addTitle.trim()} onPress={addQuest} />
        </View>
      </Card>

      {(warning || blocking || error) && (
        <View style={[styles.note, { backgroundColor: blocking || error ? blush.bg : butter.bg }]} accessibilityRole="alert">
          <Text variant="small" fg={blocking || error ? blush.fg : butter.fg}>
            {error ?? blocking ?? warning}
          </Text>
        </View>
      )}
      <Button label={busy ? copy.starting : copy.start} loading={busy} disabled={!!blocking} onPress={start} />
    </ScrollView>
  );
}

export function ReviewScreen() {
  const { user } = useAuth();
  const { draft, original } = useIntake();
  if (!draft || !original || !user) return <Redirect href="/intake" />;
  return <ReviewBody draft={draft} original={original} uid={user.id} />;
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: size.gutter, paddingBottom: space.xxxl, gap: size.cardGap },
  head: { gap: space.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  group: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  item: { gap: space.sm, paddingBottom: space.md, borderBottomWidth: StyleSheet.hairlineWidth },
  grow: { flex: 1 },
  index: { width: 18 },
  whenLabel: { width: 44 },
  inline: { minHeight: size.hit, borderWidth: 1, borderRadius: radius.control - 4, paddingHorizontal: space.md, fontSize: 15 },
  iconBtn: { minWidth: size.hit, height: size.hit, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.sm },
  add: { gap: space.sm, paddingTop: space.sm },
  note: { borderRadius: radius.control, padding: space.lg },
});
