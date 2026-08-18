
(function () {
  var FASL_KEY = "finAssetLiabilityV1";
  var adata = { assets: [], liabilities: [] };
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

  function loadAsl(cb) {
    if (!window.storage || !window.storage.get) { cb(); return; }
    window.storage.get(FASL_KEY, false).then(function (r) {
      if (r && r.value) {
        try {
          var p = JSON.parse(r.value);
          adata.assets = Array.isArray(p.assets) ? p.assets.map(function (a) {
            return { id: a.id || uid(), name: a.name || "", value: Number(a.value) || 0, cashflow: Number(a.cashflow) || 0 };
          }) : [];
          adata.liabilities = Array.isArray(p.liabilities) ? p.liabilities.map(function (l) {
            return { id: l.id || uid(), name: l.name || "", value: Number(l.value) || 0, cashflow: Number(l.cashflow) || 0 };
          }) : [];
        } catch (e) {}
      }
      cb();
    }).catch(function () { cb(); });
  }
  function saveAsl() {
    if (!window.storage || !window.storage.set) return;
    window.storage.set(FASL_KEY, JSON.stringify(adata), false).catch(function () {});
    if (window.bjRefreshFsavNetWorth) { window.bjRefreshFsavNetWorth(); }
  }

  function sumKey(arr, key) { return arr.reduce(function (s, x) { return s + (Number(x[key]) || 0); }, 0); }
  function totalAssetsValue() { return sumKey(adata.assets, "value"); }
  function totalLiabValue() { return sumKey(adata.liabilities, "value"); }
  function totalAssetCF() { return sumKey(adata.assets, "cashflow"); }
  function totalLiabCF() { return sumKey(adata.liabilities, "cashflow"); }

  function renderList(type) {
    var arr = type === "asset" ? adata.assets : adata.liabilities;
    var boxId = type === "asset" ? "fasl-a-list" : "fasl-l-list";
    var totalId = type === "asset" ? "fasl-a-total" : "fasl-l-total";
    var box = document.getElementById(boxId);
    var totalBox = document.getElementById(totalId);
    if (arr.length === 0) {
      box.innerHTML = '<div class="fasl-empty">' + (type === "asset" ? "هنوز دارایی‌ای ثبت نشده." : "هنوز بدهی‌ای ثبت نشده.") + '</div>';
      totalBox.textContent = "";
      return;
    }
    var sorted = arr.slice().sort(function (a, b) { return b.value - a.value; });
    box.innerHTML = sorted.map(function (it, idx) {
      var cfLabel = it.cashflow ? ((type === "asset" ? "درآمد ماهانه: " : "هزینه ماهانه: ") + fmtT(it.cashflow)) : "";
      var detailCls = type === "asset" ? "fasl-detail-asset" : "fasl-detail-liab";
      return '<div class="fasl-item" data-id="' + it.id + '">' +
        '<div class="fasl-item-rank">' + (idx + 1).toLocaleString("fa-IR") + '</div>' +
        '<div class="fasl-item-body">' +
          '<div class="fasl-item-name">' + (it.name || "بدون‌نام").replace(/</g, "&lt;") + '</div>' +
          '<div class="fasl-item-detail">' + fmtT(it.value) + (cfLabel ? (' — <span class="' + detailCls + '">' + cfLabel + '</span>') : "") + '</div>' +
        '</div>' +
        '<button class="fasl-item-btn" data-act="edit" data-type="' + type + '" data-id="' + it.id + '" title="ویرایش">✏️</button>' +
        '<button class="fasl-item-btn" data-act="del" data-type="' + type + '" data-id="' + it.id + '" title="حذف">✕</button>' +
      '</div>';
    }).join("");
    totalBox.textContent = (type === "asset" ? "مجموع ارزش دارایی‌ها: " : "مجموع مانده بدهی‌ها: ") + fmtT(sumKey(arr, "value"));
  }

  function renderSummary() {
    var box = document.getElementById("fasl-summary");
    var assetsVal = totalAssetsValue();
    var liabVal = totalLiabValue();
    var nw = assetsVal - liabVal;
    var assetCF = totalAssetCF();
    var liabCF = totalLiabCF();
    var cf = assetCF - liabCF;
    if (adata.assets.length === 0 && adata.liabilities.length === 0) {
      box.innerHTML = '<div class="fasl-summary-card"><div class="fasl-summary-row" style="justify-content:flex-start;">دارایی و بدهی‌هات رو پایین‌تر اضافه کن تا ثروت خالص و جریان نقدی ماهانه‌ات محاسبه بشه.</div></div>';
      return;
    }
    var badgeCls = "fasl-badge-neutral", badgeText = "هنوز جریان نقدی ماهانه‌ای برای دارایی یا بدهی ثبت نکردی.";
    if (assetCF > 0 || liabCF > 0) {
      if (cf > 0) { badgeCls = "fasl-badge-good"; badgeText = "🎉 دارایی‌هات ماهانه بیشتر از بدهی‌هات برات پول میارن — ستون دارایی داره کار می‌کنه."; }
      else if (cf < 0) { badgeCls = "fasl-badge-warn"; badgeText = "⚠️ بدهی‌هات ماهانه بیشتر از دارایی‌هات ازت پول می‌برن."; }
      else { badgeCls = "fasl-badge-neutral"; badgeText = "جریان نقدی ماهانه‌ی دارایی و بدهی‌هات برابره."; }
    }
    box.innerHTML = '<div class="fasl-summary-card">' +
      '<div class="fasl-summary-row"><span>مجموع دارایی‌ها</span><b class="fasl-val-pos">' + fmtT(assetsVal) + '</b></div>' +
      '<div class="fasl-summary-row"><span>مجموع بدهی‌ها</span><b class="fasl-val-neg">' + fmtT(liabVal) + '</b></div>' +
      '<div class="fasl-summary-row fasl-summary-main"><span>ثروت خالص</span><b class="' + (nw >= 0 ? "fasl-val-pos" : "fasl-val-neg") + '">' + fmtT(nw) + '</b></div>' +
      '<div class="fasl-summary-row"><span>جریان نقدی ماهانه (دارایی − بدهی)</span><b class="' + (cf >= 0 ? "fasl-val-pos" : "fasl-val-neg") + '">' + fmtT(cf) + '</b></div>' +
      '<div class="fasl-summary-badge ' + badgeCls + '">' + badgeText + '</div>' +
    '</div>';
  }

  function renderAll() { renderList("asset"); renderList("liability"); renderSummary(); }

  liveFormat(document.getElementById("fasl-a-value-input"));
  liveFormat(document.getElementById("fasl-a-cf-input"));
  liveFormat(document.getElementById("fasl-l-value-input"));
  liveFormat(document.getElementById("fasl-l-cf-input"));

  document.getElementById("fasl-a-add-btn").addEventListener("click", function () {
    var nameEl = document.getElementById("fasl-a-name-input");
    var valueEl = document.getElementById("fasl-a-value-input");
    var cfEl = document.getElementById("fasl-a-cf-input");
    var name = (nameEl.value || "").trim();
    var value = parseNum(valueEl.value);
    var cf = parseNum(cfEl.value);
    if (!name || !value) return;
    adata.assets.push({ id: uid(), name: name, value: value, cashflow: cf });
    saveAsl();
    nameEl.value = ""; valueEl.value = ""; cfEl.value = "";
    renderList("asset"); renderSummary();
  });

  document.getElementById("fasl-l-add-btn").addEventListener("click", function () {
    var nameEl = document.getElementById("fasl-l-name-input");
    var valueEl = document.getElementById("fasl-l-value-input");
    var cfEl = document.getElementById("fasl-l-cf-input");
    var name = (nameEl.value || "").trim();
    var value = parseNum(valueEl.value);
    var cf = parseNum(cfEl.value);
    if (!name || !value) return;
    adata.liabilities.push({ id: uid(), name: name, value: value, cashflow: cf });
    saveAsl();
    nameEl.value = ""; valueEl.value = ""; cfEl.value = "";
    renderList("liability"); renderSummary();
  });

  function bindListClick(listId) {
    document.getElementById(listId).addEventListener("click", function (e) {
      var btn = e.target.closest("[data-act]");
      if (!btn) return;
      var id = btn.getAttribute("data-id");
      var type = btn.getAttribute("data-type");
      var arr = type === "asset" ? adata.assets : adata.liabilities;
      var it = arr.find(function (x) { return x.id === id; });
      if (!it) return;
      if (btn.getAttribute("data-act") === "del") {
        if (type === "asset") { adata.assets = adata.assets.filter(function (x) { return x.id !== id; }); }
        else { adata.liabilities = adata.liabilities.filter(function (x) { return x.id !== id; }); }
        saveAsl();
        renderList(type); renderSummary();
      } else if (btn.getAttribute("data-act") === "edit") {
        var newValInput = window.prompt("ارزش/مانده‌ی جدید برای «" + it.name + "» چقدره؟ (تومان)", it.value);
        if (newValInput == null) return;
        var newVal = parseNum(newValInput);
        var newCfInput = window.prompt((type === "asset" ? "درآمد" : "هزینه") + " ماهانه‌ی جدید چقدره؟ (تومان، اگه نداری خالی بذار)", it.cashflow || "");
        var newCf = newCfInput == null ? it.cashflow : parseNum(newCfInput);
        it.value = newVal;
        it.cashflow = newCf;
        saveAsl();
        renderList(type); renderSummary();
      }
    });
  }
  bindListClick("fasl-a-list");
  bindListClick("fasl-l-list");

  var aslToggleBtn = document.getElementById("fin-asl-toggle");
  var aslBody = document.getElementById("fin-asl-body");
  var aslArrow = document.getElementById("fin-asl-arrow");
  if (aslToggleBtn && aslBody && aslArrow) {
    var aOpen = false;
    function applyAslToggle() {
      aslBody.classList.toggle("fin-section-collapsed", !aOpen);
      aslArrow.classList.toggle("fin-section-arrow-open", aOpen);
    }
    applyAslToggle();
    aslToggleBtn.addEventListener("click", function () { aOpen = !aOpen; applyAslToggle(); });
  }

  loadAsl(function () { renderAll(); });
})();
