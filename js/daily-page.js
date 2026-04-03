function formatDailyDateLabel(dateKey) {
  if (!dateKey) return "-";
  const date = new Date(`${dateKey}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return dateKey;
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function renderDailyRows(entries, currentPlayerId) {
  const bodyEl = document.getElementById("daily-table-body");
  const countEl = document.getElementById("daily-board-count");
  if (!bodyEl || !countEl) return;

  bodyEl.innerHTML = "";

  if (!entries.length) {
    bodyEl.innerHTML = "<tr><td colspan='3'>No daily scores yet. Set the pace.</td></tr>";
    countEl.innerText = "0 entries";
    return;
  }

  countEl.innerText = `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`;

  let previousScore = null;
  let displayRank = 0;

  entries.forEach((entry, index) => {
    if (entry.score !== previousScore) {
      displayRank = index + 1;
      previousScore = entry.score;
    }

    const tr = document.createElement("tr");
    if (entry.playerId && entry.playerId === currentPlayerId) {
      tr.classList.add("current-player");
    }

    const rankTd = document.createElement("td");
    rankTd.dataset.label = "Rank";
    rankTd.innerText = String(displayRank);

    const nameTd = document.createElement("td");
    nameTd.dataset.label = "Name";
    nameTd.innerText = entry.playerName || "Unknown";

    const scoreTd = document.createElement("td");
    scoreTd.dataset.label = "Score";
    scoreTd.className = "score";
    scoreTd.innerText = String(entry.score ?? 0);

    tr.appendChild(rankTd);
    tr.appendChild(nameTd);
    tr.appendChild(scoreTd);
    bodyEl.appendChild(tr);
  });
}

async function renderDailyPage() {
  const params = new URLSearchParams(window.location.search);
  const todayKey = getCurrentDailyDateKey();
  const activeDateKey = String(params.get("date") || todayKey).trim() || todayKey;
  const seed = getDailySeedForDate(activeDateKey);
  const currentPlayerId = getOrCreateDailyPlayerId();
  const currentAttempt = getLocalDailyAttempt(activeDateKey);

  const dateEl = document.getElementById("daily-date-label");
  const seedEl = document.getElementById("daily-seed-label");
  const nameInput = document.getElementById("daily-name-input");
  const statusEl = document.getElementById("daily-status");
  const scoreEl = document.getElementById("daily-score-label");
  const resultPanel = document.getElementById("daily-result-panel");
  const startBtn = document.getElementById("daily-start-btn");
  const closeBtn = document.getElementById("daily-close-btn");

  if (dateEl) dateEl.innerText = formatDailyDateLabel(activeDateKey);
  if (seedEl) seedEl.innerText = seed;
  if (nameInput) {
    nameInput.value = loadPreferredPlayerName();
    nameInput.addEventListener("input", () => {
      savePreferredPlayerName(nameInput.value);
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      if (window.history.length > 1) {
        window.history.back();
        return;
      }
      window.location.href = "index.html";
    });
  }

  if (currentAttempt) {
    if (currentAttempt.completed) {
      resultPanel?.classList.remove("hidden");
      if (scoreEl) scoreEl.innerText = String(currentAttempt.score ?? 0);
      if (statusEl) {
        statusEl.innerText = activeDateKey === todayKey
          ? "You have already played today's Daily."
          : "You already played this Daily.";
      }
    } else {
      resultPanel?.classList.add("hidden");
      if (statusEl) {
        statusEl.innerText = "This Daily has already been started on this device.";
      }
    }
    if (startBtn) {
      startBtn.disabled = true;
      startBtn.innerText = currentAttempt.completed ? "Daily Complete" : "Daily Locked";
    }
  } else {
    resultPanel?.classList.add("hidden");
    if (statusEl) {
      statusEl.innerText = activeDateKey === todayKey
        ? "You have one attempt on today's Daily."
        : "This Daily is archived.";
    }
    if (startBtn) {
      startBtn.disabled = activeDateKey !== todayKey;
      startBtn.innerText = activeDateKey === todayKey ? "Play Daily" : "Archive";
    }
  }

  startBtn?.addEventListener("click", () => {
    const playerName = savePreferredPlayerName(nameInput?.value || "");
    if (!playerName) {
      if (statusEl) statusEl.innerText = "Enter a player name before starting the Daily.";
      nameInput?.focus();
      return;
    }

    if (hasPlayedDaily(activeDateKey)) {
      window.location.href = `daily.html?date=${encodeURIComponent(activeDateKey)}`;
      return;
    }

    window.location.href = buildDailyGameUrl(activeDateKey);
  });

  const leaderboard = await fetchDailyLeaderboard(activeDateKey, 100);
  renderDailyRows(leaderboard, currentPlayerId);
}

renderDailyPage();
