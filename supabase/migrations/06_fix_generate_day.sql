-- Fix: fn_generate_day could never run.
-- 03_functions.sql inserts the task priority as a text CASE into tasks.priority (enum task_priority);
-- Postgres rejects it with 42804 ("column priority is of type task_priority but expression is of
-- type text"). This replaces the function with an identical copy plus one cast. Nothing else changes.
-- Found in WP2, the first package to call fn_generate_day.

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
              (case when pos = 0 then 'boss' when q.estimate_minutes >= 25 then 'main' else 'side' end)::task_priority,
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
