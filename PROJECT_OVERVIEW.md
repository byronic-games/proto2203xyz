# Project Overview (Concise)

## What It Is
- `52!` is a browser-based higher/lower card game with progression, powers, cheats, and shared Daily mode.
- Mobile-first UI; desktop is supported but not primary.

## Core Surfaces
- `index.html`: entry hub
- `game.html`: run gameplay
- `daily.html`: daily challenge + leaderboard
- `heroes.html`: clear board
- `profile.html`: local player stats/crowns
- `settings.html`: config/reset tools
- Daily sharing exists in UI but is currently disabled by a code flag in `js/daily-page.js` until we turn it back on.

## Deck/Progression Model
- Start: Blue Level 1 unlocked.
- Daily unlocks after first run started.
- Green L1 unlocks after Blue L1 clear.
- Red L1 unlocks after Blue L2 clear.
- Higher levels unlock by clearing previous level in same deck.
- Level cap currently 4 on Blue/Green/Red.

## Gameplay Notes
- Aces are low.
- Equal-value comparisons continue the run.
- Cards-cleared model is now “start at 1” (starting face-up card counts).
- Nudges use separate + / - charge pools.
- Daily/Heroes support Supabase + local fallback behavior.

## Main Code Ownership
- `js/logic.js`: game rules and state transitions
- `js/render.js`: DOM rendering and animation hooks
- `js/input.js`: controls/input gating
- `js/storage.js`: persistence/migrations
- `js/daily.js` + `js/daily-page.js`: Daily data flow/UI
- `js/leaderboard.js` + `js/heroes.js`: Heroes/crowns rendering
- `js/profile-page.js`: profile stats/crowns
- `js/fullscreen.js`: viewport-height handling, including Android standalone/home-screen mode

## Current Critical Risk
- Reveal animation on some Android browsers still fails to show face mid-flip.
