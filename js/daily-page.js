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

function renderDailyRows(entries, currentPlayerId, showScores = false) {
  const bodyEl = document.getElementById("daily-table-body");
  const countEl = document.getElementById("daily-board-count");
  const scoreHeading = document.getElementById("daily-score-heading");
  if (!bodyEl || !countEl) return;

  bodyEl.innerHTML = "";
  if (scoreHeading) {
    scoreHeading.innerText = showScores ? "Score" : "Result";
  }

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
    scoreTd.dataset.label = showScores ? "Score" : "Result";
    scoreTd.className = "score";
    scoreTd.innerText = showScores ? String(entry.score ?? 0) : "Hidden";

    tr.appendChild(rankTd);
    tr.appendChild(nameTd);
    tr.appendChild(scoreTd);
    bodyEl.appendChild(tr);
  });
}

function navigateToDailyDate(dateKey) {
  // Update URL without full page reload
  window.history.replaceState({ date: dateKey }, "", `daily.html?date=${encodeURIComponent(dateKey)}`);
  // Re-render with new date
  refreshDailyPageForDate(dateKey);
}

async function refreshDailyPageForDate(activeDateKey) {
  const todayKey = getCurrentDailyDateKey();
  const currentPlayerId = getOrCreateDailyPlayerId();
  const currentAttempt = getLocalDailyAttempt(activeDateKey);
  const hasCompletedAttempt =
    !!currentAttempt &&
    currentAttempt.dateKey === activeDateKey &&
    currentAttempt.playerId === currentPlayerId &&
    currentAttempt.completed === true;
  // Show scores for past dailies, or if player has completed today's
  const showScores = activeDateKey !== todayKey || hasCompletedAttempt;

  // Update date label
  const dateEl = document.getElementById("daily-date-label");
  if (dateEl) dateEl.innerText = formatDailyDateLabel(activeDateKey);
  
  // Update navigation buttons
  const prevNavBtn = document.getElementById("daily-nav-prev");
  const nextNavBtn = document.getElementById("daily-nav-next");
  
  const canGoPrev = canNavigatePrevious(activeDateKey);
  const canGoNext = canNavigateNext(activeDateKey);
  
  if (prevNavBtn) {
    prevNavBtn.disabled = !canGoPrev;
    prevNavBtn.onclick = (e) => {
      e.preventDefault();
      if (canGoPrev) navigateToDailyDate(decrementDateKey(activeDateKey));
    };
  }
  
  if (nextNavBtn) {
    nextNavBtn.disabled = !canGoNext;
    nextNavBtn.onclick = (e) => {
      e.preventDefault();
      if (canGoNext) navigateToDailyDate(incrementDateKey(activeDateKey));
    };
  }

  // Update status and button states
  const statusEl = document.getElementById("daily-status");
  const scoreEl = document.getElementById("daily-score-label");
  const resultPanel = document.getElementById("daily-result-panel");
  const startBtn = document.getElementById("daily-start-btn");
  const nameInput = document.getElementById("daily-name-input");

  if (currentAttempt) {
    if (hasCompletedAttempt) {
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
      startBtn.innerText = hasCompletedAttempt ? "Daily Complete" : "Daily Locked";
    }
  } else {
      resultPanel?.classList.add("hidden");
      if (statusEl) {
        statusEl.innerText = activeDateKey === todayKey
          ? "You have one attempt on today's Daily. High scores revealed after your run."
          : "This Daily is archived.";
      }
    if (startBtn) {
      startBtn.disabled = activeDateKey !== todayKey;
      startBtn.innerText = activeDateKey === todayKey ? "Play Daily" : "Archive";
    }
  }

  if (startBtn) {
    startBtn.onclick = () => {
      const playerName = savePreferredPlayerName(nameInput?.value || "");
      if (!playerName) {
        if (statusEl) statusEl.innerText = "Enter a player name before starting the Daily.";
        nameInput?.focus();
        return;
      }

      if (hasPlayedDaily(activeDateKey)) {
        // Already played, just stay here (don't allow replay)
        return;
      }

      window.location.href = buildDailyGameUrl(activeDateKey);
    };
  }

  // Fetch and render leaderboard
  const leaderboard = await fetchDailyLeaderboard(activeDateKey, 100);
  renderDailyRows(leaderboard, currentPlayerId, showScores);
}

async function renderDailyPage() {
  const params = new URLSearchParams(window.location.search);
  const todayKey = getCurrentDailyDateKey();
  const activeDateKey = String(params.get("date") || todayKey).trim() || todayKey;
  const nameInput = document.getElementById("daily-name-input");
  const closeBtn = document.getElementById("daily-close-btn");

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

  await refreshDailyPageForDate(activeDateKey);
}

renderDailyPage();

