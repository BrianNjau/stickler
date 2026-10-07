import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { updateCapacity, useAccount } from '@/lib/account';
import { useAuth } from '@/lib/auth';
import {
  activeGoal,
  constraintsOf,
  createGoal,
  loadDraft,
  pendingDraft,
  unfinishedGoal,
  updateGoal,
  type GoalHorizon,
  type GoalRow,
} from '@/lib/plans';
import { formatDuration } from '@/lib/time';
import { haptic, radius, size, Skeleton, space, Stepper, Text, TextField, useTheme } from '@/ui';
import { Check } from '@/ui/icons';

import { horizonOptions, intakeCopy } from './copy';
import { useIntake } from './IntakeContext';
import { WizardStep } from './WizardStep';

const SAVE_FAILED = 'That didn’t save. Check your connection and try again — what you typed is still here.';

// ── (a) The goal ─────────────────────────────────────────────────────────────────────────────

function GoalForm({ initial, resumed }: { initial: GoalRow | null; resumed: boolean }) {
  const { user } = useAuth();
  const { setGoal } = useIntake();
  const [text, setText] = useState(initial?.raw_input ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const valid = text.trim().length >= 3;
  const c = intakeCopy.goal;

  const next = async () => {
    if (!user || !valid) return;
    setBusy(true);
    setError(null);
    try {
      const goal = initial ? await updateGoal(initial.id, { raw_input: text }) : await createGoal(user.id, text);
      setGoal(goal);
      router.push('/intake/why');
    } catch {
      setError(SAVE_FAILED);
    } finally {
      setBusy(false);
    }
  };

  return (
    <WizardStep step={1} eyebrow={c.eyebrow} title={c.title} body={c.body} onNext={next} nextDisabled={!valid} busy={busy} error={error}>
      {resumed && (
        <Text variant="small" color="ink2">
          {c.resumed}
        </Text>
      )}
      <TextField
        label={c.label}
        placeholder={c.placeholder}
        value={text}
        onChangeText={setText}
        multiline
        maxLength={500}
        hint={words > 0 && words < 4 ? c.short : undefined}
        autoFocus={!initial}
      />
    </WizardStep>
  );
}

/** Step 1, plus the resume logic: a draft under review, "Change my plan", or an unfinished goal. */
export function GoalStep() {
  const { user } = useAuth();
  const { goal, setGoal, startReview, setReplan } = useIntake();
  const { replan } = useLocalSearchParams<{ replan?: string }>();
  const [ready, setReady] = useState(!!goal);
  const [resumed, setResumed] = useState(false);

  useEffect(() => {
    if (!user || goal) return;
    let live = true;
    (async () => {
      if (replan) {
        setReplan(true);
        const active = await activeGoal(user.id);
        if (live && active) setGoal(active.goal);
      } else {
        const draft = pendingDraft(user.id);
        if (draft) {
          try {
            startReview(await loadDraft(draft.planId));
            if (live) router.replace('/intake/review');
            return;
          } catch {
            // The draft is gone (e.g. another device committed it); fall through to the goal.
          }
        }
        const unfinished = await unfinishedGoal(user.id);
        if (live && unfinished) {
          setGoal(unfinished);
          setResumed(true);
        }
      }
      if (live) setReady(true);
    })();
    return () => {
      live = false;
    };
    // Runs once per visit; the context setters are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, replan]);

  if (!ready) {
    return (
      <WizardStep step={1} eyebrow={intakeCopy.goal.eyebrow} title={intakeCopy.goal.title} onNext={() => {}} nextDisabled>
        <Skeleton height={112} rounded={radius.control} />
      </WizardStep>
    );
  }
  return <GoalForm key={goal?.id ?? 'new'} initial={goal} resumed={resumed} />;
}

// ── (b) Why it matters ─────────────────────────────────────────────────────────────────────────

export function WhyStep() {
  const { goal, setGoal } = useIntake();
  const [text, setText] = useState(goal?.why ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const c = intakeCopy.why;
  if (!goal) return <Redirect href="/intake" />;

  const next = async () => {
    setBusy(true);
    setError(null);
    try {
      setGoal(await updateGoal(goal.id, { why: text.trim() || null }));
      router.push('/intake/horizon');
    } catch {
      setError(SAVE_FAILED);
    } finally {
      setBusy(false);
    }
  };

  return (
    <WizardStep step={2} eyebrow={c.eyebrow} title={c.title} body={c.body} onNext={next} busy={busy} error={error}
      nextLabel={text.trim() ? intakeCopy.next : 'Skip for now'}>
      <TextField label={c.label} placeholder={c.placeholder} value={text} onChangeText={setText} multiline maxLength={400} />
    </WizardStep>
  );
}

// ── (c) Horizon ──────────────────────────────────────────────────────────────────────────────

export function HorizonStep() {
  const { theme } = useTheme();
  const { goal, setGoal } = useIntake();
  const [value, setValue] = useState<GoalHorizon>(goal?.horizon ?? 'months');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const c = intakeCopy.horizon;
  if (!goal) return <Redirect href="/intake" />;

  const next = async () => {
    setBusy(true);
    setError(null);
    try {
      setGoal(await updateGoal(goal.id, { horizon: value }));
      router.push('/intake/hours');
    } catch {
      setError(SAVE_FAILED);
    } finally {
      setBusy(false);
    }
  };

  return (
    <WizardStep step={3} eyebrow={c.eyebrow} title={c.title} body={c.body} onNext={next} busy={busy} error={error}>
      <View style={styles.options} accessibilityRole="radiogroup" accessibilityLabel={c.title}>
        {horizonOptions.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              aria-checked={on}
              accessibilityLabel={`${o.label}. ${o.detail}`}
              onPress={() => {
                haptic('press');
                setValue(o.value);
              }}
              style={[
                styles.option,
                on ? { borderColor: theme.ink, backgroundColor: theme.surface } : { borderColor: theme.line2, backgroundColor: theme.surface },
              ]}
            >
              <View style={styles.optionText}>
                <Text variant="h3">{o.label}</Text>
                <Text variant="small" color="ink2">
                  {o.detail}
                </Text>
              </View>
              <View style={[styles.radio, { borderColor: on ? theme.ink : theme.line2, backgroundColor: on ? theme.ink : 'transparent' }]}>
                {on && <Check size={14} color={theme.inkOn} strokeWidth={3} />}
              </View>
            </Pressable>
          );
        })}
      </View>
    </WizardStep>
  );
}

// ── (d) Hours and constraints ────────────────────────────────────────────────────────────────

function HoursForm({ goal, capacity }: { goal: GoalRow; capacity: number }) {
  const { user } = useAuth();
  const { setGoal } = useIntake();
  const saved = constraintsOf(goal);
  const [minutes, setMinutes] = useState(saved.daily_minutes ?? capacity);
  const [notes, setNotes] = useState(saved.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const c = intakeCopy.hours;

  const next = async () => {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      // The correction is the user's real capacity, so it updates their settings too (the planner reads it).
      if (minutes !== capacity) {
        const r = await updateCapacity(user.id, minutes);
        if (!r.ok) throw new Error(r.message);
      }
      setGoal(await updateGoal(goal.id, { constraints: { daily_minutes: minutes, ...(notes.trim() ? { notes: notes.trim() } : {}) } }));
      router.push('/intake/shape');
    } catch {
      setError(SAVE_FAILED);
    } finally {
      setBusy(false);
    }
  };

  return (
    <WizardStep step={4} eyebrow={c.eyebrow} title={c.title} body={c.body} onNext={next} busy={busy} error={error}>
      <Stepper label="Focus time a day" value={minutes} min={15} max={960} step={15} format={formatDuration} onChange={setMinutes} />
      <Text variant="small" color="ink2">
        That’s about <Text variant="mono">{Math.round((minutes * 5) / 60)}</Text> hours a week on a five-day week.
      </Text>
      <TextField label={c.notesLabel} placeholder={c.notesPlaceholder} value={notes} onChangeText={setNotes} multiline maxLength={400} />
    </WizardStep>
  );
}

export function HoursStep() {
  const { goal } = useIntake();
  const { account } = useAccount();
  if (!goal) return <Redirect href="/intake" />;
  if (!account) {
    return (
      <WizardStep step={4} eyebrow={intakeCopy.hours.eyebrow} title={intakeCopy.hours.title} onNext={() => {}} nextDisabled>
        <Skeleton height={size.hit} rounded={radius.control} />
      </WizardStep>
    );
  }
  return <HoursForm key={goal.id} goal={goal} capacity={account.settings.daily_capacity_minutes} />;
}

const styles = StyleSheet.create({
  options: { gap: space.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderWidth: 1.5,
    borderRadius: radius.panel,
    padding: space.lg,
    minHeight: size.button,
  },
  optionText: { flex: 1, gap: 2 },
  radio: { width: 24, height: 24, borderRadius: radius.pill, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
