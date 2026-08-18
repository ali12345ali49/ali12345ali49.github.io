
  (function () {
    var pendingOk = null;
    function close() {
      document.getElementById("bj-cf-overlay").style.display = "none";
      pendingOk = null;
    }
    window.bjConfirm = function (message, onConfirm) {
      document.getElementById("bj-cf-message").textContent = message;
      document.getElementById("bj-cf-overlay").style.display = "flex";
      pendingOk = onConfirm;
    };
    var prResolve = null;
    function prFinish(val) {
      document.getElementById("bj-pr-overlay").style.display = "none";
      var r = prResolve;
      prResolve = null;
      if (r) r(val);
    }
    window.bjPrompt = function (title, defaultValue, placeholder) {
      return new Promise(function (resolve) {
        prResolve = resolve;
        document.getElementById("bj-pr-title").textContent = title;
        var input = document.getElementById("bj-pr-input");
        input.value = defaultValue || "";
        input.placeholder = placeholder || "";
        document.getElementById("bj-pr-overlay").style.display = "flex";
        setTimeout(function () { input.focus(); input.select(); }, 30);
      });
    };
    document.addEventListener("DOMContentLoaded", function () {
      document.getElementById("bj-cf-ok").addEventListener("click", function () {
        var fn = pendingOk;
        close();
        if (fn) fn();
      });
      document.getElementById("bj-cf-cancel").addEventListener("click", close);
      document.getElementById("bj-cf-overlay").addEventListener("click", function (e) {
        if (e.target === this) close();
      });
      var prInput = document.getElementById("bj-pr-input");
      document.getElementById("bj-pr-confirm").addEventListener("click", function () { prFinish(prInput.value); });
      document.getElementById("bj-pr-cancel").addEventListener("click", function () { prFinish(null); });
      prInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") prFinish(prInput.value);
        if (e.key === "Escape") prFinish(null);
      });
      document.getElementById("bj-pr-overlay").addEventListener("click", function (e) {
        if (e.target === this) prFinish(null);
      });
    });
  })();
