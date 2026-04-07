function renderScores() {
  const scoreEl = document.getElementById("score");
  const bestScoreEl = document.getElementById("best-score");
  const streakEl = document.getElementById("current-streak");
  const bestDeckKey = state.gameOver
    ? normalizeDeckKey(state.selectedDeckKey || loadSelectedDeck())
    : normalizeDeckKey(state.currentDeckKey || state.selectedDeckKey || loadSelectedDeck());
  const bestLevelNumber = state.gameOver
    ? normalizeLevelNumber(state.selectedLevelNumber || loadSelectedLevel())
    : normalizeLevelNumber(state.currentLevelNumber || state.selectedLevelNumber || loadSelectedLevel());

  state.bestScore = loadBestScore(bestDeckKey, bestLevelNumber);
  if (scoreEl) setAnimatedText(scoreEl, state.correctAnswers);
  if (bestScoreEl) setAnimatedText(bestScoreEl, state.bestScore);
  if (streakEl) streakEl.innerText = "";

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

function renderHeaderStatus() {
  const seedInput = document.getElementById("run-seed-input");
  const runStatusEl = document.getElementById("header-run-status");
  const runTitleEl = document.getElementById("header-run-title");
  const runPowerEl = document.getElementById("header-run-power");
  const hasActiveRun = !state.gameOver && !!state.current;
  const runDeckName = getDeckName(state.currentDeckKey || state.selectedDeckKey || "blue");
  const runLevelNumber = normalizeLevelNumber(state.currentLevelNumber || state.selectedLevelNumber || loadSelectedLevel());
  const runPowerName = getPowerName(state.selectedStartPowerId);
  const runPowerDescription = getPowerDescription(state.selectedStartPowerId, {
    deckKey: state.currentDeckKey || state.selectedDeckKey || "blue",
    levelNumber: runLevelNumber,
  });

  if (runStatusEl && runTitleEl && runPowerEl) {
    if (hasActiveRun) {
      runTitleEl.innerText = `${runDeckName} Deck - Level ${runLevelNumber}`;
      runPowerEl.innerText = `Starting Power: ${runPowerName}`;
      runStatusEl.hidden = false;
      runStatusEl.classList.toggle("has-power-tooltip", !!runPowerDescription);
    } else {
      runTitleEl.innerText = "";
      runPowerEl.innerText = "";
      runStatusEl.hidden = true;
      runStatusEl.classList.remove("has-power-tooltip");
    }

    setupHeaderPowerTooltip(runStatusEl, {
      enabled: hasActiveRun && !!runPowerDescription,
      title: `${runDeckName} Deck - Level ${runLevelNumber} Starting Power: ${runPowerName}`,
      description: runPowerDescription,
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

function renderCurrentCard() {
  const currentCardEl = document.getElementById("current-card");
  const currentValueEl = document.getElementById("current-effective-value");

  if (!currentCardEl || !currentValueEl) return;

  if (!state.current) {
    currentCardEl.className = "card-back card-back-blue";
    currentCardEl.innerHTML = `<div class="card-back-symbol">🂠</div>`;
    currentValueEl.innerText = "";
    return;
  }

  const backStatus = getCardBackStatus(state.current.id);
  const effectiveValue = getCurrentEffectiveValue();
  const isTemporarilyModified = effectiveValue !== state.current.value;
  const shownRank = isTemporarilyModified ? valueToRank(effectiveValue) : state.current.rank;
  const shownLabel = `${shownRank}${state.current.suit}`;
  const feedbackClass = state.currentCardFeedback
    ? `feedback-${state.currentCardFeedback}`
    : "";

  currentCardEl.className = `card-face ${isRed(state.current) ? "red" : "black"} ${backStatus.tornCorner ? "torn-corner-face" : ""} ${isTemporarilyModified ? "temporary-value" : ""} ${feedbackClass}`.trim();
  currentCardEl.innerHTML = `
    <span class="card-face-label">${shownLabel}</span>
    ${isTemporarilyModified ? '<span class="card-temp-chip">TEMP</span>' : ""}
    ${backStatus.tornCorner ? '<span class="tear-mark-face"></span>' : ""}
  `;

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

function getRedDeckStatItems(entry) {
  const blueFaceUpUses = entry.nudgeStats?.blueFaceUpUses || 0;
  const blueNudgedUses = entry.nudgeStats?.blueNudgedUses || 0;
  const blueFaceUpEnded = entry.nudgeStats?.blueFaceUpEnded || 0;
  const totalUpAmount = entry.nudgeStats?.totalUpAmount || 0;
  const totalDownAmount = entry.nudgeStats?.totalDownAmount || 0;

  return [
    { label: "Seen", value: String(blueFaceUpUses) },
    { label: "Nudged", value: String(blueNudgedUses) },
    { label: "Up", value: String(totalUpAmount) },
    { label: "Down", value: String(totalDownAmount) },
    { label: "Ended", value: String(blueFaceUpEnded) },
  ];
}

function getRedDeckStatsTooltipBody(entry) {
  return [
    "Seen: times this card has been face up in Blue runs.",
    "Nudged: number of Blue face-up turns where players nudged this card at least once.",
    "Up: total upward nudge amount applied while it was face up.",
    "Down: total downward nudge amount applied while it was face up.",
    "Ended: number of Blue face-up turns where the run ended while this card was the current card, whether it was nudged or not.",
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
    state.pendingCheatOptions.length > 0 ||
    state.pendingPowerOptions.length > 0 ||
    !!state.pauseForCheat;

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
    const idleDeckBackColor = normalizeDeckKey(state.currentDeckKey || state.selectedDeckKey) === "red" ? "pink" : "blue";
    deckEl.className = `card-back card-back-${idleDeckBackColor}`;
    deckEl.removeAttribute("data-back-color");
    countEl.innerText = "";
    if (remainingValueEl) remainingValueEl.innerText = "00";
    return;
  }

  const next = peekNext();
  const backStatus = next
    ? getCardBackStatus(next.id)
    : { tornCorner: false, backColor: "blue" };

  const backColor = normalizeDeckKey(state.currentDeckKey) === "red" ? "pink" : "blue";
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
    const statItems = getRedDeckStatItems(entry);
    const tooltipTitle = `${describeCard(next)} Red Stats`;
    const tooltipBody = getRedDeckStatsTooltipBody(entry);

    const statsBox = document.createElement("div");
    statsBox.className = "card-back-stats";
    statsBox.innerHTML = statItems
      .map((item) => `
        <div class="card-back-stat">
          <span class="card-back-stat-label">${item.label}</span>
          <span class="card-back-stat-value">${item.value}</span>
        </div>
      `)
      .join("");
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

  // Block input if pausing before cheat selection
  const isPause = !!state.pauseForCheat;
  const disableGuessing =
    state.gameOver ||
    !state.current ||
    state.pendingCheatOptions.length > 0 ||
    state.pendingPowerOptions.length > 0 ||
    isPause;

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
      if (state.gameOver || state.pendingCheatOptions.length || state.pendingPowerOptions.length) return;
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
          sixSeven: !!state.sixSevenArmed,
          cheatACheaterRemaining: Number(state.cheatACheaterRemaining) || 0,
        },
      });
      if (cheat.consumeOnUse) {
        const originalIndex = state.cheats.findIndex((c) => c === cheat);
        if (originalIndex >= 0) removeCheatAt(originalIndex);
        state.cheatUsesOnCurrentCard = (state.cheatUsesOnCurrentCard || 0) + 1;
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

function renderCheatChoice() {
  const container = document.getElementById("cheat-choice-container");
  const list = document.getElementById("cheat-choice-list");

  if (!container || !list) return;

  list.innerHTML = "";

  if (!state.pendingCheatOptions.length) {
    container.classList.add("hidden");
    container.setAttribute("aria-hidden", "true");
    return;
  }

  container.classList.remove("hidden");
  container.setAttribute("aria-hidden", "false");

  const choiceLocked = Date.now() < (state.cheatChoiceLockedUntil || 0);
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

  if (!container || !list) return;

  list.innerHTML = "";
  list.dataset.count = String(state.pendingPowerOptions.length || 0);

  if (!state.pendingPowerOptions.length) {
    container.classList.add("hidden");
    container.setAttribute("aria-hidden", "true");
    return;
  }

  container.classList.remove("hidden");
  container.setAttribute("aria-hidden", "false");

  const choiceLocked = Date.now() < (state.powerChoiceLockedUntil || 0);

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
    tag.innerText = "Tap to start";

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
    el.style.display = "flex";
    el.innerText = "";
    return;
  }

  if (!state.message) {
    el.style.display = "none";
    return;
  }

  el.style.display = "flex";
  el.innerText = state.message;
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
}



