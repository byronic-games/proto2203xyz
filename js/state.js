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
    powerChoiceLockedUntil: 0,
    message: "Press Start Run.",
    gameOver: true,
    handCard: null,
    currentValueModifier: 0,
    correctAnswers: 0,
    streak: 0,
    bestScore: loadBestScore(),
    seenCardIds: new Set(),
    powers: [],
    selectedStartPowerId: null,
    metaProgression: loadMetaProgression(),
    cardStats: loadCardStats(),
    cardBackStatuses: loadCardBackStatuses(),
    cheatUnlocks: loadCheatUnlocks(),
    runMode: "standard",
    dailyDateKey: "",
    dailyCheatOfferCount: 0,
    justUnlockedCheatIds: [],
    cheatChoiceLockedUntil: 0,
    pauseForCheat: false,
    cheatUsesOnCurrentCard: 0,
    lucky7Armed: false,
    fiveAliveArmed: false,
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
