# 🃏 52 Highs & Lows – Prototype (proto2203xyz)

A fast, modular higher/lower card roguelike with seeded runs, persistent knowledge, and expandable cheat + power systems.

---

## 🎯 Overview

This is a browser-based prototype built with a clean separation of:

* **State** → single source of truth
* **Logic** → game rules & mutations
* **Render** → UI output

Everything in the game flows through this model.

---

## 🕹 Core Gameplay

* Standard 52-card deck (A = 1, J/Q/K = 11/12/13)
* First card is revealed
* Player guesses: **HIGHER** or **LOWER**
* Equal value = success
* Wrong guess = run ends
* Clear the full deck = win

### Progression Loop

Each correct guess:

* +1 score
* +1 meta progression
* +1 streak

Every **3 correct in a row**:
→ Choose **1 of 3 Cheats**

---

## 🧠 Key Systems

### 1. State System

Centralised in `state.js`

Key fields:

* `deck`, `index`, `current`
* `cheats`, `pendingCheatOptions`
* `powers`, `selectedStartPowerId`
* `correctAnswers`, `streak`, `bestScore`
* `metaProgression`
* `cardStats`, `cardBackStatuses`
* `seenCardIds`
* `restartConfirmArmed`

State is created via:

```js
createEmptyState()
```

---

### 2. Seeded Runs

* Deterministic deck generation
* Same seed = same run

```js
seededShuffle(deck, seedString)
```

UI shows:

```
v0.1-XXXXXX
```

---

### 3. Cheats System

Defined in `cheats.js`

Each cheat:

```js
{
  id,
  name,
  rarity,
  included,
  unlockAt,
  stacking,
  consumeOnUse,
  use: () => {}
}
```

#### Behaviour:

* Earned every 3 streak
* Choose 1 of 3
* Stored in `state.cheats`
* Used via buttons
* Removed if `consumeOnUse = true`

#### Filtering:

* `included`
* `unlockAt` vs meta progression
* duplicate rules
* power exclusions

---

### 4. Cheat Info Panel (NEW)

Displays **only relevant cheats**:

* Cheats currently in hand
* Cheats currently being offered

Not the full cheat list.

Driven by:

```js
state.cheats
state.pendingCheatOptions
```

---

### 5. Powers System

Defined in `powers.js`

Current powers:

#### Nudge

* Grants +1 / -1 cheats on correct guesses

#### Stats

* Shows per-card history on deck back
* Suppresses Nudge rewards

---

### 6. Meta Progression

Persistent across runs via `localStorage`

* +1 per correct guess
* Used for future unlock gating

```js
addMetaProgression(1)
```

---

### 7. Persistent Card Knowledge

Stored per card:

```js
{
  attempts,
  correct,
  endedRun,
  survivedRun
}
```

Used for:

* Deck-back stats
* Future decision systems

---

## 🧩 UI Layout

Three-column layout:

### Left Panel

* How To Play
* Cheat Info

### Centre Panel

* Cards
* Higher / Lower buttons
* Cheats in hand
* Messages
* Start Run

### Right Panel

* Seen cards grid
* Active powers
* Card in hand

---

## 🔁 Restart Safety (NEW)

Prevents accidental restart mid-run:

* First click → "Confirm Restart"
* Second click → restart

Controlled via:

```js
state.restartConfirmArmed
```

---

## 🎮 Controls

### Mouse / Touch

* HIGHER / LOWER buttons
* Start Run / Restart
* Cheat selection

### Keyboard

* ↑ → Higher
* ↓ → Lower
* D → Add all cheats (debug)
* C → Clear cheats (debug)
* F → Reset stats
* Shift + F → Full reset

---

## 🗂 File Structure

```
index.html        → layout + script loading
styles.css        → styling

/js/
  constants.js    → cards, RNG, seeds
  storage.js      → localStorage helpers
  state.js        → state creation
  logic.js        → gameplay rules
  render.js       → UI rendering
  input.js        → controls + debug
  cheats.js       → cheat definitions
  powers.js       → power logic
  main.js         → boot + tests
```

---

## ⚙️ Current Features

### Gameplay

* Deterministic seeded runs
* Higher/lower core loop
* Streak-based rewards

### Cheats (examples)

* Above 9?
* Below 5?
* Between 5–9
* Total of next 2 / 3 cards
* Chance higher / lower
* Nudge ±1
* Swap
* Tear Corner

### Systems

* Meta progression
* Persistent card memory
* Deck-back stats
* Power toggling mid-run
* Restart confirmation

---

## ⚠️ Known Issues / Gaps

* Cheat rarity not yet used for weighting
* Meta progression has no milestones/unlocks yet
* Only one starting power selectable
* No animation / juice layer yet
* Minor HTML typo (`<<div id="main-layout">`)

---

## 🔮 Suggested Next Steps

### High Impact

* Weighted cheat selection (use rarity)
* Meta progression unlock system
* Expand power system

### Medium

* Cheat synergies
* Deck marking expansion
* Difficulty scaling

### Low Effort Wins

* Animations / feedback
* Sound effects
* UI polish

---

## 🧠 Summary

This project provides:

* A modular roguelike card engine
* Persistent progression + learning systems
* Expandable cheat + power architecture
* Clean separation of logic, state, and UI

The foundation is solid — next phase is **depth, balance, and feel**.
