
(function () {
  var FCSP_KEY = "finConsciousSpendingV1";
  var FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
  function faToEnDigits(s) {
    return String(s).replace(/[۰-۹]/g, function (d) { return String(FA_DIGITS.indexOf(d)); });
  }
  function parseNum(str) {
    var cleaned = faToEnDigits(str).replace(/[^\d.]/g, "");
    return Number(cleaned) || 0;
  }
  function liveFormat(el) {
    if (!el) return;
    el.addEventListener("input", function () {
      var atEnd = el.selectionEnd === el.value.length;
      var num = parseNum(el.value);
      el.value = el.value.trim() === "" ? "" : num.toLocaleString("fa-IR");
      if (atEnd) { var len = el.value.length; el.setSelectionRange(len, len); }
    });
  }
  function fmtT(v) { return Math.round(v).toLocaleString("fa-IR") + " تومان"; }

  // Ranges and defaults per Ramit Sethi's Conscious Spending Plan (I Will Teach You to Be Rich)
  var FCSP_BUCKETS = [
    { key: "fixed", icon: "🏠", label: "هزینه‌های ثابت", min: 50, max: 60, def: 55, color: "#D9534F",
      desc: "اجاره/قسط مسکن، قبوض، بیمه، قسط ماشین، بدهی‌ها، خرید ضروری، اینترنت و موبایل" },
    { key: "invest", icon: "📈", label: "سرمایه‌گذاری", min: 10, max: 10, def: 10, color: "#5B8DBE",
      desc: "سرمایه‌گذاری بلندمدت برای آینده — بورس، صندوق سرمایه‌گذاری، بازنشستگی" },
    { key: "save", icon: "💰", label: "پس‌انداز", min: 5, max: 10, def: 7, color: "#F0C929",
      desc: "اهداف کوتاه و میان‌مدت — صندوق اضطراری، سفر، عروسی، پیش‌پرداخت خونه" },
    { key: "guilt", icon: "🎉", label: "خرج بدون احساس گناه", min: 20, max: 35, def: 28, color: "#4CAF7D",
      desc: "رستوران، سفر، سرگرمی، خرید دلخواه — هرچی دوست داری، بدون عذاب وجدان" }
  ];

  var cdata = { income: 0, buckets: {} };
  FCSP_BUCKETS.forEach(function (b) { cdata.buckets[b.key] = { targetPct: b.def, actual: 0 }; });

  // ---- pull each bucket's "خرج فعلی" from the categories (جعبه‌ها) linked to it in the expense
  // tracker, so it doesn't have to be typed twice. A bucket only switches to auto mode once at
  // least one expense category is connected to it; otherwise the manual input still works as before.
  var bucketAuto = {};
  FCSP_BUCKETS.forEach(function (b) { bucketAuto[b.key] = { active: false, actual: 0 }; });
  function loadBucketActuals(cb) {
    FCSP_BUCKETS.forEach(function (b) { bucketAuto[b.key] = { active: false, actual: 0 }; });
    if (!window.storage || !window.storage.get) { cb(); return; }
    window.storage.get("finExpenseTrackerV1", false).then(function (r) {
      if (r && r.value) {
        try {
          var p = JSON.parse(r.value);
          var categories = p.categories || [];
          var entries = p.entries || [];
          var now = new Date();
          var prefix = now.getFullYear() + "-" + (now.getMonth() + 1 < 10 ? "0" : "") + (now.getMonth() + 1);
          var bucketByCat = {};
          categories.forEach(function (c) {
            if (c.type === "expense" && c.bucket) {
              bucketByCat[c.id] = c.bucket;
              if (bucketAuto[c.bucket]) bucketAuto[c.bucket].active = true;
            }
          });
          entries.forEach(function (e) {
            if (!e.date || e.date.indexOf(prefix + "-") !== 0) return;
            var bk = e.catId ? bucketByCat[e.catId] : null;
            if (bk && bucketAuto[bk]) bucketAuto[bk].actual += Number(e.amount) || 0;
          });
        } catch (e) {}
      }
      cb();
    }).catch(function () { cb(); });
  }
  function effectiveActual(key) {
    return bucketAuto[key] && bucketAuto[key].active ? bucketAuto[key].actual : cdata.buckets[key].actual;
  }

  function loadCsp(cb) {
    if (!window.storage || !window.storage.get) { cb(); return; }
    window.storage.get(FCSP_KEY, false).then(function (r) {
      if (r && r.value) {
        try {
          var p = JSON.parse(r.value);
          cdata.income = Number(p.income) || 0;
          FCSP_BUCKETS.forEach(function (b) {
            var saved = (p.buckets && p.buckets[b.key]) || {};
            cdata.buckets[b.key] = {
              targetPct: Number(saved.targetPct) || b.def,
              actual: Number(saved.actual) || 0
            };
          });
        } catch (e) {}
      }
      cb();
    }).catch(function () { cb(); });
  }
  function saveCsp() {
    if (!window.storage || !window.storage.set) return;
    window.storage.set(FCSP_KEY, JSON.stringify(cdata), false).catch(function () {});
  }

  function renderBuckets() {
    var box = document.getElementById("fcsp-buckets");
    box.innerHTML = FCSP_BUCKETS.map(function (b) {
      var st = cdata.buckets[b.key];
      var auto = bucketAuto[b.key] && bucketAuto[b.key].active;
      var actual = effectiveActual(b.key);
      var targetAmt = cdata.income * (st.targetPct / 100);
      var actualPct = cdata.income > 0 ? (actual / cdata.income) * 100 : 0;
      var barPct = targetAmt > 0 ? Math.min(130, Math.round((actual / targetAmt) * 100)) : 0;
      var targetMarkerPct = targetAmt > 0 ? Math.min(100, 100) : 0;
      var overFixed = (b.key === "fixed" || b.key === "invest" || b.key === "save") && actual > targetAmt && cdata.income > 0;
      var statusCls = "", statusText = "";
      if (cdata.income > 0) {
        if (overFixed) { statusCls = "fcsp-status-over"; statusText = "بیشتر از هدف (" + actualPct.toFixed(1).replace(".", "٫") + "٪)"; }
        else { statusCls = "fcsp-status-under"; statusText = actualPct.toFixed(1).replace(".", "٫") + "٪ از درآمد — هدف " + fmtT(targetAmt); }
      } else {
        statusText = "اول درآمدت رو وارد کن.";
      }
      return '<div class="fcsp-bucket" data-key="' + b.key + '">' +
        '<div class="fcsp-bucket-head">' +
          '<span class="fcsp-bucket-icon">' + b.icon + '</span>' +
          '<span class="fcsp-bucket-title">' + b.label + '</span>' +
          '<span class="fcsp-bucket-range">' + (b.min === b.max ? b.min : (b.min + '–' + b.max)) + '٪</span>' +
        '</div>' +
        '<div class="fcsp-bucket-desc">' + b.desc + '</div>' +
        '<div class="fcsp-bucket-row">' +
          '<label>هدف (٪)</label>' +
          '<input type="number" min="0" max="100" class="fcsp-target-input" data-key="' + b.key + '" value="' + st.targetPct + '">' +
        '</div>' +
        '<div class="fcsp-bucket-row">' +
          '<label>خرج فعلی</label>' +
          '<input type="text" inputmode="numeric" class="fcsp-actual-input" data-key="' + b.key + '"' + (auto ? " readonly" : "") +
            ' value="' + (actual ? actual.toLocaleString("fa-IR") : "") + '" placeholder="مبلغ ماهانه">' +
        '</div>' +
        (auto ? '<div class="fcsp-bucket-source">🔗 این عدد خودکار از جعبه‌های وصل‌شده به این سطل تو «ردیابی هزینه‌ها» محاسبه می‌شه.</div>' : '') +
        '<div class="fcsp-bucket-bar-wrap"><div class="fcsp-bucket-bar-fill" style="width:' + Math.min(100, barPct) + '%; background:' + b.color + ';"></div></div>' +
        '<div class="fcsp-bucket-status ' + statusCls + '">' + statusText + '</div>' +
      '</div>';
    }).join("");

    box.querySelectorAll(".fcsp-target-input").forEach(function (el) {
      el.addEventListener("change", function () {
        var key = el.getAttribute("data-key");
        cdata.buckets[key].targetPct = Number(el.value) || 0;
        saveCsp();
        renderBuckets(); renderTotalCheck();
      });
    });
    box.querySelectorAll(".fcsp-actual-input:not([readonly])").forEach(function (el) {
      liveFormat(el);
      el.addEventListener("change", function () {
        var key = el.getAttribute("data-key");
        cdata.buckets[key].actual = parseNum(el.value);
        saveCsp();
        renderBuckets(); renderTotalCheck();
      });
    });
  }

  function renderTotalCheck() {
    var box = document.getElementById("fcsp-total-check");
    var totalTarget = FCSP_BUCKETS.reduce(function (s, b) { return s + (cdata.buckets[b.key].targetPct || 0); }, 0);
    var totalActual = FCSP_BUCKETS.reduce(function (s, b) { return s + (effectiveActual(b.key) || 0); }, 0);
    var cls = totalTarget === 100 ? "fcsp-total-ok" : "fcsp-total-warn";
    var msg = "مجموع درصدهای هدف: " + totalTarget.toLocaleString("fa-IR") + "٪" + (totalTarget !== 100 ? " (بهتره ۱۰۰٪ بشه)" : " ✓");
    if (cdata.income > 0) {
      var remain = cdata.income - totalActual;
      msg += " — مجموع خرج فعلی: " + fmtT(totalActual) + (remain >= 0 ? " (باقی‌مانده: " + fmtT(remain) + ")" : " (بیشتر از درآمد!)");
    }
    box.className = "fcsp-total-check " + cls;
    box.textContent = msg;
  }

  document.getElementById("fcsp-income-input").value = "";
  liveFormat(document.getElementById("fcsp-income-input"));
  document.getElementById("fcsp-income-input").addEventListener("change", function (e) {
    cdata.income = parseNum(e.target.value);
    saveCsp();
    renderBuckets(); renderTotalCheck();
  });

  var cspToggleBtn = document.getElementById("fin-csp-toggle");
  var cspBody = document.getElementById("fin-csp-body");
  var cspArrow = document.getElementById("fin-csp-arrow");
  if (cspToggleBtn && cspBody && cspArrow) {
    var cOpen = false;
    function applyCspToggle() {
      cspBody.classList.toggle("fin-section-collapsed", !cOpen);
      cspArrow.classList.toggle("fin-section-arrow-open", cOpen);
    }
    applyCspToggle();
    cspToggleBtn.addEventListener("click", function () { cOpen = !cOpen; applyCspToggle(); });
  }

  window.bjRefreshFcspBuckets = function () {
    loadBucketActuals(function () { renderBuckets(); renderTotalCheck(); });
  };

  loadCsp(function () {
    document.getElementById("fcsp-income-input").value = cdata.income ? cdata.income.toLocaleString("fa-IR") : "";
    loadBucketActuals(function () {
      renderBuckets();
      renderTotalCheck();
    });
  });
})();
