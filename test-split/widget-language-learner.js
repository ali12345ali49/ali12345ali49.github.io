(function () {
  var STORAGE_KEY = "lang-words";
  var INTERVALS_KEY = "lang-intervals";
  var CONFIRM_DELETE_KEY = "lang-confirm-delete-words";
  var DIRECTION_KEY = "lang-direction";
  var ALLMODE_KEY = "lang-allmode";
  var NOTES_KEY = "lang-notes";
  var DRILLS_KEY = "lang-drills";
  var FREENOTE_KEY = "lang-freenote";
  var DEFAULT_INTERVALS = [1, 3, 7, 16, 30]; // منحنی فراموشی، هماهنگ با بخش برنامه‌ریزی دروس
  var INTERVALS = DEFAULT_INTERVALS.slice();
  var confirmDeleteWords = true;
  var reviewDirection = "random"; // "e2f" | "f2e" | "random"
  var allMeaningsMode = false; // اگه فعال باشه، تو هر سه حالت بالا باید همه‌ی جواب‌های درست نوشته بشن
  var overlay = document.getElementById("lang-overlay");
  var panel = document.getElementById("lang-panel");
  var fab = document.getElementById("lang-fab");
  var words = [];
  var notes = [];
  var drills = []; // تمرین‌های نوشتاری روزانه: { id, text, target, log: { "YYYY-MM-DD": count } }
  var freenoteText = "";
  var freenoteSaveTimer = null;
  var currentDrillSession = null;
  var reviewQueue = [];
  var currentReview = null;

  // ---- toggle نمایش متن توضیح روش کار با زدن روی چراغ (آیکون info) ----
  var infoBtn = document.getElementById("lang-info-btn");
  var subText = document.getElementById("lang-sub-text");
  if (infoBtn && subText) {
    infoBtn.addEventListener("click", function () {
      var isOpen = subText.style.display !== "none";
      subText.style.display = isOpen ? "none" : "block";
    });
  }

  function toFa(n) { return String(n).replace(/[0-9]/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹"[d]; }); }
  function todayStr() {
    var d = new Date();
    function p(n) { return n < 10 ? "0" + n : "" + n; }
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }
  function addDays(dateStr, days) {
    var d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() + days);
    function p(n) { return n < 10 ? "0" + n : "" + n; }
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }
  function uid() { return Date.now() + "-" + Math.random().toString(36).slice(2, 8); }

  // ---------- Jalali (Persian) calendar helpers, based on Intl's persian calendar ----------
  function pad2(n) { return n < 10 ? "0" + n : "" + n; }
  function isoFromDate(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
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

  function loadWords(cb) {
    if (!window.storage || !window.storage.get) { cb([]); return; }
    window.storage.get(STORAGE_KEY, false).then(function (r) {
      cb(r && r.value ? JSON.parse(r.value) : []);
    }).catch(function () { cb([]); });
  }
  function saveWords(cb) {
    if (!window.storage || !window.storage.set) { if (cb) cb(); return; }
    window.storage.set(STORAGE_KEY, JSON.stringify(words), false).then(function () { if (cb) cb(); }).catch(function () {});
  }
  function loadNotes(cb) {
    if (!window.storage || !window.storage.get) { cb([]); return; }
    window.storage.get(NOTES_KEY, false).then(function (r) {
      cb(r && r.value ? JSON.parse(r.value) : []);
    }).catch(function () { cb([]); });
  }
  function saveNotes(cb) {
    if (!window.storage || !window.storage.set) { if (cb) cb(); return; }
    window.storage.set(NOTES_KEY, JSON.stringify(notes), false).then(function () { if (cb) cb(); }).catch(function () {});
  }
  function loadDrills(cb) {
    if (!window.storage || !window.storage.get) { cb([]); return; }
    window.storage.get(DRILLS_KEY, false).then(function (r) {
      cb(r && r.value ? JSON.parse(r.value) : []);
    }).catch(function () { cb([]); });
  }
  function saveDrills(cb) {
    if (!window.storage || !window.storage.set) { if (cb) cb(); return; }
    window.storage.set(DRILLS_KEY, JSON.stringify(drills), false).then(function () { if (cb) cb(); }).catch(function () {});
  }
  function loadFreenote(cb) {
    if (!window.storage || !window.storage.get) { cb(""); return; }
    window.storage.get(FREENOTE_KEY, false).then(function (r) {
      cb(r && r.value != null ? r.value : "");
    }).catch(function () { cb(""); });
  }
  function saveFreenote(cb) {
    if (!window.storage || !window.storage.set) { if (cb) cb(); return; }
    window.storage.set(FREENOTE_KEY, freenoteText, false).then(function () { if (cb) cb(); }).catch(function () {});
  }
  function loadIntervals(cb) {
    if (!window.storage || !window.storage.get) { cb(DEFAULT_INTERVALS.slice()); return; }
    window.storage.get(INTERVALS_KEY, false).then(function (r) {
      var v = r && r.value ? JSON.parse(r.value) : null;
      cb((v && v.length) ? v : DEFAULT_INTERVALS.slice());
    }).catch(function () { cb(DEFAULT_INTERVALS.slice()); });
  }
  function saveIntervals(cb) {
    if (!window.storage || !window.storage.set) { if (cb) cb(); return; }
    window.storage.set(INTERVALS_KEY, JSON.stringify(INTERVALS), false).then(function () { if (cb) cb(); }).catch(function () {});
  }
  function loadConfirmDelete(cb) {
    if (!window.storage || !window.storage.get) { cb(true); return; }
    window.storage.get(CONFIRM_DELETE_KEY, false).then(function (r) {
      cb(r && r.value != null ? r.value === "1" : true);
    }).catch(function () { cb(true); });
  }
  function saveConfirmDelete(cb) {
    if (!window.storage || !window.storage.set) { if (cb) cb(); return; }
    window.storage.set(CONFIRM_DELETE_KEY, confirmDeleteWords ? "1" : "0", false).then(function () { if (cb) cb(); }).catch(function () {});
  }
  function loadDirection(cb) {
    if (!window.storage || !window.storage.get) { cb("random"); return; }
    window.storage.get(DIRECTION_KEY, false).then(function (r) {
      var v = r && r.value;
      cb((v === "e2f" || v === "f2e" || v === "random") ? v : "random");
    }).catch(function () { cb("random"); });
  }
  function saveDirection(cb) {
    if (!window.storage || !window.storage.set) { if (cb) cb(); return; }
    window.storage.set(DIRECTION_KEY, reviewDirection, false).then(function () { if (cb) cb(); }).catch(function () {});
  }
  function loadAllMode(cb) {
    if (!window.storage || !window.storage.get) { cb(false); return; }
    window.storage.get(ALLMODE_KEY, false).then(function (r) {
      cb(r && r.value === "1");
    }).catch(function () { cb(false); });
  }
  function saveAllMode(cb) {
    if (!window.storage || !window.storage.set) { if (cb) cb(); return; }
    window.storage.set(ALLMODE_KEY, allMeaningsMode ? "1" : "0", false).then(function () { if (cb) cb(); }).catch(function () {});
  }
  var DIR_DESCRIPTIONS = {
    e2f: "واژه رو نشونت می‌ده، تو باید معنیش رو بنویسی.",
    f2e: "معنی رو نشونت می‌ده، تو باید املای درست واژه رو بنویسی.",
    random: "هر کارت به‌صورت تصادفی یکی از دو حالت «ترجمه» یا «ترجمه معکوس» رو ازت می‌پرسه."
  };
  var DIR_DESCRIPTIONS_ALL = {
    e2f: "واژه رو نشونت می‌ده، باید تا جای ممکن همه‌ی معنی‌هاش رو یکی‌یکی بنویسی.",
    f2e: "معنی رو نشونت می‌ده، باید تا جای ممکن همه‌ی واژه‌هایی که همین معنی رو می‌دن بنویسی.",
    random: "هر کارت تصادفاً یکی از دو حالته، و باید تا جای ممکن همه‌ی جواب‌های درستش رو بنویسی."
  };
  function renderDirRow() {
    var row = document.getElementById("lang-dir-row");
    if (!row) return;
    row.querySelectorAll(".lang-dir-btn").forEach(function (btn) {
      var d = btn.getAttribute("data-dir");
      if (d === reviewDirection) btn.classList.add("active"); else btn.classList.remove("active");
      btn.onclick = function () {
        reviewDirection = d;
        renderDirRow();
        saveDirection();
        renderReview();
      };
    });
    var descEl = document.getElementById("lang-dir-desc");
    var descMap = allMeaningsMode ? DIR_DESCRIPTIONS_ALL : DIR_DESCRIPTIONS;
    if (descEl) descEl.textContent = descMap[reviewDirection] || "";
  }
  var allModeToggle = document.getElementById("lang-allmode-toggle");
  allModeToggle.addEventListener("change", function () {
    allMeaningsMode = allModeToggle.checked;
    saveAllMode();
    renderDirRow();
    renderReview();
  });
  function clampWordBoxes() {
    // اگه تعداد فاصله‌ها کمتر از قبل شد، جعبه‌ی واژه‌ها رو با سقف جدید هماهنگ کن
    var changed = false;
    words.forEach(function (w) {
      if (w.box > INTERVALS.length) { w.box = INTERVALS.length; changed = true; }
    });
    return changed;
  }

  function renderIntervalsList() {
    var wrap = document.getElementById("lang-ivl-list");
    if (!wrap) return;
    var html = "";
    INTERVALS.forEach(function (d, i) {
      html += '<div class="lang-ivl-chip"><span>جعبه ' + toFa(i + 1) + ': روز ' + toFa(d) + '</span>' +
        '<button class="lang-ivl-chip-x" data-delivl="' + i + '" title="حذف">✕</button></div>';
    });
    if (INTERVALS.length === 0) html = '<div class="lang-empty" style="padding:4px 0;">هیچ فاصله‌ای نمونده</div>';
    wrap.innerHTML = html;
    wrap.querySelectorAll("[data-delivl]").forEach(function (btn) {
      btn.onclick = function () {
        var i = parseInt(btn.getAttribute("data-delivl"), 10);
        INTERVALS.splice(i, 1);
        var changed = clampWordBoxes();
        saveIntervals(function () {
          renderIntervalsList();
          if (changed) saveWords(function () { renderAll(); }); else renderAll();
        });
      };
    });
  }
  document.getElementById("lang-ivl-add-btn").addEventListener("click", function () {
    var input = document.getElementById("lang-ivl-add-input");
    var n = parseInt(input.value, 10);
    if (!n || n < 1) return;
    if (INTERVALS.indexOf(n) === -1) {
      INTERVALS.push(n);
      INTERVALS.sort(function (a, b) { return a - b; });
      saveIntervals(function () { renderIntervalsList(); renderAll(); });
    }
    input.value = "";
  });
  document.getElementById("lang-ivl-reset-btn").addEventListener("click", function () {
    INTERVALS = DEFAULT_INTERVALS.slice();
    var changed = clampWordBoxes();
    saveIntervals(function () {
      renderIntervalsList();
      if (changed) saveWords(function () { renderAll(); }); else renderAll();
    });
  });

  // ---- collapse/expand for review-intervals card (like ADHD advanced options) ----
  var ivlHeader = document.getElementById("lang-ivl-header");
  var ivlContent = document.getElementById("lang-ivl-content");
  var ivlArrow = document.getElementById("lang-ivl-arrow");
  ivlHeader.addEventListener("click", function () {
    var isOpen = ivlContent.style.display !== "none";
    ivlContent.style.display = isOpen ? "none" : "block";
    ivlArrow.style.transform = isOpen ? "rotate(0deg)" : "rotate(180deg)";
  });

  // ---- collapse/expand for "افزودن واژه یا عبارت جدید" card (like ADHD advanced options) ----
  var addHeader = document.getElementById("lang-add-header");
  var addContent = document.getElementById("lang-add-content");
  var addArrow = document.getElementById("lang-add-arrow");
  addHeader.addEventListener("click", function () {
    var isOpen = addContent.style.display !== "none";
    addContent.style.display = isOpen ? "none" : "block";
    addArrow.style.transform = isOpen ? "rotate(0deg)" : "rotate(180deg)";
  });

  // ---- collapse/expand for "واژه‌های من" list (like ADHD advanced options) ----
  var wordsHeader = document.getElementById("lang-words-header");
  var wordsContent = document.getElementById("lang-words-content");
  var wordsArrow = document.getElementById("lang-words-arrow");
  wordsHeader.addEventListener("click", function () {
    var isOpen = wordsContent.style.display !== "none";
    wordsContent.style.display = isOpen ? "none" : "block";
    wordsArrow.style.transform = isOpen ? "rotate(0deg)" : "rotate(180deg)";
  });

  // ---- collapse/expand for "آزمون بازه‌ی تاریخ" card (like ADHD advanced options) ----
  var dtHeader = document.getElementById("lang-dt-header");
  var dtContent = document.getElementById("lang-dt-content");
  var dtArrow = document.getElementById("lang-dt-arrow");
  dtHeader.addEventListener("click", function () {
    var isOpen = dtContent.style.display !== "none";
    dtContent.style.display = isOpen ? "none" : "block";
    dtArrow.style.transform = isOpen ? "rotate(0deg)" : "rotate(180deg)";
  });

  var confirmDeleteToggle = document.getElementById("lang-confirm-delete-toggle");
  confirmDeleteToggle.addEventListener("change", function () {
    confirmDeleteWords = confirmDeleteToggle.checked;
    saveConfirmDelete();
  });

  function computeDue() {
    var t = todayStr();
    return words.filter(function (w) { return w.nextReview <= t; });
  }

  function renderStats() {
    var due = computeDue().length;
    var mastered = words.filter(function (w) { return w.box >= INTERVALS.length; }).length;
    document.getElementById("lang-stats").innerHTML =
      '<div class="lang-stat"><div class="n">' + toFa(due) + '</div><div class="l">مرور امروز</div></div>' +
      '<div class="lang-stat"><div class="n">' + toFa(words.length) + '</div><div class="l">کل واژه‌ها</div></div>' +
      '<div class="lang-stat"><div class="n">' + toFa(mastered) + '</div><div class="l">تثبیت‌شده</div></div>';
    if (due > 0) { fab.classList.add("lang-due"); fab.setAttribute("data-due-label", toFa(due)); }
    else { fab.classList.remove("lang-due"); fab.removeAttribute("data-due-label"); }
  }

  function renderWordList() {
    var box = document.getElementById("lang-word-list");
    if (!words.length) { box.innerHTML = '<div class="lang-empty">هنوز واژه‌ای اضافه نکردی.</div>'; return; }
    var sorted = words.slice().sort(function (a, b) { return a.nextReview < b.nextReview ? -1 : 1; });
    box.innerHTML = "";
    sorted.forEach(function (w) {
      var row = document.createElement("div");
      row.className = "lang-word-row";
      row.innerHTML =
        '<span class="f">' + w.front.replace(/</g, "&lt;") + '</span>' +
        '<span class="b">' + w.back.replace(/</g, "&lt;") + '</span>' +
        '<span class="box">جعبه ' + toFa(w.box) + '</span>' +
        '<button class="del" data-id="' + w.id + '">🗑️</button>';
      row.querySelector(".del").addEventListener("click", function () {
        function doDeleteWord() {
          words = words.filter(function (x) { return x.id !== w.id; });
          saveWords(function () { renderAll(); });
        }
        if (confirmDeleteWords) {
          window.bjConfirm("این واژه («" + w.front + "») حذف بشه؟", doDeleteWord);
        } else {
          doDeleteWord();
        }
      });
      box.appendChild(row);
    });
  }

  function renderNoteList() {
    var box = document.getElementById("lang-note-list");
    if (!notes.length) { box.innerHTML = '<div class="lang-empty">هنوز یادداشتی اضافه نکردی.</div>'; return; }
    var sorted = notes.slice().sort(function (a, b) { return (a.done === b.done) ? 0 : (a.done ? 1 : -1); });
    box.innerHTML = "";
    sorted.forEach(function (n) {
      var row = document.createElement("div");
      row.className = "lang-note-row" + (n.done ? " done" : "");
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !!n.done;
      cb.addEventListener("change", function () {
        n.done = cb.checked;
        saveNotes(function () { renderNoteList(); });
      });
      row.appendChild(cb);
      var txt = document.createElement("span");
      txt.className = "txt";
      txt.textContent = n.text;
      row.appendChild(txt);
      var del = document.createElement("button");
      del.className = "del";
      del.textContent = "🗑️";
      del.addEventListener("click", function () {
        function doDeleteNote() {
          notes = notes.filter(function (x) { return x.id !== n.id; });
          saveNotes(function () { renderNoteList(); });
        }
        window.bjConfirm("این یادداشت حذف بشه؟", doDeleteNote);
      });
      row.appendChild(del);
      box.appendChild(row);
    });
  }

  function normalizeDrillText(s) { return (s || "").replace(/\s+/g, " ").trim(); }

  function renderDrillList() {
    var box = document.getElementById("lang-drill-list");
    if (!box) return;
    if (!drills.length) { box.innerHTML = '<div class="lang-empty">هنوز تمرین نوشتاری اضافه نکردی.</div>'; return; }
    var today = todayStr();
    box.innerHTML = "";
    drills.forEach(function (d) {
      var count = (d.log && d.log[today]) || 0;
      var target = d.target || 1;
      var pct = Math.min(100, Math.round((count / target) * 100));
      var done = count >= target;
      var row = document.createElement("div");
      row.className = "lang-drill-row";
      row.innerHTML =
        '<div class="lang-drill-text">' + d.text.replace(/</g, "&lt;").replace(/\n/g, "<br>") + '</div>' +
        '<div class="lang-drill-meta">' +
          '<div class="lang-drill-progress-bar"><div class="lang-drill-progress-fill" style="width:' + pct + '%;"></div></div>' +
          '<span class="lang-drill-count">' + toFa(count) + ' از ' + toFa(target) + ' امروز' + (done ? ' ✅' : '') + '</span>' +
        '</div>' +
        '<div class="lang-drill-actions">' +
          '<button class="lang-drill-go">' + (done ? 'دوباره تمرین کن' : 'تمرین کن') + '</button>' +
          '<button class="lang-drill-del" title="حذف">🗑️</button>' +
        '</div>';
      row.querySelector(".lang-drill-go").addEventListener("click", function () {
        currentDrillSession = d;
        renderDrillSession();
      });
      row.querySelector(".lang-drill-del").addEventListener("click", function () {
        window.bjConfirm("این تمرین حذف بشه؟", function () {
          drills = drills.filter(function (x) { return x.id !== d.id; });
          if (currentDrillSession && currentDrillSession.id === d.id) currentDrillSession = null;
          saveDrills(function () { renderDrillList(); renderDrillSession(); });
        });
      });
      box.appendChild(row);
    });
  }

  function renderDrillSession() {
    var card = document.getElementById("lang-drill-session-card");
    var box = document.getElementById("lang-drill-session-box");
    var titleEl = document.getElementById("lang-drill-session-title");
    if (!card || !box || !titleEl) return;
    if (!currentDrillSession) { card.style.display = "none"; box.innerHTML = ""; return; }
    var drill = currentDrillSession;
    var today = todayStr();
    var count = (drill.log && drill.log[today]) || 0;
    var target = drill.target || 1;
    var done = count >= target;
    card.style.display = "block";
    titleEl.textContent = done ? "✍️ تمرین — امروز کارت با این متن تمومه ✅" : "✍️ تمرین";
    var lineCount = (drill.text.match(/\n/g) || []).length + 1;
    var rows = Math.max(2, Math.min(6, lineCount));
    box.innerHTML =
      '<div class="lang-drill-target">' + drill.text.replace(/</g, "&lt;").replace(/\n/g, "<br>") + '</div>' +
      '<div class="lang-review-prompt" style="margin-bottom:8px;">بار ' + toFa(Math.min(count + (done ? 0 : 1), target)) + ' از ' + toFa(target) +
        (done ? ' — می‌تونی بازم اضافه‌تر تمرین کنی' : '') + '</div>' +
      '<textarea id="lang-drill-answer-input" dir="auto" rows="' + rows + '" class="lang-answer-input" style="text-align:right; height:auto;" placeholder="همینو دقیقاً اینجا بنویس..." autocomplete="off" autocapitalize="off" spellcheck="false"></textarea>' +
      '<div id="lang-drill-session-result" style="display:none;"></div>' +
      '<div class="lang-review-actions">' +
      '<button id="lang-drill-check-btn" class="lang-btn" style="flex:1;">بررسی</button>' +
      '<button id="lang-drill-close-btn" class="lang-btn-ghost" style="flex-shrink:0;">بستن</button>' +
      '</div>';

    document.getElementById("lang-drill-close-btn").addEventListener("click", function () {
      currentDrillSession = null;
      renderDrillSession();
    });
    var input = document.getElementById("lang-drill-answer-input");
    var checkBtn = document.getElementById("lang-drill-check-btn");
    function doDrillCheck() {
      var typed = normalizeDrillText(input.value);
      var expected = normalizeDrillText(drill.text);
      var resultBox = document.getElementById("lang-drill-session-result");
      if (typed && typed === expected) {
        drill.log = drill.log || {};
        drill.log[today] = (drill.log[today] || 0) + 1;
        saveDrills(function () {
          renderDrillList();
          renderDrillSession();
        });
      } else {
        resultBox.style.display = "block";
        resultBox.innerHTML = '<div class="lang-review-wrong">❌ دقیقاً مطابق متن نبود، دوباره امتحان کن</div>';
      }
    }
    checkBtn.addEventListener("click", doDrillCheck);
    input.focus();
  }

  function normalizeAnswer(s) { return (s || "").trim().toLowerCase(); }
  function splitMeanings(s) {
    return (s || "").split(/[،,;]/).map(function (x) { return x.trim(); }).filter(function (x) { return x; });
  }
  // اگه چند تا واژه‌ی مختلف یه معنی مشترک داشته باشن (مثلاً home و house هر دو یکی از معنی‌هاشون «خانه»ست)،
  // موقع ترجمه‌ی معکوس نوشتن هر کدوم از اون واژه‌ها قبول می‌شه، نه فقط همونی که کارتش الان نشون داده می‌شه.
  function getAcceptedFronts(word) {
    var wordMeanings = splitMeanings(word.back).map(normalizeAnswer);
    var accepted = [word.front];
    words.forEach(function (w) {
      if (w.id === word.id) return;
      var otherMeanings = splitMeanings(w.back).map(normalizeAnswer);
      var shares = wordMeanings.some(function (m) { return otherMeanings.indexOf(m) !== -1; });
      if (shares && accepted.indexOf(w.front) === -1) accepted.push(w.front);
    });
    return accepted;
  }

  function renderReview() {
    reviewQueue = computeDue();
    currentReview = reviewQueue[0] || null;
    if (!currentReview) {
      document.getElementById("lang-review-box").innerHTML = '<div class="lang-empty">امروز واژه‌ای برای مرور نمونده — یا هنوز واژه‌ای اضافه نکردی. کارت‌های جدید فردا با فاصله‌ی مناسب سراغت میان.</div>';
      return;
    }
    // جهت مرور بر اساس انتخاب کاربر: واژه به معنی، معنی به واژه، یا تصادفی
    // (تصادفی یعنی هر بار خودکار یکی از دو جهت انتخاب می‌شه تا حافظه از هر دو طرف تمرین بشه)
    var direction;
    if (reviewDirection === "e2f") direction = "word2meaning";
    else if (reviewDirection === "f2e") direction = "meaning2word";
    else direction = Math.random() < 0.5 ? "word2meaning" : "meaning2word";

    if (allMeaningsMode) renderReviewAll(direction);
    else renderReviewSingle(direction);
  }

  function renderReviewSingle(direction) {
    var box = document.getElementById("lang-review-box");
    var meanings = splitMeanings(currentReview.back);
    var promptText = direction === "word2meaning"
      ? "این واژه رو بلدی؟ معنیش رو بنویس:"
      : "این معنی رو بلدی؟ املای درست واژه رو بنویس:";
    var shownText = direction === "word2meaning" ? currentReview.front : meanings.join("، ");
    var inputDir = direction === "word2meaning" ? "rtl" : "ltr";

    box.innerHTML =
      '<div class="lang-review-prompt">' + promptText + '</div>' +
      '<div class="lang-review-front">' + shownText.replace(/</g, "&lt;") + '</div>' +
      '<input type="text" id="lang-answer-input" class="lang-answer-input" style="direction:' + inputDir + ';" placeholder="جوابت رو اینجا بنویس..." autocomplete="off" autocapitalize="off" spellcheck="false">' +
      '<button id="lang-check-btn" class="lang-btn">بررسی جواب</button>' +
      '<div id="lang-review-result" style="display:none;"></div>';

    var input = document.getElementById("lang-answer-input");
    var checkBtn = document.getElementById("lang-check-btn");

    function doCheck() {
      var typed = normalizeAnswer(input.value);
      var correct;
      var correctAnswerText;
      if (direction === "word2meaning") {
        // اگه چند معنی برای واژه ثبت شده، نوشتن هرکدوم از اونا قبول می‌شه
        correct = meanings.some(function (m) { return normalizeAnswer(m) === typed; });
        correctAnswerText = meanings.join("، ");
      } else {
        // اگه یه معنی مشترک بین چند واژه باشه (مثلاً «خانه» هم معنی home هم معنی house)،
        // نوشتن هر کدوم از اون واژه‌ها قبول می‌شه
        var acceptedFronts = getAcceptedFronts(currentReview);
        correct = acceptedFronts.some(function (f) { return normalizeAnswer(f) === typed; });
        correctAnswerText = acceptedFronts.join("، ");
      }
      input.disabled = true;
      checkBtn.style.display = "none";
      var resultBox = document.getElementById("lang-review-result");
      resultBox.style.display = "block";
      resultBox.innerHTML =
        (correct
          ? '<div class="lang-review-correct">✅ درست بود!</div>'
          : ('<div class="lang-review-wrong">❌ درست نبود</div>' +
             '<div class="lang-review-correct-answer">جواب درست: <b>' + correctAnswerText.replace(/</g, "&lt;") + '</b></div>')) +
        (currentReview.example ? '<div class="lang-review-example">' + currentReview.example.replace(/</g, "&lt;") + '</div>' : '') +
        '<div class="lang-review-actions" style="margin-top:8px;">' +
        (correct
          ? '<button id="lang-know-btn" style="flex:1;">بعدی ✅</button>'
          : ('<button id="lang-dontknow-btn" style="flex:1;">باشه، بعدی 🔁</button>')) +
        '</div>';
      if (correct) {
        document.getElementById("lang-know-btn").addEventListener("click", function () { answerReview(true); });
      } else {
        document.getElementById("lang-dontknow-btn").addEventListener("click", function () { answerReview(false); });
      }
    }
    checkBtn.addEventListener("click", doCheck);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") doCheck(); });
    input.focus();
  }

  function renderReviewAll(direction) {
    var box = document.getElementById("lang-review-box");
    // بسته به جهت، یا باید همه‌ی معنی‌های واژه نوشته بشن، یا همه‌ی واژه‌هایی که همین معنی رو می‌دن
    var isWord2Meaning = direction === "word2meaning";
    var targetList = isWord2Meaning ? splitMeanings(currentReview.back) : getAcceptedFronts(currentReview);
    var shownText = isWord2Meaning ? currentReview.front : splitMeanings(currentReview.back).join("، ");
    var shownDir = isWord2Meaning ? "rtl" : "ltr";
    var inputDir = isWord2Meaning ? "rtl" : "ltr";
    var itemLabel = isWord2Meaning ? "معنی" : "واژه";
    var found = [];

    function renderFoundChips() {
      if (!found.length) return '<div class="lang-empty" style="padding:4px 0;">هنوز ' + itemLabel + '‌ای ننوشتی</div>';
      return '<div style="display:flex; flex-wrap:wrap; gap:6px; justify-content:center;">' +
        found.map(function (m) { return '<span class="box" style="background:rgba(63,168,103,0.15); color:#3FA867; border-radius:8px; padding:4px 8px; font-size:11px;">✓ ' + m.replace(/</g, "&lt;") + '</span>'; }).join("") +
        '</div>';
    }

    function renderBody() {
      box.innerHTML =
        '<div class="lang-review-prompt">تا جای ممکن همه‌ی ' + itemLabel + '‌های این کارت رو بنویس (' + toFa(found.length) + ' از ' + toFa(targetList.length) + '):</div>' +
        '<div class="lang-review-front" style="direction:' + shownDir + ';">' + shownText.replace(/</g, "&lt;") + '</div>' +
        '<div id="lang-all-chips" style="margin-bottom:10px;">' + renderFoundChips() + '</div>' +
        '<input type="text" id="lang-answer-input" class="lang-answer-input" style="direction:' + inputDir + ';" placeholder="یه ' + itemLabel + ' بنویس و اینتر بزن..." autocomplete="off" autocapitalize="off" spellcheck="false">' +
        '<div class="lang-review-actions">' +
        '<button id="lang-check-btn" class="lang-btn" style="flex:1;">ثبت این ' + itemLabel + '</button>' +
        '<button id="lang-finish-btn" class="lang-btn-ghost" style="flex:1;">همینه که هست، پایان</button>' +
        '</div>' +
        '<div id="lang-review-result" style="display:none;"></div>';

      var input = document.getElementById("lang-answer-input");
      var checkBtn = document.getElementById("lang-check-btn");
      var finishBtn = document.getElementById("lang-finish-btn");

      function addTyped() {
        var typed = normalizeAnswer(input.value);
        if (!typed) return;
        var match = targetList.find(function (m) { return normalizeAnswer(m) === typed && found.indexOf(m) === -1; });
        if (match) {
          found.push(match);
          input.value = "";
          if (found.length >= targetList.length) { finish(); return; }
          renderBody();
        } else {
          input.value = "";
          input.placeholder = "این یکی رو قبلاً گفتی یا اشتباهه — یکی دیگه بنویس یا پایان بده";
        }
      }
      checkBtn.addEventListener("click", addTyped);
      input.addEventListener("keydown", function (e) { if (e.key === "Enter") addTyped(); });
      finishBtn.addEventListener("click", finish);
      input.focus();
    }

    function finish() {
      var missed = targetList.filter(function (m) { return found.indexOf(m) === -1; });
      var allFound = missed.length === 0;
      box.innerHTML =
        '<div class="lang-review-prompt">نتیجه:</div>' +
        (allFound
          ? '<div class="lang-review-correct">✅ همه‌ی ' + itemLabel + '‌ها رو نوشتی!</div>'
          : '<div class="lang-review-wrong">' + toFa(found.length) + ' از ' + toFa(targetList.length) + ' ' + itemLabel + ' رو نوشتی</div>') +
        '<div id="lang-all-chips" style="margin:10px 0;">' + renderFoundChips() + '</div>' +
        (missed.length ? '<div class="lang-review-correct-answer">جا افتاده: <b>' + missed.join("، ").replace(/</g, "&lt;") + '</b></div>' : '') +
        (isWord2Meaning && currentReview.example ? '<div class="lang-review-example">' + currentReview.example.replace(/</g, "&lt;") + '</div>' : '') +
        '<div class="lang-review-actions" style="margin-top:8px;">' +
        '<button id="lang-all-next-btn" style="flex:1;">بعدی</button>' +
        '</div>';
      document.getElementById("lang-all-next-btn").addEventListener("click", function () { answerReview(allFound); });
    }

    renderBody();
  }


  function answerReview(knew) {
    if (!currentReview) return;
    var w = words.find(function (x) { return x.id === currentReview.id; });
    if (!w) return;
    if (knew) {
      w.box = Math.min(INTERVALS.length, w.box + 1);
    } else {
      w.box = 1;
    }
    var idx = Math.min(w.box, INTERVALS.length) - 1;
    w.nextReview = addDays(todayStr(), INTERVALS[idx] || INTERVALS[INTERVALS.length - 1] || 1);
    saveWords(function () { renderAll(); });
  }

  // ---------- آزمون واژه‌های یک بازه‌ی تاریخ (بر پایه‌ی تاریخ افزودنِ واژه) ----------
  var dtMode = "j"; // "j" (شمسی، پیش‌فرض) یا "g" (میلادی)
  var dtTodayISO = todayStr();
  var dtWeekAgoISO = addDays(dtTodayISO, -7);
  var dtTodayJ = jaParts(new Date(dtTodayISO + "T00:00:00"));
  var dtWeekAgoJ = jaParts(new Date(dtWeekAgoISO + "T00:00:00"));
  var dtFrom = { jy: dtWeekAgoJ.jy, jm: dtWeekAgoJ.jm, jd: dtWeekAgoJ.jd };
  var dtTo = { jy: dtTodayJ.jy, jm: dtTodayJ.jm, jd: dtTodayJ.jd };
  var dtFromG = dtWeekAgoISO;
  var dtToG = dtTodayISO;
  var dtQueue = [];
  var dtCurrent = null;
  var dtCorrectCount = 0;
  var dtTotalCount = 0;

  function renderDtModeToggle() {
    var toggle = document.getElementById("lang-dt-mode-toggle");
    if (!toggle) return;
    toggle.querySelectorAll(".lang-dt-mode-btn").forEach(function (btn) {
      var m = btn.getAttribute("data-dtmode");
      if (m === dtMode) btn.classList.add("active"); else btn.classList.remove("active");
      btn.onclick = function () {
        dtMode = m;
        renderDtModeToggle();
        renderDtPickers();
      };
    });
  }

  function faDateFromJalali(val) {
    return jaMonthNames[val.jm - 1] + " " + toFa(val.jd) + "، " + toFa(val.jy);
  }

  function jaSelectHtml(prefix, val) {
    var curJy = jaParts(new Date()).jy;
    var yearOpts = "";
    for (var y = curJy - 6; y <= curJy; y++) {
      yearOpts += '<option value="' + y + '"' + (y === val.jy ? " selected" : "") + '>' + toFa(y) + '</option>';
    }
    var monthOpts = "";
    for (var mI = 0; mI < 12; mI++) {
      monthOpts += '<option value="' + (mI + 1) + '"' + ((mI + 1) === val.jm ? " selected" : "") + '>' + jaMonthNames[mI] + '</option>';
    }
    var dayLen = jaMonthLen(val.jy, val.jm);
    var dayOpts = "";
    for (var dI = 1; dI <= dayLen; dI++) {
      dayOpts += '<option value="' + dI + '"' + (dI === val.jd ? " selected" : "") + '>' + toFa(dI) + '</option>';
    }
    return '<div class="lang-dt-jrow">' +
      '<select id="lang-dt-' + prefix + '-jy">' + yearOpts + '</select>' +
      '<select id="lang-dt-' + prefix + '-jm">' + monthOpts + '</select>' +
      '<select id="lang-dt-' + prefix + '-jd">' + dayOpts + '</select>' +
    '</div>';
  }

  function bindJaSelects(prefix, valObj) {
    var jyEl = document.getElementById("lang-dt-" + prefix + "-jy");
    var jmEl = document.getElementById("lang-dt-" + prefix + "-jm");
    var jdEl = document.getElementById("lang-dt-" + prefix + "-jd");
    function onYearMonthChange() {
      valObj.jy = parseInt(jyEl.value, 10);
      valObj.jm = parseInt(jmEl.value, 10);
      var maxDay = jaMonthLen(valObj.jy, valObj.jm);
      if (valObj.jd > maxDay) valObj.jd = maxDay;
      renderDtPickers();
    }
    jyEl.addEventListener("change", onYearMonthChange);
    jmEl.addEventListener("change", onYearMonthChange);
    jdEl.addEventListener("change", function () { valObj.jd = parseInt(jdEl.value, 10); });
  }

  function renderDtPickers() {
    var fromBox = document.getElementById("lang-dt-from-picker");
    var toBox = document.getElementById("lang-dt-to-picker");
    if (!fromBox || !toBox) return;
    if (dtMode === "g") {
      fromBox.innerHTML = '<input type="date" class="lang-dt-ginput" id="lang-dt-from-ginput" value="' + dtFromG + '">';
      toBox.innerHTML = '<input type="date" class="lang-dt-ginput" id="lang-dt-to-ginput" value="' + dtToG + '">';
      document.getElementById("lang-dt-from-ginput").addEventListener("change", function (e) { dtFromG = e.target.value; });
      document.getElementById("lang-dt-to-ginput").addEventListener("change", function (e) { dtToG = e.target.value; });
    } else {
      fromBox.innerHTML = jaSelectHtml("from", dtFrom) + '<div class="lang-dt-preview">' + faDateFromJalali(dtFrom) + '</div>';
      toBox.innerHTML = jaSelectHtml("to", dtTo) + '<div class="lang-dt-preview">' + faDateFromJalali(dtTo) + '</div>';
      bindJaSelects("from", dtFrom);
      bindJaSelects("to", dtTo);
    }
  }

  function getDtRangeISO() {
    var fromISO, toISO;
    if (dtMode === "g") {
      fromISO = dtFromG || dtTodayISO;
      toISO = dtToG || dtTodayISO;
    } else {
      fromISO = isoFromDate(jaToGregorian(dtFrom.jy, dtFrom.jm, dtFrom.jd));
      toISO = isoFromDate(jaToGregorian(dtTo.jy, dtTo.jm, dtTo.jd));
    }
    if (fromISO > toISO) { var tmp = fromISO; fromISO = toISO; toISO = tmp; }
    return { from: fromISO, to: toISO };
  }

  function renderDtQuestion() {
    var box = document.getElementById("lang-datetest-box");
    dtCurrent = dtQueue.shift();
    if (!dtCurrent) {
      box.innerHTML =
        '<div class="lang-review-prompt">نتیجه‌ی آزمون این بازه:</div>' +
        '<div class="lang-review-front" style="font-size:18px;">' + toFa(dtCorrectCount) + ' از ' + toFa(dtTotalCount) + ' درست</div>' +
        '<button class="lang-btn-ghost" id="lang-dt-close-btn" style="width:100%;">بستن نتیجه</button>';
      document.getElementById("lang-dt-close-btn").addEventListener("click", function () { box.innerHTML = ""; });
      return;
    }
    var w = dtCurrent.word, direction = dtCurrent.direction;
    var meanings = splitMeanings(w.back);
    var qNum = dtTotalCount - dtQueue.length;
    var promptText = direction === "word2meaning" ? "این واژه رو بلدی؟ معنیش رو بنویس:" : "این معنی رو بلدی؟ املای درست واژه رو بنویس:";
    var shownText = direction === "word2meaning" ? w.front : meanings.join("، ");
    var inputDir = direction === "word2meaning" ? "rtl" : "ltr";
    box.innerHTML =
      '<div class="lang-review-prompt">سوال ' + toFa(qNum) + ' از ' + toFa(dtTotalCount) + ' — ' + promptText + '</div>' +
      '<div class="lang-review-front">' + shownText.replace(/</g, "&lt;") + '</div>' +
      '<input type="text" id="lang-dt-answer-input" class="lang-answer-input" style="direction:' + inputDir + ';" placeholder="جوابت رو اینجا بنویس..." autocomplete="off" autocapitalize="off" spellcheck="false">' +
      '<button id="lang-dt-check-btn" class="lang-btn" style="background:#8E6FC4;">بررسی جواب</button>' +
      '<div id="lang-dt-result" style="display:none;"></div>';

    var input = document.getElementById("lang-dt-answer-input");
    var checkBtn = document.getElementById("lang-dt-check-btn");
    function doDtCheck() {
      var typed = normalizeAnswer(input.value);
      var correct, correctAnswerText;
      if (direction === "word2meaning") {
        correct = meanings.some(function (m) { return normalizeAnswer(m) === typed; });
        correctAnswerText = meanings.join("، ");
      } else {
        var acceptedFronts = getAcceptedFronts(w);
        correct = acceptedFronts.some(function (f) { return normalizeAnswer(f) === typed; });
        correctAnswerText = acceptedFronts.join("، ");
      }
      if (correct) dtCorrectCount++;
      input.disabled = true;
      checkBtn.style.display = "none";
      var resultBox = document.getElementById("lang-dt-result");
      resultBox.style.display = "block";
      resultBox.innerHTML =
        (correct
          ? '<div class="lang-review-correct">✅ درست بود!</div>'
          : ('<div class="lang-review-wrong">❌ درست نبود</div>' +
             '<div class="lang-review-correct-answer">جواب درست: <b>' + correctAnswerText.replace(/</g, "&lt;") + '</b></div>')) +
        (w.example ? '<div class="lang-review-example">' + w.example.replace(/</g, "&lt;") + '</div>' : '') +
        '<div class="lang-review-actions" style="margin-top:8px;">' +
        '<button id="lang-dt-next-btn" class="lang-btn" style="flex:1;">بعدی</button>' +
        '</div>';
      document.getElementById("lang-dt-next-btn").addEventListener("click", renderDtQuestion);
    }
    checkBtn.addEventListener("click", doDtCheck);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") doDtCheck(); });
    input.focus();
  }

  document.getElementById("lang-dt-start-btn").addEventListener("click", function () {
    var range = getDtRangeISO();
    var matched = words.filter(function (w) { return w.createdAt && w.createdAt >= range.from && w.createdAt <= range.to; });
    var box = document.getElementById("lang-datetest-box");
    if (!matched.length) {
      box.innerHTML = '<div class="lang-empty">تو این بازه هیچ واژه‌ای به واژه‌هات اضافه نشده (واژه‌های قدیمی‌تر ممکنه تاریخ افزودنِ ثبت‌شده نداشته باشن).</div>';
      return;
    }
    dtQueue = [];
    matched.forEach(function (w) {
      dtQueue.push({ word: w, direction: "word2meaning" });
      dtQueue.push({ word: w, direction: "meaning2word" });
    });
    for (var i = dtQueue.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = dtQueue[i]; dtQueue[i] = dtQueue[j]; dtQueue[j] = tmp;
    }
    dtCorrectCount = 0;
    dtTotalCount = dtQueue.length;
    renderDtQuestion();
  });

  renderDtModeToggle();
  renderDtPickers();

  document.getElementById("lang-add-btn").addEventListener("click", function () {
    var front = (document.getElementById("lang-front-input").value || "").trim();
    var back = (document.getElementById("lang-back-input").value || "").trim();
    var example = (document.getElementById("lang-example-input").value || "").trim();
    if (!front || !back) return;
    words.push({ id: uid(), front: front, back: back, example: example, box: 1, nextReview: todayStr(), createdAt: todayStr() });
    document.getElementById("lang-front-input").value = "";
    document.getElementById("lang-back-input").value = "";
    document.getElementById("lang-example-input").value = "";
    saveWords(function () { renderAll(); });
  });

  var drillAddBtn = document.getElementById("lang-drill-add-btn");
  if (drillAddBtn) {
    drillAddBtn.addEventListener("click", function () {
      var textInput = document.getElementById("lang-drill-text-input");
      var countInput = document.getElementById("lang-drill-count-input");
      var text = (textInput.value || "").trim();
      if (!text) return;
      var targetCount = parseInt(countInput.value, 10);
      if (!targetCount || targetCount < 1) targetCount = 1;
      drills.push({ id: uid(), text: text, target: targetCount, log: {} });
      textInput.value = "";
      countInput.value = "5";
      saveDrills(function () { renderDrillList(); });
    });
  }

  // ---- دفترچه‌ی یادداشت آزاد: ذخیره‌ی خودکار با یه تاخیر کوتاه بعد از تایپ ----
  var freenoteInput = document.getElementById("lang-freenote-input");
  if (freenoteInput) {
    freenoteInput.addEventListener("input", function () {
      freenoteText = freenoteInput.value;
      var savedEl = document.getElementById("lang-freenote-saved");
      if (savedEl) savedEl.textContent = "در حال ذخیره…";
      if (freenoteSaveTimer) clearTimeout(freenoteSaveTimer);
      freenoteSaveTimer = setTimeout(function () {
        saveFreenote(function () {
          if (savedEl) savedEl.textContent = "ذخیره شد ✓";
        });
      }, 500);
    });
  }

  // ---- collapse/expand برای کارت‌های تب «تمرین» ----
  [
    ["lang-drill-add-header", "lang-drill-add-content", "lang-drill-add-arrow"],
    ["lang-drill-list-header", "lang-drill-list-content", "lang-drill-list-arrow"],
    ["lang-freenote-header", "lang-freenote-content", "lang-freenote-arrow"]
  ].forEach(function (ids) {
    var header = document.getElementById(ids[0]);
    var contentEl = document.getElementById(ids[1]);
    var arrowEl = document.getElementById(ids[2]);
    if (!header || !contentEl || !arrowEl) return;
    header.addEventListener("click", function () {
      var isOpen = contentEl.style.display !== "none";
      contentEl.style.display = isOpen ? "none" : "block";
      arrowEl.style.transform = isOpen ? "rotate(0deg)" : "rotate(180deg)";
    });
  });

  function renderAll() {
    renderStats();
    renderDirRow();
    renderReview();
    renderWordList();
    renderIntervalsList();
    renderNoteList();
    renderDrillList();
    renderDrillSession();
  }

  function openPanel() {
    overlay.classList.add("open"); panel.classList.add("open");
    loadConfirmDelete(function (v) { confirmDeleteWords = v; confirmDeleteToggle.checked = v; });
    loadDirection(function (v) { reviewDirection = v; renderDirRow(); });
    loadAllMode(function (v) { allMeaningsMode = v; allModeToggle.checked = v; renderDirRow(); });
    loadIntervals(function (iv) { INTERVALS = iv; loadWords(function (w) { words = w; loadNotes(function (nt) { notes = nt; renderAll(); }); }); });
    loadDrills(function (dr) { drills = dr; renderDrillList(); renderDrillSession(); });
    loadFreenote(function (ft) {
      freenoteText = ft;
      var savedEl = document.getElementById("lang-freenote-saved");
      if (freenoteInput) freenoteInput.value = ft;
      if (savedEl) savedEl.textContent = "";
    });
  }
  function closePanel() { overlay.classList.remove("open"); panel.classList.remove("open"); }
  fab.addEventListener("click", openPanel);
  document.getElementById("lang-close").addEventListener("click", closePanel);
  overlay.addEventListener("click", closePanel);

  // ---- تب‌بندی شیت زبان‌آموز (امروز / آزمون / واژه‌ها / یادداشت) ----
  document.querySelectorAll("#lang-tabbar .lang-tab").forEach(function (tabBtn) {
    tabBtn.addEventListener("click", function () {
      document.querySelectorAll("#lang-tabbar .lang-tab").forEach(function (b) { b.classList.remove("active"); });
      tabBtn.classList.add("active");
      var target = tabBtn.getAttribute("data-langtab");
      document.querySelectorAll(".lang-tabview").forEach(function (v) { v.classList.remove("active"); });
      var view = document.getElementById("lang-view-" + target);
      if (view) view.classList.add("active");
    });
  });

  // ---- افزودن یادداشت/هدف جدید ----
  var noteInput = document.getElementById("lang-note-input");
  document.getElementById("lang-note-add-btn").addEventListener("click", function () {
    var t = noteInput.value.trim();
    if (!t) return;
    notes.push({ id: "n" + Date.now() + Math.random().toString(36).slice(2, 7), text: t, done: false });
    noteInput.value = "";
    saveNotes(function () { renderNoteList(); });
  });
  noteInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { document.getElementById("lang-note-add-btn").click(); }
  });

  // ---- collapse/expand برای «یادداشت‌ها و اهداف» ----
  var notesHeader = document.getElementById("lang-notes-header");
  var notesContent = document.getElementById("lang-notes-content");
  var notesArrow = document.getElementById("lang-notes-arrow");
  notesHeader.addEventListener("click", function () {
    var isOpen = notesContent.style.display !== "none";
    notesContent.style.display = isOpen ? "none" : "block";
    notesArrow.style.transform = isOpen ? "rotate(0deg)" : "rotate(180deg)";
  });

  loadIntervals(function (iv) { INTERVALS = iv; loadWords(function (w) { words = w; renderStats(); }); });
})();
