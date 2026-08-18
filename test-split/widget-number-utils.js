
(function () {
  function parseNum(str) {
    var cleaned = String(str || "").replace(/[۰-۹]/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹".indexOf(d); }).replace(/[^\d.\-]/g, "");
    return Number(cleaned) || 0;
  }
  function liveFormat(el) {
    el.addEventListener("input", function () {
      var num = parseNum(el.value);
      el.value = num ? num.toLocaleString("fa-IR") : "";
    });
  }
  function fmtT(v) { return Math.round(v).toLocaleString("fa-IR") + " تومان"; }
  function fmtPct(v) { return v.toLocaleString("fa-IR", { maximumFractionDigits: 1, minimumFractionDigits: 1 }) + "٪"; }

  // section collapse
  var infToggleBtn = document.getElementById("fin-inf-toggle");
  var infBody = document.getElementById("fin-inf-body");
  var infArrow = document.getElementById("fin-inf-arrow");
  if (infToggleBtn && infBody && infArrow) {
    var iOpen = false;
    function applyInfToggle() {
      infBody.classList.toggle("fin-section-collapsed", !iOpen);
      infArrow.classList.toggle("fin-section-arrow-open", iOpen);
    }
    applyInfToggle();
    infToggleBtn.addEventListener("click", function () { iOpen = !iOpen; applyInfToggle(); });
  }

  // price-block mode tabs (rate vs future)
  var pModeBtns = document.querySelectorAll("#finf-price-modes .finf-mode-btn");
  var pModePanels = document.querySelectorAll(".finf-mode-panel[data-finfmode]");
  pModeBtns.forEach(function (b) {
    b.addEventListener("click", function () {
      var key = b.getAttribute("data-finfmode");
      pModeBtns.forEach(function (x) { x.classList.toggle("finf-mode-active", x === b); });
      pModePanels.forEach(function (p) { p.classList.toggle("finf-mode-active", p.getAttribute("data-finfmode") === key); });
    });
  });

  // ---- Block 1: purchasing power erosion ----
  var eAmountEl = document.getElementById("finf-erosion-amount");
  var eRateEl = document.getElementById("finf-erosion-rate");
  var eYearsEl = document.getElementById("finf-erosion-years");
  var eResultEl = document.getElementById("finf-erosion-result");
  liveFormat(eAmountEl);
  function renderErosion() {
    var amount = parseNum(eAmountEl.value);
    var rate = parseNum(eRateEl.value);
    var years = parseNum(eYearsEl.value);
    if (!amount || !rate || !years) { eResultEl.innerHTML = ""; return; }
    var power = amount / Math.pow(1 + rate / 100, years);
    var lossPct = 100 - (power / amount) * 100;
    eResultEl.innerHTML =
      '<div class="finf-result-card">' +
        '<div class="finf-result-row"><span>الان داری</span><b>' + fmtT(amount) + '</b></div>' +
        '<div class="finf-result-row finf-result-main"><span>بعد از ' + years.toLocaleString("fa-IR") + ' سال، معادل قدرت خرید امروزه</span><b class="finf-val-neg">' + fmtT(power) + '</b></div>' +
        '<div class="finf-badge finf-badge-warn">یعنی اگه این پول رو سرمایه‌گذاری نکنی، ' + fmtPct(lossPct) + ' از قدرت خریدش رو از دست می‌ده — با این مبلغ فقط به‌اندازه‌ی ' + fmtT(power) + ' امروز می‌تونی خرید کنی.</div>' +
      '</div>';
  }
  [eAmountEl, eRateEl, eYearsEl].forEach(function (el) { el.addEventListener("input", renderErosion); });

  // ---- Block 2a: inflation rate from two prices ----
  var rOldEl = document.getElementById("finf-rate-old");
  var rNewEl = document.getElementById("finf-rate-new");
  var rResultEl = document.getElementById("finf-rate-result");
  liveFormat(rOldEl); liveFormat(rNewEl);
  function renderRate() {
    var oldP = parseNum(rOldEl.value);
    var newP = parseNum(rNewEl.value);
    if (!oldP || !newP) { rResultEl.innerHTML = ""; return; }
    var rate = ((newP - oldP) / oldP) * 100;
    rResultEl.innerHTML =
      '<div class="finf-result-card">' +
        '<div class="finf-result-row finf-result-main"><span>نرخ تورم / رشد قیمت</span><b class="' + (rate >= 0 ? "finf-val-neg" : "finf-val-pos") + '">' + fmtPct(rate) + '</b></div>' +
        '<div class="finf-result-row"><span>اختلاف قیمت</span><b>' + fmtT(Math.abs(newP - oldP)) + '</b></div>' +
      '</div>';
  }
  [rOldEl, rNewEl].forEach(function (el) { el.addEventListener("input", renderRate); });

  // ---- Block 2b: future price projection (up to 10 years) ----
  var fPriceEl = document.getElementById("finf-future-price");
  var fRateEl = document.getElementById("finf-future-rate");
  var fYearsEl = document.getElementById("finf-future-years");
  var fResultEl = document.getElementById("finf-future-result");
  liveFormat(fPriceEl);
  function renderFuture() {
    var price = parseNum(fPriceEl.value);
    var rate = parseNum(fRateEl.value);
    var years = Math.min(10, Math.max(0, Math.round(parseNum(fYearsEl.value))));
    if (!price || !rate || !years) { fResultEl.innerHTML = ""; return; }
    var rows = "";
    for (var y = 1; y <= years; y++) {
      var p = price * Math.pow(1 + rate / 100, y);
      rows += '<tr><td>سال ' + y.toLocaleString("fa-IR") + '</td><td>' + fmtT(p) + '</td></tr>';
    }
    fResultEl.innerHTML =
      '<div class="finf-table-wrap"><table class="finf-table"><thead><tr><th>سال آینده</th><th>قیمت تخمینی</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }
  [fPriceEl, fRateEl, fYearsEl].forEach(function (el) { el.addEventListener("input", renderFuture); });

  // ---- Block 3: real investment return vs inflation ----
  var iPrincipalEl = document.getElementById("finf-inv-principal");
  var iReturnEl = document.getElementById("finf-inv-return");
  var iTaxEl = document.getElementById("finf-inv-tax");
  var iFeeEl = document.getElementById("finf-inv-fee");
  var iInflationEl = document.getElementById("finf-inv-inflation");
  var iResultEl = document.getElementById("finf-inv-result");
  liveFormat(iPrincipalEl);
  function renderInvestment() {
    var principal = parseNum(iPrincipalEl.value);
    var retRate = parseNum(iReturnEl.value);
    var tax = parseNum(iTaxEl.value);
    var fee = parseNum(iFeeEl.value);
    var inflation = parseNum(iInflationEl.value);
    if (!principal || !inflation) { iResultEl.innerHTML = ""; return; }
    var grossProfit = principal * (retRate / 100);
    var afterTax = grossProfit * (1 - tax / 100);
    var feeAmount = principal * (fee / 100);
    var netProfit = afterTax - feeAmount;
    var netReturnPct = (netProfit / principal) * 100;
    var realReturnPct = ((1 + netReturnPct / 100) / (1 + inflation / 100) - 1) * 100;
    var badgeCls, badgeText;
    if (realReturnPct > 1) {
      badgeCls = "finf-badge-good";
      badgeText = "✅ سود واقعی داری — بعد از کسر مالیات، کارمزد و تورم، قدرت خریدت " + fmtPct(realReturnPct) + " در سال بیشتر می‌شه.";
    } else if (realReturnPct >= -1) {
      badgeCls = "finf-badge-neutral";
      badgeText = "⚖️ سود واقعی نداری — این سرمایه‌گذاری فقط ارزش فعلی پولت رو حفظ می‌کنه، سودش تقریباً برابر تورمه.";
    } else {
      badgeCls = "finf-badge-warn";
      badgeText = "🔻 داری ضرر می‌کنی — بعد از کسر مالیات، کارمزد و تورم، قدرت خرید پولت هر سال " + fmtPct(Math.abs(realReturnPct)) + " کم می‌شه.";
    }
    iResultEl.innerHTML =
      '<div class="finf-result-card">' +
        '<div class="finf-result-row"><span>سود ناخالص</span><b>' + fmtT(grossProfit) + '</b></div>' +
        '<div class="finf-result-row"><span>سود بعد از مالیات</span><b>' + fmtT(afterTax) + '</b></div>' +
        '<div class="finf-result-row"><span>سود بعد از کارمزد</span><b>' + fmtT(netProfit) + '</b></div>' +
        '<div class="finf-result-row"><span>بازده خالص اسمی</span><b>' + fmtPct(netReturnPct) + '</b></div>' +
        '<div class="finf-result-row finf-result-main"><span>بازده واقعی (بعد از تورم)</span><b class="' + (realReturnPct > 1 ? "finf-val-pos" : (realReturnPct < -1 ? "finf-val-neg" : "")) + '">' + fmtPct(realReturnPct) + '</b></div>' +
        '<div class="finf-badge ' + badgeCls + '">' + badgeText + '</div>' +
      '</div>';
  }
  [iPrincipalEl, iReturnEl, iTaxEl, iFeeEl, iInflationEl].forEach(function (el) { el.addEventListener("input", renderInvestment); });

  // ---- Block 4: compare multiple options against inflation ----
  var cmpInflationEl = document.getElementById("finf-cmp-inflation");
  var cmpYearsEl = document.getElementById("finf-cmp-years");
  var cmpResultEl = document.getElementById("finf-cmp-result");
  var cmpEls = [];
  for (var ci = 0; ci < 4; ci++) {
    cmpEls.push({
      name: document.getElementById("finf-cmp-name-" + ci),
      rate: document.getElementById("finf-cmp-rate-" + ci),
      buy: document.getElementById("finf-cmp-buytax-" + ci),
      sell: document.getElementById("finf-cmp-selltax-" + ci)
    });
  }
  liveFormat(cmpInflationEl);
  function renderCompare() {
    var inflation = parseNum(cmpInflationEl.value);
    var years = Math.max(0, Math.round(parseNum(cmpYearsEl.value)));
    if (!inflation || !years) { cmpResultEl.innerHTML = ""; return; }

    var items = [];
    cmpEls.forEach(function (e, idx) {
      var rate = parseNum(e.rate.value);
      if (!rate) return;
      var buy = parseNum(e.buy.value) || 0;
      var sell = parseNum(e.sell.value) || 0;
      var name = (e.name.value || "").trim() || ("گزینه " + (idx + 1).toLocaleString("fa-IR"));
      // total nominal growth compounded over the whole period
      var totalNominalPct = (Math.pow(1 + rate / 100, years) - 1) * 100;
      // buy tax/fee paid once at entry, sell tax/fee taken from total profit at exit
      var netReturnPct = totalNominalPct * (1 - sell / 100) - buy;
      // compare against inflation compounded over the same period
      var realReturnPct = ((1 + netReturnPct / 100) / Math.pow(1 + inflation / 100, years) - 1) * 100;
      items.push({ name: name, rate: rate, netReturnPct: netReturnPct, realReturnPct: realReturnPct });
    });

    if (items.length < 2) {
      cmpResultEl.innerHTML = '<div class="finf-badge finf-badge-neutral">حداقل ۲ گزینه رو با «رشد/سود سالانه» کامل پر کن تا مقایسه انجام بشه.</div>';
      return;
    }

    items.sort(function (a, b) { return b.realReturnPct - a.realReturnPct; });
    var yearsFa = years.toLocaleString("fa-IR");

    var rows = "";
    items.forEach(function (it, i) {
      var cls = it.realReturnPct > 1 ? "finf-val-pos" : (it.realReturnPct < -1 ? "finf-val-neg" : "");
      var medal = i === 0 ? "🥇 " : (i === 1 ? "🥈 " : (i === 2 ? "🥉 " : ""));
      rows += '<tr><td>' + medal + it.name + '</td><td>' + fmtPct(it.rate) + '</td><td>' + fmtPct(it.netReturnPct) + '</td><td class="' + cls + '">' + fmtPct(it.realReturnPct) + '</td></tr>';
    });

    var winner = items[0];
    var winnerCls, winnerText;
    if (winner.realReturnPct > 1) {
      winnerCls = "finf-badge-good";
      winnerText = "✅ بهترین گزینه «" + winner.name + "» هست — بعد از " + yearsFa + " سال، با احتساب مالیات/کارمزد و تورم، قدرت خریدت " + fmtPct(winner.realReturnPct) + " بیشتر می‌شه.";
    } else if (winner.realReturnPct >= -1) {
      winnerCls = "finf-badge-neutral";
      winnerText = "⚖️ حتی بهترین گزینه («" + winner.name + "») بعد از " + yearsFa + " سال فقط ارزش پولت رو حفظ می‌کنه؛ سود واقعی خاصی نداره.";
    } else {
      winnerCls = "finf-badge-warn";
      winnerText = "🔻 هیچ‌کدوم از گزینه‌ها بعد از " + yearsFa + " سال و با احتساب تورم و مالیات سود واقعی ندارن؛ کم‌ضررترین‌شون «" + winner.name + "» هست.";
    }

    var perItemBadges = "";
    items.forEach(function (it) {
      var bc, bt;
      if (it.realReturnPct > 1) {
        bc = "finf-badge-good";
        bt = "✅ " + it.name + " مثبته — بعد از " + yearsFa + " سال " + fmtPct(it.realReturnPct) + " سود واقعی، ارزشش داره بخری.";
      } else if (it.realReturnPct >= -1) {
        bc = "finf-badge-neutral";
        bt = "⚖️ " + it.name + " نه سوده نه ضرر — بعد از " + yearsFa + " سال فقط ارزش پولت رو حفظ می‌کنه.";
      } else {
        bc = "finf-badge-warn";
        bt = "🔻 " + it.name + " منفیه — بعد از " + yearsFa + " سال " + fmtPct(Math.abs(it.realReturnPct)) + " از قدرت خریدت کم می‌شه.";
      }
      perItemBadges += '<div class="finf-badge ' + bc + '" style="margin-top:6px;">' + bt + '</div>';
    });

    cmpResultEl.innerHTML =
      '<div class="finf-result-card">' +
        '<div class="finf-block-sub" style="margin-bottom:4px;">نتیجه بعد از ' + yearsFa + ' سال</div>' +
        '<div class="finf-table-wrap"><table class="finf-table"><thead><tr><th>گزینه</th><th>رشد اسمی کل دوره</th><th>بازده خالص کل دوره</th><th>بازده واقعی کل دوره</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        '<div class="finf-badge ' + winnerCls + '" style="margin-top:8px;">' + winnerText + '</div>' +
        perItemBadges +
      '</div>';
  }
  cmpInflationEl.addEventListener("input", renderCompare);
  cmpYearsEl.addEventListener("input", renderCompare);
  cmpEls.forEach(function (e) {
    [e.name, e.rate, e.buy, e.sell].forEach(function (el) { el.addEventListener("input", renderCompare); });
  });
})();
