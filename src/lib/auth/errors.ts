import type { AuthError } from '@supabase/supabase-js';

export type AuthProblem =
  | { kind: 'badCode'; message: string }
  | { kind: 'tooSoon'; message: string; retryInSeconds: number }
  | { kind: 'emailTaken'; message: string }
  | { kind: 'badEmail'; message: string }
  | { kind: 'trialOff'; message: string }
  | { kind: 'offline'; message: string }
  | { kind: 'other'; message: string };

const SECONDS = /after (\d+) seconds?/i;

/** Supabase errors → one short, specific sentence. Never blames the person. */
export function describeAuthError(error: AuthError | Error | null | undefined): AuthProblem {
  const code = error && 'code' in error ? String(error.code ?? '') : '';
  const status = error && 'status' in error ? Number(error.status) : 0;
  const msg = error?.message ?? '';

  if (code === 'otp_expired' || code === 'invalid_otp' || (/token has expired|invalid/i.test(msg) && /otp|token/i.test(msg))) {
    return { kind: 'badCode', message: 'That code didn’t match. Codes expire, and only the newest one works.' };
  }
  if (code === 'over_email_send_rate_limit' || status === 429) {
    const s = Number(SECONDS.exec(msg)?.[1] ?? 60);
    return { kind: 'tooSoon', message: `Give it ${s} more seconds before asking for another code.`, retryInSeconds: s };
  }
  if (code === 'email_exists' || code === 'user_already_exists' || /already (been )?registered/i.test(msg)) {
    return {
      kind: 'emailTaken',
      message: 'That email already has a Stickler account. Use a different email to keep this trial.',
    };
  }
  if (code === 'email_address_invalid' || code === 'validation_failed' || /invalid.*email|email.*invalid/i.test(msg)) {
    return { kind: 'badEmail', message: 'That doesn’t look like an email address.' };
  }
  if (code === 'anonymous_provider_disabled') {
    return { kind: 'trialOff', message: 'Trying without an account isn’t switched on yet. Sign in with your email instead.' };
  }
  if (/network|fetch/i.test(msg)) {
    return { kind: 'offline', message: 'No connection. Your code will still work once you’re back online.' };
  }
  return { kind: 'other', message: 'Something went wrong on our side. Try again in a moment.' };
}

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
