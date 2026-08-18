
(function () {
  // ---- redesigned segmented mode control: drives the same two checkboxes
  // (#adhd-app-toggle / #adhd-visual-toggle) the logic above already listens
  // to, so all existing localStorage / reload behavior stays exactly as-is. ----
  var appCb = document.getElementById("adhd-app-toggle");
  var visCb = document.getElementById("adhd-visual-toggle");
  var segOff = document.getElementById("adhd-seg-off");
  var segVisual = document.getElementById("adhd-seg-visual");
  var segFull = document.getElementById("adhd-seg-full");
  var statusBar = document.getElementById("adhd-status");
  var statusText = document.getElementById("adhd-status-text");
  var fab = document.getElementById("adhd-fab");
  if (!appCb || !visCb || !segOff || !segVisual || !segFull) return;

  function fireChange(cb) {
    var ev;
    try { ev = new Event("change", { bubbles: true }); } catch (e) { ev = document.createEvent("Event"); ev.initEvent("change", true, true); }
    cb.dispatchEvent(ev);
  }

  function refreshUI() {
    var state = appCb.checked ? "full" : (visCb.checked ? "visual" : "off");
    [segOff, segVisual, segFull].forEach(function (b) { b.classList.remove("active"); });
    (state === "full" ? segFull : state === "visual" ? segVisual : segOff).classList.add("active");
    if (statusBar) {
      statusBar.setAttribute("data-state", state);
      statusText.textContent = state === "full" ? "حالت تمرکز روشنه — کل اپ"
        : state === "visual" ? "حالت تمرکز روشنه — فقط بصری"
        : "حالت تمرکز خاموشه";
    }
    if (fab) fab.setAttribute("data-active", state === "off" ? "0" : "1");
  }

  segOff.addEventListener("click", function () {
    if (appCb.checked) { appCb.checked = false; fireChange(appCb); return; } // triggers reload
    if (visCb.checked) { visCb.checked = false; fireChange(visCb); refreshUI(); }
  });
  segVisual.addEventListener("click", function () {
    if (appCb.checked) {
      try { localStorage.setItem("adhdVisualMode", "1"); } catch (e) {}
      appCb.checked = false; fireChange(appCb); return; // triggers reload; visual stays on after
    }
    if (!visCb.checked) { visCb.checked = true; fireChange(visCb); refreshUI(); }
  });
  segFull.addEventListener("click", function () {
    if (!appCb.checked) { appCb.checked = true; fireChange(appCb); } // triggers reload
  });

  refreshUI();
})();
