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
    pendingPowerOptions: [],
    pendingRunSeed: "",
    pendingRunDeck: [],
    pendingRunMode: "standard",
    pendingDailyDateKey: "",
    pendingDeckKey: loadSelectedDeck(),
    pendingLevelNumber: loadSelectedLevel(),
    powerChoiceLockedUntil: 0,
    message: "Press Start Run.",
    gameOver: true,
    handCard: null,
    currentValueModifier: 0,
    nextCardValueModifier: 0,
    correctAnswers: 0,
    streak: 0,
    bestScore: loadBestScore(loadSelectedDeck(), loadSelectedLevel()),
    seenCardIds: new Set(),
    powers: [],
    selectedStartPowerId: null,
    selectedDeckKey: loadSelectedDeck(),
    currentDeckKey: loadSelectedDeck(),
    selectedLevelNumber: loadSelectedLevel(),
    currentLevelNumber: loadSelectedLevel(),
    metaProgression: loadMetaProgression(),
    cardStats: loadCardStats(),
    cardBackStatuses: loadCardBackStatuses(),
    cheatUnlocks: loadCheatUnlocks(),
    deckWins: loadDeckWins(),
    deckLevelClears: loadDeckLevelClears(),
    runMode: "standard",
    dailyDateKey: "",
    dailyCheatOfferCount: 0,
    justUnlockedCheatIds: [],
    cheatChoiceLockedUntil: 0,
    pauseForCheat: false,
    cheatUsesOnCurrentCard: 0,
    lucky7Armed: false,
    fiveAliveArmed: false,
    godSaveKingArmed: false,
    oddOneOutArmed: false,
    sixSevenArmed: false,
    sixSevenRewardChoicesRemaining: 0,
    runSeed: loadLastRunSeed() || randomSeedString(),
    restartConfirmArmed: false,
    deckStatsTooltipOpen: false,
    victoryPromptShown: false,
    currentCardFeedback: "",
    cheatChoiceIntroToken: 0,
    recentlySeenCardId: "",
    nudgeUpCharges: 0,
    nudgeDownCharges: 0,
  };
}

let state = createEmptyState();
