
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    // Check the file actually exists before registering — avoids a noisy
    // "Failed to register a ServiceWorker... 404" browser console error in
    // any environment where sw.js isn't served alongside this page (like a
    // preview/sandbox), while still registering normally once deployed
    // somewhere sw.js is present (e.g. GitHub Pages).
    fetch("sw.js", { method: "HEAD" }).then(function (res) {
      if (res && res.ok) {
        navigator.serviceWorker.register("sw.js").catch(function (err) {
          console.warn("SW registration failed:", err);
        });
      }
    }).catch(function () {});
  });
}
