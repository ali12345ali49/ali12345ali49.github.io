
(function () {
  var overlay = document.getElementById("fin-overlay");
  var panel = document.getElementById("fin-panel");
  var fab = document.getElementById("fin-fab");
  function openPanel() { overlay.style.display = "block"; panel.style.display = "block"; }
  function closePanel() { overlay.style.display = "none"; panel.style.display = "none"; }
  fab.addEventListener("click", openPanel);
  document.getElementById("fin-close").addEventListener("click", closePanel);
  overlay.addEventListener("click", closePanel);

  function bindFinSectionToggle(btnId, bodyId, arrowId) {
    var btn = document.getElementById(btnId);
    var body = document.getElementById(bodyId);
    var arrow = document.getElementById(arrowId);
    if (!btn || !body || !arrow) return;
    var open = false;
    function apply() {
      body.classList.toggle("fin-section-collapsed", !open);
      arrow.classList.toggle("fin-section-arrow-open", open);
    }
    apply();
    btn.addEventListener("click", function () { open = !open; apply(); });
  }
  bindFinSectionToggle("fin-exp-toggle", "fin-exp-body", "fin-exp-arrow");
  bindFinSectionToggle("fin-sav-toggle", "fin-sav-body", "fin-sav-arrow");
})();
