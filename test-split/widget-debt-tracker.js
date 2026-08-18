
(function () {
  var FDEBT_KEY = "finDebtTrackerV1";
  var ddata = { starterTarget: 0, starterSaved: 0, debts: [], fullMonthly: 0, fullMonths: 3, fullSaved: 0 };
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
  function uid() { return Date.now() + "-" + Math.random().toString(36).slice(2, 8); }

  function loadDebt(cb) {
    if (!window.storage || !window.storage.get) { cb(); return; }
    window.storage.get(FDEBT_KEY, false).then(function (r) {
      if (r && r.value) {
        try {
          var p = JSON.parse(r.value);
          ddata.starterTarget = Number(p.starterTarget) || 0;
          ddata.starterSaved = Number(p.starterSaved) || 0;
          ddata.debts = Array.isArray(p.debts) ? p.debts.map(function (d) {
            return { id: d.id || uid(), name: d.name || "", amount: Number(d.amount) || 0 };
          }) : [];
          ddata.fullMonthly = Number(p.fullMonthly) || 0;
          ddata.fullMonths = Number(p.fullMonths) || 3;
          ddata.fullSaved = Number(p.fullSaved) || 0;
        } catch (e) {}
      }
      cb();
    }).catch(function () { cb(); });
  }
  function saveDebt() {
    if (!window.storage || !window.storage.set) return;
    window.storage.set(FDEBT_KEY, JSON.stringify(ddata), false).catch(function () {});
  }

  function totalDebt() {
    return ddata.debts.reduce(function (s, d) { return s + (Number(d.amount) || 0); }, 0);
  }
  function fullTarget() {
    return (Number(ddata.fullMonthly) || 0) * (Number(ddata.fullMonths) || 3);
  }

  function renderSteps() {
    var step1Done = ddata.starterTarget > 0 && ddata.starterSaved >= ddata.starterTarget;
    var step2Done = ddata.debts.length > 0 && totalDebt() === 0;
    var step2Skip = ddata.debts.length === 0;
    var step3Done = fullTarget() > 0 && ddata.fullSaved >= fullTarget();
    var active = 1;
    if (step1Done && !step2Done && !step2Skip) active = 2;
    else if (step1Done && (step2Done || step2Skip) && !step3Done) active = 3;
    else if (step1Done && (step2Done || step2Skip) && step3Done) active = 0;

    var steps = [
      { n: 1, label: "صندوق اولیه", done: step1Done },
      { n: 2, label: "صاف کردن بدهی", done: step2Done || step2Skip },
      { n: 3, label: "صندوق کامل", done: step3Done }
    ];
    document.getElementById("fdebt-steps").innerHTML = steps.map(function (s) {
      var cls = "fdebt-step" + (s.done ? " fdebt-step-done" : (s.n === active ? " fdebt-step-active" : ""));
      return '<div class="' + cls + '"><span class="fdebt-step-num">' + (s.done ? "✓" : s.n) + '</span>' + s.label + '</div>';
    }).join("");
  }

  function renderStarter() {
    document.getElementById("fdebt-starter-target").value = ddata.starterTarget ? ddata.starterTarget.toLocaleString("fa-IR") : "";
    document.getElementById("fdebt-starter-saved").value = ddata.starterSaved ? ddata.starterSaved.toLocaleString("fa-IR") : "";
    var pct = ddata.starterTarget > 0 ? Math.min(100, Math.round((ddata.starterSaved / ddata.starterTarget) * 100)) : 0;
    document.getElementById("fdebt-starter-fill").style.width = pct + "%";
    document.getElementById("fdebt-starter-label").textContent = ddata.starterTarget > 0
      ? (fmtT(ddata.starterSaved) + " از " + fmtT(ddata.starterTarget) + " (" + pct.toLocaleString("fa-IR") + "٪)")
      : "اول هدف صندوق اضطراری اولیه‌ات رو مشخص کن.";
  }

  function renderDebts() {
    var box = document.getElementById("fdebt-list");
    var totalBox = document.getElementById("fdebt-total");
    if (ddata.debts.length === 0) {
      box.innerHTML = '<div class="fdebt-empty">هنوز بدهی‌ای ثبت نشده.</div>';
      totalBox.textContent = "";
      renderSteps();
      return;
    }
    var sorted = ddata.debts.slice().sort(function (a, b) { return a.amount - b.amount; });
    if (sorted.every(function (d) { return d.amount === 0; })) {
      box.innerHTML = '<div class="fdebt-cleared">🎉 همه‌ی بدهی‌ها صاف شدن!</div>';
    } else {
      box.innerHTML = sorted.map(function (d, idx) {
        return '<div class="fdebt-item" data-id="' + d.id + '">' +
          '<div class="fdebt-item-rank">' + (idx + 1).toLocaleString("fa-IR") + '</div>' +
          '<div class="fdebt-item-body">' +
            '<div class="fdebt-item-name">' + (d.name || "بدون‌نام").replace(/</g, "&lt;") + '</div>' +
            '<div class="fdebt-item-amount">' + fmtT(d.amount) + '</div>' +
          '</div>' +
          '<button class="fdebt-item-del" data-act="pay" data-id="' + d.id + '" title="ثبت پرداخت">💳</button>' +
          '<button class="fdebt-item-del" data-act="del" data-id="' + d.id + '" title="حذف">✕</button>' +
        '</div>';
      }).join("");
    }
    totalBox.textContent = "مجموع بدهی باقی‌مانده: " + fmtT(totalDebt());
    renderSteps();
  }

  function renderFull() {
    document.getElementById("fdebt-full-monthly").value = ddata.fullMonthly ? ddata.fullMonthly.toLocaleString("fa-IR") : "";
    document.getElementById("fdebt-full-months").value = String(ddata.fullMonths || 3);
    document.getElementById("fdebt-full-saved").value = ddata.fullSaved ? ddata.fullSaved.toLocaleString("fa-IR") : "";
    var target = fullTarget();
    var pct = target > 0 ? Math.min(100, Math.round((ddata.fullSaved / target) * 100)) : 0;
    document.getElementById("fdebt-full-fill").style.width = pct + "%";
    document.getElementById("fdebt-full-label").textContent = target > 0
      ? (fmtT(ddata.fullSaved) + " از " + fmtT(target) + " (" + pct.toLocaleString("fa-IR") + "٪)")
      : "هزینه ماهانه‌ات رو وارد کن تا هدف صندوق کامل محاسبه بشه.";
  }

  function renderAll() { renderStarter(); renderDebts(); renderFull(); renderSteps(); }

  liveFormat(document.getElementById("fdebt-starter-target"));
  liveFormat(document.getElementById("fdebt-starter-saved"));
  liveFormat(document.getElementById("fdebt-amount-input"));
  liveFormat(document.getElementById("fdebt-full-monthly"));
  liveFormat(document.getElementById("fdebt-full-saved"));

  document.getElementById("fdebt-starter-save").addEventListener("click", function () {
    ddata.starterTarget = parseNum(document.getElementById("fdebt-starter-target").value);
    ddata.starterSaved = parseNum(document.getElementById("fdebt-starter-saved").value);
    saveDebt();
    renderStarter(); renderSteps();
  });

  document.getElementById("fdebt-add-btn").addEventListener("click", function () {
    var nameEl = document.getElementById("fdebt-name-input");
    var amountEl = document.getElementById("fdebt-amount-input");
    var name = (nameEl.value || "").trim();
    var amount = parseNum(amountEl.value);
    if (!name || !amount) return;
    ddata.debts.push({ id: uid(), name: name, amount: amount });
    saveDebt();
    nameEl.value = ""; amountEl.value = "";
    renderDebts();
  });

  document.getElementById("fdebt-list").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-act]");
    if (!btn) return;
    var id = btn.getAttribute("data-id");
    var d = ddata.debts.find(function (x) { return x.id === id; });
    if (!d) return;
    if (btn.getAttribute("data-act") === "del") {
      ddata.debts = ddata.debts.filter(function (x) { return x.id !== id; });
      saveDebt();
      renderDebts();
    } else if (btn.getAttribute("data-act") === "pay") {
      var input = window.prompt("مبلغ پرداختی برای «" + d.name + "» چقدره؟ (تومان)");
      if (input == null) return;
      var pay = parseNum(input);
      if (!pay) return;
      d.amount = Math.max(0, d.amount - pay);
      saveDebt();
      renderDebts();
    }
  });

  document.getElementById("fdebt-full-save").addEventListener("click", function () {
    ddata.fullMonthly = parseNum(document.getElementById("fdebt-full-monthly").value);
    ddata.fullMonths = Number(document.getElementById("fdebt-full-months").value) || 3;
    ddata.fullSaved = parseNum(document.getElementById("fdebt-full-saved").value);
    saveDebt();
    renderFull(); renderSteps();
  });
  document.getElementById("fdebt-full-months").addEventListener("change", function (e) {
    ddata.fullMonths = Number(e.target.value) || 3;
    saveDebt();
    renderFull(); renderSteps();
  });

  var debtToggleBtn = document.getElementById("fin-debt-toggle");
  var debtBody = document.getElementById("fin-debt-body");
  var debtArrow = document.getElementById("fin-debt-arrow");
  if (debtToggleBtn && debtBody && debtArrow) {
    var dOpen = false;
    function applyDebtToggle() {
      debtBody.classList.toggle("fin-section-collapsed", !dOpen);
      debtArrow.classList.toggle("fin-section-arrow-open", dOpen);
    }
    applyDebtToggle();
    debtToggleBtn.addEventListener("click", function () { dOpen = !dOpen; applyDebtToggle(); });
  }

  loadDebt(function () { renderAll(); });
})();
