const POWER_CHOICE_LOCK_MS = 500;
const ENABLE_GAME_OVER_EFFECTS = true;
const ENABLE_VICTORY_EFFECTS = true;
const RUN_DEBUG_LOG_LIMIT = 150;

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
let victoryEffectTimer = null;
let cardRevealAnimationToken = null;
const revealEffectRules = [];

function getComparisonDirection(currentValue, nextValue) {
  if (!Number.isFinite(currentValue) || !Number.isFinite(nextValue)) return "unknown";
  if (nextValue === currentValue) return "match";
  return nextValue > currentValue ? "higher" : "lower";
}

function buildRevealEffectContext({
  outcome = "correct",
  guessType = "higher",
  currentComparisonValue = null,
  nextComparisonValue = null,
  revealCard = null,
  match = false,
  aceAutoWin = false,
  cheatSpecial = false,
} = {}) {
  return {
    outcome: outcome === "wrong" ? "wrong" : "correct",
    guessType,
    currentComparisonValue,
    nextComparisonValue,
    comparisonDirection: getComparisonDirection(currentComparisonValue, nextComparisonValue),
    revealCard,
    revealRank: revealCard?.rank || "",
    revealSuit: revealCard?.suit || "",
    revealActualValue: revealCard?.value ?? null,
    revealEffectiveValue: nextComparisonValue,
    isMatch: !!match,
    aceAutoWin: !!aceAutoWin,
    cheatSpecial: !!cheatSpecial,
  };
}

function registerRevealEffectRule(effectId, matcher) {
  if (!effectId || typeof matcher !== "function") return;
  revealEffectRules.push({ effectId: String(effectId), matcher });
}

function resolveRevealEffectId(context) {
  for (const rule of revealEffectRules) {
    try {
      if (rule.matcher(context)) return rule.effectId;
    } catch (_) {
      // Ignore bad custom rule and continue.
    }
  }
  return "";
}

window.registerRevealEffectRule = registerRevealEffectRule;

function queueCardRevealAnimation(options = {}) {
  cardRevealAnimationToken = (cardRevealAnimationToken || 0) + 1;
  const normalizedOutcome = options.outcome === "wrong" ? "wrong" : "correct";
  const revealCard = options.revealCard || null;
  const revealEffectiveValue = Number.isFinite(options.revealEffectiveValue)
    ? options.revealEffectiveValue
    : revealCard?.value ?? null;
  const revealIsTemp = !!revealCard && Number.isFinite(revealEffectiveValue) && revealEffectiveValue !== revealCard.value;
  const fromCard = options.fromCard || null;
  const fromEffectiveValue = Number.isFinite(options.fromEffectiveValue)
    ? options.fromEffectiveValue
    : fromCard?.value ?? null;
  const fromIsTemp = !!fromCard && Number.isFinite(fromEffectiveValue) && fromEffectiveValue !== fromCard.value;

  state.pendingRevealAnimation = {
    id: cardRevealAnimationToken,
    outcome: normalizedOutcome,
    phase: "revealing",
    revealCard,
    revealEffectiveValue,
    revealIsTemp,
    fromCard,
    fromEffectiveValue,
    fromIsTemp,
    effectId: String(options.effectId || ""),
    feedbackEffect: String(options.feedbackEffect || normalizedOutcome),
    triggerGameOver: !!options.triggerGameOver,
    gameOverDetail: String(options.gameOverDetail || ""),
  };
}

function clearGameOverEffects() {
  const gameEl = document.getElementById("game");
  const detailEl = document.getElementById("game-over-detail");
  if (gameEl) {
    gameEl.classList.remove("game-over-effect");
  }
  if (detailEl) {
    detailEl.innerText = "";
  }
}

function clearVictoryEffects() {
  const gameEl = document.getElementById("game");
  const bannerEl = document.getElementById("victory-banner");
  const confettiEl = document.getElementById("victory-confetti");

  if (gameEl) {
    gameEl.classList.remove("victory-effect-active");
  }
  if (bannerEl) {
    bannerEl.innerText = "";
  }
  if (confettiEl) {
    confettiEl.innerHTML = "";
  }
  if (victoryEffectTimer) {
    clearTimeout(victoryEffectTimer);
    victoryEffectTimer = null;
  }
}

function spawnVictoryConfetti() {
  const confettiEl = document.getElementById("victory-confetti");
  if (!confettiEl) return;

  const colors = ["#9ff0ff", "#5bdbfb", "#c7ff54", "#f5ebff", "#ffcf72", "#f77df6"];
  const piecesPerWave = 54;
  const waveOffsets = [0, 320, 640];

  confettiEl.innerHTML = "";

  waveOffsets.forEach((waveOffset, waveIndex) => {
    for (let i = 0; i < piecesPerWave; i += 1) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.style.setProperty("--x", `${Math.random() * 100}%`);
      piece.style.setProperty("--drift-x", `${Math.round((Math.random() - 0.5) * 180)}px`);
      piece.style.setProperty("--fall-distance", `${280 + Math.round(Math.random() * 210)}px`);
      piece.style.setProperty("--spin-amount", `${360 + Math.round(Math.random() * 540)}deg`);
      piece.style.setProperty("--fall-duration", `${1500 + Math.round(Math.random() * 900)}ms`);
      piece.style.setProperty("--fall-delay", `${waveOffset + Math.round(Math.random() * 220)}ms`);
      piece.style.setProperty("--confetti-color", colors[(waveIndex * piecesPerWave + i) % colors.length]);
      confettiEl.appendChild(piece);
    }
  });
}

function triggerVictoryEffect(titleText = "CONGRATULATIONS!") {
  if (!ENABLE_VICTORY_EFFECTS) return;

  const gameEl = document.getElementById("game");
  const bannerEl = document.getElementById("victory-banner");
  if (!gameEl || !bannerEl) return;

  clearGameOverEffects();
  clearVictoryEffects();
  bannerEl.innerText = titleText;
  spawnVictoryConfetti();
  void gameEl.offsetWidth;
  gameEl.classList.add("victory-effect-active");

  victoryEffectTimer = setTimeout(() => {
    clearVictoryEffects();
  }, 3600);
}

function triggerGameOverEffect(detailText = "") {
  if (!ENABLE_GAME_OVER_EFFECTS) return;

  const gameEl = document.getElementById("game");
  const detailEl = document.getElementById("game-over-detail");
  if (!gameEl) return;

  clearGameOverEffects();
  void gameEl.offsetWidth;
  gameEl.classList.add("game-over-effect");
  if (detailEl) {
    detailEl.innerText = detailText || "";
  }
}

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

function describeCardForDebug(card) {
  if (!card) return null;

  return {
    id: card.id,
    rank: card.rank,
    suit: card.suit,
    value: card.value,
  };
}

function getNextComparisonValueForGuess(nextCard = peekNext()) {
  if (!nextCard) return null;
  return clampCardValue(nextCard.value + (state.nextCardValueModifier || 0));
}

function appendRunDebugLog(type, details = {}) {
  const nextCard = peekNext();
  const entry = {
    timestamp: new Date().toISOString(),
    type,
    turn: Number(state.index) || 0,
    runSeed: state.runSeed || "",
    runMode: state.runMode || "standard",
    deck: normalizeDeckKey(state.currentDeckKey || state.selectedDeckKey || "blue"),
    level: normalizeLevelNumber(state.currentLevelNumber || state.selectedLevelNumber || DEFAULT_LEVEL_NUMBER),
    currentCard: describeCardForDebug(state.current),
    nextCard: describeCardForDebug(nextCard),
    currentValueModifier: state.currentValueModifier || 0,
    nextCardValueModifier: state.nextCardValueModifier || 0,
    currentEffectiveValue: state.current ? getCurrentEffectiveValue() : null,
    nextCheatValue: nextCard ? getUpcomingCheatValue(1) : null,
    nextGuessValue: getNextComparisonValueForGuess(nextCard),
    powers: Array.isArray(state.powers) ? [...state.powers] : [],
    ...details,
  };

  const nextLog = [...(Array.isArray(state.runDebugLog) ? state.runDebugLog : []), entry].slice(-RUN_DEBUG_LOG_LIMIT);
  state.runDebugLog = nextLog;
  saveRunDebugLog(nextLog);
  return entry;
}

