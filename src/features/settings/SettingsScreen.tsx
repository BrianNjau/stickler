import { router } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { dayProfileFrom, dayProfilePatches, dayProfileProblem, ProfileForm, type DayProfile } from '@/features/profile';
import { saveAccount, useAccount, type Account, type SettingsPatch } from '@/lib/account';
import { signOut, useAuth } from '@/lib/auth';
import { env } from '@/lib/env';
import { resetIntro } from '@/lib/firstRun';
import {
  Button,
  Card,
  Nimbus,
  Pill,
  radius,
  Screen,
  ScreenHeader,
  Segmented,
  Sheet,
  Skeleton,
  Snitch,
  space,
  Text,
  ToggleRow,
  useTheme,
  type NimbusMood,
  type SnitchMood,
} from '@/ui';
import { LogOut, Mail } from '@/ui/icons';

import { humourLevels, snitchLevels } from './copy';

interface Prefs {
  snitchIntensity: number;
  humourLevel: number;
  attentionChecks: boolean;
  notifications: boolean;
}

const prefsFrom = (a: Account): Prefs => ({
  snitchIntensity: a.settings.snitch_intensity,
  humourLevel: a.settings.humour_level,
  attentionChecks: a.settings.attention_checks_on,
  notifications: a.settings.notifications_on,
});

const snitchMood = (n: number): SnitchMood => (n === 0 ? 'asleep' : n === 3 ? 'angry' : 'watch');
const nimbusMood = (n: number): NimbusMood => (['idle', 'focus', 'happy', 'cool'] as const)[n] ?? 'happy';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <Text variant="label" color="ink3" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </Card>
  );
}

/** Everything editable, starting from the loaded rows. One Save, lit only when something changed. */
function EditableSettings({ account }: { account: Account }) {
  const { tint } = useTheme();
  const [day, setDay] = useState<DayProfile>(() => dayProfileFrom(account));
  const [prefs, setPrefs] = useState<Prefs>(() => prefsFrom(account));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // Compared against the latest saved rows, so a save clears "unsaved changes".
  const saved = useMemo(() => JSON.stringify({ day: dayProfileFrom(account), prefs: prefsFrom(account) }), [account]);
  const dirty = JSON.stringify({ day, prefs }) !== saved;
  const problem = dayProfileProblem(day);

  const save = async () => {
    if (problem) return;
    setSaving(true);
    setMessage(null);
    const patches = dayProfilePatches(day);
    const settings: SettingsPatch = {
      ...patches.settings,
      snitch_intensity: prefs.snitchIntensity,
      humour_level: prefs.humourLevel,
      attention_checks_on: prefs.attentionChecks,
      notifications_on: prefs.notifications,
    };
    const r = await saveAccount(account.uid, patches.profile, settings);
    setSaving(false);
    setMessage(r.ok ? { ok: true, text: 'Saved.' } : { ok: false, text: r.message });
  };

  const blush = tint('blush');
  const snitch = snitchLevels[prefs.snitchIntensity] ?? snitchLevels[2];
  const humour = humourLevels[prefs.humourLevel] ?? humourLevels[2];

  return (
    <>
      <Section title="Your day">
        <ProfileForm value={day} onChange={setDay} />
      </Section>

      <Section title="The Snitch">
        <View style={styles.mascotRow}>
          <Snitch mood={snitchMood(prefs.snitchIntensity)} size={52} />
          <View style={styles.grow}>
            <Text variant="h3">{snitch.name}</Text>
            <Text variant="small" color="ink2">
              {snitch.about}
            </Text>
          </View>
        </View>
        <Segmented
          label="Snitch intensity"
          options={snitchLevels.map((l, i) => ({ value: i, label: l.short }))}
          value={prefs.snitchIntensity}
          onChange={(v) => setPrefs({ ...prefs, snitchIntensity: v })}
        />
      </Section>

      <Section title="Nimbus">
        <View style={styles.mascotRow}>
          <Nimbus mood={nimbusMood(prefs.humourLevel)} size={60} />
          <View style={styles.grow}>
            <Text variant="h3">{humour.name}</Text>
            <Text variant="small" color="ink2">
              {humour.about}
            </Text>
          </View>
        </View>
        <Segmented
          label="Humour level"
          options={humourLevels.map((l, i) => ({ value: i, label: l.short }))}
          value={prefs.humourLevel}
          onChange={(v) => setPrefs({ ...prefs, humourLevel: v })}
        />
      </Section>

      <Section title="During a block">
        <ToggleRow
          label="Attention checks"
          description="A quick “still with us?” every 18–30 minutes."
          value={prefs.attentionChecks}
          onChange={(v) => setPrefs({ ...prefs, attentionChecks: v })}
        />
        <ToggleRow
          label="Notifications"
          description="Round ends, block starts and the evening sweep. Never more than two nudges a day."
          value={prefs.notifications}
          onChange={(v) => setPrefs({ ...prefs, notifications: v })}
        />
      </Section>

      {(problem || (message && !message.ok)) && (
        <View style={[styles.note, { backgroundColor: blush.bg }]} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <Text variant="small" fg={blush.fg}>
            {problem ?? message?.text}
          </Text>
        </View>
      )}
      <Button
        label={dirty ? 'Save changes' : message?.ok ? 'Saved' : 'No changes to save'}
        loading={saving}
        disabled={!dirty || !!problem}
        onPress={save}
      />
    </>
  );
}

