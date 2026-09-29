-- Focus Strip — core schema
-- Postgres 15 / Supabase. Run in order: 01_schema, 02_rls, 03_functions, 04_seed.
-- Conventions:
--   * every user-owned table has user_id uuid not null references auth.users on delete cascade
--   * timestamps are timestamptz, always UTC; anything the user sees as a time-of-day is stored
--     as a `time` or a local date plus the user's timezone (profiles.timezone)
--   * no cascading business logic in triggers except updated_at; rules live in RPC functions

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────────
-- enums
-- ─────────────────────────────────────────────────────────────────────────────
create type goal_domain   as enum ('software','exams','business','fitness','creative','academic','career','admin','other');
create type goal_horizon  as enum ('weeks','months','year','multi_year');
create type quest_kind    as enum ('learn','practice','lab','review','build','outreach','admin','rest');
create type task_priority as enum ('side','main','boss');
create type block_kind    as enum ('study','lab','review','admin','break','commute','buffer');
create type session_state as enum ('running','paused','break','completed','abandoned');
create type interruption_kind as enum ('drift','study_trip','attention_check','snap_out','pause');
create type xp_reason     as enum ('task','block','round','clean_block','day','milestone','stage','receipt','park','comeback','urge_surfed','attention_check','preflight','badge','streak','adjustment');
create type persona       as enum ('nimbus','snitch','system');

