// supabase/functions/generate-plan/index.ts
// Turns a user's plain-language goal into a plan: tracks, stages, milestones and a quest library.
// Called from the goal-intake wizard. This is the only place an LLM key is ever used.
//
// deno deploy: supabase functions deploy generate-plan --no-verify-jwt=false
// secrets: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'jsr:@supabase/supabase-js@2';

const MODEL = 'claude-sonnet-5';
const PROMPT_VERSION = 'plan-v1';
const MAX_GENERATIONS_PER_WEEK = 5;

// The shape the model must return. Keep this in sync with shared/types.ts.
const PLAN_SCHEMA = {
  type: 'object',
  required: ['title', 'domain', 'north_star', 'summary', 'skills', 'tracks', 'milestones', 'quest_items'],
  properties: {
    title:      { type: 'string', description: 'Short name for the goal, 2-6 words' },
    domain:     { type: 'string', enum: ['software','exams','business','fitness','creative','academic','career','admin','other'] },
    north_star: { type: 'string', description: 'One sentence describing what winning looks like, in the user\'s own terms' },
    summary:    { type: 'string', description: 'One paragraph explaining the plan and its logic' },
    skills: {
      type: 'array', minItems: 3, maxItems: 6,
      items: { type: 'object', required: ['key','label','description'],
        properties: { key: {type:'string'}, label: {type:'string'}, description: {type:'string'} } }
    },
    tracks: {
      type: 'array', minItems: 1, maxItems: 2,
      items: { type: 'object', required: ['key','title','goal_line','stages'],
        properties: {
          key: {type:'string'}, title: {type:'string'}, goal_line: {type:'string'},
          stages: { type: 'array', minItems: 4, maxItems: 7,
            items: { type:'object', required:['title','description'],
              properties: { title:{type:'string'}, description:{type:'string'},
                            requires_milestone_titles:{type:'array',items:{type:'string'}} } } }
        } }
    },
    milestones: {
      type: 'array', minItems: 3, maxItems: 10,
      items: { type:'object', required:['title','detail','skill','target_label','is_keystone'],
        properties: { title:{type:'string'}, detail:{type:'string'}, skill:{type:'string'},
                      target_label:{type:'string'}, is_keystone:{type:'boolean'} } }
    },
    quest_items: {
      type: 'array', minItems: 20, maxItems: 60,
      items: { type:'object', required:['title','skill','kind','estimate_minutes'],
        properties: { title:{type:'string'}, detail:{type:'string'}, skill:{type:'string'},
                      kind:{type:'string',enum:['learn','practice','lab','review','build','outreach','admin']},
                      estimate_minutes:{type:'integer',minimum:10,maximum:90} } }
    },
    mascot_lines: {
      type: 'array', maxItems: 12,
      items: { type:'object', required:['persona','event','body'],
        properties:{ persona:{type:'string',enum:['nimbus','snitch']}, event:{type:'string'}, body:{type:'string'} } }
    }
  }
} as const;

