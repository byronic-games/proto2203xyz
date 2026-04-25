# 52! Project Overview

## What This Project Is

`52!` is a browser-based higher/lower card game with roguelike structure.

Core loop:
- a seeded 52-card deck
- one current face-up card and one hidden next card
- guess `Higher` or `Lower`
- matching values are safe
- one wrong guess ends the run
- clearing all 52 cards wins

The project is currently a mobile-first front-end prototype with persistent progression, deck variants, cheats, powers, and leaderboard-style meta features.

## Current Product Shape

There are now several distinct surfaces:

- `index.html`
  Main landing page. Lets the player start a normal run, open the Daily page, visit Heroes, and visit Profile.

- `game.html`
  The main play screen for standard and daily runs.

- `daily.html`
  Daily-run hub. Shows the selected daily date, lets the player enter a name, start the daily if eligible, and browse the daily leaderboard.

- `heroes.html`
  Global/local heroes board for full deck clears.

- `profile.html`
  Local player stats, stamp label, and simple achievement list.

- `settings.html`
  Settings/reset screen for deck alterations and related state.

- `cheat-index.html`
  Utility/balancing page for cheat catalog work.

## Main Design Direction

The game is no longer just a plain higher/lower toy. It now has a split identity:

- Blue Deck:
  The more classic run. Correct answers grant directional nudge charges.

- Green Deck:
  The energy-pressured variant. It still ends on a wrong guess, starts with limited Energy that varies by level, and spends Energy on nudges.

- Red Deck:
  The more information-driven variant. It does not award nudges for correct answers. Instead, the next card back can show historical stats derived from prior Blue deck face-up usage.

- Daily:
  One shared seeded run per day, with one attempt per player/device/date, shared power options, and a daily leaderboard.

This gives the project three adjacent play modes:
- standard Blue progression play
- energy-constrained Green progression play
- stats-driven Red play
- shared Daily challenge play

Current progression summary:
- Blue Level 1 starts unlocked.
- Daily unlocks after a player has started one run.
- Green Level 1 unlocks after clearing Blue Level 1.
- Red Level 1 unlocks after clearing Blue Level 2.
- Level caps are currently 1-4 for Blue, Green, and Red.
- For Green/Red/Blue, each higher level unlocks by clearing the previous level in that same deck.

## Core Systems

### 1. Run State And Persistence

Key files:
- `js/state.js`
- `js/storage.js`
- `js/constants.js`

Responsibilities:
- defines the runtime state shape
- initializes deck, run, progression, and temporary effect state
- stores persistent data in `localStorage`
- stores some transient/debug flags in `sessionStorage`

Persistent state currently includes:
- best score
- last non-daily seed
- profile stats
- deck wins
- card stats
- card-back alterations
- discovered cheats
- preferred player name
- daily attempt history and daily player id

### 2. Main Game Flow

Key files:
- `js/main.js`
- `js/logic.js`
- `js/render.js`
- `js/input.js`

Responsibilities:
- boots the game
- runs small self-tests on load
- restores game snapshots if resuming
- handles daily launch from query params
- executes guess resolution
- awards powers / nudges / cheats
- records stats
- renders the board and HUD
- handles keyboard/touch/button input

`js/logic.js` is the main gameplay brain.

Important gameplay behaviors currently in place:
- seeded deck creation
- power choice before a run
- cheat choice during runs after streak thresholds
- nudge usage on the face-up current card
- run-end handling
- deck win recording
- daily result submission/return flow

### 3. Powers

Key file:
- `js/powers.js`

Powers are pre-run modifiers. The current build includes things like:
- Balanced Nudges
- Updraft
- Downforce
- Quick Fingers
- Swap Stack
- Aces Wild
- Lucky Opening

Power selection is presented as a pick-1-from-2 choice before the run starts.

### 4. Cheats

Key files:
- `js/cheats.js`
- `js/cheat-balance-overrides.js`
- `js/apply-cheat-balance-overrides.js`

Cheats are mid-run rewards. They cover:
- info reveals
- range/rank checks
- probability/parity-style hints
- deck manipulation
- survival effects
- card marking
- value modifications

Cheats are a major layer of the run identity, and there is separate utility support for balancing them.

### 5. Card Stats / Red Deck Info Model

Key files:
- `js/storage.js`
- `js/logic.js`
- `js/render.js`

There are two different stat ideas in the codebase:

- hidden-card outcome stats
  These track whether a face-down card later survived or ended a run.

- face-up usage stats
  These track how a card behaved when it was the current comparison card.

The current Red deck direction is centered on face-up history, especially Blue-only nudge behavior.

As of now, the Red back shows:
- `Nudged: X%`
- `Up Total: N`
- `Down Total: N`

These are intentionally:
- based only on Blue deck plays
- based only on face-up current-card nudges
- not influenced by face-down nudging knowledge

This is one of the most recent design changes.

