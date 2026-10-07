// Sign-in, code entry and account-upgrade copy. Short, specific, never blaming the person.

export const authCopy = {
  signIn: {
    title: 'Tell us the goal. We’ll handle the Tuesday.',
    body: 'Your plan, broken into blocks you can actually finish — with two characters who refuse to let the day drift.',
    nimbus: { name: 'Nimbus', about: 'Cheers you on. Makes puns. Sorry in advance.' },
    snitch: { name: 'The Snitch', about: 'Logs every drift. Takes your to-do list far too seriously.' },
    emailLabel: 'Email',
    emailPlaceholder: 'you@example.com',
    send: 'Send me a code',
    sending: 'Sending…',
    or: 'or',
    apple: 'Continue with Apple',
    google: 'Continue with Google',
    trial: 'Try a day without an account',
    badEmail: 'That doesn’t look like an email address.',
  },
  code: {
    eyebrow: 'Check your email',
    title: 'Enter the six-digit code',
    sentTo: 'We sent it to',
    newest: 'Only the newest code works.',
    verify: 'Continue',
    checking: 'Checking…',
    resendIn: 'You can ask for a new code in',
    resend: 'Send a new code',
    resent: 'New code sent. The old one has stopped working.',
    changeEmail: 'Use a different email',
  },
  upgrade: {
    eyebrow: 'Keep what you’ve made',
    title: 'Add an email to this trial',
    body: 'Same account, same plan, same streak — it just gets a way back in. We’ll send a six-digit code to confirm.',
    send: 'Send me a code',
  },
} as const;
