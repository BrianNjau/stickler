# Work packages for the coding agent

Read `PROJECT_BRIEF.md` first, then open `prototype/focus-strip.html` in a browser and use it for
ten minutes. That prototype is the behavioural spec; this file is the build order.

**Ground rules**
- TypeScript strict. No `any` crossing a module boundary.
- Nothing writes to `xp_ledger`, `token_ledger`, `user_badges` or `reward_claims` except the RPCs.
- Never trust `setInterval` for elapsed time. Timers derive from `focus_sessions.round_ends_at`.
- Every screen must work offline for the current day.
- Each package ends with: tests passing, `supabase db reset` clean, and a 60-second demo video/gif.

---

## WP0 — Repo and environment (half a day)
Expo SDK 54+ app with Expo Router, `react-native-web` enabled, TypeScript strict.

```
/app                     expo-router routes
/src/features/{today,path,character,rewards,onboarding,settings}
/src/lib/{supabase,timer,outbox,notifications,mascot}
/src/ui                  design system: tokens, Text, Button, Card, Pill, Sheet
/shared/types.ts         (provided)
/supabase/migrations     (provided)
/supabase/functions      (provided)
```
- `supabase init`, link a free project, run the four migrations, `supabase gen types typescript`.
- EAS build profiles for dev/preview/prod; web build to Vercel or Netlify.
- Env: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Service role keys live only in
  Edge Function secrets — if a service key ever appears in app code, the build should fail.

**Done when:** a signed-in user sees an empty Today screen on iOS, Android and web from one codebase.

---

## WP1 — Auth, profile, settings (1 day)
- Email magic link + Sign in with Apple + Google. Anonymous "try it" session that can upgrade later.
- On first launch capture: timezone (auto-detect, confirm), daily capacity, workday window, rest days.
- Settings screen writes `user_settings` (including `snitch_intensity` and `humour_level`).

**Done when:** deleting the app and signing back in restores everything; `handle_new_user` seeds
default rewards.

---

## WP2 — Goal intake → plan generation (2–3 days)
Wizard: (1) "What do you want, in your own words?" free text, (2) why it matters, (3) horizon,
(4) hours available and constraints, (5) generating screen with mascot banter, (6) review screen.

- Calls `generate-plan`. Show a skeleton path while it runs (8–20 s is normal).
- Review screen is **editable**: rename stages, delete or retime milestones, edit quest estimates,
  add their own quest items. Nothing is final until they tap "Start this plan".
- Handle `rate_limited` and `generation_failed` politely, with a retry and a "build it myself" path.
- Empty-goal fallback: three starter templates (exam, business, fitness) that write the same tables.

**Done when:** three testers with unrelated goals each get a plan they say they could follow this week.

---

## WP3 — Today screen and the timer (3–4 days) — *the heart of the app*
Layout mirrors the prototype: player bar, feeds line, blocks with tasks, Now panel, side cards.
Mobile is single-column with the Now panel pinned as a bottom sheet that expands.

1. `fn_generate_day` on first open of a date; pull-to-refresh rerolls with `p_force`.
2. Task rows: tap to complete (`fn_complete_task`), long-press for priority, swipe to delete,
   split button for tasks ≥25 min (creates three child tasks via `parent_task_id`).
3. Timer: `fn_start_session` → store `round_ends_at`; render countdown from wall clock; schedule a
   local notification for round end and block end; on foreground, reconcile with the server.
4. Rounds: at round end, `fn_end_round`, break countdown, auto-resume with `fn_resume_round`.
5. Pre-flight sheet before a study block; skipping is allowed and logged.
6. Tunnel vision: hides everything except the current block, parking lot and exit.
7. Drift guard: `AppState` change → if away ≥5 s while running, ask on return; study trips via the
   launchpad suppress the question; ≥3 min trips ask for a receipt.
8. Attention checks on a random 18–30 min timer (respect `attention_checks_on`).
9. Snap-out flow: cause → tailored tip → two guided physiological sighs → tiny next step →
   5-minute sprint (`fn_log_interruption` kind `snap_out`).
10. Parking lot (`tangents`) with the 10-minute urge hold.

**Done when:** kill the app mid-round, reopen 20 minutes later, and the timer is correct; the same
session is visible on web within 2 seconds (Realtime on `focus_sessions`).

---

## WP4 — Progression: XP, levels, skills, trophies (1–2 days)
- Player bar with level hex, rank names and XP bar; count-up animation on gain.
- Character screen: skill radar from `v_skill_xp`, lifetime stats, trophy cabinet from `badges` +
  `user_badges`, streak from `fn_streak`.
- Rank names are data (`ranks.ts`), one set per domain: software, exams, business, fitness, generic.
- Level-up modal with rays, confetti, chime. Respect `prefers-reduced-motion` / Reduce Motion.

**Done when:** XP shown in the app always equals `sum(xp_ledger.amount)`; completing the same task
twice offline then syncing grants XP once.

---

## WP5 — Offline and sync (2 days)
- `expo-sqlite` mirror of today's day plan, blocks, tasks, session, tangents.
- Outbox table (`OutboxItem` in shared/types) with exponential backoff; RPC calls carry their own
  idempotency via the ledger, so replaying is safe.
