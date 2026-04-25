# 52! Handover

## What This Project Is

`52!` is a browser-based higher/lower card game with roguelike structure, persistent meta systems, and multiple run variants.

Core run loop:
- a seeded 52-card deck
- one face-up current card
- one hidden next card
- player chooses `Higher` or `Lower`
- equal values are safe
- a wrong guess usually ends the run
- clearing all 52 cards wins

The current product is strongly mobile-first, but desktop support exists across the main pages.

## Current Player Flow

Main entry page:
- `index.html`

Current intended standard flow:
1. Intro
2. Choose Deck
3. Choose Level
4. Choose starting Power
5. Play the run

Other surfaces:
- `daily.html`: daily challenge hub
- `heroes.html`: full-clear leaderboard
- `profile.html`: local player stats and achievements
- `settings.html`: resets, utilities, log export/share
- `game.html`: actual gameplay screen for standard and daily runs

## Current Game Design

### Blue Deck

Blue is the default deck and the “classic” progression path.

Identity:
- rewards correct answers with cheat opportunities and nudge economy
- most card-history tracking for Red is derived from Blue runs

Current Blue levels:
- `Level 1`
  Cheats every 3 correct guesses, or every 2 with `Quick Fingers`
- `Level 2`
  Cheats every 4 correct guesses, or every 3 with `Quick Fingers`
- `Level 3`
  Same timing as Level 2
- `Level 4`
  Cheats every 5 correct guesses, or every 4 with `Quick Fingers`

Unlocks:
- Blue Level 1 is available immediately
- Blue Level 2 unlocks after clearing Blue Level 1
- Blue Level 3 unlocks after clearing Blue Level 2
- Blue Level 4 unlocks after clearing Blue Level 3

### Green Deck

Green is the energy-constrained variant.

Identity:
- starts with finite Energy by level
- nudges spend Energy
- wrong guesses still end the run

Current Green levels:
- `Level 1`: start with 10 Energy
- `Level 2`: start with 8 Energy
- `Level 3`: start with 6 Energy
- `Level 4`: start with 5 Energy

Unlocks:
- Green deck unlocks after clearing Blue Level 1
- Green Level 2 unlocks after clearing Green Level 1
- Green Level 3 unlocks after clearing Green Level 2
- Green Level 4 unlocks after clearing Green Level 3

### Red Deck

Red is the stats-driven variant.

Identity:
- does not gain nudges from correct guesses
- uses historical card-behavior info on the hidden next card instead
- that info is based on prior Blue face-up history

Unlocks:
- Red deck unlocks after clearing Blue Level 2
- Red Level 2 unlocks after clearing Red Level 1
- Red Level 3 unlocks after clearing Red Level 2
- Red Level 4 unlocks after clearing Red Level 3

Red timing:
- Levels 1-3: cheats every 3 correct guesses (or every 2 with `Quick Fingers`)
- Level 4: cheats every 4 correct guesses (or every 3 with `Quick Fingers`)

Red card-back stat direction:
- current design is centered on “how this card behaves when it is face up”
- current display is a nudge-frequency and nudge-direction summary
- this is still an actively tuned UI area

### Daily

Daily is a shared seeded run.

Rules:
- one shared run per date
- one attempt per player/device/date
- currently fixed to Blue Deck Level 1 behavior
- daily power offers are deterministic for that date/run
- daily scores/results are tied to a date-specific board

Important note:
- adding or removing powers/cheats can change the experience for players who have not yet started that day’s daily, because seeded offer pools change even if the underlying deck stays the same

## Starting Powers

Defined in `js/powers.js`.

Current starting powers:
- `Balanced Nudges`
- `Updraft`
- `Downforce`
- `Quick Fingers`
- `Swap Stack`
- `Aces Wild`
- `Lucky Opening`
- `Diamonds Are Forever`
- `All You Need Is Love`
- `Dig Down`
- `Club In Baby`
- `Brucie Bonus`

Key design notes:
- power choice is normally `pick 1 from 2`
- power offers are seeded/deterministic for a given run seed
- at least one nudge-start power and one non-nudge power are guaranteed in standard offers
- `Brucie Bonus` is now designed to grant an extra **Power** choice on a match, not a cheat

## Cheats

Defined in `js/cheats.js`.

Cheats now span several categories:
- info reveals
- probability/range checks
- current-card value manipulation
- next-card value manipulation
- survival effects
- deck/card manipulation
- special reward cheats

Recent and important cheats include:
- `Swap`
  Now intended to swap the face-up current card with the next face-down card
- `Jack Of All Trades`
  Swap a Jack with the next face-down card
- `Fortune Teller`
  Reveal the next three values in random order
- `You Can Cheat A Cheater`
  Award an extra cheat after the next three correct guesses
- `Always Bet On The Black`
  One-card survival if the next card is a Club or Spade
- `Locky 7s`
  Grants 10 up and 10 down nudges, then locks any card that is or becomes 7 so it cannot be nudged further
- `Hot or Cold?`
  Whether the next card is within 7 values of the current face card
- `Corporate Icebreaker`
  Two truths and one lie about the next three cards

Design note:
- cheat offers are deterministic in Daily
- cheat offers should always provide at least 2 options

## Progression And Meta

Persistence lives mostly in `js/storage.js`.

Saved data includes:
- selected deck and level
- per-deck/per-level best run
- deck clears and deck-level clears
- player name
- profile stats
- achievements
- cheat discovery/unlock data
- card history stats
- daily attempt history
- daily player id and local daily results
- hero/leaderboard local entries
- run debug log

