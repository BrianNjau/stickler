-- Focus Strip — RPC layer.
-- Everything that grants XP, tokens or badges lives here and runs SECURITY DEFINER.
-- The client calls these with supabase.rpc('fn_name', {...}).
-- All functions are idempotent where it matters: the same action twice never double-grants.

-- streak/combo state that is genuinely stateful (everything else derives from the ledger)
create table if not exists user_stats (
  user_id        uuid primary key references auth.users on delete cascade,
  combo          int not null default 0,
  max_combo      int not null default 0,
  focus_ms_total bigint not null default 0,
  last_active_on date,
  updated_at     timestamptz not null default now()
);
alter table user_stats enable row level security;
create policy "read own stats" on user_stats for select using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- helpers
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function fn_local_date(p_user uuid default auth.uid())
returns date language sql stable as $$
  select (now() at time zone coalesce((select timezone from profiles where id = p_user),'UTC'))::date;
$$;

create or replace function _award_xp(p_user uuid, p_amount int, p_reason xp_reason, p_skill text, p_key text, p_meta jsonb default '{}')
returns int language plpgsql security definer set search_path = public as $$
begin
  insert into xp_ledger (user_id, amount, reason, skill, local_date, idempotency_key, meta)
  values (p_user, p_amount, p_reason, p_skill, fn_local_date(p_user), p_key, p_meta)
  on conflict (user_id, idempotency_key) do nothing;
  if not found then return 0; end if;
  update user_stats set last_active_on = fn_local_date(p_user), updated_at = now() where user_id = p_user;
  return p_amount;
end $$;

create or replace function _award_tokens(p_user uuid, p_amount int, p_reason text, p_key text)
returns int language plpgsql security definer set search_path = public as $$
begin
  insert into token_ledger (user_id, amount, reason, idempotency_key)
  values (p_user, p_amount, p_reason, p_key)
  on conflict (user_id, idempotency_key) do nothing;
  return case when found then p_amount else 0 end;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- derived reads
-- ─────────────────────────────────────────────────────────────────────────────
create or replace view v_xp_totals as
  select user_id, sum(amount)::int as xp,
         sum(amount) filter (where local_date = fn_local_date(user_id))::int as xp_today
  from xp_ledger group by user_id;

create or replace view v_skill_xp as
  select user_id, skill, sum(amount)::int as xp,
         sum(amount) filter (where local_date > current_date - 7)::int as xp_7d
  from xp_ledger where skill is not null group by user_id, skill;

create or replace view v_token_balance as
  select user_id, coalesce(sum(amount),0)::int as tokens from token_ledger group by user_id;

-- level curve: level n starts at 100 * (n-1)n/2 XP  (0, 100, 300, 600, 1000, …)
create or replace function fn_level(p_xp int) returns int language sql immutable as $$
  select greatest(1, floor((1 + sqrt(1 + 8 * greatest(p_xp,0)::numeric / 100)) / 2)::int);
$$;

