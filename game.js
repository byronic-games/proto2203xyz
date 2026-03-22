const SUITS = ["♠", "♥", "♦", "♣"];
    const SUIT_NAMES = {
      "♠": "spades",
      "♥": "hearts",
      "♦": "diamonds",
      "♣": "clubs",
    };

    const RANKS = [
      { r: "A", v: 1 },
      { r: "2", v: 2 },
      { r: "3", v: 3 },
      { r: "4", v: 4 },
      { r: "5", v: 5 },
      { r: "6", v: 6 },
      { r: "7", v: 7 },
      { r: "8", v: 8 },
      { r: "9", v: 9 },
      { r: "10", v: 10 },
      { r: "J", v: 11 },
      { r: "Q", v: 12 },
      { r: "K", v: 13 },
    ];

    const BEST_SCORE_KEY = "hl_prototype_best_score";
    const CARD_STATS_KEY = "hl_prototype_card_stats";
    const CARD_BACK_STATUS_KEY = "hl_prototype_card_back_status";
    const RUN_SEED_KEY = "hl_prototype_last_seed";
    const GAME_VERSION = "v0.1";

    const CHEAT_RARITY = {
      common: 1,
      uncommon: 1,
      rare: 1,
      legendary: 1,
    };

    function mulberry32(a) {
      return function () {
        let t = a += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    function stringToSeedNumber(str) {
      let h = 1779033703 ^ str.length;
      for (let i = 0; i < str.length; i += 1) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
      }
      return h >>> 0;
    }

    function randomSeedString(length = 6) {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let out = "";
      for (let i = 0; i < length; i += 1) {
        out += chars[Math.floor(Math.random() * chars.length)];
      }
      return out;
    }

    function normalizeSeed(seed) {
      return String(seed || "").trim().toUpperCase();
    }

    function seededShuffle(array, seedString) {
      const rng = mulberry32(stringToSeedNumber(seedString));
      for (let i = array.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
    }

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function getCardId(suit, rank) {
      return `${SUIT_NAMES[suit]}_${rank}`;
    }

    function loadBestScore() {
      const raw = localStorage.getItem(BEST_SCORE_KEY);
      const value = Number(raw);
      return Number.isFinite(value) ? value : 0;
    }

    function saveBestScore(score) {
      localStorage.setItem(BEST_SCORE_KEY, String(score));
    }

function normalizeCardStatsEntry(entry = {}) {
  const endedRun = Number.isFinite(entry.endedRun) ? entry.endedRun : 0;
  const survivedRun = Number.isFinite(entry.survivedRun) ? entry.survivedRun : 0;

  return {
    correct: Number.isFinite(entry.correct) ? entry.correct : 0,
    attempts: Number.isFinite(entry.attempts) ? entry.attempts : 0,
    endedRun,
    survivedRun,
  };
}

    function loadCardStats() {
      const raw = localStorage.getItem(CARD_STATS_KEY);
      if (!raw) return {};
      try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return {};
        const normalized = {};
        Object.entries(parsed).forEach(([cardId, entry]) => {
          normalized[cardId] = normalizeCardStatsEntry(entry);
        });
        return normalized;
      } catch {
        return {};
      }
    }

    function saveCardStats(cardStats) {
      localStorage.setItem(CARD_STATS_KEY, JSON.stringify(cardStats));
    }

    function loadCardBackStatuses() {
      const raw = localStorage.getItem(CARD_BACK_STATUS_KEY);
      if (!raw) return {};
      try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
      } catch {
        return {};
      }
    }

    function saveCardBackStatuses(cardBackStatuses) {
      localStorage.setItem(CARD_BACK_STATUS_KEY, JSON.stringify(cardBackStatuses));
    }

    function saveLastRunSeed(seed) {
      localStorage.setItem(RUN_SEED_KEY, seed);
    }

    function loadLastRunSeed() {
      return localStorage.getItem(RUN_SEED_KEY) || "";
    }

    function createDeck(seedString) {
      const deck = [];
      for (const suit of SUITS) {
        for (const rank of RANKS) {
          deck.push({
            id: getCardId(suit, rank.r),
            suit,
            rank: rank.r,
            value: rank.v,
          });
        }
      }
      seededShuffle(deck, seedString);
      return deck;
    }

    function createEmptyState() {
      return {
        deck: [],
        index: 0,
        current: null,
        cheats: [],
        pendingCheatOptions: [],
        message: "Press Start Run.",
        gameOver: true,
        handCard: null,
        currentValueModifier: 0,
        correctAnswers: 0,
        streak: 0,
        bestScore: loadBestScore(),
        seenCardIds: new Set(),
        powers: [],
        selectedStartPowerId: "none",
        cardStats: loadCardStats(),
        cardBackStatuses: loadCardBackStatuses(),
        runSeed: loadLastRunSeed() || randomSeedString(),
      };
    }

    let state = createEmptyState();

    const POWERS = [
      {
        id: "nudge_engine",
        name: "Nudge",
        description: "Every correct Higher/Lower guess adds a directional Nudge cheat to your hand while active.",
        startsActive: true,
        canToggleDuringRun: true,
      },
      {
        id: "stats_display",
        name: "Stats",
        description: "Shows persistent face-down card stats on the back of the deck while active. Nudge rewards are suppressed while this is on.",
        startsActive: true,
        canToggleDuringRun: true,
      },
    ];

    const CHEATS = [
      {
        id: "within_range",
        name: "Within ±2?",
        rarity: "common",
        stacking: "unique",
        consumeOnUse: true,
        use: () => {
          const next = peekNext();
          if (!next || !state.current) return "No next card.";
          const currentVal = getCurrentEffectiveValue();
          const diff = Math.abs(next.value - currentVal);
          return diff <= 2 ? "Next card is within ±2 of current value." : "Next card is NOT within ±2.";
        },
      },
      {
        id: "avg_outcome",
        name: "Average Outcome",
        rarity: "common",
        stacking: "unique",
        consumeOnUse: true,
        use: () => {
          const next = peekNext();
          if (!next) return "No next card.";
          const entry = state.cardStats[next.id];
          if (!entry || entry.attempts === 0) return "No data yet.";
          const ratio = entry.correct / entry.attempts;
          if (ratio > 0.6) return "Historically favourable.";
          if (ratio < 0.4) return "Historically unfavourable.";
          return "Historically neutral.";
        },
      },
      {
        id: "danger_indicator",
        name: "Is This Dangerous?",
        rarity: "common",
        stacking: "unique",
        consumeOnUse: true,
        use: () => {
          const next = peekNext();
          if (!next) return "No next card.";
          const entry = state.cardStats[next.id];
          if (!entry || entry.attempts < 5) return "Not enough data.";
          const ratio = entry.correct / entry.attempts;
          return ratio < 0.45 ? "⚠️ This card is dangerous." : "This card seems safe.";
        },
      },
      {
        id: "not_suit",
        name: "Not This Suit",
        rarity: "common",
        stacking: "repeatable",
        consumeOnUse: true,
        use: () => {
          const next = peekNext();
          if (!next) return "No next card.";
          const suits = ["♠", "♥", "♦", "♣"];
          const notSuit = suits.filter((s) => s !== next.suit);
          const random = notSuit[Math.floor(Math.random() * notSuit.length)];
          return `Next card is NOT ${random}.`;
        },
      },
      {
        id: "red_black",
        name: "Reveal Red / Black",
        rarity: "common",
        stacking: "unique",
        consumeOnUse: true,
        use: () => {
          const next = peekNext();
          if (!next) return "No next card.";
          return isRed(next) ? "Next card is Red." : "Next card is Black.";
        },
      },
      {
        id: "odd_even_neither",
        name: "Odd / Even / Neither",
        rarity: "common",
        stacking: "unique",
        consumeOnUse: true,
        use: () => {
          const next = peekNext();
          if (!next) return "No next card.";
          if (isPictureCard(next)) return "Next card is Neither.";
          if (next.value % 2 === 0) return "Next card is Even.";
          return "Next card is Odd.";
        },
      },
      {
        id: "higher_than_6",
        name: "Higher than 6?",
        rarity: "common",
        stacking: "unique",
        consumeOnUse: true,
        use: () => {
          const next = peekNext();
          if (!next) return "No next card.";
          return next.value > 6 ? "Yes — it is higher than 6." : "No — it is 6 or lower.";
        },
      },
      {
        id: "picture_card",
        name: "Picture Card?",
        rarity: "common",
        stacking: "unique",
        consumeOnUse: true,
        use: () => {
          const next = peekNext();
          if (!next) return "No next card.";
          return isPictureCard(next) ? "Yes — it is a picture card." : "No — not a picture card.";
        },
      },
      {
        id: "chance_higher",
        name: "Chance Next Card Is Higher",
        rarity: "common",
        stacking: "unique",
        consumeOnUse: true,
        use: () => {
          if (!state.current) return "No current card.";
          const currentComparisonValue = getCurrentEffectiveValue();
          const remainingCards = state.deck.slice(state.index + 1);
          if (remainingCards.length === 0) return "No next card.";
          const higherCount = remainingCards.filter((card) => card.value > currentComparisonValue).length;
          const percentage = Math.round((higherCount / remainingCards.length) * 100);
          return `${percentage}% chance the next card is higher.`;
        },
      },
      {
        id: "chance_lower",
        name: "Chance Next Card Is Lower",
        rarity: "common",
        stacking: "unique",
        consumeOnUse: true,
        use: () => {
          if (!state.current) return "No current card.";
          const currentComparisonValue = getCurrentEffectiveValue();
          const remainingCards = state.deck.slice(state.index + 1);
          if (remainingCards.length === 0) return "No next card.";
          const lowerCount = remainingCards.filter((card) => card.value < currentComparisonValue).length;
          const percentage = Math.round((lowerCount / remainingCards.length) * 100);
          return `${percentage}% chance the next card is lower.`;
        },
      },
      {
        id: "correct_percent",
        name: "% Guessed Correctly",
        rarity: "common",
        stacking: "unique",
        consumeOnUse: true,
        use: () => {
          const next = peekNext();
          if (!next) return "No next card.";
          const percentage = getCardCorrectPercentage(next);
          if (percentage === null) return "No tracked history yet for this card.";
          return `${percentage}% of previous Higher/Lower guesses were correct when this card was the face-up card.`;
        },
      },
      {
        id: "tear_corner",
        name: "Tear Corner",
        rarity: "common",
        stacking: "unique",
        consumeOnUse: true,
        use: () => {
          if (!state.current) return "No current card.";
          setCardBackStatus(state.current.id, { tornCorner: true });
          return `${describeCard(state.current)} now has a torn corner on its back.`;
        },
      },
      {
        id: "same_value_remaining",
        name: "Same Number Remaining",
        rarity: "common",
        stacking: "repeatable",
        consumeOnUse: true,
        use: () => {
          const next = peekNext();
          if (!next) return "No next card.";
          const remaining = countUnseenCardsOfRank(next.rank);
          return `${remaining} card(s) of this value remain in the face-down deck.`;
        },
      },
      {
        id: "nudge_up",
        name: "Nudge +1",
        rarity: "common",
        stacking: "stackable",
        consumeOnUse: true,
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
        stacking: "stackable",
        consumeOnUse: true,
        use: () => {
          state.currentValueModifier -= 1;
          const effective = getCurrentEffectiveValue();
          return `Current card is now treated as ${valueToRank(effective)} for the next guess.`;
        },
      },
      {
        id: "swap",
        name: "Swap",
        rarity: "common",
        stacking: "repeatable",
        consumeOnUse: true,
        use: () => {
          const nextIndex = state.index + 1;
          const topDeckCard = state.deck[nextIndex];
          if (!topDeckCard) return "No next card.";

          if (!state.handCard) {
            const takenCard = state.deck.splice(nextIndex, 1)[0];
            state.handCard = { ...takenCard };
            return `Took ${describeCard(takenCard)} into your hand. It is no longer on top of the deck.`;
          }

          const takenCard = { ...topDeckCard };
          const heldCard = { ...state.handCard };
          state.deck[nextIndex] = heldCard;
          state.handCard = takenCard;
          return `Took ${describeCard(takenCard)} into your hand and placed ${describeCard(heldCard)} on top of the deck.`;
        },
      },
    ];

    function startRun() {
      const seedInput = document.getElementById("run-seed-input");
      const chosenSeed = normalizeSeed(seedInput?.value) || randomSeedString();
      const deck = createDeck(chosenSeed);
      const selectedPowerId = document.getElementById("start-power-select")?.value || "none";
      const activePowers = selectedPowerId !== "none"
        ? getPowerToggleStateForSelection(selectedPowerId)
        : [];

      state = {
        deck,
        index: 0,
        current: deck[0],
        cheats: [],
        pendingCheatOptions: [],
        message: activePowers.length > 0
          ? `Run started with seed ${chosenSeed} and power: ${activePowers.map(getPowerName).join(", ")}.`
          : `Run started with seed ${chosenSeed}.`,
        gameOver: false,
        handCard: null,
        currentValueModifier: 0,
        correctAnswers: 0,
        streak: 0,
        bestScore: loadBestScore(),
        seenCardIds: new Set([deck[0].id]),
        powers: activePowers,
        selectedStartPowerId: selectedPowerId,
        cardStats: loadCardStats(),
        cardBackStatuses: loadCardBackStatuses(),
        runSeed: chosenSeed,
      };

      saveLastRunSeed(chosenSeed);
      render();
    }

    function updateBestScoreIfNeeded() {
      if (state.correctAnswers > state.bestScore) {
        state.bestScore = state.correctAnswers;
        saveBestScore(state.bestScore);
      }
    }

    function peekNext() {
      if (!state.deck || state.deck.length === 0) return null;
      return state.deck[state.index + 1] || null;
    }

    function isRed(card) {
      return card && (card.suit === "♥" || card.suit === "♦");
    }

    function isPictureCard(card) {
      return !!card && (card.rank === "J" || card.rank === "Q" || card.rank === "K");
    }

    function markCardSeen(card) {
      if (!card) return;
      state.seenCardIds.add(card.id);
    }

