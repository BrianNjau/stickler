# Setting up from an empty `stickler` folder

Roughly 45 minutes, most of it waiting on installs. Do this yourself before the agent starts —
agents are bad at account creation and secrets, and good at code.

## 0. Accounts you need first (all free to start)
| Service | What for | Note |
|---|---|---|
| GitHub | the repo | private to start |
| Supabase | database, auth, functions | free tier; note the project ref, anon key, service role key |
| Expo (EAS) | builds and OTA updates | free account is enough until store submission |
| Anthropic Console | plan generation | set a spend limit on day one |
| Google Cloud | Directions + Places (WP9 only) | enable billing, then set a **quota cap**, not just an alert |

Apple Developer ($99/yr) and Google Play ($25 once) are only needed at store submission. Skip for now.

## 1. Tools
```bash
node -v        # 20 or 22 LTS
npm i -g pnpm eas-cli
brew install supabase/tap/supabase     # or: npm i -g supabase
docker --version                       # needed for `supabase start` locally
```

## 2. Lay down the repo
```bash
cd ~/code/stickler
git init && git branch -M main

# drop the spec bundle in first, so the agent has context before any code exists
unzip ~/Downloads/stickler-spec.zip -d .
mv stickler-app/* . && rmdir stickler-app
mkdir -p docs && mv PROJECT_BRIEF.md AGENT_TASKS.md docs/

git add -A && git commit -m "docs: product brief, work packages, database design, prototype"
```

Your tree should now be:
```
stickler/
  CLAUDE.md                 <- agent context (see below)
  SETUP.md
  README.md
  docs/PROJECT_BRIEF.md
  docs/AGENT_TASKS.md
  shared/types.ts
  supabase/migrations/*.sql
  supabase/functions/*/index.ts
  prototype/focus-strip.html
```

## 3. Supabase, locally first
```bash
supabase init
supabase start                      # local Postgres + Studio on :54323
supabase db reset                   # runs the four migrations in order
supabase gen types typescript --local > shared/database.types.ts
```
Open Studio, confirm the tables exist and `handle_new_user` fired for a test signup.

Then link the hosted project (still free tier):
```bash
supabase link --project-ref <your-ref>
supabase db push                    # same migrations, hosted
supabase secrets set ANTHROPIC_API_KEY=sk-ant-... GOOGLE_MAPS_API_KEY=...
supabase functions deploy generate-plan
supabase functions deploy commute-check
```

## 4. The Expo app skeleton
```bash
pnpm create expo-app@latest app-shell --template blank-typescript
# move its contents to the repo root, keeping the folders above
```
Then install the run-time dependencies the packages assume:
```bash
pnpm add @supabase/supabase-js @tanstack/react-query zustand \
         expo-router expo-sqlite expo-notifications expo-haptics \
         expo-location expo-secure-store react-native-reanimated \
         react-native-gesture-handler react-native-safe-area-context \
         @shopify/react-native-skia date-fns
pnpm add -D typescript @types/react eslint prettier maestro-cli
```
`.env.local` (never committed):
```
EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```
Add to `.gitignore`: `.env*`, `node_modules`, `.expo`, `dist`, `supabase/.temp`.

## 5. Guardrails to set before the agent writes code
- `main` is protected; the agent works on `wp/<number>-<slug>` branches and opens PRs.
- Commit hook that fails on `SERVICE_ROLE` or `sk-ant-` appearing in any file outside `.env`.
- CI (GitHub Actions): `tsc --noEmit`, eslint, unit tests, and `supabase db reset` against the
  migrations. A red build blocks the merge.
- One work package per PR. If a PR touches more than one WP, send it back.

## 6. Order of work
WP0 → WP1 → WP2 → WP3 → WP4 → WP5, then stop and use the app yourself for a week before WP6–WP10.
WP3 is where the app lives or dies; expect to iterate on it twice.
