document.getElementById("higher-btn").onclick = () => makeGuess("higher");
document.getElementById("lower-btn").onclick = () => makeGuess("lower");

document.getElementById("restart-btn").onclick = () => startRun(true);

document.getElementById("run-seed-input")?.addEventListener("blur", (e) => {
  e.target.value = normalizeSeed(e.target.value);
});

document.getElementById("random-seed-btn")?.addEventListener("click", () => {
  startRun(false);
});

document.getElementById("copy-seed-btn")?.addEventListener("click", async () => {
  const seedToCopy = state.runSeed ? `${GAME_VERSION}-${state.runSeed}` : "";
  if (!seedToCopy) return;

  try {
    await navigator.clipboard.writeText(seedToCopy);
    state.message = `Copied ${seedToCopy}`;
  } catch {
    state.message = `Seed: ${seedToCopy}`;
  }

  renderMessage();
});

window.addEventListener("keydown", (e) => {
  if (e.key === "c" || e.key === "C") {
    clearCheatsForDebug();
    return;
  }

  if ((e.key === "f" || e.key === "F") && !e.shiftKey) {
    resetAllStatsForDebug();
    return;
  }

  if ((e.key === "f" || e.key === "F") && e.shiftKey) {
    fullResetAllStateForDebug();
    return;
  }

  if (e.key === "d" || e.key === "D") {
    addMissingCheatsForDebug();
    return;
  }

  if (state.gameOver || state.pendingCheatOptions.length > 0) return;

  if (e.key === "ArrowUp") makeGuess("higher");
  if (e.key === "ArrowDown") makeGuess("lower");
});
