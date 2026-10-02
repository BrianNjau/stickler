# Stickler — Product & Architecture Brief

**Status:** v1 spec for build kick-off · **Owner:** Brian Njau · **Date:** 29 Sep 2026

---

## 1. What this is

A productivity app for people who know what they want but lose the day anyway. The user describes a
goal in plain language ("get a high-paying job", "pass my CPA", "launch my bakery", "finish my
thesis"). The app turns that into a **path** (long-term stages), a **quest library** (a rotating pool
of concrete study/work items) and a **daily plan** (timed blocks broken into rounds). Two mascots — a
friendly cloud called **Nimbus** and a strict surveillance camera called **The Snitch** — keep the
user honest, comment on their progress, and make the whole thing funny enough to come back to.

The current single-file HTML prototype (`prototype/focus-strip.html`) is the behavioural spec for
mechanics. **Read it before writing code.** Everything in it — tunnel vision, drift guard, study
trips, brain receipts, snap-out protocol, rounds, XP/levels/skills, trophies, reward crate, pace
keeper — carries over, generalised beyond software engineering.

### What is new in the app version
1. **Goal intake → AI-generated plan.** User describes goals and constraints; an LLM produces the
   tracks, stages, quest library and a first week of blocks.
2. **Multi-user, cross-device.** Supabase auth + Postgres; the same account on phone and web.
3. **Real-time schedule awareness.** The app knows the clock, what is unchecked, and how long things
   take, and intervenes before the day is lost.
4. **Commute & feasibility assistant.** Travel time (Google Directions) plus the user's own
   "ramp-up" habits, used to answer: *is this plan physically possible today?*
5. **Domain-neutral comedy.** Mascot lines are data, not hard-coded jokes, with variants per goal
   domain. Rated PG: absurd and deadpan, never crude, never mean about the user's identity.

### Explicit non-goals for v1
- No social feed, no leaderboards, no teams (a "rival" mode can come later).
- No calendar write-back (read-only import can come in v1.1).
- No web-extension site blocking. The app is an accountability layer, not a firewall.
- No payments in v1. Design the schema so a `subscriptions` table can be added without migration pain.

---

## 2. Users and jobs to be done

| Persona | Goal example | What they need most |
|---|---|---|
| The credential climber (Brian) | Certifications → high-comp job | Long path, rotation, honest drift tracking |
| The exam sitter | CPA / CFA / med school finals | Spaced repetition, practice-question rounds |
| The side-hustler | Launch a shop, get first customers | Milestones tied to money, not study hours |
| The perpetually-late | Just show up on time, finish anything | Commute realism, catch-up nudges, small wins |

One design rule that keeps all four happy: **the app never invents a plan the user cannot execute in
the hours they actually have.** Feasibility beats ambition.

---

## 3. Stack decisions (and why)

| Layer | Choice | Reason |
|---|---|---|
| App | **Expo (React Native) + Expo Router** | One codebase for iOS, Android and web (react-native-web). Expo handles notifications, background tasks, OTA updates. |
| Language | TypeScript, strict | Shared types with the backend. |
| State | **TanStack Query** (server cache) + **Zustand** (timer/UI state) | Query handles sync/retry; Zustand holds the running timer without re-render storms. |
| Local store | **expo-sqlite** + an outbox table | Offline-first. A focus timer that dies without signal is worthless. |
| Backend | **Supabase**: Postgres + Auth + RLS + Edge Functions + Realtime + Storage | Free tier is enough for launch; RLS means the client can talk to the DB directly for most reads. |
| AI | Anthropic API called **only from Edge Functions** | Keys never ship in the app. Cost caps and caching live server-side. |
| Maps | Google Directions API via an Edge Function | Same reason: key stays server-side, responses are cached. |
| Notifications | Expo local notifications (round ends, block starts) + Expo Push via Edge Function for server-side nudges | Local covers 90% and costs nothing. |
| Analytics | PostHog (free tier) or a plain `events` table | Start with the `events` table; it is already in the schema. |

### Architecture in one paragraph
The app writes to Supabase directly for ordinary CRUD (tasks, checks, settings) under RLS. Anything
that grants XP, tokens or badges goes through **Postgres RPC functions** so the rules live in one
place and are idempotent. Anything that costs money (LLM, Maps) goes through **Edge Functions** with
per-user rate limits and a cache table. Realtime is used for a single thing in v1: keeping the
current day's plan in sync across the user's own devices.

---

## 4. Core domain model (plain English)

- **Goal** — what the user wants, in their words, plus a domain tag and a horizon.
- **Plan** — the generated structure for a goal: **tracks** → **stages** → **milestones**.
- **Quest library item** — a reusable unit of work ("25 practice questions on X", "cold-call 5
  leads"), with an estimated duration, a skill tag and a kind (learn / practice / lab / review /
  admin / outreach).
- **Day plan** — a date, a timezone, and its **blocks**.
- **Block** — a timed container (start/end local time), split into **rounds** (default 25 min work +
  3 min reset), holding **tasks**.
- **Task** — an instance of a library item or a user-written item, with priority (side / main /
  boss), estimate, and completion state.
- **Focus session** — a real run of a block: rounds, interruptions, trips, receipts.
- **XP ledger** — append-only, idempotent; every other number (level, skill levels, streaks,
  trophies, tokens) is derived from it.

The ledger-first design is deliberate: it is the same reason the prototype survived four rewrites
without losing anyone's progress, and it makes analytics and anti-cheat trivial later.

---

## 5. Feature list for v1 (build order)

