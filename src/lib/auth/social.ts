import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { requireSupabase } from '../supabase';
import type { Result } from './actions';
import { describeAuthError } from './errors';
import { getAuth } from './state';

/**
 * Apple and Google sign-in. OFF until we ship a development build: the buttons are hidden, not
 * disabled. Turning it on also needs, in the Supabase dashboard: the Apple/Google providers,
 * "Allow manual linking" (so a trial can link instead of starting over), and the redirect URLs
 * stickler://**, exp://** and the web origin.
 *
 * This uses the browser OAuth flow (expo-web-browser + PKCE), which works without native SDKs.
 * Native Sign in with Apple can replace it in the dev build.
 */
export const SOCIAL_AUTH_ENABLED = false;

export type SocialProvider = 'apple' | 'google';

const redirectTo = () => Linking.createURL('auth/callback');

/**
 * Signs in, or — for an anonymous trial — links the provider to the current user, keeping their data.
 */
export async function continueWith(provider: SocialProvider): Promise<Result> {
  const supabase = requireSupabase();
  const options = { redirectTo: redirectTo(), skipBrowserRedirect: Platform.OS !== 'web' };
  const { data, error } = getAuth().isAnonymous
    ? await supabase.auth.linkIdentity({ provider, options })
    : await supabase.auth.signInWithOAuth({ provider, options });
  if (error) return { ok: false, problem: describeAuthError(error) };
  if (Platform.OS === 'web') return { ok: true }; // the browser redirects; detectSessionInUrl finishes it

  const result = await WebBrowser.openAuthSessionAsync(data.url ?? '', options.redirectTo);
  if (result.type !== 'success') return { ok: false, problem: { kind: 'other', message: 'Sign-in was cancelled.' } };
  const code = new URL(result.url).searchParams.get('code');
  if (!code) return { ok: false, problem: describeAuthError(new Error('missing code')) };
  const exchanged = await supabase.auth.exchangeCodeForSession(code);
  return exchanged.error ? { ok: false, problem: describeAuthError(exchanged.error) } : { ok: true };
}
