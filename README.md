Higher / Lower Roguelike Prototype (proto2203xyz)

A fast, modular higher/lower card game with roguelike elements, persistent knowledge, and expandable cheat/power systems.

🔗 Project Entry Point
Main UI and script loading:
All logic is split across /js/ files (no monolithic game.js anymore)
🎯 Core Game Loop
Standard 52-card deck (A = 1, J/Q/K = 11/12/13)
First card revealed
Player guesses Higher or Lower
Matching value = auto success
Wrong guess = run ends
Clear deck = win

Each correct guess:

Increases score
Increases Meta Progression
Advances streak (3 = cheat choice)
🧠 Key Systems Overview
1. State System

Central game state lives in state.js and is recreated each run.

Key fields:

deck, index, current
cheats, pendingCheatOptions
powers, selectedStartPowerId
metaProgression
cardStats, cardBackStatuses
correctAnswers, streak, bestScore

State is initialised via:

createEmptyState()

and rebuilt in:

startRun()




2. Meta Progression (NEW SYSTEM)

Persistent progression across runs.

Stored in localStorage (META_PROGRESSION_KEY)
Loaded via loadMetaProgression()
Increased on correct guesses:
addMetaProgression(1);




Used to:

Gate cheats via unlockAt
Future: progression system, unlocks, balancing
3. Cheats System (CORE EXTENSIBILITY)

Defined in:

Each cheat is a data object:

{
  id,
  name,
  rarity,
  included,
  unlockAt,
  stacking,
  consumeOnUse,
  poolExcludedIfPowerOwned?,
  use: () => {}
}
Key mechanics:
Cheats are offered after 3 correct guesses in a row
Player chooses 1 of 3
Cheats can be:
unique (one copy)
stackable
repeatable
Pool filtering:
CHEATS.filter(...)

Filters by:

included
unlockAt <= metaProgression
poolExcludedIfPowerOwned
duplicate prevention (for non-stackable)
4. Powers System

Defined in:

Current powers:

Nudge
Gives +1 / -1 cheats on correct guesses
Stats
Shows card history on deck back
Suppresses Nudge rewards

Key rule:

if (runHasPower("nudge_engine") && !runHasPower("stats_display"))
5. Persistent Card Knowledge

Stored per card:

{
  attempts,
  correct,
  endedRun,
  survivedRun
}




Used for:

Deck-back stats display
Future cheat logic (danger, odds, etc.)
6. Rendering System

All UI updates handled in render.js

Key render functions:

renderScores() → includes Meta Progression
renderStartPowerSelector()
renderFaceDownDeck() → stats overlay
renderCheats() / renderCheatChoice()

Render is called centrally via:

render();
7. Input System

Handled in:

Controls:

↑ = Higher
↓ = Lower
Buttons for mouse/touch

Debug:

D → add all cheats
C → clear cheats
R → reset stats
Shift + R → full reset (includes Meta Progression)
🗂 File Structure
index.html        → UI layout and script loading
styles.css        → styling

/js/
  constants.js    → cards, seeds, constants
  storage.js      → localStorage helpers
  state.js        → initial state
  logic.js        → game loop + rules
  render.js       → UI updates
  input.js        → controls + debug
  cheats.js       → cheat definitions + pool logic
  powers.js       → power definitions + behaviour
  main.js         → boot + tests
⚙️ Current Features
Gameplay
Deterministic seeded runs
Higher/lower core loop
Streak-based rewards
Cheats (examples)
Above 9?
Below 5?
Same Colour?
Between 5–9?
Total of next two cards
Chance higher/lower
Nudge ±1
Swap (top ↔ bottom)
Systems
Meta progression
Persistent card memory
Deck-back visual stats
Power toggling mid-run
🧩 Design Philosophy
Data-driven systems (cheats, powers)
Composable logic (filters, modifiers)
Persistent learning layer
Fast iteration over polish
🚧 Known Gaps / TODO
1. Cheat rarity not yet meaningful

Currently:

const CHEAT_RARITY = { common: 1, ... }




→ Not used in weighting yet

2. Meta progression only increments

No:

milestones
unlock feedback
UI progression layer
3. Single starting power

Currently:

one selected via dropdown

Future:

multi-select / build system
4. UX polish needed
Cheat feedback clarity
Reward anticipation
Mobile layout tuning
🔮 Suggested Next Steps
High Impact
Weighted cheat selection
Use CHEAT_RARITY for probability
Meta progression unlocks
Gradually increase unlockAt
Power expansion
New mechanics beyond Nudge/Stats
Medium Impact
Cheat synergy design
Deck marking expansion (more than torn corner)
Run modifiers (daily/seed challenges)
Low Effort Wins
Animation / juice
Sound feedback
Better messaging clarity
🧠 Key Concepts for Future Chats

If continuing in a new chat, the important mental model is:

State drives everything
Cheats = filtered pool → offered → consumed
Powers modify reward pipeline
Meta progression gates content
Render is pure reflection of state
🧪 Testing

Basic sanity tests run at startup:

Covers:

seeded shuffle determinism
stat normalization
cheat option generation
🏁 Summary

You now have:

A modular roguelike higher/lower engine
Persistent progression
Expandable cheat + power systems
Clean separation of logic / render / input

The foundation is strong and extensible — next phase is depth + balance + feel.
