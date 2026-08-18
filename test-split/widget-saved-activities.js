(function () {
  var QUAD = ["iu", "un", "in", "nn"];
  var QCOLOR = { iu: "#C9A24B", un: "#5B8DBE", in: "#4FA88A", nn: "#5A6178" };
  var QLABEL = {
    iu: "مهم و ضروری",
    un: "ضروری، غیرمهم",
    in: "مهم، غیرضروری",
    nn: "غیرمهم و غیرضروری"
  };
  var SAVED_KEY = "bj-saved-activities";

  function pad2(n) { return n < 10 ? "0" + n : "" + n; }
  function todayKey() { var d = new Date(); return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function addDaysKey(key, delta) {
    var d = new Date(key + "T00:00:00"); d.setDate(d.getDate() + delta);
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }
  function faDateLabel(key) {
    try { return new Date(key + "T00:00:00").toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric", weekday: "long" }); }
    catch (e) { return key; }
  }
  function genId() { return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8); }
  function esc(s) { return (s || "").replace(/[&<>]/g, function (c) { return c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"; }); }
  function toISODateStr(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }

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
  function isoToJa(iso) {
    var base = iso ? new Date(iso + "T00:00:00") : new Date();
    return jaParts(base);
  }
  function withJalali(st) {
    if (st.mode === undefined) st.mode = "g";
    if (st.jy === undefined) {
      var p = isoToJa(st.date);
      st.jy = p.jy; st.jm = p.jm; st.jd = p.jd;
    }
    return st;
  }

  // ---------- شمسی/میلادی date-picker widget (shared by src / mini / copy forms) ----------
  function jaModeToggle(prefix, id, mode) {
    return '<div class="alw-mode-toggle">' +
      '<button type="button" class="alw-mode-btn' + (mode === "j" ? " active" : "") + '" data-jmkey="' + prefix + '" data-jmid="' + id + '" data-jmval="j">شمسی</button>' +
      '<button type="button" class="alw-mode-btn' + (mode === "g" ? " active" : "") + '" data-jmkey="' + prefix + '" data-jmid="' + id + '" data-jmval="g">میلادی</button>' +
    '</div>';
  }
  function jaPickerBody(prefix, id, st) {
    if (st.mode === "g") {
      return '<input type="date" data-jfield="date" data-jmkey="' + prefix + '" data-jmid="' + id + '" value="' + st.date + '" />';
    }
    var curJy = jaParts(new Date()).jy;
    var yearOpts = "";
    for (var y = curJy - 1; y <= curJy + 6; y++) {
      yearOpts += '<option value="' + y + '"' + (y === st.jy ? " selected" : "") + '>' + jaNum(y) + '</option>';
    }
    var monthOpts = "";
    for (var mI = 0; mI < 12; mI++) {
      monthOpts += '<option value="' + (mI + 1) + '"' + ((mI + 1) === st.jm ? " selected" : "") + '>' + jaMonthNames[mI] + '</option>';
    }
    var dayLen = jaMonthLen(st.jy, st.jm);
    var dayOpts = "";
    for (var dI = 1; dI <= dayLen; dI++) {
      dayOpts += '<option value="' + dI + '"' + (dI === st.jd ? " selected" : "") + '>' + jaNum(dI) + '</option>';
    }
    return '<div class="alw-jalali-row">' +
        '<select data-jfield="jy" data-jmkey="' + prefix + '" data-jmid="' + id + '">' + yearOpts + '</select>' +
        '<select data-jfield="jm" data-jmkey="' + prefix + '" data-jmid="' + id + '">' + monthOpts + '</select>' +
        '<select data-jfield="jd" data-jmkey="' + prefix + '" data-jmid="' + id + '">' + dayOpts + '</select>' +
      '</div>' +
      '<div class="alw-date-preview">تاریخ انتخاب‌شده: ' + faDateLabel(st.date) + '</div>';
  }

  function loadSaved() {
    return window.storage.get(SAVED_KEY).then(function (r) {
      try { return (r && r.value) ? JSON.parse(r.value) : []; } catch (e) { return []; }
    }).catch(function () { return []; });
  }
  function saveSaved(arr) { return window.storage.set(SAVED_KEY, JSON.stringify(arr)); }

  function emptyDay() { return { tasks: [], habitLogs: {}, journal: "", images: [], voiceNotes: [] }; }
  function loadDay(dateKey) {
    return window.storage.get("day-" + dateKey).then(function (r) {
      try { return (r && r.value) ? JSON.parse(r.value) : emptyDay(); }
      catch (e) { return emptyDay(); }
    }).catch(function () { return emptyDay(); });
  }
  function saveDay(dateKey, day) { return window.storage.set("day-" + dateKey, JSON.stringify(day)); }

  function afterWrite(msg) {
    window.alert(msg);
    setTimeout(function () { window.location.reload(); }, 250);
  }

  function quadGrid(containerId, selectedGetter, onSelect) {
    var wrap = document.getElementById(containerId);
    wrap.innerHTML = "";
    QUAD.forEach(function (q) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "alw-quad-btn" + (selectedGetter() === q ? " alw-quad-sel" : "");
      b.textContent = QLABEL[q];
      b.addEventListener("click", function () { onSelect(q); });
      wrap.appendChild(b);
    });
  }

  // ---------- New saved-activity form ----------
  var newQuad = "iu";
  function renderNewQuad() {
    quadGrid("alw-new-quad", function () { return newQuad; }, function (q) { newQuad = q; renderNewQuad(); });
  }
  renderNewQuad();

  document.getElementById("alw-new-save").addEventListener("click", function () {
    var title = document.getElementById("alw-new-title").value.trim();
    if (!title) { window.alert("اول یک نام برای فعالیت بنویس."); return; }
    var notes = document.getElementById("alw-new-notes").value.trim();
    var time = document.getElementById("alw-new-time").value || "";
    var loc = document.getElementById("alw-new-loc").value.trim();
    loadSaved().then(function (list) {
      list.push({ id: genId(), title: title, notes: notes, quadrant: newQuad, time: time, location: loc });
      return saveSaved(list);
    }).then(function () {
      document.getElementById("alw-new-title").value = "";
      document.getElementById("alw-new-notes").value = "";
      document.getElementById("alw-new-time").value = "";
      document.getElementById("alw-new-loc").value = "";
      newQuad = "iu"; renderNewQuad();
      renderList();
    });
  });

  // ---------- Saved activities list + "add to a day" mini form ----------
  var savedCache = [];
  var openMiniFor = null; // id of saved activity whose mini-form is open
  var miniState = {};     // per-id mini form state

  function ensureMini(id, base) {
    if (!miniState[id]) {
      miniState[id] = {
        date: todayKey(),
        quadrant: base.quadrant || "iu",
        time: base.time || "",
        location: base.location || ""
      };
      withJalali(miniState[id]);
    }
    return miniState[id];
  }

  function renderList() {
    var q = (document.getElementById("alw-search-input").value || "").trim();
    loadSaved().then(function (list) {
      savedCache = list;
      var listEl = document.getElementById("alw-list");
      listEl.innerHTML = "";
      var filtered = q ? list.filter(function (a) { return a.title.indexOf(q) !== -1; }) : list;
      if (!filtered.length) {
        listEl.innerHTML = '<div class="alw-empty">' + (q ? "چیزی با این نام پیدا نشد." : "هنوز فعالیتی ذخیره نکردی.") + '</div>';
        return;
      }
      filtered.forEach(function (act) {
        var item = document.createElement("div");
        item.className = "alw-item";
        var metaBits = [];
        if (act.time) metaBits.push("ساعت " + act.time);
        if (act.location) metaBits.push("مکان: " + act.location);
        item.innerHTML =
          '<div class="alw-item-top">' +
          '<div class="alw-item-title">' + esc(act.title) + '</div>' +
          '<div class="alw-badge" style="background:' + QCOLOR[act.quadrant] + '22;color:' + QCOLOR[act.quadrant] + ';">' + QLABEL[act.quadrant] + '</div>' +
          '</div>' +
          (act.notes ? '<div class="alw-item-notes">' + esc(act.notes) + '</div>' : '') +
          (metaBits.length ? '<div class="alw-item-meta">' + metaBits.join(" · ") + '</div>' : '') +
          '<div class="alw-item-actions">' +
          '<button class="alw-primary" data-add="' + act.id + '">+ افزودن به یک روز</button>' +
          '<button data-edit="' + act.id + '">ویرایش</button>' +
          '<button class="alw-danger" data-del="' + act.id + '">حذف</button>' +
          '</div>' +
          '<div class="alw-mini" id="alw-mini-' + act.id + '"></div>';
        listEl.appendChild(item);
        if (openMiniFor === act.id) renderMini(act);
      });
    });
  }

  function renderMini(act) {
    var st = ensureMini(act.id, act);
    var box = document.getElementById("alw-mini-" + act.id);
    if (!box) return;
    box.classList.add("alw-open");
    box.innerHTML =
      '<div class="alw-quick-row">' +
      '<button data-quick="today" data-for="' + act.id + '">امروز</button>' +
      '<button data-quick="tomorrow" data-for="' + act.id + '">فردا</button>' +
      '</div>' +
      jaModeToggle("mini", act.id, st.mode) +
      jaPickerBody("mini", act.id, st) +
      '<div class="alw-quad-grid" id="alw-mini-quad-' + act.id + '"></div>' +
      '<div class="alw-row2">' +
      '<input type="time" data-field="time" data-for="' + act.id + '" value="' + st.time + '" />' +
      '<input type="text" data-field="location" data-for="' + act.id + '" placeholder="مکان" value="' + esc(st.location) + '" />' +
      '</div>' +
      '<div class="alw-row2">' +
      '<button class="alw-btn" data-confirm-add="' + act.id + '" style="margin-top:4px;">افزودن به آن روز</button>' +
      '<button class="alw-btn alw-btn-ghost" data-cancel-add="' + act.id + '" style="margin-top:4px;">انصراف</button>' +
      '</div>';
    var quadWrap = document.getElementById("alw-mini-quad-" + act.id);
    function paint() {
      quadWrap.innerHTML = "";
      QUAD.forEach(function (qq) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "alw-quad-btn" + (st.quadrant === qq ? " alw-quad-sel" : "");
        b.textContent = QLABEL[qq];
        b.addEventListener("click", function () { st.quadrant = qq; paint(); });
        quadWrap.appendChild(b);
      });
    }
    paint();
  }

  document.getElementById("alw-list").addEventListener("input", function (e) {
    var forId = e.target.getAttribute("data-for");
    var field = e.target.getAttribute("data-field");
    if (!forId || !field) return;
    var st = miniState[forId]; if (!st) return;
    st[field] = e.target.value;
    if (field === "date") {
      var lbl = e.target.parentElement.querySelector('[id="alw-mini-' + forId + '"]');
    }
  });
  document.getElementById("alw-list").addEventListener("change", function (e) {
    var forId = e.target.getAttribute("data-for");
    var field = e.target.getAttribute("data-field");
    if (forId && field === "date") {
      var act = savedCache.filter(function (a) { return a.id === forId; })[0];
      if (act) renderMini(act);
    }
  });

  document.getElementById("alw-list").addEventListener("click", function (e) {
    var addId = e.target.getAttribute("data-add");
    var editId = e.target.getAttribute("data-edit");
    var delId = e.target.getAttribute("data-del");
    var quickId = e.target.getAttribute("data-quick");
    var confirmId = e.target.getAttribute("data-confirm-add");
    var cancelId = e.target.getAttribute("data-cancel-add");

    if (addId) {
      openMiniFor = (openMiniFor === addId) ? null : addId;
      renderList();
      return;
    }
    if (cancelId) { openMiniFor = null; renderList(); return; }
    if (delId) {
      window.bjConfirm("حذف این فعالیت از فهرست دلخواه؟", function () {
        loadSaved().then(function (list) {
          return saveSaved(list.filter(function (a) { return a.id !== delId; }));
        }).then(renderList);
      });
      return;
    }
    if (editId) {
      var act = savedCache.filter(function (a) { return a.id === editId; })[0];
      if (!act) return;
      window.bjPrompt("نام فعالیت:", act.title).then(function (newTitle) {
        if (newTitle === null) return;
        return window.bjPrompt("توضیحات:", act.notes || "").then(function (newNotes) {
          if (newNotes === null) newNotes = act.notes;
          return loadSaved().then(function (list) {
            list = list.map(function (a) { return a.id === editId ? Object.assign({}, a, { title: newTitle.trim() || a.title, notes: newNotes.trim() }) : a; });
            return saveSaved(list);
          }).then(renderList);
        });
      });
      return;
    }
    if (quickId && e.target.getAttribute("data-for")) {
      var forId2 = e.target.getAttribute("data-for");
      var act2 = savedCache.filter(function (a) { return a.id === forId2; })[0];
      var st2 = miniState[forId2];
      if (st2) {
        st2.date = quickId === "today" ? todayKey() : addDaysKey(todayKey(), 1);
        var p2 = isoToJa(st2.date);
        st2.jy = p2.jy; st2.jm = p2.jm; st2.jd = p2.jd;
        if (act2) renderMini(act2);
      }
      return;
    }
    if (confirmId) {
      var st3 = miniState[confirmId];
      var act3 = savedCache.filter(function (a) { return a.id === confirmId; })[0];
      if (!st3 || !act3) return;
      loadDay(st3.date).then(function (day) {
        day.tasks.push({
          id: genId(), quadrant: st3.quadrant, text: act3.title, done: false,
          time: st3.time || "", location: (st3.location || "").trim(),
          remind: "none", notes: act3.notes || "", notified: false
        });
        return saveDay(st3.date, day);
      }).then(function () {
        afterWrite("«" + act3.title + "» به تاریخ " + faDateLabel(st3.date) + " اضافه شد.");
      });
      return;
    }
  });

  document.getElementById("alw-search-input").addEventListener("input", renderList);
  document.getElementById("alw-search-btn").addEventListener("click", renderList);

  // ---------- Copy an existing day's task to another day ----------
  var srcSel = withJalali({ date: todayKey() });
  function renderSrcDatePicker() {
    var box = document.getElementById("alw-src-datepicker");
    if (!box) return;
    box.innerHTML = jaModeToggle("src", "src", srcSel.mode) + jaPickerBody("src", "src", srcSel);
  }
  renderSrcDatePicker();

  var srcTasks = [];
  var srcDateKey = todayKey();
  var openCopyFor = null;
  var copyState = {};

  function loadSrcDay() {
    srcDateKey = srcSel.date || todayKey();
    loadDay(srcDateKey).then(function (day) {
      srcTasks = (day && day.tasks) || [];
      renderSrcList();
    });
  }
  document.getElementById("alw-src-load").addEventListener("click", loadSrcDay);

  function renderSrcList() {
    var wrap = document.getElementById("alw-src-list");
    wrap.innerHTML = "";
    if (!srcTasks.length) {
      wrap.innerHTML = '<div class="alw-empty">کاری برای این روز ثبت نشده.</div>';
      return;
    }
    srcTasks.forEach(function (t) {
      var row = document.createElement("div");
      row.className = "alw-src-task";
      row.innerHTML =
        '<span style="width:8px;height:8px;border-radius:50%;background:' + (QCOLOR[t.quadrant] || "#5A6178") + ';flex-shrink:0;"></span>' +
        '<div class="alw-src-task-text">' + esc(t.text) + '</div>' +
        '<button data-copy="' + t.id + '">کپی به روز دیگر</button>' +
        '<button data-save-lib="' + t.id + '">ذخیره در دلخواه</button>';
      wrap.appendChild(row);
      var mini = document.createElement("div");
      mini.className = "alw-mini";
      mini.id = "alw-copy-mini-" + t.id;
      wrap.appendChild(mini);
      if (openCopyFor === t.id) renderCopyMini(t);
    });
  }

  function renderCopyMini(t) {
    if (!copyState[t.id]) {
      copyState[t.id] = { date: addDaysKey(srcDateKey, 1), quadrant: t.quadrant, time: t.time || "", location: t.location || "" };
      withJalali(copyState[t.id]);
    }
    var st = copyState[t.id];
    var box = document.getElementById("alw-copy-mini-" + t.id);
    if (!box) return;
    box.classList.add("alw-open");
    box.innerHTML =
      jaModeToggle("copy", t.id, st.mode) +
      jaPickerBody("copy", t.id, st) +
      '<div class="alw-quad-grid" id="alw-copy-quad-' + t.id + '"></div>' +
      '<div class="alw-row2">' +
      '<input type="time" data-cfield="time" data-cfor="' + t.id + '" value="' + st.time + '" />' +
      '<input type="text" data-cfield="location" data-cfor="' + t.id + '" placeholder="مکان" value="' + esc(st.location) + '" />' +
      '</div>' +
      '<div class="alw-row2">' +
      '<button class="alw-btn" data-confirm-copy="' + t.id + '" style="margin-top:4px;">کپی به این روز</button>' +
      '<button class="alw-btn alw-btn-ghost" data-cancel-copy="' + t.id + '" style="margin-top:4px;">انصراف</button>' +
      '</div>';
    var quadWrap = document.getElementById("alw-copy-quad-" + t.id);
    function paint() {
      quadWrap.innerHTML = "";
      QUAD.forEach(function (qq) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "alw-quad-btn" + (st.quadrant === qq ? " alw-quad-sel" : "");
        b.textContent = QLABEL[qq];
        b.addEventListener("click", function () { st.quadrant = qq; paint(); });
        quadWrap.appendChild(b);
      });
    }
    paint();
  }

  document.getElementById("alw-src-list").addEventListener("input", function (e) {
    var forId = e.target.getAttribute("data-cfor");
    var field = e.target.getAttribute("data-cfield");
    if (!forId || !field) return;
    var st = copyState[forId]; if (!st) return;
    st[field] = e.target.value;
  });
  document.getElementById("alw-src-list").addEventListener("change", function (e) {
    var forId = e.target.getAttribute("data-cfor");
    var field = e.target.getAttribute("data-cfield");
    if (forId && field === "date") {
      var t = srcTasks.filter(function (x) { return x.id === forId; })[0];
      if (t) renderCopyMini(t);
    }
  });

  document.getElementById("alw-src-list").addEventListener("click", function (e) {
    var copyId = e.target.getAttribute("data-copy");
    var saveLibId = e.target.getAttribute("data-save-lib");
    var confirmCopyId = e.target.getAttribute("data-confirm-copy");
    var cancelCopyId = e.target.getAttribute("data-cancel-copy");

    if (copyId) { openCopyFor = (openCopyFor === copyId) ? null : copyId; renderSrcList(); return; }
    if (cancelCopyId) { openCopyFor = null; renderSrcList(); return; }
    if (saveLibId) {
      var t2 = srcTasks.filter(function (x) { return x.id === saveLibId; })[0];
      if (!t2) return;
      loadSaved().then(function (list) {
        list.push({ id: genId(), title: t2.text, notes: t2.notes || "", quadrant: t2.quadrant, time: t2.time || "", location: t2.location || "" });
        return saveSaved(list);
      }).then(function () {
        window.alert("«" + t2.text + "» به فهرست فعالیت‌های دلخواه اضافه شد.");
        renderList();
      });
      return;
    }
    if (confirmCopyId) {
      var t3 = srcTasks.filter(function (x) { return x.id === confirmCopyId; })[0];
      var st3 = copyState[confirmCopyId];
      if (!t3 || !st3) return;
      loadDay(st3.date).then(function (day) {
        day.tasks.push({
          id: genId(), quadrant: st3.quadrant, text: t3.text, done: false,
          time: st3.time || "", location: (st3.location || "").trim(),
          remind: "none", notes: t3.notes || "", notified: false
        });
        return saveDay(st3.date, day);
      }).then(function () {
        afterWrite("«" + t3.text + "» به تاریخ " + faDateLabel(st3.date) + " کپی شد.");
      });
      return;
    }
  });

  // ---------- شمسی/میلادی picker: delegated events for src / mini / copy forms ----------
  function jalaliCtx(prefix, id) {
    if (prefix === "src") return { st: srcSel, rerender: renderSrcDatePicker };
    if (prefix === "mini") {
      var act = savedCache.filter(function (a) { return a.id === id; })[0];
      var st = miniState[id];
      if (!st || !act) return null;
      return { st: st, rerender: function () { renderMini(act); } };
    }
    if (prefix === "copy") {
      var t = srcTasks.filter(function (x) { return x.id === id; })[0];
      var st2 = copyState[id];
      if (!st2 || !t) return null;
      return { st: st2, rerender: function () { renderCopyMini(t); } };
    }
    return null;
  }
  var panelEl = document.getElementById("alw-panel");
  panelEl.addEventListener("click", function (e) {
    var jmval = e.target.getAttribute("data-jmval");
    if (!jmval) return;
    var ctx = jalaliCtx(e.target.getAttribute("data-jmkey"), e.target.getAttribute("data-jmid"));
    if (!ctx) return;
    var st = ctx.st;
    if (st.mode === jmval) return;
    if (jmval === "j") {
      var p = isoToJa(st.date);
      st.jy = p.jy; st.jm = p.jm; st.jd = p.jd;
    } else {
      st.date = toISODateStr(jaToGregorian(st.jy, st.jm, st.jd));
    }
    st.mode = jmval;
    ctx.rerender();
  });
  panelEl.addEventListener("change", function (e) {
    var jfield = e.target.getAttribute("data-jfield");
    if (!jfield) return;
    var ctx = jalaliCtx(e.target.getAttribute("data-jmkey"), e.target.getAttribute("data-jmid"));
    if (!ctx) return;
    var st = ctx.st;
    if (jfield === "date") {
      st.date = e.target.value;
    } else {
      if (jfield === "jy") st.jy = parseInt(e.target.value, 10);
      else if (jfield === "jm") st.jm = parseInt(e.target.value, 10);
      else if (jfield === "jd") st.jd = parseInt(e.target.value, 10);
      st.jd = Math.min(st.jd, jaMonthLen(st.jy, st.jm));
      st.date = toISODateStr(jaToGregorian(st.jy, st.jm, st.jd));
    }
    ctx.rerender();
  });

  // ---------- Open/close panel ----------
  var fab = document.getElementById("alw-fab");
  var overlay = document.getElementById("alw-overlay");
  var panel = document.getElementById("alw-panel");
  var closeBtn = document.getElementById("alw-close");
  function openPanel() {
    overlay.style.display = "block"; panel.style.display = "block";
    openMiniFor = null; openCopyFor = null;
    renderList();
    loadSrcDay();
  }
  function closePanel() { overlay.style.display = "none"; panel.style.display = "none"; }
  fab.addEventListener("click", openPanel);
  overlay.addEventListener("click", closePanel);
  closeBtn.addEventListener("click", closePanel);
})();