### 6. Daily Mode

Key files:
- `daily.html`
- `daily.css`
- `js/daily.js`
- `js/daily-page.js`
- `js/main.js`
- `js/logic.js`

Daily mode currently supports:
- one seeded daily run per UTC date
- one attempt per player/device/date
- local attempt locking
- post-run result submission
- local fallback if remote leaderboard is unavailable
- browsing prior daily dates
- archived daily leaderboard viewing

Important recent behavior:
- today’s scores stay hidden until that daily is completed
- archived past daily scores can be shown without requiring completion of today’s daily

There is currently one uncommitted change in `js/daily-page.js` implementing that archive-score visibility tweak.

### 7. Leaderboards / Heroes

Key files:
- `js/leaderboard.js`
- `js/heroes.js`
- `heroes.html`
- `js/daily.js`

There are effectively two leaderboard tracks:

- Heroes
  Full-deck clears for standard runs.

- Daily leaderboard
  Daily scores tied to a specific date.

Both systems appear to support:
- remote storage when configured
- local fallback behavior when not configured

### 8. Profile / Meta Layer

Key files:
- `profile.html`
- `profile.css`
- `js/profile-page.js`
- `js/storage.js`

Profile currently shows:
- player name
- best run
- total correct guesses
- decks beaten
- runs started
- blue/red clears
- blue/red runs
- daily attempts
- stamp label
- simple achievements

This is lightweight but already useful as the local meta shell.

### 9. Settings / Reset Tools

Key files:
- `settings.html`
- `settings.css`
- `js/settings.js`

This area is for controlled cleanup of progression/alteration state without requiring raw storage editing.

### 10. Debug / Test Infrastructure

Key files:
- `js/main.js`
- `checkin.ps1`
- `checkout.ps1`

Current debug support includes:
- `?test` / `?debug`
- hotkeys for cheats, nudges, and reset actions
- lightweight console assertions on load

This project is still using direct browser-side testing and internal debug helpers rather than a formal automated test suite.

## File Map

### Main HTML/CSS Surfaces

- `index.html` / `intro.css`
  Intro/front page and deck selection modal.

- `game.html` / `styles.css`
  Main run UI.

- `daily.html` / `daily.css`
  Daily page UI.

- `heroes.html` / `heroes.css`
  Heroes board.

- `profile.html` / `profile.css`
  Profile page.

- `settings.html` / `settings.css`
  Settings/reset page.

### Main JavaScript Modules

- `js/constants.js`
  Shared storage keys and constants.

- `js/state.js`
  Empty-state creation and global `state`.

- `js/storage.js`
  Persistent data normalization and save/load helpers.

- `js/logic.js`
  Core gameplay and stat recording.

- `js/render.js`
  DOM rendering for game state.

- `js/input.js`
  Input handlers and UI wiring around game interactions.

- `js/powers.js`
  Power definitions and power-related helpers.

- `js/cheats.js`
  Cheat definitions and cheat flow.

- `js/main.js`
  Bootstrapping, debug flags, and daily-mode entry.

- `js/leaderboard.js`
  Standard-run heroes leaderboard functions.

- `js/daily.js`
  Daily data model, local attempt storage, remote fetch/submission, daily date helpers.

- `js/daily-page.js`
  Daily hub page rendering and navigation.

- `js/profile-page.js`
  Profile rendering.

- `js/heroes.js`
  Heroes page rendering.

- `js/settings.js`
  Settings page behavior.

## Where The Project Seems To Be Right Now

The project is in an integration-and-polish phase, not an early prototype phase.

The broad shape is already established:
- front page refresh exists
- profile exists
- daily exists
- Red deck identity exists
- Heroes/local persistence exist

The current work seems focused on:
- making Daily feel complete and browseable
- sharpening the Red deck’s stat identity
- preserving mobile usability across all pages

## Known Current Workspace State

At the time this overview was written:
- branch: `main`
- there are local uncommitted edits

Those current local edits include:
- `js/daily-page.js`
  archive daily score-visibility tweak
- `js/logic.js`
  Blue-only nudge stat tracking for Red deck display
- `js/render.js`
  Red deck now shows `Nudged %`, `Up Total`, `Down Total`
- `js/storage.js`
  stat schema expansion for the new nudge fields
- `README.md`
  docs updated to mention the new tracking

## Suggested Mental Model For Future Work

If we need to re-orient quickly in a future session, the simplest high-level model is:

- `index.html` is the hub
- `game.html` is the play surface
- `logic.js` is the rules engine
- `render.js` is the board presentation layer
- `storage.js` is persistence and migration glue
- `daily.js` + `daily-page.js` are the daily system
- `leaderboard.js` + `heroes.js` are the hero board system
- `profile-page.js` is the player meta shell

And from a design perspective:

- Blue = resource-driven play via nudges
- Red = information-driven play via card history
- Daily = shared once-per-day challenge
