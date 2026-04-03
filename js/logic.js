const POWER_CHOICE_LOCK_MS = 500;

function buildRunFromControls(forceRandom = false) {
  const seedInput = document.getElementById("run-seed-input");
  let chosenSeed = "";

  if (forceRandom) {
    chosenSeed = randomSeedString();
    if (seedInput) seedInput.value = chosenSeed;
  } else {
    chosenSeed = normalizeSeed(seedInput?.value) || randomSeedString();
    if (seedInput) seedInput.value = chosenSeed;
  }

  const deck = createDeck(chosenSeed);

  // Onboard new players: always start with a protected card (A,2,3,4,9,10,J,Q,K)
  const metaProgression = loadMetaProgression();
  if ((metaProgression ?? 0) <= 20) {
    // Find first protected card in the deck (by value)
    const protectedValues = [1, 2, 3, 4, 9, 10, 11, 12, 13];
    let foundIdx = deck.findIndex(card => protectedValues.includes(card.value));
    if (foundIdx > 0) {
      // Swap it to the top, preserving the rest of the deck order
      const firstCard = deck[0];
      deck[0] = deck[foundIdx];
      deck[foundIdx] = firstCard;
    }
  }
  return { chosenSeed, deck };
}

function buildDailyRun(dateKey) {
  const chosenDateKey = String(dateKey || "").trim() || getCurrentDailyDateKey();
  const chosenSeed = getDailySeedForDate(chosenDateKey);
  const deck = createDeck(chosenSeed);
  return { chosenDateKey, chosenSeed, deck };
}

let currentCardFeedbackTimer = null;
let gameShellFlashTimer = null;
let recentlySeenCardTimer = null;

function flashGameShell(effect) {
  const gameEl = document.getElementById("game");
  if (!gameEl) return;

  gameEl.classList.remove("flash-correct", "flash-wrong");
  if (gameShellFlashTimer) {
    clearTimeout(gameShellFlashTimer);
    gameShellFlashTimer = null;
  }

  if (!effect) return;

  gameEl.classList.add(`flash-${effect}`);
  gameShellFlashTimer = setTimeout(() => {
    gameEl.classList.remove("flash-correct", "flash-wrong");
    gameShellFlashTimer = null;
  }, 220);
}

function setRecentlySeenCard(cardId) {
  state.recentlySeenCardId = cardId || "";

  if (recentlySeenCardTimer) {
    clearTimeout(recentlySeenCardTimer);
    recentlySeenCardTimer = null;
  }

  if (!cardId) return;

  recentlySeenCardTimer = setTimeout(() => {
    state.recentlySeenCardId = "";
    recentlySeenCardTimer = null;
    renderSeenGrid();
  }, 520);
}

function setCurrentCardFeedback(effect) {
  state.currentCardFeedback = effect || "";

  if (currentCardFeedbackTimer) {
    clearTimeout(currentCardFeedbackTimer);
    currentCardFeedbackTimer = null;
  }

  if (!effect) return;

  currentCardFeedbackTimer = setTimeout(() => {
    state.currentCardFeedback = "";
    currentCardFeedbackTimer = null;
    render();
  }, 520);
}

function openPowerChoice(forceRandom = false) {
  const { chosenSeed, deck } = buildRunFromControls(forceRandom);

  state.pendingRunSeed = chosenSeed;
  state.pendingRunDeck = deck;
  state.pendingPowerOptions = getRandomPowerOptions(2, chosenSeed);
  state.pendingRunMode = "standard";
  state.pendingDailyDateKey = "";
  state.pendingDeckKey = normalizeDeckKey(state.selectedDeckKey || loadSelectedDeck());
  state.pendingCheatOptions = [];
  state.cheatChoiceLockedUntil = 0;
  state.powerChoiceLockedUntil = Date.now() + POWER_CHOICE_LOCK_MS;
  state.pauseForCheat = false;
  state.restartConfirmArmed = false;
  state.deckStatsTooltipOpen = false;
  state.message = `Choose 1 power for the ${getDeckName(state.pendingDeckKey)} Deck run.`;
  render();
}

