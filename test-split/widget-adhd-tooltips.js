document.addEventListener("DOMContentLoaded", function () {
    (function () {
      var btn = document.getElementById("adhd-intro-info-btn");
      var tip = document.getElementById("adhd-intro-sub");
      if (btn && tip) {
        btn.addEventListener("click", function () {
          var open = tip.style.display === "none";
          tip.style.display = open ? "block" : "none";
          btn.classList.toggle("bjrs-lit", open);
        });
      }
    })();
    (function () {
      var btn = document.getElementById("adhd-mode-info-btn");
      var tip = document.getElementById("adhd-mode-desc");
      if (btn && tip) {
        btn.addEventListener("click", function () {
          var open = tip.style.display === "none" || !tip.style.display;
          tip.style.display = open ? "block" : "none";
          btn.classList.toggle("bjrs-lit", open);
        });
      }
    })();
      (function () {
        var btn = document.getElementById("adhd-next-info-btn");
        var tip = document.getElementById("adhd-next-hint-rest");
        if (btn && tip) {
          btn.addEventListener("click", function () {
            var open = tip.style.display === "none";
            tip.style.display = open ? "block" : "none";
            btn.classList.toggle("bjrs-lit", open);
          });
        }
      })();
    (function () {
      var btn = document.getElementById("adhd-park-info-btn");
      var tip = document.getElementById("adhd-park-hint");
      if (btn && tip) {
        btn.addEventListener("click", function () {
          var open = tip.style.display === "none";
          tip.style.display = open ? "block" : "none";
          btn.classList.toggle("bjrs-lit", open);
        });
      }
    })();
});
