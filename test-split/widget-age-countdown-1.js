(function () {
  var STORE_KEY_BIRTH = "dhw:birthDate";
  var STORE_KEY_EVENTS = "dhw:customEvents";
  var state = { birthDate: null, events: [] };

  // ---------- Persian digit helper ----------
  function fa(n) { return Number(n).toLocaleString("fa-IR"); }
  function faDate(d) {
    try { return d.toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric" }); }
    catch (e) { return d.toLocaleDateString(); }
  }

  // ---------- Nowruz (spring equinox) calculation, Meeus low-precision algorithm ----------
  var EQ_TERMS = [
    [485,324.96,1934.136],[203,337.23,32964.467],[199,342.08,20.186],[182,27.85,445267.112],
    [156,73.14,45036.886],[136,171.52,22518.443],[77,222.54,65928.934],[74,296.72,3034.906],
    [70,243.58,9037.513],[58,119.81,33718.147],[52,297.17,150.678],[50,21.02,2281.226],
    [45,247.54,29929.562],[44,325.15,31555.956],[29,60.93,4443.417],[18,155.12,67555.328],
    [17,288.79,4562.452],[16,198.04,62894.029],[14,199.76,31436.921],[12,95.39,14577.848],
    [12,287.11,31931.756],[12,320.81,34777.259],[9,227.73,1222.114],[8,15.45,16859.074]
  ];
  function jdToDate(jd) {
    jd += 0.5;
    var Z = Math.floor(jd), F = jd - Z, A;
    if (Z < 2299161) A = Z;
    else { var alpha = Math.floor((Z - 1867216.25) / 36524.25); A = Z + 1 + alpha - Math.floor(alpha / 4); }
    var B = A + 1524, C = Math.floor((B - 122.1) / 365.25), D = Math.floor(365.25 * C), E = Math.floor((B - D) / 30.6001);
    var day = B - D - Math.floor(30.6001 * E) + F;
    var month = E < 14 ? E - 1 : E - 13;
    var year = month > 2 ? C - 4716 : C - 4715;
    var dayInt = Math.floor(day), frac = day - dayInt, hours = frac * 24, h = Math.floor(hours);
    var minF = (hours - h) * 60, m = Math.floor(minF), s = Math.round((minF - m) * 60);
    return new Date(Date.UTC(year, month - 1, dayInt, h, m, s));
  }
  function computeNowruz(year) {
    var Y = (year - 2000) / 1000;
    var JDE0 = 2451623.80984 + 365242.37404*Y + 0.05169*Y*Y - 0.00411*Y*Y*Y - 0.00057*Y*Y*Y*Y;
    var T = (JDE0 - 2451545.0) / 36525;
    var W = (35999.373*T - 2.47) * Math.PI / 180;
    var dLambda = 1 + 0.0334*Math.cos(W) + 0.0007*Math.cos(2*W);
    var S = 0;
    for (var i = 0; i < EQ_TERMS.length; i++) {
      var t = EQ_TERMS[i];
      S += t[0] * Math.cos((t[1] + t[2]*T) * Math.PI / 180);
    }
    var JDE = JDE0 + (0.00001 * S) / dLambda;
    return jdToDate(JDE);
  }
  function nextNowruz() {
    var now = new Date(), n = computeNowruz(now.getFullYear());
    if (n <= now) n = computeNowruz(now.getFullYear() + 1);
    return n;
  }

  // ---------- Next occurrence helpers ----------
  function nextYearlyFromDate(d) {
    var now = new Date();
    var next = new Date(now.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
    if (next < now) next = new Date(now.getFullYear() + 1, d.getMonth(), d.getDate(), 0, 0, 0);
    return next;
  }
  function nextGregorianNewYear() {
    var now = new Date();
    var ny = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    if (ny <= now) ny = new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0);
    return ny;
  }
  function ageBreakdown(birth, now) {
    var years = now.getFullYear() - birth.getFullYear();
    var months = now.getMonth() - birth.getMonth();
    var days = now.getDate() - birth.getDate();
    if (days < 0) { months--; days += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
    if (months < 0) { years--; months += 12; }
    return { years: years, months: months, days: days };
  }
  function formatRemaining(target) {
    var diff = target - new Date();
    if (diff <= 0) return "🎉 امروز!";
    var days = Math.floor(diff / 86400000);
    var hours = Math.floor((diff % 86400000) / 3600000);
    return fa(days) + " روز و " + fa(hours) + " ساعت مانده";
  }

  // ---------- Jalali (Persian) calendar helpers, based on Intl's persian calendar ----------
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
  function jaToGregorian(jy, jm, jd) {
    var d = new Date(jaFirstOfMonth(jy, jm));
    d.setDate(d.getDate() + (jd - 1));
    return d;
  }
  var jaMonthNames = ["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];
  var jaDigits = ["۰","۱","۲","۳","۴","۵","۶","۷","۸","۹"];
  function jaNum(n) { return String(n).split("").map(function (c) { return jaDigits[c] !== undefined ? jaDigits[c] : c; }).join(""); }

  // ---------- storage ----------
  function loadState() {
    var p1 = window.storage.get(STORE_KEY_BIRTH).then(function (r) {
      state.birthDate = r && r.value ? new Date(r.value + "T00:00:00") : null;
    }).catch(function () { state.birthDate = null; });
    var p2 = window.storage.get(STORE_KEY_EVENTS).then(function (r) {
      state.events = (r && r.value) ? r.value : [];
    }).catch(function () { state.events = []; });
    return Promise.all([p1, p2]);
  }
  function saveBirth(dateStr) {
    state.birthDate = new Date(dateStr + "T00:00:00");
    return window.storage.set(STORE_KEY_BIRTH, dateStr);
  }
  function saveEvents() { return window.storage.set(STORE_KEY_EVENTS, state.events); }

  var editingBirth = false;
  function pad2(n) { return n < 10 ? "0" + n : "" + n; }
  function toISODateStr(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }

  // ---------- شمسی/میلادی date-picker state ----------
  function newDateSel(isoOrNull) {
    var base = isoOrNull ? new Date(isoOrNull + "T00:00:00") : new Date();
    var p = jaParts(base);
    return { mode: "g", jy: p.jy, jm: p.jm, jd: p.jd, pendingG: null };
  }
  var dateSel = { birth: newDateSel(null), ev: newDateSel(null) };
  var evDraft = { name: "", recur: true };

  function setMode(key, mode) {
    if (dateSel[key].mode === mode) return;
    if (mode === "j") {
      var el = document.getElementById("dhw-" + key + "-ginput");
      var val = el && el.value;
      var base = val ? new Date(val + "T00:00:00") : new Date();
      var p = jaParts(base);
      dateSel[key].jy = p.jy; dateSel[key].jm = p.jm; dateSel[key].jd = p.jd;
    } else {
      var d = jaToGregorian(dateSel[key].jy, dateSel[key].jm, dateSel[key].jd);
      dateSel[key].pendingG = toISODateStr(d);
    }
    dateSel[key].mode = mode;
    render();
  }
  function onJYearChange(key, val) {
    dateSel[key].jy = parseInt(val, 10);
    dateSel[key].jd = Math.min(dateSel[key].jd, jaMonthLen(dateSel[key].jy, dateSel[key].jm));
    render();
  }
  function onJMonthChange(key, val) {
    dateSel[key].jm = parseInt(val, 10);
    dateSel[key].jd = Math.min(dateSel[key].jd, jaMonthLen(dateSel[key].jy, dateSel[key].jm));
    render();
  }
  function onJDayChange(key, val) {
    dateSel[key].jd = parseInt(val, 10);
    render();
  }
  function getSelectedISO(key) {
    var s = dateSel[key];
    if (s.mode === "g") {
      var el = document.getElementById("dhw-" + key + "-ginput");
      return el && el.value ? el.value : null;
    }
    if (!s.jy || !s.jm || !s.jd) return null;
    return toISODateStr(jaToGregorian(s.jy, s.jm, s.jd));
  }
  function dateModeToggle(key) {
    var m = dateSel[key].mode;
    return '<div class="dhw-mode-toggle">' +
      '<button type="button" class="dhw-mode-btn' + (m === "j" ? " active" : "") + '" data-mkey="' + key + '" data-mval="j">شمسی</button>' +
      '<button type="button" class="dhw-mode-btn' + (m === "g" ? " active" : "") + '" data-mkey="' + key + '" data-mval="g">میلادی</button>' +
    '</div>';
  }
  function datePickerBody(key, gregPrefill) {
    var s = dateSel[key];
    if (s.mode === "g") {
      var val = s.pendingG || gregPrefill || "";
      return '<input type="date" id="dhw-' + key + '-ginput" value="' + val + '" />';
    }
    var curJy = jaParts(new Date()).jy;
    var yearsStart = key === "birth" ? curJy - 100 : curJy - 1;
    var yearsEnd = key === "birth" ? curJy : curJy + 6;
    var yearOpts = "";
    for (var y = yearsStart; y <= yearsEnd; y++) {
      yearOpts += '<option value="' + y + '"' + (y === s.jy ? " selected" : "") + '>' + jaNum(y) + '</option>';
    }
    var monthOpts = "";
    for (var mI = 0; mI < 12; mI++) {
      monthOpts += '<option value="' + (mI + 1) + '"' + ((mI + 1) === s.jm ? " selected" : "") + '>' + jaMonthNames[mI] + '</option>';
    }
    var dayLen = jaMonthLen(s.jy, s.jm);
    var dayOpts = "";
    for (var dI = 1; dI <= dayLen; dI++) {
      dayOpts += '<option value="' + dI + '"' + (dI === s.jd ? " selected" : "") + '>' + jaNum(dI) + '</option>';
    }
    var gd = jaToGregorian(s.jy, s.jm, s.jd);
    return '<div class="dhw-jalali-row">' +
        '<select id="dhw-' + key + '-jy">' + yearOpts + '</select>' +
        '<select id="dhw-' + key + '-jm">' + monthOpts + '</select>' +
        '<select id="dhw-' + key + '-jd">' + dayOpts + '</select>' +
      '</div>' +
      '<div class="dhw-date-preview">تاریخ انتخاب‌شده: ' + faDate(gd) + '</div>';
  }

  // ---------- render ----------
  var bodyEl = document.getElementById("dhw-body");

  function render() {
    var html = "";
    if (!state.birthDate || editingBirth) {
      var prefill = state.birthDate ? toISODateStr(state.birthDate) : "";
      html += '<div class="dhw-age-card"><div class="dhw-age-sub">برای دیدن سن دقیق، تاریخ تولدت رو وارد کن</div></div>';
      html += '<h3>تاریخ تولد</h3>';
      html += '<div id="dhw-birth-picker">';
      html += dateModeToggle("birth");
      html += datePickerBody("birth", prefill);
      html += '</div>';
      html += '<button class="dhw-btn" id="dhw-save-birth">ذخیره تاریخ تولد</button>';
      if (state.birthDate) {
        html += '<button class="dhw-btn" id="dhw-cancel-edit-birth" style="background:#232635;color:#8890A3;margin-top:8px;">انصراف</button>';
      }
    } else {
      var now = new Date();
      var a = ageBreakdown(state.birthDate, now);
      var totalDays = Math.floor((now - state.birthDate) / 86400000);
      html += '<div class="dhw-age-card">';
      html += '<div class="dhw-age-big">' + fa(a.years) + ' سال، ' + fa(a.months) + ' ماه و ' + fa(a.days) + ' روز</div>';
      html += '<div class="dhw-age-sub">یعنی ' + fa(totalDays) + ' روز از تولدت گذشته</div>';
      html += '<button class="dhw-btn" id="dhw-edit-birth" style="width:auto;padding:6px 14px;margin-top:10px;font-size:11.5px;">ویرایش تاریخ تولد</button>';
      html += '</div>';

      html += '<h3>رویدادهای مهم</h3>';
      html += eventRow("🎂 تولد بعدی", nextYearlyFromDate(state.birthDate));
      html += eventRow("🌱 نوروز", nextNowruz());
      html += eventRow("🎆 سال نو میلادی", nextGregorianNewYear());

      state.events.forEach(function (ev, idx) {
        var target = ev.recurring ? nextYearlyFromDate(new Date(ev.date + "T00:00:00")) : new Date(ev.date + "T00:00:00");
        html += eventRow(ev.name, target, idx);
      });

      html += '<h3>افزودن رویداد دلخواه</h3>';
      html += '<input type="text" id="dhw-ev-name" placeholder="اسم رویداد (مثلاً سالگرد ازدواج)" value="' + evDraft.name.replace(/"/g, "&quot;") + '" />';
      html += '<div id="dhw-ev-datepicker">';
      html += dateModeToggle("ev");
      html += datePickerBody("ev", "");
      html += '</div>';
      html += '<label class="dhw-check"><input type="checkbox" id="dhw-ev-recur"' + (evDraft.recur ? " checked" : "") + ' /> هرسال تکرار بشه</label>';
      html += '<button class="dhw-btn" id="dhw-add-event">افزودن رویداد</button>';
    }
    bodyEl.innerHTML = html;
    attachHandlers();
  }

  function eventRow(name, targetDate, customIdx) {
    var del = (customIdx !== undefined) ? '<button class="dhw-del" data-idx="' + customIdx + '">🗑</button>' : "";
    return '<div class="dhw-row">' +
      '<div><div class="dhw-row-name">' + name + '</div><div class="dhw-row-date">' + faDate(targetDate) + '</div></div>' +
      '<div style="display:flex;align-items:center;">' +
        '<span class="dhw-row-count">' + formatRemaining(targetDate) + '</span>' + del +
      '</div></div>';
  }

  function attachHandlers() {
    var saveBirthBtn = document.getElementById("dhw-save-birth");
    if (saveBirthBtn) {
      saveBirthBtn.onclick = function () {
        var val = getSelectedISO("birth");
        if (!val) return;
        editingBirth = false;
        saveBirth(val).then(render);
      };
    }
    var editBirthBtn = document.getElementById("dhw-edit-birth");
    if (editBirthBtn) {
      editBirthBtn.onclick = function () {
        editingBirth = true;
        dateSel.birth = newDateSel(state.birthDate ? toISODateStr(state.birthDate) : null);
        render();
      };
    }
    var cancelEditBtn = document.getElementById("dhw-cancel-edit-birth");
    if (cancelEditBtn) {
      cancelEditBtn.onclick = function () { editingBirth = false; render(); };
    }
    var evNameInput = document.getElementById("dhw-ev-name");
    if (evNameInput) {
      evNameInput.oninput = function () { evDraft.name = evNameInput.value; };
    }
    var evRecurInput = document.getElementById("dhw-ev-recur");
    if (evRecurInput) {
      evRecurInput.onchange = function () { evDraft.recur = evRecurInput.checked; };
    }
    var addEvBtn = document.getElementById("dhw-add-event");
    if (addEvBtn) {
      addEvBtn.onclick = function () {
        var name = evDraft.name.trim();
        var date = getSelectedISO("ev");
        var recurring = evDraft.recur;
        if (!name || !date) return;
        state.events.push({ name: name, date: date, recurring: recurring });
        evDraft = { name: "", recur: true };
        dateSel.ev = newDateSel(null);
        saveEvents().then(render);
      };
    }
    var delBtns = bodyEl.querySelectorAll(".dhw-del");
    delBtns.forEach(function (btn) {
      btn.onclick = function () {
        var idx = parseInt(btn.getAttribute("data-idx"), 10);
        state.events.splice(idx, 1);
        saveEvents().then(render);
      };
    });
    var modeBtns = bodyEl.querySelectorAll(".dhw-mode-btn");
    modeBtns.forEach(function (btn) {
      btn.onclick = function () {
        setMode(btn.getAttribute("data-mkey"), btn.getAttribute("data-mval"));
      };
    });
    ["birth", "ev"].forEach(function (key) {
      var jy = document.getElementById("dhw-" + key + "-jy");
      if (jy) jy.onchange = function () { onJYearChange(key, jy.value); };
      var jm = document.getElementById("dhw-" + key + "-jm");
      if (jm) jm.onchange = function () { onJMonthChange(key, jm.value); };
      var jd = document.getElementById("dhw-" + key + "-jd");
      if (jd) jd.onchange = function () { onJDayChange(key, jd.value); };
    });
  }

  // ---------- open / close ----------
  var fab = document.getElementById("dhw-fab");
  var overlay = document.getElementById("dhw-overlay");
  var panel = document.getElementById("dhw-panel");
  var closeBtn = document.getElementById("dhw-close");

  function openPanel() {
    overlay.style.display = "block";
    panel.style.display = "block";
    render();
  }
  function closePanel() {
    overlay.style.display = "none";
    panel.style.display = "none";
  }
  fab.addEventListener("click", openPanel);
  overlay.addEventListener("click", closePanel);
  closeBtn.addEventListener("click", closePanel);

  loadState().then(function () {
    // refresh countdown texts periodically while panel is open
    setInterval(function () { if (panel.style.display === "block") render(); }, 60000);
  });
})();