function openDailyPowerChoice(dateKey = "") {
  const { chosenDateKey, chosenSeed, deck } = buildDailyRun(dateKey);

  state.pendingRunSeed = chosenSeed;
  state.pendingRunDeck = deck;
  state.pendingPowerOptions = getRandomPowerOptions(2, chosenSeed, true);
  state.pendingRunMode = "daily";
  state.pendingDailyDateKey = chosenDateKey;
  state.pendingDeckKey = "blue";
  state.pendingCheatOptions = [];
  state.cheatChoiceLockedUntil = 0;
  state.powerChoiceLockedUntil = Date.now() + POWER_CHOICE_LOCK_MS;
  state.pauseForCheat = false;
  state.restartConfirmArmed = false;
  state.deckStatsTooltipOpen = false;
  state.message = `Daily for ${chosenDateKey}: choose 1 power.`;
  render();
}

function addCheatCopiesToHand(cheatId, count) {
  const cheat = CHEATS.find((entry) => entry.id === cheatId);
  if (!cheat || count <= 0) return;

  for (let i = 0; i < count; i += 1) {
    state.cheats.push({ ...cheat });
  }
}

function applyRunPowerSetup(powerId) {
  switch (powerId) {
    case "balanced_nudges":
      state.nudgeUpCharges = 4;
      state.nudgeDownCharges = 4;
      break;
    case "updraft":
      state.nudgeUpCharges = 8;
      break;
    case "downforce":
      state.nudgeDownCharges = 8;
      break;
    case "swap_stack":
      addCheatCopiesToHand("swap", 4);
      break;
    case "lucky_opening":
      addCheatCopiesToHand("lucky_7", 2);
      break;
    default:
      break;
  }
}

function startRunWithPower(powerId) {
  const selectedPower = getPowerById(powerId);
  const chosenSeed =
    state.pendingRunSeed ||
    normalizeSeed(document.getElementById("run-seed-input")?.value) ||
    randomSeedString();
  const deck = state.pendingRunDeck?.length
    ? [...state.pendingRunDeck]
    : buildRunFromControls(false).deck;
  const runMode = state.pendingRunMode || "standard";
  const dailyDateKey = runMode === "daily" ? state.pendingDailyDateKey || getCurrentDailyDateKey() : "";
  const selectedPowerId = selectedPower?.id || POWERS[0]?.id || null;
  const selectedDeckKey = normalizeDeckKey(state.selectedDeckKey || loadSelectedDeck());
  const currentDeckKey = runMode === "daily"
    ? "blue"
    : normalizeDeckKey(state.pendingDeckKey || selectedDeckKey);
  const activePowers = selectedPowerId
    ? Array.from(new Set([selectedPowerId, "nudge_engine"]))
    : ["nudge_engine"];

  state = {
    deck,
    index: 0,
    current: deck[0],
    cheats: [],
    pendingCheatOptions: [],
    message:
      activePowers.length > 0
        ? `Run started with seed ${chosenSeed} and power: ${activePowers
            .map(getPowerName)
            .join(", ")}.`
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
    selectedDeckKey,
    currentDeckKey,
    metaProgression: loadMetaProgression(),
    cardStats: loadCardStats(),
    cardBackStatuses: loadCardBackStatuses(),
    deckWins: loadDeckWins(),
    cheatUnlocks: loadCheatUnlocks(),
    runMode,
    dailyDateKey,
    dailyCheatOfferCount: 0,
    justUnlockedCheatIds: [],
    cheatChoiceLockedUntil: 0,
    powerChoiceLockedUntil: 0,
    pauseForCheat: false,
    pendingPowerOptions: [],
    pendingRunSeed: "",
    pendingRunDeck: [],
    pendingRunMode: "standard",
    pendingDailyDateKey: "",
    pendingDeckKey: selectedDeckKey,
    runSeed: chosenSeed,
    restartConfirmArmed: false,
    deckStatsTooltipOpen: false,
    victoryPromptShown: false,
    currentCardFeedback: "",
    cheatChoiceIntroToken: 0,
    recentlySeenCardId: "",
    nudgeUpCharges: 0,
    nudgeDownCharges: 0,
    lucky7Armed: false,
    fiveAliveArmed: false,
    oddOneOutArmed: false,
  };

  applyRunPowerSetup(selectedPowerId);

  if (runMode === "daily") {
    lockDailyAttempt(dailyDateKey, chosenSeed, loadPreferredPlayerName());
  }

  if (runMode !== "daily") {
    saveSelectedDeck(currentDeckKey);
    saveLastRunSeed(chosenSeed);
  }
  render();
}

