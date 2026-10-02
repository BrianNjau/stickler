# Changelog

## Unreleased

### Renamed: Focus Strip → Stickler (2026-10-02)
- App name, slug and URL scheme are now `Stickler` / `stickler` / `stickler://`; iOS bundle id and
  Android package are `com.briannjau.stickler`. Tagline: "Plans that fit the day you actually have."
- The Supabase auth session is stored under `stickler-auth-token` (previously the library default),
  so any existing local session is signed out once. No real users yet, so nothing is lost.
- Unchanged on purpose: the mascots (Nimbus, The Snitch), design tokens, the database schema and
  applied migrations, and `prototype/focus-strip.html`, which stays as the historical reference.