export function SettingsScreen() {
  const { user, isAnonymous } = useAuth();
  const { account, stale } = useAccount();
  const [confirmOut, setConfirmOut] = useState(false);

  const doSignOut = async () => {
    setConfirmOut(false);
    await signOut(); // routing returns to sign-in
  };

  return (
    <Screen>
      <ScreenHeader title="Settings" back={{ fallbackHref: '/character' }} />

      <Section title="Account">
        {isAnonymous ? (
          <>
            <Text>You’re trying Stickler without an account.</Text>
            <Text variant="small" color="ink2">
              Add an email to keep everything — same plan, same progress — and sign in on other devices.
            </Text>
            <Button label="Add an email" icon={Mail} variant="secondary" size="md" onPress={() => router.push('/add-email')} />
          </>
        ) : (
          <View style={styles.between}>
            <Text style={styles.grow}>{user?.email ?? 'Signed in'}</Text>
            <Pill label="Email" tint="mint" />
          </View>
        )}
      </Section>

      {account ? (
        <EditableSettings key={account.uid} account={account} />
      ) : (
        <Card accessible accessibilityLabel="Loading your settings" accessibilityState={{ busy: true }}>
          <Skeleton width="30%" height={12} />
          <Skeleton height={52} rounded={radius.control} />
          <Skeleton height={52} rounded={radius.control} />
          {stale && (
            <Text variant="small" color="ink2">
              Can’t reach the server right now. Your settings will appear when you’re back online.
            </Text>
          )}
        </Card>
      )}

      <Section title="Services">
        <View style={styles.between}>
          <Text style={styles.grow}>Plan generation</Text>
          <Pill label={env.aiMode === 'live' ? 'Live' : 'Offline mock'} tint={env.aiMode === 'live' ? 'mint' : undefined} />
        </View>
        <View style={styles.between}>
          <Text style={styles.grow}>Commute times</Text>
          <Pill label={env.mapsMode === 'live' ? 'Live' : 'Offline mock'} tint={env.mapsMode === 'live' ? 'mint' : undefined} />
        </View>
      </Section>

      <Button
        label="Sign out"
        icon={LogOut}
        variant="destructive"
        onPress={() => (isAnonymous ? setConfirmOut(true) : doSignOut())}
      />
      {/* Development only: the intro shows once per install, so this is the way to see it again. */}
      {__DEV__ && <Button label="Replay intro (dev)" variant="quiet" size="md" onPress={resetIntro} />}

      <Sheet visible={confirmOut} title="Sign out of this trial?" onClose={() => setConfirmOut(false)}>
        <Text color="ink2">
          A trial has no email, so there’s no way back into it once you sign out. Add an email first and you keep
          everything.
        </Text>
        <Button
          label="Add an email instead"
          onPress={() => {
            setConfirmOut(false);
            router.push('/add-email');
          }}
        />
        <Button label="Sign out and leave the trial" variant="destructive" onPress={doSignOut} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 36 },
  grow: { flex: 1 },
  mascotRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  note: { borderRadius: radius.control, padding: space.lg },
});
