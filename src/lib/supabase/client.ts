// Installs a SQLite-backed `localStorage` on iOS/Android; a no-op on web, which has its own.
import 'expo-sqlite/localStorage/install';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from '@shared/database.types';

import { env } from '../env';

export type Supabase = SupabaseClient<Database>;

function create(): Supabase | null {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    // Never crash a screen over config: log, and let callers render an offline/empty state.
    console.warn(
      '[supabase] EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY not set; running without a backend.',
    );
    return null;
  }

  const client = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      storage: localStorage,
      // App-owned key instead of the default `sb-<project-ref>-auth-token`. Changing it signs everyone out.
      storageKey: 'stickler-auth-token',
      persistSession: true,
      autoRefreshToken: true,
      // Magic-link redirects land in the URL on web; native handles them via deep links (WP1).
      detectSessionInUrl: Platform.OS === 'web',
    },
  });

  // On native, only refresh tokens while foregrounded; the browser manages this itself on web.
  if (Platform.OS !== 'web') {
    AppState.addEventListener('change', (state) => {
      if (state === 'active') client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    });
  }

  return client;
}

/** The app's single Supabase client, or `null` when the public URL/key are not configured. */
export const supabase: Supabase | null = create();

export const isSupabaseConfigured = supabase !== null;

/** For query/mutation functions: throws (and so surfaces as a query error) instead of returning null. */
export function requireSupabase(): Supabase {
  if (!supabase) throw new Error('Supabase is not configured (see .env.example).');
  return supabase;
}
