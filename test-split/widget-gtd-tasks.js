(function () {
  var QUAD_ORDER = ["iu", "un", "in", "nn"];
  var QUAD_LABEL = {
    iu: "مهم و ضروری",
    un: "ضروری، غیرمهم",
    in: "مهم، غیرضروری",
    nn: "غیرمهم و غیرضروری"
  };

  var inbox = [];
  var currentDate = new Date();
  var dayTasks = [];
  var convOpen = {}; // itemId -> "goal" | "habit" | null (which convert form is open)
  var convHabitType = {}; // itemId -> "circle" | "linear"

  function pad2(n) { return n < 10 ? "0" + n : "" + n; }
  function dateKey(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function keyToDate(k) { var p = k.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function genId() { return "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function faDateLabel(d) {
    try { return d.toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric", weekday: "long" }); }
    catch (e) { return ""; }
  }

  // ---- Jalali (Shamsi) calendar helpers, for the day-schedule Jalali date navigator ----
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
    var y0 = jaFirstOfYear(jy), y1 = jaFirstOfYear(jy + 1), total = Math.round((y1 - y0) / 86400000);
    return total - 336;
  }
  function jaFirstOfMonth(jy, jm) {
    if (jm === 1) return jaFirstOfYear(jy);
    var d = jaFirstOfYear(jy);
    for (var k = 1; k < jm; k++) { d = new Date(d); d.setDate(d.getDate() + jaMonthLen(jy, k)); }
    return d;
  }
  function jToGregorian(jy, jm, jd) {
    var dd = new Date(jaFirstOfMonth(jy, jm));
    dd.setDate(dd.getDate() + (jd - 1));
    return dd;
  }

  function saveInbox() { return window.storage.set("gtd:inbox", inbox); }
  function loadInbox() {
    return window.storage.get("gtd:inbox").then(function (r) {
      return r.value || [];
    }).catch(function () { return []; });
  }

  function genMetaId() { return Date.now() + "-" + Math.random().toString(36).slice(2, 8); }
  function loadMeta() {
    return window.storage.get("bj-meta").then(function (r) {
      try {
        var parsed = JSON.parse(r.value);
        return {
          habits: (parsed && parsed.habits) || [],
          goals: (parsed && parsed.goals) || [],
          quadTargets: (parsed && parsed.quadTargets) || {}
        };
      } catch (e) { return { habits: [], goals: [], quadTargets: {} }; }
    }).catch(function () { return { habits: [], goals: [], quadTargets: {} }; });
  }
  function saveMeta(meta) { return window.storage.set("bj-meta", JSON.stringify(meta)); }

  function dayStoreKey(key) { return "gtd:day:" + key; }
  function saveDay() { return window.storage.set(dayStoreKey(dateKey(currentDate)), dayTasks); }
  function loadDay(key) {
    return window.storage.get(dayStoreKey(key)).then(function (r) {
      return r.value || [];
    }).catch(function () { return []; });
  }

  function renderInbox() {
    var list = document.getElementById("gtw-inbox-list");
    list.innerHTML = "";
    if (!inbox.length) {
      list.innerHTML = '<div class="gtw-empty">فعلاً کاری ثبت نشده</div>';
      return;
    }
    inbox.forEach(function (item) {
      var box = document.createElement("div");
      box.className = "gtw-inbox-item";
      box.setAttribute("data-item", item.id);

      var quadBtns = QUAD_ORDER.map(function (q) {
        var sel = item.quadrant === q ? " gtw-quad-sel" : "";
        return '<button class="gtw-quad-btn gtw-quad-' + q + sel + '" data-quad="' + q + '" data-item="' + item.id + '">' + QUAD_LABEL[q] + '</button>';
      }).join("");

      var transferShow = item.quadrant ? " gtw-show" : "";

      var goalFormShow = convOpen[item.id] === "goal" ? " gtw-conv-form-show" : "";
      var habitFormShow = convOpen[item.id] === "habit" ? " gtw-conv-form-show" : "";
      var hType = convHabitType[item.id] || "circle";
      var circleSel = hType === "circle" ? " gtw-htype-sel" : "";
      var linearSel = hType === "linear" ? " gtw-htype-sel" : "";

      box.innerHTML =
        '<div class="gtw-inbox-text"><span>' + item.text.replace(/</g, "&lt;") + '</span>' +
        '<button class="gtw-inbox-del" data-del="' + item.id + '">✕</button></div>' +
        '<div class="gtw-quad-grid">' + quadBtns + '</div>' +
        '<div class="gtw-transfer-row' + transferShow + '" data-transfer="' + item.id + '">' +
        '<input type="date" data-date-for="' + item.id + '" value="' + dateKey(new Date()) + '" />' +
        '<button class="gtw-btn" data-send="' + item.id + '">انتقال به روز</button>' +
        '</div>' +
        '<div class="gtw-send-target-row' + transferShow + '" data-target-row="' + item.id + '">' +
        '<label class="gtw-target-lbl"><input type="checkbox" class="gtw-target-cb" data-target-widget="' + item.id + '" checked /> نمایش در آیکون</label>' +
        '<label class="gtw-target-lbl"><input type="checkbox" class="gtw-target-cb" data-target-today="' + item.id + '" checked /> نمایش در صفحه امروز</label>' +
        '</div>' +
        '<div class="gtw-jalali-label" style="margin:4px 0 0;text-align:right;" data-jalali-for="' + item.id + '">' + faDateLabel(new Date()) + '</div>' +
        '<div class="gtw-conv-row">' +
        '<button class="gtw-conv-btn gtw-conv-goal-btn' + (convOpen[item.id] === "goal" ? " gtw-conv-open" : "") + '" data-conv-goal="' + item.id + '">🎯 تبدیل به هدف</button>' +
        '<button class="gtw-conv-btn gtw-conv-habit-btn' + (convOpen[item.id] === "habit" ? " gtw-conv-open" : "") + '" data-conv-habit="' + item.id + '">🔁 تبدیل به عادت</button>' +
        '</div>' +
        '<div class="gtw-conv-form' + goalFormShow + '" data-conv-form-goal="' + item.id + '">' +
        '<input type="text" class="gtw-conv-input" data-goal-daily="' + item.id + '" placeholder="نیاز روزانه (اختیاری)" />' +
        '<input type="text" class="gtw-conv-input" data-goal-monthly="' + item.id + '" placeholder="نیاز ماهانه (اختیاری)" />' +
        '<input type="number" class="gtw-conv-input" data-goal-target="' + item.id + '" placeholder="مقدار کل هدف (اختیاری)" />' +
        '<div class="gtw-conv-actions">' +
        '<button class="gtw-btn" data-goal-confirm="' + item.id + '">ساخت هدف</button>' +
        '<button class="gtw-conv-cancel" data-goal-cancel="' + item.id + '">انصراف</button>' +
        '</div></div>' +
        '<div class="gtw-conv-form' + habitFormShow + '" data-conv-form-habit="' + item.id + '">' +
        '<input type="text" class="gtw-conv-input" data-habit-desc="' + item.id + '" placeholder="توضیح (اختیاری)" />' +
        '<div class="gtw-habit-type-row">' +
        '<button type="button" class="gtw-habit-type-btn' + circleSel + '" data-habit-type="circle" data-item="' + item.id + '">دایره‌ای</button>' +
        '<button type="button" class="gtw-habit-type-btn' + linearSel + '" data-habit-type="linear" data-item="' + item.id + '">عادت ساده</button>' +
        '</div>' +
        '<div class="gtw-conv-actions">' +
        '<button class="gtw-btn" data-habit-confirm="' + item.id + '">ساخت عادت</button>' +
        '<button class="gtw-conv-cancel" data-habit-cancel="' + item.id + '">انصراف</button>' +
        '</div></div>';
      list.appendChild(box);
    });
  }

  function renderSchedGroups() {
    var wrap = document.getElementById("gtw-sched-groups");
    wrap.innerHTML = "";
    QUAD_ORDER.forEach(function (q) {
      var items = dayTasks.filter(function (t) { return t.quadrant === q; });
      var sec = document.createElement("div");
      sec.className = "gtw-quad-section gtw-qs-" + q;
      var body = "";
      if (!items.length) {
        body = '<div class="gtw-empty">کاری در این دسته نیست</div>';
      } else {
        body = items.map(function (t) {
          return '<div class="gtw-day-item' + (t.done ? " gtw-done" : "") + '">' +
            '<input type="checkbox" class="gtw-day-check" data-check="' + t.id + '" ' + (t.done ? "checked" : "") + ' />' +
            '<span class="gtw-day-text">' + t.text.replace(/</g, "&lt;") + '</span>' +
            '<button class="gtw-day-del" data-daydel="' + t.id + '">✕</button>' +
            '</div>';
        }).join("");
      }
      sec.innerHTML = '<div class="gtw-quad-section-title">' + QUAD_LABEL[q] + '</div>' + body;
      wrap.appendChild(sec);
    });
  }

  function loadInboxAndRender() {
    loadInbox().then(function (v) { inbox = v; renderInbox(); });
  }
  function syncJalaliSelects() {
    var p = jaParts(currentDate);
    var jySel = document.getElementById("gtw-jy-select");
    var jmSel = document.getElementById("gtw-jm-select");
    var jdSel = document.getElementById("gtw-jd-select");
    if (!jySel || !jmSel || !jdSel) return;

    if (!jySel.options.length) {
      for (var y = p.jy - 4; y <= p.jy + 4; y++) {
        var yo = document.createElement("option"); yo.value = y; yo.textContent = jaNum(y); jySel.appendChild(yo);
      }
    }
    jySel.value = p.jy;

    if (!jmSel.options.length) {
      jaMonthNames.forEach(function (name, idx) {
        var mo = document.createElement("option"); mo.value = idx + 1; mo.textContent = name; jmSel.appendChild(mo);
      });
    }
    jmSel.value = p.jm;

    var dayCount = jaMonthLen(p.jy, p.jm);
    var rebuildDays = jdSel.getAttribute("data-days") != String(dayCount);
    if (rebuildDays) {
      jdSel.innerHTML = "";
      for (var d = 1; d <= dayCount; d++) {
        var doo = document.createElement("option"); doo.value = d; doo.textContent = jaNum(d); jdSel.appendChild(doo);
      }
      jdSel.setAttribute("data-days", dayCount);
    }
    jdSel.value = p.jd;
  }

  function loadSchedAndRender() {
    document.getElementById("gtw-sched-date").value = dateKey(currentDate);
    document.getElementById("gtw-jalali-label").textContent = faDateLabel(currentDate);
    syncJalaliSelects();
    loadDay(dateKey(currentDate)).then(function (v) { dayTasks = v; renderSchedGroups(); });
  }

  function onJalaliSelectChange() {
    var jySel = document.getElementById("gtw-jy-select");
    var jmSel = document.getElementById("gtw-jm-select");
    var jdSel = document.getElementById("gtw-jd-select");
    if (!jySel.value || !jmSel.value || !jdSel.value) return;
    currentDate = jToGregorian(Number(jySel.value), Number(jmSel.value), Number(jdSel.value));
    loadSchedAndRender();
  }

  var fab = document.getElementById("gtw-fab");
  var overlay = document.getElementById("gtw-overlay");
  var panel = document.getElementById("gtw-panel");
  var closeBtn = document.getElementById("gtw-close");

  function openPanel() {
    overlay.style.display = "block"; panel.style.display = "block";
    loadInboxAndRender(); loadSchedAndRender();
  }
  function closePanel() { overlay.style.display = "none"; panel.style.display = "none"; }
  fab.addEventListener("click", openPanel);
  overlay.addEventListener("click", closePanel);
  closeBtn.addEventListener("click", closePanel);

  var tabInbox = document.getElementById("gtw-tab-inbox");
  var tabSched = document.getElementById("gtw-tab-sched");
  var viewInbox = document.getElementById("gtw-view-inbox");
  var viewSched = document.getElementById("gtw-view-sched");
  tabInbox.addEventListener("click", function () {
    tabInbox.classList.add("gtw-active"); tabSched.classList.remove("gtw-active");
    viewInbox.style.display = ""; viewSched.style.display = "none";
  });
  tabSched.addEventListener("click", function () {
    tabSched.classList.add("gtw-active"); tabInbox.classList.remove("gtw-active");
    viewSched.style.display = ""; viewInbox.style.display = "none";
    loadSchedAndRender();
  });

  document.getElementById("gtw-new-add").addEventListener("click", function () {
    var input = document.getElementById("gtw-new-input");
    var val = input.value.trim();
    if (!val) return;
    inbox.push({ id: genId(), text: val, quadrant: null, createdAt: Date.now() });
    input.value = "";
    saveInbox(); renderInbox();
  });
  document.getElementById("gtw-new-input").addEventListener("keydown", function (e) {
    if (e.key === "Enter") document.getElementById("gtw-new-add").click();
  });

  document.getElementById("gtw-inbox-list").addEventListener("change", function (e) {
    var forId = e.target.getAttribute("data-date-for");
    if (!forId || !e.target.value) return;
    var lbl = document.querySelector('[data-jalali-for="' + forId + '"]');
    if (lbl) lbl.textContent = faDateLabel(new Date(e.target.value + "T00:00:00"));
  });

  document.getElementById("gtw-inbox-list").addEventListener("click", function (e) {
    var quad = e.target.getAttribute("data-quad");
    var delId = e.target.getAttribute("data-del");
    var sendId = e.target.getAttribute("data-send");
    var convGoalId = e.target.getAttribute("data-conv-goal");
    var convHabitId = e.target.getAttribute("data-conv-habit");
    var goalCancelId = e.target.getAttribute("data-goal-cancel");
    var habitCancelId = e.target.getAttribute("data-habit-cancel");
    var habitTypeVal = e.target.getAttribute("data-habit-type");
    var goalConfirmId = e.target.getAttribute("data-goal-confirm");
    var habitConfirmId = e.target.getAttribute("data-habit-confirm");

    if (convGoalId) {
      convOpen[convGoalId] = convOpen[convGoalId] === "goal" ? null : "goal";
      renderInbox();
      return;
    }
    if (convHabitId) {
      convOpen[convHabitId] = convOpen[convHabitId] === "habit" ? null : "habit";
      renderInbox();
      return;
    }
    if (goalCancelId) { convOpen[goalCancelId] = null; renderInbox(); return; }
    if (habitCancelId) { convOpen[habitCancelId] = null; renderInbox(); return; }
    if (habitTypeVal) {
      var htItem = e.target.getAttribute("data-item");
      convHabitType[htItem] = habitTypeVal;
      renderInbox();
      return;
    }
    if (goalConfirmId) {
      var gItem = inbox.filter(function (it) { return it.id === goalConfirmId; })[0];
      if (!gItem) return;
      var dailyEl = document.querySelector('[data-goal-daily="' + goalConfirmId + '"]');
      var monthlyEl = document.querySelector('[data-goal-monthly="' + goalConfirmId + '"]');
      var targetEl = document.querySelector('[data-goal-target="' + goalConfirmId + '"]');
      var gDaily = dailyEl && dailyEl.value ? dailyEl.value.trim() : "";
      var gMonthly = monthlyEl && monthlyEl.value ? monthlyEl.value.trim() : "";
      var gTargetRaw = targetEl && targetEl.value ? targetEl.value : "";
      loadMeta().then(function (meta) {
        meta.goals.push({
          id: genMetaId(),
          title: gItem.text,
          quadrant: gItem.quadrant || "iu",
          dailyNeed: gDaily,
          monthlyNeed: gMonthly,
          done: false,
          target: gTargetRaw ? Number(gTargetRaw) : null,
          progress: 0,
          subGoals: [],
          subGoalsEnabled: false,
          progressEnabled: false
        });
        return saveMeta(meta);
      }).then(function () {
        inbox = inbox.filter(function (it) { return it.id !== goalConfirmId; });
        delete convOpen[goalConfirmId];
        saveInbox(); renderInbox();
      });
      return;
    }
    if (habitConfirmId) {
      var hItem = inbox.filter(function (it) { return it.id === habitConfirmId; })[0];
      if (!hItem) return;
      var descEl = document.querySelector('[data-habit-desc="' + habitConfirmId + '"]');
      var hDesc = descEl && descEl.value ? descEl.value.trim() : "";
      var hType = convHabitType[habitConfirmId] || "circle";
      loadMeta().then(function (meta) {
        meta.habits.push({
          id: genMetaId(),
          name: hItem.text,
          description: hDesc,
          trackerType: hType,
          tiers: [],
          weekDays: null
        });
        return saveMeta(meta);
      }).then(function () {
        inbox = inbox.filter(function (it) { return it.id !== habitConfirmId; });
        delete convOpen[habitConfirmId];
        saveInbox(); renderInbox();
      });
      return;
    }

    if (quad) {
      var itemId = e.target.getAttribute("data-item");
      inbox = inbox.map(function (it) {
        if (it.id === itemId) it.quadrant = (it.quadrant === quad ? null : quad);
        return it;
      });
      saveInbox(); renderInbox();
      return;
    }
    if (delId) {
      inbox = inbox.filter(function (it) { return it.id !== delId; });
      saveInbox(); renderInbox();
      return;
    }
    if (sendId) {
      var item = inbox.filter(function (it) { return it.id === sendId; })[0];
      if (!item || !item.quadrant) return;
      var dateInput = document.querySelector('[data-date-for="' + sendId + '"]');
      var targetKey = dateInput && dateInput.value ? dateInput.value : dateKey(new Date());
      var widgetCb = document.querySelector('[data-target-widget="' + sendId + '"]');
      var todayCb = document.querySelector('[data-target-today="' + sendId + '"]');
      var toWidget = !widgetCb || widgetCb.checked;
      var toToday = !!(todayCb && todayCb.checked);
      if (!toWidget && !toToday) { window.alert("حداقل یکی از دو گزینه (آیکون یا صفحه امروز) رو انتخاب کن."); return; }

      var ops = [];
      if (toWidget) {
        ops.push(loadDay(targetKey).then(function (tasks) {
          tasks.push({ id: genId(), text: item.text, quadrant: item.quadrant, done: false });
          return window.storage.set(dayStoreKey(targetKey), tasks);
        }));
      }
      if (toToday) {
        // Writes into the main app's own day storage ("day-<key>", JSON-encoded)
        // so the task also shows up on the app's "امروز" (Today) page, not just this widget.
        ops.push(
          window.storage.get("day-" + targetKey).then(function (r) {
            try { return JSON.parse(r.value); } catch (e) { return null; }
          }).catch(function () { return null; }).then(function (dayObj) {
            if (!dayObj || typeof dayObj !== "object") dayObj = { tasks: [], habitLogs: {}, journal: "", images: [], voiceNotes: [] };
            if (!Array.isArray(dayObj.tasks)) dayObj.tasks = [];
            dayObj.tasks.push({
              id: genId(), quadrant: item.quadrant, text: item.text, done: false,
              time: "", location: "", remind: "none", preRemind: "none", notes: "",
              notified: false, preNotified: false
            });
            return window.storage.set("day-" + targetKey, JSON.stringify(dayObj));
          })
        );
      }

      Promise.all(ops).then(function () {
        inbox = inbox.filter(function (it) { return it.id !== sendId; });
        saveInbox().then(function () {
          if (toToday) {
            // The main app's React state only loads from storage on mount, so a
            // reload is needed for the new task to actually appear on the Today page.
            window.location.reload();
            return;
          }
          renderInbox();
          if (targetKey === dateKey(currentDate)) loadSchedAndRender();
        });
      });
    }
  });

  document.getElementById("gtw-sched-groups").addEventListener("click", function (e) {
    var checkId = e.target.getAttribute("data-check");
    var delId = e.target.getAttribute("data-daydel");
    if (checkId) {
      dayTasks = dayTasks.map(function (t) {
        if (t.id === checkId) t.done = !t.done;
        return t;
      });
      saveDay(); renderSchedGroups();
      return;
    }
    if (delId) {
      dayTasks = dayTasks.filter(function (t) { return t.id !== delId; });
      saveDay(); renderSchedGroups();
    }
  });

  document.getElementById("gtw-sched-prev").addEventListener("click", function () {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 1);
    loadSchedAndRender();
  });
  document.getElementById("gtw-sched-next").addEventListener("click", function () {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1);
    loadSchedAndRender();
  });
  document.getElementById("gtw-sched-today").addEventListener("click", function () {
    var todayKey = dateKey(new Date());
    closePanel();
    if (window.bjGoToDay) { window.bjGoToDay(todayKey); }
    else { currentDate = new Date(); loadSchedAndRender(); }
  });
  document.getElementById("gtw-sched-date").addEventListener("change", function (e) {
    if (e.target.value) { currentDate = keyToDate(e.target.value); loadSchedAndRender(); }
  });
  document.getElementById("gtw-jy-select").addEventListener("change", onJalaliSelectChange);
  document.getElementById("gtw-jm-select").addEventListener("change", onJalaliSelectChange);
  document.getElementById("gtw-jd-select").addEventListener("change", onJalaliSelectChange);
})();
