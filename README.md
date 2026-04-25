# 52! Higher / Lower Roguelike UI Prototype

Browser-based higher/lower card roguelike prototype for mobile and desktop play. This branch is the active `USETHIS` working copy and includes the current game UI, progression systems, cheat tools, nudge controls, and tester/debug helpers.

## Game Overview

- Standard 52-card deck
- Aces are low
- Matching the current value still survives
- A wrong guess ends the run
- Clearing the full deck wins the run

The game combines a simple higher/lower loop with roguelike ideas:

- seeded runs
- persistent meta progression
- unlockable cheats
- pre-run selectable powers
- persistent card knowledge
- optional leaderboard submission for completed runs

## Current Functionality

### Core Run Flow

- Start a run from a seed or generate one randomly
- Before each run, choose 1 Power from a random choice of 2
- Guess with Higher / Lower controls
- Earn streak rewards and choose cheats
- Track best score, run score, and meta progression
- Restart safely with confirmation during active runs

### Run Powers

All current Powers are set to `Common` with `unlockAt = 0`.

- `Balanced Nudges`: start with 4 `Nudge +1` and 4 `Nudge -1` charges
- `Updraft`: start with 8 `Nudge +1` charges
- `Downforce`: start with 8 `Nudge -1` charges
- `Quick Fingers`: reduces the current level's cheat threshold by 1 correct guess
- `Swap Stack`: start with 4 `Swap` cheats in hand
- `Aces Wild`: base Aces count as both high and low, and can be nudged down to King or up to Two
- `Lucky Opening`: start with 2 `Lucky 7` cheats in hand

### Decks And Levels

- Blue Deck starts unlocked.
- Daily unlocks after the player has started one run.
- Green Deck Level 1 unlocks after clearing Blue Level 1.
- Red Deck Level 1 unlocks after clearing Blue Level 2.
- Higher levels unlock by clearing the previous level in that same deck.

Current level cap is Level 4 for Blue, Green, and Red.

Blue cheat pacing:
- Level 1: cheats every 3 correct guesses (`Quick Fingers`: every 2)
- Level 2: cheats every 4 correct guesses (`Quick Fingers`: every 3)
- Level 3: cheats every 4 correct guesses (`Quick Fingers`: every 3)
- Level 4: cheats every 5 correct guesses (`Quick Fingers`: every 4)

Red cheat pacing:
- Levels 1-3: cheats every 3 correct guesses (`Quick Fingers`: every 2)
- Level 4: cheats every 4 correct guesses (`Quick Fingers`: every 3)

Cheat offers always keep at least 2 options.

Green starting Energy:
- Level 1: 10
- Level 2: 8
- Level 3: 6
- Level 4: 5

### Nudge System

This branch uses dedicated nudge charges rather than showing basic nudges in the normal cheat hand.

- `Nudge +1` and `Nudge -1` are tracked as separate charge pools
- Charge buttons are rendered in the game UI
- Nudges change the effective current card value for the next guess
- Nudges no longer consume at the edges:
  - you cannot spend an upward nudge on a King
  - you cannot spend a downward nudge on an Ace
- If `Aces Wild` is active, a base Ace can instead be nudged down to King or up to Two

### Cheats

Cheats are offered after streak milestones and cover:

- range checks
- rank checks like Ace / King detection
- next-card and multi-card info
- probabilities and parity
- value-modifying cheats
- survival cheats like `Lucky 7`, `Five Alive`, and `Odd One Out`
- deck manipulation like `Swap`
- card marking like `Tear Corner`

### Card Stats

Stats collection stays active in the background in this branch, even though `Stats` is not currently presented as a selectable run Power.

The face-down deck tooltip can show persistent per-card history.

Tracked card stats now include:

- overall attempts and correct guesses
- whether a face-down card ended or survived a run
- base guess preference: `Picked higher/lower X%`
- nudged-up guess preference: `Nudged up: higher/lower X%`
- nudged-down guess preference: `Nudged down: higher/lower X%`
- `Ended run` count only when the revealed losing card was judged against an unnuged base card
- blue-deck face-up nudge tracking: how often a card was nudged at all, plus total up/down nudge amount

This structure is intended to stay expandable for future stat ideas.

### Meta Progression And Persistence

Saved in `localStorage`:

- best score
- last run seed
- meta progression
- card stats
- card back status changes
- cheat unlock discovery
- preferred victory / leaderboard name where applicable

### Leaderboard

This branch includes leaderboard-related code in `js/leaderboard.js` and a victory flow that can prompt for a submitted hero name after a successful run.

## Debug And Test Tools

Most keyboard debug shortcuts in this branch are gated behind test mode.

### Enable Test Mode

Open the game with `?test` or `?debug` in the URL.

Example:

```text
game.html?test
```

### Keyboard Shortcuts

- `ArrowUp`: guess Higher
- `ArrowDown`: guess Lower
- `D`: add all currently eligible cheats to hand in test mode
- `N`: add 10 `Nudge +1` and 10 `Nudge -1` charges in test mode
- `C`: clear cheats in test mode
- `F`: reset progression stats in test mode
- `Shift + F`: full reset in test mode

### URL Debug Actions

Available test-mode query flags:

- `?test`
- `?debug`
- `?addcheats`
- `?clearcheats`
- `?resetstats`
- `?fullreset`

### Built-In Self Tests

`js/main.js` runs small console assertions on load, covering:

- seeded shuffle determinism
- seed normalization
- clamp behavior
- default state shape
- cheat option generation
- legacy card stat normalization into the expanded stat schema

## Workflow Scripts

### `checkin.ps1`

- fetches the remote branch
- checks out the working branch
- optionally auto-stashes
- rebases from remote
- restores stash if needed

### `checkout.ps1`

- stages changes
- commits if there are changes
- pulls with rebase
- pushes to remote

## Cheat Catalog Tools

This branch also includes balancing helpers:

- `cheat-index.html`
- `tools/import-cheats.ps1`
- `tools/cheat-catalog.csv`
- `js/cheat-balance-overrides.js`

These support exporting, editing, and re-importing cheat balance data.

## Project Structure

```text
game.html
index.html
styles.css
README.md
checkin.ps1
checkout.ps1

js/
  constants.js
  storage.js
  state.js
  powers.js
  cheats.js
  logic.js
  render.js
  input.js
  leaderboard.js
  heroes.js
  main.js

tools/
  import-cheats.ps1
  cheat-catalog.csv
```

## Notes

- This `USETHIS` folder is the branch/worktree you are actively checking in and out against GitHub.
- The nudge guardrails, expanded stats tooltip model, and `N` bulk-nudge debug shortcut are now implemented here.
