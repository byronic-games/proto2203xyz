const RANGE_CHEAT_DELTA = 3;

const CHEAT_RARITY_WEIGHTS = {
  common: 100,
  uncommon: 60,
  rare: 28,
  legendary: 12,
};

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

function makeCheat(def) {
  return {
    rarity: "common",
    included: true,
    unlockAt: 0,
    stacking: "unique", // unique | stackable | repeatable
    consumeOnUse: true,
    category: "information",
    baseWeight: 1,
    poolExcludedIfPowerOwned: null,
    ...def,
  };
}

const CHEAT_DESCRIPTIONS = {
  "Above 9?": "Is the next face down card above 9?",
  "Below 5?": "Is the next face down card below 5?",
  "Between 5 and 9?": "Is the value of the next face down card a 5, 6, 7, 8 or 9?",
  "Total of Next Two": "Reveals the total of the next two face down cards.",
  "Total of Next Three": "Reveals the total of the next three face down cards.",
  "Difference Between Next 2 Cards": "Reveals the difference between the higher and lower values of the next two face down cards.",
  "Top Half / Bottom Half": "Is the next card below 7 or is it 7 and above?",
  "Within ±3?": "Is the next card within three above or below the current face card?",
  "One of Next 2 Higher?": "Reveals if at least one of the next two cards is higher than the current card.",
  "One of Next 2 Lower?": "Reveals if at least one of the next two cards is lower than the current card.",
  "Lower of Next Two": "Reveals the lowest value of the next two face down cards.",
  "Higher of Next Two": "Reveals the highest value of the next two face down cards.",
  "Next Card Parity": "Reveals if the next card is odd, even or neither (picture card).",
  "Chance Higher": "Calculates the probability that one of the remaining cards is higher than the current card.",
  "Chance Lower": "Calculates the probability that one of the remaining cards is lower than the current card.",
  "Nudge +1": "Increases the value of the current face card by one.",
  "Nudge -1": "Decreases the value of the current face card by one.",
  "Nudge +2": "Increases the value of the current face card by two, stopping at King.",
  "Nudge -2": "Decreases the value of the current face card by two, stopping at Ace.",
  "Swap": "Replace the current face card with the card at the bottom of the deck.",
  "Tear Corner": "Tear off the top left corner of the current face card (affects future runs).",
  "Lucky 7": "Can only be used while your current card counts as 7. Your next guess is treated as correct.",
};

