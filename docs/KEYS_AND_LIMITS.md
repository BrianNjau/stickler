# Keys, quotas and spend caps

Two paid services: Anthropic (plan generation) and Google (Directions, later Places). Both are
capped in three places — at the provider, in the Edge Function, and in the database — because any
one of them alone eventually fails. Set all three before the keys go live.

---

## 1. Anthropic

**At the provider (console.anthropic.com → Billing → Limits)**
- Monthly spend limit: **$20** while in beta. Raise it when you have paying users, not before.
- Email alert at 50% and 80%.
- Create a **separate API key per environment**: `stickler-dev`, `stickler-prod`. Never share one.

**In the Edge Function** (`supabase/functions/generate-plan/index.ts`)
```ts
const MODEL = Deno.env.get('PLAN_MODEL') || 'claude-sonnet-5-5'; // secret; claude-haiku-4-5-20251001 for dev
const EFFORT = Deno.env.get('PLAN_EFFORT') || 'low'; // Sonnet 5.5 always thinks, and thinking counts toward
                                     // MAX_OUTPUT_TOKENS: at the default `high` it ran out before the plan
const MAX_GENERATIONS_PER_WEEK = 3;  // per user, rolling 7 days; a repair re-prompt is part of the same one
const MAX_OUTPUT_TOKENS = 8000;      // a plan that needs more than this is too big to follow
```
Add a global daily brake so one bad actor cannot drain the month:
```ts
const DAILY_GLOBAL_CAP = 150;        // generations across all users per UTC day
// count ai_generations where created_at > date_trunc('day', now()) before calling the model
```

**In the database** — already present: every call is logged to `ai_generations` with
`input_tokens`, `output_tokens` and `cost_usd`. Watch it with:
```sql
select date_trunc('day', created_at) d, count(*), round(sum(cost_usd), 2) usd
from ai_generations group by 1 order by 1 desc limit 14;
```

**Expected cost.** Measured in WP2.5 (Sonnet 5.5 at $2/$10 per MTok, effort low): one call is
about 3k input and 4k output tokens, $0.04–0.05. Today almost every plan needs the one repair
re-prompt (the first draft overshoots the weekly hours), so a generation is two calls, about
**$0.10–0.12**, and 50–80 seconds. Dev runs on Haiku 4.5 cost about $0.04 each. At 3 per user per week, 100 active users is roughly **$30–40 a
month worst case**, and far less in practice because most users generate once and then live off
the rotation engine. The rotation does not call the model at all; that is the design decision that
keeps this affordable.

---

## 2. Google (Directions, then Places)

**At the provider (Google Cloud Console)**
1. Create a project `stickler`, enable **Directions API** only for now.
2. **APIs & Services → Credentials → the key → Restrict key**: restrict to Directions API, and
   restrict by IP to Supabase's Edge egress if you can obtain it. The key lives only in Supabase
   secrets, never in the app.
3. **APIs & Services → Quotas**: set *Directions requests per day* to **500** and *per minute per
   user* to **60**. This is the hard stop — a quota cap refuses requests, a billing alert only
   emails you after the money is gone. Set both.
4. **Billing → Budgets & alerts**: budget **$10/month**, alerts at 50/90/100%.

**In the Edge Function** (`commute-check/index.ts`) — already present:
- Shared `travel_cache`, keyed by rounded coordinates, mode and a 15-minute departure bucket, 24h TTL.
- `MAX_CALLS_PER_USER_PER_DAY = 20`. Lower it to **8** for beta: a normal day has at most two or
  three legs.

**Keep the free paths free.** Only call Directions when a day actually has commute legs attached
and the user has `commute_assist_on`. Default that setting to **off**.

---

## 3. Supabase
Free tier, two projects (`stickler-dev`, `stickler-prod`). Watch three numbers monthly: database
size (500 MB), monthly active users (50k), and Edge Function invocations. The `events` table is the
one that grows without limit — add the retention job now rather than later:
```sql
delete from events where created_at < now() - interval '90 days';
```

---

## 4. Setting the secrets
```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref <prod-ref>
supabase secrets set GOOGLE_MAPS_API_KEY=AIza... --project-ref <prod-ref>
supabase functions deploy generate-plan
supabase functions deploy commute-check
```
Then flip the modes in `.env.local` one at a time: `EXPO_PUBLIC_AI_MODE=live` first, verify a real
plan generates and `ai_generations` logs a cost, and leave `EXPO_PUBLIC_MAPS_MODE=mock` until WP9.

**The templates stay.** With AI live, the goal wizard should still offer the three templates as a
first-class choice, not a fallback: they are instant, free and deterministic, and most goals fit
one. Use the model for goals that genuinely do not.
