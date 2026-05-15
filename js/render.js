function getDeckBackColor(deckKey) {
  const normalizedDeck = normalizeDeckKey(deckKey || "blue");
  if (normalizedDeck === "red") return "pink";
  if (normalizedDeck === "green") return "green";
  if (normalizedDeck === "yellow") return "yellow";
  return "blue";
}

let revealAnimationResetTimer = null;
let revealGameOverTimer = null;
let cheatChoiceAnimationTimer = null;
let powerChoiceAnimationTimer = null;
let suppressNextCheatEntryIntroId = "";
let lastRenderedCheatCounts = new Map();
let cheatChoiceConfirmIndex = -1;
let cheatChoiceConfirmAfter = 0;
let cheatUseLockedUntil = 0;
const CHEAT_CHOICE_CLOSE_MS = 140;
const CHEAT_CHOICE_FLY_MS = 300;
const POWER_CHOICE_CLOSE_MS = 180;
const POWER_CHOICE_FLY_MS = 320;
const CHEAT_CHOICE_CONFIRM_BUFFER_MS = 450;
const CHEAT_USE_BUFFER_MS = 420;
const REVEAL_FLIP_MS = 420;
const REVEAL_HOLD_MS = 160;
const REVEAL_SLIDE_MS = 400;
const REVEAL_FAILURE_HOLD_MS = 180;
const POWER_SHIELD_SVG = `
  <svg class="power-shield-svg" viewBox="0 0 100 128" aria-hidden="true" focusable="false">
    <path class="power-shield-fill" d="M50 121 C24 110 10 82 9 41 L9 18 C31 13 69 13 91 18 L91 41 C90 82 76 110 50 121 Z"></path>
  </svg>
`;

function clearPendingRevealTimers() {
  if (revealAnimationResetTimer) {
    clearTimeout(revealAnimationResetTimer);
    revealAnimationResetTimer = null;
  }
  if (revealGameOverTimer) {
    clearTimeout(revealGameOverTimer);
    revealGameOverTimer = null;
  }
}

function clearPendingCheatChoiceTimer() {
  if (cheatChoiceAnimationTimer) {
    clearTimeout(cheatChoiceAnimationTimer);
    cheatChoiceAnimationTimer = null;
  }
}

function clearPendingPowerChoiceTimer() {
  if (powerChoiceAnimationTimer) {
    clearTimeout(powerChoiceAnimationTimer);
    powerChoiceAnimationTimer = null;
  }
}

function canUseHoverTooltips() {
  return window.matchMedia?.("(hover: hover) and (pointer: fine)")?.matches === true;
}

