// Pure date helpers for the Today header and day strip (no device-clock surprises: ISO dates in,
// ISO dates out, arithmetic at UTC noon so no zone can push a day over a boundary).
import type { StripDay } from '@/ui';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

const at = (iso: string) => new Date(`${iso}T12:00:00Z`);
export const shiftDay = (iso: string, n: number) => {
  const d = at(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const weekdayName = (iso: string) => LONG[at(iso).getUTCDay()] ?? '';

/** Seven days: two behind today, today, four ahead (the artboard's strip). */
export function stripDays(today: string, restDays: readonly number[]): StripDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = shiftDay(today, i - 2);
    const d = at(date);
    return {
      date,
      weekday: WEEKDAYS[d.getUTCDay()] ?? '',
      day: d.getUTCDate(),
      isToday: date === today,
      rest: restDays.includes(d.getUTCDay()),
    };
  });
}

export type DayPart = 'morning' | 'afternoon' | 'evening';
export const dayPart = (hour: number): DayPart => (hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening');

/** The device's local date, YYYY-MM-DD (previews; live data uses the server's fn_local_date). */
export const localIso = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
