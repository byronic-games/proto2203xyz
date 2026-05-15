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

function getDailyUnlockRunsStarted() {
  if (typeof loadProfileStats === "function") {
    const stats = loadProfileStats();
    return Number(stats?.runsStarted || 0);
  }

  const profileStatsKey = typeof PROFILE_STATS_KEY === "string"
    ? PROFILE_STATS_KEY
    : "hl_prototype_profile_stats";

  try {
    const parsed = JSON.parse(localStorage.getItem(profileStatsKey) || "{}");
    return Number(parsed?.runsStarted || 0);
  } catch {
    return 0;
  }
}

function buildDailyShareUrl(dateKey) {
  const url = new URL("daily.html", window.location.href);
  url.searchParams.set("date", dateKey);
  return url.toString();
}

function getDailyShareIdentifier(dateKey) {
  return String(dateKey || "").trim() || getCurrentDailyDateKey();
}

function buildDailyShareData(entry, activeDateKey) {
  const dateKey = String(activeDateKey || entry?.dateKey || getCurrentDailyDateKey()).trim();
  const reachedCard = Math.min(52, Math.max(0, Number(entry?.score || 0)));
  const bestStreak = Math.max(0, Number(entry?.bestStreak ?? entry?.best_streak ?? Math.max(0, reachedCard - 1)) || 0);

  return {
    title: "52! Daily",
    dateKey,
    dailyLabel: getDailyShareIdentifier(dateKey),
    displayDate: formatDailyDateLabel(dateKey),
    reachedCard,
    bestStreak,
    url: buildDailyShareUrl(dateKey),
  };
}

function buildDailyShareText(data) {
  const lines = [
    `52! Daily #${data.dailyLabel}`,
    `Reached card ${data.reachedCard}/52`,
    `Best streak: ${data.bestStreak}`,
    data.url,
  ];
  return lines.join("\n");
}

function canvasRoundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawDailyShareStat(ctx, label, value, x, y, width) {
  // Result-card stat styling lives here so the copy and canvas layout are easy to tweak.
  const gradient = ctx.createLinearGradient(x, y, x + width, y + 154);
  gradient.addColorStop(0, "rgba(45, 28, 62, 0.96)");
  gradient.addColorStop(1, "rgba(18, 11, 27, 0.96)");
  canvasRoundRect(ctx, x, y, width, 154, 28);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#33dcff";
  ctx.font = "700 28px Space Grotesk, Segoe UI, sans-serif";
  ctx.letterSpacing = "0px";
  ctx.fillText(label.toUpperCase(), x + 30, y + 46);

  ctx.fillStyle = "#f5ebff";
  ctx.font = "900 72px Space Grotesk, Segoe UI, sans-serif";
  ctx.fillText(value, x + 30, y + 120);
}

function createDailyShareImageBlob(data) {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      resolve(null);
      return;
    }

    // Canvas share-card styling: dark 52! board feel, neon accents, no card identities.
    const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, "#090611");
    bg.addColorStop(0.55, "#170d22");
    bg.addColorStop(1, "#251431");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(247,125,246,0.18)";
    ctx.beginPath();
    ctx.arc(184, 92, 210, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(51,220,255,0.16)";
    ctx.beginPath();
    ctx.arc(1010, 104, 240, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(51,220,255,0.26)";
    ctx.lineWidth = 5;
    canvasRoundRect(ctx, 64, 54, 1072, 522, 42);
    ctx.stroke();

    ctx.fillStyle = "#33dcff";
    ctx.font = "900 78px Space Grotesk, Segoe UI, sans-serif";
    ctx.fillText("52!", 102, 150);

    ctx.fillStyle = "#f77df6";
    ctx.font = "900 58px Space Grotesk, Segoe UI, sans-serif";
    ctx.fillText("Daily", 250, 150);

    ctx.fillStyle = "#c5b8d8";
    ctx.font = "800 30px Space Grotesk, Segoe UI, sans-serif";
    ctx.fillText(`#${data.dailyLabel}  |  ${data.displayDate}`, 104, 208);

    drawDailyShareStat(ctx, "Reached Card", `${data.reachedCard}/52`, 104, 260, 460);
    drawDailyShareStat(ctx, "Best Streak", String(data.bestStreak), 636, 260, 460);

    ctx.fillStyle = "#c7ff54";
    ctx.font = "900 38px Space Grotesk, Segoe UI, sans-serif";
    ctx.fillText("Can you beat me?", 104, 492);

    ctx.fillStyle = "#f5ebff";
    ctx.font = "700 25px Space Grotesk, Segoe UI, sans-serif";
    ctx.fillText(data.url, 104, 536);

    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

async function copyDailyShareTextToClipboard(data, statusEl) {
  const payload = buildDailyShareText(data);
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(payload);
      if (statusEl) statusEl.innerText = "Result copied to clipboard.";
      return true;
    }
  } catch {
    // Fall through to a visible, friendly fallback below.
  }

  if (statusEl) statusEl.innerText = payload;
  return false;
}

