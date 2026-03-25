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

function clampCardValue(value) {
  return clamp(value, 1, 13);
}

function getWeightedRandomIndex(items, getWeight) {
  const totalWeight = items.reduce((sum, item) => sum + Math.max(0, getWeight(item)), 0);
  if (totalWeight <= 0) return -1;

  let roll = Math.random() * totalWeight;
  for (let i = 0; i < items.length; i += 1) {
    roll -= Math.max(0, getWeight(items[i]));
    if (roll <= 0) return i;
  }
  return items.length - 1;
}

function getCheatWeight(cheat) {
  const rarityWeight = CHEAT_RARITY[cheat.rarity] ?? 1;
  const explicitWeight = Number.isFinite(cheat.weight) ? cheat.weight : 1;
  return rarityWeight * explicitWeight;
}

function hasCheatBeenDiscovered(cheatId) {
  return !!state.cheatUnlocks?.[cheatId]?.discovered;
}

function markCheatDiscovered(cheat, source = "random") {
  if (!cheat) return false;
  if (hasCheatBeenDiscovered(cheat.id)) return false;

  state.cheatUnlocks[cheat.id] = {
    discovered: true,
    discoveredAtMeta: state.metaProgression ?? 0,
    discoverySource: source,
  };

  saveCheatUnlocks(state.cheatUnlocks);

  if (!state.justUnlockedCheatIds.includes(cheat.id)) {
    state.justUnlockedCheatIds.push(cheat.id);
  }

  return true;
}

function markMetaUnlockedCheats() {
  const newlyUnlocked = CHEATS.filter((cheat) => {
    if (!cheat.included) return false;
    if ((state.metaProgression ?? 0) < (cheat.unlockAt ?? 0)) return false;
    return !hasCheatBeenDiscovered(cheat.id);
  });

  newlyUnlocked.forEach((cheat) => {
    markCheatDiscovered(cheat, "meta");
  });

  return newlyUnlocked;
}

const CHEAT_DESCRIPTIONS = {
  "Above 9?": "Is the next face down card above 9?",
  "Below 5?": "Is the next face down card below 5?",
  "Between 5 and 9?": "Is the value of the next face down card a 5, 6, 7, 8 or 9?",
  "Total of Next Two": "Reveals the total of the next two face down cards.",
  "Total of Next Three": "Reveals the total of the next three face down cards.",
  "Top Half / Bottom Half": "Is the next card below 7 or is it 7 and above?",
  "Within ±3?": "Is the next card within three above or below the current face card?",
  "One of Next 2 Higher?": "Reveals if at least one of the next two cards is higher than the current card.",
  "One of Next 2 Lower?": "Reveals if at least one of the next two cards is lower than the current card.",
  "Lower of Next Two": "Reveals the lowest value of the next two face down cards.",
  "Higher of Next Two": "Reveals the highest value of the next two face down cards.",
  "Difference Between Next 2 Cards": "Reveals the spread between the next two cards by subtracting the lower from the higher.",
  "Next Card Parity": "Reveals if the next card is odd, even or neither (picture card).",
  "Chance Higher": "Calculates the probability that one of the remaining cards is higher than the current card.",
  "Chance Lower": "Calculates the probability that one of the remaining cards is lower than the current card.",
  "Nudge +1": "Increases the value of the current face card by one.",
  "Nudge -1": "Decreases the value of the current face card by one.",
  "Nudge +2": "Increases the value of the current face card by two, stopping at King.",
  "Nudge -2": "Decreases the value of the current face card by two, stopping at Ace.",
  "Lucky 7": "Can only be used on a 7. Your next higher/lower guess counts as correct even if it is wrong.",
  "Swap": "Replace the current face card with the card at the bottom of the deck.",
  "Tear Corner": "Tear off the top left corner of the current face card (affects future runs).",
};