function sanitizeRevealEffectId(effectId) {
  return String(effectId || "").toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

function getRevealEffectClass(effectId) {
  const safeId = sanitizeRevealEffectId(effectId);
  return safeId ? `reveal-effect-${safeId}` : "";
}

function removeRevealStateClasses(el) {
  if (!el) return;
  const effectClasses = Array.from(el.classList).filter((name) => name.startsWith("reveal-effect-"));
  if (effectClasses.length) {
    el.classList.remove(...effectClasses);
  }
  el.classList.remove(
    "reveal-flip",
    "reveal-flip-out",
    "reveal-flip-in",
    "reveal-flip-180",
    "reveal-promote",
    "reveal-settle",
    "reveal-fail",
    "reveal-slide-over"
  );
  el.style.removeProperty("--reveal-slide-x");
  el.style.removeProperty("--reveal-slide-y");
}

function getPreservedTutorialFocusClass(el) {
  return el?.classList?.contains("tutorial-focus-target") ? " tutorial-focus-target" : "";
}

function setRevealOverlayHidden(hidden) {
  const overlayEl = document.getElementById("reveal-overlay");
  if (!overlayEl) return;
  overlayEl.classList.toggle("hidden", !!hidden);
  overlayEl.setAttribute("aria-hidden", hidden ? "true" : "false");
  if (hidden) {
    overlayEl.innerHTML = "";
  }
}

function renderRevealOverlayCard(pending, showFace) {
  const overlayEl = document.getElementById("reveal-overlay");
  if (!overlayEl || !pending?.revealCard) return null;

  const revealCard = pending.revealCard;
  const revealStatus = getCardBackStatus(revealCard.id);
  const revealValue = Number.isFinite(pending.revealEffectiveValue)
    ? pending.revealEffectiveValue
    : revealCard.value;
  const revealIsTemp = !!pending.revealIsTemp;
  const revealBackColor = getDeckBackColor(state.currentDeckKey || state.selectedDeckKey);

  overlayEl.innerHTML = "";
  if (showFace) {
    overlayEl.className = `reveal-overlay card-face ${isJokerCard(revealCard) ? "joker-card-face" : (isRed(revealCard) ? "red" : "black")} ${revealStatus.tornCorner ? "torn-corner-face" : ""} ${revealIsTemp ? "temporary-value" : ""}`.trim();
    overlayEl.innerHTML = renderCardFaceMarkup(
      revealCard,
      revealValue,
      revealIsTemp,
      revealStatus.tornCorner
    );
  } else {
    overlayEl.className = `reveal-overlay card-back card-back-${revealBackColor} ${revealStatus.tornCorner ? "torn-corner" : ""}`.trim();
    overlayEl.innerHTML = `<div class="card-back-symbol">&#127136;</div>`;
    if (revealStatus.tornCorner) {
      const tear = document.createElement("div");
      tear.className = "tear-mark";
      overlayEl.appendChild(tear);
    }
  }

  overlayEl.classList.remove("hidden");
  overlayEl.setAttribute("aria-hidden", "false");
  return overlayEl;
}

function finalizePendingReveal(pending) {
  const currentCardEl = document.getElementById("current-card");
  const faceDownDeckEl = document.getElementById("face-down-deck");
  const overlayEl = document.getElementById("reveal-overlay");
  removeRevealStateClasses(currentCardEl);
  removeRevealStateClasses(faceDownDeckEl);
  removeRevealStateClasses(overlayEl);
  setRevealOverlayHidden(true);

  if (pending.triggerGameOver && state.gameOver) {
    state.gameOverDisplayCards = {
      leftCard: pending.fromCard || null,
      leftEffectiveValue: Number.isFinite(pending.fromEffectiveValue) ? pending.fromEffectiveValue : pending.fromCard?.value ?? null,
      leftIsTemp: !!pending.fromIsTemp,
      rightCard: pending.revealCard || null,
      rightEffectiveValue: Number.isFinite(pending.revealEffectiveValue) ? pending.revealEffectiveValue : pending.revealCard?.value ?? null,
      rightIsTemp: !!pending.revealIsTemp,
    };
  } else {
    state.gameOverDisplayCards = null;
    const feedbackEffect = pending.feedbackEffect || pending.outcome;
    if (feedbackEffect === "correct" || feedbackEffect === "wrong") {
      if (typeof setCurrentCardFeedback === "function") setCurrentCardFeedback(feedbackEffect);
      if (feedbackEffect === "wrong" && typeof flashGameShell === "function") {
        flashGameShell(feedbackEffect);
      }
    }
  }

  if (state.pendingRevealAnimation && state.pendingRevealAnimation.id === pending.id) {
    state.pendingRevealAnimation = null;
  }

  if (pending.triggerGameOver && state.gameOver) {
    clearGameOverEffects();
    revealGameOverTimer = setTimeout(() => {
      triggerGameOverEffect("");
      revealGameOverTimer = null;
    }, 40);
  }

  render();
}

function setRevealSlideOffset(revealingDeckEl, currentCardEl) {
  if (!revealingDeckEl || !currentCardEl) return;

  const revealRect = revealingDeckEl.getBoundingClientRect();
  const currentRect = currentCardEl.getBoundingClientRect();
  const deltaX = currentRect.left - revealRect.left;
  const deltaY = currentRect.top - revealRect.top;

  revealingDeckEl.style.setProperty("--reveal-slide-x", `${Math.round(deltaX)}px`);
  revealingDeckEl.style.setProperty("--reveal-slide-y", `${Math.round(deltaY)}px`);
}

function playPendingCardRevealAnimation() {
  const pending = state.pendingRevealAnimation;
  if (!pending) return;

  const currentCardEl = document.getElementById("current-card");
  const faceDownDeckEl = document.getElementById("face-down-deck");
  const overlayEl = document.getElementById("reveal-overlay");
  if (!currentCardEl || !faceDownDeckEl || !overlayEl) return;
  const effectClass = getRevealEffectClass(pending.effectId);

  if (pending.phase === "revealing") {
    if (pending.started) return;

    pending.started = true;
    pending.revealSwapDone = false;
    clearPendingRevealTimers();
    clearGameOverEffects();
    removeRevealStateClasses(currentCardEl);
    removeRevealStateClasses(faceDownDeckEl);
    removeRevealStateClasses(overlayEl);
    const halfFlipMs = Math.max(1, Math.floor(REVEAL_FLIP_MS / 2));
    const revealingOverlayEl = renderRevealOverlayCard(pending, false);
    if (!revealingOverlayEl) return;
    revealingOverlayEl.style.animation = "none";
    void revealingOverlayEl.offsetWidth;
    revealingOverlayEl.style.animation = "";
    revealingOverlayEl.classList.add("reveal-flip-out");
    if (effectClass) revealingOverlayEl.classList.add(effectClass);

    revealAnimationResetTimer = setTimeout(() => {
      revealAnimationResetTimer = null;
      if (!state.pendingRevealAnimation || state.pendingRevealAnimation.id !== pending.id) return;
      state.pendingRevealAnimation.revealSwapDone = true;
      const flipInOverlayEl = renderRevealOverlayCard(pending, true);
      if (flipInOverlayEl) {
        removeRevealStateClasses(flipInOverlayEl);
        flipInOverlayEl.style.animation = "none";
        void flipInOverlayEl.offsetWidth;
        flipInOverlayEl.style.animation = "";
        flipInOverlayEl.classList.add("reveal-flip-in");
        if (effectClass) flipInOverlayEl.classList.add(effectClass);
      }

      revealAnimationResetTimer = setTimeout(() => {
        revealAnimationResetTimer = null;
        if (!state.pendingRevealAnimation || state.pendingRevealAnimation.id !== pending.id) return;
        state.pendingRevealAnimation.phase = pending.outcome === "correct" ? "sliding" : "finishing";
        state.pendingRevealAnimation.started = false;
        render();
      }, halfFlipMs + REVEAL_HOLD_MS);
    }, halfFlipMs);
    return;
  }

  if (pending.phase === "sliding") {
    if (pending.started) return;

    pending.started = true;
    clearPendingRevealTimers();
    removeRevealStateClasses(overlayEl);
    const slidingDeckEl = renderRevealOverlayCard(pending, true);
    const slidingCurrentEl = document.getElementById("current-card");
    if (!slidingDeckEl || !slidingCurrentEl) return;
    setRevealSlideOffset(slidingDeckEl, slidingCurrentEl);
    slidingDeckEl.style.animation = "none";
    void slidingDeckEl.offsetWidth;
    slidingDeckEl.style.animation = "";
    slidingDeckEl.classList.add("reveal-slide-over");
    if (effectClass) slidingDeckEl.classList.add(effectClass);

    revealAnimationResetTimer = setTimeout(() => {
      revealAnimationResetTimer = null;
      if (!state.pendingRevealAnimation || state.pendingRevealAnimation.id !== pending.id) return;
      finalizePendingReveal(pending);
    }, REVEAL_SLIDE_MS + 30);
    return;
  }

  if (pending.phase !== "finishing" || pending.started) return;

  pending.started = true;
  clearPendingRevealTimers();
  removeRevealStateClasses(overlayEl);
  const finishingOverlayEl = renderRevealOverlayCard(pending, true);
  if (effectClass) {
    finishingOverlayEl?.classList.add(effectClass);
  }

  revealAnimationResetTimer = setTimeout(() => {
    revealAnimationResetTimer = null;
    if (!state.pendingRevealAnimation || state.pendingRevealAnimation.id !== pending.id) return;
    finalizePendingReveal(pending);
  }, REVEAL_FAILURE_HOLD_MS);
}

function renderScores() {
  const scoreEl = document.getElementById("score");
  const bestScoreEl = document.getElementById("best-score");
  const jokerCountEl = document.getElementById("joker-count");
  const energyCardEl = document.getElementById("header-energy-metric");
  const energyValueEl = document.getElementById("energy-value");
  const hudDeckKey = state.gameOver
    ? normalizeDeckKey(state.selectedDeckKey || loadSelectedDeck())
    : normalizeDeckKey(state.currentDeckKey || state.selectedDeckKey || loadSelectedDeck());
  const bestDeckKey = state.gameOver
    ? normalizeDeckKey(state.selectedDeckKey || loadSelectedDeck())
    : normalizeDeckKey(state.currentDeckKey || state.selectedDeckKey || loadSelectedDeck());
  const bestLevelNumber = state.gameOver
    ? normalizeLevelNumber(state.selectedLevelNumber || loadSelectedLevel())
    : normalizeLevelNumber(state.currentLevelNumber || state.selectedLevelNumber || loadSelectedLevel());

  state.bestScore = loadBestScore(bestDeckKey, bestLevelNumber);
  if (scoreEl) setAnimatedText(scoreEl, getDisplayedRunScore());
  if (bestScoreEl) setAnimatedText(bestScoreEl, `BEST: ${state.bestScore}`);
  if (jokerCountEl) {
    const showJokerCount = hudDeckKey === "yellow";
    const remainingJokers = showJokerCount && typeof getRemainingJokerCount === "function"
      ? getRemainingJokerCount()
      : 0;
    setAnimatedText(jokerCountEl, showJokerCount ? `JOKERS: ${remainingJokers}` : "");
    jokerCountEl.setAttribute("aria-hidden", showJokerCount ? "false" : "true");
  }
  {
    const showEnergy = !state.gameOver && !!state.current && hudDeckKey === "green";
    if (energyCardEl) {
      energyCardEl.hidden = !showEnergy;
    }
    if (energyValueEl) {
      const nextEnergyValue = Math.max(0, Number(state.energy) || 0);
      const previousEnergyValue = Number(energyValueEl.dataset.renderValue);
      const wasEnergyVisible = energyCardEl?.dataset.energyVisible === "true";
      setAnimatedText(energyValueEl, nextEnergyValue);
      if (showEnergy && wasEnergyVisible && Number.isFinite(previousEnergyValue) && nextEnergyValue > previousEnergyValue) {
        const popEl = energyCardEl || energyValueEl;
        popEl.classList.remove("energy-pop");
        void popEl.offsetWidth;
        popEl.classList.add("energy-pop");
      }
      if (energyCardEl) {
        energyCardEl.dataset.energyVisible = showEnergy ? "true" : "false";
      }
    }
  }

  const metaEl = document.getElementById("meta-progression");
  if (metaEl) {
    metaEl.innerText = state.metaProgression ?? 0;
  }
}

function setAnimatedText(el, value) {
  if (!el) return;

  const nextValue = String(value ?? "");
  const previousValue = el.dataset.renderValue;
  el.innerText = nextValue;

  if (previousValue !== undefined && previousValue !== nextValue) {
    el.classList.remove("hud-pop");
    void el.offsetWidth;
    el.classList.add("hud-pop");
  }

  el.dataset.renderValue = nextValue;
}

function buildHeaderPowerTooltipBody(deckKey, levelNumber) {
  const selectedPowerId = state.selectedStartPowerId;
  const selectedPowerName = getPowerName(selectedPowerId || "none");
  const selectedPowerDescription = selectedPowerId
    ? getPowerDescription(selectedPowerId, { deckKey, levelNumber })
    : "";

  const activePowerIds = Array.isArray(state.powers)
    ? state.powers.filter(Boolean)
    : [];
  const activePowerLines = activePowerIds.map((powerId) => {
    const powerName = getPowerName(powerId);
    const description = getPowerDescription(powerId, { deckKey, levelNumber });
    return description
      ? `- ${powerName}: ${description}`
      : `- ${powerName}`;
  });

  const bodyLines = [];
  if (selectedPowerDescription) {
    bodyLines.push(`Starting Power: ${selectedPowerName}`);
    bodyLines.push(selectedPowerDescription);
  } else {
    bodyLines.push(`Starting Power: ${selectedPowerName}`);
  }

  if (activePowerLines.length) {
    bodyLines.push("");
    bodyLines.push(`Current Powers In Play (${activePowerLines.length}):`);
    bodyLines.push(...activePowerLines);
  } else {
    bodyLines.push("");
    bodyLines.push("Current Powers In Play: none");
  }

  return bodyLines.join("\n");
}

function renderHeaderStatus() {
  const gameEl = document.getElementById("game");
  const brandTitleEl = document.getElementById("brand-title");
  const powerChipEl = document.getElementById("header-power-chip");
  const powerGlyphEl = document.getElementById("header-power-glyph");
  const runLevelNumber = normalizeLevelNumber(state.currentLevelNumber || state.selectedLevelNumber || loadSelectedLevel());
  const runPowerId = state.selectedStartPowerId || "";
  const runPowerName = runPowerId ? getPowerName(runPowerId) : "No power selected";
  const runDeckKey = normalizeDeckKey(state.currentDeckKey || state.selectedDeckKey || "blue");
  const runDeckName = getDeckName(runDeckKey);
  const runPowerTooltipBody = runPowerId
    ? buildHeaderPowerTooltipBody(runDeckKey, runLevelNumber)
    : "";

  if (gameEl) {
    gameEl.dataset.deck = runDeckKey;
  }

  if (brandTitleEl) {
    brandTitleEl.dataset.deck = runDeckKey;
  }

  if (powerChipEl && powerGlyphEl) {
    const hasPower = !!runPowerId;
    const runPower = hasPower ? getPowerById(runPowerId) : null;
    powerChipEl.classList.remove("common", "normal", "uncommon", "rare", "legendary");
    if (hasPower) {
      powerChipEl.classList.add(runPower?.rarity || "common");
    }
    powerGlyphEl.innerText = hasPower ? getPowerIcon(runPowerId) : "·";
    powerChipEl.classList.toggle("has-power", hasPower);
    powerChipEl.setAttribute("aria-label", hasPower ? `${runPowerName} details` : "No starting power selected");
    setupHeaderPowerTooltip(powerChipEl, {
      enabled: hasPower && !!runPowerTooltipBody,
      title: `${runDeckName} Deck - Level ${runLevelNumber} Starting Power: ${runPowerName}`,
      description: runPowerTooltipBody,
    });
  }
}

function getCheatDescription(cheat) {
  return CHEAT_DESCRIPTIONS?.[cheat.name] || "No description yet.";
}

function showTooltip(titleText, bodyText, el) {
  const tooltip = document.getElementById("cheat-tooltip");
  const title = document.getElementById("cheat-tooltip-title");
  const body = document.getElementById("cheat-tooltip-body");

  if (!tooltip || !title || !body || !el) return;

  title.innerText = titleText || "";
  body.innerText = bodyText || "";

  tooltip.classList.remove("hidden");

  const rect = el.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const edgePadding = 10;
  const halfTooltipWidth = tooltipRect.width / 2;
  const targetCenterX = rect.left + rect.width / 2;
  const preferredCenterX =
    rect.left > viewportWidth * 0.58
      ? rect.left - 12 - halfTooltipWidth
      : targetCenterX;
  const minCenterX = edgePadding + halfTooltipWidth;
  const maxCenterX = viewportWidth - edgePadding - halfTooltipWidth;
  const safeCenterX = Math.min(Math.max(preferredCenterX, minCenterX), Math.max(minCenterX, maxCenterX));

  tooltip.style.left = safeCenterX + "px";
  const prefersBelow = rect.top < tooltipRect.height + 28;
  tooltip.style.top = prefersBelow ? (rect.bottom + 10) + "px" : (rect.top - 10) + "px";
  tooltip.style.transform = prefersBelow ? "translate(-50%, 0)" : "translate(-50%, -110%)";
  const tooltipBottom = (prefersBelow ? rect.bottom + 10 + tooltipRect.height : rect.top - 10);
  if (prefersBelow && tooltipBottom > viewportHeight - edgePadding) {
    tooltip.style.top = Math.max(edgePadding, viewportHeight - tooltipRect.height - edgePadding) + "px";
  }
  tooltip.dataset.sourceId = el.id || "";
  tooltip.dataset.sourceRole = el.dataset.tooltipRole || "";
}

function setupHeaderPowerTooltip(el, payload) {
  if (!el || el.dataset.tooltipInit === "1") {
    if (el) {
      el.dataset.tooltipEnabled = payload?.enabled ? "1" : "0";
      el.dataset.tooltipTitle = payload?.title || "";
      el.dataset.tooltipBody = payload?.description || "";
    }
    return;
  }

  let holdTimer = null;

  const clearHold = () => {
    clearTimeout(holdTimer);
    holdTimer = null;
    hideCheatTooltip();
  };

  el.addEventListener("pointerdown", (event) => {
    if (el.dataset.tooltipEnabled !== "1") return;
    if (event.pointerType === "mouse") return;
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => {
      showTooltip(el.dataset.tooltipTitle, el.dataset.tooltipBody, el);
    }, 300);
  });

  el.addEventListener("pointerup", clearHold);
  el.addEventListener("pointercancel", clearHold);
  el.addEventListener("pointerleave", clearHold);
  el.addEventListener("mouseenter", () => {
    if (!canUseHoverTooltips()) return;
    if (el.dataset.tooltipEnabled !== "1") return;
    showTooltip(el.dataset.tooltipTitle, el.dataset.tooltipBody, el);
  });
  el.addEventListener("mouseleave", clearHold);
  el.addEventListener("contextmenu", (event) => {
    if (el.dataset.tooltipEnabled !== "1") return;
    event.preventDefault();
  });

  el.dataset.tooltipInit = "1";
  el.dataset.tooltipRole = "header-power";
  el.dataset.tooltipEnabled = payload?.enabled ? "1" : "0";
  el.dataset.tooltipTitle = payload?.title || "";
  el.dataset.tooltipBody = payload?.description || "";
}

