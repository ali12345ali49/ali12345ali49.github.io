
(function () {
  var LS_VISUAL = "adhdVisualMode";
  var LS_APP_MODE = "adhdAppMode";
  var LS_DIM = "adhdDimOthers";
  var LS_ALGO = "adhdTimeAlgo";
  var LS_FIXEDICONS = "adhdFixedIcons";
  var LS_BACKUP_DAYVIEW = "adhdBackupDayViewStyle";
  var LS_BACKUP_ROWMODE = "adhdBackupRowMode";
  var LS_BACKUP_ROWOPEN = "adhdBackupRowOpen";
  var LS_TIMER_STATE = "adhdTimerState"; // {endsAt, phase:'work'|'break', workMin, breakMin, warned}

  function toFa(n) { return String(n).replace(/[0-9]/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹"[d]; }); }
  function pad2(n) { return n < 10 ? "0" + n : "" + n; }
  function beep() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 880; g.gain.value = 0.12;
      o.start(); setTimeout(function () { o.stop(); ctx.close && ctx.close(); }, 260);
    } catch (e) {}
  }
  function notify(title, body) {
    try { if (navigator.vibrate) navigator.vibrate([120, 60, 120]); } catch (e) {}
    beep();
    try {
      if (window.Notification && Notification.permission === "granted") new Notification(title, { body: body });
    } catch (e) {}
  }

  // ---- app-wide mode: flips the app's own real settings (day view style +
  // icon row) instead of just changing colors. Reversible: the previous
  // values are backed up before overwriting and restored on turn-off. ----
  var appToggle = document.getElementById("adhd-app-toggle");
  appToggle.checked = localStorage.getItem(LS_APP_MODE) === "1";
  appToggle.addEventListener("change", function () {
    var turningOn = appToggle.checked;
    if (turningOn) {
      try {
        var curMode = localStorage.getItem("bjRowMode") || "toggle";
        var curOpen = localStorage.getItem("bjRowOpen") || "0";
        if (localStorage.getItem(LS_BACKUP_ROWMODE) === null) localStorage.setItem(LS_BACKUP_ROWMODE, curMode);
        if (localStorage.getItem(LS_BACKUP_ROWOPEN) === null) localStorage.setItem(LS_BACKUP_ROWOPEN, curOpen);
        localStorage.setItem("bjDayViewOverride", "flat");
        var wantFixedIcons = localStorage.getItem(LS_FIXEDICONS) === "1";
        localStorage.setItem("bjRowMode", wantFixedIcons ? "fixed" : "toggle");
        localStorage.setItem("bjRowOpen", "0");
        localStorage.setItem(LS_VISUAL, "1");
        localStorage.setItem(LS_APP_MODE, "1");
      } catch (e) {}
    } else {
      try {
        var bMode = localStorage.getItem(LS_BACKUP_ROWMODE);
        var bOpen = localStorage.getItem(LS_BACKUP_ROWOPEN);
        localStorage.removeItem("bjDayViewOverride");
        if (bMode !== null) localStorage.setItem("bjRowMode", bMode);
        if (bOpen !== null) localStorage.setItem("bjRowOpen", bOpen);
        localStorage.removeItem(LS_BACKUP_ROWMODE);
        localStorage.removeItem(LS_BACKUP_ROWOPEN);
        localStorage.setItem(LS_VISUAL, "0");
        localStorage.setItem(LS_APP_MODE, "0");
      } catch (e) {}
    }
    window.location.reload();
  });

  // ---- dim other tasks in daily view (only matters while app-wide mode is on) ----
  var dimToggle = document.getElementById("adhd-dim-toggle");
  dimToggle.checked = localStorage.getItem(LS_DIM) !== "0";
  dimToggle.addEventListener("change", function () {
    try { localStorage.setItem(LS_DIM, dimToggle.checked ? "1" : "0"); } catch (e) {}
    window.location.reload();
  });

  // ---- how the "most important task" is picked among same-priority tasks ----
  var algoToggle = document.getElementById("adhd-algo-toggle");
  algoToggle.checked = localStorage.getItem(LS_ALGO) !== "0";
  algoToggle.addEventListener("change", function () {
    try { localStorage.setItem(LS_ALGO, algoToggle.checked ? "1" : "0"); } catch (e) {}
    window.location.reload();
  });

  // ---- whether the floating icon row goes "fixed" (always visible) instead
  // of "toggle" (collapsed behind a chevron) while app-wide mode is on ----
  var fixedIconsToggle = document.getElementById("adhd-fixedicons-toggle");
  fixedIconsToggle.checked = localStorage.getItem(LS_FIXEDICONS) === "1";
  fixedIconsToggle.addEventListener("change", function () {
    try {
      localStorage.setItem(LS_FIXEDICONS, fixedIconsToggle.checked ? "1" : "0");
      if (appToggle.checked) {
        localStorage.setItem("bjRowMode", fixedIconsToggle.checked ? "fixed" : "toggle");
      }
    } catch (e) {}
    window.location.reload();
  });

  // ---- advanced options collapse/expand ----
  var advHeader = document.getElementById("adhd-advanced-header");
  var advContent = document.getElementById("adhd-advanced-content");
  var advArrow = document.getElementById("adhd-advanced-arrow");
  advHeader.addEventListener("click", function () {
    var isOpen = advContent.style.display !== "none";
    advContent.style.display = isOpen ? "none" : "block";
    advArrow.style.transform = isOpen ? "rotate(0deg)" : "rotate(180deg)";
  });

  // ---- visual mode ----
  var visualToggle = document.getElementById("adhd-visual-toggle");
  function applyVisual(on) {
    document.documentElement.setAttribute("data-adhd-visual", on ? "on" : "off");
    visualToggle.checked = !!on;
  }
  applyVisual(localStorage.getItem(LS_VISUAL) === "1");
  if (appToggle.checked) { visualToggle.disabled = true; visualToggle.parentElement.style.opacity = "0.55"; }
  visualToggle.addEventListener("change", function () {
    // If app-wide mode is on, the visual-only switch is locked to it —
    // turn app-wide mode off first (via the switch above) to change this.
    if (localStorage.getItem(LS_APP_MODE) === "1") { visualToggle.checked = true; return; }
    try { localStorage.setItem(LS_VISUAL, visualToggle.checked ? "1" : "0"); } catch (e) {}
    applyVisual(visualToggle.checked);
  });

  // ---- panel open/close ----
  var overlay = document.getElementById("adhd-overlay");
  var panel = document.getElementById("adhd-panel");
  var fab = document.getElementById("adhd-fab");
  function openPanel() { overlay.style.display = "block"; panel.style.display = "block"; renderNextBox(); }
  function closePanel() { overlay.style.display = "none"; panel.style.display = "none"; }
  fab.addEventListener("click", openPanel);
  document.getElementById("adhd-close").addEventListener("click", closePanel);
  overlay.addEventListener("click", closePanel);

  // ---- focus/pomodoro timer ----
  var chips = document.querySelectorAll("#adhd-timer-presets .adhd-chip");
  var chosenW = 25, chosenB = 5;
  function selectChip(el) {
    Array.prototype.forEach.call(chips, function (c) { c.classList.remove("active"); });
    el.classList.add("active");
    chosenW = Number(el.getAttribute("data-w"));
    chosenB = Number(el.getAttribute("data-b"));
  }
  Array.prototype.forEach.call(chips, function (c) { c.addEventListener("click", function () { selectChip(c); }); });
  (function () {
    var def = null;
    Array.prototype.forEach.call(chips, function (c) { if (c.getAttribute("data-w") === "25") def = c; });
    selectChip(def || chips[0]);
  })();

  var timerDisplay = document.getElementById("adhd-timer-display");
  var timerPhaseEl = document.getElementById("adhd-timer-phase");
  var timerInterval = null;

  function saveTimerState(state) {
    try { localStorage.setItem(LS_TIMER_STATE, state ? JSON.stringify(state) : ""); } catch (e) {}
  }
  function loadTimerState() {
    try { var raw = localStorage.getItem(LS_TIMER_STATE); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }

  function renderTick() {
    var st = loadTimerState();
    if (!st) {
      timerDisplay.textContent = "۰۰:۰۰";
      timerPhaseEl.textContent = "آماده";
      fab.classList.remove("adhd-timer-running");
      fab.removeAttribute("data-timer-label");
      return;
    }
    var remain = Math.max(0, Math.round((st.endsAt - Date.now()) / 1000));
    var m = Math.floor(remain / 60), s = remain % 60;
    timerDisplay.textContent = toFa(pad2(m)) + ":" + toFa(pad2(s));
    timerPhaseEl.textContent = st.phase === "work" ? "🔴 روی کار متمرکزی" : "🟢 استراحت";
    fab.classList.add("adhd-timer-running");
    fab.setAttribute("data-timer-label", toFa(m));

    if (!st.warned && st.phase === "work" && remain <= 300 && remain > 0) {
      st.warned = true; saveTimerState(st);
      notify("۵ دقیقه مونده", "۵ دقیقه دیگه وقت این بخش تموم می‌شه، برای تغییر آماده شو.");
    }
    if (remain <= 0) {
      if (st.phase === "work") {
        notify("زمان تموم شد", "وقت استراحته.");
        st = { endsAt: Date.now() + st.breakMin * 60000, phase: "break", workMin: st.workMin, breakMin: st.breakMin, warned: false };
        saveTimerState(st);
      } else {
        notify("استراحت تموم شد", "برای شروع دوباره، تایمر رو بزن.");
        saveTimerState(null);
        stopTicking();
      }
    }
  }
  function startTicking() {
    if (timerInterval) return;
    timerInterval = setInterval(renderTick, 1000);
    renderTick();
  }
  function stopTicking() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    renderTick();
  }
  document.getElementById("adhd-timer-start").addEventListener("click", function () {
    try { if (window.Notification && Notification.permission === "default") Notification.requestPermission(); } catch (e) {}
    var st = { endsAt: Date.now() + chosenW * 60000, phase: "work", workMin: chosenW, breakMin: chosenB, warned: false };
    saveTimerState(st);
    startTicking();
  });
  document.getElementById("adhd-timer-stop").addEventListener("click", function () {
    saveTimerState(null);
    stopTicking();
  });
  if (loadTimerState()) startTicking(); else renderTick();

  // ---- single-task focus screen (shows the real next task) ----
  var focusOverlay = document.getElementById("adhd-focus-overlay");
  var focusTaskText = document.getElementById("adhd-focus-task-text");
  var focusTimerText = document.getElementById("adhd-focus-timer-text");
  var focusInterval = null;
  var focusStart = null;
  function openFocusScreen(text) {
    focusTaskText.textContent = text;
    focusStart = Date.now();
    closePanel();
    focusOverlay.style.display = "flex";
    if (focusInterval) clearInterval(focusInterval);
    focusInterval = setInterval(function () {
      var elapsed = Math.floor((Date.now() - focusStart) / 1000);
      var m = Math.floor(elapsed / 60), s = elapsed % 60;
      focusTimerText.textContent = toFa(pad2(m)) + ":" + toFa(pad2(s));
    }, 1000);
  }
  document.getElementById("adhd-focus-close").addEventListener("click", function () {
    focusOverlay.style.display = "none";
    if (focusInterval) { clearInterval(focusInterval); focusInterval = null; }
  });
  document.getElementById("adhd-focus-done").addEventListener("click", function () {
    if (focusInterval) { clearInterval(focusInterval); focusInterval = null; }
    focusOverlay.style.display = "none";
    markCurrentTaskDone();
  });

  // ---- real "next task" engine: reads today's actual data via window.storage,
  // no retyping — this is the same store the app itself reads/writes from. ----
  var QUAD_ORDER = ["iu", "un", "in", "nn"];
  var QUAD_LABEL = { iu: "مهم و ضروری", un: "ضروری، غیرمهم", in: "مهم، غیرضروری", nn: "غیرمهم و غیرضروری" };
  var QUAD_COLOR = { iu: "#B5544F", un: "#5B8DBE", in: "#4FA88A", nn: "#5A6178" };
  function pad2s(n) { return n < 10 ? "0" + n : "" + n; }
  function todayKey() {
    var d = new Date();
    return d.getFullYear() + "-" + pad2s(d.getMonth() + 1) + "-" + pad2s(d.getDate());
  }
  var GENERIC_STEPS = [
    "اولین قدم خیلی کوچیک رو مشخص کن (چیزی که کمتر از ۲ دقیقه طول بکشه)",
    "وسایل/چیزهای لازم رو آماده کن",
    "یه بازه‌ی زمانی کوتاه (مثلاً ۱۰-۱۵ دقیقه) براش بذار",
    "شروع کن — نیازی نیست کامل تمومش کنی",
    "وقتی بازه تموم شد، تصمیم بگیر ادامه بدی یا بعداً برگردی"
  ];
  var currentDayKey = null, currentDayData = null, currentTaskId = null, skipIds = {};

  function getDayData(cb) {
    var key = "day-" + todayKey();
    currentDayKey = key;
    if (!window.storage || !window.storage.get) { cb(null); return; }
    window.storage.get(key).then(function (r) {
      cb(r && r.value ? JSON.parse(r.value) : null);
    }).catch(function () { cb(null); });
  }
  function useTimeAlgo() {
    try { return localStorage.getItem("adhdTimeAlgo") !== "0"; } catch (e) { return true; }
  }
  function pickNextTask(day) {
    if (!day || !day.tasks) return null;
    var byTime = useTimeAlgo();
    for (var qi = 0; qi < QUAD_ORDER.length; qi++) {
      var q = QUAD_ORDER[qi];
      var candidates = [];
      for (var i = 0; i < day.tasks.length; i++) {
        var t = day.tasks[i];
        if (t.quadrant === q && !t.done && !t.__demo && !skipIds[t.id]) candidates.push(t);
      }
      if (candidates.length === 0) continue;
      if (!byTime || candidates.length === 1) return candidates[0];
      var withTime = candidates.filter(function (c) { return !!c.time; });
      if (withTime.length > 0) {
        withTime.sort(function (a, b) { return a.time < b.time ? -1 : (a.time > b.time ? 1 : 0); });
        return withTime[0];
      }
      return candidates[0];
    }
    return null;
  }
  function renderNextBox() {
    var box = document.getElementById("adhd-next-box");
    box.innerHTML = '<div style="text-align:center; color:var(--muted); font-size:12px; padding:14px 0;">در حال خوندن کارهای امروز…</div>';
    var mbox = document.getElementById("adhd-mstep-box");
    if (mbox) { mbox.style.display = "none"; mbox.innerHTML = ""; }
    getDayData(function (day) {
      currentDayData = day;
      var task = pickNextTask(day);
      if (!task) {
        currentTaskId = null;
        box.innerHTML = '<div class="adhd-next-empty">فعلاً کاری برای امروز پیدا نکردم (یا همه رو زدی، آفرین 👏). یه کار جدید اضافه کن تا اینجا نشونت بدم.</div>';
        return;
      }
      currentTaskId = task.id;
      var metaBits = [];
      metaBits.push(QUAD_LABEL[task.quadrant] || "");
      if (task.time) metaBits.push("ساعت " + task.time);
      box.innerHTML =
        '<div class="adhd-next-task-text">' + task.text.replace(/</g, "&lt;") + '</div>' +
        '<div class="adhd-next-task-meta" style="color:' + (QUAD_COLOR[task.quadrant] || "var(--muted)") + '">' + metaBits.join(" · ") + '</div>' +
        (task.notes ? '<div style="font-size:11px; color:var(--muted); background:var(--bg2); border:1px solid var(--border); border-radius:8px; padding:8px; margin-bottom:10px; line-height:1.8;">' + task.notes.replace(/</g, "&lt;").replace(/\n/g, "<br>") + '</div>' : '') +
        '<div class="adhd-next-actions">' +
        '<button id="adhd-next-done">✅ تمومش کردم</button>' +
        '<button id="adhd-next-fullscreen">🎯 تمام‌صفحه</button>' +
        '<button id="adhd-next-break">🧩 بشکن</button>' +
        '<button id="adhd-next-skip">بعدی »</button>' +
        '</div>' +
        '<div class="adhd-next-notice" id="adhd-next-notice" style="display:none;"></div>';
      document.getElementById("adhd-next-done").addEventListener("click", markCurrentTaskDone);
      document.getElementById("adhd-next-fullscreen").addEventListener("click", function () { openFocusScreen(task.text); });
      document.getElementById("adhd-next-skip").addEventListener("click", function () { skipIds[task.id] = true; renderNextBox(); });
      document.getElementById("adhd-next-break").addEventListener("click", function () { toggleMstepBox(task); });
    });
  }

  // ---- micro-step checklist: breaks the current task into tiny, individually
  // checkable pieces (rather than a static text dump) so finishing each one
  // gives its own small visible win — helps task-initiation friction. ----
  function mstepKey(taskId) { return "adhdMsteps:" + taskId; }
  function loadMsteps(taskId) {
    try { var raw = localStorage.getItem(mstepKey(taskId)); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function saveMsteps(taskId, arr) {
    try { localStorage.setItem(mstepKey(taskId), JSON.stringify(arr)); } catch (e) {}
  }
  function genInitialSteps(task) {
    var lines = task.text.split(/\n|،|,/).map(function (s) { return s.trim(); }).filter(Boolean);
    var base = lines.length > 1 ? lines : GENERIC_STEPS.slice();
    return base.map(function (t) { return { id: "ms-" + Date.now() + Math.random().toString(36).slice(2, 6), text: t, done: false }; });
  }
  function toggleMstepBox(task) {
    var mbox = document.getElementById("adhd-mstep-box");
    if (!mbox) return;
    if (mbox.style.display !== "none" && mbox.getAttribute("data-task") === task.id) {
      mbox.style.display = "none";
      return;
    }
    mbox.setAttribute("data-task", task.id);
    mbox.style.display = "block";
    renderMstepBox(task);
  }
  function renderMstepBox(task) {
    var mbox = document.getElementById("adhd-mstep-box");
    if (!mbox) return;
    var steps = loadMsteps(task.id);
    if (!steps) { steps = genInitialSteps(task); saveMsteps(task.id, steps); }
    var doneCount = steps.filter(function (s) { return s.done; }).length;
    var pct = steps.length ? Math.round(doneCount / steps.length * 100) : 0;
    var html = '<div class="adhd-hint" style="margin-bottom:6px;">اینا رو به دلخواه ویرایش/حذف/اضافه کن؛ هر قدم رو که انجام دادی، تیکش بزن.</div>';
    html += '<div class="adhd-mstep-progress"><div class="adhd-mstep-progress-bar" style="width:' + pct + '%;"></div></div>';
    html += '<div style="font-size:10.5px; color:var(--muted); margin-bottom:8px;">' + toFa(doneCount) + ' از ' + toFa(steps.length) + '</div>';
    steps.forEach(function (s) {
      html += '<div class="adhd-mstep-row' + (s.done ? " done" : "") + '" data-sid="' + s.id + '">' +
        '<button type="button" class="adhd-mstep-check" data-mcheck="' + s.id + '">' + (s.done ? "✔" : "") + '</button>' +
        '<input type="text" class="adhd-mstep-text" value="' + s.text.replace(/"/g, "&quot;") + '" data-medit="' + s.id + '">' +
        '<button type="button" class="adhd-mstep-del" data-mdel="' + s.id + '">✕</button>' +
        '</div>';
    });
    html += '<div class="adhd-mstep-addrow"><input type="text" id="adhd-mstep-new" placeholder="+ قدم جدید..."><button type="button" id="adhd-mstep-addbtn">+</button></div>';
    if (steps.length > 0 && doneCount === steps.length) {
      html += '<button type="button" id="adhd-mstep-finish" style="width:100%; margin-top:10px; background:#8C7CF8; border:none; border-radius:10px; padding:10px; color:#fff; font-weight:700; cursor:pointer; font-size:12.5px;">🎉 همه‌ی قدم‌ها انجام شد — کل کار رو تیک بزنم</button>';
    }
    mbox.innerHTML = html;
    mbox.querySelectorAll("[data-mcheck]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-mcheck");
        var arr = loadMsteps(task.id) || [];
        arr = arr.map(function (s) { return s.id === id ? Object.assign({}, s, { done: !s.done }) : s; });
        saveMsteps(task.id, arr);
        renderMstepBox(task);
      });
    });
    mbox.querySelectorAll("[data-medit]").forEach(function (inp) {
      inp.addEventListener("change", function () {
        var id = inp.getAttribute("data-medit");
        var arr = loadMsteps(task.id) || [];
        arr = arr.map(function (s) { return s.id === id ? Object.assign({}, s, { text: inp.value }) : s; });
        saveMsteps(task.id, arr);
      });
    });
    mbox.querySelectorAll("[data-mdel]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-mdel");
        var arr = (loadMsteps(task.id) || []).filter(function (s) { return s.id !== id; });
        saveMsteps(task.id, arr);
        renderMstepBox(task);
      });
    });
    var addBtn = document.getElementById("adhd-mstep-addbtn");
    var addInp = document.getElementById("adhd-mstep-new");
    function addStep() {
      var v = (addInp.value || "").trim();
      if (!v) return;
      var arr = loadMsteps(task.id) || [];
      arr.push({ id: "ms-" + Date.now() + Math.random().toString(36).slice(2, 6), text: v, done: false });
      saveMsteps(task.id, arr);
      renderMstepBox(task);
    }
    if (addBtn) addBtn.addEventListener("click", addStep);
    if (addInp) addInp.addEventListener("keydown", function (e) { if (e.key === "Enter") addStep(); });
    var finishBtn = document.getElementById("adhd-mstep-finish");
    if (finishBtn) finishBtn.addEventListener("click", function () {
      try { localStorage.removeItem(mstepKey(task.id)); } catch (e) {}
      markCurrentTaskDone();
    });
  }

  // ---- parking lot: quick capture for stray thoughts mid-focus, so chasing
  // them doesn't break the current task. Reviewed/cleared later, or sent
  // straight into today's task list. ----
  var LS_PARK = "adhdParkingLot";
  function loadPark() {
    try { var raw = localStorage.getItem(LS_PARK); return raw ? JSON.parse(raw) : []; } catch (e) { return []; }
  }
  function savePark(arr) { try { localStorage.setItem(LS_PARK, JSON.stringify(arr)); } catch (e) {} }
  function renderPark() {
    var list = document.getElementById("adhd-park-list");
    if (!list) return;
    var items = loadPark();
    if (items.length === 0) {
      list.innerHTML = '<div class="adhd-park-empty">فعلاً چیزی پارک نشده.</div>';
      return;
    }
    var html = "";
    items.forEach(function (it) {
      html += '<div class="adhd-park-item"><div class="adhd-park-item-text">' + it.text.replace(/</g, "&lt;") + '</div>' +
        '<div class="adhd-park-item-actions">' +
        '<button type="button" class="adhd-park-to-task" data-ptotask="' + it.id + '" title="افزودن به کارهای امروز">📅</button>' +
        '<button type="button" data-pdel="' + it.id + '" title="حذف">✕</button>' +
        '</div></div>';
    });
    html += '<button type="button" class="adhd-park-clear" id="adhd-park-clearall">پاک‌کردن همه</button>';
    list.innerHTML = html;
    list.querySelectorAll("[data-pdel]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        savePark(loadPark().filter(function (it) { return it.id !== btn.getAttribute("data-pdel"); }));
        renderPark();
      });
    });
    list.querySelectorAll("[data-ptotask]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-ptotask");
        var it = loadPark().filter(function (x) { return x.id === id; })[0];
        if (!it) return;
        addParkItemToToday(it.text, function () {
          savePark(loadPark().filter(function (x) { return x.id !== id; }));
          renderPark();
        });
      });
    });
    var clearBtn = document.getElementById("adhd-park-clearall");
    if (clearBtn) clearBtn.addEventListener("click", function () { savePark([]); renderPark(); });
  }
  function addParkItemToToday(text, doneCb) {
    if (!window.storage || !window.storage.get || !window.storage.set) { if (doneCb) doneCb(); return; }
    var key = "day-" + todayKey();
    window.storage.get(key).then(function (r) {
      var day = (r && r.value) ? JSON.parse(r.value) : { tasks: [] };
      if (!day.tasks) day.tasks = [];
      day.tasks.push({ id: "pk-" + Date.now() + Math.random().toString(36).slice(2, 7), quadrant: "in", text: text, time: "", location: "", remind: "none", preRemind: "none", notes: "", done: false });
      return window.storage.set(key, JSON.stringify(day));
    }).then(function () { if (doneCb) doneCb(); }).catch(function () { if (doneCb) doneCb(); });
  }
  var parkInput = document.getElementById("adhd-park-input");
  var parkAddBtn = document.getElementById("adhd-park-add");
  function addParkFromInput() {
    var v = (parkInput.value || "").trim();
    if (!v) return;
    var arr = loadPark();
    arr.unshift({ id: "pk-" + Date.now() + Math.random().toString(36).slice(2, 7), text: v, createdAt: new Date().toISOString() });
    savePark(arr);
    parkInput.value = "";
    renderPark();
  }
  if (parkAddBtn) parkAddBtn.addEventListener("click", addParkFromInput);
  if (parkInput) parkInput.addEventListener("keydown", function (e) { if (e.key === "Enter") addParkFromInput(); });
  renderPark();
  function writeDay(dayObj, thenCb) {
    if (!window.storage || !window.storage.set) return;
    window.storage.set(currentDayKey, JSON.stringify(dayObj)).then(function () {
      if (thenCb) thenCb();
    }).catch(function () {});
  }
  function markCurrentTaskDone() {
    if (!currentDayData || !currentTaskId) return;
    var day = currentDayData;
    day.tasks = day.tasks.map(function (t) { return t.id === currentTaskId ? Object.assign({}, t, { done: true }) : t; });
    notify("انجام شد ✅", "خوب پیش رفتی — دفعه‌ی بعد که برنامه رو باز کنی، این تیک خورده می‌مونه.");
    writeDay(day, function () {
      // reload so the real app UI (checkbox state, progress) reflects the change
      setTimeout(function () { window.location.reload(); }, 400);
    });
  }
  renderNextBox();
})();
