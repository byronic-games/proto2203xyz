# proto2203xyz
Messing around with GitHub
# Higher / Lower Roguelike Prototype

A fast-play higher/lower card prototype with roguelike progression, persistent card knowledge, cheat cards, and run modifiers.

## Current focus

Build the game loop quickly and keep the architecture modular so new cheats, powers, and persistent deck modifiers can be added without rewriting core systems.

## Core rules

- Standard 52-card deck
- Ace is low (`1`)
- Jack / Queen / King = `11 / 12 / 13`
- The first card is revealed for free
- The player guesses whether the next card will be **Higher** or **Lower**
- Matching values count as an automatic success
- A wrong guess ends the run
- Clearing the full deck is the win condition

## Current systems

### Cheats

The game uses data-driven cheat definitions with fields like:
- `id`
- `name`
- `rarity`
- `stacking`
- `consumeOnUse`
- `use(state)`

Current cheat pool includes:
- Reveal Red / Black
- Odd / Even / Neither
- Higher than 6?
- Picture Card?
- Chance next card is higher
- Chance next card is lower
- Within ±2?
- Same Number Remaining
- Not This Suit
- Is This Dangerous?
- Average Outcome
- % Guessed Correctly
- Nudge +1
- Nudge -1
- Swap
- Tear Corner

### Powers

Current powers:
- **Nudge** — awards directional nudge cheats on correct guesses while active
- **Stats** — shows persistent face-down card stats on the deck back while active

Notes:
- Powers can now be toggled during a run
- While **Stats** is active, **Nudge** rewards are suppressed

### Persistent card knowledge

Each card can retain long-term data across runs.

Currently tracked:
- `attempts`
- `correct`
- `faceDownSeen`
- `endedRun`
- `survivedRun`

This is used for:
- historical correctness indicators
- danger / average-outcome cheats
- deck-back information display

### Card back modifiers

Currently supported:
- `tornCorner`

## Controls

### Main controls
- `↑` = Higher
- `↓` = Lower
- Mouse / touch buttons also supported

### Debug controls
- `D` = add missing cheats to hand
- `C` = clear all cheats
- `R` = reset progression stats
- `Shift + R` = full reset including best score and seed history

## Project structure

- `index.html` — page structure and UI hooks
- `styles.css` — layout and styling
- `game.js` — game state, systems, rendering, input, persistence

## Persistence

Stored in `localStorage`:
- best score
- card stats
- card back status
- last run seed

## Design goals

- Fast, playable prototype first
- Touch-friendly and eventually mobile-ready
- Modular systems for cheats and powers
- Persistent learning across runs
- Easy to extend with rarity weighting, more powers, and more deck markings

## Suggested next priorities

1. **Cheat weighting system**
   - Make rarity meaningfully affect reward rolls
   - Prepare for common / uncommon / rare / legendary balancing

2. **Multi-power ownership**
   - Allow runs to own more than one power
   - Make start-of-run power selection a checklist instead of a single select

3. **More powers**
   - Start with 2 cheats
   - Double streak rewards
   - Special behaviour for middle-value cards

4. **UX polish**
   - Clearer reward feedback
   - Better card-back stat presentation
   - Mobile layout tuning

## Notes for iteration

When changing logic, prefer adding or editing shared helpers rather than letting individual cheats or powers directly mutate unrelated systems. The long-term goal is to keep all progression, reward, and deck-state changes easy to reason about and safe to expand.
