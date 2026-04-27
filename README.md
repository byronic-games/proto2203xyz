# 52! (USETHIS)

Mobile-first browser card game (higher/lower) with deck progression, powers, cheats, Daily mode, Heroes board, and Profile stats.

## Start
- Serve repo root with a static server.
- Open `index.html`.

## Core Pages
- `index.html` - menu/hub
- `game.html` - gameplay
- `daily.html` - daily run + board
- `heroes.html` - heroes board
- `profile.html` - profile/crowns
- `settings.html` - settings/reset

## Handover Docs
- `HANDOVER.md` (entry summary)
- `RUNBOOK.md` (smoke tests / ops checks)
- `KNOWN_ISSUES.md` (active risks)
- `NEXT_TASKS.md` (priority queue)
- `DATA_CONTRACTS.md` (Supabase expectations)
- `STATE_MAP.md` (storage keys)
- `AI_STARTER_PROMPT.md` (copy/paste takeover prompt)

## Developer Rules
- Keep unlock order: Blue -> Green -> Red.
- Do not wipe local storage unless explicitly requested.
- Keep mobile UX stable first.
- After JS/CSS edits, bump asset query strings in HTML entry pages.

## Current Priority
- Fix Android reveal animation where card rotates but face does not appear during flip.
