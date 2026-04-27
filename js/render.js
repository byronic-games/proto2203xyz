function getDeckBackColor(deckKey) {
  const normalizedDeck = normalizeDeckKey(deckKey || "blue");
  if (normalizedDeck === "red") return "pink";
  if (normalizedDeck === "green") return "green";
  return "blue";
}

let revealAnimationResetTimer = null;
let revealGameOverTimer = null;
const REVEAL_FLIP_MS = 280;
const REVEAL_HOLD_MS = 140;
const REVEAL_PROMOTE_MS = 240;

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
  el.classList.remove("reveal-flip", "reveal-promote", "reveal-settle", "reveal-fail");
}

function playPendingCardRevealAnimation() {
  const pending = state.pendingRevealAnimation;
  if (!pending) return;

  const currentCardEl = document.getElementById("current-card");
  const faceDownDeckEl = document.getElementById("face-down-deck");
  if (!currentCardEl || !faceDownDeckEl) return;
  const effectClass = getRevealEffectClass(pending.effectId);

  if (pending.phase === "revealing") {
    if (pending.started) return;

    pending.started = true;
    clearPendingRevealTimers();
    clearGameOverEffects();
    removeRevealStateClasses(currentCardEl);
    removeRevealStateClasses(faceDownDeckEl);
    faceDownDeckEl.style.animation = "none";
    void faceDownDeckEl.offsetWidth;
    faceDownDeckEl.style.animation = "";
    faceDownDeckEl.classList.add("reveal-flip");
    if (effectClass) {
      faceDownDeckEl.classList.add(effectClass);
    }

    revealAnimationResetTimer = setTimeout(() => {
      revealAnimationResetTimer = null;
      if (!state.pendingRevealAnimation || state.pendingRevealAnimation.id !== pending.id) return;
      state.pendingRevealAnimation.phase = "promoting";
      state.pendingRevealAnimation.started = false;
      render();
    }, REVEAL_FLIP_MS + REVEAL_HOLD_MS);
    return;
  }

  if (pending.phase !== "promoting" || pending.started) return;

  pending.started = true;
  clearPendingRevealTimers();
  removeRevealStateClasses(faceDownDeckEl);
  removeRevealStateClasses(currentCardEl);
  currentCardEl.style.animation = "none";
  void currentCardEl.offsetWidth;
  currentCardEl.style.animation = "";
  currentCardEl.classList.add("reveal-promote");
  if (pending.outcome === "wrong") {
    currentCardEl.classList.add("reveal-fail");
  } else {
    currentCardEl.classList.add("reveal-settle");
  }
  if (effectClass) {
    currentCardEl.classList.add(effectClass);
  }

  revealAnimationResetTimer = setTimeout(() => {
    removeRevealStateClasses(currentCardEl);
    removeRevealStateClasses(faceDownDeckEl);
    const feedbackEffect = pending.feedbackEffect || pending.outcome;
    if (feedbackEffect === "correct" || feedbackEffect === "wrong") {
      if (typeof setCurrentCardFeedback === "function") setCurrentCardFeedback(feedbackEffect);
      if (typeof flashGameShell === "function") flashGameShell(feedbackEffect);
    }
    if (state.pendingRevealAnimation && state.pendingRevealAnimation.id === pending.id) {
      state.pendingRevealAnimation = null;
    }
    revealAnimationResetTimer = null;
    render();
  }, REVEAL_PROMOTE_MS + 110);

  if (pending.triggerGameOver && state.gameOver) {
    clearGameOverEffects();
    revealGameOverTimer = setTimeout(() => {
      triggerGameOverEffect(pending.gameOverDetail || state.message || "");
      revealGameOverTimer = null;
    }, REVEAL_PROMOTE_MS + 40);
  }
}

