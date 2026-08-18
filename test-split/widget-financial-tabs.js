
(function () {
  var tabs = document.querySelectorAll("#fin-tabs .fin-tab");
  var panels = document.querySelectorAll(".fin-section[data-fintab]");
  function showTab(key) {
    tabs.forEach(function (t) { t.classList.toggle("fin-tab-active", t.getAttribute("data-fintab") === key); });
    panels.forEach(function (p) { p.classList.toggle("fin-tab-active", p.getAttribute("data-fintab") === key); });
  }
  tabs.forEach(function (t) {
    t.addEventListener("click", function () { showTab(t.getAttribute("data-fintab")); });
  });
})();
