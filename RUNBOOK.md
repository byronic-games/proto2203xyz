# Runbook (Fast Checks)

## Start Local
- Serve repo root with any static server.
- Open `index.html`.

## 5-Minute Smoke
1. Start Blue run.
2. Confirm `Cards Cleared` starts at 1 and `Cards Remaining` at 51.
3. Make one correct guess and one wrong guess path.
4. Confirm deck picker order is Blue, Green, Red.
5. Confirm locked decks/levels are visibly greyed out.
6. Open `daily.html`, `heroes.html`, `profile.html` and confirm no load errors.

## Tutorial / Modal Check
1. Replay tutorial from Settings if needed.
2. Confirm the current-card tutorial highlight hugs the actual card element and throbs.
3. Confirm the next-card / face-down-card tutorial highlight hugs the actual card element and throbs.
4. Confirm power choice cards are tappable during tutorial.
5. Confirm cheat choice cards are tappable during tutorial.
6. Confirm `Higher / Lower` is hidden whenever power or cheat choice modals are open.

## Gameplay Layout Check
1. Test a normal mobile viewport and a short mobile viewport.
2. Confirm the header, card pair, message bar, cheat coin row, controls, and memory grid all fit inside the visible game screen.
3. Confirm the page itself does not scroll during gameplay; the fixed layout should fit within `--app-height`.
4. Confirm current-card, next-card, and reveal overlay remain exactly aligned during a guess.
5. Confirm cheat coins stay circular, rarity-colored, centered in the cheat row, and keep count badges readable.
6. Confirm NEW visuals show corner ranks and image-backed suits on cards and memory-grid cells.
7. On Android, repeat the check in browser and standalone/home-screen mode because `js/fullscreen.js` uses `visualViewport.height`.

## Animation Check (Current Priority)
1. On Android Chrome, make a guess.
2. Verify next-card flip reveals face during animation.
3. Verify promoted current card shows true value after move.
4. Re-test with next-card value modifier case (nudged/temporary value scenario).

## Daily Board Check
1. Open same date on two devices.
2. Entry count/order should match.
3. Tied scores share rank.
4. Crowns should be per-player, not per-viewer.
5. For a completed local Daily attempt that failed to save online, opening that Daily board while connected should upload the missing row.

## Deploy Hygiene
- After JS/CSS edits, bump query strings in:
  - `index.html`
  - `game.html`
  - `daily.html`
  - `heroes.html`
  - `profile.html`
  - `settings.html`
- `.htaccess` now forces HTML-like files to revalidate, but do not rely on that alone for JS/CSS changes.

## Supabase Quick Health
- `daily_52`: anon `SELECT` + `INSERT`.
- `heroes_52`: anon `SELECT`.
- If Daily hangs on "Loading Daily Board":
  1. check browser network response
  2. check RLS/API permissions
  3. check client-side JS errors
