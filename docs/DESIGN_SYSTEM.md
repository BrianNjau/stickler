# Stickler — visual direction and WP0.5

**Direction: "soft paper, loud characters."** Warm near-white ground, flat pastel tinted cards,
ink navy for every primary action, one hot amber accent reserved for live time, and two mascots
carrying all the personality. Nothing is beige-and-grey. Since WP2.7 there is exactly one gradient,
`liveGradient`, on exactly four things (see "WP2.7 — Polish pass" below); every other gradient is
still forbidden.

**The reference is the canvas** (Stickler Mobile UI Kit, 7 artboards: Sign in, Goal intake,
Today, Focus session, Path, Rewards, and a tokens/components sheet). Build what is drawn there.
`src/ui/tokens.ts` holds every value on that sheet — if a number is in the code, it came from there.

---

## WP0.5 — Design system pass (do this before any more screens)

The scaffold works, but the UI is placeholder. Everything built after this inherits it, so it gets
fixed first. One branch: `wp/0.5-design-system`.

### 1. Fonts
Bundle Bricolage Grotesque (600, 800) and IBM Plex Sans (400, 500, 600) + IBM Plex Mono (500, 600)
via `@expo-google-fonts/bricolage-grotesque`, `.../ibm-plex-sans`, `.../ibm-plex-mono`. Load with
`useFonts` and hold the splash screen until ready (`expo-splash-screen`). System fallbacks stay in
the `Text` component so nothing jumps.

### 2. Icons — approved
Install `lucide-react-native` + `react-native-svg`. It tree-shakes per icon, so the 100 kB concern
doesn't apply. Tab icons: `CalendarDays`, `Route`, `Timer`, `Gift`, `CircleUser`. Never emoji.

### 3. Rebuild `src/ui`
- `tokens.ts` — provided, drop it in as-is.
- `ThemeProvider` — `useColorScheme()`, exposes `theme`, `isDark`, and a `tint(name)` helper that
  returns `{ bg, fg }` so a card never mixes a tint with the wrong text colour.
- `Text` — variants from `text` in tokens (`display | h1 | h2 | h3 | body | small | label | timer |
  mono`), `color` prop keyed to the palette, `allowFontScaling` on.
- `Button` — `primary | secondary | accent | destructive | quiet`, sizes `lg (52) | md (44)`,
  full-width by default on mobile, press state = scale 0.97 + opacity 0.9 over 180 ms, haptic on
  press, `accessibilityRole="button"`, loading state that keeps the width. (WP2.7: the spinner is
  gone; loading is a shimmer across the button. Press is scale 0.97 over 120 ms, spring release.)
- `Card` — `tint?: 'butter'|'mint'|'sky'|'lilac'|'blush'`, `radius.card`, no shadow, no border when
  tinted, `line` border when white.
- `Pill` — priority pills (boss/main/side/rescue), meta pills, round pills. Priority pills follow
  the tokens sheet: name and reward, `BOSS · 30` on blush, `MAIN · 20` on butter, `SIDE · 10`
  neutral, `RESCUE · 1.5×` on mint. The numbers come from `XP` in `shared/types.ts`.
- `TaskRow` — checkbox + title + optional minutes + priority pill + swipe actions.
- `Sheet` — bottom sheet with a grab handle, `radius.sheet`, `elevation.raised`, backdrop at 55%,
  always dismissible by swipe and by an explicit × (nothing traps the user).
- `MascotBubble` — `persona: 'nimbus' | 'snitch'`; Nimbus is sentence case on a sky tint, the Snitch
  is mono uppercase on `snitchBg`. Tail on the bottom-left corner (4 px corner, 16 px elsewhere).
- `Nimbus` and `Snitch` — react-native-svg components with a `mood` prop
  (`idle | focus | happy | sad | cool | sleep` and `asleep | watch | angry`). Copy the paths from
  the canvas artboards; animate with Reanimated, never GIFs.
  **Intended deviation, dark mode:** the Snitch's ink tile gets a 1.5-unit `line2` (dark) edge.
  Without it the tile vanishes into the dark ground. Light mode stays edgeless, as drawn.

### Brand
- Tagline, everywhere (splash, sign-in, store listing): **"Plans that fit the day you actually
  have."** Mono labels drop the full stop. Source: `src/lib/brand.ts`.

### 4. Re-skin what exists
Today (empty state included), the tab bar, and the settings stub. The tab bar is white with a
`line` top border, 56 high plus safe-area inset, active item in ink with a tinted icon, inactive in
`ink3`.

### 5. Build the real Today screen states
Empty ("no plan yet" → goal intake), loading (skeleton cards, not a spinner), and populated, exactly
as drawn. The hero block card is mint; the next-up card is lilac; the pace card is white.

