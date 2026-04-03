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
  "Is it an Ace?": "Reveals whether at least one Ace appears in the next three face down cards.",
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
  "Next Card Nudge Up": "Temporarily nudges the next face-down card up by 3 for the next guess, stopping at King.",
  "Next Card Nudge Down": "Temporarily nudges the next face-down card down by 3 for the next guess, stopping at Ace.",  "Halve It": "Can only be used on an even card. Treat the current card as half its value for the next guess.",
  "Double Trouble": "Treat the current card as double its value for the next guess, up to King.",
  "Odd One Out": "For the next card only: if it is odd, you lose. Aces count as odd even under Aces Wild. Otherwise you survive.",
  "Lucky 7": "Can only be used on a 7. Your next wrong guess still counts as correct.",
  "Five Alive": "Can only be used on a 5. If your next guess is wrong, the run still continues.",
  "6/7": "Use only on an un-nudged 6 or 7, and it must be the first and only cheat played on that card. Nudges then lock. Guess correctly to pick 3 cheats in a row. Guess wrong and you lose.",
  "Twin Peek": "Checks the next five cards and reveals whether any of them match the face-up card's current value.",
  "Run Stopper": "Checks the next five cards and reveals whether at least one Ace or King appears.",
  "Bang Average": "Reveals the exact average value of the next three face down cards.",
  "God Save The King": "Play on any face card. If the next card is a King, the run survives even if your guess is wrong.",  "Swap": "Replace the current face card with the card at the bottom of the deck.",
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
    id: "is_it_an_ace",
    name: "Is it an Ace?",
    rarity: "common",
    weight: 1,
    included: true,
    unlockAt: 0,
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
      return next.value + next2.value > 12 ? "Yes — total is above 12." : "No — total is 12 or below.";
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
      return next.value + next2.value > 20 ? "Yes — total is above 20." : "No — total is 20 or below.";
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
      return next.value + next2.value < 10 ? "Yes — total is under 10." : "No — total is 10 or above.";
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
      return next.value + next2.value < 15 ? "Yes — total is under 15." : "No — total is 15 or above.";
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
      return `Product = ${next.value * next2.value}`;
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
      return next.value >= 7 ? "Top half (7+)." : "Bottom half (6 or below).";
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
        ? "Yes � a face card is in the next three."
        : "No � no face card in the next three.";
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
      return next.value > currentVal || next2.value > currentVal
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
      return next.value < currentVal || next2.value < currentVal
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
      state.nextCardValueModifier = 3;
      const treatedValue = clampCardValue(next.value + 3);
      return `Next card is now treated as ${valueToRank(treatedValue)} for the next guess.`;
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
      state.nextCardValueModifier = -3;
      const treatedValue = clampCardValue(next.value - 3);
      return `Next card is now treated as ${valueToRank(treatedValue)} for the next guess.`;
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
      const found = upcoming.some((card) => card.value === currentVal);
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
      const total = next.value + next2.value + next3.value;
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
  },  {
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

function getEligibleCheatPool(includeAll = false) {
  const ownedStartPowerId = state.selectedStartPowerId;

  return CHEATS.filter((c) => {
    if (!c.included) return false;
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

function getDailyCheatOfferSeed(offerIndex) {
  return `${state.runSeed}|daily-cheat-offer-v1|${offerIndex}`;
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

  return options;
}

function offerCheatChoice() {
  const isDailyRun = state.runMode === "daily";
  const newlyMetaUnlocked = isDailyRun ? [] : markMetaUnlockedCheats();
  state.pauseForCheat = false; // Ensure pause is cleared before showing cheat selection

  if (isDailyRun) {
    const offerIndex = (state.dailyCheatOfferCount || 0) + 1;
    state.pendingCheatOptions = getRandomCheatOptions(3, getDailyCheatOfferSeed(offerIndex), true);
    state.dailyCheatOfferCount = offerIndex;
  } else {
    state.pendingCheatOptions = getRandomCheatOptions(3);
  }

  state.cheatChoiceLockedUntil = Date.now() + CHEAT_CHOICE_LOCK_MS;
  state.cheatChoiceIntroToken = (state.cheatChoiceIntroToken || 0) + 1;

  if ((state.sixSevenRewardChoicesRemaining || 0) > 0) {
    const pickNumber = 4 - state.sixSevenRewardChoicesRemaining;
    state.message = `Choose bonus cheat ${pickNumber} of 3:`;
  } else if (newlyMetaUnlocked.length) {
    state.message = `Unlocked: ${newlyMetaUnlocked.map((c) => c.name).join(", ")}`;
  } else {
    state.message = "Choose 1 cheat:";
  }

  render();
}

function pickCheatFromChoice(index) {
  if (Date.now() < (state.cheatChoiceLockedUntil || 0)) return;

  const cheat = state.pendingCheatOptions[index];
  if (!cheat) return;

  if (canAddCheatToHand(cheat)) {
    const shouldTrackDiscovery = state.runMode !== "daily";
    const wasNew = shouldTrackDiscovery && !hasCheatBeenDiscovered(cheat.id);

    if (wasNew) {
      markCheatDiscovered(cheat, "random");
    }

    state.cheats.push({ ...cheat });

    state.message = wasNew
      ? `Picked NEW cheat: ${cheat.name}`
      : `Picked: ${cheat.name}`;
  } else {
    state.message = `${cheat.name} already in hand.`;
  }

  state.pendingCheatOptions = [];
  state.justUnlockedCheatIds = [];
  state.cheatChoiceLockedUntil = 0;
  if ((state.sixSevenRewardChoicesRemaining || 0) > 0) {
    state.sixSevenRewardChoicesRemaining -= 1;
    if (state.sixSevenRewardChoicesRemaining > 0) {
      offerCheatChoice();
      return;
    }
  }
  render();
}


