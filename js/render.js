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
      if (seedDisplay) seedDisplay.innerText = state.runSeed ? `${GAME_VERSION}-${state.runSeed}` : `${GAME_VERSION}-`;
      if (seedInput && !seedInput.dataset.initialized) {
        seedInput.value = state.runSeed || loadLastRunSeed() || randomSeedString();
        seedInput.dataset.initialized = "true";
      }
    }

function renderCheatGuide() {
  const listEl = document.getElementById("cheat-guide-list");
  if (!listEl) return;

  listEl.innerHTML = "";

  const cheatsToShow = CHEATS.filter((cheat) => cheat.included !== false);

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
        btn.innerText = `[${cheat.rarity}] ${cheat.name}`;
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
    }

function renderMessage() {
      document.getElementById("message").innerText = state.message || "";
    }

function renderNextInfo() {
      if (!state.current) document.getElementById("next-info").innerText = "";
    }

function render() {
  renderScores();
  renderSeedControls();
  renderStartPowerSelector();
  renderActivePowers();
  renderCurrentCard();
  renderFaceDownDeck();
  renderButtons();
  renderHandCard();
  renderCheats();
  renderCheatChoice();
  renderSeenGrid();
  renderCheatGuide();
  renderMessage();
  renderNextInfo();
}
