const RANGE_CHEAT_DELTA = 3;

function getNextCardAt(offset = 1) {
  return state.deck[state.index + offset] || null;
}

function isPictureCardValue(value) {
  return value >= 11;
}

function getParityLabel(value) {
  if (isPictureCardValue(value)) return "PICTURE CARD";
  return value % 2 === 0 ? "EVEN" : "ODD";
}

const CHEATS = [
  // =====================
  // NEW / ACTIVE CHEATS
  // =====================

  {
    id: "above_9",
    name: "Above 9?",
    rarity: "common",
    included: true,
    unlockAt: 0,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      const next = peekNext();
      if (!next) return "No next card.";
      return next.value > 9 ? "Yes — above 9." : "No — 9 or below.";
    },
  },

  {
    id: "below_5",
    name: "Below 5?",
    rarity: "common",
    included: true,
    unlockAt: 0,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      const next = peekNext();
      if (!next) return "No next card.";
      return next.value < 5 ? "Yes — below 5." : "No — 5 or above.";
    },
  },

  {
    id: "same_colour",
    name: "Same Colour?",
    rarity: "common",
    included: false,
    unlockAt: 0,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      const next = peekNext();
      if (!next || !state.current) return "No next card.";
      return isRed(next) === isRed(state.current)
        ? "Same colour."
        : "Different colour.";
    },
  },

  {
    id: "mid_range",
    name: "Between 5 and 9?",
    rarity: "common",
    included: true,
    unlockAt: 0,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      const next = peekNext();
      if (!next) return "No next card.";
      return next.value >= 5 && next.value <= 9
        ? "Yes — between 5 and 9."
        : "No — outside 5–9.";
    },
  },

  {
    id: "next_two_total",
    name: "Total of Next Two",
    rarity: "uncommon",
    included: true,
    unlockAt: 0,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      const next = getNextCardAt(1);
      const next2 = getNextCardAt(2);
      if (!next || !next2) return "Not enough cards remaining.";
      return `Total = ${next.value + next2.value}`;
    },
  },

  {
    id: "next_three_total",
    name: "Total of Next Three",
    rarity: "rare",
    included: true,
    unlockAt: 0,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      const next = getNextCardAt(1);
      const next2 = getNextCardAt(2);
      const next3 = getNextCardAt(3);
      if (!next || !next2 || !next3) return "Not enough cards remaining.";
      return `Total = ${next.value + next2.value + next3.value}`;
    },
  },

  {
    id: "top_bottom_half",
    name: "Top Half / Bottom Half",
    rarity: "common",
    included: true,
    unlockAt: 0,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      const next = peekNext();
      if (!next) return "No next card.";
      return next.value >= 7 ? "Top half (7+)" : "Bottom half (6-)";
    },
  },

  {
    id: "within_range_3",
    name: `Within ±${RANGE_CHEAT_DELTA}?`,
    rarity: "common",
    included: true,
    unlockAt: 0,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      const next = peekNext();
      if (!next || !state.current) return "No next card.";
      const currentVal = getCurrentEffectiveValue();
      const diff = Math.abs(next.value - currentVal);
      return diff <= RANGE_CHEAT_DELTA
        ? `Within ±${RANGE_CHEAT_DELTA}.`
        : `NOT within ±${RANGE_CHEAT_DELTA}.`;
    },
  },

  {
    id: "one_of_next_two_higher",
    name: "One of Next 2 Higher?",
    rarity: "common",
    included: true,
    unlockAt: 0,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      if (!state.current) return "No current card.";
      const next = getNextCardAt(1);
      const next2 = getNextCardAt(2);
      if (!next || !next2) return "Not enough cards remaining.";
      const currentVal = getCurrentEffectiveValue();
      const found = next.value > currentVal || next2.value > currentVal;
      return found
        ? "Yes — at least one is higher."
        : "No — neither is higher.";
    },
  },

  {
    id: "one_of_next_two_lower",
    name: "One of Next 2 Lower?",
    rarity: "common",
    included: true,
    unlockAt: 0,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      if (!state.current) return "No current card.";
      const next = getNextCardAt(1);
      const next2 = getNextCardAt(2);
      if (!next || !next2) return "Not enough cards remaining.";
      const currentVal = getCurrentEffectiveValue();
      const found = next.value < currentVal || next2.value < currentVal;
      return found
        ? "Yes — at least one is lower."
        : "No — neither is lower.";
    },
  },

  {
    id: "higher_of_next_two",
    name: "Higher of Next Two",
    rarity: "uncommon",
    included: true,
    unlockAt: 0,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      const next = getNextCardAt(1);
      const next2 = getNextCardAt(2);
      if (!next || !next2) return "Not enough cards remaining.";
      return `Higher = ${Math.max(next.value, next2.value)}`;
    },
  },

  {
    id: "lower_of_next_two",
    name: "Lower of Next Two",
    rarity: "uncommon",
    included: true,
    unlockAt: 0,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      const next = getNextCardAt(1);
      const next2 = getNextCardAt(2);
      if (!next || !next2) return "Not enough cards remaining.";
      return `Lower = ${Math.min(next.value, next2.value)}`;
    },
  },

  {
    id: "next_card_parity",
    name: "Next Card Parity",
    rarity: "common",
    included: true,
    unlockAt: 0,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      const next = peekNext();
      if (!next) return "No next card.";
      return getParityLabel(next.value);
    },
  },

  // =====================
  // EXISTING CHEATS
  // =====================

  {
    id: "within_range",
    name: "Within ±2?",
    rarity: "common",
    included: false,
    unlockAt: 0,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      const next = peekNext();
      if (!next || !state.current) return "No next card.";
      const currentVal = getCurrentEffectiveValue();
      const diff = Math.abs(next.value - currentVal);
      return diff <= 2 ? "Within ±2." : "NOT within ±2.";
    },
  },

  {
    id: "red_black",
    name: "Reveal Red / Black",
    rarity: "common",
    included: false,
    unlockAt: 0,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      const next = peekNext();
      if (!next) return "No next card.";
      return isRed(next) ? "Red." : "Black.";
    },
  },

  {
    id: "chance_higher",
    name: "Chance Higher",
    rarity: "common",
    included: true,
    unlockAt: 0,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      if (!state.current) return "No current card.";
      const val = getCurrentEffectiveValue();
      const remaining = state.deck.slice(state.index + 1);
      if (!remaining.length) return "No next card.";
      const count = remaining.filter((c) => c.value > val).length;
      return `${Math.round((count / remaining.length) * 100)}% higher`;
    },
  },

  {
    id: "chance_lower",
    name: "Chance Lower",
    rarity: "common",
    included: true,
    unlockAt: 0,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      if (!state.current) return "No current card.";
      const val = getCurrentEffectiveValue();
      const remaining = state.deck.slice(state.index + 1);
      if (!remaining.length) return "No next card.";
      const count = remaining.filter((c) => c.value < val).length;
      return `${Math.round((count / remaining.length) * 100)}% lower`;
    },
  },

  {
    id: "nudge_up",
    name: "Nudge +1",
    rarity: "common",
    included: true,
    unlockAt: 0,
    stacking: "stackable",
    consumeOnUse: true,
    poolExcludedIfPowerOwned: "nudge_engine",
    use: () => {
      state.currentValueModifier += 1;
      const effective = getCurrentEffectiveValue();
      return `Current card is now treated as ${valueToRank(effective)} for the next guess.`;
    },
  },

  {
    id: "nudge_down",
    name: "Nudge -1",
    rarity: "common",
    included: true,
    unlockAt: 0,
    stacking: "stackable",
    consumeOnUse: true,
    poolExcludedIfPowerOwned: "nudge_engine",
    use: () => {
      state.currentValueModifier -= 1;
      const effective = getCurrentEffectiveValue();
      return `Current card is now treated as ${valueToRank(effective)} for the next guess.`;
    },
  },

  {
    id: "tear_corner",
    name: "Tear Corner",
    rarity: "common",
    included: true,
    unlockAt: 0,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      if (!state.current) return "No current card.";
      setCardBackStatus(state.current.id, { tornCorner: true });
      return `${describeCard(state.current)} now has a torn corner on its back.`;
    },
  },

  {
    id: "swap",
    name: "Swap",
    rarity: "common",
    included: true,
    unlockAt: 0,
    stacking: "repeatable",
    consumeOnUse: true,
    use: () => {
      if (!state.current) return "No current card.";

      const currentIndex = state.index;
      const bottomIndex = state.deck.length - 1;

      if (bottomIndex <= currentIndex) {
        return "No card left at bottom.";
      }

      const oldCurrent = state.deck[currentIndex];
      const oldBottom = state.deck[bottomIndex];

      state.deck[currentIndex] = oldBottom;
      state.deck[bottomIndex] = oldCurrent;
      state.current = state.deck[currentIndex];
      state.currentValueModifier = 0;
      markCardSeen(state.current);

      return "Swapped with bottom card.";
    },
  },
];

function canAddCheatToHand(cheatDef) {
  if (!cheatDef.included) return false;
  if (cheatDef.stacking === "stackable" || cheatDef.stacking === "repeatable") {
    return true;
  }
  return !state.cheats.some((c) => c.id === cheatDef.id);
}

function getRandomCheatOptions(count = 3) {
  const ownedStartPowerId = state.selectedStartPowerId;

  const pool = CHEATS.filter((c) => {
    if (!c.included) return false;

    if ((state.metaProgression ?? 0) < (c.unlockAt ?? 0)) {
      return false;
    }

    if (
      c.poolExcludedIfPowerOwned &&
      c.poolExcludedIfPowerOwned === ownedStartPowerId
    ) {
      return false;
    }

    if (
      c.stacking !== "stackable" &&
      c.stacking !== "repeatable" &&
      state.cheats.some((held) => held.id === c.id)
    ) {
      return false;
    }

    return true;
  });

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
    state.message = `${cheat.name} already in hand.`;
  }

  state.pendingCheatOptions = [];
  render();
}
