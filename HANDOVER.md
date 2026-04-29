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
- Daily leaderboard loads now retry-upload a completed local Daily attempt if the matching `date_key` + `player_id` row is missing online.
- Daily now has a share button on the result panel, but it is intentionally code-gated off for now with `DAILY_SHARE_ENABLED = false` in `js/daily-page.js`.
- Android standalone/home-screen sizing was tightened using `visualViewport.height` plus short-screen CSS compression.
- Mobile cache behavior is now split:
  - HTML / manifest-style files revalidate via `.htaccess`
  - versioned JS / CSS assets remain aggressively cacheable
- Tutorial highlighting now styles the actual target element instead of positioning a separate floating highlight box. Current-card and next-card focus classes are preserved through `js/render.js` redraws, and `.tutorial-focus-target` has a cyan throbbing ring in `styles.css`.

## Non-Negotiables
- Do not wipe player storage unless explicitly asked.
- Keep unlock order and existing progress compatible.
- Keep mobile layout stable first; desktop is secondary.
- After JS/CSS edits, bump HTML query versions on pages that load them even though HTML now revalidates on the server.
- Avoid broad refactors unless requested.

## Current Known Live Bug
- Card reveal flip animation can rotate without showing face on some Android browsers.
- Most recent work attempted both:
  - 3D two-sided 180 flip
  - midpoint swap (flip-out / flip-in)
- Status: still reported as broken on-device; see `KNOWN_ISSUES.md`.

## Recently Touched Areas
- Tutorial flow in `js/input.js`:
  - power-pick blocking relaxed
  - cheat-choice progression split from streak-building
  - floating highlight plumbing removed
- Tutorial focus visuals in `js/render.js` and `styles.css`:
  - render-owned card elements preserve `tutorial-focus-target` after redraws
  - current-card / face-down-card highlights throb again
- Choice modal visibility in `js/render.js` and `styles.css`:
  - `body.choice-modal-open` hides the gameplay guess row
- Daily local-to-remote repair in `js/daily.js`:
  - completed local attempts are checked against Supabase when fetching that date's board
  - missing online rows are posted before the board renders
- Cache behavior:
  - `.htaccess` now sends `no-cache` headers for HTML-like files
  - `game.html` / `daily.html` asset query strings were bumped alongside JS/CSS fixes

## Crown/Leaderboard Rules (Current)
- Daily board should render crowns from row-backed enrichment only (not viewer-local state).
- Blue/Green/Red crowns from clear booleans.
- Gold daily crown from durable daily clear signal and legacy fallback logic.

## Quick "Do First" For New AI
1. Run `RUNBOOK.md` smoke checks.
2. Reproduce current flip bug on Android profile.
3. Re-test tutorial overlays and choice-modal behavior on mobile before changing adjacent UI; confirm current-card and next-card highlights are visible and throbbing.
4. Patch minimally and verify Daily/Heroes/Profile did not regress.
5. If Daily sharing is being revisited, start in `js/daily-page.js` and keep the toggle code-only unless explicitly asked to expose it in the UI.