function handleRunFinished(finalScore) {
  if (state.runMode !== "daily") return;

  const dateKey = state.dailyDateKey || getCurrentDailyDateKey();
  const playerName = loadPreferredPlayerName();
  const entry = buildDailyEntry({
    dateKey,
    seed: state.runSeed,
    playerName: playerName || "Unknown",
    playerId: getOrCreateDailyPlayerId(),
    score: finalScore,
  });

  submitDailyResult(entry).finally(() => {
    window.setTimeout(() => {
      window.location.href = `daily.html?date=${encodeURIComponent(dateKey)}`;
    }, 900);
  });
}

function startRun(forceRandom = false) {
  openPowerChoice(forceRandom);
}

function pickPowerFromChoice(index) {
  if (Date.now() < (state.powerChoiceLockedUntil || 0)) return;

  const power = state.pendingPowerOptions[index];
  if (!power) return;

  startRunWithPower(power.id);
  state.message = `Power picked: ${power.name}.`;
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
  setRecentlySeenCard(card.id);
}

function unmarkCardSeen(card) {
  if (!card) return;
  state.seenCardIds.delete(card.id);
}

function advanceToCard(card) {
  state.current = card;
  state.index += 1;
  state.cheatUsesOnCurrentCard = 0;
  markCardSeen(card);
}

function removeCheatAt(index) {
  state.cheats.splice(index, 1);
}

function describeCard(card) {
  if (!card) return "?";
  return `${card.rank}${card.suit}`;
}

function formatCurrentJudgedValueForMessage(card, effectiveValue) {
  const judgedRank = valueToRank(effectiveValue);
  if (!card) return `'${judgedRank}'`;
  return effectiveValue !== card.value ? `'${judgedRank}'` : `${judgedRank}`;
}

function formatNextValueForMessage(card, effectiveValue = card?.value) {
  if (!card) return "?";
  const judgedRank = valueToRank(effectiveValue);
  return effectiveValue !== card.value ? `'${judgedRank}'` : `${judgedRank}`;
}

function buildComparisonSnippet(currentCard, effectiveValue, nextCard, nextEffectiveValue = nextCard?.value) {
  if (!currentCard || !nextCard) return "";
  if (nextEffectiveValue === effectiveValue) {
    return `${formatCurrentJudgedValueForMessage(currentCard, effectiveValue)} = ${formatNextValueForMessage(nextCard, nextEffectiveValue)}`;
  }
  const symbol = effectiveValue < nextEffectiveValue ? "<" : ">";
  return `${formatCurrentJudgedValueForMessage(currentCard, effectiveValue)} ${symbol} ${formatNextValueForMessage(nextCard, nextEffectiveValue)}`;
}

function getEffectiveValueForModifier(card, modifier = 0) {
  if (!card) return null;

  if (runHasPower("aces_wild")) {
    const zeroIndexed = card.value - 1;
    const wrapped = ((zeroIndexed + modifier) % 13 + 13) % 13;
    return wrapped + 1;
  }

  return clamp(card.value + modifier, 1, 13);
}

