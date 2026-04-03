const HOLD_DURATION_MS = 5000;

const resetDeckBtn = document.getElementById("reset-deck-btn");
const resetDeckFill = document.getElementById("reset-deck-fill");
const resetDeckLabel = document.getElementById("reset-deck-label");
const settingsStatus = document.getElementById("settings-status");
const closeSettingsBtn = document.getElementById("settings-close-btn");

let holdStartedAt = 0;
let holdTimer = null;
let holdRaf = 0;
let resetTriggered = false;

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

resetDeckBtn?.addEventListener("pointerdown", (e) => {
  if (e.button !== undefined && e.button !== 0) return;
  beginResetHold();
});

resetDeckBtn?.addEventListener("pointerup", cancelResetHold);
resetDeckBtn?.addEventListener("pointerleave", cancelResetHold);
resetDeckBtn?.addEventListener("pointercancel", cancelResetHold);

closeSettingsBtn?.addEventListener("click", closeSettings);
