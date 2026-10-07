// RLS smoke test: two real users against a real Supabase. User A must never read, change or create
// user B's profiles, user_settings or goals rows — nor B's plan: plans, tracks, stages, milestones
// and quest_items (each user's plan is made by fn_apply_template, as the app does).
//
// It fails if a policy is removed, in either direction:
//  - RLS disabled on a table → A can see B's rows → the "cannot read" tests fail.
//  - The "own …" policy dropped (RLS still on) → A can't see their OWN row → the "own rows" test fails.
//
// Users are anonymous sign-ins: two genuine auth.users rows with their own JWTs, no inbox and no
// service-role key needed. Requires "Allow anonymous sign-ins" (dashboard) / enable_anonymous_sign_ins
// (supabase/config.toml).
//
//   pnpm test:rls                    reads EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY from .env.local
//   SUPABASE_URL=… SUPABASE_ANON_KEY=… pnpm test:rls       (CI: the local stack)
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { after, before, describe, test } from 'node:test';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '../../shared/database.types.ts';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const url = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const makeClient = (u: string, k: string) =>
  createClient<Database>(u, k, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
type Client = ReturnType<typeof makeClient>;
interface Actor {
  name: string;
  client: Client;
  id: string;
  goalId: string;
  planId: string;
}

const PLAN_TABLES = ['plans', 'tracks', 'stages', 'milestones', 'quest_items'] as const;
type PlanTable = (typeof PLAN_TABLES)[number];

async function signUp(name: string): Promise<Actor> {
  assert.ok(url && anonKey, 'Set SUPABASE_URL and SUPABASE_ANON_KEY (or EXPO_PUBLIC_* in .env.local)');
  const client = makeClient(url, anonKey);
  const { data, error } = await client.auth.signInAnonymously();
  assert.ifError(error ? new Error(`${name}: anonymous sign-in failed — ${error.message}`) : null);
  const id = data.user!.id;
  const goal = await client
    .from('goals')
    .insert({ user_id: id, raw_input: `RLS smoke test (${name})`, title: `rls-${name}` })
    .select('id')
    .single();
  assert.ifError(goal.error);
  const plan = await client.rpc('fn_apply_template', { p_goal: goal.data.id, p_template: 'exam_prep' });
  assert.ifError(plan.error);
  return { name, client, id, goalId: goal.data.id, planId: plan.data!.id };
}

describe('RLS: users only ever touch their own rows', () => {
  let a: Actor;
  let b: Actor;

  before(async () => {
    a = await signUp('A');
    b = await signUp('B');
    assert.notEqual(a.id, b.id);
  });

  after(async () => {
    for (const actor of [a, b]) {
      if (!actor) continue;
      // Cascades to the plan, tracks, stages, milestones and quest_items.
      await actor.client.from('goals').delete().eq('id', actor.goalId);
      await actor.client.auth.signOut();
    }
  });

  test('each user can read their own profile, settings and goal', async () => {
    for (const me of [a, b]) {
      const p = await me.client.from('profiles').select('id').eq('id', me.id);
      const s = await me.client.from('user_settings').select('user_id').eq('user_id', me.id);
      const g = await me.client.from('goals').select('id').eq('id', me.goalId);
      assert.ifError(p.error ?? s.error ?? g.error);
      assert.equal(p.data?.length, 1, `${me.name} should see own profile (policy "own profile")`);
      assert.equal(s.data?.length, 1, `${me.name} should see own settings (policy "own settings")`);
      assert.equal(g.data?.length, 1, `${me.name} should see own goal (policy "own goals")`);
    }
  });

  test("A cannot read B's profile", async () => {
    const r = await a.client.from('profiles').select('*').eq('id', b.id);
    assert.ifError(r.error);
    assert.deepEqual(r.data, []);
    const all = await a.client.from('profiles').select('id');
    assert.ok(all.data?.every((row) => row.id === a.id), 'an unfiltered read returns only A');
  });

  test("A cannot read B's user_settings", async () => {
    const r = await a.client.from('user_settings').select('*').eq('user_id', b.id);
    assert.ifError(r.error);
    assert.deepEqual(r.data, []);
    const all = await a.client.from('user_settings').select('user_id');
    assert.ok(all.data?.every((row) => row.user_id === a.id), 'an unfiltered read returns only A');
  });

  test("A cannot read B's goals", async () => {
    const r = await a.client.from('goals').select('*').eq('user_id', b.id);
    assert.ifError(r.error);
    assert.deepEqual(r.data, []);
    const all = await a.client.from('goals').select('user_id');
    assert.ok(all.data?.every((row) => row.user_id === a.id), 'an unfiltered read returns only A');
  });

  test("A cannot change B's settings or profile", async () => {
    const s = await a.client.from('user_settings').update({ snitch_intensity: 0 }).eq('user_id', b.id).select();
    const p = await a.client.from('profiles').update({ display_name: 'pwned' }).eq('id', b.id).select();
    assert.deepEqual(s.data ?? [], [], 'update reached B’s settings');
    assert.deepEqual(p.data ?? [], [], 'update reached B’s profile');
    const check = await b.client.from('user_settings').select('snitch_intensity').eq('user_id', b.id).single();
    assert.equal(check.data?.snitch_intensity, 2, 'B’s settings are untouched');
  });

  test("A cannot create or delete B's goals", async () => {
    const ins = await a.client.from('goals').insert({ user_id: b.id, raw_input: 'forged', title: 'forged' }).select();
    assert.ok(ins.error, 'insert with someone else’s user_id must be rejected');
    const del = await a.client.from('goals').delete().eq('id', b.goalId).select();
    assert.deepEqual(del.data ?? [], []);
    const still = await b.client.from('goals').select('id').eq('id', b.goalId);
    assert.equal(still.data?.length, 1, 'B’s goal survived');
  });

  // ── WP2: the plan tables ───────────────────────────────────────────────────────────────────

  /** All of one user's rows in a plan table, read as `viewer`. */
  const rowsOf = async (viewer: Actor, table: PlanTable, owner: Actor) =>
    table === 'plans'
      ? viewer.client.from('plans').select('id, user_id').eq('id', owner.planId)
      : table === 'stages'
        ? viewer.client.from('stages').select('id, user_id').eq('user_id', owner.id)
        : viewer.client.from(table).select('id, user_id').eq('plan_id', owner.planId);

  test('each user can read their own plan, tracks, stages, milestones and quests', async () => {
    for (const me of [a, b]) {
      for (const table of PLAN_TABLES) {
        const r = await rowsOf(me, table, me);
        assert.ifError(r.error);
        assert.ok((r.data?.length ?? 0) > 0, `${me.name} should see own ${table} (policy "own …")`);
      }
    }
  });

  for (const table of PLAN_TABLES) {
    test(`A cannot read B's ${table}`, async () => {
      const r = await rowsOf(a, table, b);
      assert.ifError(r.error);
      assert.deepEqual(r.data, [], `A could read B's ${table}`);
      const all = await a.client.from(table).select('user_id');
      assert.ok(all.data?.every((row) => row.user_id === a.id), `an unfiltered ${table} read returns only A`);
    });
  }

  test("A cannot change or delete B's plan rows", async () => {
    const stage = await b.client.from('stages').select('id, title').eq('user_id', b.id).limit(1).single();
    const quest = await b.client.from('quest_items').select('id, estimate_minutes').eq('plan_id', b.planId).limit(1).single();
    assert.ifError(stage.error ?? quest.error);

    const s = await a.client.from('stages').update({ title: 'pwned' }).eq('id', stage.data!.id).select();
    const q = await a.client.from('quest_items').update({ estimate_minutes: 240 }).eq('id', quest.data!.id).select();
    const p = await a.client.from('plans').update({ is_active: false }).eq('id', b.planId).select();
    const d = await a.client.from('milestones').delete().eq('plan_id', b.planId).select();
    for (const [what, r] of [['stage', s], ['quest', q], ['plan', p], ['milestones', d]] as const) {
      assert.deepEqual(r.data ?? [], [], `A's write reached B's ${what}`);
    }

    const still = await b.client.from('stages').select('title').eq('id', stage.data!.id).single();
    assert.equal(still.data?.title, stage.data!.title, 'B’s stage is untouched');
    const ms = await b.client.from('milestones').select('id').eq('plan_id', b.planId);
    assert.ok((ms.data?.length ?? 0) > 0, 'B’s milestones survived');
  });

  test("A cannot add rows to B's account or apply a template to B's goal", async () => {
    const ins = await a.client.from('quest_items').insert({ user_id: b.id, plan_id: b.planId, title: 'forged', kind: 'learn' }).select();
    assert.ok(ins.error, 'a quest owned by someone else must be rejected');
    const tpl = await a.client.rpc('fn_apply_template', { p_goal: b.goalId, p_template: 'exam_prep' });
    assert.ok(tpl.error, 'fn_apply_template must refuse a goal that is not yours');
    const plans = await b.client.from('plans').select('id').eq('goal_id', b.goalId);
    assert.equal(plans.data?.length, 1, 'no plan was created on B’s goal');
  });
});