-- ─────────────────────────────────────────────────────────────────────────────
-- identity & settings
-- ─────────────────────────────────────────────────────────────────────────────
create table profiles (
  id              uuid primary key references auth.users on delete cascade,
  display_name    text,
  avatar_url      text,
  timezone        text not null default 'UTC',            -- IANA, e.g. 'Africa/Nairobi'
  locale          text not null default 'en',
  onboarded_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table user_settings (
  user_id                 uuid primary key references auth.users on delete cascade,
  workday_start           time not null default '08:00',
  workday_end             time not null default '18:00',
  daily_capacity_minutes  int  not null default 120 check (daily_capacity_minutes between 15 and 960),
  round_minutes           int  not null default 25 check (round_minutes between 10 and 60),
  break_minutes           int  not null default 3  check (break_minutes between 1 and 30),
  rest_days               int[] not null default '{0}',   -- 0=Sunday … 6=Saturday
  snitch_intensity        int  not null default 2 check (snitch_intensity between 0 and 3), -- 0 = off, 3 = relentless
  humour_level            int  not null default 2 check (humour_level between 0 and 3),
  attention_checks_on     boolean not null default true,
  notifications_on        boolean not null default true,
  commute_assist_on       boolean not null default false,
  pace_factor             numeric(4,2) not null default 1.00 check (pace_factor between 0.5 and 3.0),
  ramp_up_minutes         int not null default 5 check (ramp_up_minutes between 0 and 60),
  updated_at              timestamptz not null default now()
);

create table push_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  token       text not null,
  platform    text not null check (platform in ('ios','android','web')),
  created_at  timestamptz not null default now(),
  unique (user_id, token)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- goals, plans, paths
-- ─────────────────────────────────────────────────────────────────────────────
create table goals (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users on delete cascade,
  raw_input       text not null,                          -- exactly what the user typed
  title           text not null,
  domain          goal_domain not null default 'other',
  horizon         goal_horizon not null default 'months',
  why             text,                                   -- the user's stated motivation, used by mascots
  constraints     jsonb not null default '{}'::jsonb,     -- {hours_per_week, deadline, budget, equipment...}
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on goals (user_id, is_active);

-- a plan is one generated structure for a goal; regenerating creates a new version
create table plans (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users on delete cascade,
  goal_id         uuid not null references goals on delete cascade,
  version         int not null default 1,
  summary         text,                                   -- one paragraph, shown on the Path screen
  north_star      text,                                   -- the "point of all this" line
  skills          jsonb not null default '[]'::jsonb,     -- [{key,label,color,description}]
  generated_by    text not null default 'ai',             -- 'ai' | 'template' | 'user'
  model           text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  unique (goal_id, version)
);
create index on plans (user_id, is_active);

create table tracks (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references plans on delete cascade,
  user_id     uuid not null references auth.users on delete cascade,
  key         text not null,                              -- 'job' | 'independence' | free text
  title       text not null,
  goal_line   text,
  color       text,
  position    int not null default 0,
  unique (plan_id, key)
);

create table stages (
  id            uuid primary key default gen_random_uuid(),
  track_id      uuid not null references tracks on delete cascade,
  user_id       uuid not null references auth.users on delete cascade,
  title         text not null,
  description   text,
  position      int not null default 0,
  -- auto-completion rules, all optional:
  requires_milestones uuid[] default '{}',                -- milestone ids that must be done
  requires_skill  text,                                   -- skill key
  requires_skill_xp int,
  completed_at  timestamptz,
  created_at    timestamptz not null default now()
);
create index on stages (user_id, track_id, position);

-- dated checkpoints (certs, launches, exams). Shown as the Roadmap.
create table milestones (
  id            uuid primary key default gen_random_uuid(),
  plan_id       uuid not null references plans on delete cascade,
  user_id       uuid not null references auth.users on delete cascade,
  title         text not null,
  detail        text,
  skill         text,
  target_label  text,                                     -- 'Mid-Oct 2026' — human, fuzzy on purpose
  target_date   date,                                     -- optional hard date
  xp_value      int not null default 300,
  token_value   int not null default 3,
  is_keystone   boolean not null default false,           -- certifications, launches: the big ones
  completed_at  timestamptz,
  position      int not null default 0,
  created_at    timestamptz not null default now()
);
create index on milestones (user_id, plan_id, position);

-- ─────────────────────────────────────────────────────────────────────────────
-- quest library (the rotation pool)
-- ─────────────────────────────────────────────────────────────────────────────
create table quest_items (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users on delete cascade,
  plan_id           uuid references plans on delete cascade,
  title             text not null,
  detail            text,
  skill             text,                                 -- matches plans.skills[].key
  kind              quest_kind not null default 'learn',
  estimate_minutes  int not null default 20 check (estimate_minutes between 5 and 240),
  default_priority  task_priority not null default 'side',
  repeatable        boolean not null default true,
  review_after_days int not null default 7,               -- resurfaces as a recall check after this
  retired_at        timestamptz,
  source            text not null default 'ai',           -- 'ai' | 'user' | 'template'
  created_at        timestamptz not null default now()
);
create index on quest_items (user_id, plan_id) where retired_at is null;
create index on quest_items (user_id, skill);

-- rotation memory: one row per item, updated on completion
create table quest_coverage (
  user_id       uuid not null references auth.users on delete cascade,
  quest_item_id uuid not null references quest_items on delete cascade,
  last_done_on  date,
  times_done    int not null default 0,
  avg_actual_minutes numeric(6,2),
  primary key (user_id, quest_item_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- days, blocks, tasks
-- ─────────────────────────────────────────────────────────────────────────────
create table day_plans (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users on delete cascade,
  plan_id       uuid references plans on delete set null,
  local_date    date not null,
  timezone      text not null,
  generated_at  timestamptz not null default now(),
  generator     text not null default 'rotation',         -- 'rotation' | 'ai' | 'user'
  feasibility   jsonb,                                    -- last computed verdict, see 03_functions
  closed_at     timestamptz,                              -- set by the end-of-day sweep
  unique (user_id, local_date)
);

create table blocks (
  id            uuid primary key default gen_random_uuid(),
  day_plan_id   uuid not null references day_plans on delete cascade,
  user_id       uuid not null references auth.users on delete cascade,
  title         text not null,
  intent        text,                                     -- the pre-flight "mission"
  kind          block_kind not null default 'study',
  skill         text,
  start_local   time not null,
  end_local     time not null,
  position      int not null default 0,
  rounds_planned int not null default 1,
  completed_at  timestamptz,
  skipped_at    timestamptz,
  created_at    timestamptz not null default now(),
  check (end_local > start_local)
);
create index on blocks (user_id, day_plan_id, position);

create table tasks (
  id              uuid primary key default gen_random_uuid(),
  block_id        uuid not null references blocks on delete cascade,
  user_id         uuid not null references auth.users on delete cascade,
  quest_item_id   uuid references quest_items on delete set null,
  title           text not null,
  priority        task_priority not null default 'side',
  estimate_minutes int,
  skill           text,
  is_review       boolean not null default false,         -- "Recall check: …"
  is_rescue       boolean not null default false,         -- neglected-skill quest, 1.5x XP
  parent_task_id  uuid references tasks on delete cascade,-- set when a task is split
  position        int not null default 0,
  completed_at    timestamptz,
  actual_minutes  int,
  created_at      timestamptz not null default now()
);
create index on tasks (user_id, block_id, position);
create index on tasks (user_id, completed_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- focus sessions (the truth about what actually happened)
-- ─────────────────────────────────────────────────────────────────────────────
create table focus_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users on delete cascade,
  block_id          uuid not null references blocks on delete cascade,
  state             session_state not null default 'running',
  round_index       int not null default 1,
  rounds_planned    int not null default 1,
  round_minutes     int not null default 25,
  started_at        timestamptz not null default now(),
  round_ends_at     timestamptz,                          -- wall-clock truth; client never owns this
  paused_at         timestamptz,
  paused_ms         bigint not null default 0,
  ended_at          timestamptz,
  focus_ms          bigint not null default 0,
  drift_count       int not null default 0,
  trip_ms           bigint not null default 0,
  away_ms           bigint not null default 0,
  suspicion         int not null default 0 check (suspicion between 0 and 100),
  preflight_passed  boolean not null default false,
  created_at        timestamptz not null default now()
);
create index on focus_sessions (user_id, block_id);
create index on focus_sessions (user_id, state) where state in ('running','paused','break');

create table interruptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users on delete cascade,
  session_id    uuid not null references focus_sessions on delete cascade,
  kind          interruption_kind not null,
  away_ms       bigint,
  source        text,                                     -- study-trip destination, or cause of drift
  self_reported boolean not null default true,
  note          text,
  created_at    timestamptz not null default now()
);
create index on interruptions (user_id, created_at desc);

-- "brain receipts": what the user learned on a study trip
create table receipts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users on delete cascade,
  session_id    uuid references focus_sessions on delete set null,
  skill         text,
  body          text not null,
  source        text,
  created_at    timestamptz not null default now()
);
create index on receipts (user_id, created_at desc);

-- the tangent garage
create table tangents (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users on delete cascade,
  body          text not null,
  parked_at     timestamptz not null default now(),
  resolved_at   timestamptz,
  promoted_task_id uuid references tasks on delete set null
);
create index on tangents (user_id, resolved_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- progression: xp ledger is append-only and idempotent; everything derives from it
-- ─────────────────────────────────────────────────────────────────────────────
create table xp_ledger (
  id              bigserial primary key,
  user_id         uuid not null references auth.users on delete cascade,
  amount          int not null,
  reason          xp_reason not null,
  skill           text,
  local_date      date not null,
  idempotency_key text not null,                          -- e.g. 'task:<uuid>' — one grant per key
  meta            jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
create index on xp_ledger (user_id, local_date);
create index on xp_ledger (user_id, skill);

create table token_ledger (
  id              bigserial primary key,
  user_id         uuid not null references auth.users on delete cascade,
  amount          int not null,                           -- +earned / -spent
  reason          text not null,
  idempotency_key text not null,
  created_at      timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table badges (                                      -- catalogue, global, no RLS write
  key           text primary key,
  title         text not null,
  description   text not null,
  rule          jsonb not null,                           -- evaluated by fn_check_badges
  xp_bonus      int not null default 100,
  position      int not null default 0
);

create table user_badges (
  user_id     uuid not null references auth.users on delete cascade,
  badge_key   text not null references badges on delete cascade,
  earned_on   date not null default current_date,
  primary key (user_id, badge_key)
);

create table rewards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  label       text not null,
  weight      int not null default 1 check (weight between 1 and 10),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table reward_claims (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  reward_id   uuid references rewards on delete set null,
  label       text not null,                              -- snapshot, survives reward deletion
  tokens_spent int not null default 1,
  claimed_at  timestamptz not null default now()
);
create index on reward_claims (user_id, claimed_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- characters
-- ─────────────────────────────────────────────────────────────────────────────
create table character_lines (
  id            uuid primary key default gen_random_uuid(),
  persona       persona not null,
  event         text not null,                            -- 'block_start','drift','clean_block','roast','praise','joke','idle',…
  domain        goal_domain,                              -- null = universal
  body          text not null,
  weight        int not null default 1,
  cooldown_minutes int not null default 240,
  humour_level  int not null default 2,                   -- shown only if user's humour_level >= this
  source        text not null default 'seed',             -- 'seed' | 'ai' | 'user'
  approved      boolean not null default true,
  user_id       uuid references auth.users on delete cascade,  -- null = global library
  created_at    timestamptz not null default now()
);
create index on character_lines (persona, event, domain) where approved;

create table line_history (
  user_id     uuid not null references auth.users on delete cascade,
  line_id     uuid not null references character_lines on delete cascade,
  shown_at    timestamptz not null default now(),
  primary key (user_id, line_id, shown_at)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- commute & feasibility
-- ─────────────────────────────────────────────────────────────────────────────
create table places (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  label       text not null,                              -- 'Home', 'Office', 'Gym'
  lat         numeric(9,6) not null,
  lng         numeric(9,6) not null,
  address     text,
  is_default_origin boolean not null default false,
  created_at  timestamptz not null default now()
);

-- shared cache so two users on the same route pay for one API call
create table travel_cache (
  id            bigserial primary key,
  origin_cell   text not null,                            -- geohash-ish, 3 decimal places
  dest_cell     text not null,
  mode          text not null check (mode in ('driving','transit','walking','bicycling')),
  depart_bucket timestamptz not null,                     -- rounded to 15 minutes
  duration_s    int not null,
  duration_traffic_s int,
  fetched_at    timestamptz not null default now(),
  unique (origin_cell, dest_cell, mode, depart_bucket)
);
create index on travel_cache (fetched_at);

create table commute_legs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users on delete cascade,
  day_plan_id   uuid not null references day_plans on delete cascade,
  from_place_id uuid references places on delete set null,
  to_place_id   uuid references places on delete set null,
  depart_local  time not null,
  mode          text not null default 'driving',
  duration_s    int,
  created_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ops: ai audit, events, outbox
-- ─────────────────────────────────────────────────────────────────────────────
create table ai_generations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users on delete cascade,
  kind          text not null,                            -- 'plan' | 'replan' | 'lines' | 'weekly_review'
  goal_id       uuid references goals on delete set null,
  model         text,
  prompt_version text,
  input_tokens  int,
  output_tokens int,
  cost_usd      numeric(8,4),
  status        text not null default 'ok',
  error         text,
  created_at    timestamptz not null default now()
);
create index on ai_generations (user_id, created_at desc);

create table events (
  id          bigserial primary key,
  user_id     uuid references auth.users on delete cascade,
  name        text not null,
  props       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index on events (user_id, created_at desc);
create index on events (name, created_at desc);

-- generic updated_at trigger
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger t_profiles_updated  before update on profiles      for each row execute function set_updated_at();
create trigger t_settings_updated  before update on user_settings for each row execute function set_updated_at();
create trigger t_goals_updated     before update on goals         for each row execute function set_updated_at();
