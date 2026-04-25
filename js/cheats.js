const RANGE_CHEAT_DELTA = 3;
const CHEAT_CHOICE_LOCK_MS = 500;

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

function getUpcomingCheatValue(offset = 1) {
  const card = getNextCardAt(offset);
  if (!card) return null;
  const modifier = offset === 1 ? (state.nextCardValueModifier || 0) : 0;
  return clampCardValue(card.value + modifier);
}
function clampCardValue(value) {
  return clamp(value, 1, 13);
}

function isPrimeCardValue(value) {
  return value === 2 || value === 3 || value === 5 || value === 7 || value === 11 || value === 13;
}

function formatAverageValue(total, count) {
  if (!count) return "0";
  const average = total / count;
  if (Number.isInteger(average)) return String(average);
  return average.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}
function formatCheatValue(value) {
  return valueToRank(value);
}

function formatCardIdentityForCheat(card, offset = 0) {
  if (!card) return "Unknown card";
  const value = offset > 0 ? getUpcomingCheatValue(offset) : card.value;
  return `${valueToRank(value)}${card.suit || ""}`;
}

function getCheatDeterministicRng(label) {
  const seedBase = normalizeSeed(state.runSeed || "") || "NO-SEED";
  return mulberry32(stringToSeedNumber(`${GAME_VERSION}|${seedBase}|${state.index}|${label}`));
}

