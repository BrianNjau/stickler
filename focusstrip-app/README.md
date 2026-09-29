# Focus Strip — spec bundle

Hand this whole folder to the coding agent. Read in this order:

| File | What it is |
|---|---|
| `PROJECT_BRIEF.md` | Product, stack decisions, the three algorithms, risks, definition of done |
| `AGENT_TASKS.md` | Work packages WP0–WP10 in build order, with acceptance criteria |
| `supabase/migrations/01_schema.sql` | Tables, enums, indexes |
| `supabase/migrations/02_rls.sql` | Row-level security + new-user bootstrap |
| `supabase/migrations/03_functions.sql` | RPC layer: XP, sessions, rotation, pace, feasibility |
| `supabase/migrations/04_seed.sql` | Badge catalogue + mascot line library |
| `supabase/functions/generate-plan/` | Goal → plan (the only LLM call) |
| `supabase/functions/commute-check/` | Directions API + cache + feasibility |
| `shared/types.ts` | Types, XP constants, RPC names shared by app and backend |
| `prototype/focus-strip.html` | The working single-file prototype: the behavioural spec |

## Quick start
```bash
supabase init && supabase start
supabase db reset                 # runs the four migrations in order
supabase gen types typescript --local > shared/database.types.ts
supabase functions new generate-plan   # then paste the provided index.ts
supabase secrets set ANTHROPIC_API_KEY=... GOOGLE_MAPS_API_KEY=...
```

## Open decisions (Brian to confirm before WP2 and WP9)
1. **App name.** "Focus Strip" is a working title; check store availability before the icon work.
2. **LLM budget per user.** Currently 5 plan generations per rolling week. Cheaper: 2.
3. **Maps at launch.** Directions is billed per call. WP9 can ship behind a flag for beta users only.
4. **Free vs paid split.** Suggested: free = one goal, one plan, full timer; paid = multiple goals,
   weekly AI review, commute assistant, history beyond 30 days.
5. **Anonymous trial.** Recommended: let people use it for a day before signing up. Costs a little
   complexity in WP1, buys a lot of activation.