Current progression logic:
- highest run is now tracked by deck and level
- old legacy best score is migrated to Blue Level 1
- old legacy Blue clears are treated as Blue Level 1 clears for unlocking

## Leaderboards

### Heroes

Files:
- `heroes.html`
- `heroes.css`
- `js/heroes.js`
- `js/leaderboard.js`

Purpose:
- store and display full-deck clears

Important current rules:
- wins should now be distinct by `seed + deck + level`, not just by seed
- local and remote entries are merged
- remote schema mismatch can still cause wrong/missing level behavior if backend doesn’t store `deck_level` properly

Known area to watch:
- higher-level wins were previously being duplicated locally as Level 1 due to weak remote fallback/merge logic
- app-side behavior has been tightened, but backend schema still matters

### Daily Board

Files:
- `js/daily.js`
- `js/daily-page.js`

Purpose:
- date-specific results board for Daily

Important recent behavior:
- today’s daily scores remain hidden until the local player completes today’s daily
- archived days can show scores without requiring completion of today’s daily

## Red Deck Card Stats

Underlying tracking is split between `js/storage.js`, `js/logic.js`, and `js/render.js`.

There are two broad stat concepts in the codebase:
- face-up history
- face-down reveal outcome history

Current Red direction uses face-up history from Blue runs.

Current visible Red info is focused on:
- how often a card was nudged when face up
- how nudges split upward vs downward

This part of the UI has been iterated a lot and is still a live design surface.

## Run Logging / Debugging

Files:
- `js/logic.js`
- `js/render.js`
- `js/input.js`
- `js/settings.js`

There is now a run logging system intended to help investigate player bug reports.

It records:
- run start context
- guesses
- nudge usage
- cheat offer presentation
- cheat selection
- cheat use
- power offer presentation
- power selection
- relevant modifiers and outcomes

Export paths:
- settings page supports downloading/sharing run logs
- keyboard shortcuts still exist in test/debug mode for some actions

This system is important for investigating reports like:
- cheat said one thing but outcome differed
- survival effect failed
- daily mismatch reports

## Main Code Structure

### Core Boot / Shared State

- `js/constants.js`
  Shared constants, RNG helpers, seed helpers

- `js/state.js`
  Default state shape, seeded deck creation helpers, state initialization

- `js/storage.js`
  Local storage persistence, migrations, stat normalization, unlock persistence

- `js/main.js`
  Game boot, snapshot restore, page startup glue

### Gameplay

- `js/logic.js`
  Main gameplay brain
  Handles guesses, progression, reward queues, power setup, run end flow, stat recording

- `js/render.js`
  Main UI rendering for board, power choice, card backs, overlays, tooltips

- `js/input.js`
  Button, keyboard, touch, and navigation wiring

### Powers / Cheats

- `js/powers.js`
  Power definitions, descriptions, icons, offer generation

- `js/cheats.js`
  Cheat definitions, cheat offer logic, cheat selection and behavior

- `js/cheat-balance-overrides.js`
- `js/apply-cheat-balance-overrides.js`
  Cheat tuning overrides and balancing helpers

### Daily / Leaderboards / Profile / Settings

- `js/daily.js`
  Daily run setup, submission, retrieval, leaderboard handling

- `js/daily-page.js`
  Daily hub page rendering and score visibility logic

- `js/leaderboard.js`
  Hero submission, fetch, merge, local fallback behavior

- `js/heroes.js`
  Heroes page rendering

- `js/profile-page.js`
  Profile data display and achievements

- `js/settings.js`
  Settings actions, resets, log export/share

## UI / Front-End Files

- `index.html` + `intro.css`
  Landing page and deck/level chooser flow

- `game.html` + `styles.css`
  Main game shell, overlays, board, tooltips, power/cheat modals

- `daily.html` + `daily.css`
- `heroes.html` + `heroes.css`
- `profile.html` + `profile.css`
- `settings.html` + `settings.css`

## Important Current Behaviors

- Exit from `game.html` should return players to intro and restart the deck/level selection flow
- Refresh on the game page should restore the current run snapshot
- Start Run inside the game should restart using the currently selected deck and level
- top header now shows deck/level and starting power during active runs
- tooltips use hold/release behavior and have mobile text-selection suppression

## Current Risk Areas

These are the areas most worth checking after changes:

- `js/cheats.js`
  High-change file, lots of branching behavior, easy to introduce weird interactions

- `js/logic.js`
  Reward queue ordering, run-end branches, daily-vs-standard branching, stat recording

- leaderboard level handling
  App-side logic is better than before, but remote schema can still undermine it

- Daily determinism
  Any change to power or cheat pools can change unplayed Daily experiences

- cache busting
  Mobile/browser-installed builds often hold stale assets; version bumps on page assets matter a lot

## Recommended Working Practices

- after any gameplay JS change, bump cache versions on `game.html`
- after leaderboard page changes, bump cache versions on `heroes.html` and any links into it
- treat Daily-affecting changes carefully if the live build is already serving an active daily
- prefer verifying reward ordering whenever a feature interacts with:
  - streak cheat rewards
  - Brucie Bonus
  - 6/7 bonus sequence
  - Cheat A Cheater

## What To Read First Next Time

If resuming work later, start with:
1. `HANDOVER.md`
2. `PROJECT_OVERVIEW.md`
3. `js/logic.js`
4. `js/cheats.js`
5. `js/powers.js`
6. `js/render.js`

That gives the fastest route back into both the design and the code.