function getWeightedRandomIndex(items, getWeight, rng = Math.random) {
  const totalWeight = items.reduce((sum, item) => sum + Math.max(0, getWeight(item)), 0);
  if (totalWeight <= 0) return -1;

  let roll = rng() * totalWeight;
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
    if ((cheat.unlockAt ?? 0) <= 0) return false;
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
  "Is it an Ace?": "Reveals whether the very next face down card is an Ace.",
  "Is it a King?": "Reveals whether the next face down card is a King.",
  "Ace ahead?": "Reveals whether at least one Ace appears in the next three face down cards.",
  "King ahead?": "Reveals whether at least one King appears in the next three face down cards.",
  "Number Remaining?": "Reveals how many copies of the next face down card's rank are still left in the deck, including that next card.",
  "Total of Next Two": "Reveals the total of the next two face down cards.",
  "Total of Next Three": "Reveals the total of the next three face down cards.",
  "Total Above 12?": "Reveals whether the next two face down cards total more than 12.",
  "Total Above 20?": "Reveals whether the next two face down cards total more than 20.",
  "Total Under 10?": "Reveals whether the next two face down cards total less than 10.",
  "Total Under 15?": "Reveals whether the next two face down cards total less than 15.",
  "Prime Ahead?": "Reveals whether the next face down card is prime-valued: 2, 3, 5, 7, J = 11, or K = 13.",
  "Product of Next Two": "Reveals the product of the next two face down cards.",
  "Top Half / Bottom Half": "Is the next card below 7 or is it 7 and above?",
  "Face Card Ahead?": "Reveals whether at least one face card (J, Q, or K) appears in the next three face down cards.",
  [`Within ±${RANGE_CHEAT_DELTA}?`]: `Is the next card within ${RANGE_CHEAT_DELTA} above or below the current face card?`,
  "One of Next 2 Higher?": "Reveals if at least one of the next two cards is higher than the current card.",
  "One of Next 2 Lower?": "Reveals if at least one of the next two cards is lower than the current card.",
  "Higher of Next Two": "Reveals the highest value of the next two face down cards.",
  "Lower of Next Two": "Reveals the lowest value of the next two face down cards.",
  "Next Card Parity": "Reveals if the next card is odd, even or a picture card.",
  "Chance Higher": "Calculates the probability that one of the remaining cards is higher than the current card.",
  "Chance Lower": "Calculates the probability that one of the remaining cards is lower than the current card.",
  "Nudge +1": "Increases the value of the current face card by one for the next guess.",
  "Nudge -1": "Decreases the value of the current face card by one for the next guess.",
  "Nudge +2": "Increases the value of the current face card by two, stopping at King.",
  "Nudge -2": "Decreases the value of the current face card by two, stopping at Ace.",
  "+5 Energy": "Green Deck only. Gain 5 Energy instantly.",
  "Next Card Nudge Up": "Temporarily nudges the next face-down card up by 3 for the next guess, stopping at King.",
  "Next Card Nudge Down": "Temporarily nudges the next face-down card down by 3 for the next guess, stopping at Ace.",
  "Halve It": "Can only be used on an even card. Treat the current card as half its value for the next guess.",
  "Double Trouble": "Treat the current card as double its value for the next guess, up to King.",
  "Odd One Out": "For the next card only: if it is odd, you lose. Aces count as odd even under Aces Wild. Otherwise you survive.",
  "Lucky 7": "Can only be used on a 7. Your next wrong guess still counts as correct.",
  "Five Alive": "Can only be used on a 5. If your next guess is wrong, the run still continues.",
  "6/7": "Use only on an un-nudged 6 or 7, and it must be the first and only cheat played on that card. Nudges then lock. Guess correctly to pick 3 cheats in a row. Guess wrong and you lose.",
  "Twin Peek": "Checks the next five cards and reveals whether any of them match the face-up card's current value.",
  "Run Stopper": "Checks the next five cards and reveals whether at least one Ace or King appears.",
  "Bang Average": "Reveals the exact average value of the next three face down cards.",
  "God Save The King": "Play on any face card. If the next card is a King, the run survives even if your guess is wrong.",
  "Swap": "Swap the current face-up card with the next face-down card.",
  "Jack Of All Trades": "Can only be used on a Jack. Swap the current Jack with the next face-down card and reveal that new current card.",
  "Fortune Teller": "Reveals the values of the next three face-down cards in a random order.",
  "You Can Cheat A Cheater": "After your next three correct guesses, choose an extra Cheat in addition to any normal rewards.",
  "Always Bet On The Black": "For the next card only: if it is a Club or a Spade, the run survives even on a wrong guess.",
  "Locky 7s": "Gain 10 Nudge +1 and 10 Nudge -1 charges. From then on, any card that is or becomes a 7 locks at 7 and cannot be nudged.",
  "Hot or Cold?": "Is the next card within 7 values of the current face card, up or down?",
  "Corporate Icebreaker": "Hear two true value-and-suit facts and one believable lie about the next three cards.",
  "Tear Corner": "Tear off the top left corner of the current face card so it can be recognised in future runs.",
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
      const nextValue = getUpcomingCheatValue(1);
      return nextValue > 9 ? "Yes — above 9." : "No — 9 or below.";
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
      const nextValue = getUpcomingCheatValue(1);
      return nextValue < 5 ? "Yes — below 5." : "No — 5 or above.";
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
      const nextValue = getUpcomingCheatValue(1);
      return nextValue >= 5 && nextValue <= 9 ? "Yes — between 5 and 9." : "No — outside 5–9.";
    },
  },
    {
    id: "is_it_an_ace",
    name: "Is it an Ace?",
    rarity: "common",
    weight: 1,
    included: true,
    unlockAt: 0,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      const next = getNextCardAt(1);
      if (!next) return "No next card.";
      return next.rank === "A" ? "Yes — the next card is an Ace." : "No — the next card is not an Ace.";
    },
  },
  {
    id: "is_it_a_king",
    name: "Is it a King?",
    rarity: "common",
    weight: 1,
    included: true,
    unlockAt: 0,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      const next = peekNext();
      if (!next) return "No next card.";
      return next.rank === "K" ? "Yes — it is a King." : "No — not a King.";
    },
  },
  {
    id: "ace_ahead",
    name: "Ace ahead?",
    rarity: "uncommon",
    weight: 1,
    included: true,
    unlockAt: 2,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      const upcoming = [getNextCardAt(1), getNextCardAt(2), getNextCardAt(3)].filter(Boolean);
      if (upcoming.length === 0) return "No next card.";
      const found = upcoming.some((card) => card.rank === "A");
      return found ? "Yes — an Ace is in the next three." : "No — no Ace in the next three.";
    },
  },
  {
    id: "king_ahead",
    name: "King ahead?",
    rarity: "uncommon",
    weight: 1,
    included: true,
    unlockAt: 2,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      const upcoming = [getNextCardAt(1), getNextCardAt(2), getNextCardAt(3)].filter(Boolean);
      if (upcoming.length === 0) return "No next card.";
      const found = upcoming.some((card) => card.rank === "K");
      return found ? "Yes — a King is in the next three." : "No — no King in the next three.";
    },
  },
  {
    id: "number_remaining",
    name: "Number Remaining?",
    rarity: "uncommon",
    weight: 1,
    included: false,
    unlockAt: 3,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      const next = peekNext();
      if (!next) return "No next card.";
      const remaining = countUnseenCardsOfRank(next.rank);
      return `${remaining} matching ${remaining === 1 ? "card remains" : "cards remain"} in the deck.`;
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
      const nextValue = getUpcomingCheatValue(1);
      const next2Value = getUpcomingCheatValue(2);
      return `Total = ${nextValue + next2Value}`;
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
      const nextValue = getUpcomingCheatValue(1);
      const next2Value = getUpcomingCheatValue(2);
      const next3Value = getUpcomingCheatValue(3);
      return `Total = ${nextValue + next2Value + next3Value}`;
    },
  },
  {
    id: "total_above_12",
    name: "Total Above 12?",
    rarity: "common",
    weight: 1,
    included: true,
    unlockAt: 0,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      const next = getNextCardAt(1);
      const next2 = getNextCardAt(2);
      if (!next || !next2) return "Not enough cards remaining.";
      const nextValue = getUpcomingCheatValue(1);
      const next2Value = getUpcomingCheatValue(2);
      return nextValue + next2Value > 12 ? "Yes — total is above 12." : "No — total is 12 or below.";
    },
  },
  {
    id: "total_above_20",
    name: "Total Above 20?",
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
      const nextValue = getUpcomingCheatValue(1);
      const next2Value = getUpcomingCheatValue(2);
      return nextValue + next2Value > 20 ? "Yes — total is above 20." : "No — total is 20 or below.";
    },
  },
  {
    id: "total_under_10",
    name: "Total Under 10?",
    rarity: "common",
    weight: 1,
    included: true,
    unlockAt: 0,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      const next = getNextCardAt(1);
      const next2 = getNextCardAt(2);
      if (!next || !next2) return "Not enough cards remaining.";
      const nextValue = getUpcomingCheatValue(1);
      const next2Value = getUpcomingCheatValue(2);
      return nextValue + next2Value < 10 ? "Yes — total is under 10." : "No — total is 10 or above.";
    },
  },
  {
    id: "total_under_15",
    name: "Total Under 15?",
    rarity: "common",
    weight: 1,
    included: true,
    unlockAt: 2,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      const next = getNextCardAt(1);
      const next2 = getNextCardAt(2);
      if (!next || !next2) return "Not enough cards remaining.";
      const nextValue = getUpcomingCheatValue(1);
      const next2Value = getUpcomingCheatValue(2);
      return nextValue + next2Value < 15 ? "Yes — total is under 15." : "No — total is 15 or above.";
    },
  },
    {
    id: "prime_ahead",
    name: "Prime Ahead?",
    rarity: "uncommon",
    weight: 1,
    included: false,
    unlockAt: 3,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      const next = peekNext();
      if (!next) return "No next card.";
      return isPrimeCardValue(next.value)
        ? "Yes — the next card is prime-valued (2, 3, 5, 7, J = 11, or K = 13)."
        : "No — the next card is not prime-valued.";
    },
  },
  {
    id: "product_of_next_two",
    name: "Product of Next Two",
    rarity: "rare",
    weight: 1,
    included: true,
    unlockAt: 8,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      const next = getNextCardAt(1);
      const next2 = getNextCardAt(2);
      if (!next || !next2) return "Not enough cards remaining.";
      const nextValue = getUpcomingCheatValue(1);
      const next2Value = getUpcomingCheatValue(2);
      return `Product = ${nextValue * next2Value}`;
    },
  },
  {
    id: "top_half_bottom_half",
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
      const nextValue = getUpcomingCheatValue(1);
      return nextValue >= 7 ? "Top half (7+)." : "Bottom half (6 or below).";
    },
  },
  {
    id: "face_card_ahead",
    name: "Face Card Ahead?",
    rarity: "uncommon",
    weight: 1,
    included: true,
    unlockAt: 4,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      const upcoming = [getNextCardAt(1), getNextCardAt(2), getNextCardAt(3)].filter(Boolean);
      if (upcoming.length === 0) return "No next card.";
      const found = upcoming.some((card) => card.value >= 11);
      return found
        ? "Yes — a face card is in the next three."
        : "No — no face card in the next three.";
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
      const currentVal = getCurrentEffectiveValue();
      const next = getNextCardAt(1);
      const next2 = getNextCardAt(2);
      if (!next || !next2) return "Not enough cards remaining.";
      const nextValue = getUpcomingCheatValue(1);
      const next2Value = getUpcomingCheatValue(2);
      return nextValue > currentVal || next2Value > currentVal
        ? "Yes — at least one is higher."
        : "No — neither is higher.";
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
      const currentVal = getCurrentEffectiveValue();
      const next = getNextCardAt(1);
      const next2 = getNextCardAt(2);
      if (!next || !next2) return "Not enough cards remaining.";
      const nextValue = getUpcomingCheatValue(1);
      const next2Value = getUpcomingCheatValue(2);
      return nextValue < currentVal || next2Value < currentVal
        ? "Yes — at least one is lower."
        : "No — neither is lower.";
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
      const nextValue = getUpcomingCheatValue(1);
      const next2Value = getUpcomingCheatValue(2);
      return `Higher = ${formatCheatValue(Math.max(nextValue, next2Value))}`;
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
      const nextValue = getUpcomingCheatValue(1);
      const next2Value = getUpcomingCheatValue(2);
      return `Lower = ${formatCheatValue(Math.min(nextValue, next2Value))}`;
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
      const nextValue = getUpcomingCheatValue(1);
      return getParityLabel(nextValue);
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
      const current = getCurrentEffectiveValue();
      if (state.lockySevensActive && current === 7) {
        return "Locky 7s active - 7s cannot be nudged.";
      }
      const targetValue = getAdjustedCurrentNudgeTarget(1);
      if (!Number.isFinite(targetValue)) return "No current card.";
      state.currentValueModifier += targetValue - current;
      return `Current card is now treated as ${valueToRank(getCurrentEffectiveValue())} for the next guess.`;
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
      const current = getCurrentEffectiveValue();
      if (state.lockySevensActive && current === 7) {
        return "Locky 7s active - 7s cannot be nudged.";
      }
      const targetValue = getAdjustedCurrentNudgeTarget(-1);
      if (!Number.isFinite(targetValue)) return "No current card.";
      state.currentValueModifier += targetValue - current;
      return `Current card is now treated as ${valueToRank(getCurrentEffectiveValue())} for the next guess.`;
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
      if (state.lockySevensActive && current === 7) {
        return "Locky 7s active - 7s cannot be nudged.";
      }
      const nextValue = getAdjustedCurrentNudgeTarget(2);
      if (!Number.isFinite(nextValue)) return "No current card.";
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
      if (state.lockySevensActive && current === 7) {
        return "Locky 7s active - 7s cannot be nudged.";
      }
      const nextValue = getAdjustedCurrentNudgeTarget(-2);
      if (!Number.isFinite(nextValue)) return "No current card.";
      state.currentValueModifier += nextValue - current;
      return `Current card is now treated as ${valueToRank(getCurrentEffectiveValue())} for the next guess.`;
    },
  },
  {
    id: "next_card_nudge_up",
    name: "Next Card Nudge Up",
    rarity: "uncommon",
    weight: 0.8,
    included: true,
    unlockAt: 22,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      const next = peekNext();
      if (!next) return "No next card.";
      const currentValue = getUpcomingCheatValue(1);
      const targetValue = getAdjustedNextNudgeTarget(3);
      if (!Number.isFinite(targetValue)) return "No next card.";
      state.nextCardValueModifier = targetValue - currentValue;

      return "Next face-down card nudged up for the next guess.";
    },
  },
  {
    id: "next_card_nudge_down",
    name: "Next Card Nudge Down",
    rarity: "uncommon",
    weight: 0.8,
    included: true,
    unlockAt: 22,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      const next = peekNext();
      if (!next) return "No next card.";
      const currentValue = getUpcomingCheatValue(1);
      const targetValue = getAdjustedNextNudgeTarget(-3);
      if (!Number.isFinite(targetValue)) return "No next card.";
      state.nextCardValueModifier = targetValue - currentValue;

      return "Next face-down card nudged down for the next guess.";
    },
  },  {
    id: "halve_it",
    name: "Halve It",
    rarity: "uncommon",
    weight: 1,
    included: false,
    unlockAt: 3,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      if (!state.current) return "No current card.";
      const current = getCurrentEffectiveValue();
      if (current % 2 !== 0) {
        return "Halve It can only be used on an even card.";
      }
      const nextValue = clampCardValue(Math.floor(current / 2));
      state.currentValueModifier += nextValue - current;
      return `Current card is now treated as ${valueToRank(getCurrentEffectiveValue())} for the next guess.`;
    },
  },
  {
    id: "double_trouble",
    name: "Double Trouble",
    rarity: "rare",
    weight: 1,
    included: true,
    unlockAt: 7,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      if (!state.current) return "No current card.";
      const current = getCurrentEffectiveValue();
      const nextValue = clampCardValue(current * 2);
      state.currentValueModifier += nextValue - current;
      return `Current card is now treated as ${valueToRank(getCurrentEffectiveValue())} for the next guess.`;
    },
  },
  {
    id: "odd_one_out",
    name: "Odd One Out",
    rarity: "rare",
    weight: 1,
    included: true,
    unlockAt: 6,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      if (!state.current) return "No current card.";
      state.oddOneOutArmed = true;
      return "Odd One Out armed — if the next face-up card is odd, you lose. Otherwise you survive.";
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
    id: "five_alive",
    name: "Five Alive",
    rarity: "rare",
    weight: 1,
    included: true,
    unlockAt: 9,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      if (!state.current) return "No current card.";
      const currentVal = getCurrentEffectiveValue();
      if (currentVal !== 5) return "Five Alive can only be used on a 5.";
      state.fiveAliveArmed = true;
      return "Five Alive armed — a wrong next guess will still continue the run.";
    },
  },
  {
    id: "six_seven",
    name: "6/7",
    rarity: "rare",
    weight: 0.8,
    included: true,
    unlockAt: 18,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      if (!state.current) return "No current card.";
      if ((state.cheatUsesOnCurrentCard || 0) > 0) {
        return "6/7 must be the first cheat you play on this card.";
      }
      if ((state.currentValueModifier || 0) !== 0) {
        return "6/7 can only be used on an un-nudged 6 or 7.";
      }
      if (state.current.value !== 6 && state.current.value !== 7) {
        return "6/7 can only be used on a 6 or 7.";
      }
      state.sixSevenArmed = true;
      return "6/7 armed — no nudges or other cheats on this card. Guess correctly to choose 3 cheats.";
    },
  },
  {
    id: "twin_peek",
    name: "Twin Peek",
    rarity: "uncommon",
    weight: 0.9,
    included: true,
    unlockAt: 14,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      if (!state.current) return "No current card.";
      const currentVal = getCurrentEffectiveValue();
      const upcoming = [1, 2, 3, 4, 5].map((offset) => getNextCardAt(offset)).filter(Boolean);
      if (upcoming.length === 0) return "No next card.";
      const found = upcoming.some((card, index) => getUpcomingCheatValue(index + 1) === currentVal);
      return found ? "Yes — a match to the current value is in the next five." : "No — no match to the current value in the next five.";
    },
  },
  {
    id: "run_stopper",
    name: "Run Stopper",
    rarity: "uncommon",
    weight: 0.85,
    included: true,
    unlockAt: 16,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      const upcoming = [1, 2, 3, 4, 5].map((offset) => getNextCardAt(offset)).filter(Boolean);
      if (upcoming.length === 0) return "No next card.";
      const found = upcoming.some((card) => card.rank === "A" || card.rank === "K");
      return found ? "Yes — an Ace or King is in the next five." : "No — no Ace or King in the next five.";
    },
  },
  {
    id: "bang_average",
    name: "Bang Average",
    rarity: "uncommon",
    weight: 0.8,
    included: true,
    unlockAt: 20,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      const next = getNextCardAt(1);
      const next2 = getNextCardAt(2);
      const next3 = getNextCardAt(3);
      if (!next || !next2 || !next3) return "Not enough cards remaining.";
      const total = getUpcomingCheatValue(1) + getUpcomingCheatValue(2) + getUpcomingCheatValue(3);
      return `Average = ${formatAverageValue(total, 3)}`;
    },
  },
  {
    id: "god_save_the_king",
    name: "God Save The King",
    rarity: "rare",
    weight: 0.75,
    included: true,
    unlockAt: 24,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      if (!state.current) return "No current card.";
      const currentVal = getCurrentEffectiveValue();
      if (currentVal < 11) return "God Save The King can only be used on a face card.";
      state.godSaveKingArmed = true;
      return "God Save The King armed — if the next card is a King, the run survives even on a wrong guess.";
    },
  },
  {
    id: "jack_of_all_trades",
    name: "Jack Of All Trades",
    rarity: "rare",
    weight: 0.8,
    included: true,
    unlockAt: 0,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      if (!state.current) return "No current card.";
      const currentVal = getCurrentEffectiveValue();
      if (currentVal !== 11) return "Jack Of All Trades can only be used on a Jack.";
      const currentIndex = state.index;
      const nextIndex = currentIndex + 1;
      if (nextIndex >= state.deck.length) return "No next card.";

      const oldCurrent = state.deck[currentIndex];
      const oldNext = state.deck[nextIndex];
      state.deck[currentIndex] = oldNext;
      state.deck[nextIndex] = oldCurrent;
      state.current = state.deck[currentIndex];
      state.currentValueModifier = 0;
      markCardSeen(state.current);

      return `Jack swapped forward - current card is now ${describeCard(state.current)}.`;
    },
  },
  {
    id: "fortune_teller",
    name: "Fortune Teller",
    rarity: "uncommon",
    weight: 0.9,
    included: true,
    unlockAt: 0,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      const upcoming = [1, 2, 3].map((offset) => getNextCardAt(offset)).filter(Boolean);
      if (upcoming.length === 0) return "No next card.";
      const values = upcoming.map((card, index) => formatCheatValue(getUpcomingCheatValue(index + 1)));
      const rng = getCheatDeterministicRng("fortune_teller");
      for (let i = values.length - 1; i > 0; i -= 1) {
        const swapIndex = Math.floor(rng() * (i + 1));
        const temp = values[i];
        values[i] = values[swapIndex];
        values[swapIndex] = temp;
      }
      return `Fortunes: ${values.join(", ")}`;
    },
  },
  {
    id: "you_can_cheat_a_cheater",
    name: "You Can Cheat A Cheater",
    rarity: "rare",
    weight: 0.8,
    included: true,
    unlockAt: 0,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      state.cheatACheaterRemaining = 3;
      return "You Can Cheat A Cheater armed - choose an extra Cheat after your next 3 correct guesses.";
    },
  },
  {
    id: "always_bet_on_the_black",
    name: "Always Bet On The Black",
    rarity: "rare",
    weight: 0.85,
    included: true,
    unlockAt: 0,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      state.alwaysBetBlackArmed = true;
      return "Always Bet On The Black armed - if the next card is a Club or Spade, the run survives even on a wrong guess.";
    },
  },
  {
    id: "locky_7s",
    name: "Locky 7s",
    rarity: "rare",
    weight: 0.8,
    included: true,
    unlockAt: 0,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      state.lockySevensActive = true;
      state.nudgeUpCharges = (state.nudgeUpCharges || 0) + 10;
      state.nudgeDownCharges = (state.nudgeDownCharges || 0) + 10;

      if (getCurrentEffectiveValue() === 7 && state.current) {
        state.currentValueModifier = 7 - state.current.value;
      }

      const nextValue = getUpcomingCheatValue(1);
      if (nextValue === 7) {
        const next = peekNext();
        if (next) {
          state.nextCardValueModifier = 7 - next.value;
        }
      }

      return "Locky 7s active - gained 10 Nudge +1 and 10 Nudge -1 charges. Any card that is or becomes a 7 now locks at 7.";
    },
  },
  {
    id: "hot_or_cold",
    name: "Hot or Cold?",
    rarity: "common",
    weight: 1,
    included: true,
    unlockAt: 0,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      if (!state.current) return "No current card.";
      const next = getNextCardAt(1);
      if (!next) return "No next card.";
      const difference = Math.abs(getUpcomingCheatValue(1) - getCurrentEffectiveValue());
      return difference <= 7 ? "Hot - within 7." : "Cold - more than 7 away.";
    },
  },
  {
    id: "corporate_icebreaker",
    name: "Corporate Icebreaker",
    rarity: "rare",
    weight: 0.8,
    included: true,
    unlockAt: 0,
    stacking: "unique",
    consumeOnUse: true,
    use: () => {
      const upcoming = [1, 2, 3].map((offset) => getNextCardAt(offset)).filter(Boolean);
      if (upcoming.length < 3) return "Need at least three upcoming cards.";

      const remainingPool = state.deck.slice(state.index + 4);
      if (!remainingPool.length) return "Not enough cards remaining for a believable lie.";

      const rng = getCheatDeterministicRng("corporate_icebreaker");
      const truthIndexes = [0, 1, 2];
      for (let i = truthIndexes.length - 1; i > 0; i -= 1) {
        const swapIndex = Math.floor(rng() * (i + 1));
        [truthIndexes[i], truthIndexes[swapIndex]] = [truthIndexes[swapIndex], truthIndexes[i]];
      }

      const fakeCard = remainingPool[Math.floor(rng() * remainingPool.length)];
      const statements = [
        formatCardIdentityForCheat(upcoming[truthIndexes[0]], truthIndexes[0] + 1),
        formatCardIdentityForCheat(upcoming[truthIndexes[1]], truthIndexes[1] + 1),
        formatCardIdentityForCheat(fakeCard),
      ];

      for (let i = statements.length - 1; i > 0; i -= 1) {
        const swapIndex = Math.floor(rng() * (i + 1));
        [statements[i], statements[swapIndex]] = [statements[swapIndex], statements[i]];
      }

      return `Two truths and one lie: ${statements.join(" / ")}`;
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
      const nextIndex = currentIndex + 1;

      if (nextIndex >= state.deck.length) {
        return "No next card.";
      }

      const oldCurrent = state.deck[currentIndex];
      const oldNext = state.deck[nextIndex];

      state.deck[currentIndex] = oldNext;
      state.deck[nextIndex] = oldCurrent;

      state.current = state.deck[currentIndex];
      state.currentValueModifier = 0;
      state.nextCardValueModifier = 0;
      markCardSeen(state.current);

      return `Swapped with next card - current card is now ${describeCard(state.current)}.`;
    },
  },
  {
    id: "green_energy_boost",
    name: "+5 Energy",
    rarity: "common",
    weight: 1,
    included: true,
    greenOnly: true,
    unlockAt: 0,
    stacking: "repeatable",
    consumeOnUse: true,
    use: () => {
      if (!isGreenDeckRun()) return "This cheat only works in Green Deck runs.";
      state.energy = Math.max(0, (state.energy || 0) + 5);
      return `+5 Energy applied. Energy is now ${state.energy}.`;
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

function getEligibleCheatPool(includeAll = false) {
  const ownedStartPowerId = state.selectedStartPowerId;
  const greenRun = isGreenDeckRun();

  return CHEATS.filter((c) => {
    if (!c.included) return false;
    if (c.id === "green_energy_boost") return false; // injected separately for controlled Green frequency
    if (c.greenOnly && !greenRun) return false;
    if (!includeAll && (state.metaProgression ?? 0) < (c.unlockAt ?? 0)) return false;

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
  }).sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

function maybeInjectGreenEnergyCheatOption(options, count, rngFn = Math.random) {
  if (!isGreenDeckRun()) return options;
  if ((rngFn?.() ?? Math.random()) > (2 / 3)) return options;

  const energyCheat = CHEATS.find((cheat) => cheat.id === "green_energy_boost");
  if (!energyCheat) return options;
  if (options.some((option) => option.id === energyCheat.id)) return options;

  const injected = { ...energyCheat };
  if (options.length < count) {
    options.push(injected);
    return options;
  }

  const replaceIndex = Math.max(0, Math.floor((rngFn?.() ?? Math.random()) * Math.max(1, options.length)));
  options[replaceIndex] = injected;
  return options;
}

function getDailyCheatOfferSeed(offerIndex) {
  return `${state.runSeed}|daily-cheat-offer-v1|${offerIndex}`;
}

function getCheatOfferOptionCount() {
  if (state.runMode === "daily") return 3;
  const currentDeckKey = normalizeDeckKey(state.currentDeckKey || state.selectedDeckKey || "blue");
  const currentLevelNumber = normalizeLevelNumber(state.currentLevelNumber || state.selectedLevelNumber || loadSelectedLevel());
  return currentDeckKey === "blue" && currentLevelNumber >= 3 ? 2 : 3;
}

function getRandomCheatOptions(count = 3, seedString = "", includeAll = false) {
  const pool = [...getEligibleCheatPool(includeAll)];
  const options = [];
  const seeded = !!normalizeSeed(seedString);
  const rng = seeded
    ? mulberry32(stringToSeedNumber(`${GAME_VERSION}|${seedString}`))
    : null;

  while (options.length < count && pool.length > 0) {
    const idx = getWeightedRandomIndex(pool, getCheatWeight, seeded ? rng : Math.random);
    if (idx < 0) break;
    options.push(pool.splice(idx, 1)[0]);
  }

  maybeInjectGreenEnergyCheatOption(options, count, seeded ? rng : Math.random);
  return options;
}

function offerCheatChoice(reason = "") {
  const isDailyRun = state.runMode === "daily";
  const optionCount = isDailyRun ? 3 : getCheatOfferOptionCount();
  const newlyMetaUnlocked = isDailyRun ? [] : markMetaUnlockedCheats();
  state.pauseForCheat = false; // Ensure pause is cleared before showing cheat selection
  state.activeCheatAwardReason = reason || "";

  if (isDailyRun) {
    const offerIndex = (state.dailyCheatOfferCount || 0) + 1;
    state.pendingCheatOptions = getRandomCheatOptions(optionCount, getDailyCheatOfferSeed(offerIndex), true);
    state.dailyCheatOfferCount = offerIndex;
  } else {
    state.pendingCheatOptions = getRandomCheatOptions(optionCount);
  }

  state.cheatChoiceLockedUntil = Date.now() + CHEAT_CHOICE_LOCK_MS;
  state.cheatChoiceIntroToken = (state.cheatChoiceIntroToken || 0) + 1;

  if ((state.sixSevenRewardChoicesRemaining || 0) > 0) {
    const pickNumber = 4 - state.sixSevenRewardChoicesRemaining;
    state.message = `Choose bonus cheat ${pickNumber} of 3:`;
  } else if (state.activeCheatAwardReason === "brucie_bonus") {
    state.message = "Brucie Bonus! Choose 1 cheat:";
  } else if (state.activeCheatAwardReason === "cheat_a_cheater") {
    state.message = "You Can Cheat A Cheater! Choose 1 cheat:";
  } else if (newlyMetaUnlocked.length) {
    state.message = `Unlocked: ${newlyMetaUnlocked.map((c) => c.name).join(", ")}`;
  } else {
    state.message = "Choose 1 cheat:";
  }

  appendRunDebugLog("cheat_offer_presented", {
    awardReason: state.activeCheatAwardReason || ((state.sixSevenRewardChoicesRemaining || 0) > 0 ? "six_seven_bonus" : "streak"),
    optionCount,
    options: state.pendingCheatOptions.map((option) => ({
      id: option.id,
      name: option.name,
      rarity: option.rarity || "common",
    })),
    newlyUnlockedCheatIds: newlyMetaUnlocked.map((cheat) => cheat.id),
    message: state.message,
  });

  render();
}

function pickCheatFromChoice(index) {
  if (Date.now() < (state.cheatChoiceLockedUntil || 0)) return;

  const cheat = state.pendingCheatOptions[index];
  if (!cheat) return;

  const shouldTrackDiscovery = state.runMode !== "daily";
  const wasNew = shouldTrackDiscovery && !hasCheatBeenDiscovered(cheat.id);

  if (wasNew) {
    markCheatDiscovered(cheat, "random");
  }

  let selectionOutcome = "already_in_hand";
  let addedToHand = false;
  let bankedNudgeDirection = "";
  let bankedEnergyAmount = 0;

  if (cheat.id === "nudge_up") {
    state.nudgeUpCharges = (state.nudgeUpCharges || 0) + 1;
    state.message = wasNew
      ? "Picked NEW reward: Nudge +1 charge banked."
      : "Picked reward: Nudge +1 charge banked.";
    selectionOutcome = "banked_nudge";
    bankedNudgeDirection = "up";
  } else if (cheat.id === "nudge_down") {
    state.nudgeDownCharges = (state.nudgeDownCharges || 0) + 1;
    state.message = wasNew
      ? "Picked NEW reward: Nudge -1 charge banked."
      : "Picked reward: Nudge -1 charge banked.";
    selectionOutcome = "banked_nudge";
    bankedNudgeDirection = "down";
  } else if (cheat.id === "green_energy_boost") {
    state.energy = Math.max(0, (state.energy || 0) + 5);
    state.message = wasNew
      ? `Picked NEW reward: +5 Energy applied. Energy is now ${state.energy}.`
      : `Picked reward: +5 Energy applied. Energy is now ${state.energy}.`;
    selectionOutcome = "banked_energy";
    bankedEnergyAmount = 5;
  } else if (canAddCheatToHand(cheat)) {
    state.cheats.push({ ...cheat });

    state.message = wasNew
      ? `Picked NEW cheat: ${cheat.name}`
      : `Picked: ${cheat.name}`;
    selectionOutcome = "added_to_hand";
    addedToHand = true;
  } else {
    state.message = `${cheat.name} already in hand.`;
  }

  appendRunDebugLog("cheat_selected", {
    awardReason: state.activeCheatAwardReason || ((state.sixSevenRewardChoicesRemaining || 0) > 0 ? "six_seven_bonus" : "streak"),
    selectedIndex: index,
    cheatId: cheat.id,
    cheatName: cheat.name,
    wasNew,
    selectionOutcome,
    addedToHand,
    bankedNudgeDirection,
    bankedEnergyAmount,
    pendingOptionsBeforePick: state.pendingCheatOptions.map((option) => ({
      id: option.id,
      name: option.name,
      rarity: option.rarity || "common",
    })),
    cheatsInHandAfterPick: state.cheats.map((heldCheat) => heldCheat.id),
    nudgeUpCharges: state.nudgeUpCharges || 0,
    nudgeDownCharges: state.nudgeDownCharges || 0,
    message: state.message,
  });

  state.pendingCheatOptions = [];
  state.justUnlockedCheatIds = [];
  state.cheatChoiceLockedUntil = 0;
  state.activeCheatAwardReason = "";
  if ((state.sixSevenRewardChoicesRemaining || 0) > 0) {
    state.sixSevenRewardChoicesRemaining -= 1;
    if (state.sixSevenRewardChoicesRemaining > 0) {
      offerCheatChoice();
      return;
    }
  }
  if ((state.pendingCheatAwardQueue || []).length > 0) {
    const nextReason = state.pendingCheatAwardQueue.shift();
    offerCheatChoice(nextReason);
    return;
  }
  if (typeof resolvePendingRewardQueues === "function" && resolvePendingRewardQueues()) {
    return;
  }
  render();
}