const CHEATS = [
  // =====================
  // EARLY / COMMON INFO
  // =====================
  makeCheat({
    id: "above_9",
    name: "Above 9?",
    rarity: "common",
    unlockAt: 0,
    category: "information",
    baseWeight: 1.05,
    use: () => {
      const next = peekNext();
      if (!next) return "No next card.";
      return next.value > 9 ? "Yes — above 9." : "No — 9 or below.";
    },
  }),

  makeCheat({
    id: "below_5",
    name: "Below 5?",
    rarity: "common",
    unlockAt: 0,
    category: "information",
    baseWeight: 1.05,
    use: () => {
      const next = peekNext();
      if (!next) return "No next card.";
      return next.value < 5 ? "Yes — below 5." : "No — 5 or above.";
    },
  }),

  makeCheat({
    id: "mid_range",
    name: "Between 5 and 9?",
    rarity: "common",
    unlockAt: 0,
    category: "information",
    baseWeight: 1.0,
    use: () => {
      const next = peekNext();
      if (!next) return "No next card.";
      return next.value >= 5 && next.value <= 9
        ? "Yes — between 5 and 9."
        : "No — outside 5–9.";
    },
  }),

  makeCheat({
    id: "top_bottom_half",
    name: "Top Half / Bottom Half",
    rarity: "common",
    unlockAt: 0,
    category: "information",
    baseWeight: 0.95,
    use: () => {
      const next = peekNext();
      if (!next) return "No next card.";
      return next.value >= 7 ? "Top half (7+)" : "Bottom half (6-)";
    },
  }),

  makeCheat({
    id: "next_card_parity",
    name: "Next Card Parity",
    rarity: "common",
    unlockAt: 0,
    category: "information",
    baseWeight: 0.9,
    use: () => {
      const next = peekNext();
      if (!next) return "No next card.";
      return getParityLabel(next.value);
    },
  }),

  makeCheat({
    id: "chance_higher",
    name: "Chance Higher",
    rarity: "common",
    unlockAt: 0,
    category: "probability",
    baseWeight: 0.95,
    use: () => {
      if (!state.current) return "No current card.";
      const val = getCurrentEffectiveValue();
      const remaining = state.deck.slice(state.index + 1);
      if (!remaining.length) return "No next card.";
      const count = remaining.filter((c) => c.value > val).length;
      return `${Math.round((count / remaining.length) * 100)}% higher`;
    },
  }),

  makeCheat({
    id: "chance_lower",
    name: "Chance Lower",
    rarity: "common",
    unlockAt: 0,
    category: "probability",
    baseWeight: 0.95,
    use: () => {
      if (!state.current) return "No current card.";
      const val = getCurrentEffectiveValue();
      const remaining = state.deck.slice(state.index + 1);
      if (!remaining.length) return "No next card.";
      const count = remaining.filter((c) => c.value < val).length;
      return `${Math.round((count / remaining.length) * 100)}% lower`;
    },
  }),

  // =====================
  // MID-TIER INFO
  // =====================
  makeCheat({
    id: "one_of_next_two_higher",
    name: "One of Next 2 Higher?",
    rarity: "common",
    unlockAt: 6,
    category: "probability",
    baseWeight: 0.85,
    use: () => {
      if (!state.current) return "No current card.";
      const next = getNextCardAt(1);
      const next2 = getNextCardAt(2);
      if (!next || !next2) return "Not enough cards remaining.";
      const currentVal = getCurrentEffectiveValue();
      const found = next.value > currentVal || next2.value > currentVal;
      return found ? "Yes — at least one is higher." : "No — neither is higher.";
    },
  }),

  makeCheat({
    id: "one_of_next_two_lower",
    name: "One of Next 2 Lower?",
    rarity: "common",
    unlockAt: 6,
    category: "probability",
    baseWeight: 0.85,
    use: () => {
      if (!state.current) return "No current card.";
      const next = getNextCardAt(1);
      const next2 = getNextCardAt(2);
      if (!next || !next2) return "Not enough cards remaining.";
      const currentVal = getCurrentEffectiveValue();
      const found = next.value < currentVal || next2.value < currentVal;
      return found ? "Yes — at least one is lower." : "No — neither is lower.";
    },
  }),

  makeCheat({
    id: "next_two_total",
    name: "Total of Next Two",
    rarity: "uncommon",
    unlockAt: 8,
    category: "information",
    baseWeight: 0.8,
    use: () => {
      const next = getNextCardAt(1);
      const next2 = getNextCardAt(2);
      if (!next || !next2) return "Not enough cards remaining.";
      return `Total = ${next.value + next2.value}`;
    },
  }),

  makeCheat({
    id: "higher_of_next_two",
    name: "Higher of Next Two",
    rarity: "uncommon",
    unlockAt: 10,
    category: "information",
    baseWeight: 0.75,
    use: () => {
      const next = getNextCardAt(1);
      const next2 = getNextCardAt(2);
      if (!next || !next2) return "Not enough cards remaining.";
      return `Higher = ${Math.max(next.value, next2.value)}`;
    },
  }),

  makeCheat({
    id: "lower_of_next_two",
    name: "Lower of Next Two",
    rarity: "uncommon",
    unlockAt: 10,
    category: "information",
    baseWeight: 0.75,
    use: () => {
      const next = getNextCardAt(1);
      const next2 = getNextCardAt(2);
      if (!next || !next2) return "Not enough cards remaining.";
      return `Lower = ${Math.min(next.value, next2.value)}`;
    },
  }),

  makeCheat({
    id: "difference_of_next_two",
    name: "Difference Between Next 2 Cards",
    rarity: "uncommon",
    unlockAt: 12,
    category: "information",
    baseWeight: 0.75,
    use: () => {
      const next = getNextCardAt(1);
      const next2 = getNextCardAt(2);
      if (!next || !next2) return "Not enough cards remaining.";
      const high = Math.max(next.value, next2.value);
      const low = Math.min(next.value, next2.value);
      return `Difference = ${high - low}`;
    },
  }),

  makeCheat({
    id: "within_range_3",
    name: `Within ±${RANGE_CHEAT_DELTA}?`,
    rarity: "uncommon",
    unlockAt: 14,
    category: "information",
    baseWeight: 0.7,
    use: () => {
      const next = peekNext();
      if (!next || !state.current) return "No next card.";
      const currentVal = getCurrentEffectiveValue();
      const diff = Math.abs(next.value - currentVal);
      return diff <= RANGE_CHEAT_DELTA
        ? `Within ±${RANGE_CHEAT_DELTA}.`
        : `NOT within ±${RANGE_CHEAT_DELTA}.`;
    },
  }),

  makeCheat({
    id: "next_three_total",
    name: "Total of Next Three",
    rarity: "rare",
    unlockAt: 18,
    category: "information",
    baseWeight: 0.65,
    use: () => {
      const next = getNextCardAt(1);
      const next2 = getNextCardAt(2);
      const next3 = getNextCardAt(3);
      if (!next || !next2 || !next3) return "Not enough cards remaining.";
      return `Total = ${next.value + next2.value + next3.value}`;
    },
  }),

  // =====================
  // NUDGES
  // =====================
  makeCheat({
    id: "nudge_up",
    name: "Nudge +1",
    rarity: "common",
    unlockAt: 5,
    stacking: "stackable",
    category: "manipulation",
    baseWeight: 0.8,
    poolExcludedIfPowerOwned: "nudge_engine",
    use: () => {
      state.currentValueModifier += 1;
      const effective = getCurrentEffectiveValue();
      return `Current card is now treated as ${valueToRank(effective)} for the next guess.`;
    },
  }),

  makeCheat({
    id: "nudge_down",
    name: "Nudge -1",
    rarity: "common",
    unlockAt: 5,
    stacking: "stackable",
    category: "manipulation",
    baseWeight: 0.8,
    poolExcludedIfPowerOwned: "nudge_engine",
    use: () => {
      state.currentValueModifier -= 1;
      const effective = getCurrentEffectiveValue();
      return `Current card is now treated as ${valueToRank(effective)} for the next guess.`;
    },
  }),

  makeCheat({
    id: "nudge_up_2",
    name: "Nudge +2",
    rarity: "uncommon",
    unlockAt: 14,
    stacking: "stackable",
    category: "manipulation",
    baseWeight: 0.55,
    poolExcludedIfPowerOwned: "nudge_engine",
    use: () => {
      state.currentValueModifier += 2;
      const effective = getCurrentEffectiveValue();
      return `Current card is now treated as ${valueToRank(effective)} for the next guess.`;
    },
  }),

  makeCheat({
    id: "nudge_down_2",
    name: "Nudge -2",
    rarity: "uncommon",
    unlockAt: 14,
    stacking: "stackable",
    category: "manipulation",
    baseWeight: 0.55,
    poolExcludedIfPowerOwned: "nudge_engine",
    use: () => {
      state.currentValueModifier -= 2;
      const effective = getCurrentEffectiveValue();
      return `Current card is now treated as ${valueToRank(effective)} for the next guess.`;
    },
  }),

  // =====================
  // TACTICAL / LATER
  // =====================
  makeCheat({
    id: "swap",
    name: "Swap",
    rarity: "rare",
    unlockAt: 20,
    stacking: "repeatable",
    category: "manipulation",
    baseWeight: 0.6,
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

      state.seenCardIds.delete(oldCurrent.id);
      state.current = state.deck[currentIndex];
      state.currentValueModifier = 0;
      state.seenCardIds.add(state.current.id);

      return "Swapped with bottom card.";
    },
  }),

  makeCheat({
    id: "lucky_7",
    name: "Lucky 7",
    rarity: "rare",
    unlockAt: 24,
    stacking: "unique",
    category: "rescue",
    baseWeight: 0.45,
    use: () => {
      if (!state.current) return "No current card.";

      const effectiveValue = getCurrentEffectiveValue();
      if (effectiveValue !== 7) {
        return "Lucky 7 can only be used while your current card counts as 7.";
      }

      state.luckySevenArmed = true;
      return "Lucky 7 armed — your next guess will count as correct.";
    },
  }),

  makeCheat({
    id: "tear_corner",
    name: "Tear Corner",
    rarity: "rare",
    unlockAt: 35,
    category: "persistent",
    baseWeight: 0.35,
    use: () => {
      if (!state.current) return "No current card.";
      setCardBackStatus(state.current.id, { tornCorner: true });
      return `${describeCard(state.current)} now has a torn corner on its back.`;
    },
  }),

  // =====================
  // CURRENTLY DISABLED / LEGACY
  // =====================
  makeCheat({
    id: "same_colour",
    name: "Same Colour?",
    included: false,
    rarity: "common",
    unlockAt: 0,
    category: "information",
    use: () => {
      const next = peekNext();
      if (!next || !state.current) return "No next card.";
      return isRed(next) === isRed(state.current)
        ? "Same colour."
        : "Different colour.";
    },
  }),

  makeCheat({
    id: "within_range",
    name: "Within ±2?",
    included: false,
    rarity: "common",
    unlockAt: 0,
    category: "information",
    use: () => {
      const next = peekNext();
      if (!next || !state.current) return "No next card.";
      const currentVal = getCurrentEffectiveValue();
      const diff = Math.abs(next.value - currentVal);
      return diff <= 2 ? "Within ±2." : "NOT within ±2.";
    },
  }),

  makeCheat({
    id: "red_black",
    name: "Reveal Red / Black",
    included: false,
    rarity: "common",
    unlockAt: 0,
    category: "information",
    use: () => {
      const next = peekNext();
      if (!next) return "No next card.";
      return isRed(next) ? "Red." : "Black.";
    },
  }),
];

