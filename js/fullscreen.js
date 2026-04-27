(function () {
  const ATTEMPT_FLAG = "hl_prototype_fullscreen_attempted";
  let viewportTicking = false;

  function applyViewportHeightVar() {
    if (viewportTicking) return;
    viewportTicking = true;
    window.requestAnimationFrame(() => {
      viewportTicking = false;
      const viewport = window.visualViewport;
      const height =
        Math.floor((viewport && viewport.height) || window.innerHeight || document.documentElement.clientHeight);
      if (!height) return;
      document.documentElement.style.setProperty("--app-height", `${height}px`);
    });
  }

  let fullscreenAlreadyAttempted = false;
  try {
    fullscreenAlreadyAttempted = sessionStorage.getItem(ATTEMPT_FLAG) === "1";
  } catch {
    // continue
  }

  let done = false;

  function markDone() {
    done = true;
    try {
      sessionStorage.setItem(ATTEMPT_FLAG, "1");
    } catch {
      // ignore storage failures
    }
    window.removeEventListener("pointerdown", onFirstGesture, true);
    window.removeEventListener("touchstart", onFirstGesture, true);
    window.removeEventListener("click", onFirstGesture, true);
    window.removeEventListener("keydown", onFirstGesture, true);
  }

  function requestFullscreenBestEffort() {
    if (done) return;

    const doc = document;
    if (doc.fullscreenElement || doc.webkitFullscreenElement) {
      markDone();
      return;
    }

    const root = doc.documentElement;
    const requestFn =
      root.requestFullscreen ||
      root.webkitRequestFullscreen ||
      root.msRequestFullscreen;

    if (typeof requestFn !== "function") {
      markDone();
      return;
    }

    Promise.resolve(requestFn.call(root))
      .catch(() => {
        // ignore user-agent rejections
      })
      .finally(markDone);
  }

  function onFirstGesture() {
    requestFullscreenBestEffort();
  }

  applyViewportHeightVar();
  window.addEventListener("resize", applyViewportHeightVar, { passive: true });
  window.addEventListener("orientationchange", applyViewportHeightVar, { passive: true });
  window.addEventListener("pageshow", applyViewportHeightVar, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", applyViewportHeightVar, { passive: true });
  }

  if (!fullscreenAlreadyAttempted) {
    window.addEventListener("pointerdown", onFirstGesture, { capture: true, passive: true });
    window.addEventListener("touchstart", onFirstGesture, { capture: true, passive: true });
    window.addEventListener("click", onFirstGesture, { capture: true, passive: true });
    window.addEventListener("keydown", onFirstGesture, { capture: true });
  }
})();
