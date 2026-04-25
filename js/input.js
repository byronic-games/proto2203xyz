function handleGuessButtonPress(type) {
  if (window.tutorialController?.isBlockingGuess?.(type) === true) return;

  const before = {
    index: Number(state.index) || 0,
    correctAnswers: Number(state.correctAnswers) || 0,
    gameOver: !!state.gameOver,
  };

  makeGuess(type);

  const after = {
    index: Number(state.index) || 0,
    correctAnswers: Number(state.correctAnswers) || 0,
    gameOver: !!state.gameOver,
  };

  if (typeof window.handleTutorialGuessResolved === "function") {
    window.handleTutorialGuessResolved(type, before, after);
  }
}

document.getElementById("higher-btn").onclick = () => handleGuessButtonPress("higher");
document.getElementById("lower-btn").onclick = () => handleGuessButtonPress("lower");

function createTutorialController() {
  const overlay = document.getElementById("tutorial-overlay");
  const highlight = document.getElementById("tutorial-highlight");
  const title = document.getElementById("tutorial-title");
  const copy = document.getElementById("tutorial-copy");
  const progress = document.getElementById("tutorial-progress");
  const nextBtn = document.getElementById("tutorial-next-btn");
  const skipBtn = document.getElementById("tutorial-skip-btn");

  const profileStats = loadProfileStats();
  const shouldRunByProgress = Number(profileStats.runsStarted || 0) <= 1;
  const completed = localStorage.getItem(TUTORIAL_COMPLETED_KEY) === "1";
  const forcedReplay = sessionStorage.getItem(TUTORIAL_FORCE_REPLAY_KEY) === "1";

  const steps = [
    {
      target: "#current-card",
      title: "Current Card",
      copy: "This is your live card. You compare the next face-down card against this value.",
    },
    {
      target: "#face-down-deck",
      title: "Next Card",
      copy: "This is the unknown card. Your Higher / Lower guess is about this card.",
    },
    {
      target: "#controls",
      title: "Make A Guess",
      copy: "Tap Higher or Lower now to continue the tutorial.",
      requireGuess: true,
    },
    {
      target: ".nudge-stack",
      title: "Nudges",
      copy: "Nudges can shift the judged value before your next guess. Save them for tricky spots.",
    },
    {
      target: "#cheats-panel",
      title: "Cheats",
      copy: "Cheats appear as rewards during a run. Hold a cheat to read what it does.",
    },
  ];

  if (!overlay || !highlight || !title || !copy || !progress || !nextBtn || !skipBtn || (!forcedReplay && (!shouldRunByProgress || completed))) {
    return {
      maybeStart() {},
      isBlockingGuess() { return false; },
      handleGuessResolved() {},
      closeAndComplete() {},
    };
  }

  let active = false;
  let stepIndex = 0;
  let focusedTarget = null;

  function clearFocusTarget() {
    if (!focusedTarget) return;
    focusedTarget.classList.remove("tutorial-focus-target");
    focusedTarget = null;
  }

  function setFocusTarget(step) {
    clearFocusTarget();
    const target = step?.target ? document.querySelector(step.target) : null;
    if (!target) {
      highlight.style.display = "none";
      return;
    }
    focusedTarget = target;
    target.classList.add("tutorial-focus-target");
    highlight.style.display = "block";

    const rect = target.getBoundingClientRect();
    const pad = 8;
    highlight.style.top = `${Math.max(6, rect.top - pad)}px`;
    highlight.style.left = `${Math.max(6, rect.left - pad)}px`;
    highlight.style.width = `${Math.min(window.innerWidth - 12, rect.width + pad * 2)}px`;
    highlight.style.height = `${Math.min(window.innerHeight - 12, rect.height + pad * 2)}px`;
  }

  function setTutorialCompleted() {
    localStorage.setItem(TUTORIAL_COMPLETED_KEY, "1");
  }

  function closeAndComplete() {
    if (!active) return;
    active = false;
    clearFocusTarget();
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
    highlight.style.display = "none";
    document.body.classList.remove("modal-open");
    setTutorialCompleted();
  }

  function renderStep() {
    if (!active) return;
    const step = steps[stepIndex];
    if (!step) {
      closeAndComplete();
      return;
    }
    progress.innerText = `Step ${stepIndex + 1} / ${steps.length}`;
    title.innerText = step.title;
    copy.innerText = step.copy;
    nextBtn.innerText = step.requireGuess ? "Waiting For Guess..." : (stepIndex === steps.length - 1 ? "Finish" : "Next");
    nextBtn.disabled = !!step.requireGuess;
    setFocusTarget(step);
  }

  function nextStep() {
    if (!active) return;
    stepIndex += 1;
    if (stepIndex >= steps.length) {
      closeAndComplete();
      return;
    }
    renderStep();
  }

  function maybeStart() {
    if (active || state.runMode === "daily" || state.gameOver || !state.current) return;
    if (forcedReplay) {
      sessionStorage.removeItem(TUTORIAL_FORCE_REPLAY_KEY);
    }
    active = true;
    stepIndex = 0;
    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    renderStep();
  }

  function isBlockingGuess(type) {
    if (!active) return false;
    const step = steps[stepIndex];
    if (!step?.requireGuess) return true;
    return type !== "higher" && type !== "lower";
  }

  function handleGuessResolved(type, before, after) {
    if (!active) return;
    const step = steps[stepIndex];
    if (!step?.requireGuess) return;
    const resolved =
      after.index !== before.index ||
      after.correctAnswers !== before.correctAnswers ||
      after.gameOver !== before.gameOver;
    if (!resolved) return;

    state.message = `Nice. You picked ${type.toUpperCase()} and resolved a card.`;
    nextStep();
    render();
  }

  nextBtn.addEventListener("click", () => {
    if (!active) return;
    const step = steps[stepIndex];
    if (step?.requireGuess) return;
    nextStep();
  });

  skipBtn.addEventListener("click", closeAndComplete);
  window.addEventListener("resize", () => {
    if (!active) return;
    renderStep();
  });
  window.addEventListener("scroll", () => {
    if (!active) return;
    renderStep();
  }, { passive: true });

  return {
    maybeStart,
    isBlockingGuess,
    handleGuessResolved,
    closeAndComplete,
  };
}

