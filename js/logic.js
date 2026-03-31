function startRun(forceRandom = false) {
  const seedInput = document.getElementById("run-seed-input");
  let chosenSeed = "";

  if (forceRandom) {
    chosenSeed = randomSeedString();
    if (seedInput) seedInput.value = chosenSeed;
  } else {
    chosenSeed = normalizeSeed(seedInput?.value) || randomSeedString();
    if (seedInput) seedInput.value = chosenSeed;
  }


  let deck = createDeck(chosenSeed);

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


  // Always use Nudge as the default power (even if dropdown is hidden)
  const selectedPowerId = "nudge_engine";
  const activePowers = getPowerToggleStateForSelection(selectedPowerId);

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
    metaProgression: loadMetaProgression(),
    cardStats: loadCardStats(),
    cardBackStatuses: loadCardBackStatuses(),
    cheatUnlocks: loadCheatUnlocks(),
    justUnlockedCheatIds: [],
    runSeed: chosenSeed,
    restartConfirmArmed: false,
    deckStatsTooltipOpen: false,
    victoryPromptShown: false,
    nudgeUpCharges: 0,
    nudgeDownCharges: 0,
    lucky7Armed: false,
    fiveAliveArmed: false,
    oddOneOutArmed: false,
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

function unmarkCardSeen(card) {
  if (!card) return;
  state.seenCardIds.delete(card.id);
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

function formatCurrentJudgedValueForMessage(card, effectiveValue) {
  const judgedRank = valueToRank(effectiveValue);
  if (!card) return `'${judgedRank}'`;
  return effectiveValue !== card.value ? `'${judgedRank}'` : `${judgedRank}`;
}

function formatNextValueForMessage(card) {
  if (!card) return "?";
  return `${valueToRank(card.value)}`;
}

function buildComparisonSnippet(currentCard, effectiveValue, nextCard) {
  if (!currentCard || !nextCard) return "";
  if (nextCard.value === effectiveValue) {
    return `${formatCurrentJudgedValueForMessage(currentCard, effectiveValue)} = ${formatNextValueForMessage(nextCard)}`;
  }
  const symbol = effectiveValue < nextCard.value ? "<" : ">";
  return `${formatCurrentJudgedValueForMessage(currentCard, effectiveValue)} ${symbol} ${formatNextValueForMessage(nextCard)}`;
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

function canUseNudge(direction) {
  const isBlocked =
    state.gameOver || !state.current || state.pendingCheatOptions.length > 0 || !!state.pauseForCheat;
  if (isBlocked) return false;

  const effectiveValue = getCurrentEffectiveValue();
  if (direction === "up") {
    return (state.nudgeUpCharges || 0) > 0 && effectiveValue < 13;
  }
  if (direction === "down") {
    return (state.nudgeDownCharges || 0) > 0 && effectiveValue > 1;
  }
  return false;
}

function useNudgeCharge(direction) {
  if (state.gameOver || !state.current || state.pendingCheatOptions.length > 0 || !!state.pauseForCheat) {
    return;
  }

  const effectiveValue = getCurrentEffectiveValue();

  if (direction === "up") {
    if ((state.nudgeUpCharges || 0) <= 0) return;
    if (effectiveValue >= 13) {
      state.message = "Cannot use Nudge +1 on a King.";
      render();
      return;
    }
  }

  if (direction === "down") {
    if ((state.nudgeDownCharges || 0) <= 0) return;
    if (effectiveValue <= 1) {
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

  if (state.gameOver || !state.current || state.pendingCheatOptions.length > 0) {
    return;
  }

  // Soft onboarding protection for early players
  maybeBiasUpcomingCardForNewPlayers();

  const next = peekNext();
  if (!next) return;

  const currentComparisonValue = getCurrentEffectiveValue();
  const currentWasBase = state.currentValueModifier === 0;
  const el = document.getElementById("next-info");
  if (el) el.innerText = "";

  const lucky7WasArmed = !!state.lucky7Armed;
  const fiveAliveWasArmed = !!state.fiveAliveArmed;
  const oddOneOutWasArmed = !!state.oddOneOutArmed;

  state.lucky7Armed = false;
  state.fiveAliveArmed = false;
  state.oddOneOutArmed = false;

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
  if (!cheatSpecial && next.value === currentComparisonValue) {
    match = true;
    correct = true;
  }

  // Standard higher/lower logic
  if (!cheatSpecial && !match) {
    const normallyCorrect =
      (type === "higher" && next.value > currentComparisonValue) ||
      (type === "lower" && next.value < currentComparisonValue);
    const rescuedByLucky7 = !normallyCorrect && lucky7WasArmed;
    const rescuedByFiveAlive = !normallyCorrect && fiveAliveWasArmed;
    correct = normallyCorrect || rescuedByLucky7 || rescuedByFiveAlive;
  }

  if (!correct) {
    recordCurrentCardGuess(state.current, type, false);
    recordFaceDownOutcome(next, true, currentWasBase);
    advanceToCard(next);
    state.currentValueModifier = 0;
    state.streak = 0;
    state.message = `❌ Wrong! It was ${describeCard(next)}.`;
    state.gameOver = true;
    updateBestScoreIfNeeded();
    render();
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
  addMetaProgression(1);
  updateBestScoreIfNeeded();

  if (state.index >= state.deck.length - 1) {
    state.message = " YOU CLEARED THE DECK!";
    state.gameOver = true;
    render();
    if (!state.victoryPromptShown && typeof window.promptHeroNameForVictory === "function") {
      state.victoryPromptShown = true;
      window.promptHeroNameForVictory();
    }
    return;
  }

  const powerAwards = awardOnCorrectGuessPowers(type);

  // --- Handle streak and cheat selection pause ---
  if (state.streak >= 3) {
    state.streak = 0;
    // Show detailed result before pause
    let pauseMsg = "✅ Correct!";
    if (match) {
      pauseMsg = `✅ Correct! Cards match! (${buildComparisonSnippet(prevCard, currentComparisonValue, next)})`;
    } else {
      pauseMsg = `✅ Correct! ${buildComparisonSnippet(prevCard, currentComparisonValue, next)}!`;
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
    state.message = `✅ Odd One Out! Safe card — power gained: ${powerAwards.join(", ")}.`;
    render();
    return;
  }
  if (cheatSpecial) {
    state.message = `✅ Odd One Out! Safe card — it was ${describeCard(next)}.`;
    render();
    return;
  }
  if (match) {
    state.message = `✅ Correct! Cards match! (${buildComparisonSnippet(prevCard, currentComparisonValue, next)})`;
    render();
    return;
  }
  if (lucky7WasArmed) {
    state.message = `✅ Correct! Lucky 7 was spent. (${buildComparisonSnippet(prevCard, currentComparisonValue, next)})`;
    render();
    return;
  }
  if (fiveAliveWasArmed) {
    state.message = `✅ Correct! Five Alive was spent. (${buildComparisonSnippet(prevCard, currentComparisonValue, next)})`;
    render();
    return;
  }
  // Default correct guess message with card comparison
  state.message = `✅ Correct! ${buildComparisonSnippet(prevCard, currentComparisonValue, next)}!`;
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
    runHasPower("stats_display") && runHasPower("nudge_engine")
      ? "✅ Correct! Stats was active, so no Nudge was awarded."
      : "✅ Correct!";

  render();
}