### Acceptance
Screenshots of Today (light + dark, empty + populated), the tab bar and a sheet on a real iPhone via
Expo Go, matched against the canvas. Dynamic type at the largest setting does not clip. Reduce Motion
removes every animation. No hex literal outside `tokens.ts`.

---

## The rules that make it feel like one app

1. **Calm screens are warm white with tinted cards. The focus session is the only dark screen** —
   darkness means the clock is running. Never make Today dark except through the system theme.
2. **Amber marks live time only**: the running ring, the pause button, the streak flame, the REC
   strip. It is never a decorative accent, never a heading colour.
3. **One flat tint per card.** No gradients on cards, no shadows on ordinary cards, no left-border
   accent stripes (the single most over-used AI-app pattern — avoid it everywhere). Depth is earned
   by one hero element per screen (the elevation ladder below).
4. **One primary action per screen**, ink navy, full width, at the bottom of its card.
5. **Characters earn their space.** A mascot bubble appears when it has something to say, and is
   absent otherwise. A screen with nothing to say shows no mascot rather than filler banter.
6. **Numbers are mono, prose is Plex Sans, headings are Bricolage.** Never mix.
7. **The Snitch is loud, not cruel.** Red is for its own surfaces and infractions, never for the
   user's own progress numbers.

## Accessibility rules (non-negotiable, cheaper now than later)
- Text contrast ≥ 4.5:1 (3:1 at 24px+). `ink3` is the lightest text colour, at 12px and above.
- Touch targets ≥ 44, primary buttons 52.
- Every icon-only control has an `accessibilityLabel`.
- Colour never carries meaning alone: priority also carries a word, drift also carries a count.
- Reduce Motion disables all animation; the app stays fully usable.
- Dynamic type to the largest setting without clipping — cards grow, text does not shrink.

## Deliberate departures from the inspiration you sent
- **No hand-drawn marker illustrations** beyond the mascots. One illustration language, not two,
  and the mascots are the thing nobody else has.
- **Tints are flat**, not gradient-washed: gradients date fast and go muddy in dark mode. The one
  exception, `liveGradient`, marks live time only and never washes a surface.
- **Ink navy, not indigo**, for primary actions, so the brand's single hue stays amber.

---

## WP2.7 — Polish pass (docs/POLISH.md)

Additive: palette, type scale, radii and spacing do not change. What changes is depth, one
gradient, motion with a job, and the quality of every state. Reference artboards:
`docs/design/Today · polished`, `Focus · polished`, `Polish kit · depth, motion, states`.

### The one gradient (a deliberate reversal of "no gradients")
- `liveGradient` (`#E0902A → #E2654A`, 135°) is allowed on exactly four things: a running progress
  arc (`<Ring color="live">`), the primary action while a session is live (`<Button variant="live">`,
  and Today's "Start the timer", as drawn), the FAB, and the streak pill.
- `sessionGlow` (amber, radial, 20% → 32% when a round ends) sits behind a ring only.
- **Every other gradient remains forbidden**: not on headings, card backgrounds or page washes, and
  never rainbow or iridescent. Skeleton shimmer is a solid translucent band, not a gradient.
- Enforced: lint forbids `LinearGradient`/`RadialGradient` outside `src/ui/gradient.tsx`.

### Elevation ladder
`elevation.flat` (border only) for everything; `raised` for sheets and the FAB; `hero` for exactly
one element per screen, never two. The hero is an ink card in light mode and the lifted surface in
dark mode (ink on ink would vanish). Heroes: Today's next block, the session ring, Path's current
stage, Vault's crate, You's level card, Settings' plan card, the wizard's question card, the
shape picker's draft card (or the suggested shape when drafting can't run), Review's north star.
Where a screen's one obvious thing is an action (sign-in, the code, first-run, the intro, a
screen-sized empty or error state) that action is the hero. Heroes carry `testID="hero"`.

### Primitives (src/ui)
`Ring`, `DayStrip`, `Segmented` (sliding white thumb), `Fab`, `Skeleton` (shimmer; every loading
state, no spinners anywhere, enforced by lint), `EmptyState` and `ErrorState` (mascot or sentence,
one line, one action), `StatNumber` (every changing number: XP, streak, tokens, percentages),
`TaskCard` (tick: bounce, "+XP" float, boss burst), `LevelUp`, `Rise` (screen enter), `chime`.

### Motion
Everything animates through `useMotion()` (`src/ui/motion.ts`), which checks Reduce Motion first;
lint forbids importing Reanimated's builders anywhere else, so Reduce Motion removes every
animation by construction. Springs: `{ damping: 14, stiffness: 180, mass: 0.9 }` by default,
`{ damping: 9, stiffness: 220, mass: 0.7 }` for overshoot.
