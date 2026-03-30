document.getElementById("higher-btn").onclick = () => makeGuess("higher");
document.getElementById("lower-btn").onclick = () => makeGuess("lower");

document.getElementById("restart-btn").onclick = () => {
  const runIsActive = !state.gameOver && !!state.current;

  if (!runIsActive) {
    startRun(true);
    return;
  }

  if (!state.restartConfirmArmed) {
    state.restartConfirmArmed = true;
    state.message = "Click Start Run again to confirm restart.";
    render();
    return;
  }

  startRun(true);
};

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

function closeDeckStatsTooltip() {
  if (!state.deckStatsTooltipOpen) return;
  state.deckStatsTooltipOpen = false;
  renderFaceDownDeck();
}

let ignoreNextDeckClick = false;

document.getElementById("face-down-deck")?.addEventListener("pointerdown", (e) => {
  if (e.pointerType !== "touch") return;
  if (!runHasPower("stats_display")) return;
  if (!peekNext()) return;

  state.deckStatsTooltipOpen = true;
  renderFaceDownDeck();
  ignoreNextDeckClick = true;
});

document.getElementById("face-down-deck")?.addEventListener("click", () => {
  if (ignoreNextDeckClick) {
    ignoreNextDeckClick = false;
    return;
  }

  if (!runHasPower("stats_display")) return;
  if (!peekNext()) return;

  state.deckStatsTooltipOpen = !state.deckStatsTooltipOpen;
  renderFaceDownDeck();
});

window.addEventListener("pointerup", (e) => {
  if (e.pointerType !== "touch") return;
  closeDeckStatsTooltip();
});

window.addEventListener("pointercancel", (e) => {
  if (e.pointerType !== "touch") return;
  closeDeckStatsTooltip();
});

window.addEventListener("touchend", () => {
  closeDeckStatsTooltip();
});

window.addEventListener("touchcancel", () => {
  closeDeckStatsTooltip();
});

window.addEventListener(
  "pointerdown",
  (e) => {
    if (!state.deckStatsTooltipOpen) return;

    const tooltip = document.querySelector("[data-deck-stats-tooltip='true']");
    const deckEl = document.getElementById("face-down-deck");
    const target = e.target;

    if (!(target instanceof Element)) return;
    if (tooltip?.contains(target) || deckEl?.contains(target)) return;

    closeDeckStatsTooltip();
  },
  true
);

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