function getCurrentEffectiveValue() {
  if (!state.current) return null;
  return getEffectiveValueForModifier(state.current, state.currentValueModifier || 0);
}

function isAceWildAutoCorrect(currentComparisonValue, nextCard) {
  if (!runHasPower("aces_wild")) return false;
  return currentComparisonValue === 1 || nextCard?.value === 1;
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

function canUseNudge(direction) {
  const isBlocked =
    state.gameOver ||
    !state.current ||
    state.pendingCheatOptions.length > 0 ||
    state.pendingPowerOptions.length > 0 ||
    !!state.sixSevenArmed ||
    !!state.pauseForCheat;
  if (isBlocked) return false;

  if (direction === "up") {
    if ((state.nudgeUpCharges || 0) <= 0) return false;
    const nextValue = getEffectiveValueForModifier(state.current, (state.currentValueModifier || 0) + 1);
    return nextValue !== getCurrentEffectiveValue();
  }
  if (direction === "down") {
    if ((state.nudgeDownCharges || 0) <= 0) return false;
    const nextValue = getEffectiveValueForModifier(state.current, (state.currentValueModifier || 0) - 1);
    return nextValue !== getCurrentEffectiveValue();
  }
  return false;
}

function useNudgeCharge(direction) {
  if (
    state.gameOver ||
    !state.current ||
    state.pendingCheatOptions.length > 0 ||
    state.pendingPowerOptions.length > 0 ||
    !!state.pauseForCheat
  ) {
    return;
  }

  if (direction === "up") {
    if ((state.nudgeUpCharges || 0) <= 0) return;
    if (!canUseNudge("up")) {
      state.message = "Cannot use Nudge +1 on a King.";
      render();
      return;
    }
  }

  if (direction === "down") {
    if ((state.nudgeDownCharges || 0) <= 0) return;
    if (!canUseNudge("down")) {
      state.message = "Cannot use Nudge -1 on an Ace.";
      render();
      return;
    }
  }

  if (direction === "up") {
    state.nudgeUpCharges = Math.max(0, (state.nudgeUpCharges || 0) - 1);
    state.currentValueModifier += 1;
  } else if (direction === "down") {
    state.nudgeDownCharges = Math.max(0, (state.nudgeDownCharges || 0) - 1);
    state.currentValueModifier -= 1;
  } else {
    return;
  }

  recordCurrentCardNudge(state.current, direction);
  const effective = getCurrentEffectiveValue();
  const label = direction === "up" ? "Nudge +1" : "Nudge -1";
  state.message = `${label} used. Current card treated as ${valueToRank(effective)}.`;
  render();
}

function getCardStatsEntry(cardId) {
  if (!state.cardStats[cardId]) {
    state.cardStats[cardId] = normalizeCardStatsEntry();
  } else {
    state.cardStats[cardId] = normalizeCardStatsEntry(state.cardStats[cardId]);
  }
  return state.cardStats[cardId];
}

function getGuessContextKey() {
  if (state.currentValueModifier > 0) return "nudgedUp";
  if (state.currentValueModifier < 0) return "nudgedDown";
  return "base";
}

function recordCurrentCardGuess(card, guessType, wasCorrectGuess) {
  if (!card) return;
  const entry = getCardStatsEntry(card.id);
  const guessBucket = entry.guessStats[getGuessContextKey()];
  entry.attempts += 1;
  if (wasCorrectGuess) entry.correct += 1;
  if (guessType === "higher" || guessType === "lower") {
    guessBucket[guessType] += 1;
  }
  saveCardStats(state.cardStats);
}

function recordCurrentCardNudge(card, direction) {
  if (!card) return;
  const entry = getCardStatsEntry(card.id);
  if (!entry.nudgeStats) {
    entry.nudgeStats = { up: 0, down: 0 };
  }
  if (direction === "up") entry.nudgeStats.up += 1;
  if (direction === "down") entry.nudgeStats.down += 1;
  saveCardStats(state.cardStats);
}

function addMetaProgression(amount = 1) {
  state.metaProgression = (state.metaProgression ?? 0) + amount;
  saveMetaProgression(state.metaProgression);
}

function recordFaceDownOutcome(card, endedRun, currentWasBase = true) {
  if (!card) return;
  const entry = getCardStatsEntry(card.id);
  if (endedRun) {
    entry.endedRun += 1;
    if (currentWasBase) {
      entry.endedRunFaceUpBase += 1;
    }
  } else {
    entry.survivedRun += 1;
  }
  saveCardStats(state.cardStats);
}

function getCardCorrectPercentage(card) {
  if (!card) return null;
  const entry = state.cardStats[card.id];
  if (!entry || entry.attempts === 0) return null;
  return Math.round((entry.correct / entry.attempts) * 100);
}

function getCardBackStatus(cardId) {
  return state.cardBackStatuses[cardId] || {
    tornCorner: false,
    backColor: "blue",
  };
}

function setCardBackStatus(cardId, patch) {
  const current = getCardBackStatus(cardId);
  state.cardBackStatuses[cardId] = { ...current, ...patch };
  saveCardBackStatuses(state.cardBackStatuses);
}

function getFaceDownCount() {
  return Math.max(0, state.deck.length - (state.index + 1));
}

function addMissingCheatsForDebug() {
  if (!state.current || state.gameOver) return;

  const added = [];
  for (const cheat of CHEATS) {
    const alreadyHeld =
      cheat.stacking !== "stackable" &&
      cheat.stacking !== "repeatable" &&
      state.cheats.some((c) => c.id === cheat.id);

    if (!cheat.included || alreadyHeld) continue;

    state.cheats.push({ ...cheat });
    added.push(cheat.name);
  }

  state.message =
    added.length > 0
      ? ` Debug: added ${added.join(", ")}.`
      : " Debug: no missing Cheats to add.";
  render();
}

function addBulkNudgesForDebug(count = 10) {
  if (!state.current || state.gameOver) {
    state.message = " Debug: start a run before adding bulk nudges.";
    render();
    return;
  }

  state.nudgeUpCharges = (state.nudgeUpCharges || 0) + count;
  state.nudgeDownCharges = (state.nudgeDownCharges || 0) + count;
  state.message = ` Debug: added ${count} Nudge +1 and ${count} Nudge -1 charges.`;
  render();
}

function clearCheatsForDebug() {
  state.cheats = [];
  state.pendingCheatOptions = [];
  state.cheatChoiceLockedUntil = 0;
  state.message = " Debug: cleared all cheats.";
  render();
}

function resetAllStatsForDebug() {
  localStorage.removeItem(CARD_STATS_KEY);
  localStorage.removeItem(CARD_BACK_STATUS_KEY);
  state.cardStats = {};
  state.cardBackStatuses = {};
  state.message = " Debug: cleared progression stats (best score preserved).";
  render();
}

function fullResetAllStateForDebug() {
  localStorage.removeItem(CARD_STATS_KEY);
  localStorage.removeItem(CARD_BACK_STATUS_KEY);
  localStorage.removeItem(RUN_SEED_KEY);
  localStorage.removeItem(BEST_SCORE_KEY);
  localStorage.removeItem(META_PROGRESSION_KEY);
  localStorage.removeItem(CHEAT_UNLOCKS_KEY);
  localStorage.removeItem(SELECTED_DECK_KEY);
  localStorage.removeItem(DECK_WINS_KEY);
  sessionStorage.removeItem(RED_DECK_DEBUG_UNLOCK_KEY);

  state = createEmptyState();
  state.message = " Debug: FULL RESET (everything cleared).";
  render();
}

/*
  Beginner-friendly onboarding helper.

  For players with meta progression 20 or below:
  - On J / Q / K, avoid a HIGHER next card
  - On A / 2 / 3 / 4, avoid a LOWER next card

  This does NOT force a win.
  It simply swaps a safer valid card into the next position in the deck,
  while preserving randomness from the remaining unseen cards.
*/
function maybeBiasUpcomingCardForNewPlayers() {
  if (!state.current || state.gameOver) return;
  if ((state.metaProgression ?? 0) > 20) return;

  const nextIndex = state.index + 1;
  if (nextIndex >= state.deck.length) return;

  const currentValue = state.current.value;
  const currentNext = state.deck[nextIndex];

  // Only bias obvious-feels-bad edge cards
  if (currentValue < 1 || currentValue > 13) return;

  let nextCardAlreadySafe = true;
  let candidateIndexes = [];

  if (currentValue >= 9) {
    // J / Q / K / 10 / 9 : next card should not be higher
    nextCardAlreadySafe = currentNext.value <= currentValue;

    for (let i = nextIndex + 1; i < state.deck.length; i += 1) {
      if (state.deck[i].value <= currentValue) {
        candidateIndexes.push(i);
      }
    }
  } else if (currentValue <= 4) {
    // A / 2 / 3 / 4 : next card should not be lower
    nextCardAlreadySafe = currentNext.value >= currentValue;

    for (let i = nextIndex + 1; i < state.deck.length; i += 1) {
      if (state.deck[i].value >= currentValue) {
        candidateIndexes.push(i);
      }
    }
  } else {
    return;
  }

  // If the next card is already "safe enough", leave the deck alone
  if (nextCardAlreadySafe) return;

  // If no safe replacement exists later in the deck, leave it alone
  if (candidateIndexes.length === 0) return;

  // Pick a random valid candidate and swap it into the next slot
  const chosenIndex =
    candidateIndexes[Math.floor(Math.random() * candidateIndexes.length)];

  const temp = state.deck[nextIndex];
  state.deck[nextIndex] = state.deck[chosenIndex];
  state.deck[chosenIndex] = temp;
}

function makeGuess(type) {
  state.restartConfirmArmed = false;
  state.deckStatsTooltipOpen = false;

  if (
    state.gameOver ||
    !state.current ||
    state.pendingCheatOptions.length > 0 ||
    state.pendingPowerOptions.length > 0
  ) {
    return;
  }

  // Soft onboarding protection for early players
  maybeBiasUpcomingCardForNewPlayers();

  const next = peekNext();
  if (!next) return;

  const currentComparisonValue = getCurrentEffectiveValue();
  const nextComparisonValue = clampCardValue(next.value + (state.nextCardValueModifier || 0));
  const currentWasBase = state.currentValueModifier === 0;
  const el = document.getElementById("next-info");
  if (el) el.innerText = "";
  state.nextCardValueModifier = 0;

  const lucky7WasArmed = !!state.lucky7Armed;
  const fiveAliveWasArmed = !!state.fiveAliveArmed;
  const godSaveKingWasArmed = !!state.godSaveKingArmed;
  const oddOneOutWasArmed = !!state.oddOneOutArmed;
  const sixSevenWasArmed = !!state.sixSevenArmed;

  state.lucky7Armed = false;
  state.fiveAliveArmed = false;
  state.godSaveKingArmed = false;
  state.oddOneOutArmed = false;
  state.sixSevenArmed = false;

  // --- Unified correct guess logic for streaks and extensibility ---
  let correct = false;
  let match = false;
  let cheatSpecial = false;

  // Example: Odd One Out special cheat logic
  const nextIsOddForOddOneOut = next.value === 1 || (next.value <= 10 && next.value % 2 === 1);
  if (oddOneOutWasArmed) {
    if (nextIsOddForOddOneOut) {
      recordCurrentCardGuess(state.current, type, false);
      recordFaceDownOutcome(next, true, currentWasBase);
      advanceToCard(next);
      state.currentValueModifier = 0;
      state.streak = 0;
      state.message = `💀 Odd One Out! ${describeCard(next)} is odd, so the run ends.`;
      state.gameOver = true;
      updateBestScoreIfNeeded();
      render();
      return;
    } else {
      cheatSpecial = true;
      correct = true;
    }
  }

  // Standard match logic
  if (!cheatSpecial && nextComparisonValue === currentComparisonValue) {
    match = true;
    correct = true;
  }

  const aceAutoWin =
    !cheatSpecial &&
    !match &&
    isAceWildAutoCorrect(currentComparisonValue, next);

  if (aceAutoWin) {
    cheatSpecial = true;
    correct = true;
  }

  // Standard higher/lower logic
  if (!cheatSpecial && !match) {
    const comparisonCorrect =
      (type === "higher" && nextComparisonValue > currentComparisonValue) ||
      (type === "lower" && nextComparisonValue < currentComparisonValue);
    const rescuedByLucky7 = !comparisonCorrect && lucky7WasArmed;
    const rescuedByFiveAlive = !comparisonCorrect && fiveAliveWasArmed;
    const rescuedByGodSaveKing = !comparisonCorrect && godSaveKingWasArmed && next.rank === "K";
    correct = comparisonCorrect || rescuedByLucky7 || rescuedByFiveAlive || rescuedByGodSaveKing;
  }

  if (!correct) {
    recordCurrentCardGuess(state.current, type, false);
    recordFaceDownOutcome(next, true, currentWasBase);
    advanceToCard(next);
    state.currentValueModifier = 0;
    state.streak = 0;
    setCurrentCardFeedback("wrong");
    flashGameShell("wrong");
    state.message = sixSevenWasArmed
      ? `❌ Wrong! 6/7 missed — it was ${describeCard(next)}.`
      : `❌ Wrong! It was ${describeCard(next)}.`;
    state.gameOver = true;
    updateBestScoreIfNeeded();
    render();
    handleRunFinished(state.correctAnswers);
    return;
  }

  // --- All correct guess logic below ---
  // Save the current card before advancing for correct log display
  const prevCard = state.current;
  recordCurrentCardGuess(state.current, type, true);
  recordFaceDownOutcome(next, false, currentWasBase);
  advanceToCard(next);
  state.correctAnswers += 1;
  state.currentValueModifier = 0;
  state.streak = (state.streak || 0) + 1;
  setCurrentCardFeedback("correct");
  flashGameShell("correct");
  addMetaProgression(1);
  updateBestScoreIfNeeded();

  if (state.index >= state.deck.length - 1) {
    let unlockedRedNow = false;
    if (state.runMode !== "daily") {
      const previousBlueWins = state.deckWins?.blue || 0;
      state.deckWins = recordDeckWin(state.currentDeckKey);
      unlockedRedNow = state.currentDeckKey === "blue" && previousBlueWins === 0 && (state.deckWins?.blue || 0) > 0;
    }
    state.message = unlockedRedNow ? " YOU CLEARED THE BLUE DECK! Red Deck unlocked." : " YOU CLEARED THE DECK!";
    state.gameOver = true;
    render();
    handleRunFinished(state.correctAnswers);
    if (!state.victoryPromptShown && typeof window.promptHeroNameForVictory === "function") {
      if (state.runMode === "daily") return;
      state.victoryPromptShown = true;
      window.promptHeroNameForVictory();
    }
    return;
  }

  const powerAwards = awardOnCorrectGuessPowers(type);

  if (sixSevenWasArmed) {
    state.streak = 0;
    state.sixSevenRewardChoicesRemaining = 3;
    state.pauseForCheat = true;
    state.message = powerAwards.length > 0
      ? `✅ 6/7 hit! Choose 3 cheats — power gained: ${powerAwards.join(", ")}.`
      : "✅ 6/7 hit! Choose 3 cheats.";
    render();
    setTimeout(() => {
      state.pauseForCheat = false;
      offerCheatChoice();
      render();
    }, 1000);
    return;
  }

  // --- Handle streak and cheat selection pause ---
  if (state.streak >= getCheatRewardThreshold()) {
    state.streak = 0;
    // Show detailed result before pause
    let pauseMsg = "✅ Correct!";
    if (match) {
      pauseMsg = `✅ Correct! Cards match! (${buildComparisonSnippet(prevCard, currentComparisonValue, next, nextComparisonValue)})`;
    } else {
      pauseMsg = `✅ Correct! ${buildComparisonSnippet(prevCard, currentComparisonValue, next, nextComparisonValue)}!`;
    }
    state.message = pauseMsg;
    state.pauseForCheat = true;
    render();
    setTimeout(() => {
      state.pauseForCheat = false;
      offerCheatChoice();
      render();
    }, 1000);
    return;
  }

  // --- Messaging for special cases ---
  if (cheatSpecial && powerAwards.length > 0) {
    state.message = aceAutoWin
      ? `✅ Correct! Ace counts high and low — power gained: ${powerAwards.join(", ")}.`
      : `✅ Odd One Out! Safe card — power gained: ${powerAwards.join(", ")}.`;
    render();
    return;
  }
  if (cheatSpecial) {
    state.message = aceAutoWin
      ? `✅ Correct! Ace counts high and low — it was ${describeCard(next)}.`
      : `✅ Odd One Out! Safe card — it was ${describeCard(next)}.`;
    render();
    return;
  }
  if (match) {
    state.message = `✅ Correct! Cards match! (${buildComparisonSnippet(prevCard, currentComparisonValue, next, nextComparisonValue)})`;
    render();
    return;
  }
  if (lucky7WasArmed) {
    state.message = `✅ Correct! Lucky 7 was spent. (${buildComparisonSnippet(prevCard, currentComparisonValue, next, nextComparisonValue)})`;
    render();
    return;
  }
  if (fiveAliveWasArmed) {
    state.message = `✅ Correct! Five Alive was spent. (${buildComparisonSnippet(prevCard, currentComparisonValue, next, nextComparisonValue)})`;
    render();
    return;
  }
  if (godSaveKingWasArmed) {
    state.message = next.rank === "K"
      ? `✅ Correct! God Save The King was spent. (${buildComparisonSnippet(prevCard, currentComparisonValue, next, nextComparisonValue)})`
      : `✅ Correct! God Save The King was spent. (${buildComparisonSnippet(prevCard, currentComparisonValue, next, nextComparisonValue)})`;
    render();
    return;
  }
  // Default correct guess message with card comparison
  state.message = `✅ Correct! ${buildComparisonSnippet(prevCard, currentComparisonValue, next, nextComparisonValue)}!`;
  render();
  return;

  if (rescuedByLucky7) {
    state.message = `🍀 Lucky 7! Counted as correct — it was ${describeCard(next)}.`;
    render();
    return;
  }

  if (rescuedByFiveAlive) {
    state.message = `🖐️ Five Alive! Wrong guess survived — it was ${describeCard(next)}.`;
    render();
    return;
  }


  if (powerAwards.length > 0) {
    let msg = '';
    if (next.value === currentComparisonValue) {
      msg = `✅ Correct! Cards match! Power gained: ${powerAwards.join(", ")}.`;
    } else {
      const symbol = next.value > currentComparisonValue ? '>' : '<';
      msg = `✅ Correct! ${next.value} ${symbol} ${currentComparisonValue}! Power gained: ${powerAwards.join(", ")}.`;
    }
    state.message = msg;
    render();
    return;
  }

  if (normallyCorrect && lucky7WasArmed) {
    state.message = "✅ Correct! Lucky 7 was spent.";
    render();
    return;
  }

  if (normallyCorrect && fiveAliveWasArmed) {
    state.message = "✅ Correct! Five Alive was spent.";
    render();
    return;
  }

  state.message =
    normalizeDeckKey(state.currentDeckKey) === "red" && runHasPower("nudge_engine")
      ? "✅ Correct! Red Deck was active, so no Nudge was awarded."
      : "✅ Correct!";

  render();
}


