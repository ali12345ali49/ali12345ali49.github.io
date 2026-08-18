
(function () {
  var FEXP_KEY = "finExpenseTrackerV1";
  var data = { incomes: {}, hourlyWage: 0, entries: [], unit: "toman", numeralEn: true, categories: [], saved: [] };
  var FEXP_DEFAULT_CATS = [
    { id: "cat_food", name: "خوراک", color: "#D9534F", type: "expense" },
    { id: "cat_cloth", name: "پوشاک", color: "#5B8DBE", type: "expense" },
    { id: "cat_essential", name: "خرج‌های ضروری", color: "#C98A45", type: "expense" },
    { id: "cat_fun", name: "تفریح", color: "#8E6FC4", type: "expense" },
    { id: "cat_sideincome", name: "درآمد جانبی", color: "#4CAF7D", type: "income" }
  ];
  function catById(id) {
    for (var i = 0; i < data.categories.length; i++) { if (data.categories[i].id === id) return data.categories[i]; }
    return null;
  }
  // +1 = adds to funds (income-type box), -1 = subtracts from funds (expense-type box, or no box at all)
  function entrySign(e) {
    var c = e && e.catId ? catById(e.catId) : null;
    return (c && c.type === "income") ? 1 : -1;
  }
  var FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
  function faToEnDigits(s) {
    return String(s).replace(/[۰-۹]/g, function (d) { return String(FA_DIGITS.indexOf(d)); });
  }
  function numLocale() { return data.numeralEn ? "en-US" : "fa-IR"; }
  function parseInputNumber(str) {
    var cleaned = faToEnDigits(str).replace(/[^\d.]/g, "");
    return Number(cleaned) || 0;
  }
  function liveFormatInput(el) {
    el.addEventListener("input", function () {
      var pos = el.value.length;
      var atEnd = el.selectionEnd === pos;
      var num = parseInputNumber(el.value);
      el.value = el.value.trim() === "" ? "" : num.toLocaleString(numLocale());
      if (atEnd) { var len = el.value.length; el.setSelectionRange(len, len); }
    });
  }
  var viewDate = new Date();
  viewDate.setDate(1);
  var selDay = todayStr();
  var calOpen = false;
  var catOpen = false;
  var starActive = false;
  var savedOpen = false;
  var donutOpen = false;
  var donutView = "month";
  var savedSearchOpen = false;
  var savedSearchQuery = "";
  function themeDefaultCatColor() {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue("--accent-alw").trim();
      if (v) return v;
    } catch (e) {}
    return "#C98A45";
  }
  var newCatColor = themeDefaultCatColor();
  var newCatType = "expense";
  var newCatBucket = "";
  var RIAL_PER_TOMAN = 10;

  // Mirrors FCSP_BUCKETS' keys/labels from the "بودجه‌بندی آگاهانه" section, kept in sync manually
  // since that module loads after this one. Used to let a category (جعبه) connect to a budget bucket.
  var FEXP_BUCKET_OPTIONS = [
    { key: "", icon: "—", label: "بدون اتصال به سطل بودجه" },
    { key: "fixed", icon: "🏠", label: "هزینه‌های ثابت" },
    { key: "invest", icon: "📈", label: "سرمایه‌گذاری" },
    { key: "save", icon: "💰", label: "پس‌انداز" },
    { key: "guilt", icon: "🎉", label: "خرج بدون احساس گناه" }
  ];
  function bucketLabel(key) {
    var b = FEXP_BUCKET_OPTIONS.find(function (o) { return o.key === key; });
    return b ? b.icon + " " + b.label : "";
  }

  function pad2(n) { return n < 10 ? "0" + n : "" + n; }
  function monthKey(y, m) { return y + "-" + (m + 1); }
  function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
  // All amounts are stored internally in a raw unit worth 1/1000 toman (i.e. every
  // 1000 raw units the person types = 1 Toman). Display divides by 1000 accordingly.
  function toDisplayUnit(rawVal) {
    var n = Number(rawVal) || 0;
    var toman = n / 1000;
    return data.unit === "rial" ? toman * RIAL_PER_TOMAN : toman;
  }
  function fromDisplayUnit(inputVal) {
    var n = parseInputNumber(inputVal);
    var toman = data.unit === "rial" ? n / RIAL_PER_TOMAN : n;
    return toman * 1000;
  }
  function unitLabel() { return data.unit === "rial" ? "ریال" : "تومان"; }
  function fmtMoney(tomanVal) {
    return Math.round(toDisplayUnit(tomanVal)).toLocaleString(numLocale()) + " " + unitLabel();
  }
  function fmtDateFa(iso) {
    return new Date(iso + "T00:00:00").toLocaleDateString("fa-IR", { weekday: "long", month: "long", day: "numeric" });
  }
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }
  function uid() { return Date.now() + "-" + Math.random().toString(36).slice(2, 8); }

  // ---- Jalali (Persian) calendar helpers, for the date-of-expense picker ----
  var jaMonthNames = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
  var jaDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  function jaNum(n) { return String(n).split("").map(function (c) { return jaDigits[c] !== undefined ? jaDigits[c] : c; }).join(""); }
  function jaParts(d) {
    var p = new Intl.DateTimeFormat("en-US-u-ca-persian", { year: "numeric", month: "numeric", day: "numeric" }).formatToParts(d);
    var o = {};
    p.forEach(function (x) { if (x.type !== "literal") o[x.type] = parseInt(x.value, 10); });
    return { jy: o.year, jm: o.month, jd: o.day };
  }
  function jaFirstOfYear(jy) {
    var base = new Date(jy + 621, 1, 10);
    for (var i = 0; i < 70; i++) {
      var d = new Date(base); d.setDate(d.getDate() + i);
      var p = jaParts(d);
      if (p.jy === jy && p.jm === 1 && p.jd === 1) return d;
    }
    return base;
  }
  function jaMonthLen(jy, jm) {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    var y0 = jaFirstOfYear(jy), y1 = jaFirstOfYear(jy + 1);
    var total = Math.round((y1 - y0) / 86400000);
    return total - 336;
  }
  function jaFirstOfMonth(jy, jm) {
    if (jm === 1) return jaFirstOfYear(jy);
    var d = jaFirstOfYear(jy);
    for (var k = 1; k < jm; k++) { d = new Date(d); d.setDate(d.getDate() + jaMonthLen(jy, k)); }
    return d;
  }
  function jaToGregorianISO(jy, jm, jd) {
    var d = new Date(jaFirstOfMonth(jy, jm));
    d.setDate(d.getDate() + (jd - 1));
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  var curJy0 = jaParts(new Date()).jy;
  var addJy = jaParts(new Date()).jy, addJm = jaParts(new Date()).jm, addJd = jaParts(new Date()).jd;

  function renderDateSelects() {
    var jySel = document.getElementById("fexp-date-jy");
    var jmSel = document.getElementById("fexp-date-jm");
    var jdSel = document.getElementById("fexp-date-jd");
    var years = [];
    for (var i = -1; i <= 1; i++) years.push(curJy0 + i);
    jySel.innerHTML = years.map(function (y) { return '<option value="' + y + '"' + (y === addJy ? " selected" : "") + '>' + jaNum(y) + '</option>'; }).join("");
    jmSel.innerHTML = jaMonthNames.map(function (name, idx) { var mm = idx + 1; return '<option value="' + mm + '"' + (mm === addJm ? " selected" : "") + '>' + name + '</option>'; }).join("");
    var dLen = jaMonthLen(addJy, addJm);
    if (addJd > dLen) addJd = dLen;
    var dOpts = "";
    for (var d = 1; d <= dLen; d++) dOpts += '<option value="' + d + '"' + (d === addJd ? " selected" : "") + '>' + jaNum(d) + '</option>';
    jdSel.innerHTML = dOpts;
  }
  function bindDateSelects() {
    document.getElementById("fexp-date-jy").addEventListener("change", function (e) {
      addJy = Number(e.target.value);
      renderDateSelects();
    });
    document.getElementById("fexp-date-jm").addEventListener("change", function (e) {
      addJm = Number(e.target.value);
      renderDateSelects();
    });
    document.getElementById("fexp-date-jd").addEventListener("change", function (e) {
      addJd = Number(e.target.value);
    });
  }

  function loadFexp(cb) {
    if (!window.storage || !window.storage.get) { cb(); return; }
    window.storage.get(FEXP_KEY, false).then(function (r) {
      if (r && r.value) {
        try {
          var parsed = JSON.parse(r.value);
          data.incomes = parsed.incomes || {};
          data.hourlyWage = parsed.hourlyWage || 0;
          data.entries = parsed.entries || [];
          data.unit = (parsed.unit === "rial") ? "rial" : "toman";
          data.numeralEn = parsed.numeralEn !== undefined ? !!parsed.numeralEn : true;
          data.categories = Array.isArray(parsed.categories) ? parsed.categories : FEXP_DEFAULT_CATS.slice();
          data.saved = Array.isArray(parsed.saved) ? parsed.saved : [];
        } catch (e) {}
      } else {
        data.categories = FEXP_DEFAULT_CATS.slice();
      }
      cb();
    }).catch(function () { cb(); });
  }
  function saveFexp() {
    if (!window.storage || !window.storage.set) return;
    window.storage.set(FEXP_KEY, JSON.stringify(data), false).catch(function () {});
  }

  function entriesForMonth(y, m) {
    var prefix = y + "-" + pad2(m + 1);
    return data.entries.filter(function (e) { return e.date && e.date.indexOf(prefix + "-") === 0; });
  }

  function renderCatSelect() {
    var sel = document.getElementById("fexp-cat-select");
    if (!sel) return;
    var prevVal = sel.value;
    var opts = '<option value="">بدون دسته (خرج عادی)</option>';
    data.categories.forEach(function (c) {
      opts += '<option value="' + c.id + '">' + (c.type === "income" ? "🟢 " : "🔴 ") +
        c.name.replace(/</g, "&lt;") + (c.type === "income" ? " (درآمد)" : " (خرج)") + '</option>';
    });
    sel.innerHTML = opts;
    if (data.categories.some(function (c) { return c.id === prevVal; })) sel.value = prevVal;
  }

  function updateAmountPlaceholder() {
    var sel = document.getElementById("fexp-cat-select");
    var c = sel && sel.value ? catById(sel.value) : null;
    var label = c && c.type === "income" ? "مبلغ درآمد" : "مبلغ خرج";
    document.getElementById("fexp-amount-input").placeholder = label + " (" + unitLabel() + ")";
  }

  function renderCatColorRow() {
    var row = document.getElementById("fexp-cat-color-row");
    if (!row) return;
    row.innerHTML = '<button type="button" id="fexp-cat-color-btn" class="fexp-cat-color-picker-btn" style="background:' +
      newCatColor + ';"></button><span class="fexp-cat-color-label">رنگ دلخواه جعبه</span>';
    document.getElementById("fexp-cat-color-btn").addEventListener("click", function () {
      if (window.bjOpenColorPicker) {
        window.bjOpenColorPicker(newCatColor, function (hex) {
          newCatColor = hex;
          renderCatColorRow();
        });
      }
    });
  }

  function renderSavedList() {
    var box = document.getElementById("fexp-saved-list");
    var empty = document.getElementById("fexp-saved-empty");
    if (!box) return;
    if (data.saved.length === 0) {
      box.innerHTML = "";
      if (empty) { empty.style.display = "block"; empty.textContent = "چیزی ذخیره نشده. کنار توضیح هزینه، ستاره رو بزن تا اینجا ذخیره بشه."; }
      return;
    }
    var q = (savedSearchQuery || "").trim().toLowerCase();
    var list = data.saved;
    if (q) {
      list = data.saved.filter(function (s) {
        var c = catById(s.catId);
        var hay = ((s.desc || "") + " " + (c ? c.name : "")).toLowerCase();
        return hay.indexOf(q) !== -1;
      });
      if (list.length === 0) {
        box.innerHTML = "";
        if (empty) { empty.style.display = "block"; empty.textContent = "چیزی با این جستجو پیدا نشد."; }
        return;
      }
    }
    if (empty) empty.style.display = "none";
    box.innerHTML = list.map(function (s) {
      var c = catById(s.catId);
      var dot = c ? '<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:' + c.color + ';margin-inline-end:2px;"></span>' : "";
      var amtLabel = Math.round(toDisplayUnit(s.amount)).toLocaleString(numLocale());
      var text = (s.desc ? s.desc.replace(/</g, "&lt;") : (c ? c.name : "")) + " · " + amtLabel;
      return '<div class="fexp-saved-chip" data-savedid="' + s.id + '">' +
        '<span class="fexp-saved-chip-text">' + dot + text + '</span>' +
        '<button type="button" class="fexp-saved-chip-del" data-saveddel="' + s.id + '">✕</button></div>';
    }).join("");
    box.querySelectorAll("[data-savedid]").forEach(function (chip) {
      chip.addEventListener("click", function (e) {
        if (e.target && e.target.getAttribute("data-saveddel")) return;
        var id = chip.getAttribute("data-savedid");
        var s = data.saved.filter(function (x) { return x.id === id; })[0];
        if (!s) return;
        var date = jaToGregorianISO(addJy, addJm, addJd);
        data.entries.push({ id: uid(), date: date, amount: s.amount, desc: s.desc || "", catId: s.catId || "" });
        saveFexp();
        var entryDate = new Date(date + "T00:00:00");
        if (entryDate.getFullYear() !== viewDate.getFullYear() || entryDate.getMonth() !== viewDate.getMonth()) {
          viewDate = new Date(entryDate.getFullYear(), entryDate.getMonth(), 1);
        }
        selDay = date;
        render();
      });
    });
    box.querySelectorAll("[data-saveddel]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var id = btn.getAttribute("data-saveddel");
        data.saved = data.saved.filter(function (x) { return x.id !== id; });
        saveFexp();
        renderSavedList();
      });
    });
  }

  function renderCatList() {
    var box = document.getElementById("fexp-cat-list");
    if (!box) return;
    if (data.categories.length === 0) { box.innerHTML = '<p class="fin-empty">هنوز جعبه‌ای نساختی.</p>'; return; }
    box.innerHTML = data.categories.map(function (c) {
      var bucketOptsHtml = FEXP_BUCKET_OPTIONS.map(function (o) {
        return '<option value="' + o.key + '"' + ((c.bucket || "") === o.key ? " selected" : "") + '>' + o.icon + ' ' + o.label + '</option>';
      }).join("");
      var bucketSelect = c.type === "expense" ?
        '<div class="fexp-cat-item-bucket"><select data-catbucket="' + c.id + '">' + bucketOptsHtml + '</select></div>' : "";
      return '<div class="fexp-cat-item">' +
        '<div class="fexp-cat-item-dot" style="background:' + c.color + ';"></div>' +
        '<div class="fexp-cat-item-name">' + c.name.replace(/</g, "&lt;") + '</div>' +
        '<div class="fexp-cat-item-type ' + (c.type === "income" ? "fexp-cat-type-income" : "fexp-cat-type-expense") + '">' +
          (c.type === "income" ? "درآمد" : "خرج") + '</div>' +
        bucketSelect +
        '<button class="fexp-cat-item-del" data-catdel="' + c.id + '">✕</button></div>';
    }).join("");
    box.querySelectorAll("[data-catdel]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-catdel");
        data.categories = data.categories.filter(function (c) { return c.id !== id; });
        data.entries.forEach(function (e) { if (e.catId === id) e.catId = ""; });
        saveFexp();
        renderCatList();
        renderCatSelect();
        render();
      });
    });
    box.querySelectorAll("[data-catbucket]").forEach(function (sel) {
      sel.addEventListener("change", function () {
        var id = sel.getAttribute("data-catbucket");
        var cat = catById(id);
        if (cat) cat.bucket = sel.value || "";
        saveFexp();
        render();
      });
    });
  }
  function renderCatBucketSelect() {
    var sel = document.getElementById("fexp-cat-bucket-select");
    if (!sel) return;
    sel.innerHTML = FEXP_BUCKET_OPTIONS.map(function (o) {
      return '<option value="' + o.key + '"' + (o.key === newCatBucket ? " selected" : "") + '>' + o.icon + ' ' + o.label + '</option>';
    }).join("");
  }

  function fexpRingSegments(cx, cy, r, strokeW, segments) {
    var circ = 2 * Math.PI * r;
    var acc = 0;
    var svg = "";
    segments.forEach(function (seg) {
      if (!seg || seg.frac <= 0) return;
      var len = Math.min(seg.frac, 1) * circ;
      var dash = len.toFixed(2) + " " + (circ - len).toFixed(2);
      var offset = -acc;
      svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + seg.color +
        '" stroke-width="' + strokeW + '" stroke-dasharray="' + dash + '" stroke-dashoffset="' + offset.toFixed(2) +
        '" transform="rotate(-90 ' + cx + ' ' + cy + ')"></circle>';
      acc += len;
    });
    return svg;
  }

  function renderDonut() {
    var wrap = document.getElementById("fexp-donut-svg-wrap");
    var boxesEl = document.getElementById("fexp-donut-boxes");
    var sel = document.getElementById("fexp-donut-view-select");
    if (!wrap || !boxesEl || !sel) return;
    sel.value = donutView;

    var y = viewDate.getFullYear(), m = viewDate.getMonth();
    var periodEntries, income;
    if (donutView === "year") {
      var yPrefix = y + "-";
      periodEntries = data.entries.filter(function (e) { return e.date && e.date.indexOf(yPrefix) === 0; });
      income = 0;
      for (var mm = 0; mm < 12; mm++) income += (data.incomes[monthKey(y, mm)] || 0);
    } else {
      periodEntries = entriesForMonth(y, m);
      income = data.incomes[monthKey(y, m)] || 0;
    }

    var byCat = {};
    var totalExpense = 0, totalExtraIncome = 0;
    periodEntries.forEach(function (e) {
      var amt = Number(e.amount) || 0;
      if (entrySign(e) > 0) { totalExtraIncome += amt; return; }
      totalExpense += amt;
      var key = (e.catId && catById(e.catId)) ? e.catId : "_none";
      byCat[key] = (byCat[key] || 0) + amt;
    });

    if (totalExpense <= 0 && income <= 0 && totalExtraIncome <= 0) {
      wrap.innerHTML = "";
      boxesEl.innerHTML = '<div class="fexp-donut-empty">برای این ' + (donutView === "year" ? "سال" : "ماه") + ' هنوز خرجی یا درآمدی ثبت نشده.</div>';
      return;
    }

    var netIncome = income + totalExtraIncome;
    var remaining = netIncome - totalExpense;
    var whole = Math.max(netIncome, totalExpense, 1);

    var catEntries = Object.keys(byCat).map(function (k) {
      var c = k === "_none" ? null : catById(k);
      return { id: k, name: c ? c.name : "بدون دسته", color: c ? c.color : "#D9534F", amount: byCat[k] };
    }).sort(function (a, b) { return b.amount - a.amount; });

    var segs = catEntries.map(function (ce) { return { color: ce.color, frac: ce.amount / whole }; });
    if (remaining > 0) segs.push({ color: "#F0C929", frac: remaining / whole });

    var cx = 100, cy = 100, rOuter = 96, rInner = 74, swOuter = 3.5, swInner = 30;
    var spentFrac = netIncome > 0 ? Math.min(1, totalExpense / netIncome) : (totalExpense > 0 ? 1 : 0);
    var spentPct = Math.round(spentFrac * 100);

    var svg = '<svg viewBox="0 0 200 200">';
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + rOuter + '" fill="none" stroke="var(--border)" stroke-width="' + swOuter + '"></circle>';
    svg += fexpRingSegments(cx, cy, rOuter, swOuter, [{ color: "#D9534F", frac: spentFrac }]);
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + rInner + '" fill="none" stroke="var(--bg1)" stroke-width="' + swInner + '"></circle>';
    svg += fexpRingSegments(cx, cy, rInner, swInner, segs);
    svg += '<text x="100" y="96" text-anchor="middle" style="font-size:22px;font-weight:800;fill:var(--text);">' + spentPct.toLocaleString(numLocale()) + '٪</text>';
    svg += '<text x="100" y="115" text-anchor="middle" style="font-size:9px;fill:var(--muted);">از درآمد خرج شده</text>';
    svg += '</svg>';
    wrap.innerHTML = svg;

    var boxesHtml = catEntries.map(function (ce) {
      var pct = whole > 0 ? Math.round((ce.amount / whole) * 100) : 0;
      return '<div class="fexp-donut-box"><div class="fexp-donut-box-dot" style="background:' + ce.color + ';"></div>' +
        '<div class="fexp-donut-box-name">' + ce.name.replace(/</g, "&lt;") + '</div>' +
        '<div class="fexp-donut-box-pct">' + pct.toLocaleString(numLocale()) + '٪</div>' +
        '<div class="fexp-donut-box-amt">' + fmtMoney(ce.amount) + '</div></div>';
    }).join("");
    if (remaining > 0) {
      var remPct = whole > 0 ? Math.round((remaining / whole) * 100) : 0;
      boxesHtml += '<div class="fexp-donut-box"><div class="fexp-donut-box-dot" style="background:#F0C929;"></div>' +
        '<div class="fexp-donut-box-name">پس‌انداز / باقی‌مانده</div>' +
        '<div class="fexp-donut-box-pct">' + remPct.toLocaleString(numLocale()) + '٪</div>' +
        '<div class="fexp-donut-box-amt">' + fmtMoney(remaining) + '</div></div>';
    }
    boxesEl.innerHTML = boxesHtml || '<div class="fexp-donut-empty">دسته‌ای برای نمایش نیست.</div>';
  }

  function render() {
    var y = viewDate.getFullYear(), m = viewDate.getMonth();
    document.getElementById("fexp-month-label").textContent =
      viewDate.toLocaleDateString("fa-IR", { month: "long", year: "numeric" });

    var income = data.incomes[monthKey(y, m)] || 0;
    document.getElementById("fexp-income-input").value = income ? toDisplayUnit(income).toLocaleString(numLocale()) : "";
    document.getElementById("fexp-wage-input").value = data.hourlyWage ? toDisplayUnit(data.hourlyWage).toLocaleString(numLocale()) : "";
    document.getElementById("fexp-income-input").placeholder = "درآمد این ماه (" + unitLabel() + ")";
    document.getElementById("fexp-wage-input").placeholder = "دستمزد ساعتی (" + unitLabel() + ")";
    renderCatSelect();
    updateAmountPlaceholder();
    renderCatList();
    renderDonut();
    renderSavedList();
    document.getElementById("fexp-unit-toman").className = data.unit === "toman" ? "fexp-unit-active" : "";
    document.getElementById("fexp-unit-rial").className = data.unit === "rial" ? "fexp-unit-active" : "";
    document.getElementById("fexp-numeral-fa").className = data.numeralEn ? "" : "fexp-numeral-active";
    document.getElementById("fexp-numeral-en").className = data.numeralEn ? "fexp-numeral-active" : "";

    var monthEntries = entriesForMonth(y, m);
    var totalExpense = 0, totalExtraIncome = 0;
    monthEntries.forEach(function (e) {
      var amt = Number(e.amount) || 0;
      if (entrySign(e) > 0) totalExtraIncome += amt; else totalExpense += amt;
    });
    var totalSpent = totalExpense;
    var netSpent = totalExpense - totalExtraIncome;
    var nDays = daysInMonth(y, m);
    var dailyBudget = income > 0 ? income / nDays : 0;
    var remaining = income - netSpent;

    var cards = document.getElementById("fexp-cards");
    cards.innerHTML =
      '<div class="fexp-card"><div class="fexp-card-label">درآمد ماه</div><div class="fexp-card-value">' + fmtMoney(income) + '</div></div>' +
      '<div class="fexp-card"><div class="fexp-card-label">خرج تاکنون</div><div class="fexp-card-value">' + fmtMoney(totalExpense) + '</div></div>' +
      '<div class="fexp-card ' + (remaining >= 0 ? "fexp-pos" : "fexp-neg") + '"><div class="fexp-card-label">باقی‌مانده</div><div class="fexp-card-value">' + fmtMoney(remaining) + '</div></div>' +
      '<div class="fexp-card"><div class="fexp-card-label">سهم روزانه</div><div class="fexp-card-value">' + fmtMoney(Math.round(dailyBudget)) + '</div></div>' +
      (totalExtraIncome > 0 ? '<div class="fexp-card fexp-pos"><div class="fexp-card-label">درآمد جانبی این ماه</div><div class="fexp-card-value">' + fmtMoney(totalExtraIncome) + '</div></div>' : '');

    // chart: full month on the x-axis. Budget (green) is a constant reference line shown every day.
    // Spend (red) and remaining (yellow) only get a point on days that actually have a logged expense —
    // no fabricated zero points on days nothing was entered.
    var chart = document.getElementById("fexp-chart");
    var perDaySpend = {};
    monthEntries.forEach(function (e) {
      var amt = Number(e.amount) || 0;
      var delta = entrySign(e) > 0 ? -amt : amt;
      perDaySpend[e.date] = (perDaySpend[e.date] || 0) + delta;
    });
    var COL_BUDGET = "#4CAF7D", COL_SPEND = "#D9534F", COL_REMAIN = "#F0C929";
    var stepX = 22, padL = 34, padR = 6, padT = 10, padB = 20;
    var chartW = Math.max(nDays * stepX + padL + padR, 260);
    var chartH = 120;
    var plotH = chartH - padT - padB;
    var dailyBudgetDisp = toDisplayUnit(dailyBudget);
    var budgetArr = [];
    var spendPts = [], remainPts = [];
    for (var d = 1; d <= nDays; d++) {
      budgetArr.push(dailyBudgetDisp);
      var dk2 = y + "-" + pad2(m + 1) + "-" + pad2(d);
      if (perDaySpend.hasOwnProperty(dk2)) {
        var spDisp = toDisplayUnit(perDaySpend[dk2]);
        spendPts.push({ i: d - 1, v: spDisp });
        remainPts.push({ i: d - 1, v: dailyBudgetDisp - spDisp });
      }
    }
    var allVals = budgetArr.concat(spendPts.map(function (p) { return p.v; }), remainPts.map(function (p) { return p.v; }), [0]);
    var minVal = Math.min.apply(null, allVals);
    var maxVal = Math.max.apply(null, allVals);
    if (maxVal <= minVal) maxVal = minVal + 1;
    var range = maxVal - minVal;
    function xAt(i) { return padL + i * stepX + stepX / 2; }
    function yAt(v) { return padT + (maxVal - v) / range * plotH; }
    function fmtCompact(v) {
      try { return new Intl.NumberFormat(numLocale(), { notation: "compact", maximumFractionDigits: 1 }).format(v); }
      catch (e) { return Math.round(v).toLocaleString(numLocale()); }
    }
    function fmtMoneyDisp(displayVal) {
      return Math.round(displayVal).toLocaleString(numLocale()) + " " + unitLabel();
    }
    function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;"); }
    function pointMarkup(x, y, color, label) {
      return '<g class="fexp-pt" data-label="' + esc(label) + '" data-color="' + color + '">' +
        '<circle cx="' + x + '" cy="' + y + '" r="9" fill="transparent"></circle>' +
        '<circle cx="' + x + '" cy="' + y + '" r="2.6" fill="' + color + '"></circle></g>';
    }
    function buildLineSeries(arr, color, seriesName) {
      var pts = arr.map(function (v, i) { return xAt(i) + "," + yAt(v); }).join(" ");
      var marks = arr.map(function (v, i) {
        var dk3 = y + "-" + pad2(m + 1) + "-" + pad2(i + 1);
        var label = seriesName + " " + fmtDateFa(dk3) + "\u200f: " + fmtMoneyDisp(v);
        return pointMarkup(xAt(i), yAt(v), color, label);
      }).join("");
      return '<polyline points="' + pts + '" fill="none" stroke="' + color + '" stroke-width="1.5" />' + marks;
    }
    function buildPointSeries(ptsArr, color, seriesName) {
      if (ptsArr.length === 0) return "";
      var marks = ptsArr.map(function (p) {
        var dk3 = y + "-" + pad2(m + 1) + "-" + pad2(p.i + 1);
        var label = seriesName + " " + fmtDateFa(dk3) + "\u200f: " + fmtMoneyDisp(p.v);
        return pointMarkup(xAt(p.i), yAt(p.v), color, label);
      }).join("");
      if (ptsArr.length < 2) return marks;
      var pts = ptsArr.map(function (p) { return xAt(p.i) + "," + yAt(p.v); }).join(" ");
      return '<polyline points="' + pts + '" fill="none" stroke="' + color + '" stroke-width="1.5" />' + marks;
    }
    // y-axis: 4 horizontal gridlines (min, 1/3, 2/3, max) with compact value labels
    var yTicks = [minVal, minVal + range / 3, minVal + range * 2 / 3, maxVal];
    var axisSvg = "";
    yTicks.forEach(function (tv) {
      var ty = yAt(tv);
      axisSvg += '<line x1="' + padL + '" y1="' + ty + '" x2="' + (chartW - padR) + '" y2="' + ty +
        '" stroke="var(--border)" stroke-width="0.5" />' +
        '<text x="' + (padL - 4) + '" y="' + (ty + 2.5) + '" font-size="7" fill="var(--muted2)" text-anchor="end">' +
        fmtCompact(tv) + '</text>';
    });
    var zeroY = yAt(0);
    var svg = '<svg width="' + chartW + '" height="' + chartH + '" viewBox="0 0 ' + chartW + ' ' + chartH + '">' +
      axisSvg +
      (minVal < 0 ? '<line x1="' + padL + '" y1="' + zeroY + '" x2="' + (chartW - padR) + '" y2="' + zeroY + '" stroke="var(--border)" stroke-dasharray="3,3" />' : '') +
      buildLineSeries(budgetArr, COL_BUDGET, "سهم روزانه") +
      buildPointSeries(spendPts, COL_SPEND, "خرج") +
      buildPointSeries(remainPts, COL_REMAIN, "باقی‌مانده");
    for (var di = 0; di < nDays; di++) {
      svg += '<text x="' + xAt(di) + '" y="' + (chartH - 6) + '" font-size="7.5" fill="var(--muted2)" text-anchor="middle">' +
        (di + 1).toLocaleString(numLocale()) + '</text>';
    }
    svg += '</svg>';
    chart.innerHTML = svg;

    // ---- calendar grid for this month, + a single expanded day (defaults to today) ----
    var byDate = {};
    monthEntries.forEach(function (e) {
      if (!byDate[e.date]) byDate[e.date] = [];
      byDate[e.date].push(e);
    });
    var todayISO = todayStr();
    var monthPrefix = y + "-" + pad2(m + 1) + "-";
    var todayInThisMonth = todayISO.indexOf(monthPrefix) === 0;
    if (selDay.indexOf(monthPrefix) !== 0) {
      var dkAll = Object.keys(byDate).sort();
      selDay = todayInThisMonth ? todayISO : (dkAll.length ? dkAll[dkAll.length - 1] : monthPrefix + "01");
    }

    var weekLabels = ["ی", "د", "س", "چ", "پ", "ج", "ش"];
    var weekdaysEl = document.getElementById("fexp-cal-weekdays");
    weekdaysEl.innerHTML = weekLabels.map(function (w) { return "<div>" + w + "</div>"; }).join("");

    var firstWeekday = new Date(y, m, 1).getDay();
    var gridEl = document.getElementById("fexp-cal-grid");
    var cellsHtml = "";
    for (var wd = 0; wd < firstWeekday; wd++) cellsHtml += '<div class="fexp-cal-cell fexp-cal-empty"></div>';
    for (var d = 1; d <= nDays; d++) {
      var dk = monthPrefix + pad2(d);
      var dEntries = byDate[dk];
      var daySpentC = dEntries ? dEntries.reduce(function (s, e) { var amt = Number(e.amount) || 0; return s + (entrySign(e) > 0 ? -amt : amt); }, 0) : 0;
      var faDay = new Intl.DateTimeFormat(numLocale(), { day: "numeric" }).format(new Date(dk + "T00:00:00"));
      var cls = "fexp-cal-cell";
      if (dk === todayISO) cls += " fexp-cal-today";
      if (dk === selDay) cls += " fexp-cal-selected";
      var dot = "";
      var catDots = "";
      if (dEntries) {
        var overBudget = dailyBudget > 0 && daySpentC > dailyBudget;
        dot = '<div class="fexp-cal-dot ' + (overBudget ? "fexp-dot-over" : "fexp-dot-under") + '"></div>';
        var seenCats = [];
        dEntries.forEach(function (e) {
          if (e.catId && seenCats.indexOf(e.catId) === -1) seenCats.push(e.catId);
        });
        catDots = seenCats.slice(0, 4).map(function (cid) {
          var c = catById(cid);
          return c ? '<div class="fexp-cal-dot" style="background:' + c.color + ';"></div>' : '';
        }).join("");
        if (catDots) catDots = '<div class="fexp-cal-catdots">' + catDots + '</div>';
      }
      cellsHtml += '<div class="' + cls + '" data-date="' + dk + '">' + faDay + dot + catDots + '</div>';
    }
    gridEl.innerHTML = cellsHtml;
    gridEl.querySelectorAll(".fexp-cal-cell[data-date]").forEach(function (cell) {
      cell.addEventListener("click", function () {
        selDay = cell.getAttribute("data-date");
        render();
      });
    });

    var detailEl = document.getElementById("fexp-day-detail");
    var selEntries = byDate[selDay] || [];
    var selSpent = selEntries.reduce(function (s, e) { var amt = Number(e.amount) || 0; return s + (entrySign(e) > 0 ? -amt : amt); }, 0);
    var selDiff = dailyBudget - selSpent;
    var selDiffColor = selDiff >= 0 ? "#4CAF7D" : "#D9534F";
    var selDiffText = selDiff >= 0
      ? (fmtMoney(selDiff) + " کمتر از سهم روزانه")
      : (fmtMoney(Math.abs(selDiff)) + " بیشتر از سهم روزانه");
    if (dailyBudget <= 0) selDiffText = "درآمد این ماه ثبت نشده";
    var selTitle = (selDay === todayISO ? "امروز · " : "") + fmtDateFa(selDay);
    var detailHtml = '<div class="fexp-day-group">' +
      '<div class="fexp-day-head"><div class="fexp-day-title">' + selTitle + ' · ' + fmtMoney(selSpent) + '</div>' +
      '<div class="fexp-day-diff" style="color:' + selDiffColor + ';">' + selDiffText + '</div></div>';
    if (selEntries.length === 0) {
      detailHtml += '<p class="fin-empty">هزینه‌ای برای این روز ثبت نشده.</p>';
    } else {
      selEntries.forEach(function (e) {
        var descSafe = (e.desc || "بدون توضیح").replace(/</g, "&lt;");
        var cat = e.catId ? catById(e.catId) : null;
        var sign = entrySign(e);
        var amtColor = sign > 0 ? "#4CAF7D" : "var(--text)";
        var amtPrefix = sign > 0 ? "+" : "−";
        var catBadge = cat
          ? '<span class="fexp-entry-cat" style="background:' + cat.color + '22;color:' + cat.color + ';border-color:' + cat.color + '55;">' +
              '<span class="fexp-entry-cat-dot" style="background:' + cat.color + ';"></span>' + cat.name.replace(/</g, "&lt;") + '</span>'
          : '';
        detailHtml += '<div class="fexp-entry"><span class="fexp-entry-desc">' + descSafe + '</span>' + catBadge +
          '<span class="fexp-entry-amount" style="color:' + amtColor + ';">' + amtPrefix + fmtMoney(e.amount) + '</span>' +
          '<button class="fexp-entry-del" data-id="' + e.id + '">✕</button></div>';
      });
    }
    detailHtml += '</div>';
    detailEl.innerHTML = detailHtml;
    detailEl.querySelectorAll(".fexp-entry-del").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-id");
        data.entries = data.entries.filter(function (e) { return e.id !== id; });
        saveFexp();
        render();
      });
    });

    // book tip: life-energy conversion
    var wage = data.hourlyWage || 0;
    var lifeResult = document.getElementById("fexp-life-result");
    if (wage > 0 && totalSpent > 0) {
      var hours = totalSpent / wage;
      lifeResult.textContent = "خرج این ماه معادل حدود " + hours.toLocaleString(numLocale(), { maximumFractionDigits: 1 }) + " ساعت از عمرته.";
    } else {
      lifeResult.textContent = "";
    }

    // let the savings-goals section know this month's remaining budget may have changed
    if (window.bjRefreshFsavSummary) { window.bjRefreshFsavSummary(); }
    // let the conscious-budgeting section know a bucket's linked categories may have changed
    if (window.bjRefreshFcspBuckets) { window.bjRefreshFcspBuckets(); }
  }

  document.getElementById("fexp-prev-month").addEventListener("click", function () {
    viewDate.setMonth(viewDate.getMonth() - 1);
    render();
  });
  document.getElementById("fexp-next-month").addEventListener("click", function () {
    viewDate.setMonth(viewDate.getMonth() + 1);
    render();
  });
  document.getElementById("fexp-goto-today").addEventListener("click", function () {
    var t = new Date();
    viewDate = new Date(t.getFullYear(), t.getMonth(), 1);
    selDay = todayStr();
    render();
  });
  document.getElementById("fexp-cal-toggle").addEventListener("click", function () {
    calOpen = !calOpen;
    document.getElementById("fexp-cal-wrap").classList.toggle("fexp-cal-open", calOpen);
  });

  // ---- جستجو در هزینه‌های ذخیره‌شده ----
  document.getElementById("fexp-saved-search-toggle").addEventListener("click", function () {
    savedSearchOpen = !savedSearchOpen;
    document.getElementById("fexp-saved-search-wrap").classList.toggle("fexp-saved-search-open", savedSearchOpen);
    document.getElementById("fexp-saved-search-toggle").classList.toggle("fexp-saved-search-active", savedSearchOpen);
    if (savedSearchOpen) {
      if (!savedOpen) {
        savedOpen = true;
        document.getElementById("fexp-saved-toggle-btn").classList.add("fexp-saved-open");
        document.getElementById("fexp-saved-wrap").classList.add("fexp-saved-open");
      }
      document.getElementById("fexp-saved-search-input").focus();
    } else {
      savedSearchQuery = "";
      document.getElementById("fexp-saved-search-input").value = "";
      renderSavedList();
    }
  });
  document.getElementById("fexp-saved-search-input").addEventListener("input", function (e) {
    savedSearchQuery = e.target.value || "";
    renderSavedList();
  });

  // ---- toggle نمایش بخش «چند ساعت از عمرته» با زدن روی چراغ ----
  document.getElementById("fexp-book-toggle").addEventListener("click", function () {
    var box = document.getElementById("fexp-book-content");
    var isOpen = box.style.display !== "none";
    box.style.display = isOpen ? "none" : "block";
  });

  document.getElementById("fexp-cat-toggle").addEventListener("click", function () {
    catOpen = !catOpen;
    document.getElementById("fexp-cat-wrap").classList.toggle("fexp-cal-open", catOpen);
  });
  document.getElementById("fexp-donut-toggle").addEventListener("click", function () {
    donutOpen = !donutOpen;
    document.getElementById("fexp-donut-wrap").classList.toggle("fexp-cal-open", donutOpen);
  });
  document.getElementById("fexp-donut-view-select").addEventListener("change", function (e) {
    donutView = e.target.value === "year" ? "year" : "month";
    renderDonut();
  });
  document.getElementById("fexp-cat-select").addEventListener("change", updateAmountPlaceholder);
  function updateCatBucketRowVisibility() {
    var row = document.querySelector(".fexp-cat-bucket-row");
    var hint = document.querySelector(".fexp-cat-bucket-hint");
    var show = newCatType === "expense";
    if (row) row.style.display = show ? "" : "none";
    if (hint) hint.style.display = show ? "" : "none";
    if (!show) newCatBucket = "";
  }
  document.getElementById("fexp-cat-type-expense").addEventListener("click", function () {
    newCatType = "expense";
    document.getElementById("fexp-cat-type-expense").classList.add("fexp-cat-type-active");
    document.getElementById("fexp-cat-type-income").classList.remove("fexp-cat-type-active");
    updateCatBucketRowVisibility();
  });
  document.getElementById("fexp-cat-type-income").addEventListener("click", function () {
    newCatType = "income";
    document.getElementById("fexp-cat-type-income").classList.add("fexp-cat-type-active");
    document.getElementById("fexp-cat-type-expense").classList.remove("fexp-cat-type-active");
    updateCatBucketRowVisibility();
  });
  document.getElementById("fexp-cat-bucket-select").addEventListener("change", function (e) {
    newCatBucket = e.target.value || "";
  });
  document.getElementById("fexp-cat-add-btn").addEventListener("click", function () {
    var nameEl = document.getElementById("fexp-cat-name-input");
    var name = (nameEl.value || "").trim();
    if (!name) return;
    data.categories.push({ id: "cat_" + uid(), name: name, color: newCatColor, type: newCatType, bucket: newCatType === "expense" ? newCatBucket : "" });
    saveFexp();
    nameEl.value = "";
    newCatBucket = "";
    renderCatBucketSelect();
    renderCatList();
    renderCatSelect();
    render();
  });
  renderCatColorRow();
  renderCatBucketSelect();
  updateCatBucketRowVisibility();
  document.getElementById("fexp-income-save").addEventListener("click", function () {
    var y = viewDate.getFullYear(), m = viewDate.getMonth();
    var val = fromDisplayUnit(document.getElementById("fexp-income-input").value);
    data.incomes[monthKey(y, m)] = val;
    saveFexp();
    render();
  });
  document.getElementById("fexp-wage-save").addEventListener("click", function () {
    data.hourlyWage = fromDisplayUnit(document.getElementById("fexp-wage-input").value);
    saveFexp();
    render();
  });
  document.getElementById("fexp-unit-toman").addEventListener("click", function () {
    data.unit = "toman";
    saveFexp();
    render();
  });
  document.getElementById("fexp-unit-rial").addEventListener("click", function () {
    data.unit = "rial";
    saveFexp();
    render();
  });
  document.getElementById("fexp-numeral-fa").addEventListener("click", function () {
    data.numeralEn = false;
    saveFexp();
    render();
  });
  document.getElementById("fexp-numeral-en").addEventListener("click", function () {
    data.numeralEn = true;
    saveFexp();
    render();
  });
  liveFormatInput(document.getElementById("fexp-income-input"));
  liveFormatInput(document.getElementById("fexp-wage-input"));
  liveFormatInput(document.getElementById("fexp-amount-input"));
  document.getElementById("fexp-add-btn").addEventListener("click", function () {
    var amountEl = document.getElementById("fexp-amount-input");
    var descEl = document.getElementById("fexp-desc-input");
    var catSel = document.getElementById("fexp-cat-select");
    var date = jaToGregorianISO(addJy, addJm, addJd);
    var rawAmount = parseInputNumber(amountEl.value);
    if (!rawAmount || rawAmount <= 0) return;
    var amount = fromDisplayUnit(rawAmount);
    var desc = (descEl.value || "").trim();
    var catId = catSel.value || "";
    data.entries.push({ id: uid(), date: date, amount: amount, desc: desc, catId: catId });
    if (starActive) {
      var dup = data.saved.filter(function (s) { return s.catId === catId && s.amount === amount && (s.desc || "") === desc; })[0];
      if (!dup) data.saved.unshift({ id: uid(), catId: catId, amount: amount, desc: desc });
      starActive = false;
      var starBtn = document.getElementById("fexp-star-btn");
      if (starBtn) { starBtn.textContent = "☆"; starBtn.className = ""; }
    }
    saveFexp();
    amountEl.value = "";
    descEl.value = "";
    var entryDate = new Date(date + "T00:00:00");
    if (entryDate.getFullYear() !== viewDate.getFullYear() || entryDate.getMonth() !== viewDate.getMonth()) {
      viewDate = new Date(entryDate.getFullYear(), entryDate.getMonth(), 1);
    }
    selDay = date;
    render();
  });
  document.getElementById("fexp-star-btn").addEventListener("click", function () {
    starActive = !starActive;
    this.textContent = starActive ? "★" : "☆";
    this.className = starActive ? "fexp-star-active" : "";
  });
  document.getElementById("fexp-saved-toggle-btn").addEventListener("click", function () {
    savedOpen = !savedOpen;
    this.classList.toggle("fexp-saved-open", savedOpen);
    document.getElementById("fexp-saved-wrap").classList.toggle("fexp-saved-open", savedOpen);
  });

  var fexpChartActiveLabel = null;
  document.getElementById("fexp-chart").addEventListener("click", function (e) {
    var g = e.target.closest ? e.target.closest(".fexp-pt") : null;
    if (!g) return;
    var label = g.getAttribute("data-label");
    var color = g.getAttribute("data-color");
    var info = document.getElementById("fexp-chart-info");
    if (!info) return;
    if (fexpChartActiveLabel === label) {
      fexpChartActiveLabel = null;
      info.style.color = "";
      info.style.borderColor = "";
      info.textContent = "روی یکی از نقطه‌های نمودار بزن تا مقدارش رو ببینی.";
    } else {
      fexpChartActiveLabel = label;
      info.style.color = color;
      info.style.borderColor = color;
      info.textContent = label;
    }
  });

  renderDateSelects();
  bindDateSelects();
  loadFexp(render);
})();
