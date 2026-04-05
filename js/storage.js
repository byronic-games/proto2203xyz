function normalizeLevelNumber(level = DEFAULT_LEVEL_NUMBER) {
  const value = Number(level);
  return Number.isFinite(value) && value >= 1 ? Math.floor(value) : DEFAULT_LEVEL_NUMBER;
}

function getBestScoreBucketKey(deckKey = "blue", level = DEFAULT_LEVEL_NUMBER) {
  return `${normalizeDeckKey(deckKey)}|${normalizeLevelNumber(level)}`;
}

function normalizeBestScoreMap(bestScores = {}) {
  const normalized = {};
  if (!bestScores || typeof bestScores !== "object") return normalized;

  Object.entries(bestScores).forEach(([bucketKey, score]) => {
    const numericScore = Number(score);
    normalized[String(bucketKey)] = Number.isFinite(numericScore) && numericScore > 0 ? numericScore : 0;
  });

  return normalized;
}

function normalizeDeckLevelClears(clears = {}) {
  const normalized = {};
  if (!clears || typeof clears !== "object") return normalized;

  Object.entries(clears).forEach(([bucketKey, clearCount]) => {
    const numericClearCount = Number(clearCount);
    normalized[String(bucketKey)] = Number.isFinite(numericClearCount) && numericClearCount > 0
      ? Math.floor(numericClearCount)
      : 0;
  });

  return normalized;
}

function normalizeRunDebugLog(entries = []) {
  if (!Array.isArray(entries)) return [];

  return entries
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => ({ ...entry }));
}

function loadBestScoreMap() {
  let bestScores = {};

  try {
    const raw = localStorage.getItem(BEST_SCORES_BY_MODE_KEY);
    if (raw) {
      bestScores = normalizeBestScoreMap(JSON.parse(raw));
    }
  } catch {
    bestScores = {};
  }

  const blueLevelOneKey = getBestScoreBucketKey("blue", DEFAULT_LEVEL_NUMBER);
  const legacyBest = Number(localStorage.getItem(BEST_SCORE_KEY));
  if (!(blueLevelOneKey in bestScores) && Number.isFinite(legacyBest) && legacyBest > 0) {
    bestScores[blueLevelOneKey] = legacyBest;
    localStorage.setItem(BEST_SCORES_BY_MODE_KEY, JSON.stringify(bestScores));
  }

  return bestScores;
}

function loadBestScore(deckKey = "blue", level = DEFAULT_LEVEL_NUMBER) {
  const bestScores = loadBestScoreMap();
  return bestScores[getBestScoreBucketKey(deckKey, level)] || 0;
}

function saveBestScore(score, deckKey = "blue", level = DEFAULT_LEVEL_NUMBER) {
  const normalizedScore = Math.max(0, Number(score) || 0);
  const bucketKey = getBestScoreBucketKey(deckKey, level);
  const bestScores = loadBestScoreMap();
  bestScores[bucketKey] = normalizedScore;
  localStorage.setItem(BEST_SCORES_BY_MODE_KEY, JSON.stringify(bestScores));

  if (bucketKey === getBestScoreBucketKey("blue", DEFAULT_LEVEL_NUMBER)) {
    localStorage.setItem(BEST_SCORE_KEY, String(normalizedScore));
  }
}

function loadSelectedLevel() {
  return normalizeLevelNumber(localStorage.getItem(SELECTED_LEVEL_KEY) || DEFAULT_LEVEL_NUMBER);
}

function loadRunDebugLog() {
  try {
    const raw = localStorage.getItem(RUN_DEBUG_LOG_KEY);
    if (!raw) return [];
    return normalizeRunDebugLog(JSON.parse(raw));
  } catch {
    return [];
  }
}

function saveRunDebugLog(entries) {
  localStorage.setItem(RUN_DEBUG_LOG_KEY, JSON.stringify(normalizeRunDebugLog(entries)));
}

function clearRunDebugLog() {
  localStorage.removeItem(RUN_DEBUG_LOG_KEY);
}

function saveSelectedLevel(level) {
  localStorage.setItem(SELECTED_LEVEL_KEY, String(normalizeLevelNumber(level)));
}

