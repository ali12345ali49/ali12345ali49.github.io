(function () {
  function pad2(n) { return n < 10 ? "0" + n : "" + n; }
  function dateKey(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function fa(n) { return Number(n).toLocaleString("fa-IR"); }
  function faDateLabel(key) {
    return new Date(key + "T00:00:00").toLocaleDateString("fa-IR", { weekday: "long", day: "numeric", month: "long" });
  }
  function toMin(t) {
    if (!t) return null;
    var p = t.split(":");
    return (+p[0]) * 60 + (+p[1]);
  }
  function durMin(start, end) {
    var s = toMin(start), e = toMin(end);
    if (s === null || e === null) return 0;
    var d = e - s;
    if (d < 0) d += 24 * 60;
    return d;
  }
  function fmtDur(mins) {
    mins = Math.round(mins);
    var h = Math.floor(mins / 60), m = mins % 60;
    if (h <= 0 && m <= 0) return "۰ دقیقه";
    var out = "";
    if (h > 0) out += fa(h) + " ساعت";
    if (m > 0) out += (out ? " و " : "") + fa(m) + " دقیقه";
    return out;
  }

  function jaYM(d) {
    var parts = new Intl.DateTimeFormat("en-US-u-ca-persian", { year: "numeric", month: "numeric" }).formatToParts(d);
    var y, m;
    parts.forEach(function (p) { if (p.type === "year") y = p.value; if (p.type === "month") m = p.value; });
    return y + "-" + m;
  }

  var JA_MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];

  var mode = "week"; // "week" | "month" | "year"
  var anchor = new Date();
  var lastState = null, lastKeys = null, lastRange = null;

  function weekRange(d) {
    var dow = d.getDay(); // 0=Sun..6=Sat
    var sinceSat = (dow - 6 + 7) % 7;
    var start = addDays(d, -sinceSat);
    var end = addDays(start, 6);
    return { start: start, end: end };
  }
  function monthRange(d) {
    var key = jaYM(d);
    var start = new Date(d), end = new Date(d);
    while (jaYM(addDays(start, -1)) === key) start = addDays(start, -1);
    while (jaYM(addDays(end, 1)) === key) end = addDays(end, 1);
    return { start: start, end: end };
  }
  function yearRange(d) {
    var mr = monthRange(d);
    while (jaYM(mr.start).split("-")[1] !== "1") mr = monthRange(addDays(mr.start, -1));
    var start = mr.start;
    var mr2 = monthRange(d);
    while (jaYM(mr2.end).split("-")[1] !== "12") mr2 = monthRange(addDays(mr2.end, 1));
    var end = mr2.end;
    return { start: start, end: end };
  }
  function currentRange() {
    if (mode === "week") return weekRange(anchor);
    if (mode === "month") return monthRange(anchor);
    return yearRange(anchor);
  }
  function prevRangeFor(r) {
    if (mode === "week") return { start: addDays(r.start, -7), end: addDays(r.end, -7) };
    if (mode === "month") return monthRange(addDays(r.start, -1));
    return yearRange(addDays(r.start, -1));
  }

  function keysInRange(r) {
    var out = [], d = new Date(r.start);
    while (d <= r.end) { out.push(dateKey(d)); d = addDays(d, 1); }
    return out;
  }

  function loadBjStateLegacy() {
    return window.storage.get("bj-state").then(function (r) {
      if (r && typeof r.value === "string") { try { return JSON.parse(r.value); } catch (e) {} }
      return null;
    }).catch(function () { return null; });
  }
  function loadBjState(keys) {
    return window.storage.get("bj-meta").then(function (mr) {
      if (!mr || typeof mr.value !== "string") return loadBjStateLegacy();
      var meta = {};
      try { meta = JSON.parse(mr.value); } catch (e) {}
      var dayPromises = (keys || []).map(function (k) {
        return window.storage.get("day-" + k).then(function (r) {
          var v = null;
          if (r && typeof r.value === "string") { try { v = JSON.parse(r.value); } catch (e) {} }
          return { k: k, v: v };
        }).catch(function () { return { k: k, v: null }; });
      });
      return Promise.all(dayPromises).then(function (results) {
        var days = {};
        results.forEach(function (item) { if (item.v) days[item.k] = item.v; });
        return { days: days, habits: meta.habits || [], goals: meta.goals || [], quadTargets: meta.quadTargets || {} };
      });
    }).catch(function () { return loadBjStateLegacy(); });
  }
  function loadSww(key) {
    return window.storage.get("sww:" + key).then(function (r) { return r.value || null; }).catch(function () { return null; });
  }

  function renderLabel(r) {
    var el = document.getElementById("rvw-period-label");
    if (mode === "week") {
      el.textContent = faDateLabel(dateKey(r.start)).split("،")[0] + " تا " + faDateLabel(dateKey(r.end));
    } else if (mode === "month") {
      el.textContent = r.start.toLocaleDateString("fa-IR", { month: "long", year: "numeric" });
    } else {
      el.textContent = "سال " + r.start.toLocaleDateString("fa-IR", { year: "numeric" });
    }
  }

  function setBlocksVisible(cfg) {
    document.getElementById("rvw-block-trend").style.display = cfg.trend ? "" : "none";
    document.getElementById("rvw-block-heatmap").style.display = cfg.heatmap ? "" : "none";
    document.getElementById("rvw-block-habits").style.display = cfg.habits ? "" : "none";
    document.getElementById("rvw-block-journal").style.display = cfg.journal ? "" : "none";
    document.getElementById("rvw-block-sleep").style.display = cfg.sleep ? "" : "none";
  }

  function computeStats(keys, state, sleepData) {
    var days = (state && state.days) || {};
    var totalTasks = 0, doneTasks = 0, journalDays = 0;
    keys.forEach(function (k) {
      var day = days[k];
      if (!day) return;
      if (day.tasks && day.tasks.length) { totalTasks += day.tasks.length; doneTasks += day.tasks.filter(function (t) { return t.done; }).length; }
      if (day.journal && day.journal.trim()) journalDays++;
    });
    var taskPct = totalTasks === 0 ? null : Math.round(doneTasks / totalTasks * 100);

    var sleepVals = keys.map(function (k) { return (sleepData || {})[k]; }).filter(function (d) { return d && d.bed && d.wake; });
    var avgSleep = sleepVals.length
      ? sleepVals.reduce(function (s, d) { return s + durMin(d.bed, d.wake) + (d.naps || []).reduce(function (s2, n) { return s2 + durMin(n.start, n.end); }, 0); }, 0) / sleepVals.length
      : null;

    return { totalTasks: totalTasks, doneTasks: doneTasks, journalDays: journalDays, taskPct: taskPct, avgSleep: avgSleep };
  }

  function deltaBadge(cur, prev, opts) {
    opts = opts || {};
    if (cur == null || prev == null) return "";
    var diff = cur - prev;
    if (Math.abs(diff) < (opts.eps || 0.5)) return '<div class="rvw-card-delta rvw-delta-flat">— بدون تغییر نسبت به قبل</div>';
    var up = diff > 0;
    var isGood = (opts.goodIsUp !== false) ? up : !up;
    var arrow = up ? "▲" : "▼";
    var text = opts.fmt ? opts.fmt(Math.abs(diff)) : (fa(Math.round(Math.abs(diff))) + (opts.suffix || ""));
    return '<div class="rvw-card-delta ' + (isGood ? "rvw-delta-good" : "rvw-delta-bad") + '">' + arrow + ' ' + text + ' نسبت به قبل</div>';
  }

  function renderCards(keys, state, sleepData, prevStats) {
    var wrap = document.getElementById("rvw-cards");
    var s = computeStats(keys, state, sleepData);

    function card(val, label, delta) {
      return '<div class="rvw-card"><div class="rvw-card-val">' + val + '</div><div class="rvw-card-label">' + label + '</div>' + (delta || "") + '</div>';
    }
    var taskDelta = prevStats ? deltaBadge(s.taskPct, prevStats.taskPct, { suffix: "٪" }) : "";
    var sleepDelta = prevStats ? deltaBadge(s.avgSleep, prevStats.avgSleep, { eps: 5, fmt: fmtDur }) : "";
    wrap.innerHTML =
      card(s.taskPct === null ? "—" : fa(s.taskPct) + "٪", "انجام کارها", taskDelta) +
      card(fa(s.journalDays) + " از " + fa(keys.length), "روز یادداشت‌شده") +
      card(s.avgSleep === null ? "—" : fmtDur(s.avgSleep), "میانگین خواب", sleepDelta) +
      card(fa(s.doneTasks) + "/" + fa(s.totalTasks), "کارهای انجام‌شده");
  }

  function renderYearCards(keys, state) {
    var wrap = document.getElementById("rvw-cards");
    var days = (state && state.days) || {};
    var habits = (state && state.habits) || [];
    var totalTasks = 0, doneTasks = 0, journalDays = 0;
    keys.forEach(function (k) {
      var day = days[k];
      if (!day) return;
      if (day.tasks && day.tasks.length) { totalTasks += day.tasks.length; doneTasks += day.tasks.filter(function (t) { return t.done; }).length; }
      if (day.journal && day.journal.trim()) journalDays++;
    });
    var taskPct = totalTasks === 0 ? null : Math.round(doneTasks / totalTasks * 100);
    function card(val, label) {
      return '<div class="rvw-card"><div class="rvw-card-val">' + val + '</div><div class="rvw-card-label">' + label + '</div></div>';
    }
    wrap.innerHTML =
      card(taskPct === null ? "—" : fa(taskPct) + "٪", "درصد انجام کارها") +
      card(fa(journalDays), "روز یادداشت‌شده") +
      card(fa(habits.length), "عادت فعال") +
      card(fa(doneTasks) + "/" + fa(totalTasks), "کارهای انجام‌شده");
  }

  function renderTrend(state, yearKeys) {
    var wrap = document.getElementById("rvw-trend");
    var days = (state && state.days) || {};
    var buckets = {};
    yearKeys.forEach(function (k) {
      var d = new Date(k + "T00:00:00");
      var mnum = jaYM(d).split("-")[1];
      if (!buckets[mnum]) buckets[mnum] = { total: 0, done: 0, journal: 0 };
      var day = days[k];
      if (day) {
        if (day.tasks && day.tasks.length) {
          buckets[mnum].total += day.tasks.length;
          buckets[mnum].done += day.tasks.filter(function (t) { return t.done; }).length;
        }
        if (day.journal && day.journal.trim()) buckets[mnum].journal++;
      }
    });
    var rows = "";
    for (var m = 1; m <= 12; m++) {
      var b = buckets[m] || { total: 0, done: 0, journal: 0 };
      var pct = b.total === 0 ? 0 : Math.round(b.done / b.total * 100);
      rows += '<div class="rvw-trend-row"><div class="rvw-trend-top"><span>' + JA_MONTHS[m - 1] + '</span><span>' +
        (b.total === 0 ? "—" : fa(pct) + "٪") + " · " + fa(b.journal) + ' یادداشت</span></div>' +
        '<div class="rvw-trend-bar"><div class="rvw-trend-bar-fill" style="width:' + pct + '%;"></div></div></div>';
    }
    wrap.innerHTML = rows;
  }

  function renderHeatHabitSelect(state) {
    var sel = document.getElementById("rvw-heat-habit");
    var habits = (state && state.habits) || [];
    if (!habits.length) { sel.innerHTML = ""; sel.disabled = true; return; }
    sel.disabled = false;
    var prev = sel.value;
    sel.innerHTML = habits.map(function (h) { return '<option value="' + h.id + '">' + h.name.replace(/</g, "&lt;") + '</option>'; }).join("");
    if (prev && habits.some(function (h) { return h.id === prev; })) sel.value = prev;
  }

  function renderHeatmap(state, yearKeys, r) {
    var wrap = document.getElementById("rvw-heatmap");
    var sel = document.getElementById("rvw-heat-habit");
    var habits = (state && state.habits) || [];
    if (!habits.length) { wrap.innerHTML = '<div class="rvw-empty">هنوز عادتی ثبت نشده</div>'; return; }
    var habitId = sel.value || habits[0].id;
    var days = (state && state.days) || {};
    var startOffset = (r.start.getDay() - 6 + 7) % 7;
    var cells = "";
    for (var i = 0; i < startOffset; i++) cells += '<div class="rvw-heat-cell rvw-heat-empty"></div>';
    yearKeys.forEach(function (k) {
      var day = days[k];
      var v = day && day.habitLogs ? day.habitLogs[habitId] : undefined;
      var on = v !== undefined && v !== null && v !== "";
      cells += '<div class="rvw-heat-cell' + (on ? " rvw-heat-on" : "") + '"></div>';
    });
    wrap.innerHTML = '<div class="rvw-heat-grid">' + cells + '</div>';
  }

  function renderHabits(keys, state) {
    var wrap = document.getElementById("rvw-habits");
    var habits = (state && state.habits) || [];
    var days = (state && state.days) || {};
    if (!habits.length) { wrap.innerHTML = '<div class="rvw-empty">هنوز عادتی ثبت نشده</div>'; return; }
    wrap.innerHTML = habits.map(function (h) {
      var count = 0;
      var dots = keys.map(function (k) {
        var day = days[k];
        var v = day && day.habitLogs ? day.habitLogs[h.id] : undefined;
        var on = v !== undefined && v !== null && v !== "";
        if (on) count++;
        return '<div class="rvw-dot' + (on ? " rvw-dot-on" : "") + '"></div>';
      }).join("");
      return '<div class="rvw-habit-row"><div class="rvw-habit-name">' + h.name.replace(/</g, "&lt;") + '</div>' +
        '<div class="rvw-habit-dots">' + dots + '</div>' +
        '<div class="rvw-habit-count">' + fa(count) + "/" + fa(keys.length) + '</div></div>';
    }).join("");
  }

  function renderJournal(keys, state) {
    var wrap = document.getElementById("rvw-journal");
    var days = (state && state.days) || {};
    var entries = keys.filter(function (k) { return days[k] && days[k].journal && days[k].journal.trim(); })
      .map(function (k) { return { key: k, text: days[k].journal.trim() }; })
      .reverse();
    if (!entries.length) { wrap.innerHTML = '<div class="rvw-empty">تو این بازه یادداشتی ننوشتی</div>'; return; }
    wrap.innerHTML = "";
    entries.forEach(function (en) {
      var item = document.createElement("div");
      item.className = "rvw-journal-item";
      item.innerHTML = '<div class="rvw-journal-date">' + faDateLabel(en.key) + '</div>' +
        '<div class="rvw-journal-text rvw-collapsed">' + en.text.replace(/</g, "&lt;") + '</div>';
      var textEl = item.querySelector(".rvw-journal-text");
      item.addEventListener("click", function () { textEl.classList.toggle("rvw-collapsed"); });
      wrap.appendChild(item);
    });
  }

  function renderSleep(keys, sleepData) {
    var wrap = document.getElementById("rvw-sleep");
    var totalSleep = 0, work = 0, notwork = 0, waste = 0, any = false;
    keys.forEach(function (k) {
      var d = sleepData[k];
      if (!d) return;
      any = true;
      if (d.bed && d.wake) totalSleep += durMin(d.bed, d.wake);
      (d.naps || []).forEach(function (n) { totalSleep += durMin(n.start, n.end); });
      (d.blocks || []).forEach(function (b) {
        var dur = durMin(b.start, b.end);
        if (b.type === "work") work += dur; else if (b.type === "notwork") notwork += dur; else if (b.type === "waste") waste += dur;
      });
    });
    if (!any) { wrap.innerHTML = '<div class="rvw-empty">دیتایی ثبت نشده</div>'; return; }
    function row(label, val) { return '<div class="rvw-sleep-row"><span>' + label + '</span><span>' + val + '</span></div>'; }
    wrap.innerHTML =
      row("😴 مجموع خواب", fmtDur(totalSleep)) +
      row("💼 مجموع کار", fmtDur(work)) +
      row("🚫 کار نکردن", fmtDur(notwork)) +
      row("⌛ هدررفت", fmtDur(waste));
  }

  function renderGoals(state) {
    var wrap = document.getElementById("rvw-goals");
    var goals = (state && state.goals) || [];
    if (!goals.length) { wrap.innerHTML = '<div class="rvw-empty">هدفی ثبت نشده</div>'; return; }
    wrap.innerHTML = goals.map(function (g) {
      var pct = g.target ? Math.min(100, Math.round((g.progress || 0) / g.target * 100)) : (g.done ? 100 : 0);
      return '<div class="rvw-goal-item"><div class="rvw-goal-title' + (g.done ? " rvw-goal-done" : "") + '">' +
        '<span>' + g.title.replace(/</g, "&lt;") + '</span><span class="rvw-goal-pct">' + fa(pct) + '٪</span></div>' +
        '<div class="rvw-goal-bar"><div class="rvw-goal-bar-fill" style="width:' + pct + '%;"></div></div></div>';
    }).join("");
  }

  function loadAndRender() {
    var r = currentRange();
    renderLabel(r);
    var keys = keysInRange(r);
    if (mode === "year") {
      setBlocksVisible({ trend: true, heatmap: true, habits: false, journal: false, sleep: false });
      loadBjState(keys).then(function (state) {
        lastState = state; lastKeys = keys; lastRange = r;
        renderYearCards(keys, state);
        renderTrend(state, keys);
        renderHeatHabitSelect(state);
        renderHeatmap(state, keys, r);
        renderGoals(state);
      });
      return;
    }
    setBlocksVisible({ trend: false, heatmap: false, habits: true, journal: true, sleep: true });
    var pr = prevRangeFor(r);
    var prevKeys = keysInRange(pr);
    Promise.all([
      loadBjState(keys), Promise.all(keys.map(loadSww)),
      loadBjState(prevKeys), Promise.all(prevKeys.map(loadSww))
    ]).then(function (res) {
      var state = res[0];
      var sleepData = {};
      keys.forEach(function (k, i) { sleepData[k] = res[1][i]; });
      var prevState = res[2];
      var prevSleepData = {};
      prevKeys.forEach(function (k, i) { prevSleepData[k] = res[3][i]; });
      var prevStats = computeStats(prevKeys, prevState, prevSleepData);
      lastState = state; lastKeys = keys; lastRange = r;
      renderCards(keys, state, sleepData, prevStats);
      renderHabits(keys, state);
      renderJournal(keys, state);
      renderSleep(keys, sleepData);
      renderGoals(state);
    });
  }

  var fab = document.getElementById("rvw-fab");
  var overlay = document.getElementById("rvw-overlay");
  var panel = document.getElementById("rvw-panel");
  var closeBtn = document.getElementById("rvw-close");
  function openPanel() { overlay.style.display = "block"; panel.style.display = "block"; loadAndRender(); }
  function closePanel() { overlay.style.display = "none"; panel.style.display = "none"; }
  fab.addEventListener("click", openPanel);
  overlay.addEventListener("click", closePanel);
  closeBtn.addEventListener("click", closePanel);

  document.getElementById("rvw-heat-habit").addEventListener("change", function () {
    if (mode === "year" && lastState) renderHeatmap(lastState, lastKeys, lastRange);
  });

  var tabWeek = document.getElementById("rvw-tab-week");
  var tabMonth = document.getElementById("rvw-tab-month");
  var tabYear = document.getElementById("rvw-tab-year");
  function setTab(el) {
    [tabWeek, tabMonth, tabYear].forEach(function (b) { b.classList.remove("rvw-active"); });
    el.classList.add("rvw-active");
  }
  tabWeek.addEventListener("click", function () { mode = "week"; setTab(tabWeek); loadAndRender(); });
  tabMonth.addEventListener("click", function () { mode = "month"; setTab(tabMonth); loadAndRender(); });
  tabYear.addEventListener("click", function () { mode = "year"; setTab(tabYear); loadAndRender(); });

  document.getElementById("rvw-prev").addEventListener("click", function () {
    var r = currentRange();
    anchor = addDays(r.start, -1);
    loadAndRender();
  });
  document.getElementById("rvw-next").addEventListener("click", function () {
    var r = currentRange();
    anchor = addDays(r.end, 1);
    loadAndRender();
  });
  document.getElementById("rvw-today").addEventListener("click", function () {
    anchor = new Date();
    loadAndRender();
  });
})();
