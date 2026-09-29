-- Focus Strip — starter plan templates.
-- Purpose 1: build and demo the whole app with NO Anthropic key.
-- Purpose 2: ship as the real fallback for users who are rate-limited, offline at signup,
--            or who simply don't want an AI writing their plan.
--
-- A template is the same JSON shape the LLM returns (see shared/types.ts → GeneratedPlan),
-- so fn_apply_template and the generate-plan function write identical rows.

create table plan_templates (
  key         text primary key,
  title       text not null,
  domain      goal_domain not null,
  blurb       text not null,
  payload     jsonb not null,          -- GeneratedPlan minus title/domain
  position    int not null default 0
);
alter table plan_templates enable row level security;
create policy "templates are public" on plan_templates for select using (true);

-- ── apply a template to a goal, producing a real plan ───────────────────────
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
    insert into milestones (plan_id, user_id, title, detail, skill, target_label, is_keystone,
                            xp_value, token_value, position)
    values (pl.id, uid, ms->>'title', ms->>'detail', ms->>'skill', ms->>'target_label',
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

-- ── three starter templates ─────────────────────────────────────────────────
insert into plan_templates (key, title, domain, blurb, position, payload) values
('cloud_cert','Cloud certifications to a senior role','software',
 'AWS and Kubernetes credentials, a portfolio project, then the interview grind.',1,
 '{"north_star":"Credentials and proof of work that make a senior cloud role a choice, not a hope.",
   "summary":"Certifications in order of leverage, a real build to prove it, then interview reps. The rotation keeps the neglected skill in front of you.",
   "skills":[{"key":"cloud","label":"Cloud","description":"Services, trade-offs, exam readiness"},
             {"key":"iac","label":"Infrastructure as code","description":"Terraform and repeatable environments"},
             {"key":"k8s","label":"Containers","description":"Kubernetes and workloads"},
             {"key":"arch","label":"Architecture","description":"System design and written reasoning"},
             {"key":"sec","label":"Security","description":"Identity, keys, least privilege"}],
   "tracks":[{"key":"credentials","title":"Credentials","goal_line":"Proof on paper that survives a recruiter screen",
     "stages":[{"title":"Associate level done","description":"First cloud certification passed","requires_milestone_titles":["Associate cloud certification"]},
               {"title":"Automation credible","description":"You build infrastructure as code, not by clicking","requires_milestone_titles":["Infrastructure-as-code certification"]},
               {"title":"Professional level","description":"The hard certification that separates you","requires_milestone_titles":["Professional architect certification"]},
               {"title":"Interview ready","description":"120 problems and 6 mocks behind you"},
               {"title":"Offer in hand","description":"Negotiated at least once"}]}],
   "milestones":[{"title":"Associate cloud certification","detail":"The foundation everything else sits on","skill":"cloud","target_label":"In about 6 weeks","is_keystone":true},
                 {"title":"Infrastructure-as-code certification","detail":"Short, high signal","skill":"iac","target_label":"About 3 weeks later","is_keystone":true},
                 {"title":"Container certification","detail":"Hands-on, mostly labs","skill":"k8s","target_label":"About 6 weeks later","is_keystone":true},
                 {"title":"Portfolio project shipped","detail":"One real system, documented","skill":"arch","target_label":"Within 4 months","is_keystone":false},
                 {"title":"Professional architect certification","detail":"The big one","skill":"cloud","target_label":"Within 6 months","is_keystone":true}],
   "quest_items":[{"title":"Networking fundamentals: subnets, routing, gateways","skill":"cloud","kind":"learn","estimate_minutes":25},
                  {"title":"High availability patterns: multi-zone, multi-region","skill":"cloud","kind":"learn","estimate_minutes":20},
                  {"title":"Load balancing and auto scaling","skill":"cloud","kind":"learn","estimate_minutes":20},
                  {"title":"Managed databases: failover, replicas, backups","skill":"cloud","kind":"learn","estimate_minutes":20},
                  {"title":"Object storage classes and lifecycle rules","skill":"cloud","kind":"learn","estimate_minutes":20},
                  {"title":"Caching layers and when each one wins","skill":"cloud","kind":"learn","estimate_minutes":20},
                  {"title":"Queues, topics and event buses","skill":"cloud","kind":"learn","estimate_minutes":25},
                  {"title":"25 timed practice questions, mixed domains","skill":"cloud","kind":"practice","estimate_minutes":35},
                  {"title":"25 timed practice questions, weakest domain","skill":"cloud","kind":"practice","estimate_minutes":35},
                  {"title":"Review every question you got wrong this week","skill":"cloud","kind":"review","estimate_minutes":25},
                  {"title":"Explain three services out loud as if teaching someone","skill":"cloud","kind":"practice","estimate_minutes":20},
                  {"title":"Write identity policies with conditions and test them","skill":"sec","kind":"lab","estimate_minutes":25},
                  {"title":"Key management and encryption at rest","skill":"sec","kind":"learn","estimate_minutes":20},
                  {"title":"Write config for one storage bucket, versioned and locked down","skill":"iac","kind":"lab","estimate_minutes":30},
                  {"title":"Build a network from code: public and private subnets","skill":"iac","kind":"lab","estimate_minutes":30},
                  {"title":"Read every line of a plan output and predict the blast radius","skill":"iac","kind":"lab","estimate_minutes":25},
                  {"title":"Modules, variables and outputs: make it reusable","skill":"iac","kind":"learn","estimate_minutes":20},
                  {"title":"Deploy a workload to a local cluster and scale it","skill":"k8s","kind":"lab","estimate_minutes":30},
                  {"title":"Break a deployment, then debug it from logs","skill":"k8s","kind":"lab","estimate_minutes":30},
                  {"title":"Least-privilege access control in the cluster","skill":"k8s","kind":"lab","estimate_minutes":25},
                  {"title":"Read one chapter of a systems design book, 5 takeaways","skill":"arch","kind":"review","estimate_minutes":45},
                  {"title":"Write a one-page design note on a real problem","skill":"arch","kind":"build","estimate_minutes":30},
                  {"title":"One system design problem, written up end to end","skill":"arch","kind":"build","estimate_minutes":30}]}'::jsonb),

('exam_prep','Pass a professional exam','exams',
 'Syllabus coverage, timed practice, and spaced recall until the date stops being scary.',2,
 '{"north_star":"Walk into the exam already knowing you have passed it.",
   "summary":"Coverage first, then practice under time, then recall of everything you got wrong. The plan front-loads the heaviest topics while your attention is fresh.",
   "skills":[{"key":"theory","label":"Theory","description":"Syllabus content and definitions"},
             {"key":"application","label":"Application","description":"Problems, cases and calculations"},
             {"key":"recall","label":"Recall","description":"Spaced revision of weak areas"},
             {"key":"exam","label":"Exam technique","description":"Timing, question reading, marks per minute"}],
   "tracks":[{"key":"exam","title":"The exam","goal_line":"A pass, with margin",
     "stages":[{"title":"Syllabus covered once","description":"Every topic seen at least once","requires_milestone_titles":["First full pass of the syllabus"]},
               {"title":"Practice above threshold","description":"Consistently scoring above the pass mark","requires_milestone_titles":["Mock exam above pass mark"]},
               {"title":"Weak areas closed","description":"Your gaps list is short and boring"},
               {"title":"Exam sat","description":"Booked, sat, done","requires_milestone_titles":["Exam day"]}]}],
   "milestones":[{"title":"First full pass of the syllabus","detail":"Every topic covered once, notes written","skill":"theory","target_label":"Halfway to the date","is_keystone":false},
                 {"title":"Mock exam above pass mark","detail":"Under real time pressure, twice in a row","skill":"application","target_label":"Three weeks before","is_keystone":true},
                 {"title":"Exam day","detail":"Booked and sat","skill":"exam","target_label":"The date","is_keystone":true}],
   "quest_items":[{"title":"Read and summarise one syllabus topic in your own words","skill":"theory","kind":"learn","estimate_minutes":30},
                  {"title":"Make 10 flashcards from today''s topic","skill":"recall","kind":"review","estimate_minutes":15},
                  {"title":"20 practice questions, untimed, full workings","skill":"application","kind":"practice","estimate_minutes":30},
                  {"title":"20 practice questions, strictly timed","skill":"exam","kind":"practice","estimate_minutes":25},
                  {"title":"Review every wrong answer and write why it was wrong","skill":"recall","kind":"review","estimate_minutes":25},
                  {"title":"Yesterday''s flashcards, cold","skill":"recall","kind":"review","estimate_minutes":15},
                  {"title":"One past paper section under exam conditions","skill":"exam","kind":"practice","estimate_minutes":45},
                  {"title":"Teach one concept out loud to an empty room","skill":"theory","kind":"practice","estimate_minutes":15},
                  {"title":"Rework the three questions that beat you last week","skill":"application","kind":"review","estimate_minutes":25},
                  {"title":"Skim your gaps list and pick the ugliest one","skill":"recall","kind":"review","estimate_minutes":15},
                  {"title":"Summarise a chapter into one page, no notes open","skill":"theory","kind":"review","estimate_minutes":25},
                  {"title":"Practice the calculation type you avoid","skill":"application","kind":"practice","estimate_minutes":30}]}'::jsonb),

('side_business','Get a small business to its first customers','business',
 'Offer, outreach, delivery, then the boring repeatable bits that actually make money.',3,
 '{"north_star":"Money from strangers, repeatably, without you being the only reason it works.",
   "summary":"Talk to people before you build anything. The plan is weighted to outreach, because that is the part everyone avoids and the only part that produces customers.",
   "skills":[{"key":"offer","label":"Offer","description":"What you sell and why anyone cares"},
             {"key":"outreach","label":"Outreach","description":"Conversations with potential buyers"},
             {"key":"delivery","label":"Delivery","description":"Doing the work well"},
             {"key":"ops","label":"Operations","description":"Admin, pricing, invoicing, systems"}],
   "tracks":[{"key":"revenue","title":"Revenue","goal_line":"From nothing to repeatable income",
     "stages":[{"title":"Offer is clear","description":"One sentence, one price, one buyer type","requires_milestone_titles":["Offer written and priced"]},
               {"title":"First customer","description":"Someone who is not a friend pays you","requires_milestone_titles":["First paying customer"]},
               {"title":"Three customers","description":"Proof it was not luck","requires_milestone_titles":["Three paying customers"]},
               {"title":"It runs without heroics","description":"Delivery and admin are systems, not panic"}]}],
   "milestones":[{"title":"Offer written and priced","detail":"One page: who it is for, what they get, what it costs","skill":"offer","target_label":"Week 2","is_keystone":false},
                 {"title":"20 real conversations","detail":"With people who could actually buy","skill":"outreach","target_label":"Week 6","is_keystone":false},
                 {"title":"First paying customer","detail":"Money received","skill":"outreach","target_label":"Week 8","is_keystone":true},
                 {"title":"Three paying customers","detail":"Repeatable, not accidental","skill":"delivery","target_label":"Month 4","is_keystone":true}],
   "quest_items":[{"title":"Write the offer in one sentence, then cut it in half","skill":"offer","kind":"build","estimate_minutes":25},
                  {"title":"List 20 people or businesses who could buy this","skill":"outreach","kind":"build","estimate_minutes":30},
                  {"title":"Send 5 personal messages to potential buyers","skill":"outreach","kind":"outreach","estimate_minutes":25},
                  {"title":"Follow up with everyone who did not reply last week","skill":"outreach","kind":"outreach","estimate_minutes":20},
                  {"title":"One customer conversation, listen more than you talk","skill":"outreach","kind":"outreach","estimate_minutes":30},
                  {"title":"Write down what the last three people actually complained about","skill":"offer","kind":"review","estimate_minutes":20},
                  {"title":"Price check: what do the alternatives cost?","skill":"offer","kind":"learn","estimate_minutes":25},
                  {"title":"Do the work for one customer, properly","skill":"delivery","kind":"build","estimate_minutes":45},
                  {"title":"Write down the delivery steps so someone else could do it","skill":"ops","kind":"build","estimate_minutes":30},
                  {"title":"Send invoices and chase anything unpaid","skill":"ops","kind":"admin","estimate_minutes":20},
                  {"title":"Update your numbers: sales, costs, what is left","skill":"ops","kind":"admin","estimate_minutes":20},
                  {"title":"Ask a happy customer for one referral","skill":"outreach","kind":"outreach","estimate_minutes":15}]}'::jsonb);
