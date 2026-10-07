import { requireSupabase } from '../supabase';
import { describeAuthError, type AuthProblem } from './errors';
import { refreshAuth } from './state';

export type Result = { ok: true } | { ok: false; problem: AuthProblem };

const ok: Result = { ok: true };
const fail = (e: Parameters<typeof describeAuthError>[0]): Result => ({ ok: false, problem: describeAuthError(e) });

async function attempt(run: () => Promise<{ error: Parameters<typeof describeAuthError>[0] }>): Promise<Result> {
  try {
    const { error } = await run();
    return error ? fail(error) : ok;
  } catch (e) {
    return fail(e instanceof Error ? e : new Error(String(e)));
  }
}

const normalise = (email: string) => email.trim().toLowerCase();

/** Sign in or sign up: Supabase emails a six-digit code (the template must contain {{ .Token }}). */
export const sendSignInCode = (email: string) =>
  attempt(() => requireSupabase().auth.signInWithOtp({ email: normalise(email), options: { shouldCreateUser: true } }));

export const verifySignInCode = (email: string, token: string) =>
  attempt(() => requireSupabase().auth.verifyOtp({ email: normalise(email), token, type: 'email' }));

/**
 * "Try a day without an account": a real, anonymous Supabase user. Everything they make is theirs
 * under RLS from the first minute, which is what lets them keep it all when they add an email.
 */
export async function startTrial(timezone: string): Promise<Result> {
  const result = await attempt(() => requireSupabase().auth.signInAnonymously());
  if (!result.ok) return result;
  // Trials skip first-run capture, but plans need the right clock. Best effort; Settings can fix it.
  const supabase = requireSupabase();
  const { data } = await supabase.auth.getUser();
  if (data.user) await supabase.from('profiles').update({ timezone }).eq('id', data.user.id);
  return ok;
}

// ── Upgrade path: anonymous → email, same user id, so every row stays theirs ──────────────────

/** Attaches an email to the current anonymous user; Supabase sends a code ("Change Email Address" template). */
export const sendUpgradeCode = (email: string) =>
  attempt(() => requireSupabase().auth.updateUser({ email: normalise(email) }));

export const resendUpgradeCode = (email: string) =>
  attempt(() => requireSupabase().auth.resend({ type: 'email_change', email: normalise(email) }));

export async function verifyUpgradeCode(email: string, token: string): Promise<Result> {
  const result = await attempt(() =>
    requireSupabase().auth.verifyOtp({ email: normalise(email), token, type: 'email_change' }),
  );
  // The user is no longer anonymous; first-run capture now applies.
  if (result.ok) await refreshAuth();
  return result;
}

export const signOut = () => attempt(() => requireSupabase().auth.signOut());