async function shareDailyResult(entry, activeDateKey, statusEl) {
  if (!entry) return;

  const data = buildDailyShareData(entry, activeDateKey);
  const text = buildDailyShareText(data);
  const shareData = {
    title: data.title,
    text,
    url: data.url,
  };

  try {
    if (typeof navigator.share === "function") {
      const blob = await createDailyShareImageBlob(data);
      const file = blob && typeof File === "function"
        ? new File([blob], `52-daily-${data.dateKey}.png`, { type: "image/png" })
        : null;

      if (file && navigator.canShare?.({ ...shareData, files: [file] })) {
        await navigator.share({ ...shareData, files: [file] });
      } else {
        await navigator.share(shareData);
      }
      if (statusEl) statusEl.innerText = "Daily result shared.";
      return;
    }
  } catch (error) {
    if (error?.name === "AbortError") {
      if (statusEl) statusEl.innerText = "Share cancelled.";
      return;
    }
  }

  await copyDailyShareTextToClipboard(data, statusEl);
}

async function downloadDailyShareImage(entry, activeDateKey, statusEl) {
  if (!entry) return;

  const data = buildDailyShareData(entry, activeDateKey);
  const blob = await createDailyShareImageBlob(data);
  if (!blob) {
    await copyDailyShareTextToClipboard(data, statusEl);
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `52-daily-${data.dateKey}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
  if (statusEl) statusEl.innerText = "Result image downloaded.";
}

function renderDailyRows(entries, currentPlayerId, showScores = false) {
  const bodyEl = document.getElementById("daily-table-body");
  const countEl = document.getElementById("daily-board-count");
  const scoreHeading = document.getElementById("daily-score-heading");
  if (!bodyEl || !countEl) return;

  bodyEl.innerHTML = "";
  if (scoreHeading) {
    scoreHeading.innerText = showScores ? "Cards Cleared" : "Result";
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
    if (typeof formatNameWithCrownsHtml === "function") {
      nameTd.innerHTML = formatNameWithCrownsHtml(entry.playerName || "Unknown", entry);
    } else {
      nameTd.innerText = entry.playerName || "Unknown";
    }

    const scoreTd = document.createElement("td");
    scoreTd.dataset.label = showScores ? "Cards Cleared" : "Result";
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
  const dailyUnlocked = getDailyUnlockRunsStarted() >= 1;
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
  const boardStatusEl = document.getElementById("daily-board-status");
  const scoreEl = document.getElementById("daily-score-label");
  const streakEl = document.getElementById("daily-streak-label");
  const resultPanel = document.getElementById("daily-result-panel");
  const startBtn = document.getElementById("daily-start-btn");
  const shareBtn = document.getElementById("daily-share-btn");
  const downloadShareBtn = document.getElementById("daily-download-share-btn");
  const nameInput = document.getElementById("daily-name-input");

  if (!dailyUnlocked) {
    resultPanel?.classList.add("hidden");
    if (shareBtn) shareBtn.style.display = "none";
    if (downloadShareBtn) downloadShareBtn.style.display = "none";
    if (statusEl) {
      statusEl.innerText = "Daily unlocks after your first run.";
    }
    if (startBtn) {
      startBtn.disabled = true;
      startBtn.innerText = "Locked";
    }
  } else if (currentAttempt) {
    if (hasCompletedAttempt) {
      resultPanel?.classList.remove("hidden");
      const shareData = buildDailyShareData(currentAttempt, activeDateKey);
      if (scoreEl) scoreEl.innerText = `Reached card ${shareData.reachedCard}/52`;
      if (streakEl) streakEl.innerText = `Best streak: ${shareData.bestStreak}`;
      if (statusEl) {
        statusEl.innerText = activeDateKey === todayKey
          ? "You have already played today's Daily."
          : "You already played this Daily.";
      }
    } else {
      resultPanel?.classList.add("hidden");
      if (streakEl) streakEl.innerText = "";
      if (statusEl) {
        statusEl.innerText = "This Daily is in progress on this device. Resume to finish your attempt.";
      }
    }
    if (shareBtn) {
      shareBtn.disabled = !hasCompletedAttempt;
      shareBtn.style.display = hasCompletedAttempt ? "" : "none";
    }
    if (downloadShareBtn) {
      downloadShareBtn.disabled = !hasCompletedAttempt;
      downloadShareBtn.style.display = hasCompletedAttempt ? "" : "none";
    }
    if (startBtn) {
      startBtn.disabled = hasCompletedAttempt ? true : (activeDateKey !== todayKey);
      startBtn.innerText = hasCompletedAttempt ? "Daily Complete" : (activeDateKey === todayKey ? "Resume Daily" : "Archive");
    }
  } else {
      resultPanel?.classList.add("hidden");
      if (streakEl) streakEl.innerText = "";
      if (statusEl) {
        statusEl.innerText = activeDateKey === todayKey
          ? "You have one attempt on today's Daily. High scores revealed after your run."
          : "This Daily is archived.";
      }
    if (startBtn) {
      startBtn.disabled = activeDateKey !== todayKey;
      startBtn.innerText = activeDateKey === todayKey ? "Play Daily" : "Archive";
    }
    if (shareBtn) {
      shareBtn.disabled = true;
      shareBtn.style.display = "none";
    }
    if (downloadShareBtn) {
      downloadShareBtn.disabled = true;
      downloadShareBtn.style.display = "none";
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

  if (shareBtn) {
    shareBtn.onclick = () => {
      const entry = hasCompletedAttempt ? currentAttempt : null;
      if (!entry) return;
      shareDailyResult(entry, activeDateKey, statusEl);
    };
  }

  if (downloadShareBtn) {
    downloadShareBtn.onclick = () => {
      const entry = hasCompletedAttempt ? currentAttempt : null;
      if (!entry) return;
      downloadDailyShareImage(entry, activeDateKey, statusEl);
    };
  }

  // Fetch and render leaderboard
  const leaderboardResponse = await fetchDailyLeaderboard(activeDateKey, 100);
  const leaderboard = Array.isArray(leaderboardResponse)
    ? leaderboardResponse
    : (leaderboardResponse?.entries || []);
  const remoteAvailable = Array.isArray(leaderboardResponse)
    ? (leaderboardResponse._remoteAvailable !== undefined ? !!leaderboardResponse._remoteAvailable : true)
    : !!leaderboardResponse?.remoteAvailable;
  const boardStatus = Array.isArray(leaderboardResponse)
    ? String(leaderboardResponse._status || "online")
    : (leaderboardResponse?.status || "online");

  if (boardStatusEl) {
    if (remoteAvailable) {
      boardStatusEl.innerText = "Online leaderboard connected.";
    } else if (boardStatus === "offline_config") {
      boardStatusEl.innerText = "Online leaderboard unavailable. Showing local results only.";
    } else {
      boardStatusEl.innerText = "Could not reach online leaderboard. Showing local fallback results.";
    }
  }

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