function renderScores() {
  const scoreEl = document.getElementById("score");
  const bestScoreEl = document.getElementById("best-score");
  const streakEl = document.getElementById("current-streak");
  const activeDeckKey = normalizeDeckKey(
    state.currentDeckKey || state.selectedDeckKey || loadSelectedDeck()
  );
  const bestDeckKey = state.gameOver
    ? normalizeDeckKey(state.selectedDeckKey || loadSelectedDeck())
    : normalizeDeckKey(state.currentDeckKey || state.selectedDeckKey || loadSelectedDeck());
  const bestLevelNumber = state.gameOver
    ? normalizeLevelNumber(state.selectedLevelNumber || loadSelectedLevel())
    : normalizeLevelNumber(state.currentLevelNumber || state.selectedLevelNumber || loadSelectedLevel());

  state.bestScore = loadBestScore(bestDeckKey, bestLevelNumber);
  if (scoreEl) setAnimatedText(scoreEl, getDisplayedRunScore());
  if (bestScoreEl) setAnimatedText(bestScoreEl, state.bestScore);
  if (streakEl) {
    const showEnergy = activeDeckKey === "green";
    streakEl.innerText = showEnergy ? `Energy ${Math.max(0, Number(state.energy) || 0)}` : "";
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
  const seedInput = document.getElementById("run-seed-input");
  const runStatusEl = document.getElementById("header-run-status");
  const runTitleEl = document.getElementById("header-run-title");
  const runPowerEl = document.getElementById("header-run-power");
  const hasActiveRun = !state.gameOver && !!state.current;
  const runDeckName = getDeckName(state.currentDeckKey || state.selectedDeckKey || "blue");
  const runLevelNumber = normalizeLevelNumber(state.currentLevelNumber || state.selectedLevelNumber || loadSelectedLevel());
  const runPowerName = getPowerName(state.selectedStartPowerId);
  const runDeckKey = state.currentDeckKey || state.selectedDeckKey || "blue";
  const runPowerTooltipBody = buildHeaderPowerTooltipBody(runDeckKey, runLevelNumber);

  if (runStatusEl && runTitleEl && runPowerEl) {
    if (hasActiveRun) {
      runTitleEl.innerText = `${runDeckName} Deck - Level ${runLevelNumber}`;
      runPowerEl.innerText = `Starting Power: ${runPowerName}`;
      runStatusEl.hidden = false;
      runStatusEl.classList.toggle("has-power-tooltip", !!runPowerTooltipBody);
    } else {
      runTitleEl.innerText = "";
      runPowerEl.innerText = "";
      runStatusEl.hidden = true;
      runStatusEl.classList.remove("has-power-tooltip");
    }

    setupHeaderPowerTooltip(runStatusEl, {
      enabled: hasActiveRun && !!runPowerTooltipBody,
      title: `${runDeckName} Deck - Level ${runLevelNumber} Starting Power: ${runPowerName}`,
      description: runPowerTooltipBody,
    });
  }

  if (seedInput && !seedInput.dataset.initialized) {
    seedInput.value = state.runSeed || loadLastRunSeed() || randomSeedString();
    seedInput.dataset.initialized = "true";
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

  el.addEventListener("pointerdown", () => {
    if (el.dataset.tooltipEnabled !== "1") return;
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => {
      showTooltip(el.dataset.tooltipTitle, el.dataset.tooltipBody, el);
    }, 300);
  });

  el.addEventListener("pointerup", clearHold);
  el.addEventListener("pointercancel", clearHold);
  el.addEventListener("pointerleave", clearHold);
  el.addEventListener("mouseleave", clearHold);

  el.dataset.tooltipInit = "1";
  el.dataset.tooltipRole = "header-power";
  el.dataset.tooltipEnabled = payload?.enabled ? "1" : "0";
  el.dataset.tooltipTitle = payload?.title || "";
  el.dataset.tooltipBody = payload?.description || "";
}

function getCheatIcon(name) {
  name = name.toLowerCase();

  if (name.includes("peek")) return "👁️";
  if (name.includes("skip")) return "⏭️";
  if (name.includes("hint")) return "💡";
  if (name.includes("swap")) return "🃏";
  if (name.includes("tear")) return "✂️";
  if (name.includes("nudge")) return "↕️";
  if (name.includes("energy")) return "🔋";
  if (name.includes("chance")) return "🎲";
  if (name.includes("lucky")) return "7️⃣";

  return "✨";
}

function renderRestartButton() {
  const btn = document.getElementById("restart-btn");
  if (!btn) return;

  const runIsActive = !state.gameOver && !!state.current;
  btn.innerText =
    runIsActive && state.restartConfirmArmed ? "Confirm Restart" : "Start Run";
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
  const showShieldBadge = !!options.showShieldBadge;
  const shownRank = isTemporarilyModified ? valueToRank(displayValue) : card.rank;
  const shownLabel = `${shownRank}${card.suit}`;
  return `
    <span class="card-face-label">${shownLabel}</span>
    ${isTemporarilyModified ? '<span class="card-temp-chip">TEMP</span>' : ""}
    ${showShieldBadge ? '<span class="card-shield-badge" aria-label="Cursed Shield active" title="Cursed Shield active">🛡️</span>' : ""}
    ${includeTornCorner ? '<span class="tear-mark-face"></span>' : ""}
  `;
}

function renderCurrentCard() {
  const currentCardEl = document.getElementById("current-card");
  const currentValueEl = document.getElementById("current-effective-value");

  if (!currentCardEl || !currentValueEl) return;

  const pendingReveal = state.pendingRevealAnimation;
  const showPreRevealCard =
    !!pendingReveal &&
    pendingReveal.phase === "revealing" &&
    !!pendingReveal.fromCard;
  const showPromotedTrueCard =
    !!pendingReveal &&
    pendingReveal.phase === "promoting" &&
    !!pendingReveal.revealCard &&
    !!state.current &&
    pendingReveal.revealCard.id === state.current.id;
  const cardToRender = showPreRevealCard
    ? pendingReveal.fromCard
    : showPromotedTrueCard
      ? pendingReveal.revealCard
      : state.current;

  if (!cardToRender) {
    const idleBackColor = getDeckBackColor(state.currentDeckKey || state.selectedDeckKey);
    currentCardEl.className = `card-back card-back-${idleBackColor}`;
    currentCardEl.innerHTML = `<div class="card-back-symbol">🂠</div>`;
    currentValueEl.innerText = "";
    return;
  }

  const backStatus = getCardBackStatus(cardToRender.id);
  const effectiveValue = showPreRevealCard
    ? pendingReveal.fromEffectiveValue
    : showPromotedTrueCard
      ? cardToRender.value
      : getCurrentEffectiveValue();
  const isTemporarilyModified = showPreRevealCard
    ? !!pendingReveal.fromIsTemp
    : showPromotedTrueCard
      ? false
      : effectiveValue !== cardToRender.value;
  const feedbackClass = state.currentCardFeedback
    ? `feedback-${state.currentCardFeedback}`
    : "";

  currentCardEl.className = `card-face ${isRed(cardToRender) ? "red" : "black"} ${backStatus.tornCorner ? "torn-corner-face" : ""} ${isTemporarilyModified ? "temporary-value" : ""} ${feedbackClass}`.trim();
  currentCardEl.innerHTML = renderCardFaceMarkup(
    cardToRender,
    effectiveValue,
    isTemporarilyModified,
    backStatus.tornCorner,
    {
      showShieldBadge: !!state.cursedShieldArmed,
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
  const totalDirectionalNudges = totalUpAmount + totalDownAmount;
  const upSplitPercent = totalDirectionalNudges
    ? Math.round((totalUpAmount / totalDirectionalNudges) * 100)
    : 50;

  return {
    seenCount: blueFaceUpUses,
    nudgedCount: blueNudgedUses,
    nudgedPercent: formatNudgedPercentage(blueNudgedUses, blueFaceUpUses),
    upTotal: totalUpAmount,
    downTotal: totalDownAmount,
    upSplitPercent,
    downSplitPercent: 100 - upSplitPercent,
  };
}

function getRedDeckStatsTooltipBody(entry) {
  const summary = getRedDeckStatsSummary(entry);
  return [
    "Seen: times this card has been face up in Blue runs.",
    `Nudged: percentage of those face-up turns where players nudged it at least once (${summary.nudgedCount}/${summary.seenCount}).`,
    "Chart: split of the total upward vs downward nudge amount applied while this card was face up.",
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

  if (!upBtn || !downBtn || !upCountEl || !downCountEl) return;

  const upCount = state.nudgeUpCharges || 0;
  const downCount = state.nudgeDownCharges || 0;

  upCountEl.innerText = String(upCount);
  downCountEl.innerText = String(downCount);

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

  upBtn.disabled = isBlocked || !canUseNudge("up");
  downBtn.disabled = isBlocked || !canUseNudge("down");
}

function renderFaceDownDeck() {
  const deckEl = document.getElementById("face-down-deck");
  const countEl = document.getElementById("face-down-count");
  const remainingValueEl = document.getElementById("cards-remaining-value");

  if (!deckEl || !countEl) return;

  if (!state.current) {
    deckEl.innerHTML = "";
    const idleDeckBackColor = getDeckBackColor(state.currentDeckKey || state.selectedDeckKey);
    deckEl.className = `card-back card-back-${idleDeckBackColor}`;
    deckEl.removeAttribute("data-back-color");
    countEl.innerText = "";
    if (remainingValueEl) remainingValueEl.innerText = "00";
    return;
  }

  const pendingReveal = state.pendingRevealAnimation;
  if (
    pendingReveal &&
    pendingReveal.phase === "revealing" &&
    pendingReveal.revealCard
  ) {
    const revealCard = pendingReveal.revealCard;
    const revealStatus = getCardBackStatus(revealCard.id);
    const revealValue = Number.isFinite(pendingReveal.revealEffectiveValue)
      ? pendingReveal.revealEffectiveValue
      : revealCard.value;
    const revealIsTemp = !!pendingReveal.revealIsTemp;

    deckEl.className = `card-face ${isRed(revealCard) ? "red" : "black"} ${revealStatus.tornCorner ? "torn-corner-face" : ""} ${revealIsTemp ? "temporary-value" : ""}`.trim();
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
    countEl.innerText = "";
    if (remainingValueEl) {
      setAnimatedText(remainingValueEl, String(remainingCount).padStart(2, "0"));
    }
    return;
  }

  const next = peekNext();
  const backStatus = next
    ? getCardBackStatus(next.id)
    : { tornCorner: false, backColor: "blue" };

  const backColor = getDeckBackColor(state.currentDeckKey);
  const shouldShowDeckStatsInline = !!next && normalizeDeckKey(state.currentDeckKey) === "red";

  deckEl.className = shouldShowDeckStatsInline
    ? `card-face red card-stats-face ${backStatus.tornCorner ? "torn-corner-face" : ""}`.trim()
    : `card-back card-back-${backColor} ${backStatus.tornCorner ? "torn-corner" : ""}`.trim();
  deckEl.setAttribute("data-back-color", backColor);
  deckEl.innerHTML = "";

  if (!shouldShowDeckStatsInline) {
    const symbol = document.createElement("div");
    symbol.className = "card-back-symbol";
    symbol.innerText = "🂠";
    deckEl.appendChild(symbol);
  }

  if (backStatus.tornCorner) {
    const tear = document.createElement("div");
    tear.className = shouldShowDeckStatsInline ? "tear-mark-face" : "tear-mark";
    deckEl.appendChild(tear);
  }

  if (shouldShowDeckStatsInline) {
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
      <div class="card-back-stats-chart-wrap">
        <div
          class="card-back-stats-chart"
          style="--split-angle:${statsSummary.upSplitPercent * 3.6}deg;"
          aria-hidden="true"
        >
          <div class="card-back-stats-chart-hole"></div>
        </div>
      </div>
      <div class="card-back-stats-legend">
        <div class="card-back-stats-legend-item">
          <span class="card-back-stats-legend-label">Up</span>
          <span class="card-back-stats-legend-value">${statsSummary.upTotal}</span>
        </div>
        <div class="card-back-stats-legend-item">
          <span class="card-back-stats-legend-label">Down</span>
          <span class="card-back-stats-legend-value">${statsSummary.downTotal}</span>
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
  countEl.innerText = "";
  if (remainingValueEl) {
    setAnimatedText(remainingValueEl, String(remainingCount).padStart(2, "0"));
  }
}

function renderButtons() {
  const higherBtn = document.getElementById("higher-btn");
  const lowerBtn = document.getElementById("lower-btn");
  if (!higherBtn || !lowerBtn) return;

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
      !!state.pendingRevealAnimation ||
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
    !!state.pendingRevealAnimation ||
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

function renderCheats() {
  const cheatList = document.getElementById("cheat-list");
  if (!cheatList) return;

  cheatList.innerHTML = "";

  const visibleCheats = state.cheats.filter(
    (cheat) => cheat.id !== "nudge_up" && cheat.id !== "nudge_down"
  );

  if (!visibleCheats.length) {
    cheatList.innerHTML = `<div class=\"cheat-button common\" style=\"opacity:0.5;\">No Cheats</div>`;
    return;
  }

  visibleCheats.forEach((cheat) => {
    const btn = document.createElement("button");
    btn.className = `cheat-button ${cheat.rarity || "common"}`;
    const tutorialCheatUseBlocked = typeof window.isTutorialBlockingCheatUse === "function"
      ? window.isTutorialBlockingCheatUse()
      : false;
    btn.disabled = tutorialCheatUseBlocked;

    btn.innerHTML = `
      <div class=\"cheat-icon\">${getCheatIcon(cheat.name)}</div>
      <div class=\"cheat-name\">${cheat.name}</div>
    `;

    let holdTimer = null;
    let held = false;

    btn.onpointerdown = (e) => {
      held = false;
      if (e.pointerType === "mouse") return;

      holdTimer = setTimeout(() => {
        held = true;
        showCheatTooltip(cheat, btn);
      }, 300);
    };

    btn.onpointerup = () => {
      clearTimeout(holdTimer);
      setTimeout(hideCheatTooltip, 50);
    };

    btn.onpointercancel = () => {
      clearTimeout(holdTimer);
      hideCheatTooltip();
    };

    btn.onpointerleave = () => {
      clearTimeout(holdTimer);
      hideCheatTooltip();
    };

    btn.onmouseenter = () => {
      showCheatTooltip(cheat, btn);
    };

    btn.onmouseleave = () => {
      hideCheatTooltip();
    };

    btn.onclick = () => {
      if (held) return;
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
      const result = cheat.use();
      state.message = result;
      appendRunDebugLog("cheat_used", {
        cheatId: cheat.id,
        cheatName: cheat.name,
        result,
        cheatsInHandBeforeConsume: state.cheats.map((heldCheat) => heldCheat.id),
        consumeOnUse: !!cheat.consumeOnUse,
        armedStatesAfterUse: {
          lucky7: !!state.lucky7Armed,
          fiveAlive: !!state.fiveAliveArmed,
          godSaveKing: !!state.godSaveKingArmed,
          alwaysBetBlack: !!state.alwaysBetBlackArmed,
          oddOneOut: !!state.oddOneOutArmed,
          cursedShield: !!state.cursedShieldArmed,
          suitedAndBooted: !!state.suitedAndBootedArmed,
          suitedAndBootedSuit: state.suitedAndBootedSuit || "",
          forcedNextGuess: state.forcedNextGuess || "",
          lockCurrentCardForForcedGuess: !!state.lockCurrentCardForForcedGuess,
          sixSeven: !!state.sixSevenArmed,
          cheatACheaterRemaining: Number(state.cheatACheaterRemaining) || 0,
        },
      });
      if (cheat.consumeOnUse) {
        const originalIndex = state.cheats.findIndex((c) => c === cheat);
        if (originalIndex >= 0) removeCheatAt(originalIndex);
        state.cheatUsesOnCurrentCard = (state.cheatUsesOnCurrentCard || 0) + 1;
      }
      if (typeof window.handleTutorialCheatUsed === "function") {
        window.handleTutorialCheatUsed(cheat, result);
      }
      render();
    };

    cheatList.appendChild(btn);
  });
}

function showCheatTooltip(cheat, el) {
  showTooltip(cheat.name, getCheatDescription(cheat), el);
}

function hideCheatTooltip() {
  const tooltip = document.getElementById("cheat-tooltip");
  if (!tooltip) return;
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

function renderChoiceCurrentCard(el, mode = "cheat") {
  if (!el) return;
  const card = getChoiceCurrentCard(mode);
  if (!card) {
    el.innerText = "";
    el.classList.add("hidden");
    return;
  }
  el.innerText = `Current card: ${describeCard(card)}`;
  el.classList.remove("hidden");
}

function renderCheatChoice() {
  const container = document.getElementById("cheat-choice-container");
  const list = document.getElementById("cheat-choice-list");
  const currentCardEl = document.getElementById("cheat-choice-current-card");

  if (!container || !list) return;

  list.innerHTML = "";

  if (!state.pendingCheatOptions.length) {
    container.classList.add("hidden");
    container.setAttribute("aria-hidden", "true");
    if (currentCardEl) {
      currentCardEl.innerText = "";
      currentCardEl.classList.add("hidden");
    }
    return;
  }

  container.classList.remove("hidden");
  container.setAttribute("aria-hidden", "false");
  renderChoiceCurrentCard(currentCardEl, "cheat");

  const tutorialChoiceLocked = typeof window.isTutorialBlockingCheatChoice === "function"
    ? window.isTutorialBlockingCheatChoice()
    : false;
  const choiceLocked = Date.now() < (state.cheatChoiceLockedUntil || 0) || tutorialChoiceLocked;
  const introToken = String(state.cheatChoiceIntroToken || 0);
  const introFresh = list.dataset.introToken !== introToken;
  list.dataset.introToken = introToken;

  state.pendingCheatOptions.forEach((cheat, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `choice-card ${cheat.rarity || "common"} ${introFresh ? "choice-intro" : ""}`.trim();
    btn.disabled = choiceLocked;
    btn.style.setProperty("--choice-index", String(i));

    const top = document.createElement("div");
    top.className = "choice-top";

    const icon = document.createElement("div");
    icon.className = "choice-icon";
    icon.innerText = getCheatIcon(cheat.name);

    const name = document.createElement("div");
    name.className = "choice-name";
    name.innerText = cheat.name;

    const rarity = document.createElement("div");
    rarity.className = "choice-rarity";
    rarity.innerText = (cheat.rarity || "common").replace(/^\w/, (c) => c.toUpperCase());

    top.appendChild(icon);
    top.appendChild(name);
    top.appendChild(rarity);

    const desc = document.createElement("div");
    desc.className = "choice-desc";
    desc.innerText = getCheatDescription(cheat);

    const tag = document.createElement("div");
    tag.className = "choice-tag";
    tag.innerText = "Tap to select";

    btn.appendChild(top);
    btn.appendChild(desc);
    btn.appendChild(tag);

    btn.onclick = () => {
      pickCheatFromChoice(i);
    };

    list.appendChild(btn);
  });

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
  list.dataset.count = String(state.pendingPowerOptions.length || 0);

  if (!state.pendingPowerOptions.length) {
    container.classList.add("hidden");
    container.setAttribute("aria-hidden", "true");
    if (currentCardEl) {
      currentCardEl.innerText = "";
      currentCardEl.classList.add("hidden");
    }
    return;
  }

  container.classList.remove("hidden");
  container.setAttribute("aria-hidden", "false");

  if (titleEl) {
    titleEl.innerText = state.activePowerAwardReason ? "Choose Your Bonus Power" : "Choose Your Power";
  }
  if (footerEl) {
    footerEl.innerText = state.activePowerAwardReason ? "Pick 1 power to gain." : "Pick 1 before the run begins.";
  }
  renderChoiceCurrentCard(currentCardEl, "power");

  const tutorialChoiceLocked = typeof window.isTutorialBlockingPowerPick === "function"
    ? window.isTutorialBlockingPowerPick()
    : false;
  const choiceLocked = Date.now() < (state.powerChoiceLockedUntil || 0) || tutorialChoiceLocked;

  state.pendingPowerOptions.forEach((power, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `choice-card ${power.rarity || "common"}`;
    btn.disabled = choiceLocked;

    const top = document.createElement("div");
    top.className = "choice-top";

    const icon = document.createElement("div");
    icon.className = "choice-icon";
    icon.innerText = getPowerIcon(power.id);

    const name = document.createElement("div");
    name.className = "choice-name";
    name.innerText = power.name;

    const rarity = document.createElement("div");
    rarity.className = "choice-rarity";
    rarity.innerText = getPowerRarityLabel(power);

    const desc = document.createElement("div");
    desc.className = "choice-desc";
    desc.innerText = getPowerDescription(power, {
      deckKey: state.pendingDeckKey || state.selectedDeckKey || loadSelectedDeck(),
      levelNumber: state.pendingLevelNumber || state.selectedLevelNumber || loadSelectedLevel(),
    });

    const tag = document.createElement("div");
    tag.className = "choice-tag";
    tag.innerText = state.activePowerAwardReason ? "Tap to gain" : "Tap to start";

    top.appendChild(icon);
    top.appendChild(name);
    top.appendChild(rarity);

    btn.appendChild(top);
    btn.appendChild(desc);
    btn.appendChild(tag);
    btn.onclick = () => pickPowerFromChoice(i);

    list.appendChild(btn);
  });

  if (choiceLocked) {
    window.setTimeout(render, Math.max(0, (state.powerChoiceLockedUntil || 0) - Date.now()));
  }
}

function renderSeenGrid() {
  const grid = document.getElementById("seen-grid");
  if (!grid) return;

  grid.innerHTML = "";

  const topLeft = document.createElement("div");
  topLeft.className = "grid-header";
  grid.appendChild(topLeft);

  for (const rank of RANKS) {
    const cell = document.createElement("div");
    cell.className = "grid-header";
    cell.innerText = rank.r;
    grid.appendChild(cell);
  }

  for (const suit of SUITS) {
    const suitCell = document.createElement("div");
    suitCell.className = `grid-suit ${isRed({ suit }) ? "red" : "black"}`;
    suitCell.innerText = suit;
    grid.appendChild(suitCell);

    for (const rank of RANKS) {
      const cardId = getCardId(suit, rank.r);
      const seen = state.seenCardIds.has(cardId);
      const isFresh = state.recentlySeenCardId === cardId;
      const cell = document.createElement("div");
      cell.className = `grid-cell ${seen ? "seen" : ""} ${isFresh ? "fresh" : ""} ${isRed({ suit }) ? "red" : "black"}`.trim();
      cell.innerText = seen ? "✓" : "";
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

  const seenCountBadge = document.getElementById("seen-count-badge");
  if (seenCountBadge) {
    seenCountBadge.innerText = `${state.seenCardIds.size} / 52 Tracked`;
  }
  note.innerText = "J = 11   •   Q = 12   •   K = 13";
}

function renderMessage() {
  const el = document.getElementById("message-bar");
  const gameEl = document.getElementById("game");
  const gameOverDetailEl = document.getElementById("game-over-detail");
  if (!el) return;

  const usingBoardGameOverMessage =
    !!gameEl &&
    gameEl.classList.contains("game-over-effect") &&
    !!gameOverDetailEl &&
    !!String(gameOverDetailEl.innerText || "").trim();

  if (usingBoardGameOverMessage) {
    el.innerText = "";
    el.classList.remove("has-message");
    return;
  }

  if (!state.message) {
    el.innerText = "";
    el.classList.remove("has-message");
    return;
  }

  el.innerText = state.message;
  el.classList.add("has-message");
}

function renderNextInfo() {
  const el = document.getElementById("next-info");
  if (!el) return;

  if (!state.current) {
    el.innerText = "";
  }
}

function render() {
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
}