function loadDeckLevelClears() {
  let clears = {};

  try {
    const raw = localStorage.getItem(DECK_LEVEL_CLEARS_KEY);
    if (raw) {
      clears = normalizeDeckLevelClears(JSON.parse(raw));
    }
  } catch {
    clears = {};
  }

  const legacyDeckWins = loadDeckWins();
  const blueLevelOneKey = getBestScoreBucketKey("blue", 1);
  const redLevelOneKey = getBestScoreBucketKey("red", 1);
  let migrated = false;

  if (!(blueLevelOneKey in clears) && (legacyDeckWins.blue || 0) > 0) {
    clears[blueLevelOneKey] = legacyDeckWins.blue;
    migrated = true;
  }

  if (!(redLevelOneKey in clears) && (legacyDeckWins.red || 0) > 0) {
    clears[redLevelOneKey] = legacyDeckWins.red;
    migrated = true;
  }

  if (migrated) {
    saveDeckLevelClears(clears);
  }

  return clears;
}

function saveDeckLevelClears(clears) {
  localStorage.setItem(DECK_LEVEL_CLEARS_KEY, JSON.stringify(normalizeDeckLevelClears(clears)));
}

function recordDeckLevelClear(deckKey, level = DEFAULT_LEVEL_NUMBER) {
  const bucketKey = getBestScoreBucketKey(deckKey, level);
  const clears = loadDeckLevelClears();
  clears[bucketKey] = (clears[bucketKey] || 0) + 1;
  saveDeckLevelClears(clears);
  return clears;
}

function getDeckLevelClearCount(deckKey, level = DEFAULT_LEVEL_NUMBER) {
  const clears = loadDeckLevelClears();
  return clears[getBestScoreBucketKey(deckKey, level)] || 0;
}

function hasClearedDeckLevel(deckKey, level = DEFAULT_LEVEL_NUMBER) {
  return getDeckLevelClearCount(deckKey, level) > 0;
}

function normalizeGuessBucket(bucket = {}) {
  return {
    higher: Number.isFinite(bucket.higher) ? bucket.higher : 0,
    lower: Number.isFinite(bucket.lower) ? bucket.lower : 0,
  };
}

function normalizeDeckKey(deckKey = "blue") {
  return String(deckKey || "").trim().toLowerCase() === "red" ? "red" : "blue";
}

function normalizeDeckWins(wins = {}) {
  return {
    blue: Number.isFinite(wins.blue) ? wins.blue : 0,
    red: Number.isFinite(wins.red) ? wins.red : 0,
  };
}

function normalizeProfileStats(stats = {}) {
  return {
    totalCorrectGuesses: Number.isFinite(stats.totalCorrectGuesses) ? stats.totalCorrectGuesses : 0,
    runsStarted: Number.isFinite(stats.runsStarted) ? stats.runsStarted : 0,
    dailyRunsStarted: Number.isFinite(stats.dailyRunsStarted) ? stats.dailyRunsStarted : 0,
    blueRunsStarted: Number.isFinite(stats.blueRunsStarted) ? stats.blueRunsStarted : 0,
    redRunsStarted: Number.isFinite(stats.redRunsStarted) ? stats.redRunsStarted : 0,
    totalDecksCleared: Number.isFinite(stats.totalDecksCleared) ? stats.totalDecksCleared : 0,
    decksClearedByColor: normalizeDeckWins(stats.decksClearedByColor),
    dailyAttempts: Number.isFinite(stats.dailyAttempts) ? stats.dailyAttempts : 0,
    lastUpdatedAt: String(stats.lastUpdatedAt || ""),
  };
}

