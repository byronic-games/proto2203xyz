const HOLD_DURATION_MS = 5000;

const resetDeckBtn = document.getElementById("reset-deck-btn");
const resetDeckFill = document.getElementById("reset-deck-fill");
const resetDeckLabel = document.getElementById("reset-deck-label");
const settingsStatus = document.getElementById("settings-status");
const exportLogBtn = document.getElementById("export-log-btn");
const shareLogBtn = document.getElementById("share-log-btn");
const logExportStatus = document.getElementById("log-export-status");
const closeSettingsBtn = document.getElementById("settings-close-btn");

let holdStartedAt = 0;
let holdTimer = null;
let holdRaf = 0;
let resetTriggered = false;

function getLatestRunLogEntries() {
  const entries = loadRunDebugLog();
  return Array.isArray(entries) ? entries : [];
}

function buildRunLogDownloadPayload() {
  const entries = getLatestRunLogEntries();
  if (!entries.length) return null;

  const latestEntry = entries[entries.length - 1] || {};
  return {
    exportedAt: new Date().toISOString(),
    gameVersion: typeof GAME_VERSION === "string" ? GAME_VERSION : "",
    seed: latestEntry.runSeed || "",
    runMode: latestEntry.runMode || "standard",
    deck: latestEntry.deck || "blue",
    level: latestEntry.level || DEFAULT_LEVEL_NUMBER,
    eventCount: entries.length,
    userAgent: navigator.userAgent,
    entries,
  };
}

function buildRunLogFilename(payload) {
  const seedPart = String(payload.seed || "unknown").replace(/[^A-Z0-9_-]+/gi, "-");
  const deckPart = String(payload.deck || "blue");
  const levelPart = `L${Number(payload.level || DEFAULT_LEVEL_NUMBER)}`;
  return `52-run-log-${deckPart}-${levelPart}-${seedPart}.json`;
}

function buildRunLogFile(payload) {
  return new File(
    [JSON.stringify(payload, null, 2)],
    buildRunLogFilename(payload),
    { type: "application/json" }
  );
}

function refreshRunLogExportState() {
  const hasLog = getLatestRunLogEntries().length > 0;
  if (exportLogBtn) {
    exportLogBtn.disabled = !hasLog;
  }
  if (shareLogBtn) {
    shareLogBtn.disabled = !hasLog || typeof navigator.share !== "function";
  }
  if (logExportStatus) {
    logExportStatus.innerText = hasLog
      ? "Share or download the latest run log for support or bug reports."
      : "No run log found yet. Start a run first.";
  }
}

function downloadLatestRunLog() {
  const payload = buildRunLogDownloadPayload();
  if (!payload) {
    if (logExportStatus) {
      logExportStatus.innerText = "No run log found yet. Start a run first.";
    }
    return;
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = buildRunLogFilename(payload);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  if (logExportStatus) {
    logExportStatus.innerText = "Run log downloaded. You can attach it to an email.";
  }
}

async function shareLatestRunLog() {
  const payload = buildRunLogDownloadPayload();
  if (!payload) {
    if (logExportStatus) {
      logExportStatus.innerText = "No run log found yet. Start a run first.";
    }
    return;
  }

  if (typeof navigator.share !== "function") {
    downloadLatestRunLog();
    return;
  }

  const file = buildRunLogFile(payload);
  const shareData = {
    title: "52! Run Log",
    text: `52! run log for ${payload.deck} Level ${payload.level}, seed ${payload.seed || "unknown"}.`,
    files: [file],
  };

  try {
    if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
      await navigator.share(shareData);
      if (logExportStatus) {
        logExportStatus.innerText = "Run log shared.";
      }
      return;
    }

    await navigator.share({
      title: shareData.title,
      text: `${shareData.text} Downloading the log file instead.`,
    });
    downloadLatestRunLog();
  } catch (error) {
    if (error?.name === "AbortError") {
      if (logExportStatus) {
        logExportStatus.innerText = "Share cancelled.";
      }
      return;
    }

    downloadLatestRunLog();
    if (logExportStatus) {
      logExportStatus.innerText = "Share was unavailable, so the run log was downloaded instead.";
    }
  }
}

function setHoldProgress(progress) {
  if (resetDeckFill) {
    resetDeckFill.style.width = `${Math.max(0, Math.min(100, progress * 100))}%`;
  }
}

function clearHoldVisuals() {
  resetDeckBtn?.classList.remove("is-armed");
  setHoldProgress(0);
  if (resetDeckLabel) {
    resetDeckLabel.innerText = "Hold To Reset Deck";
  }
}

function stopHoldTracking() {
  if (holdTimer) {
    clearTimeout(holdTimer);
    holdTimer = null;
  }
  if (holdRaf) {
    cancelAnimationFrame(holdRaf);
    holdRaf = 0;
  }
}

function updateHoldProgress() {
  if (!holdStartedAt || resetTriggered) return;
  const elapsed = performance.now() - holdStartedAt;
  const progress = Math.min(1, elapsed / HOLD_DURATION_MS);
  setHoldProgress(progress);

  if (resetDeckLabel) {
    resetDeckLabel.innerText = progress >= 1
      ? "Deck Reset"
      : `Hold ${Math.max(0, Math.ceil((HOLD_DURATION_MS - elapsed) / 1000))}s To Reset`;
  }

  if (progress < 1) {
    holdRaf = requestAnimationFrame(updateHoldProgress);
  }
}

function triggerDeckReset() {
  resetTriggered = true;
  stopHoldTracking();
  resetDeckAlterations();
  resetDeckBtn?.classList.remove("is-armed");
  setHoldProgress(1);
  if (resetDeckLabel) {
    resetDeckLabel.innerText = "Deck Reset";
  }
  if (settingsStatus) {
    settingsStatus.innerText = "Deck alterations cleared. Card-back stats remain untouched.";
  }
}

function beginResetHold() {
  stopHoldTracking();
  resetTriggered = false;
  holdStartedAt = performance.now();
  resetDeckBtn?.classList.add("is-armed");
  if (settingsStatus) {
    settingsStatus.innerText = "Keep holding to clear torn corners and other deck alterations.";
  }
  holdTimer = setTimeout(triggerDeckReset, HOLD_DURATION_MS);
  holdRaf = requestAnimationFrame(updateHoldProgress);
}

function cancelResetHold() {
  if (resetTriggered) return;
  stopHoldTracking();
  holdStartedAt = 0;
  clearHoldVisuals();
  if (settingsStatus) {
    settingsStatus.innerText = "Deck stats on the red back stay untouched.";
  }
}

function closeSettings() {
  const returnUrl = loadSettingsReturnUrl();
  clearSettingsReturnUrl();
  if (returnUrl) {
    window.location.href = returnUrl;
    return;
  }
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  window.location.href = "game.html";
}

exportLogBtn?.addEventListener("click", downloadLatestRunLog);
shareLogBtn?.addEventListener("click", shareLatestRunLog);

resetDeckBtn?.addEventListener("pointerdown", (e) => {
  if (e.button !== undefined && e.button !== 0) return;
  beginResetHold();
});

resetDeckBtn?.addEventListener("pointerup", cancelResetHold);
resetDeckBtn?.addEventListener("pointerleave", cancelResetHold);
resetDeckBtn?.addEventListener("pointercancel", cancelResetHold);

closeSettingsBtn?.addEventListener("click", closeSettings);

refreshRunLogExportState();
