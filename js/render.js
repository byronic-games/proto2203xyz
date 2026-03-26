function renderScores() {
  document.getElementById("score").innerText = state.correctAnswers;
  document.getElementById("best-score").innerText = state.bestScore;

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

function renderRestartButton() {
  const btn = document.getElementById("restart-btn");
  if (!btn) return;

  const runIsActive = !state.gameOver && !!state.current;
  btn.innerText = (runIsActive && state.restartConfirmArmed) ? "Confirm Restart" : "Start Run";
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
      empty.innerText = "Cheat descriptions will appear here for cheats in hand and current cheat choices.";
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

  if (!state.current || state.gameOver) {
    activePowersEl.innerText = state.powers.length
      ? state.powers.map(getPowerName).join(", ")
      : "No active Powers.";
    return;
  }

  activePowersEl.innerHTML = "";
  const row = document.createElement("div");
  row.className = "power-button-row";

  if (state.selectedStartPowerId === "none") {
    const text = document.createElement("div");
    text.innerText = "No active Powers.";
    activePowersEl.appendChild(text);
    return;
  }

  const ownedPower = getPowerById(state.selectedStartPowerId);
  if (!ownedPower) {
    activePowersEl.innerText = "No active Powers.";
    return;
  }

  const btn = document.createElement("button");
  const isActive = runHasPower(ownedPower.id);
  btn.className = `power-chip ${isActive ? "active" : "inactive"}`;
  btn.innerText = `${ownedPower.name}: ${isActive ? "ON" : "OFF"}`;
  btn.onclick = () => togglePower(ownedPower.id);
  row.appendChild(btn);
  activePowersEl.appendChild(row);
}

function renderCurrentCard() {
  const currentCardEl = document.getElementById("current-card");
  const currentValueEl = document.getElementById("current-effective-value");

  if (!state.current) {
    currentCardEl.innerText = "?";
    currentCardEl.className = "card-face";
    currentValueEl.innerText = "";
    return;
  }

  currentCardEl.innerText = describeCard(state.current);
  currentCardEl.className = `card-face ${isRed(state.current) ? "red" : "black"}`;

  const effectiveValue = getCurrentEffectiveValue();
  currentValueEl.innerText =
    effectiveValue !== state.current.value
      ? `Treated as: ${valueToRank(effectiveValue)}`
      : "";
}

function renderFaceDownDeck() {
  const deckEl = document.getElementById("face-down-deck");
  const countEl = document.getElementById("face-down-count");

  if (!state.current) {
    deckEl.innerText = "";
    deckEl.className = "card-back";
    countEl.innerText = "";
    return;
  }

  const next = peekNext();
  const backStatus = next ? getCardBackStatus(next.id) : { tornCorner: false };
  deckEl.className = `card-back ${backStatus.tornCorner ? "torn-corner" : ""}`;

  const symbol = document.createElement("div");
  symbol.className = "card-back-symbol";
  symbol.innerText = "🂠";

  deckEl.innerHTML = "";
  deckEl.appendChild(symbol);

  if (next && runHasPower("stats_display")) {
    const entry = getCardStatsEntry(next.id);
    const guessedCount = (entry.endedRun || 0) + (entry.survivedRun || 0);

    const statsBox = document.createElement("div");
    statsBox.className = "card-back-stats";
    statsBox.innerHTML = `
      <div>Guessed: ${guessedCount}</div>
      <div>Ended run: ${entry.endedRun || 0}</div>
      <div>Didn’t end: ${entry.survivedRun || 0}</div>
    `;
    deckEl.appendChild(statsBox);
  }

  countEl.innerText = `${getFaceDownCount()} card(s) remain`;
}

function renderButtons() {
  const disableGuessing =
    state.gameOver || !state.current || state.pendingCheatOptions.length > 0;

  document.getElementById("higher-btn").disabled = disableGuessing;
  document.getElementById("lower-btn").disabled = disableGuessing;
}

function renderHandCard() {
  const handEl = document.getElementById("swap-card");

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
  cheatList.innerHTML = "";

  if (state.cheats.length === 0) {
    const empty = document.createElement("div");
    empty.innerText = "No Cheats held.";
    empty.style.color = "#bbb";
    cheatList.appendChild(empty);
    return;
  }

  state.cheats.forEach((cheat, index) => {
    const btn = document.createElement("button");
    btn.innerText = cheat.name;
    btn.onclick = () => {
      if (state.gameOver || state.pendingCheatOptions.length > 0) return;
      state.restartConfirmArmed = false;
      const result = cheat.use();
      state.message = result;
      if (cheat.consumeOnUse) removeCheatAt(index);
      render();
    };
    cheatList.appendChild(btn);
  });
}

function renderCheatChoice() {
  const container = document.getElementById("cheat-choice-container");
  const list = document.getElementById("cheat-choice-list");

  list.innerHTML = "";

  if (!state.pendingCheatOptions.length) {
    container.style.display = "none";
    return;
  }

  container.style.display = "block";

  state.pendingCheatOptions.forEach((cheat, index) => {
    const btn = document.createElement("button");
    const isNew = state.justUnlockedCheatIds.includes(cheat.id);
    btn.innerText = `${isNew ? "[NEW] " : ""}[${cheat.rarity}] ${cheat.name}`;
    btn.onclick = () => pickCheatFromChoice(index);
    list.appendChild(btn);
  });
}

function renderSeenGrid() {
  const grid = document.getElementById("seen-grid");
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
  note.innerText = "J = 11   •   Q = 12   •   K = 13";
}

function renderMessage() {
  document.getElementById("message").innerText = state.message || "";
}

function renderNextInfo() {
  if (!state.current) {
    document.getElementById("next-info").innerText = "";
  }
}

function render() {
  renderScores();
  renderSeedControls();
  renderStartPowerSelector();
  renderCheatGuide();
  renderActivePowers();
  renderCurrentCard();
  renderFaceDownDeck();
  renderButtons();
  renderHandCard();
  renderCheats();
  renderCheatChoice();
  renderSeenGrid();
  renderRestartButton();
  renderMessage();
  renderNextInfo();
}