function exportRunDebugLog() {
  return JSON.stringify(Array.isArray(state.runDebugLog) ? state.runDebugLog : [], null, 2);
}

window.getRunDebugLog = () => Array.isArray(state.runDebugLog) ? [...state.runDebugLog] : [];
window.exportRunDebugLog = exportRunDebugLog;

function queueCheatAward(reason = "streak") {
  if (!Array.isArray(state.pendingCheatAwardQueue)) {
    state.pendingCheatAwardQueue = [];
  }
  state.pendingCheatAwardQueue.push(String(reason || "streak"));
}

function queuePowerAward(reason = "bonus") {
  if (!Array.isArray(state.pendingPowerAwardQueue)) {
    state.pendingPowerAwardQueue = [];
  }
  state.pendingPowerAwardQueue.push(String(reason || "bonus"));
}

function getDailyPowerOfferSeed(offerIndex) {
  return `${state.runSeed}|daily-power-offer-v1|${offerIndex}`;
}

function getExcludedRunPowerIds() {
  return Array.from(new Set((state.powers || []).filter((powerId) => powerId && powerId !== "nudge_engine")));
}

function grantPowerToCurrentRun(powerId, source = "bonus") {
  const power = getPowerById(powerId);
  if (!power) return false;
  if (!Array.isArray(state.powers)) {
    state.powers = [];
  }
  if (state.powers.includes(power.id)) {
    return false;
  }
  state.powers.push(power.id);
  applyRunPowerSetup(power.id);
  appendRunDebugLog("power_selected", {
    awardReason: source,
    powerId: power.id,
    powerName: power.name,
    powersAfterPick: [...state.powers],
    message: `Power gained: ${power.name}.`,
  });
  return true;
}

function getLockySevenCarryModifier(card, nextComparisonValue, nextCardModifier) {
  if (!state.lockySevensActive || !card) return 0;
  if (nextComparisonValue !== 7) return 0;
  if ((nextCardModifier || 0) === 0 && card.value !== 7) return 0;
  return 7 - card.value;
}

function offerRewardPowerChoice(reason = "bonus") {
  const isDailyRun = state.runMode === "daily";
  const excludeIds = getExcludedRunPowerIds();
  const seededOfferIndex = (state.dailyPowerOfferCount || 0) + 1;
  const seedString = isDailyRun ? getDailyPowerOfferSeed(seededOfferIndex) : "";
  const powerOptions = getRandomPowerOptions(2, seedString, isDailyRun, excludeIds);

  if (!powerOptions.length) {
    state.activePowerAwardReason = "";
    return false;
  }

  if (isDailyRun) {
    state.dailyPowerOfferCount = seededOfferIndex;
  }

  state.pendingPowerOptions = powerOptions;
  state.powerChoiceLockedUntil = Date.now() + POWER_CHOICE_LOCK_MS;
  state.activePowerAwardReason = String(reason || "bonus");
  state.message = state.activePowerAwardReason === "brucie_bonus"
    ? "Brucie Bonus! Choose 1 power:"
    : "Choose 1 power:";

  appendRunDebugLog("power_offer_presented", {
    awardReason: state.activePowerAwardReason,
    optionCount: state.pendingPowerOptions.length,
    options: state.pendingPowerOptions.map((option) => ({
      id: option.id,
      name: option.name,
      rarity: option.rarity || "common",
    })),
    message: state.message,
  });

  render();
  return true;
}

function resolvePendingRewardQueues() {
  if ((state.sixSevenRewardChoicesRemaining || 0) > 0) {
    offerCheatChoice();
    return true;
  }
  if ((state.pendingCheatAwardQueue || []).length > 0) {
    const nextReason = state.pendingCheatAwardQueue.shift();
    offerCheatChoice(nextReason);
    return true;
  }
  if ((state.pendingPowerAwardQueue || []).length > 0) {
    const nextReason = state.pendingPowerAwardQueue.shift();
    return offerRewardPowerChoice(nextReason);
  }
  return false;
}

function openPowerChoice(forceRandom = false) {
  clearGameOverEffects();
  clearVictoryEffects();
  const { chosenSeed, deck } = buildRunFromControls(forceRandom);

  state.pendingRunSeed = chosenSeed;
  state.pendingRunDeck = deck;
  const tutorialAssistActive = shouldApplyTutorialAssistForStandardRun("standard");
  state.pendingPowerOptions = tutorialAssistActive
    ? getTutorialNudgePowerOptions(2, chosenSeed)
    : getRandomPowerOptions(2, chosenSeed);
  state.pendingRunMode = "standard";
  state.pendingDailyDateKey = "";
  state.pendingDeckKey = normalizeDeckKey(state.selectedDeckKey || loadSelectedDeck());
  state.pendingLevelNumber = normalizeLevelNumber(state.selectedLevelNumber || loadSelectedLevel());
  state.pendingCheatOptions = [];
  state.pendingPowerAwardQueue = [];
  state.cheatChoiceLockedUntil = 0;
  state.powerChoiceLockedUntil = Date.now() + POWER_CHOICE_LOCK_MS;
  state.activePowerAwardReason = "";
  state.pauseForCheat = false;
  state.restartConfirmArmed = false;
  state.deckStatsTooltipOpen = false;
  state.message = `Choose 1 power for the ${getDeckName(state.pendingDeckKey)} Deck Level ${state.pendingLevelNumber} run.`;
  render();
  if (typeof window.maybeStartPowerChoiceTutorial === "function") {
    window.setTimeout(() => window.maybeStartPowerChoiceTutorial(), 0);
  }
}