const CHEAT_ICON_BY_NAME = Object.freeze({
  "Above 9?": "9↑",
  "Below 5?": "5↓",
  "Between 5 and 9?": "5–9",
  "Is it an Ace?": "A?",
  "Is it a King?": "K?",
  "Ace ahead?": "A⋯",
  "King ahead?": "K⋯",
  "Number Remaining?": "#",
  "Total of Next Two": "Σ2",
  "Total of Next Three": "Σ3",
  "Total Above 12?": "12↑",
  "Total Above 20?": "20↑",
  "Total Under 10?": "10↓",
  "Total Under 15?": "15↓",
  "Prime Ahead?": "ℙ",
  "Product of Next Two": "∏2",
  "Top Half / Bottom Half": "◐",
  "Face Card Ahead?": "JQK",
  "One of Next 2 Higher?": "∃↑",
  "One of Next 2 Lower?": "∃↓",
  "Higher of Next Two": "⇈",
  "Lower of Next Two": "⇊",
  "Next Card Parity": "⊕",
  "Chance Higher": "%↑",
  "Chance Lower": "%↓",
  "Nudge +1": "⇧1",
  "Nudge -1": "⇩1",
  "Nudge +2": "⇧2",
  "Nudge -2": "⇩2",
  "Next Card Nudge Up": "↥",
  "Next Card Nudge Down": "↧",
  "Halve It": "½",
  "Double Trouble": "2×",
  "Odd One Out": "O!",
  "Lucky 7": "7★",
  "Five Alive": "5♥",
  "6/7": "6⁄7",
  "Twin Peek": "◉◉",
  "Run Stopper": "⛔",
  "Bang Average": "AVG",
  "God Save The King": "♔",
  "Jack Of All Trades": "J✦",
  "Fortune Teller": "🔮",
  "You Can Cheat A Cheater": "C²",
  "Suits You, Sir": "♣♦",
  "Cursed Shield": "⛨",
  "The Higher The Better": "⇈!",
  "The Lower The Better": "⇊!",
  "Suited and Booted": "♠B",
  "Always Bet On The Black": "♠♣",
  "Locky 7s": "7🔒",
  "Hot or Cold?": "℃",
  "Corporate Icebreaker": "💬",
  "Tear Corner": "◰",
  "Swap": "⇄",
  "+5 Energy": "⚡5",
});

function getCheatIcon(name) {
  return CHEAT_ICON_BY_NAME[name] || "✦";
}

function getCheatIcon(name) {
  if (name === "Equals 11") return "=11";
  if (name === "Blank Space") return "[]";
  if (name === "WL") return "W/L";
  return CHEAT_ICON_BY_NAME[name] || "âœ¦";
}

function getCheatIcon(name) {
  if (name === "Equals 11") return "=11";
  if (name === "Blank Space") return "[]";
  if (name === "WL") return "W/L";
  return CHEAT_ICON_BY_NAME[name] || "✦";
}

function renderRestartButton() {
  const btn = document.getElementById("restart-btn");
  if (!btn) return;

  const runIsActive = !state.gameOver && !!state.current;
  const hasStartedRun = Array.isArray(state.deck) && state.deck.length > 0;
  if (state.runMode === "daily" && state.gameOver) {
    btn.innerText = "Daily Complete";
    btn.disabled = true;
    return;
  }

  btn.disabled = false;
  if (runIsActive) {
    btn.innerText = state.restartConfirmArmed ? "Confirm Restart" : "Restart Run";
    return;
  }

  btn.innerText = hasStartedRun ? "Restart Run" : "Start Run";
}

function renderStartPowerSelector() {
  const selectEl = document.getElementById("start-power-select");
  if (!selectEl) return;

  selectEl.innerHTML = "";

  const noneOption = document.createElement("option");
  noneOption.value = "none";
  noneOption.innerText = "No Power";
  selectEl.appendChild(noneOption);

  POWERS.forEach((power) => {
    const option = document.createElement("option");
    option.value = power.id;
    option.innerText = power.name;
    selectEl.appendChild(option);
  });

  const validPowerIds = POWERS.map((power) => power.id);

  let selected = state.selectedStartPowerId;

  if (!selected || selected === "none" || !validPowerIds.includes(selected)) {
    const nudgePower = POWERS.find((power) => power.name === "Nudge");
    selected = nudgePower ? nudgePower.id : (POWERS[0]?.id || "none");
    state.selectedStartPowerId = selected;
  }

  selectEl.value = selected;

  selectEl.onchange = () => {
    state.selectedStartPowerId = selectEl.value;
  };
}

function renderCheatGuide() {
  const listEl = document.getElementById("cheat-guide-list");
  if (!listEl) return;

  listEl.innerHTML = "";

  const cheatsToShow = [];
  const seenIds = new Set();

  state.cheats.forEach((cheat) => {
    if (!seenIds.has(cheat.id)) {
      cheatsToShow.push(cheat);
      seenIds.add(cheat.id);
    }
  });

  state.pendingCheatOptions.forEach((cheat) => {
    if (!seenIds.has(cheat.id)) {
      cheatsToShow.push(cheat);
      seenIds.add(cheat.id);
    }
  });

  if (!cheatsToShow.length) {
    const empty = document.createElement("div");
    empty.className = "cheat-guide-desc";
    empty.innerText =
      "Cheat descriptions will appear here for cheats in hand and current cheat choices.";
    listEl.appendChild(empty);
    return;
  }

  cheatsToShow.forEach((cheat) => {
    const item = document.createElement("div");
    item.className = "cheat-guide-item";

    const name = document.createElement("div");
    name.className = "cheat-guide-name";
    name.innerText = cheat.name;

    const desc = document.createElement("div");
    desc.className = "cheat-guide-desc";
    desc.innerText = CHEAT_DESCRIPTIONS[cheat.name] || "No description yet.";

    item.appendChild(name);
    item.appendChild(desc);
    listEl.appendChild(item);
  });
}

function renderActivePowers() {
  const activePowersEl = document.getElementById("active-powers");
  if (!activePowersEl) return;

  const ownedPower = getPowerById(state.selectedStartPowerId);

  if (!ownedPower) {
    activePowersEl.innerText = "Power chosen when the run starts.";
    return;
  }

  activePowersEl.innerHTML = `
    <div class="power-summary">
      <div class="power-summary-name">${ownedPower.name}</div>
      <div class="power-summary-desc">${getPowerDescription(ownedPower)}</div>
    </div>
  `;
}

function renderCardFaceMarkup(card, displayValue, isTemporarilyModified, includeTornCorner, options = {}) {
  if (isJokerCard(card)) {
    return `
      <div class="joker-card-corner">JOKER</div>
      <div class="joker-card-icon">${card.icon || "!"}</div>
      <div class="joker-card-name">${getJokerName(card)}</div>
      <div class="joker-card-copy">${card.description || "Yellow hazard"}</div>
    `;
  }
  const showShieldBadge = !!options.showShieldBadge;
  const shownRank = isTemporarilyModified ? valueToRank(displayValue) : card.rank;
  const nudgeFromRank = Number.isFinite(options.nudgeFromValue)
    ? valueToRank(options.nudgeFromValue)
    : "";
  const nudgeValueActive = !!nudgeFromRank && nudgeFromRank !== shownRank;
  const isNewTheme = document.body.dataset.visuals === "new";
  const labelHtml = isNewTheme
    ? `<div class="card-corner card-corner-tl"><span class="card-rank ${nudgeValueActive ? "card-nudge-new-rank" : ""}">${shownRank}</span><span class="card-suit" data-suit="${card.suit}" aria-hidden="true"></span></div><div class="card-center-suit" data-suit="${card.suit}" aria-hidden="true"></div><div class="card-corner card-corner-br" aria-hidden="true"><span class="card-rank ${nudgeValueActive ? "card-nudge-new-rank" : ""}">${shownRank}</span><span class="card-suit" data-suit="${card.suit}"></span></div>`
    : `<span class="card-face-label ${nudgeValueActive ? "card-nudge-new-label" : ""}">${shownRank}${card.suit}</span>`;
  const nudgeOldRankHtml = nudgeValueActive
    ? isNewTheme
      ? `<span class="card-nudge-old-rank card-nudge-old-rank-tl">${nudgeFromRank}</span><span class="card-nudge-old-rank card-nudge-old-rank-br" aria-hidden="true">${nudgeFromRank}</span>`
      : `<span class="card-nudge-old-label">${nudgeFromRank}${card.suit}</span>`
    : "";
  return `
    ${labelHtml}
    ${nudgeOldRankHtml}
    ${isTemporarilyModified ? '<span class="card-temp-chip">TEMP</span>' : ""}
    ${showShieldBadge ? '<span class="card-shield-badge" aria-label="Cursed Shield active" title="Cursed Shield active">🛡️</span>' : ""}
    ${includeTornCorner ? '<span class="tear-mark-face"></span>' : ""}
  `;
}

function renderBlankSpaceFaceMarkup(displayValue) {
  const shownValue = Number.isFinite(displayValue) ? valueToRank(displayValue) : "?";
  return `
    <div class="blank-space-chip">BLANK SPACE</div>
    <div class="blank-space-icon">[]</div>
    <div class="blank-space-copy">Next card treated as</div>
    <div class="blank-space-value">${shownValue}</div>
  `;
}

