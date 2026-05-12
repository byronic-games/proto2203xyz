# Yellow Deck Implementation Notes

## Goal
Add a Yellow deck unlocked after Blue Level 3, with level-gated Joker hazard cards:
- Level 1: Tearless
- Level 2: Tearless + Nudgeless
- Level 3: Tearless + Nudgeless + Cheatless
- Level 4: Tearless + Nudgeless + Cheatless + Powerless

Jokers should be shuffled into Yellow runs and may appear only after the first three correct guesses. A Joker does not care whether the player guessed Higher or Lower; when revealed it applies its negative effect and the run continues.

Add an Unlock Decks option in settings that unlocks Level 1 of every deck regardless of progression.

## Main Ownership Map
- `js/storage.js`: deck key normalization, deck win/clear/profile stat normalization, selected deck persistence, unlock-decks persistence.
- `js/logic.js`: run deck construction, Yellow Joker insertion, guess resolution, Joker effects.
- `js/render.js`: deck picker, counters, card face/back rendering, messages, seen grid.
- `js/input.js`: deck/level selection gating.
- `game.html`: in-game settings modal and asset query strings.
- `settings.html`, `settings.css`, `js/settings.js`: standalone settings page.
- `styles.css`: Yellow deck accent, Joker card visuals, counter styling.
- Docs: `README.md`, `PROJECT_OVERVIEW.md`, `HANDOVER.md`, `RUNBOOK.md`, `STATE_MAP.md`.

## UI Decision
Use the existing message bar for Joker event copy. Add a compact remaining-Jokers indicator next to the current remaining/deck info rather than adding another large panel, because the mobile layout is already dense.

## Resume Checklist
1. Done - Add storage key/helper for Unlock All.
2. Done - Add `yellow` to deck normalization, wins, profile stats, deck metadata, unlock checks.
3. Done - Build Yellow deck by inserting level-gated Joker cards after the first four deck positions so they can appear after three correct guesses.
4. Done - Teach guess resolution to detect `card.type === "joker"` before normal comparison.
5. Done - Render Joker cards distinctly and exclude them from normal seen-card grid stats.
6. Done - Add Unlock Decks to in-game settings and standalone settings.
7. Done - Update docs and run focused syntax checks.
8. Done - Add Higher / Lower button-order preference while preserving existing button styling.

## Verification Notes
- Syntax checked: `js/constants.js`, `js/storage.js`, `js/logic.js`, `js/render.js`, `js/input.js`, `js/settings.js`, `js/powers.js`, `js/profile-page.js`.
- Inline `index.html` script parsed with `new Function(...)`.
- Node smoke checked Yellow Level 4 deck build: 56 total cards, four Jokers, none in the first four positions.
- Node smoke checked Unlock Decks: Yellow Level 1 opens, Yellow Level 2 stays locked; button order persists as `higher-lower`.
- Still worth manually smoke-testing Yellow Level 1 with Unlock Decks enabled, and Yellow Level 4 after normal/full-level unlocks.