function openDailyPowerChoice(dateKey = "") {
  clearGameOverEffects();
  clearVictoryEffects();
  const { chosenDateKey, chosenSeed, deck } = buildDailyRun(dateKey);

  state.pendingRunSeed = chosenSeed;
  state.pendingRunDeck = deck;
  state.pendingPowerOptions = getRandomPowerOptions(2, chosenSeed, true);
  state.pendingRunMode = "daily";
  state.pendingDailyDateKey = chosenDateKey;
  state.pendingDeckKey = "blue";
  state.pendingLevelNumber = DEFAULT_LEVEL_NUMBER;
  state.pendingCheatOptions = [];
  state.pendingPowerAwardQueue = [];
  state.cheatChoiceLockedUntil = 0;
  state.powerChoiceLockedUntil = Date.now() + POWER_CHOICE_LOCK_MS;
  state.activePowerAwardReason = "";
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
      state.nudgeUpCharges = (state.nudgeUpCharges || 0) + 4;
      state.nudgeDownCharges = (state.nudgeDownCharges || 0) + 4;
      break;
    case "updraft":
      state.nudgeUpCharges = (state.nudgeUpCharges || 0) + 8;
      break;
    case "downforce":
      state.nudgeDownCharges = (state.nudgeDownCharges || 0) + 8;
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

function shouldApplyTutorialAssistForStandardRun(runMode = "standard") {
  if (runMode === "daily") return false;

  const tutorialCompletedKey = typeof TUTORIAL_COMPLETED_KEY === "string"
    ? TUTORIAL_COMPLETED_KEY
    : "hl_prototype_tutorial_completed_v1";
  const tutorialForceReplayKey = typeof TUTORIAL_FORCE_REPLAY_KEY === "string"
    ? TUTORIAL_FORCE_REPLAY_KEY
    : "hl_prototype_tutorial_force_replay_v1";

  const forcedReplay = sessionStorage.getItem(tutorialForceReplayKey) === "1";
  if (forcedReplay) return true;

  const completed = localStorage.getItem(tutorialCompletedKey) === "1";
  if (completed) return false;

  const runsStarted = Number(loadProfileStats()?.runsStarted || 0);
  return runsStarted <= 1;
}

function makeTutorialFriendlyOpeningCard(deck) {
  if (!Array.isArray(deck) || deck.length < 2) return;
  const first = deck[0];
  if (!first || (first.value !== 1 && first.value !== 13)) return;

  const replacementIndex = deck.findIndex((card, idx) =>
    idx > 0 && card && card.value !== 1 && card.value !== 13
  );

  if (replacementIndex <= 0) return;
  [deck[0], deck[replacementIndex]] = [deck[replacementIndex], deck[0]];
}

function startRunWithPower(powerId) {
  clearGameOverEffects();
  clearVictoryEffects();
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
  const selectedLevelNumber = normalizeLevelNumber(state.selectedLevelNumber || loadSelectedLevel());
  const currentDeckKey = runMode === "daily"
    ? "blue"
    : normalizeDeckKey(state.pendingDeckKey || selectedDeckKey);
  const greenRun = runMode !== "daily" && currentDeckKey === "green";
  const currentLevelNumber = runMode === "daily"
    ? DEFAULT_LEVEL_NUMBER
    : normalizeLevelNumber(state.pendingLevelNumber || selectedLevelNumber);
  const activePowers = selectedPowerId
    ? Array.from(new Set([selectedPowerId, "nudge_engine"]))
    : ["nudge_engine"];

  if (shouldApplyTutorialAssistForStandardRun(runMode)) {
    makeTutorialFriendlyOpeningCard(deck);
  }

  state = {
    deck,
    index: 0,
    current: deck[0],
    cheats: [],
    pendingCheatOptions: [],
    pendingCheatAwardQueue: [],
    pendingPowerAwardQueue: [],
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
    bestScore: loadBestScore(currentDeckKey, currentLevelNumber),
    seenCardIds: new Set([deck[0].id]),
    powers: activePowers,
    selectedStartPowerId: selectedPowerId,
    selectedDeckKey,
    currentDeckKey,
    selectedLevelNumber,
    currentLevelNumber,
    runDebugLog: [],
    metaProgression: loadMetaProgression(),
    cardStats: loadCardStats(),
    cardBackStatuses: loadCardBackStatuses(),
    deckWins: loadDeckWins(),
    deckLevelClears: loadDeckLevelClears(),
    cheatUnlocks: loadCheatUnlocks(),
    runMode,
    dailyDateKey,
    dailyCheatOfferCount: 0,
    dailyPowerOfferCount: 0,
    justUnlockedCheatIds: [],
    cheatChoiceLockedUntil: 0,
    activeCheatAwardReason: "",
    activePowerAwardReason: "",
    powerChoiceLockedUntil: 0,
    pauseForCheat: false,
    pendingPowerOptions: [],
    pendingRunSeed: "",
    pendingRunDeck: [],
    pendingRunMode: "standard",
    pendingDailyDateKey: "",
    pendingDeckKey: selectedDeckKey,
    pendingLevelNumber: selectedLevelNumber,
    runSeed: chosenSeed,
    restartConfirmArmed: false,
    deckStatsTooltipOpen: false,
    victoryPromptShown: false,
    currentCardFeedback: "",
    cheatChoiceIntroToken: 0,
    recentlySeenCardId: "",
    nudgeUpCharges: 0,
    nudgeDownCharges: 0,
    energy: greenRun
      ? (currentLevelNumber >= 4 ? 5 : (currentLevelNumber >= 3 ? 6 : (currentLevelNumber === 2 ? 8 : 10)))
      : 0,
    lucky7Armed: false,
    fiveAliveArmed: false,
    godSaveKingArmed: false,
    alwaysBetBlackArmed: false,
    lockySevensActive: false,
    oddOneOutArmed: false,
    cursedShieldArmed: false,
    suitedAndBootedArmed: false,
    suitedAndBootedSuit: "",
    forcedNextGuess: "",
    lockCurrentCardForForcedGuess: false,
    cheatACheaterRemaining: 0,
  };

  applyRunPowerSetup(selectedPowerId);
  clearRunDebugLog();
  appendRunDebugLog("run_started", {
    selectedPowerId,
    selectedPowerName: getPowerName(selectedPowerId),
    activePowers,
    dailyDateKey,
  });

  if (runMode === "daily") {
    lockDailyAttempt(dailyDateKey, chosenSeed, loadPreferredPlayerName());
  }

  recordRunStarted(currentDeckKey, runMode);

  if (runMode !== "daily") {
    saveSelectedDeck(currentDeckKey);
    saveSelectedLevel(currentLevelNumber);
    saveLastRunSeed(chosenSeed);
  }
  render();
  if (typeof window.maybeStartFirstRunTutorial === "function") {
    window.maybeStartFirstRunTutorial();
  }
}

function handleRunFinished(finalScore) {
  if (state.runMode !== "daily") return;

  const dateKey = state.dailyDateKey || getCurrentDailyDateKey();
  const playerName = loadPreferredPlayerName();
  const normalizedFinalScore = Math.max(0, Number(finalScore) || 0);
  // Daily scoring starts at 1, so a full clear is 52 instead of 51.
  const dailyScore = normalizedFinalScore + 1;
  const entry = buildDailyEntry({
    dateKey,
    seed: state.runSeed,
    playerName: playerName || "Unknown",
    playerId: getOrCreateDailyPlayerId(),
    score: dailyScore,
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
  if (typeof window.isTutorialBlockingPowerPick === "function" && window.isTutorialBlockingPowerPick()) {
    state.message = "Choose a power when the tutorial asks you to.";
    render();
    return;
  }

  const power = state.pendingPowerOptions[index];
  if (!power) return;

  const isRewardChoice = !!state.activePowerAwardReason;
  if (typeof window.handleTutorialPowerPicked === "function") {
    window.handleTutorialPowerPicked(power, isRewardChoice);
  }

  if (isRewardChoice && !state.gameOver && state.current) {
    const gained = grantPowerToCurrentRun(power.id, state.activePowerAwardReason);
    state.pendingPowerOptions = [];
    state.powerChoiceLockedUntil = 0;
    const rewardReason = state.activePowerAwardReason;
    state.activePowerAwardReason = "";
    state.message = gained
      ? rewardReason === "brucie_bonus"
        ? `Brucie Bonus! Gained power: ${power.name}.`
        : `Power gained: ${power.name}.`
      : `${power.name} is already active.`;
    if (resolvePendingRewardQueues()) {
      return;
    }
    render();
    return;
  }

  startRunWithPower(power.id);
  state.activePowerAwardReason = "";
  state.message = `Power picked: ${power.name}.`;
  render();
}

function updateBestScoreIfNeeded() {
  if (state.correctAnswers > state.bestScore) {
    state.bestScore = state.correctAnswers;
    saveBestScore(state.bestScore, state.currentDeckKey, state.currentLevelNumber);
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

function formatCurrentCardForLossMessage(card, effectiveValue) {
  if (!card) return "?";
  if (effectiveValue !== card.value) {
    return `${describeCard(card)} (treated as ${valueToRank(effectiveValue)})`;
  }
  return describeCard(card);
}

function formatNextCardForLossMessage(card, effectiveValue = card?.value) {
  if (!card) return "?";
  if (effectiveValue !== card.value) {
    return `${describeCard(card)} (treated as ${valueToRank(effectiveValue)})`;
  }
  return describeCard(card);
}

function buildWrongGuessMessage(type, currentCard, currentEffectiveValue, nextCard, nextEffectiveValue, prefix = "") {
  const currentLabel = formatCurrentCardForLossMessage(currentCard, currentEffectiveValue);
  const nextLabel = formatNextCardForLossMessage(nextCard, nextEffectiveValue);

  if (type === "higher") {
    return `${prefix}${nextLabel} was lower than ${currentLabel}.`;
  }

  return `${prefix}${nextLabel} was higher than ${currentLabel}.`;
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

function isGreenDeckRun() {
  return normalizeDeckKey(state.currentDeckKey || state.selectedDeckKey || "blue") === "green";
}

function adjustValueForLockySevens(currentValue, targetValue) {
  if (!state.lockySevensActive) return targetValue;
  if (!Number.isFinite(currentValue) || !Number.isFinite(targetValue)) return targetValue;
  if (currentValue === 7) return 7;
  if ((currentValue < 7 && targetValue >= 7) || (currentValue > 7 && targetValue <= 7)) {
    return 7;
  }
  return targetValue;
}

function getAdjustedCurrentNudgeTarget(modifierDelta) {
  const currentValue = getCurrentEffectiveValue();
  if (!Number.isFinite(currentValue)) return null;
  const targetValue = getEffectiveValueForModifier(state.current, (state.currentValueModifier || 0) + modifierDelta);
  return adjustValueForLockySevens(currentValue, targetValue);
}

function getAdjustedNextNudgeTarget(baseDelta) {
  const next = peekNext();
  if (!next) return null;
  const currentValue = getUpcomingCheatValue(1);
  if (!Number.isFinite(currentValue)) return null;
  const targetValue = clampCardValue(currentValue + baseDelta);
  return adjustValueForLockySevens(currentValue, targetValue);
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
    !!state.lockCurrentCardForForcedGuess ||
    !!state.pauseForCheat;
  if (isBlocked) return false;
  if (isGreenDeckRun() && (state.energy || 0) <= 0) return false;

  if (direction === "up") {
    if ((state.nudgeUpCharges || 0) <= 0) return false;
    const nextValue = getAdjustedCurrentNudgeTarget(1);
    return nextValue !== getCurrentEffectiveValue();
  }
  if (direction === "down") {
    if ((state.nudgeDownCharges || 0) <= 0) return false;
    const nextValue = getAdjustedCurrentNudgeTarget(-1);
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
    !!state.lockCurrentCardForForcedGuess ||
    !!state.pauseForCheat
  ) {
    return;
  }

  if (isGreenDeckRun() && (state.energy || 0) <= 0) {
    state.message = "No energy left - nudges are disabled.";
    render();
    return;
  }

  if (direction === "up") {
    if ((state.nudgeUpCharges || 0) <= 0) return;
    if (!canUseNudge("up")) {
      state.message = state.lockCurrentCardForForcedGuess
        ? "Card value is locked until your next forced guess."
        : state.lockySevensActive && getCurrentEffectiveValue() === 7
          ? "Locky 7s active - 7s cannot be nudged."
          : "Cannot use Nudge +1 on a King.";
      render();
      return;
    }
  }

  if (direction === "down") {
    if ((state.nudgeDownCharges || 0) <= 0) return;
    if (!canUseNudge("down")) {
      state.message = state.lockCurrentCardForForcedGuess
        ? "Card value is locked until your next forced guess."
        : state.lockySevensActive && getCurrentEffectiveValue() === 7
          ? "Locky 7s active - 7s cannot be nudged."
          : "Cannot use Nudge -1 on an Ace.";
      render();
      return;
    }
  }

  const currentValue = getCurrentEffectiveValue();
  const targetValue = direction === "up"
    ? getAdjustedCurrentNudgeTarget(1)
    : getAdjustedCurrentNudgeTarget(-1);
  if (!Number.isFinite(currentValue) || !Number.isFinite(targetValue)) {
    return;
  }

  if (direction === "up") {
    state.nudgeUpCharges = Math.max(0, (state.nudgeUpCharges || 0) - 1);
    state.currentValueModifier += targetValue - currentValue;
  } else if (direction === "down") {
    state.nudgeDownCharges = Math.max(0, (state.nudgeDownCharges || 0) - 1);
    state.currentValueModifier += targetValue - currentValue;
  } else {
    return;
  }

  recordCurrentCardNudge(state.current, direction);
  if (isGreenDeckRun()) {
    state.energy = Math.max(0, (state.energy || 0) - 1);
  }
  const effective = getCurrentEffectiveValue();
  const label = direction === "up" ? "Nudge +1" : "Nudge -1";
  state.message = isGreenDeckRun()
    ? `${label} used. Current card treated as ${valueToRank(effective)}. Energy left: ${state.energy || 0}.`
    : `${label} used. Current card treated as ${valueToRank(effective)}.`;
  appendRunDebugLog("nudge_used", {
    direction,
    label,
    resultingEffectiveValue: effective,
    nudgeUpCharges: state.nudgeUpCharges || 0,
    nudgeDownCharges: state.nudgeDownCharges || 0,
    message: state.message,
  });
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
  if (normalizeDeckKey(state.currentDeckKey) === "blue") {
    entry.nudgeStats.blueFaceUpUses += 1;
    if ((state.currentValueModifier || 0) !== 0) {
      entry.nudgeStats.blueNudgedUses += 1;
    }
    if (!wasCorrectGuess) {
      entry.nudgeStats.blueFaceUpEnded += 1;
    }
  }
  if (wasCorrectGuess) entry.correct += 1;
  if (guessType === "higher" || guessType === "lower") {
    guessBucket[guessType] += 1;
  }
  saveCardStats(state.cardStats);
}

function recordCurrentCardNudge(card, direction) {
  if (!card) return;
  if (normalizeDeckKey(state.currentDeckKey) !== "blue") return;
  const entry = getCardStatsEntry(card.id);
  if (!entry.nudgeStats) {
    entry.nudgeStats = {
      up: 0,
      down: 0,
      blueFaceUpUses: 0,
      blueNudgedUses: 0,
      blueFaceUpEnded: 0,
      totalUpAmount: 0,
      totalDownAmount: 0,
    };
  }
  if (direction === "up") {
    entry.nudgeStats.up += 1;
    entry.nudgeStats.totalUpAmount += 1;
  }
  if (direction === "down") {
    entry.nudgeStats.down += 1;
    entry.nudgeStats.totalDownAmount += 1;
  }
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
  localStorage.removeItem(BEST_SCORES_BY_MODE_KEY);
  localStorage.removeItem(SELECTED_LEVEL_KEY);
  localStorage.removeItem(META_PROGRESSION_KEY);
  localStorage.removeItem(CHEAT_UNLOCKS_KEY);
  localStorage.removeItem(PROFILE_STATS_KEY);
  localStorage.removeItem(SELECTED_DECK_KEY);
  localStorage.removeItem(DECK_WINS_KEY);
  localStorage.removeItem(DECK_LEVEL_CLEARS_KEY);
  localStorage.removeItem(RUN_DEBUG_LOG_KEY);
  sessionStorage.removeItem(RED_DECK_DEBUG_UNLOCK_KEY);

  state = createEmptyState();
  state.message = " Debug: FULL RESET (everything cleared).";
  render();
}

/*
  Beginner-friendly onboarding helper.

  For players with meta progression 20 or below:
  - On 8 / 9 / 10 / J / Q / K, avoid a HIGHER next card
  - On A / 2 / 3 / 4 / 5, avoid a LOWER next card
  - 6 and 7 remain fully random

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

  if (currentValue >= 8) {
    // 8 / 9 / 10 / J / Q / K : next card should not be higher
    nextCardAlreadySafe = currentNext.value <= currentValue;

    for (let i = nextIndex + 1; i < state.deck.length; i += 1) {
      if (state.deck[i].value <= currentValue) {
        candidateIndexes.push(i);
      }
    }
  } else if (currentValue <= 5) {
    // A / 2 / 3 / 4 / 5 : next card should not be lower
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

function makeGuessLegacy(type) {
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

  if (state.forcedNextGuess && type !== state.forcedNextGuess) {
    state.message = state.forcedNextGuess === "higher"
      ? "The Higher The Better is active - you must guess Higher."
      : "The Lower The Better is active - you must guess Lower.";
    render();
    return;
  }

  // Soft onboarding protection for early players
  maybeBiasUpcomingCardForNewPlayers();

  const next = peekNext();
  if (!next) return;

  const currentComparisonValue = getCurrentEffectiveValue();
  const nextComparisonValue = getNextComparisonValueForGuess(next);
  const nextModifierBeforeGuess = state.nextCardValueModifier || 0;
  const lockySevenCarryModifier = getLockySevenCarryModifier(next, nextComparisonValue, nextModifierBeforeGuess);
  const currentWasBase = state.currentValueModifier === 0;
  const el = document.getElementById("next-info");
  if (el) el.innerText = "";
  state.nextCardValueModifier = 0;

  const lucky7WasArmed = !!state.lucky7Armed;
  const fiveAliveWasArmed = !!state.fiveAliveArmed;
  const godSaveKingWasArmed = !!state.godSaveKingArmed;
  const alwaysBetBlackWasArmed = !!state.alwaysBetBlackArmed;
  const oddOneOutWasArmed = !!state.oddOneOutArmed;
  const sixSevenWasArmed = !!state.sixSevenArmed;
  const cursedShieldWasArmed = !!state.cursedShieldArmed;
  const suitedAndBootedWasArmed = !!state.suitedAndBootedArmed;
  const suitedAndBootedSuit = state.suitedAndBootedSuit || "";
  const forcedNextGuessDirection = state.forcedNextGuess || "";
  const passiveSuitSavePower = getPassiveSuitSavePower(state.current);

  state.lucky7Armed = false;
  state.fiveAliveArmed = false;
  state.godSaveKingArmed = false;
  state.alwaysBetBlackArmed = false;
  state.oddOneOutArmed = false;
  state.sixSevenArmed = false;
  state.suitedAndBootedArmed = false;
  state.suitedAndBootedSuit = "";
  state.forcedNextGuess = "";
  state.lockCurrentCardForForcedGuess = false;

  // --- Unified correct guess logic for streaks and extensibility ---
  let correct = false;
  let match = false;
  let cheatSpecial = false;
  let rescuedBySuitSave = false;
  let rescuedByAlwaysBetBlack = false;
  let rescuedByCursedShield = false;
  let rescuedBySuitedAndBooted = false;

  const forcedNudgeDirection =
    forcedNextGuessDirection === "higher"
      ? "up"
      : forcedNextGuessDirection === "lower"
        ? "down"
        : "";
  const forcedNudgeReward = forcedNudgeDirection
    ? Math.abs(nextComparisonValue - currentComparisonValue)
    : 0;

  // Example: Odd One Out special cheat logic
  const nextIsOddForOddOneOut = next.value === 1 || (next.value <= 10 && next.value % 2 === 1);
  if (oddOneOutWasArmed) {
    if (nextIsOddForOddOneOut) {
      const lossCurrentCard = state.current;
      recordCurrentCardGuess(state.current, type, false);
      recordFaceDownOutcome(next, true, currentWasBase);
      advanceToCard(next);
      state.currentValueModifier = 0;
      state.streak = 0;
      setCurrentCardFeedback("wrong");
      flashGameShell("wrong");
      const lossMessage = `Odd One Out triggered — next card was ${formatNextCardForLossMessage(next)}.`;
      appendRunDebugLog("guess_resolved", {
        guess: type,
        outcome: "loss",
        reason: "odd_one_out",
        currentComparisonValue,
        nextComparisonValue,
        lucky7WasArmed,
        fiveAliveWasArmed,
        godSaveKingWasArmed,
        alwaysBetBlackWasArmed,
        oddOneOutWasArmed,
        sixSevenWasArmed,
        cursedShieldWasArmed,
        suitedAndBootedWasArmed,
        suitedAndBootedSuit,
        forcedNextGuessDirection,
        message: lossMessage,
      });
      triggerGameOverEffect(lossMessage);
      state.message = `💀 ${lossMessage}`;
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
    rescuedByAlwaysBetBlack = !comparisonCorrect && alwaysBetBlackWasArmed && (next.suit === SUITS[0] || next.suit === SUITS[3]);
    rescuedByCursedShield = !comparisonCorrect && cursedShieldWasArmed;
    rescuedBySuitedAndBooted = !comparisonCorrect && suitedAndBootedWasArmed && !!suitedAndBootedSuit && next.suit !== suitedAndBootedSuit;
    rescuedBySuitSave = !comparisonCorrect && !!passiveSuitSavePower;
    correct =
      comparisonCorrect ||
      rescuedByLucky7 ||
      rescuedByFiveAlive ||
      rescuedByGodSaveKing ||
      rescuedByAlwaysBetBlack ||
      rescuedByCursedShield ||
      rescuedBySuitedAndBooted ||
      rescuedBySuitSave;
    if (rescuedByCursedShield) {
      state.cursedShieldArmed = false;
    }
  }

  if (!correct) {
    const lossCurrentCard = state.current;
    recordCurrentCardGuess(state.current, type, false);
    recordFaceDownOutcome(next, true, currentWasBase);
    advanceToCard(next);
    state.currentValueModifier = lockySevenCarryModifier;
    state.streak = 0;
    setCurrentCardFeedback("wrong");
    flashGameShell("wrong");
    const lossDetail = sixSevenWasArmed
      ? `6/7 failed — ${buildWrongGuessMessage(type, lossCurrentCard, currentComparisonValue, next, nextComparisonValue)}`
      : buildWrongGuessMessage(type, lossCurrentCard, currentComparisonValue, next, nextComparisonValue);
    appendRunDebugLog("guess_resolved", {
      guess: type,
      outcome: "loss",
      reason: sixSevenWasArmed ? "six_seven_failed" : "comparison_failed",
      currentComparisonValue,
      nextComparisonValue,
      aceAutoWin,
      match,
      lucky7WasArmed,
        fiveAliveWasArmed,
        godSaveKingWasArmed,
        alwaysBetBlackWasArmed,
        oddOneOutWasArmed,
        sixSevenWasArmed,
        passiveSuitSavePowerId: passiveSuitSavePower?.id || "",
        rescuedBySuitSave,
        rescuedByAlwaysBetBlack,
        message: lossDetail,
      });
    triggerGameOverEffect(lossDetail);
    state.message = `❌ ${lossDetail}`;
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
  recordCorrectGuessProgress(1);
  state.currentValueModifier = lockySevenCarryModifier;
  state.streak = (state.streak || 0) + 1;
  setCurrentCardFeedback("correct");
  flashGameShell("correct");
  addMetaProgression(1);
  if (forcedNudgeDirection === "up" && forcedNudgeReward > 0) {
    state.nudgeUpCharges = (state.nudgeUpCharges || 0) + forcedNudgeReward;
  } else if (forcedNudgeDirection === "down" && forcedNudgeReward > 0) {
    state.nudgeDownCharges = (state.nudgeDownCharges || 0) + forcedNudgeReward;
  }
  updateBestScoreIfNeeded();

  if (state.index >= state.deck.length - 1) {
    appendRunDebugLog("guess_resolved", {
      guess: type,
      outcome: "deck_cleared",
      reason: "final_card",
      currentComparisonValue,
      nextComparisonValue,
      aceAutoWin,
      match,
      lucky7WasArmed,
      fiveAliveWasArmed,
      godSaveKingWasArmed,
      alwaysBetBlackWasArmed,
      oddOneOutWasArmed,
      sixSevenWasArmed,
    });
    if (state.runMode !== "daily") {
      state.deckWins = recordDeckWin(state.currentDeckKey);
      state.deckLevelClears = recordDeckLevelClear(state.currentDeckKey, state.currentLevelNumber);
      recordDeckClearProgress(state.currentDeckKey);
    } else {
      recordDailyClearProgress();
    }
    state.message = " YOU CLEARED THE DECK!";
    state.gameOver = true;
    render();
    triggerVictoryEffect();
    handleRunFinished(state.correctAnswers);
    if (!state.victoryPromptShown && typeof window.promptHeroNameForVictory === "function") {
      if (state.runMode === "daily") return;
      state.victoryPromptShown = true;
      window.setTimeout(() => {
        window.promptHeroNameForVictory();
      }, 900);
    }
    return;
  }

  const powerAwards = awardOnCorrectGuessPowers(type);
  const brucieBonusTriggered = runHasPower("brucie_bonus") && match;
  let cheatACheaterTriggered = false;

  if (brucieBonusTriggered) {
    queuePowerAward("brucie_bonus");
  }

  if ((state.cheatACheaterRemaining || 0) > 0) {
    state.cheatACheaterRemaining = Math.max(0, (state.cheatACheaterRemaining || 0) - 1);
    if (state.cheatACheaterRemaining === 0) {
      cheatACheaterTriggered = true;
      queueCheatAward("cheat_a_cheater");
      queueCheatAward("cheat_a_cheater");
    }
  }

  appendRunDebugLog("guess_resolved", {
    guess: type,
    outcome: "correct",
    reason: aceAutoWin
      ? "ace_auto_win"
      : match
        ? "match"
        : rescuedByCursedShield
          ? "cursed_shield"
          : rescuedBySuitedAndBooted
            ? "suited_and_booted"
        : lucky7WasArmed
          ? "lucky_7"
          : fiveAliveWasArmed
            ? "five_alive"
            : godSaveKingWasArmed
              ? "god_save_the_king"
              : oddOneOutWasArmed
                ? "odd_one_out_safe"
                : "comparison_correct",
    currentComparisonValue,
    nextComparisonValue,
    aceAutoWin,
    match,
    lucky7WasArmed,
    fiveAliveWasArmed,
    godSaveKingWasArmed,
    alwaysBetBlackWasArmed,
    oddOneOutWasArmed,
    sixSevenWasArmed,
    cursedShieldWasArmed,
    suitedAndBootedWasArmed,
    suitedAndBootedSuit,
    forcedNextGuessDirection,
    forcedNudgeDirection,
    forcedNudgeReward,
    passiveSuitSavePowerId: passiveSuitSavePower?.id || "",
    rescuedBySuitSave,
    rescuedByAlwaysBetBlack,
    rescuedByCursedShield,
    rescuedBySuitedAndBooted,
    brucieBonusTriggered,
    cheatACheaterTriggered,
    cheatACheaterRemaining: state.cheatACheaterRemaining || 0,
  });

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
      offerCheatChoice("streak");
      render();
    }, 1000);
    return;
  }

  if (brucieBonusTriggered) {
    state.pauseForCheat = true;
    state.message = "Brucie Bonus! Match hit - choose 1 power.";
    render();
    setTimeout(() => {
      state.pauseForCheat = false;
      const nextReason = state.pendingPowerAwardQueue.shift() || "brucie_bonus";
      offerRewardPowerChoice(nextReason);
      render();
    }, 1000);
    return;
  }

  if (cheatACheaterTriggered) {
    state.pauseForCheat = true;
    state.message = "You Can Cheat A Cheater paid out - choose 2 bonus cheats.";
    render();
    setTimeout(() => {
      state.pauseForCheat = false;
      const nextReason = state.pendingCheatAwardQueue.shift() || "cheat_a_cheater";
      offerCheatChoice(nextReason);
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
  if (rescuedBySuitSave && passiveSuitSavePower) {
    state.message = `${passiveSuitSavePower.name} saved the run - it was ${describeCard(next)}.`;
    render();
    return;
  }
  if (rescuedByAlwaysBetBlack) {
    state.message = `Always Bet On The Black saved the run - it was ${describeCard(next)}.`;
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




function makeGuess(type) {
  state.restartConfirmArmed = false;
  state.deckStatsTooltipOpen = false;

  if (
    state.gameOver ||
    !state.current ||
    !!state.pendingRevealAnimation ||
    state.pendingCheatOptions.length > 0 ||
    state.pendingPowerOptions.length > 0
  ) {
    return;
  }

  if (state.forcedNextGuess && type !== state.forcedNextGuess) {
    state.message = state.forcedNextGuess === "higher"
      ? "The Higher The Better is active - you must guess Higher."
      : "The Lower The Better is active - you must guess Lower.";
    render();
    return;
  }

  maybeBiasUpcomingCardForNewPlayers();

  const next = peekNext();
  if (!next) return;

  const currentComparisonValue = getCurrentEffectiveValue();
  const nextComparisonValue = getNextComparisonValueForGuess(next);
  const revealDistance = Math.abs(nextComparisonValue - currentComparisonValue);
  const formatEnergyFeedback = (delta) => {
    return "";
  };
  const appendEnergyFeedback = (message, delta) => {
    const feedback = formatEnergyFeedback(delta);
    return feedback ? `${message} (${feedback})` : message;
  };

  const nextModifierBeforeGuess = state.nextCardValueModifier || 0;
  const lockySevenCarryModifier = getLockySevenCarryModifier(next, nextComparisonValue, nextModifierBeforeGuess);
  const currentWasBase = state.currentValueModifier === 0;
  const el = document.getElementById("next-info");
  if (el) el.innerText = "";
  state.nextCardValueModifier = 0;

  const lucky7WasArmed = !!state.lucky7Armed;
  const fiveAliveWasArmed = !!state.fiveAliveArmed;
  const godSaveKingWasArmed = !!state.godSaveKingArmed;
  const alwaysBetBlackWasArmed = !!state.alwaysBetBlackArmed;
  const oddOneOutWasArmed = !!state.oddOneOutArmed;
  const sixSevenWasArmed = !!state.sixSevenArmed;
  const cursedShieldWasArmed = !!state.cursedShieldArmed;
  const suitedAndBootedWasArmed = !!state.suitedAndBootedArmed;
  const suitedAndBootedSuit = state.suitedAndBootedSuit || "";
  const forcedNextGuessDirection = state.forcedNextGuess || "";
  const passiveSuitSavePower = getPassiveSuitSavePower(state.current);

  state.lucky7Armed = false;
  state.fiveAliveArmed = false;
  state.godSaveKingArmed = false;
  state.alwaysBetBlackArmed = false;
  state.oddOneOutArmed = false;
  state.sixSevenArmed = false;
  state.suitedAndBootedArmed = false;
  state.suitedAndBootedSuit = "";
  state.forcedNextGuess = "";
  state.lockCurrentCardForForcedGuess = false;

  let correct = false;
  let match = false;
  let cheatSpecial = false;
  let rescuedBySuitSave = false;
  let rescuedByAlwaysBetBlack = false;
  let rescuedByCursedShield = false;
  let rescuedBySuitedAndBooted = false;

  const forcedNudgeDirection =
    forcedNextGuessDirection === "higher"
      ? "up"
      : forcedNextGuessDirection === "lower"
        ? "down"
        : "";
  const forcedNudgeReward = forcedNudgeDirection
    ? Math.abs(nextComparisonValue - currentComparisonValue)
    : 0;

  const nextIsOddForOddOneOut = next.value === 1 || (next.value <= 10 && next.value % 2 === 1);
  if (oddOneOutWasArmed) {
    if (nextIsOddForOddOneOut) {
      const lossCurrentCard = state.current;
      recordCurrentCardGuess(state.current, type, false);
      recordFaceDownOutcome(next, true, currentWasBase);
      advanceToCard(next);
      queueCardRevealAnimation({
        outcome: "wrong",
        fromCard: lossCurrentCard,
        fromEffectiveValue: currentComparisonValue,
        revealCard: next,
        revealEffectiveValue: nextComparisonValue,
        effectId: resolveRevealEffectId(buildRevealEffectContext({
          outcome: "wrong",
          guessType: type,
          currentComparisonValue,
          nextComparisonValue,
          revealCard: next,
          match: false,
          aceAutoWin: false,
          cheatSpecial: true,
        })),
        triggerGameOver: true,
      });
      state.currentValueModifier = 0;
      state.streak = 0;
      const lossMessage = appendEnergyFeedback(
        `Odd One Out triggered - next card was ${formatNextCardForLossMessage(next)}.`,
        -revealDistance
      );
      appendRunDebugLog("guess_resolved", {
        guess: type,
        outcome: "loss",
        reason: "odd_one_out",
        currentComparisonValue,
        nextComparisonValue,
        revealDistance,
        lucky7WasArmed,
        fiveAliveWasArmed,
        godSaveKingWasArmed,
        alwaysBetBlackWasArmed,
        oddOneOutWasArmed,
        sixSevenWasArmed,
        message: lossMessage,
      });
      if (state.pendingRevealAnimation) {
        state.pendingRevealAnimation.gameOverDetail = lossMessage;
      }
      state.message = `💀 ${lossMessage}`;
      state.gameOver = true;
      updateBestScoreIfNeeded();
      render();
      return;
    }
    cheatSpecial = true;
    correct = true;
  }

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

  if (!cheatSpecial && !match) {
    const comparisonCorrect =
      (type === "higher" && nextComparisonValue > currentComparisonValue) ||
      (type === "lower" && nextComparisonValue < currentComparisonValue);
    const rescuedByLucky7 = !comparisonCorrect && lucky7WasArmed;
    const rescuedByFiveAlive = !comparisonCorrect && fiveAliveWasArmed;
    const rescuedByGodSaveKing = !comparisonCorrect && godSaveKingWasArmed && next.rank === "K";
    rescuedByAlwaysBetBlack = !comparisonCorrect && alwaysBetBlackWasArmed && (next.suit === SUITS[0] || next.suit === SUITS[3]);
    rescuedByCursedShield = !comparisonCorrect && cursedShieldWasArmed;
    rescuedBySuitedAndBooted = !comparisonCorrect && suitedAndBootedWasArmed && !!suitedAndBootedSuit && next.suit !== suitedAndBootedSuit;
    rescuedBySuitSave = !comparisonCorrect && !!passiveSuitSavePower;
    correct =
      comparisonCorrect ||
      rescuedByLucky7 ||
      rescuedByFiveAlive ||
      rescuedByGodSaveKing ||
      rescuedByAlwaysBetBlack ||
      rescuedByCursedShield ||
      rescuedBySuitedAndBooted ||
      rescuedBySuitSave;
    if (rescuedByCursedShield) {
      state.cursedShieldArmed = false;
    }
  }

  if (!correct) {
    const lossCurrentCard = state.current;
    recordCurrentCardGuess(state.current, type, false);
    recordFaceDownOutcome(next, true, currentWasBase);
    advanceToCard(next);
    state.currentValueModifier = lockySevenCarryModifier;
    state.streak = 0;
    const lossDetail = sixSevenWasArmed
      ? `6/7 failed - ${buildWrongGuessMessage(type, lossCurrentCard, currentComparisonValue, next, nextComparisonValue)}`
      : buildWrongGuessMessage(type, lossCurrentCard, currentComparisonValue, next, nextComparisonValue);
    const gameOverMessage = `❌ ${lossDetail}`;
    queueCardRevealAnimation({
      outcome: "wrong",
      fromCard: lossCurrentCard,
      fromEffectiveValue: currentComparisonValue,
      revealCard: next,
      revealEffectiveValue: nextComparisonValue,
      effectId: resolveRevealEffectId(buildRevealEffectContext({
        outcome: "wrong",
        guessType: type,
        currentComparisonValue,
        nextComparisonValue,
        revealCard: next,
        match: false,
        aceAutoWin,
        cheatSpecial,
      })),
      triggerGameOver: true,
      gameOverDetail: gameOverMessage,
    });

    appendRunDebugLog("guess_resolved", {
      guess: type,
      outcome: "loss",
      reason: sixSevenWasArmed ? "six_seven_failed" : "comparison_failed",
      currentComparisonValue,
      nextComparisonValue,
      revealDistance,
      aceAutoWin,
      match,
      lucky7WasArmed,
      fiveAliveWasArmed,
      godSaveKingWasArmed,
      alwaysBetBlackWasArmed,
      oddOneOutWasArmed,
      sixSevenWasArmed,
      cursedShieldWasArmed,
      suitedAndBootedWasArmed,
      suitedAndBootedSuit,
      forcedNextGuessDirection,
      passiveSuitSavePowerId: passiveSuitSavePower?.id || "",
      rescuedBySuitSave,
      rescuedByAlwaysBetBlack,
      rescuedByCursedShield,
      rescuedBySuitedAndBooted,
      energyAfter: state.energy || 0,
      message: lossDetail,
    });

    state.message = gameOverMessage;
    state.gameOver = true;
    updateBestScoreIfNeeded();
    render();
    handleRunFinished(state.correctAnswers);
    return;
  }

  const prevCard = state.current;
  recordCurrentCardGuess(state.current, type, true);
  recordFaceDownOutcome(next, false, currentWasBase);
  advanceToCard(next);
  queueCardRevealAnimation({
    outcome: "correct",
    fromCard: prevCard,
    fromEffectiveValue: currentComparisonValue,
    revealCard: next,
    revealEffectiveValue: nextComparisonValue,
    effectId: resolveRevealEffectId(buildRevealEffectContext({
      outcome: "correct",
      guessType: type,
      currentComparisonValue,
      nextComparisonValue,
      revealCard: next,
      match,
      aceAutoWin,
      cheatSpecial,
    })),
  });
  state.correctAnswers += 1;
  recordCorrectGuessProgress(1);
  state.currentValueModifier = lockySevenCarryModifier;
  state.streak = (state.streak || 0) + 1;
  addMetaProgression(1);
  if (forcedNudgeDirection === "up" && forcedNudgeReward > 0) {
    state.nudgeUpCharges = (state.nudgeUpCharges || 0) + forcedNudgeReward;
  } else if (forcedNudgeDirection === "down" && forcedNudgeReward > 0) {
    state.nudgeDownCharges = (state.nudgeDownCharges || 0) + forcedNudgeReward;
  }
  updateBestScoreIfNeeded();

  if (state.index >= state.deck.length - 1) {
    appendRunDebugLog("guess_resolved", {
      guess: type,
      outcome: "deck_cleared",
      reason: "final_card",
      currentComparisonValue,
      nextComparisonValue,
      revealDistance,
      aceAutoWin,
      match,
      lucky7WasArmed,
      fiveAliveWasArmed,
      godSaveKingWasArmed,
      alwaysBetBlackWasArmed,
      oddOneOutWasArmed,
      sixSevenWasArmed,
      cursedShieldWasArmed,
      suitedAndBootedWasArmed,
      suitedAndBootedSuit,
      forcedNextGuessDirection,
      forcedNudgeDirection,
      forcedNudgeReward,
      rescuedByCursedShield,
      rescuedBySuitedAndBooted,
      energyAfter: state.energy || 0,
    });
    if (state.runMode !== "daily") {
      state.deckWins = recordDeckWin(state.currentDeckKey);
      state.deckLevelClears = recordDeckLevelClear(state.currentDeckKey, state.currentLevelNumber);
      recordDeckClearProgress(state.currentDeckKey);
    } else {
      recordDailyClearProgress();
    }
    state.message = appendEnergyFeedback(" YOU CLEARED THE DECK!", revealDistance);
    state.gameOver = true;
    render();
    triggerVictoryEffect();
    handleRunFinished(state.correctAnswers);
    if (!state.victoryPromptShown && typeof window.promptHeroNameForVictory === "function") {
      if (state.runMode === "daily") return;
      state.victoryPromptShown = true;
      window.setTimeout(() => {
        window.promptHeroNameForVictory();
      }, 900);
    }
    return;
  }

  const powerAwards = awardOnCorrectGuessPowers(type);
  const brucieBonusTriggered = runHasPower("brucie_bonus") && match;
  let cheatACheaterTriggered = false;

  if (brucieBonusTriggered) {
    queuePowerAward("brucie_bonus");
  }

  if ((state.cheatACheaterRemaining || 0) > 0) {
    state.cheatACheaterRemaining = Math.max(0, (state.cheatACheaterRemaining || 0) - 1);
    if (state.cheatACheaterRemaining === 0) {
      cheatACheaterTriggered = true;
      queueCheatAward("cheat_a_cheater");
      queueCheatAward("cheat_a_cheater");
    }
  }

  appendRunDebugLog("guess_resolved", {
    guess: type,
    outcome: "correct",
    reason: aceAutoWin
      ? "ace_auto_win"
      : match
        ? "match"
        : rescuedByCursedShield
          ? "cursed_shield"
          : rescuedBySuitedAndBooted
            ? "suited_and_booted"
        : lucky7WasArmed
          ? "lucky_7"
          : fiveAliveWasArmed
            ? "five_alive"
            : godSaveKingWasArmed
              ? "god_save_the_king"
              : oddOneOutWasArmed
                ? "odd_one_out_safe"
                : "comparison_correct",
    currentComparisonValue,
    nextComparisonValue,
    revealDistance,
    aceAutoWin,
    match,
    lucky7WasArmed,
    fiveAliveWasArmed,
    godSaveKingWasArmed,
    alwaysBetBlackWasArmed,
    oddOneOutWasArmed,
    sixSevenWasArmed,
    cursedShieldWasArmed,
    suitedAndBootedWasArmed,
    suitedAndBootedSuit,
    forcedNextGuessDirection,
    forcedNudgeDirection,
    forcedNudgeReward,
    passiveSuitSavePowerId: passiveSuitSavePower?.id || "",
    rescuedBySuitSave,
    rescuedByAlwaysBetBlack,
    rescuedByCursedShield,
    rescuedBySuitedAndBooted,
    brucieBonusTriggered,
    cheatACheaterTriggered,
    cheatACheaterRemaining: state.cheatACheaterRemaining || 0,
    energyAfter: state.energy || 0,
  });

  if (sixSevenWasArmed) {
    state.streak = 0;
    state.sixSevenRewardChoicesRemaining = 3;
    state.pauseForCheat = true;
    state.message = powerAwards.length > 0
      ? `✅ 6/7 hit! Choose 3 cheats - power gained: ${powerAwards.join(", ")}.`
      : "✅ 6/7 hit! Choose 3 cheats.";
    state.message = appendEnergyFeedback(state.message, revealDistance);
    render();
    setTimeout(() => {
      state.pauseForCheat = false;
      offerCheatChoice();
      render();
    }, 1000);
    return;
  }

  const forcedRewardText = forcedNudgeReward > 0
    ? forcedNudgeDirection === "up"
      ? ` Gained ${forcedNudgeReward} Nudge +1.`
      : ` Gained ${forcedNudgeReward} Nudge -1.`
    : "";
  const rescueBonusText = `${rescuedByCursedShield ? " Cursed Shield saved this guess." : ""}${rescuedBySuitedAndBooted ? " Suited and Booted saved this guess." : ""}${forcedRewardText}`;

  if (state.streak >= getCheatRewardThreshold()) {
    state.streak = 0;
    let pauseMsg = "✅ Correct!";
    if (match) {
      pauseMsg = `✅ Correct! Cards match! (${buildComparisonSnippet(prevCard, currentComparisonValue, next, nextComparisonValue)})`;
    } else {
      pauseMsg = `✅ Correct! ${buildComparisonSnippet(prevCard, currentComparisonValue, next, nextComparisonValue)}!`;
    }
    state.message = appendEnergyFeedback(`${pauseMsg}${rescueBonusText}`, revealDistance);
    state.pauseForCheat = true;
    render();
    setTimeout(() => {
      state.pauseForCheat = false;
      offerCheatChoice("streak");
      render();
    }, 1000);
    return;
  }

  if (brucieBonusTriggered) {
    state.pauseForCheat = true;
    state.message = appendEnergyFeedback("Brucie Bonus! Match hit - choose 1 power.", revealDistance);
    render();
    setTimeout(() => {
      state.pauseForCheat = false;
      const nextReason = state.pendingPowerAwardQueue.shift() || "brucie_bonus";
      offerRewardPowerChoice(nextReason);
      render();
    }, 1000);
    return;
  }

  if (cheatACheaterTriggered) {
    state.pauseForCheat = true;
    state.message = appendEnergyFeedback("You Can Cheat A Cheater paid out - choose 2 bonus cheats.", revealDistance);
    render();
    setTimeout(() => {
      state.pauseForCheat = false;
      const nextReason = state.pendingCheatAwardQueue.shift() || "cheat_a_cheater";
      offerCheatChoice(nextReason);
      render();
    }, 1000);
    return;
  }

  if (cheatSpecial && powerAwards.length > 0) {
    state.message = aceAutoWin
      ? `✅ Correct! Ace counts high and low - power gained: ${powerAwards.join(", ")}.`
      : `✅ Odd One Out! Safe card - power gained: ${powerAwards.join(", ")}.`;
    state.message = appendEnergyFeedback(state.message, revealDistance);
    render();
    return;
  }
  if (cheatSpecial) {
    state.message = aceAutoWin
      ? `✅ Correct! Ace counts high and low - it was ${describeCard(next)}.`
      : `✅ Odd One Out! Safe card - it was ${describeCard(next)}.`;
    state.message = appendEnergyFeedback(state.message, revealDistance);
    render();
    return;
  }
  if (match) {
    state.message = appendEnergyFeedback(`✅ Correct! Cards match! (${buildComparisonSnippet(prevCard, currentComparisonValue, next, nextComparisonValue)})${rescueBonusText}`, revealDistance);
    render();
    return;
  }
  if (lucky7WasArmed) {
    state.message = appendEnergyFeedback(`✅ Correct! Lucky 7 was spent. (${buildComparisonSnippet(prevCard, currentComparisonValue, next, nextComparisonValue)})`, revealDistance);
    render();
    return;
  }
  if (fiveAliveWasArmed) {
    state.message = appendEnergyFeedback(`✅ Correct! Five Alive was spent. (${buildComparisonSnippet(prevCard, currentComparisonValue, next, nextComparisonValue)})`, revealDistance);
    render();
    return;
  }
  if (rescuedBySuitSave && passiveSuitSavePower) {
    state.message = appendEnergyFeedback(`${passiveSuitSavePower.name} saved the run - it was ${describeCard(next)}.${rescueBonusText}`, revealDistance);
    render();
    return;
  }
  if (rescuedByCursedShield) {
    state.message = appendEnergyFeedback(`Cursed Shield saved the run - it was ${describeCard(next)}.${forcedRewardText}`, revealDistance);
    render();
    return;
  }
  if (rescuedBySuitedAndBooted) {
    state.message = appendEnergyFeedback(`Suited and Booted saved the run - it was ${describeCard(next)}.${forcedRewardText}`, revealDistance);
    render();
    return;
  }
  if (rescuedByAlwaysBetBlack) {
    state.message = appendEnergyFeedback(`Always Bet On The Black saved the run - it was ${describeCard(next)}.${rescueBonusText}`, revealDistance);
    render();
    return;
  }
  if (godSaveKingWasArmed) {
    state.message = appendEnergyFeedback(`✅ Correct! God Save The King was spent. (${buildComparisonSnippet(prevCard, currentComparisonValue, next, nextComparisonValue)})`, revealDistance);
    render();
    return;
  }

  state.message = appendEnergyFeedback(`✅ Correct! ${buildComparisonSnippet(prevCard, currentComparisonValue, next, nextComparisonValue)}!${rescueBonusText}`, revealDistance);
  render();
}