function renderCurrentCard() {
  const currentCardEl = document.getElementById("current-card");
  const currentValueEl = document.getElementById("current-effective-value");

  if (!currentCardEl || !currentValueEl) return;

  const pendingReveal = state.pendingRevealAnimation;
  const gameOverCards = state.gameOver ? state.gameOverDisplayCards : null;
  const showPinnedCurrentCard = !!pendingReveal && !!pendingReveal.fromCard;
  const cardToRender = showPinnedCurrentCard
    ? pendingReveal.fromCard
    : gameOverCards?.leftCard || state.current;

  if (!cardToRender) {
    const idleBackColor = getDeckBackColor(state.currentDeckKey || state.selectedDeckKey);
    currentCardEl.className = `card-back card-back-${idleBackColor}${getPreservedTutorialFocusClass(currentCardEl)}`;
    currentCardEl.innerHTML = `<div class="card-back-symbol">🂠</div>`;
    currentValueEl.innerText = "";
    return;
  }

  const backStatus = getCardBackStatus(cardToRender.id);
  const effectiveValue = showPinnedCurrentCard
    ? pendingReveal.fromEffectiveValue
    : gameOverCards?.leftCard && cardToRender.id === gameOverCards.leftCard.id
      ? gameOverCards.leftEffectiveValue
      : getCurrentEffectiveValue();
  const isTemporarilyModified = showPinnedCurrentCard
    ? !!pendingReveal.fromIsTemp
    : gameOverCards?.leftCard && cardToRender.id === gameOverCards.leftCard.id
      ? !!gameOverCards.leftIsTemp
      : effectiveValue !== cardToRender.value;
  const feedbackClass = state.currentCardFeedback
    ? `feedback-${state.currentCardFeedback}`
    : "";
  const nudgeAnimation = state.currentNudgeAnimation?.cardId === cardToRender.id
    ? state.currentNudgeAnimation
    : null;
  const nudgeClass = nudgeAnimation
    ? `nudge-animate nudge-${nudgeAnimation.direction === "down" ? "down" : "up"}`
    : "";

  currentCardEl.className = `card-face ${isJokerCard(cardToRender) ? "joker-card-face" : (isRed(cardToRender) ? "red" : "black")} ${backStatus.tornCorner ? "torn-corner-face" : ""} ${isTemporarilyModified ? "temporary-value" : ""} ${feedbackClass} ${nudgeClass}${getPreservedTutorialFocusClass(currentCardEl)}`.trim();
  currentCardEl.innerHTML = renderCardFaceMarkup(
    cardToRender,
    effectiveValue,
    isTemporarilyModified,
    backStatus.tornCorner,
    {
      showShieldBadge: !!state.cursedShieldArmed,
      nudgeFromValue: nudgeAnimation?.fromValue,
    }
  );

  currentValueEl.innerText = "";
}

function formatNudgedPercentage(nudgedUses, totalUses) {
  if (!totalUses) return "0%";
  return `${Math.round((nudgedUses / totalUses) * 100)}%`;
}

function formatRiskPercentage(endedRuns, totalUses) {
  if (!totalUses) return "0%";
  return `${Math.round((endedRuns / totalUses) * 100)}%`;
}

function getRedDeckStatsSummary(entry) {
  const blueFaceUpUses = entry.nudgeStats?.blueFaceUpUses || 0;
  const blueNudgedUses = entry.nudgeStats?.blueNudgedUses || 0;
  const totalUpAmount = entry.nudgeStats?.totalUpAmount || 0;
  const totalDownAmount = entry.nudgeStats?.totalDownAmount || 0;

  return {
    seenCount: blueFaceUpUses,
    nudgedCount: blueNudgedUses,
    nudgedPercent: formatNudgedPercentage(blueNudgedUses, blueFaceUpUses),
    upTotal: totalUpAmount,
    downTotal: totalDownAmount,
  };
}

function getRedDeckStatsTooltipBody(entry) {
  const summary = getRedDeckStatsSummary(entry);
  return [
    "Seen: times this card has been face up in Blue runs.",
    `Nudged: percentage of those face-up turns where players nudged it at least once (${summary.nudgedCount}/${summary.seenCount}).`,
    "Up / Down: total upward vs downward nudge amount applied while this card was face up.",
    `Up / Down totals: ${summary.upTotal} up, ${summary.downTotal} down.`,
  ].join("\n");
}

function setupDeckStatsTooltip(el, payload) {
  if (!el || el.dataset.deckStatsTooltipInit === "1") {
    if (el) {
      el.dataset.tooltipEnabled = payload?.enabled ? "1" : "0";
      el.dataset.tooltipTitle = payload?.title || "";
      el.dataset.tooltipBody = payload?.description || "";
    }
    return;
  }

  let holdTimer = null;

  const clearHold = () => {
    clearTimeout(holdTimer);
    holdTimer = null;
    hideCheatTooltip();
  };

  el.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") return;
    if (el.dataset.tooltipEnabled !== "1") return;
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => {
      showTooltip(el.dataset.tooltipTitle, el.dataset.tooltipBody, el);
    }, 300);
  });

  el.addEventListener("pointerup", clearHold);
  el.addEventListener("pointercancel", clearHold);
  el.addEventListener("pointerleave", clearHold);
  el.addEventListener("mouseenter", () => {
    if (!canUseHoverTooltips()) return;
    if (el.dataset.tooltipEnabled !== "1") return;
    showTooltip(el.dataset.tooltipTitle, el.dataset.tooltipBody, el);
  });
  el.addEventListener("mouseleave", clearHold);

  el.dataset.deckStatsTooltipInit = "1";
  el.dataset.tooltipRole = "deck-stats";
  el.dataset.tooltipEnabled = payload?.enabled ? "1" : "0";
  el.dataset.tooltipTitle = payload?.title || "";
  el.dataset.tooltipBody = payload?.description || "";
}

function renderNudgeControls() {
  const upBtn = document.getElementById("nudge-up-btn");
  const downBtn = document.getElementById("nudge-down-btn");
  const upCountEl = document.getElementById("nudge-up-count");
  const downCountEl = document.getElementById("nudge-down-count");
  const cheatsPanel = document.getElementById("cheats-panel");

  if (!upBtn || !downBtn || !upCountEl || !downCountEl) return;

  const upCount = state.nudgeUpCharges || 0;
  const downCount = state.nudgeDownCharges || 0;

  upCountEl.innerText = String(upCount);
  downCountEl.innerText = String(downCount);
  upBtn.setAttribute("aria-label", `Nudge Up, ${upCount} charge${upCount === 1 ? "" : "s"} available`);
  downBtn.setAttribute("aria-label", `Nudge Down, ${downCount} charge${downCount === 1 ? "" : "s"} available`);

  const isBlocked =
    state.gameOver ||
    !state.current ||
    !!state.pendingRevealAnimation ||
    state.pendingCheatOptions.length > 0 ||
    state.pendingPowerOptions.length > 0 ||
    !!state.pauseForCheat;

  const revealLocked = !!state.pendingRevealAnimation;
  upBtn.classList.toggle("keep-bright", revealLocked);
  downBtn.classList.toggle("keep-bright", revealLocked);
  if (cheatsPanel) {
    cheatsPanel.classList.toggle("nudge-order-up-down", loadNudgeButtonOrder() === "up-down");
  }

  upBtn.disabled = isBlocked || !canUseNudge("up");
  downBtn.disabled = isBlocked || !canUseNudge("down");
}

function renderFaceDownDeck() {
  const deckEl = document.getElementById("face-down-deck");
  const remainingValueEl = document.getElementById("cards-remaining-value");

  if (!deckEl) return;

  if (!state.pendingRevealAnimation) {
    setRevealOverlayHidden(true);
  }

  if (!state.current) {
    deckEl.innerHTML = "";
    const idleDeckBackColor = getDeckBackColor(state.currentDeckKey || state.selectedDeckKey);
    deckEl.className = `card-back card-back-${idleDeckBackColor}${getPreservedTutorialFocusClass(deckEl)}`;
    deckEl.removeAttribute("data-back-color");
    if (remainingValueEl) remainingValueEl.innerText = "00";
    return;
  }

  const gameOverCards = state.gameOver ? state.gameOverDisplayCards : null;
  if (gameOverCards?.rightCard && !state.pendingRevealAnimation) {
    const revealCard = gameOverCards.rightCard;
    const revealStatus = getCardBackStatus(revealCard.id);
    const revealValue = Number.isFinite(gameOverCards.rightEffectiveValue)
      ? gameOverCards.rightEffectiveValue
      : revealCard.value;
    const revealIsTemp = !!gameOverCards.rightIsTemp;

    deckEl.className = `card-face ${isJokerCard(revealCard) ? "joker-card-face" : (isRed(revealCard) ? "red" : "black")} ${revealStatus.tornCorner ? "torn-corner-face" : ""} ${revealIsTemp ? "temporary-value" : ""}${getPreservedTutorialFocusClass(deckEl)}`.trim();
    deckEl.innerHTML = renderCardFaceMarkup(
      revealCard,
      revealValue,
      revealIsTemp,
      revealStatus.tornCorner
    );
    deckEl.removeAttribute("data-back-color");
    deckEl.classList.remove("has-deck-stats-tooltip");
    setupDeckStatsTooltip(deckEl, {
      enabled: false,
      title: "",
      description: "",
    });

    const remainingCount = getFaceDownCount();
    if (remainingValueEl) {
      setAnimatedText(remainingValueEl, String(remainingCount).padStart(2, "0"));
    }
    return;
  }

  const next = peekNext();
  const backStatus = next
    ? getCardBackStatus(next.id)
    : { tornCorner: false, backColor: "blue" };
  const blankSpaceActive = !!next && typeof isBlankSpaceActiveForNextCard === "function" && isBlankSpaceActiveForNextCard(next);

  const backColor = getDeckBackColor(state.currentDeckKey);
  const shouldShowDeckStatsInline = !!next && !blankSpaceActive && normalizeDeckKey(state.currentDeckKey) === "red";

  const tutorialFocusClass = getPreservedTutorialFocusClass(deckEl);
  deckEl.className = blankSpaceActive
    ? `card-face blank-space-face ${backStatus.tornCorner ? "torn-corner-face" : ""}${tutorialFocusClass}`.trim()
    : shouldShowDeckStatsInline
      ? `card-face red card-stats-face ${backStatus.tornCorner ? "torn-corner-face" : ""}${tutorialFocusClass}`.trim()
      : `card-back card-back-${backColor} ${backStatus.tornCorner ? "torn-corner" : ""}${tutorialFocusClass}`.trim();
  if (blankSpaceActive) {
    deckEl.removeAttribute("data-back-color");
  } else {
    deckEl.setAttribute("data-back-color", backColor);
  }
  deckEl.innerHTML = "";

  if (blankSpaceActive) {
    deckEl.innerHTML = renderBlankSpaceFaceMarkup(getUpcomingCheatValue(1));
  } else if (!shouldShowDeckStatsInline) {
    const symbol = document.createElement("div");
    symbol.className = "card-back-symbol";
    symbol.innerText = "🂠";
    deckEl.appendChild(symbol);
  }

  if (backStatus.tornCorner && !blankSpaceActive) {
    const tear = document.createElement("div");
    tear.className = shouldShowDeckStatsInline ? "tear-mark-face" : "tear-mark";
    deckEl.appendChild(tear);
  }

  if (blankSpaceActive) {
    deckEl.classList.remove("has-deck-stats-tooltip");
    setupDeckStatsTooltip(deckEl, {
      enabled: false,
      title: "",
      description: "",
    });
  } else if (shouldShowDeckStatsInline) {
    const entry = getCardStatsEntry(next.id);
    const statsSummary = getRedDeckStatsSummary(entry);
    const tooltipTitle = `${describeCard(next)} Red Stats`;
    const tooltipBody = getRedDeckStatsTooltipBody(entry);

    const statsBox = document.createElement("div");
    statsBox.className = "card-back-stats";
    statsBox.innerHTML = `
      <div class="card-back-stats-top">
        <div class="card-back-stats-kicker">Nudged</div>
        <div class="card-back-stats-primary">${statsSummary.nudgedPercent}</div>
        <div class="card-back-stats-sub">${statsSummary.nudgedCount} of ${statsSummary.seenCount} seen</div>
      </div>
      <div class="card-back-stats-split">
        <div class="card-back-stats-metric card-back-stats-up">
          <div class="card-back-stats-metric-label">Up</div>
          <div class="card-back-stats-metric-value">${statsSummary.upTotal}</div>
        </div>
        <div class="card-back-stats-metric card-back-stats-down">
          <div class="card-back-stats-metric-label">Down</div>
          <div class="card-back-stats-metric-value">${statsSummary.downTotal}</div>
        </div>
      </div>
    `;
    deckEl.appendChild(statsBox);
    deckEl.classList.add("has-deck-stats-tooltip");
    setupDeckStatsTooltip(deckEl, {
      enabled: true,
      title: tooltipTitle,
      description: tooltipBody,
    });
  } else {
    deckEl.classList.remove("has-deck-stats-tooltip");
    setupDeckStatsTooltip(deckEl, {
      enabled: false,
      title: "",
      description: "",
    });
  }

  const remainingCount = getFaceDownCount();
  if (remainingValueEl) {
    setAnimatedText(remainingValueEl, String(remainingCount).padStart(2, "0"));
  }
}