function advanceToCard(card) {
  state.current = card;
  state.index += 1;
  markCardSeen(card);
}

    function removeCheatAt(index) {
      state.cheats.splice(index, 1);
    }

    function describeCard(card) {
      if (!card) return "?";
      return `${card.rank}${card.suit}`;
    }

    function getCurrentEffectiveValue() {
      if (!state.current) return null;
      return clamp(state.current.value + state.currentValueModifier, 1, 13);
    }

    function valueToRank(value) {
      const found = RANKS.find((r) => r.v === value);
      return found ? found.r : value;
    }

    function countUnseenCardsOfRank(rank) {
      if (!rank) return 0;
      let count = 0;
      for (let i = state.index + 1; i < state.deck.length; i += 1) {
        if (state.deck[i].rank === rank) count += 1;
      }
      return count;
    }

    function getCardStatsEntry(cardId) {
      if (!state.cardStats[cardId]) {
        state.cardStats[cardId] = normalizeCardStatsEntry();
      } else {
        state.cardStats[cardId] = normalizeCardStatsEntry(state.cardStats[cardId]);
      }
      return state.cardStats[cardId];
    }

    function recordCurrentCardGuess(card, wasCorrectGuess) {
      if (!card) return;
      const entry = getCardStatsEntry(card.id);
      entry.attempts += 1;
      if (wasCorrectGuess) entry.correct += 1;
      saveCardStats(state.cardStats);
    }


