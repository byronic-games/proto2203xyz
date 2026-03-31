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
      console.assert(normalizedStats.guessStats.base.higher === 0, "Legacy stat entries should gain base guess stats.");
      console.assert(normalizedStats.guessStats.nudgedUp.lower === 0, "Legacy stat entries should gain nudged-up guess stats.");
      console.assert(normalizedStats.guessStats.nudgedDown.higher === 0, "Legacy stat entries should gain nudged-down guess stats.");
      console.assert(normalizedStats.endedRunFaceUpBase === 0, "Legacy stat entries should gain endedRunFaceUpBase field.");
    }

function getTestModeFlags() {
  const params = new URLSearchParams(window.location.search);
  const has = (key) => params.has(key);

  return {
    enabled: has("test") || has("debug"),
    addCheats: has("addcheats"),
    clearCheats: has("clearcheats"),
    resetStats: has("resetstats"),
    fullReset: has("fullreset"),
  };
}

function applyDebugActionsFromUrl() {
  const flags = getTestModeFlags();
  window.testModeEnabled = flags.enabled;

  if (!flags.enabled) return;

  // Precedence: destructive reset first, then narrower actions.
  if (flags.fullReset) {
    fullResetAllStateForDebug();
    return;
  }

  if (flags.resetStats) {
    resetAllStatsForDebug();
  }

  if (flags.clearCheats) {
    clearCheatsForDebug();
  }

  if (flags.addCheats) {
    addMissingCheatsForDebug();
  }

  if (!flags.resetStats && !flags.clearCheats && !flags.addCheats) {
    state.message = "Test mode enabled.";
  }
}

runSelfTests();
applyDebugActionsFromUrl();
render();
