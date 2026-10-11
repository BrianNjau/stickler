# WP2.7 — Polish pass

The app is correct and forgettable. This package makes it feel expensive. It is additive: the
palette, type scale, radii and spacing in `src/ui/tokens.ts` do not change. What changes is depth,
one gradient, motion, and the quality of every state.

**Reference:** the three new artboards — `docs/design/today-pro.png`, `focus-pro.png`,
`polish-kit.png`. Build what is drawn.

---

## 1. One rule is reversed, deliberately

The old rule was "no gradients". That is why the app reads flat. It is replaced by:

```ts
// tokens.ts additions
export const liveGradient = ['#E0902A', '#E2654A'] as const;  // 135°
export const sessionGlow  = 'rgba(224,144,42,0.20)';           // radial, behind the ring only
```

`liveGradient` is allowed on exactly four things: a running progress arc, the primary action while a
session is live, the FAB, and the streak pill. Nowhere else — not headings, not card backgrounds,
not a page wash. Every other gradient remains forbidden, especially rainbow or iridescent ones.

## 2. Elevation ladder

```ts
export const elevation = {
  flat:   {},                                                     // border only
  raised: { shadowColor:'#16202A', shadowOpacity:0.28, shadowRadius:16,
            shadowOffset:{width:0,height:6}, elevation:6 },
  hero:   { shadowColor:'#16202A', shadowOpacity:0.55, shadowRadius:34,
            shadowOffset:{width:0,height:18}, elevation:14 },
} as const;
```
**One `hero` element per screen, never two.** Today: the next-block card. Session: the ring. Vault:
the crate. Path: the current stage. Everything else is `flat`, with `raised` reserved for sheets and
the FAB.

## 3. Components to add

- **`<Ring>`** — SVG progress ring. Props: `value`, `size`, `stroke`, `color | 'live'`, `label`.
  Stroke 8 at 86px, 6 at 56px, round caps, track in `line`. Fills with a spring on mount and on
  every change, never a linear tween.
- **`<DayStrip>`** — horizontal date selector, seven days, today's pill larger and in ink with an
  amber weekday label. Springs when the selection moves. Scrolls, snaps, remembers position.
- **`<Segmented>`** — the Left/Done switch: pill track in `surface2`, selected thumb in white with
  the `raised` shadow, slides with a spring.
- **`<Fab>`** — 60px, radius 22, `liveGradient`, amber-tinted shadow, bottom-right above the tab
  bar, hidden during a session.
- **`<Skeleton>`** — shimmering placeholder blocks in the real layout shape. **Every loading state
  uses this. No spinners anywhere in the app.**
- **`<EmptyState>`** — mascot, one line, one action. No empty screen ships without one.
- **`<StatNumber>`** — animates from the old value to the new one (~600 ms), tabular numerals.
  Every number that changes uses it: XP, streak, tokens, percentages.

## 4. Motion spec (all skipped under Reduce Motion)

| Event | What happens |
|---|---|
| Task ticked | Box 1 → 1.25 → 1 (spring, damping 9), "+20 XP" floats up 44px and fades, light haptic |
| Boss ticked | As above, plus a 12-piece burst and a heavy haptic. No screen shake on mobile |
| Card press | Scale 0.97 over 120 ms, releases with a spring |
| Screen enter | Cards rise 12px and fade in, 40 ms stagger |
| Ring change | Dashoffset springs to the new value over ~700 ms |
| Round ends | Ring pulses once, glow 20% → 32%, success haptic, chime |
| Mascot speaks | Bubble scales 0.9 → 1 from its tail, text types at 14 ms a character |
| Day strip | Selected pill grows to 54px, others settle, spring over 200 ms |
| Level up | Full-screen takeover: rays rotate, number counts up, burst, chime |

Reanimated springs by default: `{ damping: 14, stiffness: 180, mass: 0.9 }`, and
`{ damping: 9, stiffness: 220, mass: 0.7 }` where overshoot is wanted.

## 5. Screen work

**Today** — day strip under the header; the next-block card becomes the hero in ink with the day
ring, a gradient "Start the timer" button and a soft radial glow; tasks become cards with the
priority pill on a second line; segmented Left/Done; FAB; mascot line only when there is something
to say.

**Session** — dark ground `#0E141A`, a radial amber glow behind a 268px ring, the timer at 60px in
mono, round pips rather than text, three circular controls, the Snitch tile with a drop shadow and
its bubble bordered in its own red.

**Everything else** — apply the ladder, the rings, skeletons and empty states to Path, Vault,
Settings and the goal wizard. No screen keeps a bare spinner or an undesigned empty state.

## Acceptance
- Screenshots of every screen, light and dark, 390 and 1280, against the artboards.
- A screen recording of: ticking a task, ticking a boss, starting a session, a round ending.
- Reduce Motion on: every animation gone, app fully usable.
- Largest Dynamic Type: nothing clipped.
- No hex literal outside `tokens.ts`; no spinner anywhere; exactly one `hero` element per screen.
