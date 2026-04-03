function renderScores() {
  const scoreEl = document.getElementById("score");
  const bestScoreEl = document.getElementById("best-score");
  const streakEl = document.getElementById("current-streak");

  if (scoreEl) scoreEl.innerText = String(state.correctAnswers);
  if (bestScoreEl) bestScoreEl.innerText = String(state.bestScore);
  if (streakEl) streakEl.innerText = "";

  const metaEl = document.getElementById("meta-progression");
  if (metaEl) {
    metaEl.innerText = state.metaProgression ?? 0;
  }
}

function renderSeedControls() {
  const seedInput = document.getElementById("run-seed-input");
  const seedDisplay = document.getElementById("current-seed");

  if (seedDisplay) {
    seedDisplay.innerText = state.runSeed
      ? `${GAME_VERSION}-${state.runSeed}`
      : `${GAME_VERSION}-`;
  }

  if (seedInput && !seedInput.dataset.initialized) {
    seedInput.value = state.runSeed || loadLastRunSeed() || randomSeedString();
    seedInput.dataset.initialized = "true";
  }
}

function getCheatDescription(cheat) {
  return CHEAT_DESCRIPTIONS?.[cheat.name] || "No description yet.";
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
      <div class="power-summary-desc">${ownedPower.description}</div>
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

function getGuessPreferenceSummary(higherCount, lowerCount) {
  const total = (higherCount || 0) + (lowerCount || 0);
  if (!total) return null;

  const higherPercent = Math.round(((higherCount || 0) / total) * 100);
  const lowerPercent = Math.round(((lowerCount || 0) / total) * 100);
  return `Picked: H ${higherPercent}% / L ${lowerPercent}%`;
}

function getCardStatsTooltipLines(entry) {
  const lines = [];

  const higherCount =
    (entry.guessStats?.base?.higher || 0) +
    (entry.guessStats?.nudgedUp?.higher || 0) +
    (entry.guessStats?.nudgedDown?.higher || 0);
  const lowerCount =
    (entry.guessStats?.base?.lower || 0) +
    (entry.guessStats?.nudgedUp?.lower || 0) +
    (entry.guessStats?.nudgedDown?.lower || 0);

  const pickedLine = getGuessPreferenceSummary(higherCount, lowerCount);
  if (pickedLine) lines.push(pickedLine);

  const nudgedUpCount = entry.nudgeStats?.up || 0;
  const nudgedDownCount = entry.nudgeStats?.down || 0;
  if (nudgedUpCount > 0 || nudgedDownCount > 0) {
    lines.push(`Nudged: up ${nudgedUpCount} / down ${nudgedDownCount}`);
  }

  if (!lines.length) {
    lines.push("No face-up stats yet.");
  }

  return lines;
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
    deckEl.className = "card-back card-back-blue";
    deckEl.removeAttribute("data-back-color");
    countEl.innerText = "";
    if (remainingValueEl) remainingValueEl.innerText = "00";
    return;
  }

  const next = peekNext();
  const backStatus = next
    ? getCardBackStatus(next.id)
    : { tornCorner: false, backColor: "blue" };

  const backColor = backStatus.backColor || "blue";

  deckEl.className = `card-back card-back-${backColor} ${backStatus.tornCorner ? "torn-corner" : ""}`.trim();
  deckEl.setAttribute("data-back-color", backColor);
  deckEl.innerHTML = "";

  const symbol = document.createElement("div");
  symbol.className = "card-back-symbol";
  symbol.innerText = "🂠";
  deckEl.appendChild(symbol);

  if (backStatus.tornCorner) {
    const tear = document.createElement("div");
    tear.className = "tear-mark";
    deckEl.appendChild(tear);
  }

  const shouldShowDeckStatsInline = !!next && backColor === "pink";

  if (shouldShowDeckStatsInline) {
    const entry = getCardStatsEntry(next.id);
    const statLines = getCardStatsTooltipLines(entry);

    const statsBox = document.createElement("div");
    statsBox.className = "card-back-stats";
    statsBox.innerHTML = statLines.map((line) => `<div>${line}</div>`).join("");
    deckEl.appendChild(statsBox);
  }

  const remainingCount = getFaceDownCount();
  countEl.innerText = "";
  if (remainingValueEl) {
    remainingValueEl.innerText = String(remainingCount).padStart(2, "0");
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
      const result = cheat.use();
      state.message = result;
      if (cheat.consumeOnUse) {
        const originalIndex = state.cheats.findIndex((c) => c === cheat);
        if (originalIndex >= 0) removeCheatAt(originalIndex);
      }
      render();
    };

    cheatList.appendChild(btn);
  });
}

function showCheatTooltip(cheat, el) {
  const tooltip = document.getElementById("cheat-tooltip");
  const title = document.getElementById("cheat-tooltip-title");
  const body = document.getElementById("cheat-tooltip-body");

  if (!tooltip || !title || !body || !el) return;

  title.innerText = cheat.name;
  body.innerText = getCheatDescription(cheat);

  tooltip.classList.remove("hidden");

  const rect = el.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
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
  tooltip.style.top = rect.top - 10 + "px";
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

  state.pendingCheatOptions.forEach((cheat, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `choice-card ${cheat.rarity || "common"}`;
    btn.disabled = choiceLocked;

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
    desc.innerText = power.description;

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
      const cell = document.createElement("div");
      cell.className = `grid-cell ${seen ? "seen" : ""} ${isRed({ suit }) ? "red" : "black"}`;
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
  if (!el) return;

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
  renderSeedControls();
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


