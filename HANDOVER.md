# 52! Handover (Ops Snapshot)

## Read Order
1. `RUNBOOK.md`
2. `KNOWN_ISSUES.md`
3. `NEXT_TASKS.md`
4. `DATA_CONTRACTS.md`
5. `STATE_MAP.md`
6. `AI_STARTER_PROMPT.md`

## Product Snapshot
- Mobile-first static web app.
- Main surfaces: `index.html`, `game.html`, `daily.html`, `heroes.html`, `profile.html`, `settings.html`.
- Deck progression order: Blue -> Green -> Red.
- Levels: 1-4 currently wired for Blue, Green, Red.
- Daily and Heroes use Supabase when online; local fallback exists.

## Non-Negotiables
- Do not wipe player storage unless explicitly asked.
- Keep unlock order and existing progress compatible.
- Keep mobile layout stable first; desktop is secondary.
- After JS/CSS edits, bump HTML query versions on pages that load them.
- Avoid broad refactors unless requested.

## Current Known Live Bug
- Card reveal flip animation can rotate without showing face on some Android browsers.
- Most recent work attempted both:
  - 3D two-sided 180 flip
  - midpoint swap (flip-out / flip-in)
- Status: still reported as broken on-device; see `KNOWN_ISSUES.md`.

## Crown/Leaderboard Rules (Current)
- Daily board should render crowns from row-backed enrichment only (not viewer-local state).
- Blue/Green/Red crowns from clear booleans.
- Gold daily crown from durable daily clear signal and legacy fallback logic.

## Quick “Do First” For New AI
1. Run `RUNBOOK.md` smoke checks.
2. Reproduce current flip bug on Android profile.
3. Patch minimally and verify Daily/Heroes/Profile did not regress.
