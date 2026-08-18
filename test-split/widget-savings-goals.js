
(function () {
  var FSAV_KEY = "finSavingsGoalsV1";
  var sdata = { age: 0, annualIncome: 0, netWorth: 0, netWorthHistory: [], goals: [] };
  var ASL_KEY = "finAssetLiabilityV1";
  var aslNetWorth = 0;
  var aslHasData = false;
  function loadAslNetWorth(cb) {
    if (!window.storage || !window.storage.get) { aslHasData = false; cb(); return; }
    window.storage.get(ASL_KEY, false).then(function (r) {
      aslHasData = false; aslNetWorth = 0;
      if (r && r.value) {
        try {
          var p = JSON.parse(r.value);
          var assets = Array.isArray(p.assets) ? p.assets : [];
          var liabilities = Array.isArray(p.liabilities) ? p.liabilities : [];
          if (assets.length > 0 || liabilities.length > 0) {
            var av = assets.reduce(function (s, a) { return s + (Number(a.value) || 0); }, 0);
            var lv = liabilities.reduce(function (s, l) { return s + (Number(l.value) || 0); }, 0);
            aslNetWorth = av - lv;
            aslHasData = true;
          }
        } catch (e) {}
      }
      cb();
    }).catch(function () { aslHasData = false; cb(); });
  }
  window.bjRefreshFsavNetWorth = function () {
    loadAslNetWorth(function () { renderNetWorth(); });
  };
  var FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
  function faToEnDigits(s) {
    return String(s).replace(/[۰-۹]/g, function (d) { return String(FA_DIGITS.indexOf(d)); });
  }
  function parseNum(str) {
    var cleaned = faToEnDigits(str).replace(/[^\d.]/g, "");
    return Number(cleaned) || 0;
  }
  function liveFormat(el) {
    el.addEventListener("input", function () {
      var atEnd = el.selectionEnd === el.value.length;
      var num = parseNum(el.value);
      el.value = el.value.trim() === "" ? "" : num.toLocaleString("fa-IR");
      if (atEnd) { var len = el.value.length; el.setSelectionRange(len, len); }
    });
  }
  function fmtT(v) { return Math.round(v).toLocaleString("fa-IR") + " تومان"; }
  function uid() { return Date.now() + "-" + Math.random().toString(36).slice(2, 8); }
  function pad2(n) { return n < 10 ? "0" + n : "" + n; }
  function todayISO() { var d = new Date(); return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function fmtDateFa(iso) {
    return new Date(iso + "T00:00:00").toLocaleDateString("fa-IR", { year: "numeric", month: "short", day: "numeric" });
  }
  function addMonthsISO(months) {
    var d = new Date();
    d.setMonth(d.getMonth() + Number(months));
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }
  function monthsRemaining(deadlineISO) {
    if (!deadlineISO) return 0;
    var end = new Date(deadlineISO + "T00:00:00");
    var diffDays = Math.ceil((end - new Date()) / 86400000);
    return Math.max(0, Math.ceil(diffDays / 30));
  }

  var FSAV_CATEGORIES = [
    { key: "emergency", label: "صندوق اضطراری", icon: "🛟" },
    { key: "home", label: "پیش‌پرداخت خونه", icon: "🏠" },
    { key: "car", label: "خرید ماشین", icon: "🚗" },
    { key: "retirement", label: "بازنشستگی", icon: "👴" },
    { key: "travel", label: "سفر", icon: "✈️" },
    { key: "education", label: "تحصیل", icon: "🎓" },
    { key: "wedding", label: "عروسی", icon: "💍" },
    { key: "other", label: "سایر", icon: "🎯" }
  ];
  function catInfo(key) {
    for (var i = 0; i < FSAV_CATEGORIES.length; i++) { if (FSAV_CATEGORIES[i].key === key) return FSAV_CATEGORIES[i]; }
    return FSAV_CATEGORIES[FSAV_CATEGORIES.length - 1];
  }
  function renderCatOptions(selectEl, selected) {
    selectEl.innerHTML = FSAV_CATEGORIES.map(function (c) {
      return '<option value="' + c.key + '"' + (c.key === selected ? " selected" : "") + '>' + c.icon + ' ' + c.label + '</option>';
    }).join("");
  }

  var editingGoalId = null;
  var pendingDeleteId = null;
  var pendingDeleteTimer = null;
  var openHistoryIds = {};
  var archivedOpen = false;

  // ---- pull this month's leftover (باقی‌مانده) from the expense tracker so it can count toward savings ----
  var expRemainingThisMonth = 0;
  function loadExpRemaining(cb) {
    if (!window.storage || !window.storage.get) { expRemainingThisMonth = 0; cb(); return; }
    window.storage.get("finExpenseTrackerV1", false).then(function (r) {
      expRemainingThisMonth = 0;
      if (r && r.value) {
        try {
          var p = JSON.parse(r.value);
          var incomes = p.incomes || {};
          var entries = p.entries || [];
          var now = new Date();
          var y = now.getFullYear(), m = now.getMonth();
          var income = Number(incomes[y + "-" + (m + 1)]) || 0;
          var prefix = y + "-" + pad2(m + 1);
          var spent = 0;
          entries.forEach(function (e) {
            if (e.date && e.date.indexOf(prefix + "-") === 0) spent += Number(e.amount) || 0;
          });
          expRemainingThisMonth = income - spent;
        } catch (e) {}
      }
      cb();
    }).catch(function () { expRemainingThisMonth = 0; cb(); });
  }
  window.bjRefreshFsavSummary = function () {
    loadExpRemaining(function () { renderGoals(); });
  };

  function loadSav(cb) {
    if (!window.storage || !window.storage.get) { cb(); return; }
    window.storage.get(FSAV_KEY, false).then(function (r) {
      if (r && r.value) {
        try {
          var p = JSON.parse(r.value);
          sdata.age = p.age || 0;
          sdata.annualIncome = p.annualIncome || 0;
          sdata.netWorth = p.netWorth || 0;
          sdata.netWorthHistory = p.netWorthHistory || [];
          sdata.goals = (p.goals || []).map(function (g) {
            return {
              id: g.id, name: g.name, category: g.category || "other",
              target: Number(g.target) || 0, saved: Number(g.saved) || 0,
              months: g.months || 0,
              deadlineISO: g.deadlineISO || (g.months ? addMonthsISO(g.months) : ""),
              contributions: g.contributions || []
            };
          });
        } catch (e) {}
      }
      cb();
    }).catch(function () { cb(); });
  }
  function saveSav() {
    if (!window.storage || !window.storage.set) return;
    window.storage.set(FSAV_KEY, JSON.stringify(sdata), false).catch(function () {});
  }

  function renderNetWorth() {
    document.getElementById("fsav-age-input").value = sdata.age ? sdata.age.toLocaleString("fa-IR") : "";
    document.getElementById("fsav-income-input").value = sdata.annualIncome ? sdata.annualIncome.toLocaleString("fa-IR") : "";

    var nwInput = document.getElementById("fsav-networth-input");
    var sourceBox = document.getElementById("fsav-nw-source");
    var effectiveNetWorth;
    if (aslHasData) {
      effectiveNetWorth = aslNetWorth;
      nwInput.value = aslNetWorth.toLocaleString("fa-IR");
      nwInput.setAttribute("readonly", "readonly");
      sourceBox.textContent = "🔗 این عدد خودکار از بخش «دارایی در برابر بدهی» محاسبه می‌شه.";
    } else {
      effectiveNetWorth = sdata.netWorth || 0;
      nwInput.value = sdata.netWorth ? sdata.netWorth.toLocaleString("fa-IR") : "";
      nwInput.removeAttribute("readonly");
      sourceBox.textContent = "";
    }

    var box = document.getElementById("fsav-networth-result");
    if (!sdata.age || !sdata.annualIncome) {
      box.innerHTML = "";
      return;
    }
    var expected = (sdata.age * sdata.annualIncome) / 10;
    var actual = effectiveNetWorth;
    var badgeClass = "fsav-badge-avg", badgeText = "انباشتگر میانه (AAW)";
    if (actual >= expected * 2) { badgeClass = "fsav-badge-paw"; badgeText = "انباشتگر توانمند ثروت (PAW)"; }
    else if (actual <= expected / 2) { badgeClass = "fsav-badge-uaw"; badgeText = "انباشتگر ضعیف ثروت (UAW)"; }
    var html =
      '<div class="fsav-nw-card">' +
        '<div class="fsav-nw-row"><span>ثروت خالص مورد انتظار</span><span>' + fmtT(expected) + '</span></div>' +
        '<div class="fsav-nw-row"><span>ثروت خالص فعلی‌ات</span><span>' + fmtT(actual) + '</span></div>' +
        '<span class="fsav-nw-badge ' + badgeClass + '">' + badgeText + '</span>';

    var hist = sdata.netWorthHistory || [];
    if (hist.length > 1) {
      var last = hist[hist.length - 1], prev = hist[hist.length - 2];
      var delta = last.value - prev.value;
      var deltaClass = delta >= 0 ? "fsav-nw-trend-delta-up" : "fsav-nw-trend-delta-down";
      var deltaSign = delta >= 0 ? "▲ +" : "▼ ";
      html += '<div class="fsav-nw-trend"><div class="fsav-nw-trend-head"><span>روند نسبت به ثبت قبلی</span>' +
        '<span class="' + deltaClass + '">' + deltaSign + fmtT(Math.abs(delta)) + '</span></div>';
      hist.slice(-5).reverse().forEach(function (h) {
        html += '<div class="fsav-nw-hist-row"><span>' + fmtDateFa(h.date) + '</span><span>' + fmtT(h.value) + '</span></div>';
      });
      html += '</div>';
    }
    html += '</div>';
    box.innerHTML = html;
  }

  function renderSummary(activeGoals, doneGoals) {
    var box = document.getElementById("fsav-summary");
    var all = activeGoals.concat(doneGoals);
    if (all.length === 0) { box.innerHTML = ""; return; }
    var totalTarget = 0, totalSaved = 0;
    all.forEach(function (g) { totalTarget += Number(g.target) || 0; totalSaved += Number(g.saved) || 0; });
    var pctWithout = totalTarget > 0 ? Math.min(100, Math.round(totalSaved / totalTarget * 100)) : 0;

    var totalSavedWith = totalSaved + expRemainingThisMonth;
    var pctWith = totalTarget > 0 ? Math.max(0, Math.min(100, Math.round(totalSavedWith / totalTarget * 100))) : 0;
    var remainClass = expRemainingThisMonth >= 0 ? "fsav-nw-trend-delta-up" : "fsav-nw-trend-delta-down";
    var remainSign = expRemainingThisMonth >= 0 ? "+" : "";

    box.innerHTML =
      '<div class="fsav-summary-card">' +
        '<div class="fsav-summary-top"><span>جمع کل پس‌انداز (بدون این ماه)</span><b>' + pctWithout.toLocaleString("fa-IR") + '٪</b></div>' +
        '<div class="fsav-summary-bar-track"><div class="fsav-summary-bar-fill" style="width:' + pctWithout + '%"></div></div>' +
        '<div class="fsav-summary-sub">' + fmtT(totalSaved) + ' از ' + fmtT(totalTarget) + ' — ' +
          activeGoals.length.toLocaleString("fa-IR") + ' هدف فعال، ' + doneGoals.length.toLocaleString("fa-IR") + ' تکمیل‌شده</div>' +
        '<div class="fsav-summary-top" style="margin-top:12px;"><span>با احتساب باقی‌مانده‌ی این ماه</span><b>' + pctWith.toLocaleString("fa-IR") + '٪</b></div>' +
        '<div class="fsav-summary-bar-track"><div class="fsav-summary-bar-fill" style="width:' + pctWith + '%"></div></div>' +
        '<div class="fsav-summary-sub">' + fmtT(totalSavedWith) + ' از ' + fmtT(totalTarget) +
          ' — باقی‌مانده‌ی ردیاب هزینه این ماه: <span class="' + remainClass + '">' + remainSign + fmtT(expRemainingThisMonth) + '</span></div>' +
      '</div>';
  }

  function goalCardHTML(g) {
    var target = Number(g.target) || 0;
    var saved = Number(g.saved) || 0;
    var pct = target > 0 ? Math.min(100, Math.round(saved / target * 100)) : 0;
    var remain = Math.max(0, target - saved);
    var isDone = target > 0 && saved >= target;
    var monthlyText = "";
    if (isDone) {
      monthlyText = "🎉 به هدف رسیدی";
    } else if (g.deadlineISO) {
      var mRem = monthsRemaining(g.deadlineISO);
      if (mRem > 0) { monthlyText = "ماهی " + fmtT(remain / mRem) + " لازمه (" + mRem.toLocaleString("fa-IR") + " ماه مونده)"; }
      else { monthlyText = "⏰ مهلتش گذشته"; }
    }
    var nameSafe = (g.name || "بدون اسم").replace(/</g, "&lt;");
    var cat = catInfo(g.category);
    var isEditing = editingGoalId === g.id;
    var isPendingDelete = pendingDeleteId === g.id;
    var isHistOpen = !!openHistoryIds[g.id];
    var contributions = g.contributions || [];

    var delBtn = isPendingDelete
      ? '<button class="fsav-goal-del fsav-del-confirm" data-delconfirm="' + g.id + '">مطمئنی؟ ✔</button>'
      : '<button class="fsav-goal-del" data-id="' + g.id + '">✕</button>';

    var html =
      '<div class="fsav-goal-head">' +
        '<div class="fsav-goal-name"><span class="fsav-goal-cat-icon">' + cat.icon + '</span>' + nameSafe + '</div>' +
        '<div class="fsav-goal-actions"><button class="fsav-goal-edit" data-editid="' + g.id + '">✎</button>' + delBtn + '</div>' +
      '</div>';

    if (isEditing) {
      html += '<div class="fsav-goal-edit-form">' +
        '<div class="fsav-goal-edit-row"><select data-edit-cat="' + g.id + '"></select></div>' +
        '<div class="fsav-goal-edit-row"><input type="text" data-edit-name="' + g.id + '" value="' + nameSafe + '"></div>' +
        '<div class="fsav-goal-edit-row">' +
          '<input type="text" inputmode="numeric" data-edit-target="' + g.id + '" value="' + target.toLocaleString("fa-IR") + '" placeholder="مبلغ هدف">' +
          '<input type="text" inputmode="numeric" data-edit-saved="' + g.id + '" value="' + saved.toLocaleString("fa-IR") + '" placeholder="مبلغ فعلی"></div>' +
        '<div class="fsav-goal-edit-row"><input type="text" inputmode="numeric" data-edit-months="' + g.id + '" value="' + (g.months ? Number(g.months).toLocaleString("fa-IR") : "") + '" placeholder="چند ماه دیگه؟ (اختیاری)"></div>' +
        '<div class="fsav-field-err" id="fsav-edit-err-' + g.id + '"></div>' +
        '<div class="fsav-goal-edit-actions">' +
          '<button class="fsav-goal-edit-save" data-savebtn="' + g.id + '">ذخیره</button>' +
          '<button class="fsav-goal-edit-cancel" data-cancelbtn="' + g.id + '">انصراف</button></div>' +
      '</div>';
    }

    html += '<div class="fsav-goal-bar-track"><div class="fsav-goal-bar-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="fsav-goal-meta"><span>' + fmtT(saved) + ' از ' + fmtT(target) + ' (' + pct.toLocaleString("fa-IR") + '٪)</span>' +
        '<span>' + monthlyText + '</span></div>';

    if (!isDone) {
      html += '<div class="fsav-goal-add-row">' +
          '<input type="text" inputmode="numeric" placeholder="مبلغ" data-contrib="' + g.id + '">' +
          '<button class="fsav-contrib-add-btn" data-contribadd="' + g.id + '">＋ افزودن</button>' +
          '<button class="fsav-contrib-sub-btn" data-contribsub="' + g.id + '">− برداشت</button></div>' +
        '<div class="fsav-field-err" id="fsav-contrib-err-' + g.id + '"></div>';
    }

    if (contributions.length > 0) {
      html += '<button type="button" class="fsav-hist-toggle" data-histtoggle="' + g.id + '">' +
        (isHistOpen ? "▲ پنهان کردن تاریخچه" : "🕓 تاریخچه (" + contributions.length.toLocaleString("fa-IR") + ")") + '</button>';
      if (isHistOpen) {
        html += '<div class="fsav-hist-list">';
        contributions.slice().reverse().forEach(function (h) {
          var isAdd = h.amount >= 0;
          html += '<div class="fsav-hist-row"><span>' + fmtDateFa(h.date) + '</span>' +
            '<span class="' + (isAdd ? "fsav-hist-amt-add" : "fsav-hist-amt-sub") + '">' + (isAdd ? "+" : "−") + fmtT(Math.abs(h.amount)) + '</span></div>';
        });
        html += '</div>';
      }
    }
    return html;
  }

  function renderGoals() {
    var list = document.getElementById("fsav-goals-list");
    var archivedWrap = document.getElementById("fsav-archived-wrap");
    var archivedList = document.getElementById("fsav-archived-list");
    var archivedTitle = document.getElementById("fsav-archived-title");
    var archivedArrow = document.getElementById("fsav-archived-arrow");

    var active = sdata.goals.filter(function (g) { return !(g.target > 0 && g.saved >= g.target); });
    var done = sdata.goals.filter(function (g) { return g.target > 0 && g.saved >= g.target; });

    renderSummary(active, done);

    if (active.length === 0) {
      list.innerHTML = sdata.goals.length === 0 ? '<p class="fin-empty">هنوز هدفی ثبت نکردی.</p>' : '<p class="fin-empty">همه‌ی هدف‌هات تکمیل شدن 🎉</p>';
    } else {
      list.innerHTML = "";
      active.forEach(function (g) {
        var card = document.createElement("div");
        card.className = "fsav-goal-card";
        card.innerHTML = goalCardHTML(g);
        list.appendChild(card);
      });
    }

    if (done.length === 0) {
      archivedWrap.style.display = "none";
    } else {
      archivedWrap.style.display = "block";
      archivedTitle.textContent = "🏆 هدف‌های تکمیل‌شده (" + done.length.toLocaleString("fa-IR") + ")";
      archivedArrow.className = "fsav-cal-arrow" + (archivedOpen ? " fsav-cal-arrow-open" : "");
      archivedList.style.display = archivedOpen ? "flex" : "none";
      archivedList.innerHTML = "";
      done.forEach(function (g) {
        var card = document.createElement("div");
        card.className = "fsav-goal-card fsav-goal-done";
        card.innerHTML = goalCardHTML(g);
        archivedList.appendChild(card);
      });
    }

    bindGoalEvents(list);
    bindGoalEvents(archivedList);
  }

  function findGoal(id) { return sdata.goals.filter(function (x) { return x.id === id; })[0]; }

  function bindGoalEvents(scope) {
    scope.querySelectorAll("[data-edit-cat]").forEach(function (sel) {
      var g = findGoal(sel.getAttribute("data-edit-cat"));
      renderCatOptions(sel, g ? g.category : "other");
    });

    scope.querySelectorAll(".fsav-goal-edit[data-editid]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-editid");
        editingGoalId = editingGoalId === id ? null : id;
        renderGoals();
      });
    });
    scope.querySelectorAll("[data-cancelbtn]").forEach(function (btn) {
      btn.addEventListener("click", function () { editingGoalId = null; renderGoals(); });
    });
    scope.querySelectorAll("[data-savebtn]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-savebtn");
        var g = findGoal(id);
        if (!g) return;
        var name = (scope.querySelector('[data-edit-name="' + id + '"]').value || "").trim();
        var target = parseNum(scope.querySelector('[data-edit-target="' + id + '"]').value);
        var saved = parseNum(scope.querySelector('[data-edit-saved="' + id + '"]').value);
        var months = parseNum(scope.querySelector('[data-edit-months="' + id + '"]').value);
        var cat = scope.querySelector('[data-edit-cat="' + id + '"]').value;
        var errBox = document.getElementById("fsav-edit-err-" + id);
        if (!name) { errBox.textContent = "اسم هدف رو وارد کن."; return; }
        if (!target) { errBox.textContent = "مبلغ هدف رو وارد کن."; return; }
        g.name = name; g.target = target; g.saved = saved; g.category = cat; g.months = months;
        g.deadlineISO = months ? addMonthsISO(months) : "";
        errBox.textContent = "";
        editingGoalId = null;
        saveSav();
        renderGoals();
      });
    });

    scope.querySelectorAll(".fsav-goal-del[data-id]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-id");
        pendingDeleteId = id;
        renderGoals();
        clearTimeout(pendingDeleteTimer);
        pendingDeleteTimer = setTimeout(function () { pendingDeleteId = null; renderGoals(); }, 3000);
      });
    });
    scope.querySelectorAll("[data-delconfirm]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-delconfirm");
        clearTimeout(pendingDeleteTimer);
        pendingDeleteId = null;
        sdata.goals = sdata.goals.filter(function (g) { return g.id !== id; });
        saveSav();
        renderGoals();
      });
    });

    scope.querySelectorAll("[data-histtoggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-histtoggle");
        openHistoryIds[id] = !openHistoryIds[id];
        renderGoals();
      });
    });

    function doContrib(id, sign, scope2) {
      var input = scope2.querySelector('[data-contrib="' + id + '"]');
      var amount = parseNum(input.value);
      var errBox = document.getElementById("fsav-contrib-err-" + id);
      var g = findGoal(id);
      if (!g) return;
      if (!amount) { errBox.textContent = "یه مبلغ وارد کن."; return; }
      if (sign < 0 && amount > (Number(g.saved) || 0)) { errBox.textContent = "بیشتر از پس‌انداز فعلیته."; return; }
      g.saved = (Number(g.saved) || 0) + sign * amount;
      g.contributions = g.contributions || [];
      g.contributions.push({ id: uid(), amount: sign * amount, date: todayISO() });
      errBox.textContent = "";
      saveSav();
      renderGoals();
    }
    scope.querySelectorAll("[data-contribadd]").forEach(function (btn) {
      btn.addEventListener("click", function () { doContrib(btn.getAttribute("data-contribadd"), 1, scope); });
    });
    scope.querySelectorAll("[data-contribsub]").forEach(function (btn) {
      btn.addEventListener("click", function () { doContrib(btn.getAttribute("data-contribsub"), -1, scope); });
    });
    scope.querySelectorAll("[data-contrib]").forEach(liveFormat);
    scope.querySelectorAll("[data-edit-target], [data-edit-saved], [data-edit-months]").forEach(liveFormat);
  }

  liveFormat(document.getElementById("fsav-age-input"));
  liveFormat(document.getElementById("fsav-income-input"));
  liveFormat(document.getElementById("fsav-networth-input"));
  liveFormat(document.getElementById("fsav-goal-target-input"));
  liveFormat(document.getElementById("fsav-goal-saved-input"));
  liveFormat(document.getElementById("fsav-goal-months-input"));
  renderCatOptions(document.getElementById("fsav-goal-cat-input"), "other");

  document.getElementById("fsav-archived-toggle").addEventListener("click", function () {
    archivedOpen = !archivedOpen;
    renderGoals();
  });

  document.getElementById("fsav-nw-save").addEventListener("click", function () {
    sdata.age = parseNum(document.getElementById("fsav-age-input").value);
    sdata.annualIncome = parseNum(document.getElementById("fsav-income-input").value);
    sdata.netWorth = aslHasData ? aslNetWorth : parseNum(document.getElementById("fsav-networth-input").value);
    var hist = sdata.netWorthHistory || (sdata.netWorthHistory = []);
    var today = todayISO();
    var last = hist[hist.length - 1];
    if (last && last.date === today) { last.value = sdata.netWorth; }
    else { hist.push({ date: today, value: sdata.netWorth }); }
    if (hist.length > 24) { hist.splice(0, hist.length - 24); }
    saveSav();
    renderNetWorth();
  });

  document.getElementById("fsav-goal-add-btn").addEventListener("click", function () {
    var catEl = document.getElementById("fsav-goal-cat-input");
    var nameEl = document.getElementById("fsav-goal-name-input");
    var targetEl = document.getElementById("fsav-goal-target-input");
    var savedEl = document.getElementById("fsav-goal-saved-input");
    var monthsEl = document.getElementById("fsav-goal-months-input");
    var errBox = document.getElementById("fsav-goal-form-err");
    var name = (nameEl.value || "").trim();
    var target = parseNum(targetEl.value);
    if (!name) { errBox.textContent = "اسم هدف رو وارد کن."; return; }
    if (!target) { errBox.textContent = "مبلغ هدف رو وارد کن."; return; }
    var saved = parseNum(savedEl.value);
    var months = parseNum(monthsEl.value);
    errBox.textContent = "";
    sdata.goals.push({
      id: uid(), name: name, category: catEl.value, target: target, saved: saved,
      months: months, deadlineISO: months ? addMonthsISO(months) : "", contributions: []
    });
    saveSav();
    nameEl.value = ""; targetEl.value = ""; savedEl.value = ""; monthsEl.value = ""; catEl.value = "other";
    renderGoals();
  });

  loadSav(function () { loadExpRemaining(function () { loadAslNetWorth(function () { renderNetWorth(); renderGoals(); }); }); });
})();
