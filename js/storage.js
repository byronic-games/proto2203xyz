function loadBestScore() {
      const raw = localStorage.getItem(BEST_SCORE_KEY);
      const value = Number(raw);
      return Number.isFinite(value) ? value : 0;
    }

function saveBestScore(score) {
      localStorage.setItem(BEST_SCORE_KEY, String(score));
    }

function normalizeGuessBucket(bucket = {}) {
  return {
    higher: Number.isFinite(bucket.higher) ? bucket.higher : 0,
    lower: Number.isFinite(bucket.lower) ? bucket.lower : 0,
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
      return localStorage.getItem(RUN_SEED_KEY) || "";
    }