window.tutorialController = createTutorialController();
window.maybeStartFirstRunTutorial = () => window.tutorialController?.maybeStart?.();
window.handleTutorialGuessResolved = (type, before, after) =>
  window.tutorialController?.handleGuessResolved?.(type, before, after);

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
  window.location.href = "settings.html?v=20260405h";
});

document.getElementById("exit-btn")?.addEventListener("click", () => {
  window.skipAutoSnapshot = true;
  clearGameStateSnapshot();
  window.location.href = "index.html?v=20260405d";
});

document.getElementById("nudge-up-btn")?.addEventListener("click", () => {
  useNudgeCharge("up");
});

document.getElementById("nudge-down-btn")?.addEventListener("click", () => {
  useNudgeCharge("down");
});

const scoreEl = document.getElementById("score");
const scoreDebugTapTarget = document.querySelector(".hud-card-score");
const remainingDebugTapTarget = document.querySelector(".hud-card-remaining");
let debugScoreTapCount = 0;
let debugScoreTapWindowTimer = null;
let debugRemainingTapCount = 0;
let debugRemainingTapWindowTimer = null;

function resetDebugScoreTapSequence() {
  debugScoreTapCount = 0;
  if (debugScoreTapWindowTimer) {
    clearTimeout(debugScoreTapWindowTimer);
    debugScoreTapWindowTimer = null;
  }
}

function resetDebugRemainingTapSequence() {
  debugRemainingTapCount = 0;
  if (debugRemainingTapWindowTimer) {
    clearTimeout(debugRemainingTapWindowTimer);
    debugRemainingTapWindowTimer = null;
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

function handleDebugRemainingTap() {
  if (!window.testModeEnabled) return;

  debugRemainingTapCount += 1;

  if (debugRemainingTapWindowTimer) {
    clearTimeout(debugRemainingTapWindowTimer);
  }

  debugRemainingTapWindowTimer = setTimeout(() => {
    resetDebugRemainingTapSequence();
  }, 2200);

  if (debugRemainingTapCount >= 10) {
    resetDebugRemainingTapSequence();
    triggerVictoryEffect();
    state.message = " Debug: victory celebration triggered.";
    renderMessage();
    return;
  }

  state.message = ` Debug: tap cards remaining ${debugRemainingTapCount}/10 for victory celebration.`;
  renderMessage();
}

scoreDebugTapTarget?.addEventListener("pointerup", handleDebugScoreTap);
scoreEl?.addEventListener("click", (e) => {
  e.stopPropagation();
  handleDebugScoreTap();
});
remainingDebugTapTarget?.addEventListener("pointerup", handleDebugRemainingTap);

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
      getVictoryStartingPowerName(),
      getVictoryDeckLevel()
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

function getVictoryDeckLevel() {
  return normalizeLevelNumber(state.currentLevelNumber || state.selectedLevelNumber || DEFAULT_LEVEL_NUMBER);
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
    getVictoryStartingPowerName(),
    getVictoryDeckLevel()
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

window.addEventListener("pagehide", () => {
  if (window.skipAutoSnapshot) return;
  saveGameStateSnapshot(state);
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
      if (state.pendingPowerOptions.length > 0) {
        state.pendingPowerOptions = getUnlockedPowerPool(true);
        state.powerChoiceLockedUntil = 0;
        state.message = " Debug: showing all power choices.";
        render();
        return;
      }
      addMissingCheatsForDebug();
      return;
    }

    if (matchesKey("n", "KeyN")) {
      addBulkNudgesForDebug();
      return;
    }

    if (matchesKey("w", "KeyW")) {
      triggerVictoryEffect();
      state.message = " Debug: victory celebration triggered.";
      renderMessage();
      return;
    }

    if (matchesKey("l", "KeyL")) {
      const exportedLog = typeof window.exportRunDebugLog === "function"
        ? window.exportRunDebugLog()
        : "[]";

      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(exportedLog).then(() => {
          state.message = " Debug: run log copied to clipboard.";
          renderMessage();
        }).catch(() => {
          console.log(exportedLog);
          state.message = " Debug: run log written to console.";
          renderMessage();
        });
      } else {
        console.log(exportedLog);
        state.message = " Debug: run log written to console.";
        renderMessage();
      }
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
