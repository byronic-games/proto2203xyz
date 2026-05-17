(function () {
  if (!("serviceWorker" in navigator)) return;

  let waitingWorker = null;
  let refreshing = false;

  function activateUpdateWorker(worker) {
    waitingWorker = worker;
    waitingWorker?.postMessage({ type: "SKIP_WAITING" });
  }

  function watchRegistration(registration) {
    if (registration.waiting && navigator.serviceWorker.controller) {
      activateUpdateWorker(registration.waiting);
    }

    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (!newWorker) return;
      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          activateUpdateWorker(newWorker);
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