function renderButtons() {
  const controls = document.getElementById("controls");
  const restartBtn = document.getElementById("restart-btn");
  const higherBtn = document.getElementById("higher-btn");
  const lowerBtn = document.getElementById("lower-btn");
  if (!controls || !restartBtn || !higherBtn || !lowerBtn) return;

  const showingChoiceModal = state.pendingPowerOptions.length > 0 || state.pendingCheatOptions.length > 0;
  const revealInFlight = !!state.pendingRevealAnimation;
  const runIsActive = !!state.current && (!state.gameOver || revealInFlight);
  const showRestartButton = !runIsActive;
  const hideControls = showingChoiceModal;

  controls.hidden = false;
  controls.setAttribute("aria-hidden", hideControls ? "true" : "false");
  controls.style.display = "";
  controls.classList.toggle("is-modal-hidden", hideControls);
  controls.classList.toggle("controls-single", showRestartButton);
  controls.classList.toggle("button-order-higher-lower", loadGuessButtonOrder() === "higher-lower");

  restartBtn.hidden = !showRestartButton;
  higherBtn.hidden = showRestartButton;
  lowerBtn.hidden = showRestartButton;

  if (hideControls) {
    restartBtn.disabled = true;
    higherBtn.disabled = true;
    lowerBtn.disabled = true;
    return;
  }

  if (showRestartButton) {
    higherBtn.disabled = true;
    lowerBtn.disabled = true;
    return;
  }

  const tutorialBlocked = typeof window.isTutorialGuessButtonsDisabled === "function"
    ? window.isTutorialGuessButtonsDisabled()
    : false;
  const tutorialGuidedGuessActive = typeof window.tutorialController?.isGuidedGuessStep === "function"
    ? window.tutorialController.isGuidedGuessStep()
    : false;
  const isPause = !!state.pauseForCheat;

  if (tutorialGuidedGuessActive) {
    const forceDisabled =
      state.gameOver ||
      !state.current ||
      revealInFlight ||
      state.pendingCheatOptions.length > 0 ||
      state.pendingPowerOptions.length > 0 ||
      isPause;
    higherBtn.disabled = forceDisabled;
    lowerBtn.disabled = forceDisabled;
    return;
  }

  // Block input if pausing before cheat selection
  const disableGuessing =
    state.gameOver ||
    !state.current ||
    revealInFlight ||
    state.pendingCheatOptions.length > 0 ||
    state.pendingPowerOptions.length > 0 ||
    isPause ||
    tutorialBlocked;

  higherBtn.disabled = disableGuessing;
  lowerBtn.disabled = disableGuessing;
}

function renderHandCard() {
  const handEl = document.getElementById("swap-card");
  if (!handEl) return;

  if (!state.handCard) {
    handEl.innerText = "Empty";
    handEl.className = "";
    return;
  }

  handEl.innerText = describeCard(state.handCard);
  handEl.className = isRed(state.handCard) ? "red" : "black";
}

function buildCheatButtonMarkup(title, iconGlyph, count = 0, countLabel = "") {
  return `
    <div class="cheat-icon">${iconGlyph}</div>
    <div class="cheat-name">${title}</div>
    <div class="cheat-count-label" ${countLabel ? "" : "hidden"}>${countLabel}</div>
    <div class="cheat-stack-count" ${count > 1 && !countLabel ? "" : "hidden"}>x${count}</div>
  `;
}

function shouldConsumeCheatAfterUse(cheat, result) {
  if (!cheat) return false;
  if (typeof cheat.shouldConsumeResult === "function") {
    return !!cheat.shouldConsumeResult(result);
  }
  return !!cheat.consumeOnUse;
}

function updateCheatOverflowIndicators() {
  const cheatList = document.getElementById("cheat-list");
  const cheatsPanel = document.getElementById("cheats-panel");
  if (!cheatList || !cheatsPanel) return;

  const maxScrollLeft = Math.max(0, cheatList.scrollWidth - cheatList.clientWidth);
  const scrollLeft = Math.max(0, cheatList.scrollLeft);
  const hasOverflow = maxScrollLeft > 6;
  const showLeft = hasOverflow && scrollLeft > 6;
  const showRight = hasOverflow && scrollLeft < maxScrollLeft - 6;

  cheatsPanel.dataset.overflowLeft = showLeft ? "true" : "false";
  cheatsPanel.dataset.overflowRight = showRight ? "true" : "false";
  cheatsPanel.dataset.hasOverflow = hasOverflow ? "true" : "false";
}

function getCheatChoiceRarityLabel(cheat) {
  return (cheat?.rarity || "common").replace(/^\w/, (c) => c.toUpperCase());
}

function hideCheatChoiceFlyout() {
  const flyoutEl = document.getElementById("cheat-choice-flyout");
  if (!flyoutEl) return;
  flyoutEl.className = "hidden";
  flyoutEl.setAttribute("aria-hidden", "true");
  flyoutEl.innerHTML = "";
  flyoutEl.removeAttribute("style");
}

function hidePowerChoiceFlyout() {
  const flyoutEl = document.getElementById("power-choice-flyout");
  if (!flyoutEl) return;
  flyoutEl.className = "hidden";
  flyoutEl.setAttribute("aria-hidden", "true");
  flyoutEl.innerHTML = "";
  flyoutEl.removeAttribute("style");
}

function buildPowerChoiceShieldMarkup(power) {
  return `
    ${POWER_SHIELD_SVG}
    <div class="choice-top">
      <div class="choice-name">${power.name}</div>
      <div class="choice-rarity">${getPowerRarityLabel(power)}</div>
    </div>
    <div class="choice-bottom">
      <div class="choice-icon">${getPowerIcon(power.id)}</div>
    </div>
  `;
}

function renderCheatChoiceInfo(infoEl, cheat, promptText = "") {
  if (!infoEl) return;

  if (!cheat) {
    infoEl.innerHTML = `<div class="cheat-choice-info-copy">${promptText || "Tap a cheat to read the description."}</div>`;
    return;
  }

  const rarityLabel = getCheatChoiceRarityLabel(cheat);
  const rarityClass = `rarity-${cheat?.rarity || "common"}`;
  infoEl.innerHTML = `
    <div class="cheat-choice-info-title">${cheat.name}</div>
    <div class="cheat-choice-info-rarity ${rarityClass}">${rarityLabel}</div>
    <div class="cheat-choice-info-copy">${getCheatDescription(cheat)}</div>
    <div class="cheat-choice-info-hint">Tap again to select</div>
  `;
}

function completeCheatChoiceSelectionAnimation(followup) {
  if (state.cheatChoiceAnimating?.targetEntryId) {
    suppressNextCheatEntryIntroId = state.cheatChoiceAnimating.targetEntryId;
  }
  hideCheatChoiceFlyout();
  clearPendingCheatChoiceTimer();
  state.cheatChoiceAnimating = null;
  if (typeof runDeferredCheatChoiceFollowup === "function") {
    runDeferredCheatChoiceFollowup(followup);
    return;
  }
  render();
}

function beginCheatChoiceSelection(index, buttonEl) {
  const cheat = state.pendingCheatOptions[index];
  if (!cheat || !buttonEl || state.cheatChoiceAnimating) return;

  const choiceCards = Array.from(document.querySelectorAll("#cheat-choice-list .cheat-choice-card"));
  choiceCards.forEach((el) => {
    el.style.animation = "none";
    el.style.transition = "none";
    el.style.transform = "none";
    el.style.opacity = "1";
    el.classList.remove("choice-intro");
  });
  void buttonEl.offsetWidth;

  const optionsSnapshot = state.pendingCheatOptions.map((option) => ({ ...option }));
  const sourceRect = buttonEl.getBoundingClientRect();
  const selectionResult = pickCheatFromChoice(index, { deferFollowup: true, suppressRender: true });

  if (cheat.id === "green_energy_boost") {
    hideCheatChoiceFlyout();
    clearPendingCheatChoiceTimer();
    state.cheatChoiceAnimating = null;
    state.cheatChoicePreviewIndex = -1;
    cheatChoiceConfirmIndex = -1;
    cheatChoiceConfirmAfter = 0;
    if (typeof runDeferredCheatChoiceFollowup === "function") {
      runDeferredCheatChoiceFollowup(selectionResult?.followup || { type: "render" });
      return;
    }
    render();
    return;
  }

  state.cheatChoiceAnimating = {
    stage: "closing",
    started: false,
    selectedIndex: index,
    cheat: selectionResult?.cheat || { ...cheat },
    optionsSnapshot,
    sourceRect: {
      left: sourceRect.left,
      top: sourceRect.top,
      width: sourceRect.width,
      height: sourceRect.height,
    },
    targetEntryId: selectionResult?.targetEntryId || cheat.id,
    followup: selectionResult?.followup || { type: "render" },
  };
  state.cheatChoicePreviewIndex = -1;
  cheatChoiceConfirmIndex = -1;
  cheatChoiceConfirmAfter = 0;
  render();
}

