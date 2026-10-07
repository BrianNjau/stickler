-- 08: plan guidance (WP2.5).
--
-- Additive only. A drafted plan now carries a coaching note per milestone and, for a vague goal,
-- one clarifying question. Templates get coaching notes too, so the review screen looks the same
-- whichever path made the plan. The "why this plan is shaped this way" paragraph reuses
-- plans.summary, which both paths already fill.

alter table milestones add column if not exists coach_note text;          -- "book the exam before you feel ready"
alter table plans      add column if not exists clarifying_question text; -- AI path, vague goals only; null otherwise

-- ── coaching notes for the four starters, matched by milestone title ─────────────────────────────
with notes(template_key, title, note) as (values
  ('cloud_cert', 'Associate cloud certification',
   'Book the exam date now, before you feel ready. A date on the calendar does more than another week of reading.'),
  ('cloud_cert', 'Infrastructure-as-code certification',
   'Most people underestimate the hands-on part. Write real code against a real account every week, not just flashcards.'),
  ('cloud_cert', 'Container certification',
   'This one is a lab exam: speed at the command line beats theory. Time your labs from the first week.'),
  ('cloud_cert', 'Portfolio project shipped',
   'Small and finished beats big and half-done. Write the README as if a recruiter reads only that.'),
  ('cloud_cert', 'Professional architect certification',
   'The questions are long scenarios. Practise finding the one constraint that decides the answer.'),
  ('exam_prep', 'First full pass of the syllabus',
   'Breadth before depth. Mark weak topics and move on; perfecting chapter one costs you chapter nine.'),
  ('exam_prep', 'Mock exam above pass mark',
   'Most people underestimate timing. Sit mocks to the clock, and book the exam before you feel ready.'),
  ('exam_prep', 'Exam day',
   'Check the booking, the ID rules and the route a week out. The last three days are for sleep and light review.'),
  ('side_business', 'Offer written and priced',
   'If you can''t say the price out loud without wincing, the offer isn''t finished yet.'),
  ('side_business', '20 real conversations',
   'Most people underestimate how many conversations this takes. Count them; don''t estimate.'),
  ('side_business', 'First paying customer',
   'Ask for the money. "Sounds great" is not a customer until it''s paid.'),
  ('side_business', 'Three paying customers',
   'Write down what you did for customer one, so customer three gets the same thing, faster.'),
  ('general_goal', 'First real session done',
   'Make the first one small enough that you can''t argue with it.'),
  ('general_goal', 'Two weeks without missing a planned day',
   'Plan the days you''ll miss in advance. A planned skip is a rest day, not a lapse.'),
  ('general_goal', 'Halfway check-in',
   'Measure one thing honestly and change one thing. Not five.'),
  ('general_goal', 'Goal reached',
   'Decide now what "done" looks like, so you notice when you get there.')
)
update plan_templates t
   set payload = jsonb_set(t.payload, '{milestones}', (
         select jsonb_agg(
                  case when n.note is null then m else m || jsonb_build_object('coach_note', n.note) end
                  order by x.ord)
           from jsonb_array_elements(t.payload->'milestones') with ordinality as x(m, ord)
           left join notes n on n.template_key = t.key and n.title = m->>'title'))
 where t.key in (select template_key from notes);

-- ── fn_apply_template: as in 05, plus coach_note ─────────────────────────────────────────────────
create or replace function fn_apply_template(p_goal uuid, p_template text)
returns plans language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); t plan_templates; pl plans; p jsonb;
        tr jsonb; st jsonb; ms jsonb; qi jsonb; track_id uuid; ms_map jsonb := '{}'::jsonb;
        new_id uuid; ti int := 0; si int := 0; mi int := 0; req uuid[];
begin
  select * into t from plan_templates where key = p_template;
  if t is null then raise exception 'template % not found', p_template; end if;
  if not exists (select 1 from goals where id = p_goal and user_id = uid) then
    raise exception 'goal not found';
  end if;
  p := t.payload;

  insert into plans (user_id, goal_id, summary, north_star, skills, generated_by, model,
                     version)
  values (uid, p_goal, p->>'summary', p->>'north_star', p->'skills', 'template', null,
          coalesce((select max(version) from plans where goal_id = p_goal),0) + 1)
  returning * into pl;

  update goals set title = t.title, domain = t.domain where id = p_goal;

  -- milestones first, so stages can reference them
  for ms in select * from jsonb_array_elements(p->'milestones') loop
    insert into milestones (plan_id, user_id, title, detail, coach_note, skill, target_label, is_keystone,
                            xp_value, token_value, position)
    values (pl.id, uid, ms->>'title', ms->>'detail', ms->>'coach_note', ms->>'skill', ms->>'target_label',
            coalesce((ms->>'is_keystone')::boolean,false),
            case when coalesce((ms->>'is_keystone')::boolean,false) then 500 else 300 end,
            case when coalesce((ms->>'is_keystone')::boolean,false) then 5 else 3 end, mi)
    returning id into new_id;
    ms_map := ms_map || jsonb_build_object(ms->>'title', new_id::text);
    mi := mi + 1;
  end loop;

  for tr in select * from jsonb_array_elements(p->'tracks') loop
    insert into tracks (plan_id, user_id, key, title, goal_line, position)
    values (pl.id, uid, tr->>'key', tr->>'title', tr->>'goal_line', ti)
    returning id into track_id;
    si := 0;
    for st in select * from jsonb_array_elements(tr->'stages') loop
      select coalesce(array_agg((ms_map->>x)::uuid) filter (where ms_map ? x), '{}')
        into req
        from jsonb_array_elements_text(coalesce(st->'requires_milestone_titles','[]'::jsonb)) as x;
      insert into stages (track_id, user_id, title, description, position, requires_milestones)
      values (track_id, uid, st->>'title', st->>'description', si, req);
      si := si + 1;
    end loop;
    ti := ti + 1;
  end loop;

  for qi in select * from jsonb_array_elements(p->'quest_items') loop
    insert into quest_items (user_id, plan_id, title, detail, skill, kind, estimate_minutes,
                             default_priority, source)
    values (uid, pl.id, qi->>'title', qi->>'detail', qi->>'skill', (qi->>'kind')::quest_kind,
            (qi->>'estimate_minutes')::int,
            case when (qi->>'estimate_minutes')::int >= 30 then 'main' else 'side' end::task_priority,
            'template');
  end loop;

  return pl;
end $$;