function normalizeCardStatsEntry(entry = {}) {
  return {
    correct: Number.isFinite(entry.correct) ? entry.correct : 0,
    attempts: Number.isFinite(entry.attempts) ? entry.attempts : 0,
    endedRun: Number.isFinite(entry.endedRun) ? entry.endedRun : 0,
    survivedRun: Number.isFinite(entry.survivedRun) ? entry.survivedRun : 0,
    nudgeStats: {
      up: Number.isFinite(entry.nudgeStats?.up)
        ? entry.nudgeStats.up
        : Number.isFinite(entry.nudgedUpCount)
          ? entry.nudgedUpCount
          : 0,
      down: Number.isFinite(entry.nudgeStats?.down)
        ? entry.nudgeStats.down
        : Number.isFinite(entry.nudgedDownCount)
          ? entry.nudgedDownCount
          : 0,
      blueFaceUpUses: Number.isFinite(entry.nudgeStats?.blueFaceUpUses)
        ? entry.nudgeStats.blueFaceUpUses
        : Number.isFinite(entry.blueFaceUpUses)
          ? entry.blueFaceUpUses
          : 0,
      blueNudgedUses: Number.isFinite(entry.nudgeStats?.blueNudgedUses)
        ? entry.nudgeStats.blueNudgedUses
        : Number.isFinite(entry.blueNudgedUses)
          ? entry.blueNudgedUses
          : 0,
      totalUpAmount: Number.isFinite(entry.nudgeStats?.totalUpAmount)
        ? entry.nudgeStats.totalUpAmount
        : Number.isFinite(entry.totalNudgeUpAmount)
          ? entry.totalNudgeUpAmount
          : 0,
      totalDownAmount: Number.isFinite(entry.nudgeStats?.totalDownAmount)
        ? entry.nudgeStats.totalDownAmount
        : Number.isFinite(entry.totalNudgeDownAmount)
          ? entry.totalNudgeDownAmount
          : 0,
    },
    guessStats: {
      base: normalizeGuessBucket(entry.guessStats?.base),
      nudgedUp: normalizeGuessBucket(entry.guessStats?.nudgedUp),
      nudgedDown: normalizeGuessBucket(entry.guessStats?.nudgedDown),
    },
    endedRunFaceUpBase: Number.isFinite(entry.endedRunFaceUpBase)
      ? entry.endedRunFaceUpBase
      : 0,
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
      if (String(seed || "").startsWith("DAILY|")) return;
      localStorage.setItem(RUN_SEED_KEY, seed);
    }

function loadMetaProgression() {
  const raw = localStorage.getItem(META_PROGRESSION_KEY);
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

function saveMetaProgression(value) {
  localStorage.setItem(META_PROGRESSION_KEY, String(value));
}


function loadSelectedDeck() {
  return normalizeDeckKey(localStorage.getItem(SELECTED_DECK_KEY) || "blue");
}

function saveSelectedDeck(deckKey) {
  localStorage.setItem(SELECTED_DECK_KEY, normalizeDeckKey(deckKey));
}

function loadDeckWins() {
  const raw = localStorage.getItem(DECK_WINS_KEY);
  if (!raw) return normalizeDeckWins();
  try {
    return normalizeDeckWins(JSON.parse(raw));
  } catch {
    return normalizeDeckWins();
  }
}

function saveDeckWins(wins) {
  localStorage.setItem(DECK_WINS_KEY, JSON.stringify(normalizeDeckWins(wins)));
}

function recordDeckWin(deckKey) {
  const normalizedDeckKey = normalizeDeckKey(deckKey);
  const wins = loadDeckWins();
  wins[normalizedDeckKey] = (wins[normalizedDeckKey] || 0) + 1;
  saveDeckWins(wins);
  return wins;
}

function getDeckWinCount(deckKey) {
  const wins = loadDeckWins();
  return wins[normalizeDeckKey(deckKey)] || 0;
}

function loadRedDeckDebugUnlock() {
  return sessionStorage.getItem(RED_DECK_DEBUG_UNLOCK_KEY) === "1";
}

function saveRedDeckDebugUnlock(enabled) {
  if (enabled) {
    sessionStorage.setItem(RED_DECK_DEBUG_UNLOCK_KEY, "1");
    return;
  }
  sessionStorage.removeItem(RED_DECK_DEBUG_UNLOCK_KEY);
}

function isRedDeckUnlocked() {
  return loadRedDeckDebugUnlock();
}

function loadProfileStats() {
  const raw = localStorage.getItem(PROFILE_STATS_KEY);
  if (!raw) return normalizeProfileStats();
  try {
    return normalizeProfileStats(JSON.parse(raw));
  } catch {
    return normalizeProfileStats();
  }
}

function saveProfileStats(stats) {
  const normalized = normalizeProfileStats({
    ...stats,
    lastUpdatedAt: new Date().toISOString(),
  });
  localStorage.setItem(PROFILE_STATS_KEY, JSON.stringify(normalized));
  return normalized;
}

function recordRunStarted(deckKey, runMode = "standard") {
  const stats = loadProfileStats();
  stats.runsStarted += 1;
  if (runMode === "daily") {
    stats.dailyRunsStarted += 1;
    stats.dailyAttempts += 1;
  } else {
    const normalizedDeckKey = normalizeDeckKey(deckKey);
    if (normalizedDeckKey === "red") {
      stats.redRunsStarted += 1;
    } else {
      stats.blueRunsStarted += 1;
    }
  }
  return saveProfileStats(stats);
}

function recordCorrectGuessProgress(amount = 1) {
  const stats = loadProfileStats();
  stats.totalCorrectGuesses += Math.max(0, Number(amount) || 0);
  return saveProfileStats(stats);
}

function recordDeckClearProgress(deckKey) {
  const stats = loadProfileStats();
  const normalizedDeckKey = normalizeDeckKey(deckKey);
  stats.totalDecksCleared += 1;
  stats.decksClearedByColor[normalizedDeckKey] = (stats.decksClearedByColor[normalizedDeckKey] || 0) + 1;
  return saveProfileStats(stats);
}

function loadCheatUnlocks() {
  const raw = localStorage.getItem(CHEAT_UNLOCKS_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveCheatUnlocks(unlocks) {
  localStorage.setItem(CHEAT_UNLOCKS_KEY, JSON.stringify(unlocks));
}
function loadLastRunSeed() {
      const seed = localStorage.getItem(RUN_SEED_KEY) || "";
      return seed.startsWith("DAILY|") ? "" : seed;
    }

function serializeGameStateSnapshot(sourceState) {
  if (!sourceState || typeof sourceState !== "object") return null;

  return {
    ...sourceState,
    seenCardIds: Array.from(sourceState.seenCardIds || []),
    cheats: (sourceState.cheats || []).map((cheat) => cheat?.id).filter(Boolean),
    pendingCheatOptions: (sourceState.pendingCheatOptions || []).map((cheat) => cheat?.id).filter(Boolean),
    pendingPowerOptions: (sourceState.pendingPowerOptions || []).map((power) => power?.id).filter(Boolean),
    savedAt: new Date().toISOString(),
  };
}

function saveGameStateSnapshot(sourceState) {
  const snapshot = serializeGameStateSnapshot(sourceState);
  if (!snapshot) return;
  sessionStorage.setItem(GAME_STATE_SNAPSHOT_KEY, JSON.stringify(snapshot));
}

function clearGameStateSnapshot() {
  sessionStorage.removeItem(GAME_STATE_SNAPSHOT_KEY);
}

function loadGameStateSnapshot() {
  const raw = sessionStorage.getItem(GAME_STATE_SNAPSHOT_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    const snapshot = {
      ...createEmptyState(),
      ...parsed,
      seenCardIds: new Set(Array.isArray(parsed.seenCardIds) ? parsed.seenCardIds : []),
      cheats: (parsed.cheats || []).map((id) => CHEATS.find((cheat) => cheat.id === id)).filter(Boolean).map((cheat) => ({ ...cheat })),
      pendingCheatOptions: (parsed.pendingCheatOptions || []).map((id) => CHEATS.find((cheat) => cheat.id === id)).filter(Boolean),
      pendingPowerOptions: (parsed.pendingPowerOptions || []).map((id) => getPowerById(id)).filter(Boolean),
    };

    return snapshot;
  } catch {
    return null;
  }
}

function saveSettingsReturnUrl(url) {
  sessionStorage.setItem(SETTINGS_RETURN_URL_KEY, String(url || ""));
}

function loadSettingsReturnUrl() {
  return String(sessionStorage.getItem(SETTINGS_RETURN_URL_KEY) || "");
}

function clearSettingsReturnUrl() {
  sessionStorage.removeItem(SETTINGS_RETURN_URL_KEY);
}

function resetDeckAlterations() {
  localStorage.removeItem(CARD_BACK_STATUS_KEY);

  const raw = sessionStorage.getItem(GAME_STATE_SNAPSHOT_KEY);
  if (raw) {
    try {
      const snapshot = JSON.parse(raw);
      if (snapshot && typeof snapshot === "object") {
        snapshot.cardBackStatuses = {};
        sessionStorage.setItem(GAME_STATE_SNAPSHOT_KEY, JSON.stringify(snapshot));
      }
    } catch {
      // Ignore malformed snapshots and leave current reset in place.
    }
  }
}

