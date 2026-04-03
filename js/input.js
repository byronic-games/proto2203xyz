document.getElementById("higher-btn").onclick = () => makeGuess("higher");
document.getElementById("lower-btn").onclick = () => makeGuess("lower");

document.getElementById("restart-btn").onclick = () => {
  const runIsActive = !state.gameOver && !!state.current;

  if (state.runMode === "daily") {
    state.message = state.gameOver
      ? "Daily is complete. View the daily board for your result."
      : "Daily runs cannot be restarted.";
    render();
    return;
  }

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

function closeHowToModal() {
  const modal = document.getElementById("game-howto-modal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function openHowToModal() {
  const modal = document.getElementById("game-howto-modal");
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

document.getElementById("howto-open-btn")?.addEventListener("click", openHowToModal);
document.getElementById("howto-close-btn")?.addEventListener("click", closeHowToModal);
document.getElementById("howto-close-icon-btn")?.addEventListener("click", closeHowToModal);
document.getElementById("howto-close-backdrop")?.addEventListener("click", closeHowToModal);

document.getElementById("settings-btn")?.addEventListener("click", () => {
  saveGameStateSnapshot(state);
  saveSettingsReturnUrl(`game.html?resume=1`);
  window.location.href = "settings.html";
});

document.getElementById("nudge-up-btn")?.addEventListener("click", () => {
  useNudgeCharge("up");
});

document.getElementById("nudge-down-btn")?.addEventListener("click", () => {
  useNudgeCharge("down");
});

const scoreEl = document.getElementById("score");
const scoreDebugTapTarget = document.querySelector(".hud-card-score");
let debugScoreTapCount = 0;
let debugScoreTapWindowTimer = null;

function resetDebugScoreTapSequence() {
  debugScoreTapCount = 0;
  if (debugScoreTapWindowTimer) {
    clearTimeout(debugScoreTapWindowTimer);
    debugScoreTapWindowTimer = null;
  }
}

function handleDebugScoreTap() {
  if (!window.testModeEnabled) return;
  if (state.runMode === "daily") return;

  debugScoreTapCount += 1;

  if (debugScoreTapWindowTimer) {
    clearTimeout(debugScoreTapWindowTimer);
  }

  debugScoreTapWindowTimer = setTimeout(() => {
    resetDebugScoreTapSequence();
  }, 2200);

  if (debugScoreTapCount >= 10) {
    resetDebugScoreTapSequence();
    addMissingCheatsForDebug();
    return;
  }

  state.message = ` Debug: tap score ${debugScoreTapCount}/10 to add all cheats.`;
  renderMessage();
}

scoreDebugTapTarget?.addEventListener("pointerup", handleDebugScoreTap);
scoreEl?.addEventListener("click", (e) => {
  e.stopPropagation();
  handleDebugScoreTap();
});

function closeVictoryModal() {
  const modal = document.getElementById("victory-modal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

async function openVictoryModal() {
  const modal = document.getElementById("victory-modal");
  const seedEl = document.getElementById("victory-seed");
  const statusEl = document.getElementById("victory-status");
  const inputEl = document.getElementById("victory-name-input");

  if (!modal || !seedEl || !statusEl || !inputEl) return;

  const preferredName = loadPreferredHeroName();
  if (preferredName && state.runMode !== "daily") {
    const result = await submitHeroWin(
      preferredName,
      `${GAME_VERSION}-${state.runSeed || ""}`,
      getVictoryDeckLabel(),
      getVictoryStartingPowerName()
    );
    state.message = `🏆 ${result.message}`;
    renderMessage();
    return;
  }

  seedEl.innerText = `Seed: ${GAME_VERSION}-${state.runSeed || ""}`;
  statusEl.innerText = "";
  inputEl.value = preferredName;

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  setTimeout(() => inputEl.focus(), 0);
}

window.promptHeroNameForVictory = openVictoryModal;

function getVictoryDeckLabel() {
  return getDeckName(state.currentDeckKey);
}

function getVictoryStartingPowerName() {
  return state.selectedStartPowerId ? getPowerName(state.selectedStartPowerId) : "No Power";
}

document.getElementById("victory-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const inputEl = document.getElementById("victory-name-input");
  const statusEl = document.getElementById("victory-status");
  const submitBtn = document.getElementById("victory-submit-btn");

  if (!inputEl || !statusEl || !submitBtn) return;

  submitBtn.disabled = true;
  const result = await submitHeroWin(
    inputEl.value,
    `${GAME_VERSION}-${state.runSeed || ""}`,
    getVictoryDeckLabel(),
    getVictoryStartingPowerName()
  );
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

function closeAllTransientTooltips() {
  if (typeof window.hideCheatTooltip === "function") {
    window.hideCheatTooltip();
  }
}

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

window.addEventListener("keydown", (e) => {
  const debugEnabled = !!window.testModeEnabled;
  const matchesKey = (key, code) => e.key === key || e.key === key.toUpperCase() || e.code === code;
  if (debugEnabled) {
    if (matchesKey("c", "KeyC")) {
      clearCheatsForDebug();
      return;
    }

    if (matchesKey("f", "KeyF") && !e.shiftKey) {
      resetAllStatsForDebug();
      return;
    }

    if (matchesKey("f", "KeyF") && e.shiftKey) {
      fullResetAllStateForDebug();
      return;
    }

    if (matchesKey("d", "KeyD")) {
      addMissingCheatsForDebug();
      return;
    }

    if (matchesKey("n", "KeyN")) {
      addBulkNudgesForDebug();
      return;
    }
  }

  if (e.key === "Escape") {
    closeHowToModal();
  }

  if (state.gameOver || state.pendingCheatOptions.length > 0 || state.pendingPowerOptions.length > 0) return;

  if (e.key === "ArrowUp") makeGuess("higher");
  if (e.key === "ArrowDown") makeGuess("lower");
});
