-- Focus Strip — row level security
-- Rule: users touch only their own rows. Catalogue tables are read-only to clients.
-- XP, tokens and badges are NOT writable by the client at all; only SECURITY DEFINER
-- functions in 03_functions.sql may insert into them.

-- ── helper: standard owner policy ───────────────────────────────────────────
-- (written out per table rather than generated, so the agent can read and audit it)

alter table profiles        enable row level security;
alter table user_settings   enable row level security;
alter table push_tokens     enable row level security;
alter table goals           enable row level security;
alter table plans           enable row level security;
alter table tracks          enable row level security;
alter table stages          enable row level security;
alter table milestones      enable row level security;
alter table quest_items     enable row level security;
alter table quest_coverage  enable row level security;
alter table day_plans       enable row level security;
alter table blocks          enable row level security;
alter table tasks           enable row level security;
alter table focus_sessions  enable row level security;
alter table interruptions   enable row level security;
alter table receipts        enable row level security;
alter table tangents        enable row level security;
alter table xp_ledger       enable row level security;
alter table token_ledger    enable row level security;
alter table badges          enable row level security;
alter table user_badges     enable row level security;
alter table rewards         enable row level security;
alter table reward_claims   enable row level security;
alter table character_lines enable row level security;
alter table line_history    enable row level security;
alter table places          enable row level security;
alter table travel_cache    enable row level security;
alter table commute_legs    enable row level security;
alter table ai_generations  enable row level security;
alter table events          enable row level security;

-- ── profiles & settings ─────────────────────────────────────────────────────
create policy "own profile"  on profiles      for all using (id = auth.uid())      with check (id = auth.uid());
create policy "own settings" on user_settings for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own push"     on push_tokens   for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── planning tables (full CRUD by owner) ────────────────────────────────────
create policy "own goals"      on goals      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own plans"      on plans      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own tracks"     on tracks     for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own stages"     on stages     for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own milestones" on milestones for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own quests"     on quest_items     for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own coverage"   on quest_coverage  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own days"       on day_plans  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own blocks"     on blocks     for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own tasks"      on tasks      for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── session tables ──────────────────────────────────────────────────────────
create policy "own sessions"      on focus_sessions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own interruptions" on interruptions  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own receipts"      on receipts       for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own tangents"      on tangents       for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── progression: READ ONLY for the client ───────────────────────────────────
create policy "read own xp"      on xp_ledger    for select using (user_id = auth.uid());
create policy "read own tokens"  on token_ledger for select using (user_id = auth.uid());
create policy "read own badges"  on user_badges  for select using (user_id = auth.uid());
-- no insert/update/delete policies: only SECURITY DEFINER functions write here.

create policy "badges are public" on badges for select using (true);

create policy "own rewards"      on rewards       for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "read own claims"  on reward_claims for select using (user_id = auth.uid());
-- claims are written by fn_open_crate only.

-- ── characters ──────────────────────────────────────────────────────────────
create policy "read line library" on character_lines for select
  using (approved and (user_id is null or user_id = auth.uid()));
create policy "own custom lines"  on character_lines for insert
  with check (user_id = auth.uid() and source = 'user');
create policy "own line history"  on line_history for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── commute ─────────────────────────────────────────────────────────────────
create policy "own places"  on places       for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own legs"    on commute_legs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "read travel cache" on travel_cache for select using (auth.role() = 'authenticated');
-- travel_cache is written by the commute Edge Function (service role) only.

-- ── ops ─────────────────────────────────────────────────────────────────────
create policy "read own ai runs" on ai_generations for select using (user_id = auth.uid());
create policy "insert own events" on events for insert with check (user_id = auth.uid());
create policy "read own events"   on events for select using (user_id = auth.uid());

-- ── new-user bootstrap ──────────────────────────────────────────────────────
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)));
  insert into user_settings (user_id) values (new.id);
  insert into rewards (user_id, label) values
    (new.id,'A proper coffee, the expensive one'),
    (new.id,'20 guilt-free minutes of whatever you scroll'),
    (new.id,'One episode tonight'),
    (new.id,'A walk outside with music'),
    (new.id,'Order the good lunch'),
    (new.id,'A 20-minute nap, fully horizontal');
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function handle_new_user();
