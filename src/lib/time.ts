// Small, dependency-free time helpers for profile capture and settings.

/** The device's IANA timezone, e.g. "Africa/Nairobi". Falls back to UTC if the runtime can't say. */
export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

// Used when the runtime has no Intl.supportedValuesOf (older Hermes builds).
const FALLBACK_ZONES = [
  'Pacific/Honolulu', 'America/Anchorage', 'America/Los_Angeles', 'America/Denver', 'America/Chicago',
  'America/New_York', 'America/Halifax', 'America/Sao_Paulo', 'America/Argentina/Buenos_Aires',
  'Atlantic/Azores', 'UTC', 'Europe/London', 'Europe/Dublin', 'Europe/Lisbon', 'Africa/Lagos',
  'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome', 'Europe/Amsterdam', 'Africa/Johannesburg',
  'Africa/Cairo', 'Europe/Athens', 'Europe/Istanbul', 'Africa/Nairobi', 'Asia/Riyadh', 'Europe/Moscow',
  'Asia/Dubai', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Kathmandu', 'Asia/Dhaka', 'Asia/Bangkok',
  'Asia/Jakarta', 'Asia/Singapore', 'Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Manila', 'Australia/Perth',
  'Asia/Seoul', 'Asia/Tokyo', 'Australia/Adelaide', 'Australia/Brisbane', 'Australia/Sydney',
  'Pacific/Auckland',
];

export function allTimezones(): string[] {
  try {
    if (typeof Intl.supportedValuesOf === 'function') {
      const zones = Intl.supportedValuesOf('timeZone');
      if (zones.length > 0) return zones.includes('UTC') ? zones : ['UTC', ...zones];
    }
  } catch {
    // fall through
  }
  return FALLBACK_ZONES;
}

/** "Africa/Nairobi" → "Nairobi, Africa" for display; the stored value stays IANA. */
export function timezoneLabel(zone: string): string {
  const parts = zone.split('/');
  if (parts.length < 2) return zone;
  const city = parts[parts.length - 1]!.replace(/_/g, ' ');
  return `${city}, ${parts[0]}`;
}

/** The current wall-clock time in a zone, "14:05", or null if the zone is unknown to the runtime. */
export function nowIn(zone: string, at: Date = new Date()): string | null {
  try {
    return at.toLocaleTimeString('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit' });
  } catch {
    return null;
  }
}

/** Postgres `time` ("08:00:00") or "08:00" → minutes since midnight. */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Minutes since midnight → "HH:MM" (what we write back to a `time` column). */
export function minutesToTime(min: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(min)));
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
}

/** 150 → "2 h 30 min", 45 → "45 min". */
export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
