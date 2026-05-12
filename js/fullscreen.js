(function () {
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

  applyViewportHeightVar();
  window.addEventListener("resize", applyViewportHeightVar, { passive: true });
  window.addEventListener("orientationchange", applyViewportHeightVar, { passive: true });
  window.addEventListener("pageshow", applyViewportHeightVar, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", applyViewportHeightVar, { passive: true });
  }
})();
