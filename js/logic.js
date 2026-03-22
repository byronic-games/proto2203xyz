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
      recordFaceDownCardSeen(peekNext());
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
      recordFaceDownCardSeen(peekNext());
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

function recordFaceDownCardSeen(card) {
      if (!card) return;
      const entry = getCardStatsEntry(card.id);
      entry.faceDownSeen += 1;
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
