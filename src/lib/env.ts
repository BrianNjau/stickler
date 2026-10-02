// Public, build-time configuration. Expo only inlines EXPO_PUBLIC_* vars accessed as
// `process.env.EXPO_PUBLIC_NAME` literally, so no dynamic lookups here.

export type ServiceMode = 'mock' | 'live';

function readMode(raw: string | undefined, name: string): ServiceMode {
  if (raw === undefined || raw === '' || raw === 'mock') return 'mock';
  if (raw === 'live') return 'live';
  console.warn(`[env] ${name}="${raw}" is not "mock" or "live"; using mock.`);
  return 'mock';
}

function readOptional(raw: string | undefined): string | null {
  const v = raw?.trim();
  return v ? v : null;
}

export const env = {
  supabaseUrl: readOptional(process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: readOptional(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  aiMode: readMode(process.env.EXPO_PUBLIC_AI_MODE, 'EXPO_PUBLIC_AI_MODE'),
  mapsMode: readMode(process.env.EXPO_PUBLIC_MAPS_MODE, 'EXPO_PUBLIC_MAPS_MODE'),
} as const;