function canAddCheatToHand(cheatDef) {
  if (!cheatDef.included) return false;

  if (cheatDef.stacking === "stackable" || cheatDef.stacking === "repeatable") {
    return true;
  }

  return !state.cheats.some((c) => c.id === cheatDef.id);
}

function getCheatBaseOfferWeight(cheatDef) {
  const rarityWeight = CHEAT_RARITY_WEIGHTS[cheatDef.rarity] ?? 1;
  const baseWeight = cheatDef.baseWeight ?? 1;
  return rarityWeight * baseWeight;
}

function getCheatOfferWeight(cheatDef, selectedSoFar = []) {
  let weight = getCheatBaseOfferWeight(cheatDef);

  // Make very simple cheats slightly more common early.
  if (state.correctAnswers <= 3 && cheatDef.category === "information") {
    weight *= 1.15;
  }

  // Make rescue/manipulation a bit more likely later.
  if (state.correctAnswers >= 6 && (cheatDef.category === "manipulation" || cheatDef.category === "rescue")) {
    weight *= 1.15;
  }

  // Reduce repeats of the same category in one offer.
  if (selectedSoFar.some((picked) => picked.category === cheatDef.category)) {
    weight *= 0.65;
  }

  // Reduce category spam in hand.
  const heldSameCategory = state.cheats.filter((held) => held.category === cheatDef.category).length;
  if (heldSameCategory >= 2) {
    weight *= 0.7;
  }

  // Slightly favour rescue around awkward middling values.
  const currentVal = getCurrentEffectiveValue();
  if (
    currentVal !== null &&
    (currentVal === 6 || currentVal === 7 || currentVal === 8) &&
    cheatDef.category === "rescue"
  ) {
    weight *= 1.2;
  }

  return Math.max(0, weight);
}

function getWeightedRandomCheat(pool, selectedSoFar = []) {
  const weighted = pool
    .map((cheat) => ({
      cheat,
      weight: getCheatOfferWeight(cheat, selectedSoFar),
    }))
    .filter((entry) => entry.weight > 0);

  if (!weighted.length) return null;

  const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll <= 0) return entry.cheat;
  }

  return weighted[weighted.length - 1].cheat;
}

function getRandomCheatOptions(count = 3) {
  const ownedStartPowerId = state.selectedStartPowerId;

  const pool = CHEATS.filter((c) => {
    if (!c.included) return false;

    if ((state.metaProgression ?? 0) < (c.unlockAt ?? 0)) {
      return false;
    }

    if (c.poolExcludedIfPowerOwned && c.poolExcludedIfPowerOwned === ownedStartPowerId) {
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
  const remainingPool = [...pool];

  while (options.length < count && remainingPool.length > 0) {
    const chosen = getWeightedRandomCheat(remainingPool, options);
    if (!chosen) break;

    options.push(chosen);

    const idx = remainingPool.findIndex((c) => c.id === chosen.id);
    if (idx >= 0) remainingPool.splice(idx, 1);
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