function getCheatChoiceFlyTargetRect(targetEntryId, fallbackEl) {
  const targetEl = document.querySelector(`#cheat-list [data-cheat-entry-id="${CSS.escape(targetEntryId || "")}"]`);
  const targetRect = (targetEl || fallbackEl)?.getBoundingClientRect();
  return targetRect;
}

function beginPowerChoiceSelection(index, buttonEl) {
  const power = state.pendingPowerOptions[index];
  if (!power || !buttonEl || state.powerChoiceAnimating) return;

  const optionEls = Array.from(document.querySelectorAll("#power-choice-list .power-choice-option"));
  optionEls.forEach((el) => {
    el.style.animation = "none";
    el.style.transition = "none";
    el.style.transform = "none";
    el.style.opacity = "1";
    el.classList.remove("choice-intro");
  });
  void buttonEl.offsetWidth;

  const sourceRect = buttonEl.getBoundingClientRect();
  state.powerChoiceAnimating = {
    stage: "closing",
    started: false,
    selectedIndex: index,
    power: { ...power },
    optionsSnapshot: state.pendingPowerOptions.map((option) => ({ ...option })),
    sourceRect: {
      left: sourceRect.left,
      top: sourceRect.top,
      width: sourceRect.width,
      height: sourceRect.height,
    },
  };
  render();
}

function getChoiceFlyoutHostRect(flyoutEl) {
  const hostEl = flyoutEl.closest("#game");
  if (!hostEl) {
    return { left: 0, top: 0 };
  }
  const rect = hostEl.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
  };
}

function completePowerChoiceSelectionAnimation() {
  const selectedIndex = state.powerChoiceAnimating?.selectedIndex;
  hidePowerChoiceFlyout();
  clearPendingPowerChoiceTimer();
  state.powerChoiceAnimating = null;
  if (Number.isInteger(selectedIndex)) {
    pickPowerFromChoice(selectedIndex);
    return;
  }
  render();
}

function playPendingPowerChoiceAnimation() {
  const animation = state.powerChoiceAnimating;
  if (!animation) {
    hidePowerChoiceFlyout();
    return;
  }

  if (animation.stage === "closing") {
    if (animation.started) return;
    animation.started = true;
    clearPendingPowerChoiceTimer();
    powerChoiceAnimationTimer = setTimeout(() => {
      powerChoiceAnimationTimer = null;
      if (!state.powerChoiceAnimating || state.powerChoiceAnimating !== animation) return;
      state.powerChoiceAnimating.stage = "flying";
      state.powerChoiceAnimating.started = false;
      render();
    }, POWER_CHOICE_CLOSE_MS);
    return;
  }

  if (animation.stage !== "flying" || animation.started) return;

  const flyoutEl = document.getElementById("power-choice-flyout");
  const targetEl = document.getElementById("header-power-chip");
  const targetShieldEl = targetEl?.querySelector(".power-shield-svg");
  if (!flyoutEl || !targetEl || !animation.power) return;

  animation.started = true;
  clearPendingPowerChoiceTimer();

  const rarity = animation.power.rarity || "common";
  flyoutEl.className = `power-choice-flyout choice-card power-choice-card ${rarity}`;
  flyoutEl.innerHTML = buildPowerChoiceShieldMarkup(animation.power);
  flyoutEl.setAttribute("aria-hidden", "true");

  const source = animation.sourceRect;
  const hostRect = getChoiceFlyoutHostRect(flyoutEl);
  flyoutEl.style.left = `${source.left - hostRect.left}px`;
  flyoutEl.style.top = `${source.top - hostRect.top}px`;
  flyoutEl.style.setProperty("--flyout-width", `${source.width}px`);
  flyoutEl.style.setProperty("--flyout-height", `${source.height}px`);
  flyoutEl.style.opacity = "1";
  flyoutEl.style.transform = "none";
  flyoutEl.classList.remove("is-moving");

  const targetRect = (targetShieldEl || targetEl).getBoundingClientRect();
  void flyoutEl.offsetWidth;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      flyoutEl.classList.add("is-moving");
      flyoutEl.style.opacity = "0.94";
      flyoutEl.style.left = `${targetRect.left - hostRect.left}px`;
      flyoutEl.style.top = `${targetRect.top - hostRect.top}px`;
      flyoutEl.style.width = `${targetRect.width}px`;
      flyoutEl.style.height = `${targetRect.height}px`;
    });
  });

  powerChoiceAnimationTimer = setTimeout(() => {
    completePowerChoiceSelectionAnimation();
  }, POWER_CHOICE_FLY_MS + 20);
}

function playPendingCheatChoiceAnimation() {
  const animation = state.cheatChoiceAnimating;
  if (!animation) {
    hideCheatChoiceFlyout();
    return;
  }

  if (animation.stage === "closing") {
    if (animation.started) return;
    animation.started = true;
    clearPendingCheatChoiceTimer();
    cheatChoiceAnimationTimer = setTimeout(() => {
      cheatChoiceAnimationTimer = null;
      if (!state.cheatChoiceAnimating || state.cheatChoiceAnimating !== animation) return;
      state.cheatChoiceAnimating.stage = "flying";
      state.cheatChoiceAnimating.started = false;
      render();
    }, CHEAT_CHOICE_CLOSE_MS);
    return;
  }

  if (animation.stage !== "flying" || animation.started) return;

  const flyoutEl = document.getElementById("cheat-choice-flyout");
  const cheatListEl = document.getElementById("cheat-list");
  if (!flyoutEl || !cheatListEl) return;

  animation.started = true;
  clearPendingCheatChoiceTimer();

  const rarity = animation.cheat?.rarity || "common";
  const title = animation.cheat?.name || "Cheat";
  const iconGlyph = getCheatIcon(title);
  const extraClass = animation.cheat?.id === "nudge_up" || animation.cheat?.id === "nudge_down"
    ? " nudge-cheat-button"
    : "";

  flyoutEl.className = `cheat-choice-flyout cheat-button ${rarity}${extraClass}`;
  flyoutEl.innerHTML = buildCheatButtonMarkup(title, iconGlyph, 0);
  flyoutEl.setAttribute("aria-hidden", "true");

  const source = animation.sourceRect;
  const hostRect = getChoiceFlyoutHostRect(flyoutEl);
  flyoutEl.style.left = `${source.left - hostRect.left}px`;
  flyoutEl.style.top = `${source.top - hostRect.top}px`;
  flyoutEl.style.removeProperty("width");
  flyoutEl.style.removeProperty("height");
  flyoutEl.style.setProperty("--flyout-width", `${source.width}px`);
  flyoutEl.style.setProperty("--flyout-height", `${source.height}px`);
  flyoutEl.style.opacity = "1";
  flyoutEl.style.transform = "none";
  flyoutEl.classList.remove("is-moving");

  const targetRect = getCheatChoiceFlyTargetRect(animation.targetEntryId, cheatListEl);
  if (!targetRect) return;
  void flyoutEl.offsetWidth;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      flyoutEl.classList.add("is-moving");
      flyoutEl.style.opacity = "0.92";
      flyoutEl.style.left = `${targetRect.left - hostRect.left}px`;
      flyoutEl.style.top = `${targetRect.top - hostRect.top}px`;
      flyoutEl.style.setProperty("--flyout-width", `${targetRect.width}px`);
      flyoutEl.style.setProperty("--flyout-height", `${targetRect.height}px`);
    });
  });

  cheatChoiceAnimationTimer = setTimeout(() => {
    completeCheatChoiceSelectionAnimation(animation.followup);
  }, CHEAT_CHOICE_FLY_MS + 20);
}