- Conflict rule: server wins for plan structure, client wins for completion timestamps.
- Banner: "Offline — your work is saved and will sync." Never block the timer on network.

**Done when:** airplane mode for a full day, then reconnect: every tick, drift and receipt lands
exactly once.

---

## WP6 — Rewards (1 day)
- Token balance from `v_token_balance`; crate button; `fn_open_crate`.
- Crate animation: shake → lid flies → prize card flips in, with haptics (`expo-haptics`) and sound.
- Reward editor. Defaults are seeded; users add their own.
- Nimbus insists they actually take the reward, and the app asks next session whether they did.

**Done when:** a crate open is a 4-second sequence that testers voluntarily repeat.

---

## WP7 — Mascot engine (1–2 days)
- `pickLine(persona, event, { domain, humourLevel })`: filter by domain (specific first, then
  universal), exclude anything in `line_history` inside its cooldown, weight-random the rest, then
  record it. Template variables: `{skill}`, `{xp}`, `{count}`, `{name}`.
- Nimbus: idle, focus, happy, sad (rain), cool (sunglasses at combo ≥3), sleep (10 min idle).
  Tap for a joke and a squish animation.
- Snitch: asleep / watch / angry, pupil tracks touch or pointer, suspicion meter, REC bar with
  hazard stripes while a session runs, "INFRACTION LOGGED" stamp on a confessed drift.
- `snitch_intensity = 0` mutes the Snitch entirely for users who find it stressful. Ship this.
- Animations: Reanimated 3 + Skia for the characters; Lottie only if a designer supplies files.

**Done when:** 30 minutes of use produces no repeated line, and every line passes the PG rule.

---

## WP8 — Pace keeper, catch-up and end-of-day (1–2 days)
- Client polls `fn_pace` every 60 s while the app is open, and on foreground.
- `behind >= 3` → Snitch banner with the pace bar and a 20-minute recovery sprint that picks the
  highest-priority unfinished task.
- Local notifications: block start (2 min before), round end, "behind pace" (max 2/day),
  end-of-day sweep at 20:00 local if anything is unfinished.
- Sweep sheet: top three unfinished tasks, a 15-minute sprint, or "call it a day" without guilt.
- Server-side backup nudge (P3): pg_cron hourly → Edge Function → Expo Push for users who have not
  opened the app and are behind. Only build this after retention data says it is needed.

**Done when:** a deliberately abandoned day produces exactly one catch-up nudge and one sweep, never
a stream of them.

---

## WP9 — Commute and feasibility (2–3 days)
- Places screen: save Home / Office / Gym via Google Places autocomplete (`expo-location` for
  current position).
- Attach legs to a day: "I need to be at X by 09:00" → creates a `commute_legs` row and a `commute`
  block so travel time stops being invisible.
- `commute-check` on day open (once) and on demand; render the verdict:
  - **fits** — green, one line, no drama.
  - **tight** — amber: "Doable with zero slack. One interruption and it falls over."
  - **not_possible** — red: show `fn_suggest_cuts` and a single "Cut these and I'll reschedule them
    for tomorrow" button. The app must never leave a user staring at an impossible day.
- Learned `pace_factor` and `ramp_up_minutes` shown honestly: "You usually need 1.4× your estimates
  and about 9 minutes to actually start. I've planned for that."

**Done when:** a plan with a 45-minute commute and 3 hours of tasks in a 3-hour window is reported
as not possible, with cuts that make it fit.

---

## WP10 — Path screen and weekly review (1–2 days)
- Path screen: tracks, stages, "You are here", milestone timeline, progress per track.
- Manual stage completion for the human ones; automatic via `fn_autocomplete_stages`.
- Weekly review (Sunday): hours logged, tasks done vs planned, skills neglected, milestones moved,
  and one adjustment offer ("your estimates were 40% optimistic — shall I rescale next week?").

**Done when:** a user who finishes a keystone milestone sees the stage tick itself and gets a
level-up-grade celebration.

---

## Testing and quality gates
- **Unit:** level curve, rotation scoring, pace and feasibility maths, line picker cooldowns.
- **Database:** pgTAP or SQL fixtures for every RPC, including double-call idempotency and RLS
  (user A must never read user B — write the failing test first).
- **E2E:** Maestro flows — onboard → plan → start block → complete round → drift → receipt → crate.
- **Manual device matrix:** iOS + Android, low-end Android especially; background/kill/restore.
- **Accessibility:** dynamic type, VoiceOver labels on every control, contrast ≥4.5:1, honour Reduce
  Motion (the whole app must be usable with animations off).

## Analytics events to emit from day one
`signup`, `goal_created`, `plan_generated`, `plan_edited`, `day_generated`, `block_started`,
`round_completed`, `block_completed`, `drift_logged`, `receipt_logged`, `snap_out_used`,
`crate_opened`, `catchup_shown`, `catchup_accepted`, `sweep_shown`, `feasibility_verdict`,
`plan_regenerated`, `day_completed`, `streak_broken`.

The three numbers that decide whether this app works: **D7 retention**, **blocks started per active
day**, and **share of started blocks that finish clean**. Everything else is decoration.
