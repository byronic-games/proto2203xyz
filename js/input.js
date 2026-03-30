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

function closeVictoryModal() {
  const modal = document.getElementById("victory-modal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

async function openVictoryModal() {
  const modal = document.getElementById("victory-modal");
  const seedEl = document.getElementById("victory-seed");
  const statusEl = document.getElementById("victory-status");
  const inputEl = document.getElementById("victory-name-input");

  if (!modal || !seedEl || !statusEl || !inputEl) return;

  seedEl.innerText = `Seed: ${GAME_VERSION}-${state.runSeed || ""}`;
  statusEl.innerText = "";
  inputEl.value = loadPreferredHeroName();

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");

  setTimeout(() => inputEl.focus(), 0);
}

window.promptHeroNameForVictory = openVictoryModal;

document.getElementById("victory-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const inputEl = document.getElementById("victory-name-input");
  const statusEl = document.getElementById("victory-status");
  const submitBtn = document.getElementById("victory-submit-btn");

  if (!inputEl || !statusEl || !submitBtn) return;

  submitBtn.disabled = true;
  const result = await submitHeroWin(inputEl.value, `${GAME_VERSION}-${state.runSeed || ""}`);
  statusEl.innerText = result.message;

  if (result.ok) {
    state.message = `🏆 ${result.message}`;
    renderMessage();
    setTimeout(() => closeVictoryModal(), 700);
  }

  submitBtn.disabled = false;
});

document.getElementById("victory-skip-btn")?.addEventListener("click", () => {
  closeVictoryModal();
});

document.getElementById("victory-modal")?.addEventListener("click", (e) => {
  if (e.target && e.target.classList && e.target.classList.contains("victory-backdrop")) {
    closeVictoryModal();
  }
});

function closeDeckStatsTooltip() {
  if (!state.deckStatsTooltipOpen) return;
  state.deckStatsTooltipOpen = false;
  renderFaceDownDeck();
}

function closeAllTransientTooltips() {
  closeDeckStatsTooltip();
  if (typeof window.hideCheatTooltip === "function") {
    window.hideCheatTooltip();
  }
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
  closeAllTransientTooltips();
});

window.addEventListener("pointercancel", (e) => {
  if (e.pointerType !== "touch") return;
  closeAllTransientTooltips();
});

window.addEventListener("touchend", () => {
  closeAllTransientTooltips();
});

window.addEventListener("touchcancel", () => {
  closeAllTransientTooltips();
});

window.addEventListener("touchmove", () => {
  closeAllTransientTooltips();
}, { passive: true });

window.addEventListener("scroll", () => {
  closeAllTransientTooltips();
}, true);

window.addEventListener("wheel", () => {
  closeAllTransientTooltips();
}, { passive: true });

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
  const debugEnabled = !!window.testModeEnabled;
  if (debugEnabled) {
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
  }

  if (state.gameOver || state.pendingCheatOptions.length > 0) return;

  if (e.key === "ArrowUp") makeGuess("higher");
  if (e.key === "ArrowDown") makeGuess("lower");
});
