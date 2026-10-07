import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Account, ProfilePatch, SettingsPatch } from '@/lib/account';
import { formatDuration, minutesToTime, nowIn, timeToMinutes, timezoneLabel } from '@/lib/time';
import { Chips, radius, size, space, Stepper, Text, TextField, useTheme } from '@/ui';
import { Globe } from '@/ui/icons';

import { TimezoneSheet } from './TimezoneSheet';

/** The editable shape of "your day": a profile row plus a few user_settings columns. */
export interface DayProfile {
  displayName: string;
  timezone: string;
  dailyCapacityMinutes: number;
  /** Minutes since midnight. */
  workdayStart: number;
  workdayEnd: number;
  /** 0 = Sunday … 6 = Saturday, as user_settings.rest_days. */
  restDays: number[];
}

export const dayProfileFrom = (a: Account, detectedTz?: string): DayProfile => ({
  displayName: a.profile.display_name ?? '',
  // First run: a seeded row says 'UTC'; prefer what the device reports.
  timezone: detectedTz && a.profile.timezone === 'UTC' ? detectedTz : a.profile.timezone,
  dailyCapacityMinutes: a.settings.daily_capacity_minutes,
  workdayStart: timeToMinutes(a.settings.workday_start),
  workdayEnd: timeToMinutes(a.settings.workday_end),
  restDays: [...a.settings.rest_days].sort(),
});

export const dayProfilePatches = (d: DayProfile): { profile: ProfilePatch; settings: SettingsPatch } => ({
  profile: { display_name: d.displayName.trim() || null, timezone: d.timezone },
  settings: {
    daily_capacity_minutes: d.dailyCapacityMinutes,
    workday_start: minutesToTime(d.workdayStart),
    workday_end: minutesToTime(d.workdayEnd),
    rest_days: [...d.restDays].sort(),
  },
});

/** Problems that would make the plan impossible; shown inline, never as a dialog. */
export function dayProfileProblem(d: DayProfile): string | null {
  if (d.workdayEnd <= d.workdayStart) return 'Your workday has to end after it starts.';
  if (d.restDays.length === 7) return 'Leave at least one day that isn’t a rest day.';
  if (d.dailyCapacityMinutes > d.workdayEnd - d.workdayStart)
    return 'That’s more focus time than your workday holds. Shorten one or widen the other.';
  return null;
}

const DAYS = [
  { value: 1, short: 'Mo', label: 'Monday' },
  { value: 2, short: 'Tu', label: 'Tuesday' },
  { value: 3, short: 'We', label: 'Wednesday' },
  { value: 4, short: 'Th', label: 'Thursday' },
  { value: 5, short: 'Fr', label: 'Friday' },
  { value: 6, short: 'Sa', label: 'Saturday' },
  { value: 0, short: 'Su', label: 'Sunday' },
] as const;

interface ProfileFormProps {
  value: DayProfile;
  onChange: (next: DayProfile) => void;
}

export function ProfileForm({ value, onChange }: ProfileFormProps) {
  const { theme } = useTheme();
  const [tzOpen, setTzOpen] = useState(false);
  const set = <K extends keyof DayProfile>(k: K, v: DayProfile[K]) => onChange({ ...value, [k]: v });
  const local = nowIn(value.timezone);

  return (
    <View style={styles.stack}>
      <TextField
        label="What should we call you?"
        placeholder="First name is plenty"
        value={value.displayName}
        onChangeText={(t) => set('displayName', t)}
        autoComplete="given-name"
        textContentType="givenName"
        maxLength={40}
      />

      <View style={styles.group}>
        <Text variant="label" color="ink3">
          Timezone
        </Text>
        <Pressable
          onPress={() => setTzOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Timezone: ${timezoneLabel(value.timezone)}${local ? `, ${local} there now` : ''}`}
          accessibilityHint="Opens the timezone list"
          style={[styles.tz, { backgroundColor: theme.surface, borderColor: theme.line2 }]}
        >
          <Globe size={18} color={theme.ink2} />
          <View style={styles.tzText}>
            <Text>{timezoneLabel(value.timezone)}</Text>
            <Text variant="small" color="ink2">
              {local ? `It’s ${local} there now. Change it if that’s wrong.` : 'Change it if that’s wrong.'}
            </Text>
          </View>
          <Text variant="small" color="ink">
            Change
          </Text>
        </Pressable>
      </View>

      <View style={styles.group}>
        <Text variant="label" color="ink3">
          Daily focus time
        </Text>
        <Stepper
          label="Minutes a day"
          value={value.dailyCapacityMinutes}
          min={15}
          max={960}
          step={15}
          format={formatDuration}
          onChange={(v) => set('dailyCapacityMinutes', v)}
        />
        <Text variant="small" color="ink2">
          Real, heads-down time. Most people overestimate this; we’ll learn yours.
        </Text>
      </View>

      <View style={styles.group}>
        <Text variant="label" color="ink3">
          Workday
        </Text>
        <Stepper
          label="Starts"
          value={value.workdayStart}
          min={0}
          max={23 * 60 + 30}
          step={30}
          format={minutesToTime}
          onChange={(v) => set('workdayStart', v)}
        />
        <Stepper
          label="Ends"
          value={value.workdayEnd}
          min={30}
          max={23 * 60 + 30}
          step={30}
          format={minutesToTime}
          onChange={(v) => set('workdayEnd', v)}
        />
      </View>

      <View style={styles.group}>
        <Text variant="label" color="ink3">
          Rest days
        </Text>
        <Chips label="Rest days" options={DAYS} selected={value.restDays} onChange={(d) => set('restDays', d)} />
        <Text variant="small" color="ink2">
          No blocks get planned on these. Rest is part of the plan.
        </Text>
      </View>

      <TimezoneSheet visible={tzOpen} value={value.timezone} onPick={(z) => set('timezone', z)} onClose={() => setTzOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.xl },
  group: { gap: space.sm },
  tz: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: size.button,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  tzText: { flex: 1, gap: 2 },
});
