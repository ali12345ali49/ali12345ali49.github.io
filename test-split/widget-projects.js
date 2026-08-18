(function () {
  var STORAGE_KEY = "bjProjectsV1";
  var faDigits = ["۰","۱","۲","۳","۴","۵","۶","۷","۸","۹"];
  function faNum(n) { return String(n).split("").map(function (c) { return faDigits[c] !== undefined ? faDigits[c] : c; }).join(""); }
  function faDateLabel(dateStr) {
    if (!dateStr) return "";
    try {
      return new Date(dateStr + "T00:00:00").toLocaleDateString("fa-IR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    } catch (e) { return ""; }
  }
  function faDateShort(dateStr) {
    if (!dateStr) return "";
    try {
      return new Date(dateStr + "T00:00:00").toLocaleDateString("fa-IR", { day: "numeric", month: "long" });
    } catch (e) { return ""; }
  }
  function uid() { return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (Array.isArray(raw)) return raw;
    } catch (e) {}
    return [];
  }
  function save(list) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (e) {}
  }

  var projects = load();
  var view = "list";       // "list" | "detail"
  var currentId = null;
  var showDone = false;
  var expandedTasks = {};  // { taskId: true } — which ریزکارها have their details panel open (not persisted)

  function findProject(id) {
    for (var i = 0; i < projects.length; i++) { if (projects[i].id === id) return projects[i]; }
    return null;
  }

  function progressOf(p) {
    var total = p.tasks.length + p.milestones.length;
    if (total === 0) return 0;
    var done = p.tasks.filter(function (t) { return t.done; }).length + p.milestones.filter(function (m) { return m.done; }).length;
    return Math.round((done / total) * 100);
  }

  function daysUntil(dateStr) {
    if (!dateStr) return null;
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var d = new Date(dateStr + "T00:00:00");
    if (isNaN(d.getTime())) return null;
    return Math.round((d - today) / 86400000);
  }

  function deadlineChip(p) {
    if (p.status === "done") return { cls: "pjw-chip-done", text: "تکمیل‌شده ✓" };
    if (!p.deadline) return { cls: "pjw-chip-ok", text: "بدون موعد" };
    var d = daysUntil(p.deadline);
    if (d === null) return { cls: "pjw-chip-ok", text: "بدون موعد" };
    if (d < 0) return { cls: "pjw-chip-overdue", text: faNum(Math.abs(d)) + " روز از موعد گذشته" };
    if (d === 0) return { cls: "pjw-chip-soon", text: "امروز موعده" };
    if (d <= 7) return { cls: "pjw-chip-soon", text: faNum(d) + " روز مونده" };
    return { cls: "pjw-chip-ok", text: faNum(d) + " روز مونده" };
  }

  function statusLabel(s) {
    if (s === "done") return "تکمیل‌شده";
    if (s === "paused") return "متوقف‌شده";
    return "در حال انجام";
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function renderStats() {
    var active = projects.filter(function (p) { return p.status !== "done"; });
    var dueSoon = active.filter(function (p) {
      var d = daysUntil(p.deadline);
      return d !== null && d <= 7 && d >= 0;
    });
    var overdue = active.filter(function (p) {
      var d = daysUntil(p.deadline);
      return d !== null && d < 0;
    });
    return (
      '<div class="pjw-stats-row">' +
        '<div class="pjw-stat-card"><div class="pjw-stat-big">' + faNum(active.length) + '</div><div class="pjw-stat-sub">پروژه فعال</div></div>' +
        '<div class="pjw-stat-card"><div class="pjw-stat-big" style="color:#E9A23D">' + faNum(dueSoon.length) + '</div><div class="pjw-stat-sub">نزدیک به موعد</div></div>' +
        '<div class="pjw-stat-card"><div class="pjw-stat-big" style="color:#E1493C">' + faNum(overdue.length) + '</div><div class="pjw-stat-sub">عقب‌افتاده</div></div>' +
      '</div>'
    );
  }

  function sortedList() {
    var list = projects.filter(function (p) { return showDone ? p.status === "done" : p.status !== "done"; });
    list.sort(function (a, b) {
      if (!showDone) {
        var da = daysUntil(a.deadline), db = daysUntil(b.deadline);
        if (da === null && db === null) return b.createdAt - a.createdAt;
        if (da === null) return 1;
        if (db === null) return -1;
        return da - db;
      }
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    return list;
  }

  function renderListView() {
    var list = sortedList();
    var html = renderStats();
    html += '<div class="pjw-add-row">' +
      '<input type="text" id="pjw-new-title" placeholder="عنوان پروژه‌ی جدید…">' +
      '<button class="pjw-btn" id="pjw-add-btn">+ افزودن</button>' +
    '</div>';
    html += '<div class="pjw-tabs">' +
      '<button class="pjw-tab-btn' + (!showDone ? ' pjw-active' : '') + '" id="pjw-tab-active">فعال</button>' +
      '<button class="pjw-tab-btn' + (showDone ? ' pjw-active' : '') + '" id="pjw-tab-done">تکمیل‌شده</button>' +
    '</div>';

    if (list.length === 0) {
      html += '<div class="pjw-empty">' + (showDone ? "هنوز پروژه‌ی تکمیل‌شده‌ای نداری." : "هنوز پروژه‌ای اضافه نکردی — از بالا شروع کن.") + '</div>';
    } else {
      list.forEach(function (p) {
        var pct = progressOf(p);
        var chip = deadlineChip(p);
        html += '<div class="pjw-card pjw-status-' + p.status + '" data-id="' + p.id + '">' +
          '<div class="pjw-card-top">' +
            '<div class="pjw-card-title' + (p.status === "done" ? " pjw-done-title" : "") + '">' + escapeHtml(p.title) + '</div>' +
            '<div class="pjw-chip ' + chip.cls + '">' + chip.text + '</div>' +
          '</div>' +
          '<div class="pjw-bar-track"><div class="pjw-bar-fill" style="width:' + pct + '%"></div></div>' +
          '<div class="pjw-card-bottom"><span>' + statusLabel(p.status) + '</span><span>' + faNum(pct) + '٪ تکمیل</span></div>' +
        '</div>';
      });
    }
    return html;
  }

  function renderDetailView() {
    var p = findProject(currentId);
    if (!p) { view = "list"; return renderListView(); }
    var pct = progressOf(p);
    var chip = deadlineChip(p);

    var html = '<div class="pjw-detail-head">' +
      '<button class="pjw-back-btn" id="pjw-back-btn">›</button>' +
      '<input type="text" class="pjw-title-input" id="pjw-detail-title" value="' + escapeHtml(p.title) + '">' +
    '</div>';

    html += '<div class="pjw-progress-box">' +
      '<div class="pjw-progress-pct">' + faNum(pct) + '٪</div>' +
      '<div class="pjw-bar-track"><div class="pjw-bar-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="pjw-progress-label">' + chip.text + '</div>' +
    '</div>';

    html += '<div class="pjw-field-row">' +
      '<div class="pjw-field"><label>وضعیت</label><select id="pjw-detail-status">' +
        '<option value="active"' + (p.status === "active" ? " selected" : "") + '>در حال انجام</option>' +
        '<option value="paused"' + (p.status === "paused" ? " selected" : "") + '>متوقف‌شده</option>' +
        '<option value="done"' + (p.status === "done" ? " selected" : "") + '>تکمیل‌شده</option>' +
      '</select></div>' +
      '<div class="pjw-field"><label>موعد تحویل</label><input type="date" id="pjw-detail-deadline" value="' + (p.deadline || "") + '">' +
        '<div class="pjw-deadline-info" id="pjw-deadline-jalali">' + (p.deadline ? "📅 " + faDateLabel(p.deadline) : "") + '</div>' +
      '</div>' +
    '</div>';

    html += '<h3>📋 ریزکارها (تجزیه پروژه)</h3>';
    html += '<div class="pjw-add-row"><input type="text" id="pjw-task-input" placeholder="یه ریزکار بنویس…"><button class="pjw-btn" id="pjw-task-add">+</button></div>';
    if (p.tasks.length === 0) {
      html += '<div class="pjw-empty">پروژه رو به کارهای کوچیک‌تر بشکن تا پیشرفتش قابل‌سنجش بشه.</div>';
    } else {
      p.tasks.forEach(function (t) {
        var open = !!expandedTasks[t.id];
        html += '<div class="pjw-item pjw-task-card' + (t.done ? " pjw-item-done" : "") + '" data-tid="' + t.id + '">' +
          '<div class="pjw-task-row">' +
            '<input type="checkbox" class="pjw-item-check pjw-task-check" data-tid="' + t.id + '"' + (t.done ? " checked" : "") + '>' +
            '<div class="pjw-item-text">' + escapeHtml(t.text) +
              (t.time ? '<span class="pjw-task-time-chip">⏰ ' + faNum(t.time) + '</span>' : '') +
              (t.notes ? '<span class="pjw-task-notes-chip">📝</span>' : '') +
            '</div>' +
            '<button class="pjw-task-edit-btn' + (open ? " pjw-task-edit-open" : "") + '" data-tid="' + t.id + '" title="زمان و توضیحات">✎</button>' +
            '<button class="pjw-item-del pjw-task-del" data-tid="' + t.id + '">✕</button>' +
          '</div>' +
          (open ?
            '<div class="pjw-task-edit">' +
              '<div class="pjw-task-edit-row">' +
                '<label>⏰ زمان</label>' +
                '<input type="time" class="pjw-task-time-input" data-tid="' + t.id + '" value="' + (t.time || "") + '">' +
              '</div>' +
              '<textarea class="pjw-task-notes-input" data-tid="' + t.id + '" placeholder="توضیحات این ریزکار…">' + escapeHtml(t.notes || "") + '</textarea>' +
            '</div>'
          : '') +
        '</div>';
      });
    }

    html += '<h3>🚩 نقاط عطف (Milestones)</h3>';
    html += '<div class="pjw-mile-add">' +
      '<input type="text" id="pjw-mile-input" placeholder="عنوان نقطه عطف…">' +
      '<input type="date" id="pjw-mile-date">' +
      '<button class="pjw-btn" id="pjw-mile-add-btn">+</button>' +
    '</div>';
    if (p.milestones.length === 0) {
      html += '<div class="pjw-empty">نقاط عطف، لحظه‌های مهم تصمیم یا تحویل رو مشخص می‌کنن.</div>';
    } else {
      p.milestones.slice().sort(function (a, b) { return (a.date || "9999").localeCompare(b.date || "9999"); }).forEach(function (m) {
        html += '<div class="pjw-item' + (m.done ? " pjw-item-done" : "") + '" data-mid="' + m.id + '">' +
          '<input type="checkbox" class="pjw-item-check pjw-mile-check" data-mid="' + m.id + '"' + (m.done ? " checked" : "") + '>' +
          '<div class="pjw-item-text">' + escapeHtml(m.text) + '</div>' +
          (m.date ? '<div class="pjw-item-date">📅 ' + faDateShort(m.date) + '</div>' : '') +
          '<button class="pjw-item-del pjw-mile-del" data-mid="' + m.id + '">✕</button>' +
        '</div>';
      });
    }

    html += '<h3>⚠️ یادداشت‌ها و ریسک‌ها</h3>';
    html += '<textarea class="pjw-notes" id="pjw-detail-notes" placeholder="موانع، ریسک‌ها، تصمیم‌ها یا هر نکته‌ی مهم دیگه…">' + escapeHtml(p.notes || "") + '</textarea>';

    html += '<button class="pjw-danger-btn" id="pjw-delete-btn">🗑 حذف این پروژه</button>';
    return html;
  }

  function render() {
    var body = document.getElementById("pjw-body");
    body.innerHTML = view === "detail" ? renderDetailView() : renderListView();
    wireEvents();
  }

  function wireEvents() {
    if (view === "list") {
      var addBtn = document.getElementById("pjw-add-btn");
      var titleInput = document.getElementById("pjw-new-title");
      function addProject() {
        var title = (titleInput.value || "").trim();
        if (!title) return;
        var p = { id: uid(), title: title, deadline: "", status: "active", notes: "", tasks: [], milestones: [], createdAt: Date.now() };
        projects.push(p);
        save(projects);
        titleInput.value = "";
        currentId = p.id;
        view = "detail";
        render();
      }
      addBtn.addEventListener("click", addProject);
      titleInput.addEventListener("keydown", function (ev) { if (ev.key === "Enter") addProject(); });

      document.getElementById("pjw-tab-active").addEventListener("click", function () { showDone = false; render(); });
      document.getElementById("pjw-tab-done").addEventListener("click", function () { showDone = true; render(); });

      Array.prototype.forEach.call(document.querySelectorAll(".pjw-card"), function (card) {
        card.addEventListener("click", function () {
          currentId = card.getAttribute("data-id");
          expandedTasks = {};
          view = "detail";
          render();
        });
      });
    } else {
      document.getElementById("pjw-back-btn").addEventListener("click", function () { expandedTasks = {}; view = "list"; render(); });

      var p = findProject(currentId);
      if (!p) return;

      document.getElementById("pjw-detail-title").addEventListener("change", function (ev) {
        p.title = ev.target.value.trim() || p.title; save(projects);
      });
      document.getElementById("pjw-detail-status").addEventListener("change", function (ev) {
        p.status = ev.target.value; save(projects); render();
      });
      document.getElementById("pjw-detail-deadline").addEventListener("change", function (ev) {
        p.deadline = ev.target.value; save(projects); render();
      });
      document.getElementById("pjw-detail-notes").addEventListener("change", function (ev) {
        p.notes = ev.target.value; save(projects);
      });

      var taskInput = document.getElementById("pjw-task-input");
      function addTask() {
        var text = (taskInput.value || "").trim();
        if (!text) return;
        p.tasks.push({ id: uid(), text: text, done: false, time: "", notes: "" });
        save(projects); taskInput.value = ""; render();
      }
      document.getElementById("pjw-task-add").addEventListener("click", addTask);
      taskInput.addEventListener("keydown", function (ev) { if (ev.key === "Enter") addTask(); });

      Array.prototype.forEach.call(document.querySelectorAll(".pjw-task-check"), function (cb) {
        cb.addEventListener("change", function () {
          var t = p.tasks.filter(function (x) { return x.id === cb.getAttribute("data-tid"); })[0];
          if (t) { t.done = cb.checked; save(projects); render(); }
        });
      });
      Array.prototype.forEach.call(document.querySelectorAll(".pjw-task-edit-btn"), function (btn) {
        btn.addEventListener("click", function () {
          var tid = btn.getAttribute("data-tid");
          expandedTasks[tid] = !expandedTasks[tid];
          render();
        });
      });
      Array.prototype.forEach.call(document.querySelectorAll(".pjw-task-time-input"), function (inp) {
        inp.addEventListener("change", function () {
          var t = p.tasks.filter(function (x) { return x.id === inp.getAttribute("data-tid"); })[0];
          if (t) { t.time = inp.value; save(projects); render(); }
        });
      });
      Array.prototype.forEach.call(document.querySelectorAll(".pjw-task-notes-input"), function (ta) {
        ta.addEventListener("change", function () {
          var t = p.tasks.filter(function (x) { return x.id === ta.getAttribute("data-tid"); })[0];
          if (t) { t.notes = ta.value; save(projects); }
        });
      });
      Array.prototype.forEach.call(document.querySelectorAll(".pjw-task-del"), function (btn) {
        btn.addEventListener("click", function () {
          var tid = btn.getAttribute("data-tid");
          p.tasks = p.tasks.filter(function (x) { return x.id !== tid; });
          delete expandedTasks[tid];
          save(projects); render();
        });
      });

      var mileInput = document.getElementById("pjw-mile-input");
      var mileDate = document.getElementById("pjw-mile-date");
      function addMilestone() {
        var text = (mileInput.value || "").trim();
        if (!text) return;
        p.milestones.push({ id: uid(), text: text, date: mileDate.value || "", done: false });
        save(projects); mileInput.value = ""; mileDate.value = ""; render();
      }
      document.getElementById("pjw-mile-add-btn").addEventListener("click", addMilestone);
      mileInput.addEventListener("keydown", function (ev) { if (ev.key === "Enter") addMilestone(); });

      Array.prototype.forEach.call(document.querySelectorAll(".pjw-mile-check"), function (cb) {
        cb.addEventListener("change", function () {
          var m = p.milestones.filter(function (x) { return x.id === cb.getAttribute("data-mid"); })[0];
          if (m) { m.done = cb.checked; save(projects); render(); }
        });
      });
      Array.prototype.forEach.call(document.querySelectorAll(".pjw-mile-del"), function (btn) {
        btn.addEventListener("click", function () {
          var mid = btn.getAttribute("data-mid");
          p.milestones = p.milestones.filter(function (x) { return x.id !== mid; });
          save(projects); render();
        });
      });

      document.getElementById("pjw-delete-btn").addEventListener("click", function () {
        window.bjConfirm("این پروژه و تمام ریزکارها و نقاط عطفش حذف بشه؟", function () {
          projects = projects.filter(function (x) { return x.id !== p.id; });
          save(projects);
          view = "list";
          render();
        });
      });
    }
  }

  var fab = document.getElementById("pjw-fab");
  var overlay = document.getElementById("pjw-overlay");
  var panel = document.getElementById("pjw-panel");
  var closeBtn = document.getElementById("pjw-close");
  function openPanel() {
    projects = load();
    view = "list";
    render();
    overlay.style.display = "block"; panel.style.display = "block";
  }
  function closePanel() {
    overlay.style.display = "none"; panel.style.display = "none";
  }
  fab.addEventListener("click", openPanel);
  overlay.addEventListener("click", closePanel);
  closeBtn.addEventListener("click", closePanel);
})();
