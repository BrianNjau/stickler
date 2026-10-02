# Focus Strip — agent context

You are building Focus Strip: a cross-platform productivity app (Expo + React Native Web) on
Supabase. A user describes a goal in plain language; the app turns it into a path, a rotating quest
library and daily timed blocks, and then keeps them honest with two mascots — **Nimbus** (warm,
absurd cloud) and **The Snitch** (deadpan surveillance camera).

## Read before writing code
1. `docs/PROJECT_BRIEF.md` — product, stack, the three algorithms, risks.
2. `docs/AGENT_TASKS.md` — work packages WP0–WP10 with acceptance criteria. Build in order.
3. `prototype/focus-strip.html` — open it in a browser and use it. It is the behavioural spec for
   every mechanic: tunnel vision, drift guard, study trips, brain receipts, snap-out protocol,
   rounds, XP, trophies, reward crate, pace keeper.
4. `supabase/migrations/*.sql` and `shared/types.ts` — the contract. Do not redesign either without
   raising it first.

## Non-negotiables
- **TypeScript strict.** No `any` across a module boundary.
- **The client never writes XP, tokens or badges.** Only the `SECURITY DEFINER` RPCs in
  `03_functions.sql` do. If a feature seems to need a direct write, you have misread the design.
- **Timers derive from `focus_sessions.round_ends_at`**, never from a JS interval. The app must
  survive being backgrounded, locked and killed.
- **Offline-first for the current day.** Queue writes in the outbox; the ledger's idempotency keys
  make replay safe.
- **Secrets stay server-side.** `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY` and
  `GOOGLE_MAPS_API_KEY` exist only in Edge Function secrets. Never in app code, never in git.
- **One work package per branch and PR**: `wp/3-today-timer`. Include the acceptance evidence.
- **Ask before**: changing the schema, adding a dependency over ~100 kB, introducing a new state
  library, or calling any paid API from a new place.

## Voice and content rules for mascot copy
- PG. No profanity. Absurd and deadpan, in the register of a family cartoon.
- The Snitch mocks the **paperwork and the behaviour**, never the person's intelligence, body,
  worth or identity. No jokes about failure as a character flaw.
- Nimbus is warm, never saccharine, and makes puns it is proud of.
- Lines are **data** (`character_lines`), never hard-coded strings in components.
- Every user can set `snitch_intensity = 0` and never hear from the Snitch again. Respect it
  everywhere, including notifications.

## Working without API keys (current state)
`EXPO_PUBLIC_AI_MODE=mock` and `EXPO_PUBLIC_MAPS_MODE=mock` are the defaults until keys exist.

- **Plan creation** must work through `fn_apply_template(goal_id, template_key)` using the three
  templates in `05_templates.sql`. The intake wizard shows the template picker instead of the
  generating screen. Build the AI path behind the same interface (`createPlan(goal, mode)`) so that
  switching modes changes nothing downstream.
- **Commute** in mock mode returns fixed durations from a local fixture (e.g. 25 min driving,
  45 min transit) and still runs `fn_feasibility`. The whole feasibility UI is therefore testable
  with no Google account.
- Never let a missing key crash a screen. If a mode is `live` and the key is absent, log it, fall
  back to mock, and show a small notice in Settings — not an error dialog.

## Design principles
- The Today screen is the app. Everything else is a tab away and must never trap the user: the nav
  is always visible, every sheet closes, nothing requires a refresh.
- Motion is the reward. Respect Reduce Motion: the app must be fully usable with animations off.
- Never show an impossible day without offering the cut. Honesty about time is the product.
- Copy is short, specific and funny. Never scold, never shame, never guilt-trip about streaks.

## Definition of done for any package
Tests pass, `supabase db reset` runs clean, types regenerate, the feature works offline where the
brief says it must, VoiceOver can operate every new control, and there is a short screen recording
in the PR.

## Expo specifics
See @AGENTS.md for SDK-specific Expo rules (versioned docs, `npx expo install`, routing).