create or replace function fn_streak(p_user uuid default auth.uid())
returns int language plpgsql stable as $$
declare d date := fn_local_date(p_user); n int := 0; rest int[];
begin
  select rest_days into rest from user_settings where user_id = p_user;
  if not exists (select 1 from xp_ledger where user_id = p_user and local_date = d) then d := d - 1; end if;
  loop
    if extract(dow from d)::int = any(coalesce(rest,'{0}')) then d := d - 1; continue; end if;
    exit when not exists (select 1 from xp_ledger where user_id = p_user and local_date = d);
    n := n + 1; d := d - 1;
    exit when n > 400;
  end loop;
  return n;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- tasks
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function fn_complete_task(p_task uuid, p_actual_minutes int default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare t tasks; b blocks; xp int; base int; uid uuid := auth.uid();
begin
  select * into t from tasks where id = p_task and user_id = uid;
  if t is null then raise exception 'task not found'; end if;
  if t.completed_at is not null then return jsonb_build_object('xp',0,'already',true); end if;

  select * into b from blocks where id = t.block_id;
  base := case t.priority when 'boss' then 30 when 'main' then 20 else 10 end;
  xp   := round(base * case when t.is_rescue then 1.5 else 1 end);

  update tasks set completed_at = now(), actual_minutes = p_actual_minutes where id = p_task;

  if t.quest_item_id is not null then
    insert into quest_coverage (user_id, quest_item_id, last_done_on, times_done, avg_actual_minutes)
    values (uid, t.quest_item_id, fn_local_date(uid), 1, p_actual_minutes)
    on conflict (user_id, quest_item_id) do update
      set last_done_on = excluded.last_done_on,
          times_done   = quest_coverage.times_done + 1,
          avg_actual_minutes = coalesce((quest_coverage.avg_actual_minutes * quest_coverage.times_done + p_actual_minutes)
                                        / nullif(quest_coverage.times_done + 1,0), quest_coverage.avg_actual_minutes);
  end if;

  perform _award_xp(uid, xp, 'task', coalesce(t.skill, b.skill), 'task:'||p_task::text,
                    jsonb_build_object('priority',t.priority,'rescue',t.is_rescue));
  perform fn_learn_pace(uid);
  return jsonb_build_object('xp', xp, 'badges', fn_check_badges(uid));
end $$;

create or replace function fn_uncomplete_task(p_task uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update tasks set completed_at = null, actual_minutes = null where id = p_task and user_id = auth.uid();
  delete from xp_ledger where user_id = auth.uid() and idempotency_key = 'task:'||p_task::text;
end $$;

-- learned pace: rolling median of actual/estimate over the last 30 timed tasks
create or replace function fn_learn_pace(p_user uuid)
returns numeric language plpgsql security definer set search_path = public as $$
declare f numeric;
begin
  select percentile_cont(0.5) within group (order by (actual_minutes::numeric / nullif(estimate_minutes,0)))
    into f
  from (select actual_minutes, estimate_minutes from tasks
        where user_id = p_user and actual_minutes is not null and estimate_minutes is not null
        order by completed_at desc limit 30) s;
  if f is not null then
    update user_settings set pace_factor = least(3.0, greatest(0.5, round(f,2))) where user_id = p_user;
  end if;
  return f;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- sessions & rounds
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function fn_start_session(p_block uuid, p_preflight boolean default false)
returns focus_sessions language plpgsql security definer set search_path = public as $$
declare b blocks; s focus_sessions; st user_settings; mins int; rounds int; total int;
begin
  select * into b from blocks where id = p_block and user_id = auth.uid();
  if b is null then raise exception 'block not found'; end if;
  select * into st from user_settings where user_id = auth.uid();
  total  := extract(epoch from (b.end_local - b.start_local))/60;
  rounds := greatest(1, ceil(total::numeric / (st.round_minutes + st.break_minutes))::int);
  mins   := greatest(5, floor((total - (rounds-1) * st.break_minutes)::numeric / rounds)::int);

  update focus_sessions set state = 'abandoned', ended_at = now()
    where user_id = auth.uid() and state in ('running','paused','break');

  insert into focus_sessions (user_id, block_id, rounds_planned, round_minutes, round_ends_at, preflight_passed)
  values (auth.uid(), p_block, rounds, mins, now() + make_interval(mins => mins), p_preflight)
  returning * into s;

  if p_preflight then perform _award_xp(auth.uid(), 10, 'preflight', null, 'preflight:'||p_block::text); end if;
  return s;
end $$;

create or replace function fn_end_round(p_session uuid)
returns focus_sessions language plpgsql security definer set search_path = public as $$
declare s focus_sessions; b blocks; st user_settings;
begin
  select * into s from focus_sessions where id = p_session and user_id = auth.uid();
  if s is null then raise exception 'session not found'; end if;
  select * into b from blocks where id = s.block_id;
  select * into st from user_settings where user_id = auth.uid();

  perform _award_xp(auth.uid(), 15, 'round', b.skill, 'round:'||p_session::text||':'||s.round_index::text);

  if s.round_index >= s.rounds_planned then
    update focus_sessions set state = 'completed', ended_at = now(),
           focus_ms = focus_ms + s.round_minutes * 60000 where id = p_session returning * into s;
  else
    update focus_sessions set state = 'break', round_index = s.round_index + 1,
           round_ends_at = now() + make_interval(mins => st.break_minutes),
           focus_ms = focus_ms + s.round_minutes * 60000 where id = p_session returning * into s;
  end if;
  return s;
end $$;

create or replace function fn_resume_round(p_session uuid)
returns focus_sessions language plpgsql security definer set search_path = public as $$
declare s focus_sessions;
begin
  update focus_sessions set state = 'running', round_ends_at = now() + make_interval(mins => round_minutes)
   where id = p_session and user_id = auth.uid() returning * into s;
  return s;
end $$;

create or replace function fn_log_interruption(p_session uuid, p_kind interruption_kind, p_away_ms bigint default 0,
                                               p_source text default null, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); s focus_sessions; xp int := 0;
begin
  insert into interruptions (user_id, session_id, kind, away_ms, source, note)
  values (uid, p_session, p_kind, p_away_ms, p_source, p_note);

  if p_kind = 'drift' then
    update focus_sessions set drift_count = drift_count + 1, away_ms = away_ms + coalesce(p_away_ms,0),
           suspicion = least(100, suspicion + 25) where id = p_session and user_id = uid;
    update user_stats set combo = 0 where user_id = uid;
  elsif p_kind = 'study_trip' then
    update focus_sessions set trip_ms = trip_ms + coalesce(p_away_ms,0) where id = p_session and user_id = uid;
  elsif p_kind = 'snap_out' then
    xp := _award_xp(uid, 10, 'comeback', null, 'comeback:'||gen_random_uuid()::text);
    update focus_sessions set suspicion = greatest(0, suspicion - 5) where id = p_session and user_id = uid;
  elsif p_kind = 'attention_check' then
    xp := _award_xp(uid, 5, 'attention_check', null, 'ac:'||p_session::text||':'||extract(epoch from now())::bigint::text);
    update focus_sessions set suspicion = greatest(0, suspicion - 5) where id = p_session and user_id = uid;
  end if;
  return jsonb_build_object('xp', xp);
end $$;

create or replace function fn_log_receipt(p_session uuid, p_body text, p_skill text default null, p_source text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare id uuid; xp int;
begin
  insert into receipts (user_id, session_id, body, skill, source)
  values (auth.uid(), p_session, p_body, p_skill, p_source) returning receipts.id into id;
  xp := _award_xp(auth.uid(), 15, 'receipt', p_skill, 'receipt:'||id::text);
  update focus_sessions set suspicion = greatest(0, suspicion - 10) where id = p_session and user_id = auth.uid();
  return jsonb_build_object('xp', xp, 'id', id);
end $$;

-- completing a block: XP, combo, tokens, day bonus
create or replace function fn_complete_block(p_block uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); b blocks; s focus_sessions; clean boolean; combo int;
        xp int; mult numeric := 1; day_done boolean; d day_plans;
begin
  select * into b from blocks where id = p_block and user_id = uid;
  if b is null then raise exception 'block not found'; end if;
  if b.completed_at is not null then return jsonb_build_object('xp',0,'already',true); end if;

  select * into s from focus_sessions where block_id = p_block and user_id = uid order by started_at desc limit 1;
  clean := s.id is not null and coalesce(s.drift_count,0) = 0;

  select * into combo from user_stats where user_id = uid;
  select coalesce(user_stats.combo,0) into combo from user_stats where user_id = uid;

  if b.kind = 'break' then
    xp := 20;
  else
    if clean then
      combo := combo + 1;
      mult  := least(2.0, 1 + 0.25 * (combo - 1));
      update user_stats set combo = combo, max_combo = greatest(max_combo, combo) where user_id = uid;
    else
      combo := 0; update user_stats set combo = 0 where user_id = uid;
    end if;
    xp := round(50 * mult);
  end if;

  update blocks set completed_at = now() where id = p_block;
  perform _award_xp(uid, xp, 'block', b.skill, 'block:'||p_block::text, jsonb_build_object('clean',clean,'combo',combo));
  if clean and b.kind <> 'break' then
    perform _award_xp(uid, 25, 'clean_block', null, 'clean:'||p_block::text);
    perform _award_tokens(uid, 1, 'block cleared', 'block:'||p_block::text);
  end if;

  select * into d from day_plans where id = b.day_plan_id;
  select not exists (select 1 from blocks where day_plan_id = d.id and completed_at is null and skipped_at is null)
    into day_done;
  if day_done then
    perform _award_xp(uid, 100, 'day', null, 'day:'||d.id::text);
    perform _award_tokens(uid, 3, 'whole day cleared', 'day:'||d.id::text);
  end if;

  return jsonb_build_object('xp', xp, 'clean', clean, 'combo', combo, 'day_complete', day_done,
                            'badges', fn_check_badges(uid));
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- milestones & stages
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function fn_complete_milestone(p_milestone uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare m milestones; uid uuid := auth.uid();
begin
  select * into m from milestones where id = p_milestone and user_id = uid;
  if m is null then raise exception 'milestone not found'; end if;
  update milestones set completed_at = now() where id = p_milestone;
  perform _award_xp(uid, m.xp_value, 'milestone', m.skill, 'milestone:'||p_milestone::text);
  perform _award_tokens(uid, m.token_value, 'milestone', 'milestone:'||p_milestone::text);
  perform fn_autocomplete_stages(uid);
  return jsonb_build_object('xp', m.xp_value, 'badges', fn_check_badges(uid));
end $$;

create or replace function fn_autocomplete_stages(p_user uuid default auth.uid())
returns int language plpgsql security definer set search_path = public as $$
declare st stages; n int := 0; ok boolean;
begin
  for st in select * from stages where user_id = p_user and completed_at is null loop
    ok := false;
    if array_length(st.requires_milestones,1) is not null then
      select not exists (select 1 from milestones m where m.id = any(st.requires_milestones) and m.completed_at is null)
        into ok;
    elsif st.requires_skill is not null then
      select coalesce((select xp from v_skill_xp where user_id = p_user and skill = st.requires_skill),0) >= st.requires_skill_xp
        into ok;
    end if;
    if ok then
      update stages set completed_at = now() where id = st.id;
      perform _award_xp(p_user, 300, 'stage', null, 'stage:'||st.id::text);
      perform _award_tokens(p_user, 5, 'endgame stage', 'stage:'||st.id::text);
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- rewards
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function fn_open_crate()
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); bal int; r rewards; key text;
begin
  select coalesce(sum(amount),0) into bal from token_ledger where user_id = uid;
  if bal < 1 then raise exception 'no tokens'; end if;

  select * into r from rewards
   where user_id = uid and is_active
   order by random() * (1.0 / greatest(weight,1)) limit 1;
  if r is null then raise exception 'no rewards configured'; end if;

  key := 'crate:'||gen_random_uuid()::text;
  perform _award_tokens(uid, -1, 'crate opened', key);
  insert into reward_claims (user_id, reward_id, label, tokens_spent) values (uid, r.id, r.label, 1);
  return jsonb_build_object('reward', r.label, 'tokens_left', bal - 1);
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- badges
-- ─────────────────────────────────────────────────────────────────────────────
-- rule json shapes: {"type":"count","reason":"block","gte":1} | {"type":"streak","gte":3}
--                  {"type":"focus_hours","gte":10} | {"type":"combo","gte":3}
--                  {"type":"milestones","keystone":true,"gte":1}
create or replace function fn_check_badges(p_user uuid default auth.uid())
returns text[] language plpgsql security definer set search_path = public as $$
declare b badges; got text[] := '{}'; ok boolean; v int;
begin
  for b in select * from badges loop
    if exists (select 1 from user_badges ub where ub.user_id = p_user and ub.badge_key = b.key) then continue; end if;
    ok := false;
    case b.rule->>'type'
      when 'count' then
        select count(*) into v from xp_ledger where user_id = p_user and reason = (b.rule->>'reason')::xp_reason;
        ok := v >= (b.rule->>'gte')::int;
      when 'streak' then
        ok := fn_streak(p_user) >= (b.rule->>'gte')::int;
      when 'focus_hours' then
        select coalesce(focus_ms_total,0)/3600000 into v from user_stats where user_id = p_user;
        ok := v >= (b.rule->>'gte')::int;
      when 'combo' then
        select coalesce(max_combo,0) into v from user_stats where user_id = p_user;
        ok := v >= (b.rule->>'gte')::int;
      when 'milestones' then
        select count(*) into v from milestones where user_id = p_user and completed_at is not null
          and (not coalesce((b.rule->>'keystone')::boolean,false) or is_keystone);
        ok := v >= (b.rule->>'gte')::int;
      else ok := false;
    end case;
    if ok then
      insert into user_badges (user_id, badge_key) values (p_user, b.key) on conflict do nothing;
      perform _award_xp(p_user, b.xp_bonus, 'badge', null, 'badge:'||b.key);
      got := got || b.key;
    end if;
  end loop;
  return got;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- the rotation engine: build tomorrow (or today) from the quest library
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function fn_neglected_skill(p_user uuid, p_plan uuid)
returns text language sql stable as $$
  with in_play as (
    select distinct skill from milestones
     where user_id = p_user and plan_id = p_plan and completed_at is null and skill is not null
     order by skill limit 3)
  select ip.skill from in_play ip
  left join v_skill_xp sx on sx.user_id = p_user and sx.skill = ip.skill
  order by coalesce(sx.xp_7d,0) asc limit 1;
$$;

create or replace function fn_generate_day(p_date date default null, p_force boolean default false)
returns day_plans language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); st user_settings; pl plans; d day_plans;
        the_date date; neglected text; b record; budget int; used uuid[] := '{}';
        q record; mins int; pos int;
begin
  select * into st from user_settings where user_id = uid;
  the_date := coalesce(p_date, fn_local_date(uid));
  select * into pl from plans where user_id = uid and is_active order by created_at desc limit 1;

  select * into d from day_plans where user_id = uid and local_date = the_date;
  if d.id is not null and not p_force then return d; end if;

  if d.id is null then
    insert into day_plans (user_id, plan_id, local_date, timezone)
    values (uid, pl.id, the_date, (select timezone from profiles where id = uid))
    returning * into d;
  else
    delete from tasks where block_id in (select id from blocks where day_plan_id = d.id) and completed_at is null;
  end if;

  -- blocks: keep any the user already made for that date; otherwise lay out a default day
  if not exists (select 1 from blocks where day_plan_id = d.id) then
    insert into blocks (day_plan_id, user_id, title, kind, skill, start_local, end_local, position, rounds_planned)
    select d.id, uid, t.title, t.kind::block_kind, null, t.s, t.e, t.p,
           greatest(1, ceil(extract(epoch from (t.e - t.s))/60 / (st.round_minutes + st.break_minutes))::int)
    from (values
      ('Deep work: new material', 'study', st.workday_start, st.workday_start + interval '75 min', 0),
      ('Break',                   'break', st.workday_start + interval '75 min', st.workday_start + interval '90 min', 1),
      ('Practice and application','study', st.workday_start + interval '90 min', st.workday_start + interval '140 min', 2),
      ('Lock it in',              'review',st.workday_start + interval '140 min', st.workday_start + interval '170 min', 3)
    ) as t(title, kind, s, e, p);
  end if;

  neglected := fn_neglected_skill(uid, pl.id);

  for b in select * from blocks where day_plan_id = d.id and kind <> 'break' order by position loop
    budget := extract(epoch from (b.end_local - b.start_local))/60 - 5;
    pos := 0; mins := 0;
    for q in
      select qi.*, coalesce(qc.last_done_on, current_date - 20) as last_done
      from quest_items qi
      left join quest_coverage qc on qc.quest_item_id = qi.id and qc.user_id = uid
      where qi.user_id = uid and qi.retired_at is null
        and not (qi.id = any(used))
        and (b.kind <> 'review' or qi.kind in ('review','practice'))
      order by ( (current_date - coalesce(qc.last_done_on, current_date - 20)) * 10
               + case when qi.skill = neglected then 35 else 0 end
               + case when qc.last_done_on is null then 20 else 0 end
               - case when coalesce(qc.last_done_on, current_date - 20) > current_date - 2 then 25 else 0 end
               + random() * 8 ) desc
      limit 12
    loop
      exit when pos >= 4 or mins >= budget;
      if mins + q.estimate_minutes > budget and pos > 0 then continue; end if;
      insert into tasks (block_id, user_id, quest_item_id, title, priority, estimate_minutes, skill, is_review, is_rescue, position)
      values (b.id, uid, q.id,
              case when current_date - q.last_done between q.review_after_days and 21 then 'Recall check: '||q.title else q.title end,
              case when pos = 0 then 'boss' when q.estimate_minutes >= 25 then 'main' else 'side' end,
              q.estimate_minutes, q.skill,
              current_date - q.last_done between q.review_after_days and 21,
              q.skill is not distinct from neglected,
              pos);
      used := used || q.id; mins := mins + q.estimate_minutes; pos := pos + 1;
    end loop;
  end loop;

  update day_plans set generated_at = now(), generator = 'rotation' where id = d.id returning * into d;
  return d;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- pace & feasibility
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function fn_pace(p_date date default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); the_date date; tz text; now_local time;
        total int := 0; done int := 0; expected numeric := 0; b record;
begin
  select timezone into tz from profiles where id = uid;
  the_date := coalesce(p_date, fn_local_date(uid));
  now_local := (now() at time zone tz)::time;

  for b in
    select bl.id, bl.start_local, bl.end_local,
           count(t.*) as n, count(t.completed_at) as n_done
    from blocks bl
    join day_plans dp on dp.id = bl.day_plan_id and dp.local_date = the_date and dp.user_id = uid
    left join tasks t on t.block_id = bl.id
    where bl.kind <> 'break'
    group by bl.id, bl.start_local, bl.end_local
  loop
    total := total + b.n; done := done + b.n_done;
    expected := expected + b.n * case
      when now_local >= b.end_local then 1
      when now_local <= b.start_local then 0
      else extract(epoch from (now_local - b.start_local)) / nullif(extract(epoch from (b.end_local - b.start_local)),0)
    end;
  end loop;

  return jsonb_build_object('total', total, 'done', done, 'expected', round(expected),
                            'behind', greatest(0, round(expected)::int - done), 'as_of', now_local);
end $$;

-- feasibility: does today's plan fit in the hours that actually exist?
create or replace function fn_feasibility(p_date date default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); the_date date; st user_settings;
        available int; required numeric; travel int; ramp int; verdict text;
begin
  select * into st from user_settings where user_id = uid;
  the_date := coalesce(p_date, fn_local_date(uid));

  select coalesce(sum(extract(epoch from (b.end_local - b.start_local))/60),0)::int into available
  from blocks b join day_plans d on d.id = b.day_plan_id
  where d.user_id = uid and d.local_date = the_date and b.kind not in ('break','commute');

  select coalesce(sum(duration_s)/60,0)::int into travel
  from commute_legs where user_id = uid and day_plan_id = (select id from day_plans where user_id = uid and local_date = the_date);

  select count(*) * st.ramp_up_minutes into ramp
  from blocks b join day_plans d on d.id = b.day_plan_id
  where d.user_id = uid and d.local_date = the_date and b.kind not in ('break','commute');

  select coalesce(sum(coalesce(t.estimate_minutes,20)),0) * st.pace_factor into required
  from tasks t join blocks b on b.id = t.block_id join day_plans d on d.id = b.day_plan_id
  where d.user_id = uid and d.local_date = the_date and t.completed_at is null;

  available := greatest(0, available - travel - ramp);
  verdict := case when required <= available * 0.85 then 'fits'
                  when required <= available then 'tight'
                  else 'not_possible' end;

  update day_plans set feasibility = jsonb_build_object(
    'verdict',verdict,'available_minutes',available,'required_minutes',round(required),
    'travel_minutes',travel,'ramp_minutes',ramp,'pace_factor',st.pace_factor,'computed_at',now())
  where user_id = uid and local_date = the_date;

  return jsonb_build_object('verdict',verdict,'available_minutes',available,'required_minutes',round(required),
                            'travel_minutes',travel,'ramp_minutes',ramp,'pace_factor',st.pace_factor,
                            'overflow_minutes', greatest(0, round(required)::int - available));
end $$;

-- what to cut when the day does not fit: lowest priority, least milestone impact, first to go
create or replace function fn_suggest_cuts(p_date date default null)
returns table (task_id uuid, title text, minutes int, reason text)
language sql stable security definer set search_path = public as $$
  with f as (select (fn_feasibility(p_date)->>'overflow_minutes')::int as over),
  ranked as (
    select t.id, t.title, coalesce(t.estimate_minutes,20) as minutes,
           row_number() over (order by case t.priority when 'side' then 0 when 'main' then 1 else 2 end,
                                       t.is_rescue, t.position) as rn,
           sum(coalesce(t.estimate_minutes,20)) over (order by case t.priority when 'side' then 0 when 'main' then 1 else 2 end,
                                       t.is_rescue, t.position) as running
    from tasks t join blocks b on b.id = t.block_id join day_plans d on d.id = b.day_plan_id
    where d.user_id = auth.uid() and d.local_date = coalesce(p_date, fn_local_date(auth.uid()))
      and t.completed_at is null)
  select r.id, r.title, r.minutes,
         'lowest-impact task; cutting it brings the day back inside the hours you have'
  from ranked r, f where f.over > 0 and r.running - r.minutes < f.over;
$$;