function recordFaceDownOutcome(card, endedRun) {
  if (!card) return;

  const entry = getCardStatsEntry(card.id);

  if (endedRun) {
    entry.endedRun += 1;
  } else {
    entry.survivedRun += 1;
  }

  saveCardStats(state.cardStats);
}

function getFaceDownGuessCount(card) {
  if (!card) return 0;
  const entry = getCardStatsEntry(card.id);
  return entry.endedRun + entry.survivedRun;
}

    function getCardCorrectPercentage(card) {
      if (!card) return null;
      const entry = state.cardStats[card.id];
      if (!entry || entry.attempts === 0) return null;
      return Math.round((entry.correct / entry.attempts) * 100);
    }

    function getCardBackStatus(cardId) {
      return state.cardBackStatuses[cardId] || { tornCorner: false };
    }

    function setCardBackStatus(cardId, patch) {
      const current = getCardBackStatus(cardId);
      state.cardBackStatuses[cardId] = { ...current, ...patch };
      saveCardBackStatuses(state.cardBackStatuses);
    }

    function getFaceDownCount() {
      return Math.max(0, state.deck.length - (state.index + 1));
    }

    function getPowerName(powerId) {
      const power = POWERS.find((p) => p.id === powerId);
      return power ? power.name : powerId;
    }

    function getPowerById(powerId) {
      return POWERS.find((p) => p.id === powerId) || null;
    }

    function runHasPower(powerId) {
      return state.powers.includes(powerId);
    }

    function getPowerToggleStateForSelection(powerId) {
      if (powerId === "none") return [];
      const power = getPowerById(powerId);
      if (!power) return [];
      return power.startsActive ? [powerId] : [];
    }

    function togglePower(powerId) {
      const power = getPowerById(powerId);
      if (!power || !power.canToggleDuringRun || state.gameOver || !state.current) return;
      if (runHasPower(powerId)) {
        state.powers = state.powers.filter((id) => id !== powerId);
        state.message = `${power.name} OFF.`;
      } else {
        state.powers = [...state.powers, powerId];
        state.message = `${power.name} ON.`;
      }
      render();
    }

    function awardOnCorrectGuessPowers(guessType) {
      const awardedNames = [];
      if (runHasPower("nudge_engine") && !runHasPower("stats_display")) {
        let nudgeCheat = null;
        if (guessType === "higher") nudgeCheat = CHEATS.find((c) => c.id === "nudge_up");
        if (guessType === "lower") nudgeCheat = CHEATS.find((c) => c.id === "nudge_down");
        if (nudgeCheat) {
          state.cheats.push({ ...nudgeCheat });
          awardedNames.push(nudgeCheat.name);
        }
      }
      return awardedNames;
    }

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

    function addMissingCheatsForDebug() {
      if (!state.current || state.gameOver) return;
      const added = [];
      for (const cheat of CHEATS) {
        if (canAddCheatToHand(cheat)) {
          state.cheats.push({ ...cheat });
          added.push(cheat.name);
        }
      }
      state.message = added.length > 0 ? `🛠 Debug: added ${added.join(", ")}.` : "🛠 Debug: no missing Cheats to add.";
      render();
    }

    function clearCheatsForDebug() {
      state.cheats = [];
      state.pendingCheatOptions = [];
      state.message = "🛠 Debug: cleared all cheats.";
      render();
    }

    function resetAllStatsForDebug() {
      localStorage.removeItem(CARD_STATS_KEY);
      localStorage.removeItem(CARD_BACK_STATUS_KEY);
      state.cardStats = {};
      state.cardBackStatuses = {};
      state.message = "🛠 Debug: cleared progression stats (best score preserved).";
      render();
    }

    function fullResetAllStateForDebug() {
      localStorage.removeItem(CARD_STATS_KEY);
      localStorage.removeItem(CARD_BACK_STATUS_KEY);
      localStorage.removeItem(RUN_SEED_KEY);
      localStorage.removeItem(BEST_SCORE_KEY);
      state = createEmptyState();
      state.message = "🛠 Debug: FULL RESET (everything cleared).";
      render();
    }

    function makeGuess(type) {
      if (state.gameOver || !state.current || state.pendingCheatOptions.length > 0) return;

      const next = peekNext();
      if (!next) return;

      const currentComparisonValue = getCurrentEffectiveValue();
      document.getElementById("next-info").innerText = `Next: ${describeCard(next)}`;

      if (next.value === currentComparisonValue) {
        recordFaceDownOutcome(next, false);
        advanceToCard(next);
        state.currentValueModifier = 0;
        state.streak += 1;

        if (state.index >= state.deck.length - 1) {
          state.correctAnswers += 1;
          updateBestScoreIfNeeded();
          state.message = "🏆 YOU CLEARED THE DECK!";
          state.gameOver = true;
          render();
          return;
        }

        if (state.streak >= 3) {
          state.streak = 0;
          offerCheatChoice();
          return;
        }

        state.message = "✅ Match!";
        render();
        return;
      }

      const correct =
        (type === "higher" && next.value > currentComparisonValue) ||
        (type === "lower" && next.value < currentComparisonValue);

      if (!correct) {
        recordCurrentCardGuess(state.current, false);
        recordFaceDownOutcome(next, true);
        advanceToCard(next);
        state.currentValueModifier = 0;
        state.streak = 0;
        state.message = `❌ Wrong! It was ${describeCard(next)}.`;
        state.gameOver = true;
        updateBestScoreIfNeeded();
        render();
        return;
      }

      recordCurrentCardGuess(state.current, true);
      recordFaceDownOutcome(next, false);
      advanceToCard(next);
      state.correctAnswers += 1;
      state.currentValueModifier = 0;
      state.streak += 1;
      updateBestScoreIfNeeded();

      if (state.index >= state.deck.length - 1) {
        state.message = "🏆 YOU CLEARED THE DECK!";
        state.gameOver = true;
        render();
        return;
      }

      const powerAwards = awardOnCorrectGuessPowers(type);

      if (state.streak >= 3) {
        state.streak = 0;
        offerCheatChoice();
        return;
      }

      state.message = powerAwards.length > 0
        ? `✅ Correct! Power gained: ${powerAwards.join(", ")}.`
        : runHasPower("stats_display") && runHasPower("nudge_engine")
          ? "✅ Correct! Stats was active, so no Nudge was awarded."
          : "✅ Correct!";
      render();
    }

    function renderScores() {
      document.getElementById("score").innerText = state.correctAnswers;
      document.getElementById("best-score").innerText = state.bestScore;
    }

    function renderSeedControls() {
      const seedInput = document.getElementById("run-seed-input");
      const seedDisplay = document.getElementById("current-seed");
      if (seedDisplay) seedDisplay.innerText = state.runSeed ? `${GAME_VERSION}-${state.runSeed}` : `${GAME_VERSION}-`;
      if (seedInput && !seedInput.dataset.initialized) {
        seedInput.value = state.runSeed || loadLastRunSeed() || randomSeedString();
        seedInput.dataset.initialized = "true";
      }
    }

    function renderStartPowerSelector() {
      const selectEl = document.getElementById("start-power-select");
      if (!selectEl) return;
      const previousValue = selectEl.value || state.selectedStartPowerId || "none";
      selectEl.innerHTML = "";
      const noneOption = document.createElement("option");
      noneOption.value = "none";
      noneOption.innerText = "No Power";
      selectEl.appendChild(noneOption);
      POWERS.forEach((power) => {
        const option = document.createElement("option");
        option.value = power.id;
        option.innerText = power.name;
        selectEl.appendChild(option);
      });
      const allowedValues = ["none", ...POWERS.map((power) => power.id)];
      selectEl.value = allowedValues.includes(previousValue) ? previousValue : "none";
    }

    function renderActivePowers() {
      const activePowersEl = document.getElementById("active-powers");
      if (!activePowersEl) return;
      if (!state.current || state.gameOver) {
        activePowersEl.innerText = state.powers.length ? state.powers.map(getPowerName).join(", ") : "No active Powers.";
        return;
      }
      activePowersEl.innerHTML = "";
      const row = document.createElement("div");
      row.className = "power-button-row";

      if (state.selectedStartPowerId === "none") {
        const text = document.createElement("div");
        text.innerText = "No active Powers.";
        activePowersEl.appendChild(text);
        return;
      }

      const ownedPower = getPowerById(state.selectedStartPowerId);
      if (!ownedPower) {
        activePowersEl.innerText = "No active Powers.";
        return;
      }

      const btn = document.createElement("button");
      const isActive = runHasPower(ownedPower.id);
      btn.className = `power-chip ${isActive ? "active" : "inactive"}`;
      btn.innerText = `${ownedPower.name}: ${isActive ? "ON" : "OFF"}`;
      btn.onclick = () => togglePower(ownedPower.id);
      row.appendChild(btn);
      activePowersEl.appendChild(row);
    }

    function renderCurrentCard() {
      const currentCardEl = document.getElementById("current-card");
      const currentValueEl = document.getElementById("current-effective-value");
      if (!state.current) {
        currentCardEl.innerText = "?";
        currentCardEl.className = "card-face";
        currentValueEl.innerText = "";
        return;
      }
      currentCardEl.innerText = describeCard(state.current);
      currentCardEl.className = `card-face ${isRed(state.current) ? "red" : "black"}`;
      const effectiveValue = getCurrentEffectiveValue();
      currentValueEl.innerText = effectiveValue !== state.current.value ? `Treated as: ${valueToRank(effectiveValue)}` : "";
    }

    function renderFaceDownDeck() {
      const deckEl = document.getElementById("face-down-deck");
      const countEl = document.getElementById("face-down-count");
      if (!state.current) {
        deckEl.innerText = "";
        deckEl.className = "card-back";
        countEl.innerText = "";
        return;
      }
      const next = peekNext();
      const backStatus = next ? getCardBackStatus(next.id) : { tornCorner: false };
      deckEl.className = `card-back ${backStatus.tornCorner ? "torn-corner" : ""}`;

      const symbol = document.createElement("div");
      symbol.className = "card-back-symbol";
      symbol.innerText = "🂠";
      deckEl.innerHTML = "";
      deckEl.appendChild(symbol);

if (next && runHasPower("stats_display")) {
  const entry = getCardStatsEntry(next.id);
  const guessedCount = getFaceDownGuessCount(next);

  const statsBox = document.createElement("div");
  statsBox.className = "card-back-stats";
  statsBox.innerHTML = `
    <div>Guessed: ${guessedCount}</div>
    <div>Ended run: ${entry.endedRun}</div>
    <div>Survived: ${entry.survivedRun}</div>
  `;
  deckEl.appendChild(statsBox);
}
        
      countEl.innerText = `${getFaceDownCount()} card(s) remain`;
    }

    function renderButtons() {
      const disableGuessing = state.gameOver || !state.current || state.pendingCheatOptions.length > 0;
      document.getElementById("higher-btn").disabled = disableGuessing;
      document.getElementById("lower-btn").disabled = disableGuessing;
    }

    function renderHandCard() {
      const handEl = document.getElementById("swap-card");
      if (!state.handCard) {
        handEl.innerText = "Empty";
        handEl.className = "";
        return;
      }
      handEl.innerText = describeCard(state.handCard);
      handEl.className = isRed(state.handCard) ? "red" : "black";
    }

    function renderCheats() {
      const cheatList = document.getElementById("cheat-list");
      cheatList.innerHTML = "";
      if (state.cheats.length === 0) {
        const empty = document.createElement("div");
        empty.innerText = "No Cheats held.";
        empty.style.color = "#bbb";
        cheatList.appendChild(empty);
        return;
      }
      state.cheats.forEach((cheat, index) => {
        const btn = document.createElement("button");
        btn.innerText = cheat.name;
        btn.onclick = () => {
          if (state.gameOver || state.pendingCheatOptions.length > 0) return;
          const result = cheat.use();
          state.message = result;
          if (cheat.consumeOnUse) removeCheatAt(index);
          render();
        };
        cheatList.appendChild(btn);
      });
    }

    function renderCheatChoice() {
      const container = document.getElementById("cheat-choice-container");
      const list = document.getElementById("cheat-choice-list");
      list.innerHTML = "";
      if (!state.pendingCheatOptions.length) {
        container.style.display = "none";
        return;
      }
      container.style.display = "block";
      state.pendingCheatOptions.forEach((cheat, index) => {
        const btn = document.createElement("button");
        btn.innerText = `[${cheat.rarity}] ${cheat.name}`;
        btn.onclick = () => pickCheatFromChoice(index);
        list.appendChild(btn);
      });
    }

    function renderSeenGrid() {
      const grid = document.getElementById("seen-grid");
      grid.innerHTML = "";
      const topLeft = document.createElement("div");
      topLeft.className = "grid-header";
      grid.appendChild(topLeft);
      for (const rank of RANKS) {
        const cell = document.createElement("div");
        cell.className = "grid-header";
        cell.innerText = rank.r;
        grid.appendChild(cell);
      }
      for (const suit of SUITS) {
        const suitCell = document.createElement("div");
        suitCell.className = `grid-suit ${isRed({ suit }) ? "red" : "black"}`;
        suitCell.innerText = suit;
        grid.appendChild(suitCell);
        for (const rank of RANKS) {
          const cardId = getCardId(suit, rank.r);
          const seen = state.seenCardIds.has(cardId);
          const cell = document.createElement("div");
          cell.className = `grid-cell ${seen ? "seen" : ""} ${isRed({ suit }) ? "red" : "black"}`;
          cell.innerText = seen ? "✓" : "";
          grid.appendChild(cell);
        }
      }
    }

    function renderMessage() {
      document.getElementById("message").innerText = state.message || "";
    }

    function renderNextInfo() {
      if (!state.current) document.getElementById("next-info").innerText = "";
    }

    function render() {
      renderScores();
      renderSeedControls();
      renderStartPowerSelector();
      renderActivePowers();
      renderCurrentCard();
      renderFaceDownDeck();
      renderButtons();
      renderHandCard();
      renderCheats();
      renderCheatChoice();
      renderSeenGrid();
      renderMessage();
      renderNextInfo();
    }

    document.getElementById("higher-btn").onclick = () => makeGuess("higher");
    document.getElementById("lower-btn").onclick = () => makeGuess("lower");
    document.getElementById("restart-btn").onclick = startRun;

    document.getElementById("run-seed-input")?.addEventListener("blur", (e) => {
      e.target.value = normalizeSeed(e.target.value);
    });

    document.getElementById("random-seed-btn")?.addEventListener("click", () => {
      const seedInput = document.getElementById("run-seed-input");
      if (seedInput) seedInput.value = randomSeedString();
    });

    document.getElementById("copy-seed-btn")?.addEventListener("click", async () => {
      const seedToCopy = state.runSeed ? `${GAME_VERSION}-${state.runSeed}` : "";
      if (!seedToCopy) return;
      try {
        await navigator.clipboard.writeText(seedToCopy);
        state.message = `Copied ${seedToCopy}`;
      } catch {
        state.message = `Seed: ${seedToCopy}`;
      }
      renderMessage();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "c" || e.key === "C") {
        clearCheatsForDebug();
        return;
      }
      if ((e.key === "r" || e.key === "R") && !e.shiftKey) {
        resetAllStatsForDebug();
        return;
      }
      if ((e.key === "r" || e.key === "R") && e.shiftKey) {
        fullResetAllStateForDebug();
        return;
      }
      if (e.key === "d" || e.key === "D") {
        addMissingCheatsForDebug();
        return;
      }
      if (state.gameOver || state.pendingCheatOptions.length > 0) return;
      if (e.key === "ArrowUp") makeGuess("higher");
      if (e.key === "ArrowDown") makeGuess("lower");
    });

    function runSelfTests() {
      const a = [1, 2, 3, 4, 5];
      const b = [1, 2, 3, 4, 5];
      seededShuffle(a, "ABC123");
      seededShuffle(b, "ABC123");
      console.assert(JSON.stringify(a) === JSON.stringify(b), "Seeded shuffle should be deterministic for same seed.");
      console.assert(normalizeSeed(" ab-c1 ") === "AB-C1", "normalizeSeed should trim and uppercase.");
      console.assert(clamp(20, 1, 13) === 13, "clamp should cap high end.");
      console.assert(clamp(-1, 1, 13) === 1, "clamp should cap low end.");
      const empty = createEmptyState();
      console.assert(empty.streak === 0, "New state should start with streak 0.");
      console.assert(Array.isArray(empty.pendingCheatOptions) && empty.pendingCheatOptions.length === 0, "New state should start with no pending cheat options.");
      const options = getRandomCheatOptions(3);
      console.assert(options.length <= 3, "Should produce up to 3 cheat options.");
    const normalizedStats = normalizeCardStatsEntry({ correct: 2, attempts: 5 });
    console.assert(normalizedStats.endedRun === 0, "Legacy stat entries should gain endedRun field.");
    console.assert(normalizedStats.survivedRun === 0, "Legacy stat entries should gain survivedRun field.");
    }

    runSelfTests();
    render();