const CHEATS = [
  {
    id: "above_9",
    name: "Above 9?",
    rarity: "common",
    weight: 1,
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
    weight: 1,
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
    weight: 1,
    included: false,
    unlockAt: 0,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      const next = peekNext();
      if (!next || !state.current) return "No next card.";
      return isRed(next) === isRed(state.current) ? "Same colour." : "Different colour.";
    },
  },
  {
    id: "mid_range",
    name: "Between 5 and 9?",
    rarity: "common",
    weight: 1,
    included: true,
    unlockAt: 0,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      const next = peekNext();
      if (!next) return "No next card.";
      return next.value >= 5 && next.value <= 9 ? "Yes — between 5 and 9." : "No — outside 5–9.";
    },
  },
  {
    id: "next_two_total",
    name: "Total of Next Two",
    rarity: "uncommon",
    weight: 1,
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
    weight: 1,
    included: true,
    unlockAt: 6,
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
    weight: 1,
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
    weight: 1,
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
    weight: 1,
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
      return found ? "Yes — at least one is higher." : "No — neither is higher.";
    },
  },
  {
    id: "one_of_next_two_lower",
    name: "One of Next 2 Lower?",
    rarity: "common",
    weight: 1,
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
      return found ? "Yes — at least one is lower." : "No — neither is lower.";
    },
  },
  {
    id: "higher_of_next_two",
    name: "Higher of Next Two",
    rarity: "uncommon",
    weight: 1,
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
    weight: 1,
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
    id: "difference_of_next_two",
    name: "Difference Between Next 2 Cards",
    rarity: "uncommon",
    weight: 1,
    included: true,
    unlockAt: 4,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      const next = getNextCardAt(1);
      const next2 = getNextCardAt(2);
      if (!next || !next2) return "Not enough cards remaining.";
      const low = Math.min(next.value, next2.value);
      const high = Math.max(next.value, next2.value);
      return `Difference = ${high - low}`;
    },
  },
  {
    id: "next_card_parity",
    name: "Next Card Parity",
    rarity: "common",
    weight: 1,
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
  {
    id: "within_range",
    name: "Within ±2?",
    rarity: "common",
    weight: 1,
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
    weight: 1,
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
    weight: 1,
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
    weight: 1,
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
    weight: 1,
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
    weight: 1,
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
    id: "nudge_up_2",
    name: "Nudge +2",
    rarity: "uncommon",
    weight: 1,
    included: true,
    unlockAt: 5,
    stacking: "stackable",
    consumeOnUse: true,
    poolExcludedIfPowerOwned: "nudge_engine",
    use: () => {
      const current = getCurrentEffectiveValue();
      const nextValue = clampCardValue(current + 2);
      state.currentValueModifier += nextValue - current;
      return `Current card is now treated as ${valueToRank(getCurrentEffectiveValue())} for the next guess.`;
    },
  },
  {
    id: "nudge_down_2",
    name: "Nudge -2",
    rarity: "uncommon",
    weight: 1,
    included: true,
    unlockAt: 5,
    stacking: "stackable",
    consumeOnUse: true,
    poolExcludedIfPowerOwned: "nudge_engine",
    use: () => {
      const current = getCurrentEffectiveValue();
      const nextValue = clampCardValue(current - 2);
      state.currentValueModifier += nextValue - current;
      return `Current card is now treated as ${valueToRank(getCurrentEffectiveValue())} for the next guess.`;
    },
  },
  {
    id: "lucky_7",
    name: "Lucky 7",
    rarity: "rare",
    weight: 1,
    included: true,
    unlockAt: 8,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      if (!state.current) return "No current card.";
      const currentVal = getCurrentEffectiveValue();
      if (currentVal !== 7) return "Lucky 7 can only be used on a 7.";
      state.lucky7Armed = true;
      return "Lucky 7 armed — your next guess will count as correct.";
    },
  },
  {
    id: "tear_corner",
    name: "Tear Corner",
    rarity: "common",
    weight: 1,
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
    weight: 1,
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

      state.seenCardIds.delete(oldCurrent.id);
      state.current = state.deck[currentIndex];
      state.currentValueModifier = 0;
      state.seenCardIds.add(state.current.id);

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

function getEligibleCheatPool() {
  const ownedStartPowerId = state.selectedStartPowerId;

  return CHEATS.filter((c) => {
    if (!c.included) return false;
    if ((state.metaProgression ?? 0) < (c.unlockAt ?? 0)) return false;

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
}

function getRandomCheatOptions(count = 3) {
  const pool = [...getEligibleCheatPool()];
  const options = [];

  while (options.length < count && pool.length > 0) {
    const idx = getWeightedRandomIndex(pool, getCheatWeight);
    if (idx < 0) break;
    options.push(pool.splice(idx, 1)[0]);
  }

  return options;
}

function offerCheatChoice() {
  const newlyMetaUnlocked = markMetaUnlockedCheats();
  state.pendingCheatOptions = getRandomCheatOptions(3);

  if (newlyMetaUnlocked.length) {
    state.message = `Unlocked: ${newlyMetaUnlocked.map((c) => c.name).join(", ")}`;
  } else {
    state.message = "Choose 1 cheat:";
  }

  render();
}

function pickCheatFromChoice(index) {
  const cheat = state.pendingCheatOptions[index];
  if (!cheat) return;

if (canAddCheatToHand(cheat)) {
  const wasNew = !hasCheatBeenDiscovered(cheat.id);

  if (wasNew) {
    markCheatDiscovered(cheat, "random");
  }

  state.cheats.push({ ...cheat });

  state.message = wasNew
    ? `Picked NEW cheat: ${cheat.name}`
    : `Picked: ${cheat.name}`;
}

  state.pendingCheatOptions = [];
  render();
}