**P0 — the spine**
1. Auth (email magic link + Apple/Google sign-in), profile, timezone capture.
2. Goal intake wizard → AI plan generation → review/edit screen.
3. Today screen: blocks, tasks, rounds, timer, tunnel vision, drift guard, parking lot.
4. XP ledger, levels, skills, trophies, streaks.
5. Offline queue + cross-device sync.

**P1 — the hooks**
6. Reward vault: tokens, crate animation, user-defined rewards.
7. Mascot engine: lines by event × domain × mood, with cooldowns so they don't repeat.
8. Pace keeper and end-of-day sweep (server-computed, client-rendered).
9. Snap-out protocol, attention checks, study trips + brain receipts.

**P2 — the differentiator**
10. Commute & feasibility assistant (Directions API, ramp-up learning, "this plan is a lie" warnings).
11. Weekly review: what got done, what got dodged, plan adjustment.
12. Plan re-generation and rotation tuning from real completion data.

**P3 — later**
Push notifications from the server, calendar import, subscriptions, rival mode, widgets.

---

## 6. The three algorithms that matter

### 6.1 Quest rotation (no LLM call needed per day)
Score every library item, pick greedily to fill each block's minute budget:

```
score = 10 * days_since_last_done          // never done = 20 days
      + 35 if item.skill == most_neglected_skill_in_play
      + 15 if item is due for spaced review (last_done between 7 and 21 days ago)
      - 25 if item was completed in the last 2 days
      + random(0..8)                        // stops the plan feeling robotic
```
"In play" skills = the skills attached to the next two unfinished milestones, plus the plan's
always-on skill if it has one. This is cheap, deterministic enough to test, and explains itself to
the user ("you haven't touched Terraform in 9 days").

### 6.2 Feasibility check (the part users will talk about)
Given today's blocks, the user's location events and their learned ramp-up time:

```
available = Σ (block_end - block_start) - Σ travel_time - Σ ramp_up_per_block
required  = Σ task.estimate_minutes * user.pace_factor
verdict   = required <= available * 0.85 ? "fits" 
          : required <= available        ? "tight"
          : "not possible"
```
- `pace_factor` starts at 1.0 and is learned: actual minutes ÷ estimated minutes, rolling median over
  the last 30 completed tasks. Most people sit between 1.2 and 1.6, which is precisely why their
  plans fail.
- `ramp_up_per_block` is learned the same way: median gap between a block's scheduled start and its
  first real check-in.
- When the verdict is "not possible", the app does not nag — it offers to cut. It proposes exactly
  which tasks to drop or move, ranked by lowest priority and lowest milestone impact.

### 6.3 Pace keeper (runs client-side every 30s, server-verified on load)
```
expected_done = Σ over blocks of tasks * elapsed_fraction(block)
behind        = expected_done - actual_done
```
`behind >= 3` triggers the Snitch banner and a 20-minute recovery sprint offer. Between 20:00 and
23:00 local, if anything is unfinished, Nimbus runs the closing sweep with a 15-minute "one last win".

---

## 7. Mascots as data, not code

Two characters, one job each:

- **Nimbus** (cloud, warm, absurd) — praise, jokes, recovery coaching, rewards. Think of a friend who
  genuinely wants you to win and cannot stop making puns.
- **The Snitch** (surveillance camera, deadpan, bureaucratic) — observation, infractions, suspicion
  meter, roasts about neglected skills. Never cruel about the person; endlessly petty about the
  *paperwork*. Its comedy is that it takes a to-do list as seriously as a federal investigation.

Comedy direction: cartoon-absurd, deadpan-bureaucratic, self-aware. **No profanity, no insults about
body/identity/intelligence, no dark jokes about failure.** The Snitch mocks the *behaviour* ("Zero
XP this week. Your notes have filed a missing-persons report"), never the person.

Lines live in the `character_lines` table with `persona`, `event`, `domain` (null = universal),
`weight` and `cooldown_minutes`. Domain-specific packs (`software`, `exams`, `business`, `fitness`,
`creative`, `admin`) are seeded; the LLM can propose new lines during plan generation, which land in
the same table flagged `source = 'ai'` and `approved = false` until reviewed.

---

## 8. Constraints, costs and risks

| Risk | Mitigation |
|---|---|
| Google Directions costs money per call | Cache by (origin cell, destination cell, 15-min time bucket, mode) for 24h; one call per block per day maximum; hard per-user daily cap in the Edge Function. |
| LLM cost per user | Plan generation is rare (on goal create / weekly review). Cache aggressively; cap at N generations per user per week; rotation is algorithmic, not generative. |
| Supabase free tier limits (~500 MB DB, project pauses after inactivity) | Events table gets a 90-day retention job; keep binary assets out of Postgres. |
| Background timers on mobile are unreliable | Never trust JS timers. Persist `started_at` / `ends_at` and recompute from wall clock; schedule local notifications for round ends. |
| Users lying to the drift guard | It is self-report by design. The recall receipt is the real check: it is easier to study than to fake a sentence about what you learned. |
| Scope creep (this is a big app) | P0 is shippable alone. Do not start P2 until P0 is in TestFlight. |

---

## 9. Definition of done for v1

- A new user can sign up, describe a goal in one paragraph, and be looking at a realistic plan for
  tomorrow in under three minutes.
- The timer survives: app backgrounded, phone locked, app killed, device offline.
- Closing the app mid-block and reopening on the web shows the same running session.
- Nothing grants XP except the RPC layer, and the same action twice never double-grants.
- A user with no internet for a full day loses nothing when they reconnect.