function renderCheats() {
  const cheatList = document.getElementById("cheat-list");
  if (!cheatList) return;
  const previousScrollLeft = cheatList.scrollLeft;

  if (cheatList.dataset.overflowInit !== "1") {
    cheatList.dataset.overflowInit = "1";
    cheatList.addEventListener("scroll", updateCheatOverflowIndicators, { passive: true });
    window.addEventListener("resize", updateCheatOverflowIndicators, { passive: true });
  }

  const previousCoinRects = new Map(
    Array.from(cheatList.querySelectorAll(".cheat-button[data-cheat-entry-id]"))
      .map((el) => [el.dataset.cheatEntryId, el.getBoundingClientRect()])
  );

  cheatList.innerHTML = "";

  const groupedEntries = [];
  const groupedCheats = new Map();

  const nudgeUpCount = Math.max(0, Number(state.nudgeUpCharges) || 0);
  const nudgeDownCount = Math.max(0, Number(state.nudgeDownCharges) || 0);

  if (false && nudgeDownCount > 0) {
    groupedEntries.push({
      kind: "nudge",
      id: "nudge_down",
      count: nudgeDownCount,
      direction: "down",
      icon: "↓",
      name: "Nudge -1",
      rarity: "common",
      description: isGreenDeckRun()
        ? "Shift the current card down by 1. Costs 1 energy."
        : "Shift the current card down by 1."
    });
  }

  if (false && nudgeUpCount > 0) {
    groupedEntries.push({
      kind: "nudge",
      id: "nudge_up",
      count: nudgeUpCount,
      direction: "up",
      icon: "↑",
      name: "Nudge +1",
      rarity: "common",
      description: isGreenDeckRun()
        ? "Shift the current card up by 1. Costs 1 energy."
        : "Shift the current card up by 1."
    });
  }

  state.cheats
    .filter((cheat) => cheat.id !== "nudge_up" && cheat.id !== "nudge_down")
    .forEach((cheat) => {
      const existing = groupedCheats.get(cheat.id);
      if (existing) {
        existing.count += 1;
        return;
      }

      groupedCheats.set(cheat.id, {
        kind: "cheat",
        id: cheat.id,
        count: 1,
        cheat,
      });
    });

  groupedEntries.push(...groupedCheats.values());
  const currentCheatCounts = new Map(groupedEntries.map((entry) => [entry.id, entry.count]));

  if (!groupedEntries.length) {
    appendCheatSlots(cheatList, 0);
    if (!state.cheatChoiceAnimating) {
      lastRenderedCheatCounts = currentCheatCounts;
      suppressNextCheatEntryIntroId = "";
    }
    return;
  }

  groupedEntries.forEach((entry) => {
    const btn = document.createElement("button");
    const rarity = entry.kind === "cheat" ? (entry.cheat.rarity || "common") : entry.rarity;
    const title = entry.kind === "cheat" ? entry.cheat.name : entry.name;
    const iconGlyph = entry.kind === "cheat" ? getCheatIcon(entry.cheat.name) : entry.icon;
    const tooltipBody = entry.kind === "cheat" ? getCheatDescription(entry.cheat) : entry.description;
    const tutorialCheatUseBlocked = typeof window.isTutorialBlockingCheatUse === "function"
      ? window.isTutorialBlockingCheatUse()
      : false;
    btn.className = `cheat-button ${rarity}${entry.kind === "nudge" ? " nudge-cheat-button" : ""}`;
    btn.dataset.cheatEntryId = entry.id;
    btn.disabled = tutorialCheatUseBlocked;
    const previousCount = lastRenderedCheatCounts.get(entry.id) || 0;
    const isFreshAward = previousCount <= 0 && entry.kind === "nudge" && suppressNextCheatEntryIntroId !== entry.id;
    const shouldPulseCount = previousCount > 0 && entry.count > previousCount && entry.count > 1;
    if (!state.cheatChoiceAnimating && isFreshAward) {
      btn.classList.add("is-awarded-new");
    }
    if (!state.cheatChoiceAnimating && shouldPulseCount) {
      btn.classList.add("has-count-pulse");
    }
    if (state.cheatChoiceAnimating?.stage === "flying" && state.cheatChoiceAnimating.targetEntryId === entry.id) {
      btn.classList.add("is-receive-target-hidden");
    }

    const countLabel = entry.kind === "nudge"
      ? `${entry.count} ${entry.count === 1 ? "charge" : "charges"}`
      : "";
    btn.innerHTML = buildCheatButtonMarkup(title, iconGlyph, entry.count, countLabel);

    let holdTimer = null;
    let held = false;

    btn.oncontextmenu = (e) => e.preventDefault();

    btn.onpointerdown = () => {
      held = false;
      holdTimer = setTimeout(() => {
        held = true;
        showTooltip(title, tooltipBody, btn);
        const tooltip = document.getElementById("cheat-tooltip");
        if (tooltip) tooltip.dataset.keepOpenOnce = "1";
      }, 300);
    };

    btn.onpointerup = () => {
      clearTimeout(holdTimer);
      if (!held) {
        setTimeout(hideCheatTooltip, 50);
      }
    };

    btn.onpointercancel = () => {
      clearTimeout(holdTimer);
      hideCheatTooltip(true);
    };

    btn.onpointerleave = () => {
      clearTimeout(holdTimer);
      if (!held) {
        hideCheatTooltip(true);
      }
    };

    btn.onclick = () => {
      if (held) return;
      hideCheatTooltip(true);
      if (typeof window.isTutorialBlockingCheatUse === "function" && window.isTutorialBlockingCheatUse()) {
        state.message = "Cheat use unlocks at the next tutorial step.";
        renderMessage();
        return;
      }
      if (state.gameOver || state.pendingRevealAnimation || state.pendingCheatOptions.length || state.pendingPowerOptions.length) return;
      if (state.sixSevenArmed) {
        state.message = "6/7 is armed — no other cheats or nudges can be used on this card.";
        render();
        return;
      }
      const now = Date.now();
      if (now < cheatUseLockedUntil) return;
      cheatUseLockedUntil = now + CHEAT_USE_BUFFER_MS;

      const useAfterOptionalDismiss = (action, shouldDiminish, shouldPulse = true) => {
        if (!shouldPulse) {
          action();
          return;
        }
        btn.classList.add(shouldDiminish ? "is-consuming" : "is-click-pulsing");
        btn.disabled = true;
        setTimeout(action, shouldDiminish ? 280 : 180);
      };

      if (entry.kind === "nudge") {
        const canAnimateNudge = typeof canUseNudge === "function" && canUseNudge(entry.direction);
        useAfterOptionalDismiss(() => useNudgeCharge(entry.direction), entry.count <= 1 && canAnimateNudge, canAnimateNudge);
        return;
      }

      const useCheat = () => {
        const result = entry.cheat.use();
        const didConsume = shouldConsumeCheatAfterUse(entry.cheat, result);
        state.message = result;
        appendRunDebugLog("cheat_used", {
          cheatId: entry.cheat.id,
          cheatName: entry.cheat.name,
          result,
          cheatsInHandBeforeConsume: state.cheats.map((heldCheat) => heldCheat.id),
          consumeOnUse: !!entry.cheat.consumeOnUse,
          didConsume,
          armedStatesAfterUse: {
            lucky7: !!state.lucky7Armed,
            fiveAlive: !!state.fiveAliveArmed,
            godSaveKing: !!state.godSaveKingArmed,
            alwaysBetBlack: !!state.alwaysBetBlackArmed,
            oddOneOut: !!state.oddOneOutArmed,
            cursedShield: !!state.cursedShieldArmed,
            suitedAndBooted: !!state.suitedAndBootedArmed,
            suitedAndBootedSuit: state.suitedAndBootedSuit || "",
            blankSpaceActive: !!state.blankSpaceActive,
            blankSpaceValue: Number.isFinite(state.blankSpaceValue) ? state.blankSpaceValue : null,
            forcedNextGuess: state.forcedNextGuess || "",
            lockCurrentCardForForcedGuess: !!state.lockCurrentCardForForcedGuess,
            sixSeven: !!state.sixSevenArmed,
            cheatACheaterRemaining: Number(state.cheatACheaterRemaining) || 0,
            wlStage: state.wlStage || "",
          },
        });
        if (didConsume) {
          const originalIndex = state.cheats.findIndex((c) => c.id === entry.cheat.id);
          if (originalIndex >= 0) removeCheatAt(originalIndex);
          state.cheatUsesOnCurrentCard = (state.cheatUsesOnCurrentCard || 0) + 1;
        }
        if (typeof window.handleTutorialCheatUsed === "function") {
          window.handleTutorialCheatUsed(entry.cheat, result);
        }
        render();
      };

      useAfterOptionalDismiss(useCheat, entry.cheat.consumeOnUse && entry.count <= 1, true);
    };

    cheatList.appendChild(btn);
  });

  appendCheatSlots(cheatList, groupedEntries.length);
  animateCheatCoinLayout(cheatList, previousCoinRects);
  window.requestAnimationFrame(() => {
    const maxScrollLeft = Math.max(0, cheatList.scrollWidth - cheatList.clientWidth);
    cheatList.scrollLeft = Math.max(0, Math.min(previousScrollLeft, maxScrollLeft));
    updateCheatOverflowIndicators();
  });
  if (!state.cheatChoiceAnimating) {
    lastRenderedCheatCounts = currentCheatCounts;
    suppressNextCheatEntryIntroId = "";
  }
}

function appendCheatSlots(cheatList, occupiedCount = 0) {
  if ((Number(occupiedCount) || 0) > 0) return;
  const slot = document.createElement("div");
  slot.className = "cheat-slot";
  slot.setAttribute("aria-hidden", "true");
  cheatList.appendChild(slot);
}