const SYSTEM = `You design realistic personal plans for a productivity app called Stickler.

The user gives you a goal in their own words plus their real constraints. You return ONE plan
structured as tracks → stages → milestones, plus a library of repeatable quest items that the app
rotates into daily blocks.

Hard rules:
1. FIT THE HOURS THEY HAVE. If they say 5 hours a week, the plan must be completable in 5 hours a
   week. Never design a plan that needs more time than they stated.
2. Quest items are concrete, single-sitting units of work with honest time estimates: "25 timed
   practice questions on X", "call 5 leads from the list", "write the method section", not "study
   hard" or "work on business".
3. Estimates are the time a normal, slightly tired human needs, not the best case.
4. Stages are outcomes, not activities. "First paying customer", not "do marketing".
5. Milestones are checkable events with a fuzzy target like "Mid-Nov 2026". Mark the genuinely big
   ones (exams, certifications, launches, first revenue) as keystones.
6. Cover 3-6 skills so the rotation engine can notice neglect. Every quest item names one.
7. Two tracks maximum. Use a second track only when the user genuinely has two parallel ambitions.
8. No medical, legal or financial advice. If the goal involves health, keep it to habits and
   training structure, and never prescribe diets, calories or treatment.
9. If the goal is vague, still produce a plan, and put the clarifying question in the summary.

Optional mascot_lines: up to 12 lines in the voice of Nimbus (warm, absurd, encouraging) or the
Snitch (deadpan, bureaucratic, petty about paperwork), specific to this goal's world. PG only:
no profanity, nothing about the user's body, intelligence or worth. Mock the task, never the person.`;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const auth = req.headers.get('Authorization') ?? '';
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const asUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
  });

  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return json({ error: 'unauthorized' }, 401);

  const { goal_id } = await req.json();
  const { data: goal } = await asUser.from('goals').select('*').eq('id', goal_id).single();
  if (!goal) return json({ error: 'goal not found' }, 404);

  // cost guard: N generations per user per rolling week
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const { count } = await admin.from('ai_generations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id).gte('created_at', since);
  if ((count ?? 0) >= MAX_GENERATIONS_PER_WEEK) {
    return json({ error: 'rate_limited', message: 'Plan generation limit reached for this week.' }, 429);
  }

  const { data: settings } = await asUser.from('user_settings').select('*').single();

  const userMsg = [
    `GOAL (their words): ${goal.raw_input}`,
    goal.why ? `WHY IT MATTERS TO THEM: ${goal.why}` : '',
    `HORIZON: ${goal.horizon}`,
    `TIME AVAILABLE: about ${Math.round((settings?.daily_capacity_minutes ?? 120) * 5 / 60)} hours per week`,
    `WORKDAY WINDOW: ${settings?.workday_start}–${settings?.workday_end}, rest days: ${settings?.rest_days}`,
    `OTHER CONSTRAINTS: ${JSON.stringify(goal.constraints ?? {})}`,
  ].filter(Boolean).join('\n');

  const started = Date.now();
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      system: SYSTEM,
      tools: [{ name: 'emit_plan', description: 'Return the finished plan', input_schema: PLAN_SCHEMA }],
      tool_choice: { type: 'tool', name: 'emit_plan' },
      messages: [{ role: 'user', content: userMsg }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    await admin.from('ai_generations').insert({ user_id: user.id, kind: 'plan', goal_id, model: MODEL,
      prompt_version: PROMPT_VERSION, status: 'error', error: err.slice(0, 500) });
    return json({ error: 'generation_failed' }, 502);
  }

  const body = await res.json();
  const plan = body.content.find((c: any) => c.type === 'tool_use')?.input;
  if (!plan) return json({ error: 'no_plan' }, 502);

  // ── persist (service role, but every row carries user_id) ──────────────────
  const { data: planRow } = await admin.from('plans').insert({
    user_id: user.id, goal_id, summary: plan.summary, north_star: plan.north_star,
    skills: plan.skills, generated_by: 'ai', model: MODEL,
    version: await nextVersion(admin, goal_id),
  }).select().single();

  await admin.from('goals').update({ title: plan.title, domain: plan.domain }).eq('id', goal_id);

  const msRows = plan.milestones.map((m: any, i: number) => ({
    plan_id: planRow.id, user_id: user.id, title: m.title, detail: m.detail, skill: m.skill,
    target_label: m.target_label, is_keystone: m.is_keystone, position: i,
    xp_value: m.is_keystone ? 500 : 300, token_value: m.is_keystone ? 5 : 3,
  }));
  const { data: milestones } = await admin.from('milestones').insert(msRows).select();

  for (const [ti, t] of plan.tracks.entries()) {
    const { data: track } = await admin.from('tracks').insert({
      plan_id: planRow.id, user_id: user.id, key: t.key, title: t.title, goal_line: t.goal_line, position: ti,
    }).select().single();

    await admin.from('stages').insert(t.stages.map((s: any, si: number) => ({
      track_id: track.id, user_id: user.id, title: s.title, description: s.description, position: si,
      requires_milestones: (s.requires_milestone_titles ?? [])
        .map((title: string) => milestones?.find((m) => m.title === title)?.id)
        .filter(Boolean),
    })));
  }

  await admin.from('quest_items').insert(plan.quest_items.map((q: any) => ({
    user_id: user.id, plan_id: planRow.id, title: q.title, detail: q.detail ?? null,
    skill: q.skill, kind: q.kind, estimate_minutes: q.estimate_minutes, source: 'ai',
    default_priority: q.estimate_minutes >= 30 ? 'main' : 'side',
  })));

  if (plan.mascot_lines?.length) {
    await admin.from('character_lines').insert(plan.mascot_lines.map((l: any) => ({
      persona: l.persona, event: l.event, body: l.body, domain: plan.domain,
      source: 'ai', approved: true, user_id: user.id,
    })));
  }

  await admin.from('ai_generations').insert({
    user_id: user.id, kind: 'plan', goal_id, model: MODEL, prompt_version: PROMPT_VERSION,
    input_tokens: body.usage?.input_tokens, output_tokens: body.usage?.output_tokens,
    cost_usd: estimateCost(body.usage), status: 'ok',
  });

  await admin.from('events').insert({ user_id: user.id, name: 'plan_generated',
    props: { goal_id, ms: Date.now() - started, quests: plan.quest_items.length } });

  return json({ plan_id: planRow.id, plan });
});

async function nextVersion(admin: any, goalId: string) {
  const { data } = await admin.from('plans').select('version').eq('goal_id', goalId)
    .order('version', { ascending: false }).limit(1);
  return (data?.[0]?.version ?? 0) + 1;
}
function estimateCost(u: any) {
  if (!u) return null;
  return +(((u.input_tokens ?? 0) / 1e6) * 3 + ((u.output_tokens ?? 0) / 1e6) * 15).toFixed(4);
}
function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } });
}
