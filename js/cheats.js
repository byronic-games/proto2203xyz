{
  id: "swap",
  name: "Swap",
  rarity: "common",
  stacking: "repeatable",
  consumeOnUse: true,
  use: () => {
    if (!state.current) return "No current card.";

    const currentIndex = state.index;
    const bottomIndex = state.deck.length - 1;

    if (bottomIndex <= currentIndex) {
      return "No card left at the bottom of the deck to swap with.";
    }

    const oldCurrent = state.deck[currentIndex];
    const oldBottom = state.deck[bottomIndex];

    state.deck[currentIndex] = oldBottom;
    state.deck[bottomIndex] = oldCurrent;
    state.current = state.deck[currentIndex];
    state.currentValueModifier = 0;
    markCardSeen(state.current);

    return `Swapped ${describeCard(oldCurrent)} with bottom card ${describeCard(oldBottom)}. ${describeCard(oldBottom)} is now face up.`;
  },
},

function canAddCheatToHand(cheatDef) {
      if (cheatDef.stacking === "stackable" || cheatDef.stacking === "repeatable") return true;
      return !state.cheats.some((c) => c.id === cheatDef.id);
    }

function getRandomCheatOptions(count = 3) {
      const pool = [...CHEATS];
      const options = [];
      while (options.length < count && pool.length > 0) {
        const idx = Math.floor(Math.random() * pool.length);
        options.push(pool.splice(idx, 1)[0]);
      }
      return options;
    }

function offerCheatChoice() {
      state.pendingCheatOptions = getRandomCheatOptions(3);
      state.message = "Choose 1 cheat:";
      render();
    }

function pickCheatFromChoice(index) {
      const cheat = state.pendingCheatOptions[index];
      if (!cheat) return;
      if (canAddCheatToHand(cheat)) {
        state.cheats.push({ ...cheat });
        state.message = `Picked: ${cheat.name}`;
      } else {
        state.message = `${cheat.name} was already in hand.`;
      }
      state.pendingCheatOptions = [];
      render();
    }