function animateCheatCoinLayout(cheatList, previousCoinRects) {
  if (!previousCoinRects?.size || window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;

  requestAnimationFrame(() => {
    cheatList.querySelectorAll(".cheat-button[data-cheat-entry-id]").forEach((coin) => {
      const previousRect = previousCoinRects.get(coin.dataset.cheatEntryId);
      if (!previousRect) return;

      const nextRect = coin.getBoundingClientRect();
      const deltaX = previousRect.left - nextRect.left;
      const deltaY = previousRect.top - nextRect.top;
      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;

      coin.animate(
        [
          { transform: `translate3d(${Math.round(deltaX)}px, ${Math.round(deltaY)}px, 0)` },
          { transform: "translate3d(0, 0, 0)" },
        ],
        {
          duration: 260,
          easing: "ease-in-out",
        }
      );
    });
  });
}

function showCheatTooltip(cheat, el) {
  showTooltip(cheat.name, getCheatDescription(cheat), el);
}

function hideCheatTooltip(force = false) {
  const tooltip = document.getElementById("cheat-tooltip");
  if (!tooltip) return;
  if (!force && tooltip.dataset.keepOpenOnce === "1") {
    delete tooltip.dataset.keepOpenOnce;
    return;
  }
  delete tooltip.dataset.keepOpenOnce;
  tooltip.classList.add("hidden");
}

window.hideCheatTooltip = hideCheatTooltip;

function getChoiceCurrentCard(mode = "cheat") {
  if (mode === "power" && Array.isArray(state.pendingRunDeck) && state.pendingRunDeck.length > 0) {
    return state.pendingRunDeck[0];
  }
  if (state.current) return state.current;
  return null;
}

function renderChoiceCurrentCard(el, mode = "cheat", label = "Current card") {
  if (!el) return;
  const card = getChoiceCurrentCard(mode);
  if (!card) {
    el.innerHTML = "";
    el.classList.add("hidden");
    return;
  }

  if (mode === "power") {
    const cardFaceClass = isJokerCard(card)
      ? "joker-card-face"
      : isRed(card)
        ? "red"
        : "black";
    const cardMarkup = renderCardFaceMarkup(card, card.value, false, false);
    el.innerHTML = `
      <div class="choice-current-card-label">${label}:</div>
      <div class="choice-current-card-visual card-face ${cardFaceClass}" aria-label="${label}: ${describeCard(card)}">
        ${cardMarkup}
      </div>
    `;
  } else {
    el.innerText = `${label}: ${describeCard(card)}`;
  }
  el.classList.remove("hidden");
}

function renderCheatChoice() {
  const container = document.getElementById("cheat-choice-container");
  const list = document.getElementById("cheat-choice-list");
  const infoEl = document.getElementById("cheat-choice-info");

  if (!container || !list || !infoEl) return;

  list.innerHTML = "";
  container.classList.remove("is-closing", "is-flying");

  const animation = state.cheatChoiceAnimating;
  const choiceOptions = state.pendingCheatOptions.length
    ? state.pendingCheatOptions
    : Array.isArray(animation?.optionsSnapshot)
      ? animation.optionsSnapshot
      : [];

  if (!choiceOptions.length) {
    document.body.classList.remove("choice-modal-open", "cheat-choice-open");
    container.classList.add("hidden");
    container.setAttribute("aria-hidden", "true");
    renderCheatChoiceInfo(infoEl, null, "");
    return;
  }

  document.body.classList.remove("power-choice-open");
  document.body.classList.add("choice-modal-open", "cheat-choice-open");
  container.classList.remove("hidden");
  container.setAttribute("aria-hidden", "false");

  if (animation?.stage === "closing") {
    container.classList.add("is-closing");
  } else if (animation?.stage === "flying") {
    container.classList.add("is-flying");
  }

  const tutorialChoiceLocked = typeof window.isTutorialBlockingCheatChoice === "function"
    ? window.isTutorialBlockingCheatChoice()
    : false;
  const choiceLocked = Date.now() < (state.cheatChoiceLockedUntil || 0) || tutorialChoiceLocked;
  const introToken = String(state.cheatChoiceIntroToken || 0);
  const introFresh = list.dataset.introToken !== introToken;
  list.dataset.introToken = introToken;
  const previewIndex = animation ? animation.selectedIndex : state.cheatChoicePreviewIndex;

  choiceOptions.forEach((cheat, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `choice-card cheat-choice-card cheat-button ${cheat.rarity || "common"} ${introFresh && !animation ? "choice-intro" : ""}`.trim();
    btn.disabled = choiceLocked || !!animation;
    btn.style.setProperty("--choice-index", String(i));
    btn.dataset.choiceIndex = String(i);
    btn.innerHTML = buildCheatButtonMarkup(cheat.name, getCheatIcon(cheat.name), 0);

    if (previewIndex === i) {
      btn.classList.add("is-previewed");
    }
    if (animation) {
      if (animation.selectedIndex === i) {
        btn.classList.add("is-selected-ghost");
      } else {
        btn.classList.add("is-dismissing");
      }
    }

    btn.onmouseenter = () => {
      if (!canUseHoverTooltips()) return;
      if (choiceLocked || state.cheatChoiceAnimating) return;
      state.cheatChoicePreviewIndex = i;
      cheatChoiceConfirmIndex = -1;
      cheatChoiceConfirmAfter = 0;
      list.querySelectorAll(".cheat-choice-card.is-previewed").forEach((el) => {
        el.classList.remove("is-previewed");
      });
      btn.classList.add("is-previewed");
      renderCheatChoiceInfo(infoEl, cheat, "");
    };

    btn.onclick = () => {
      if (choiceLocked || state.cheatChoiceAnimating) return;
      if (state.cheatChoicePreviewIndex !== i) {
        state.cheatChoicePreviewIndex = i;
        cheatChoiceConfirmIndex = i;
        cheatChoiceConfirmAfter = Date.now() + CHEAT_CHOICE_CONFIRM_BUFFER_MS;
        render();
        return;
      }
      if (cheatChoiceConfirmIndex === i && Date.now() < cheatChoiceConfirmAfter) return;
      beginCheatChoiceSelection(i, btn);
    };

    list.appendChild(btn);
  });

  renderCheatChoiceInfo(
    infoEl,
    Number.isInteger(previewIndex) && previewIndex >= 0 ? choiceOptions[previewIndex] : null,
    "Tap a cheat to read the description."
  );

  if (animation) {
    infoEl.classList.add("is-dismissing");
  } else {
    infoEl.classList.remove("is-dismissing");
  }

  if (choiceLocked) {
    window.setTimeout(render, Math.max(0, (state.cheatChoiceLockedUntil || 0) - Date.now()));
  }
}

function renderPowerChoice() {
  const container = document.getElementById("power-choice-container");
  const list = document.getElementById("power-choice-list");
  const titleEl = document.getElementById("power-choice-title");
  const currentCardEl = document.getElementById("power-choice-current-card");
  const footerEl = document.getElementById("power-choice-footer");

  if (!container || !list) return;

  list.innerHTML = "";
  container.classList.remove("is-closing", "is-flying");
  const animation = state.powerChoiceAnimating;
  const choiceOptions = state.pendingPowerOptions.length
    ? state.pendingPowerOptions
    : Array.isArray(animation?.optionsSnapshot)
      ? animation.optionsSnapshot
      : [];
  list.dataset.count = String(choiceOptions.length || 0);

  if (!choiceOptions.length) {
    document.body.classList.remove("choice-modal-open", "power-choice-open");
    container.classList.add("hidden");
    container.setAttribute("aria-hidden", "true");
    if (currentCardEl) {
      currentCardEl.innerText = "";
      currentCardEl.classList.add("hidden");
    }
    return;
  }

  document.body.classList.remove("cheat-choice-open");
  document.body.classList.add("choice-modal-open", "power-choice-open");
  container.classList.remove("hidden");
  container.setAttribute("aria-hidden", "false");

  if (animation?.stage === "closing") {
    container.classList.add("is-closing");
  } else if (animation?.stage === "flying") {
    container.classList.add("is-flying");
  }

  if (titleEl) {
    titleEl.innerText = state.activePowerAwardReason ? "Choose Your Bonus Power" : "Choose Your Power";
  }
  if (footerEl) {
    footerEl.innerText = "";
    footerEl.hidden = true;
  }
  const powerCardLabel = state.activePowerAwardReason ? "Current card" : "Starting card";
  renderChoiceCurrentCard(currentCardEl, "power", powerCardLabel);

  const tutorialChoiceLocked = typeof window.isTutorialBlockingPowerPick === "function"
    ? window.isTutorialBlockingPowerPick()
    : false;
  const choiceLocked = Date.now() < (state.powerChoiceLockedUntil || 0) || tutorialChoiceLocked;
  const introToken = String(state.powerChoiceIntroToken || 0);
  const introFresh = list.dataset.introToken !== introToken;
  list.dataset.introToken = introToken;

  choiceOptions.forEach((power, i) => {
    const option = document.createElement("div");
    option.className = `power-choice-option ${power.rarity || "common"} ${introFresh ? "choice-intro" : ""}`.trim();
    option.style.setProperty("--choice-index", String(i));

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `choice-card power-choice-card ${power.rarity || "common"}`.trim();
    btn.disabled = choiceLocked || !!animation;
    btn.setAttribute("aria-describedby", `power-choice-desc-${i}`);
    btn.innerHTML = buildPowerChoiceShieldMarkup(power);

    const desc = document.createElement("div");
    desc.className = "choice-desc";
    desc.id = `power-choice-desc-${i}`;
    const powerDescription = getPowerDescription(power, {
      deckKey: state.pendingDeckKey || state.selectedDeckKey || loadSelectedDeck(),
      levelNumber: state.pendingLevelNumber || state.selectedLevelNumber || loadSelectedLevel(),
    });
    desc.innerText = powerDescription;

    if (animation) {
      if (animation.selectedIndex === i) {
        option.classList.add("is-selected-ghost");
      } else if (animation.stage === "flying") {
        option.classList.add("is-dismissed");
      } else {
        option.classList.add("is-dismissing");
      }
    }

    let powerHoldTimer = null;
    let powerHeld = false;

    const showPowerTooltip = () => {
      showTooltip(power.name, powerDescription, btn);
    };

    btn.oncontextmenu = (e) => e.preventDefault();

    btn.onpointerdown = () => {
      powerHeld = false;
      powerHoldTimer = setTimeout(() => {
        powerHeld = true;
        showPowerTooltip();
        const tooltip = document.getElementById("cheat-tooltip");
        if (tooltip) tooltip.dataset.keepOpenOnce = "1";
      }, 300);
    };

    btn.onpointerup = () => {
      clearTimeout(powerHoldTimer);
      if (!powerHeld) {
        setTimeout(hideCheatTooltip, 50);
      }
    };

    btn.onpointercancel = () => {
      clearTimeout(powerHoldTimer);
      hideCheatTooltip(true);
    };

    btn.onpointerleave = () => {
      clearTimeout(powerHoldTimer);
      if (!powerHeld) {
        hideCheatTooltip(true);
      }
    };

    btn.onclick = () => {
      if (powerHeld) return;
      if (choiceLocked || state.powerChoiceAnimating) return;
      hideCheatTooltip(true);
      beginPowerChoiceSelection(i, btn);
    };

    option.appendChild(btn);
    option.appendChild(desc);
    list.appendChild(option);
  });

  if (choiceLocked) {
    window.setTimeout(render, Math.max(0, (state.powerChoiceLockedUntil || 0) - Date.now()));
  }
}

function renderSeenGrid() {
  const gridWrapEl = document.getElementById("seen-grid-wrap");
  const grid = document.getElementById("seen-grid");
  const labelEl = document.getElementById("seen-grid-label");
  if (!grid || !gridWrapEl) return;

  gridWrapEl.hidden = false;

  grid.innerHTML = "";
  const foundCount = state.seenCardIds instanceof Set ? state.seenCardIds.size : 0;

  if (labelEl) {
    setAnimatedText(labelEl, `FOUND: ${foundCount}/52`);
  }

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const card = {
        id: getCardId(suit, rank.r),
        suit,
        rank: rank.r,
        value: rank.v,
      };
      const cardId = getCardId(suit, rank.r);
      const seen = state.seenCardIds.has(cardId);
      const isFresh = state.recentlySeenCardId === cardId;
      const cell = document.createElement("div");
      cell.className = `grid-cell ${seen ? "seen" : ""} ${isFresh ? "fresh" : ""} ${isRed(card) ? "red" : "black"}`.trim();
      cell.setAttribute("aria-label", `${describeCard(card)} ${seen ? "found" : "not found"}`);
      if (seen) {
        if (document.body.dataset.visuals === "new") {
          const rank = document.createElement("span");
          rank.className = "memory-card-rank";
          rank.innerText = card.rank;
          const suit = document.createElement("span");
          suit.className = "memory-card-suit";
          suit.dataset.suit = card.suit;
          suit.setAttribute("aria-hidden", "true");
          cell.appendChild(rank);
          cell.appendChild(suit);
        } else {
          const label = document.createElement("span");
          label.className = "memory-card-label";
          label.innerText = `${card.rank}${card.suit}`;
          cell.appendChild(label);
        }
      }
      grid.appendChild(cell);
    }
  }

  let note = document.getElementById("seen-grid-note");
  if (!note) {
    note = document.createElement("div");
    note.id = "seen-grid-note";
    grid.insertAdjacentElement("afterend", note);
  }

  note.className = "seen-grid-note";
  note.hidden = true;
  note.innerText = "";
}

function renderMessage() {
  const el = document.getElementById("message-bar");
  if (!el) return;

  el.classList.remove("is-game-over");
  el.dataset.messageDensity = "normal";

  if (state.gameOver) {
    el.innerText = "GAME OVER";
    el.classList.add("has-message", "is-game-over");
    return;
  }

  if (!state.message) {
    el.innerText = "";
    el.classList.remove("has-message");
    return;
  }

  el.innerText = state.message;
  el.classList.add("has-message");
  const densitySteps = ["normal", "compact", "tight"];
  for (const density of densitySteps) {
    el.dataset.messageDensity = density;
    if (el.scrollHeight <= el.clientHeight + 2) {
      return;
    }
  }
  el.dataset.messageDensity = "scroll";
}

function renderNextInfo() {
  const el = document.getElementById("next-info");
  if (!el) return;
  el.innerText = "";
}

function render() {
  if (!state.gameOver && state.gameOverDisplayCards) {
    state.gameOverDisplayCards = null;
  }

  renderScores();
  renderHeaderStatus();
  renderStartPowerSelector();
  renderCheatGuide();
  renderActivePowers();
  renderCurrentCard();
  renderNudgeControls();
  renderFaceDownDeck();
  renderButtons();
  renderHandCard();
  renderCheats();
  renderCheatChoice();
  renderPowerChoice();
  renderSeenGrid();
  renderRestartButton();
  renderMessage();
  renderNextInfo();
  playPendingCardRevealAnimation();
  playPendingCheatChoiceAnimation();
  playPendingPowerChoiceAnimation();
}
