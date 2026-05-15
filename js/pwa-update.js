(function () {
  if (!("serviceWorker" in navigator)) return;

  let waitingWorker = null;
  let refreshing = false;

  function showUpdateBanner(worker) {
    waitingWorker = worker;
    let banner = document.getElementById("pwa-update-banner");
    if (!banner) {
      if (!document.getElementById("pwa-update-style")) {
        const style = document.createElement("style");
        style.id = "pwa-update-style";
        style.textContent = `
          #pwa-update-banner {
            position: fixed;
            left: max(14px, env(safe-area-inset-left));
            right: max(14px, env(safe-area-inset-right));
            bottom: max(14px, env(safe-area-inset-bottom));
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 12px 14px;
            border: 1px solid rgba(255, 255, 255, 0.24);
            border-radius: 14px;
            background: rgba(26, 16, 36, 0.96);
            color: #fff;
            box-shadow: 0 16px 36px rgba(0, 0, 0, 0.36);
            font: 700 15px/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          }
          #pwa-update-refresh {
            border: 0;
            border-radius: 10px;
            padding: 9px 12px;
            background: #ff66f7;
            color: #17051d;
            font: inherit;
            cursor: pointer;
          }
        `;
        document.head.appendChild(style);
      }

      banner = document.createElement("div");
      banner.id = "pwa-update-banner";
      banner.setAttribute("role", "status");
      banner.innerHTML = `
        <span>Update available.</span>
        <button type="button" id="pwa-update-refresh">Refresh</button>
      `;
      document.body.appendChild(banner);
    }

    const refreshButton = document.getElementById("pwa-update-refresh");
    refreshButton?.addEventListener("click", () => {
      waitingWorker?.postMessage({ type: "SKIP_WAITING" });
    }, { once: true });
  }

  function watchRegistration(registration) {
    if (registration.waiting && navigator.serviceWorker.controller) {
      showUpdateBanner(registration.waiting);
    }

    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (!newWorker) return;
      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          showUpdateBanner(newWorker);
        }
      });
    });
  }

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js")
      .then(watchRegistration)
      .catch(() => {});
  });
}());
