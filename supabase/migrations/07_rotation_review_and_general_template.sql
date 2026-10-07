-- 1. fn_generate_day: two rotation fixes (identical to 06 otherwise).
--    a) A never-done quest was labelled "Recall check:" and flagged is_review, because "never" was
--       scored as "done 20 days ago", inside the 7–21-day review window. Review now means what
--       PROJECT_BRIEF 6.1 says: actually done before, between review_after_days and 21 days ago.
--    b) A forced regeneration (a new plan started) left day_plans.plan_id on the old plan.
-- 2. A fourth, domain-neutral starter template for goals none of the three fit ("Learn to swim").
--    Same table, same fn_apply_template path; data only.

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
      select qi.*, coalesce(qc.last_done_on, current_date - 20) as last_done, qc.last_done_on as done_on
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
              case when q.done_on is not null and current_date - q.done_on between q.review_after_days and 21 then 'Recall check: '||q.title else q.title end,
              (case when pos = 0 then 'boss' when q.estimate_minutes >= 25 then 'main' else 'side' end)::task_priority,
              q.estimate_minutes, q.skill,
              q.done_on is not null and current_date - q.done_on between q.review_after_days and 21,
              q.skill is not distinct from neglected,
              pos);
      used := used || q.id; mins := mins + q.estimate_minutes; pos := pos + 1;
    end loop;
  end loop;

  update day_plans set generated_at = now(), generator = 'rotation', plan_id = coalesce(pl.id, plan_id)
   where id = d.id returning * into d;
  return d;
end $$;

insert into plan_templates (key, title, domain, blurb, position, payload) values
('general_goal','A goal of your own','other',
 'A neutral shape for anything: start properly, make it a habit, check what works, finish. Rename everything to fit.',4,
 '{"north_star":"The goal done, at a pace you could actually keep.",
   "summary":"Start small and start soon, make showing up automatic, then measure honestly halfway and adjust. Quests are deliberately generic: rename them to your goal on the review screen.",
   "skills":[{"key":"practice","label":"Practice","description":"Doing the thing itself"},
             {"key":"learn","label":"Learning","description":"Knowing how to do it better"},
             {"key":"review","label":"Reflection","description":"Noticing what works and what does not"},
             {"key":"habit","label":"Consistency","description":"Showing up on the days you planned"}],
   "tracks":[{"key":"goal","title":"The goal","goal_line":"From intention to done",
     "stages":[{"title":"Started properly","description":"The first real session is behind you","requires_milestone_titles":["First real session done"]},
               {"title":"It is a habit","description":"Two weeks of planned days, kept","requires_milestone_titles":["Two weeks without missing a planned day"]},
               {"title":"Halfway, honestly","description":"You checked what works and changed what does not","requires_milestone_titles":["Halfway check-in"]},
               {"title":"Goal reached","description":"Done, and you can say exactly how","requires_milestone_titles":["Goal reached"]}]}],
   "milestones":[{"title":"First real session done","detail":"Not research about it: the thing itself","skill":"practice","target_label":"This week","is_keystone":false},
                 {"title":"Two weeks without missing a planned day","detail":"Rest days count as kept","skill":"habit","target_label":"In about 3 weeks","is_keystone":false},
                 {"title":"Halfway check-in","detail":"One honest measure of where you are, and one change","skill":"review","target_label":"Halfway to your date","is_keystone":false},
                 {"title":"Goal reached","detail":"The thing you set out to do, done","skill":"practice","target_label":"Your date","is_keystone":true}],
   "quest_items":[{"title":"Do the thing for 20 focused minutes, nothing else","skill":"practice","kind":"practice","estimate_minutes":20},
                  {"title":"Do the thing for 40 minutes, a little harder than last time","skill":"practice","kind":"practice","estimate_minutes":40},
                  {"title":"Practise the part you have been avoiding","skill":"practice","kind":"practice","estimate_minutes":30},
                  {"title":"Repeat the hardest part of last session, slowly","skill":"practice","kind":"practice","estimate_minutes":25},
                  {"title":"Learn one technique properly: read or watch, then try it once","skill":"learn","kind":"learn","estimate_minutes":25},
                  {"title":"Find the one resource you will actually use, and keep it handy","skill":"learn","kind":"learn","estimate_minutes":15},
                  {"title":"Ask someone who has done this for one specific tip","skill":"learn","kind":"outreach","estimate_minutes":15},
                  {"title":"Write three lines on what went well and three on what did not","skill":"review","kind":"review","estimate_minutes":10},
                  {"title":"Measure where you are: one honest test or check","skill":"review","kind":"review","estimate_minutes":20},
                  {"title":"Reread your notes and rewrite the single most useful one","skill":"review","kind":"review","estimate_minutes":15},
                  {"title":"Pick next week''s smallest next step and put it in the plan","skill":"habit","kind":"admin","estimate_minutes":10},
                  {"title":"Remove one thing that keeps getting in the way","skill":"habit","kind":"admin","estimate_minutes":15}]}'::jsonb);
