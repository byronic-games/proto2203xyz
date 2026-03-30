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
