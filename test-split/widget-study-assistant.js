(function () {
  var LOG_KEY_PREFIX = "sdw-log-"; // one key per day in window.storage, e.g. sdw-log-2026-08-10
  var NOTES_KEY = "sdw-notes"; // window.storage key, JSON array of {id, text, createdAt} — included automatically in full backup export since it lives in the same indexedDB store
  var notesCache = [];
  var SETTINGS_KEY = "sdwSettings"; // localStorage
  var SOUND_KEY = "sdwSound"; // localStorage
  var TICK_KEY = "sdwTickSound"; // localStorage — "تایمر قابل‌مشاهده": نگاه کردن به شمارش معکوس + شنیدن تیک‌تاک ثانیه، برای تقویت حس فوریت و تمرکز

  var WORK_TIPS = [
    "قبل از شروع، گوشی رو روی حالت بی‌صدا بذار و فقط روی همین درس تمرکز کن.",
    "تکنیک پومودورو: توی این ۲۵ دقیقه فقط یک کار انجام بده، نه چندکاره.",
    "قسمت سخت‌تر درس رو اول شروع کن، نه قسمت راحت رو (اول قورباغه رو قورت بده).",
    "به‌جای فقط خوندن دوباره، سعی کن مطلب رو از حفظ برای خودت توضیح بدی (یادآوری فعال).",
    "درس رو به تکه‌های کوچیک‌تر (Chunking) تقسیم کن و هر تکه رو کامل بفهم قبل از رفتن به بعدی.",
    "اگه جایی گیر کردی، چند ثانیه روش تمرکز کن و بعد بی‌خیال شو تا مغزت پس‌زمینه روش کار کنه؛ توی استراحت جوابش میاد.",
    "برای یادگیری عمیق‌تر، از یاد خودت مطلب رو بازیابی کن، نه اینکه فقط زیرش خط بکشی.",
    "بین موضوعات مختلف جابه‌جا شو (تداخل/Interleaving)، بهتر از تمرین یک نوع مسئله پشت سر همه.",
    "اگه حواست پرت شد، فقط با ملایمت برش‌گردون روی درس، خودتو سرزنش نکن."
  ];
  var REST_TIPS = [
    "چند قدم راه برو یا کش‌وقوس بدنی بده تا خون توی بدنت جریان پیدا کنه.",
    "بذار ذهنت آزاد پرسه بزنه (حالت پراکنده/Diffuse Mode) — به هیچ‌چی خاصی فکر نکن.",
    "توی این استراحت از گوشی و شبکه‌های اجتماعی دور بمون؛ چشم و ذهنت هم نیاز به استراحت دارن.",
    "به بیرون پنجره نگاه کن یا چشمات رو چند لحظه ببند.",
    "یه لیوان آب بخور.",
    "نفس عمیق بکش: ۴ ثانیه دم، ۴ ثانیه نگه‌دار، ۴ ثانیه بازدم.",
    "دوش گرفتن، ظرف‌شستن یا کارهای ساده‌ی تکراری، حالت پراکنده‌ی ذهن رو فعال می‌کنه — اگه فرصت داری امتحان کن.",
    "به موسیقی آروم گوش بده، بدون اینکه سعی کنی روی چیزی تمرکز کنی."
  ];

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function dateKeyOffset(daysAgo) {
    var d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function loadSettings() {
    try {
      var raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { work: 25, short: 5, long: 15, longEvery: 4 };
  }
  function saveSettings(s) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) {}
  }
  function fmtClock(sec) {
    var m = Math.floor(sec / 60), s = sec % 60;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }
  function pad2(n) { return n < 10 ? "0" + n : "" + n; }
  function toISODateStr(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  var faDigits = ["۰","۱","۲","۳","۴","۵","۶","۷","۸","۹"];
  function faNum(n) { return String(n).split("").map(function (c) { return faDigits[c] !== undefined ? faDigits[c] : c; }).join(""); }
  function fmtHM(h, m) { return faNum(pad2(h)) + ":" + faNum(pad2(m)); }
  function fmtDateFa(d) {
    try { return d.toLocaleDateString("fa-IR", { month: "short", day: "numeric" }); }
    catch (e) { return d.toLocaleDateString(); }
  }

  var settings = loadSettings();
  var state = {
    phase: "idle", // idle | work | short_break | long_break
    remaining: settings.work * 60,
    running: false,
    cyclesDone: 0,
    timerId: null,
    unsavedWorkSeconds: 0
  };

  // ---------- study time-block planner (day / week / month) — separate from the general GTD tasks ----------
  var PLAN_KEY_PREFIX = "sdw-plan-"; // one key per day, e.g. sdw-plan-2026-08-10 -> array of blocks
  var planView = "day"; // day | week | month
  var planDate = new Date();
  var planMonth = null; // { jy, jm } — set lazily once jaParts is available
  function addDays(d, n) { var nd = new Date(d); nd.setDate(nd.getDate() + n); return nd; }

  // ---------- Jalali (Persian) calendar helpers, for the month grid ----------
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
  var jaMonthNames = ["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];

  // ---------- study minute log (persisted via window.storage) ----------
  function addStudySeconds(sec) {
    if (sec <= 0) return;
    var key = LOG_KEY_PREFIX + todayKey();
    window.storage.get(key).catch(function () { return { value: "0" }; }).then(function (r) {
      var cur = Number(r && r.value) || 0;
      return window.storage.set(key, String(cur + sec));
    }).then(renderStats).catch(function () {});
  }
  function flushUnsaved() {
    if (state.unsavedWorkSeconds > 0) {
      addStudySeconds(state.unsavedWorkSeconds);
      state.unsavedWorkSeconds = 0;
    }
  }

  function renderStats() {
    var elBig = document.getElementById("sdw-stat-today");
    var elWeek = document.getElementById("sdw-stat-week");
    if (!elBig || !elWeek) return;
    window.storage.get(LOG_KEY_PREFIX + todayKey()).catch(function () { return { value: "0" }; }).then(function (r) {
      var todaySec = (Number(r && r.value) || 0) + state.unsavedWorkSeconds;
      elBig.textContent = Math.round(todaySec / 60) + " دقیقه";
    });
    var proms = [];
    for (var i = 0; i < 7; i++) proms.push(window.storage.get(LOG_KEY_PREFIX + dateKeyOffset(i)).catch(function () { return { value: "0" }; }));
    Promise.all(proms).then(function (results) {
      var total = results.reduce(function (s, r) { return s + (Number(r && r.value) || 0); }, 0) + state.unsavedWorkSeconds;
      elWeek.textContent = Math.round(total / 60) + " دقیقه";
    });
  }

  // ---------- ambient sound player (generated in-browser, no external files) ----------
  var audioCtx = null, playerNodes = null, isPlaying = false, currentSound = (function () {
    try { return localStorage.getItem(SOUND_KEY) || "white"; } catch (e) { return "white"; }
  })();

  function ensureCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }
  function makeNoiseBuffer(ctx, type) {
    var bufferSize = 2 * ctx.sampleRate;
    var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    if (type === "brown") {
      var last = 0;
      for (var i = 0; i < bufferSize; i++) {
        var white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      }
    } else {
      for (var j = 0; j < bufferSize; j++) data[j] = Math.random() * 2 - 1;
    }
    return buffer;
  }
  function stopPlayer() {
    if (playerNodes) {
      try { playerNodes.forEach(function (n) { n.stop && n.stop(); n.disconnect && n.disconnect(); }); } catch (e) {}
      playerNodes = null;
    }
  }
  function startPlayer(type, volume) {
    stopPlayer();
    var ctx = ensureCtx();
    if (ctx.state === "suspended") ctx.resume();
    var gain = ctx.createGain();
    gain.gain.value = volume;
    gain.connect(ctx.destination);
    if (type === "drone") {
      var o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
      o1.type = "sine"; o2.type = "sine";
      o1.frequency.value = 110; o2.frequency.value = 111.5;
      var g2 = ctx.createGain(); g2.gain.value = 0.5;
      o1.connect(g2); o2.connect(g2); g2.connect(gain);
      o1.start(); o2.start();
      playerNodes = [o1, o2, gain];
    } else {
      var src = ctx.createBufferSource();
      src.buffer = makeNoiseBuffer(ctx, type);
      src.loop = true;
      if (type === "white") {
        var lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 4500;
        src.connect(lp); lp.connect(gain);
      } else {
        src.connect(gain);
      }
      src.start();
      playerNodes = [src, gain];
    }
  }
  function setPlayerVolume(v) {
    if (playerNodes) {
      var g = playerNodes[playerNodes.length - 1];
      if (g && g.gain) g.gain.value = v;
    }
  }

  // ---------- tick-tock sound (visible-timer focus technique) ----------
  var tickEnabled = (function () {
    try { return localStorage.getItem(TICK_KEY) === "1"; } catch (e) { return false; }
  })();
  function playTick() {
    try {
      var ctx = ensureCtx();
      if (ctx.state === "suspended") ctx.resume();
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "square"; o.frequency.value = 1600;
      g.gain.value = 0.0001;
      o.connect(g); g.connect(ctx.destination);
      var now = ctx.currentTime;
      g.gain.exponentialRampToValueAtTime(0.12, now + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
      o.start(now); o.stop(now + 0.05);
    } catch (e) {}
  }

  // ---------- forgetting-curve study scheduler ----------
  // "امروز چه ساعتی چه درسی": هر مبحث با یه ساعت یادآوری دلخواه ثبت می‌شه؛
  // مرورهای بعدی طبق منحنی فراموشی (۱، ۳، ۷، ۱۶ و ۳۰ روز بعد) و همیشه توی همون
  // ساعت انتخاب‌شده یادآوری می‌شن — نه صرفاً «فلان روز»، بلکه ساعت مشخص همون روز.
  var SUBJ_KEY = "sdw-forgetting-subjects"; // window.storage key, JSON array
  var FIVL_KEY = "sdw-forget-intervals"; // window.storage key, JSON array of default review days
  var DEFAULT_FORGET_INTERVALS = [1, 3, 7, 16, 30]; // منحنی علمی فراموشی، هماهنگ با بخش زبان‌آموز
  var FORGET_INTERVALS = DEFAULT_FORGET_INTERVALS.slice(); // روز بعد از ثبت — قابل شخصی‌سازی
  var subjects = [];

  function loadSubjects() {
    return window.storage.get(SUBJ_KEY).then(function (r) {
      subjects = (r && r.value) ? r.value : [];
    }).catch(function () { subjects = []; });
  }
  function saveSubjects() { return window.storage.set(SUBJ_KEY, subjects); }
  function loadForgetIntervals() {
    return window.storage.get(FIVL_KEY).then(function (r) {
      var v = (r && r.value) ? r.value : null;
      FORGET_INTERVALS = (v && v.length) ? v : DEFAULT_FORGET_INTERVALS.slice();
    }).catch(function () { FORGET_INTERVALS = DEFAULT_FORGET_INTERVALS.slice(); });
  }
  function saveForgetIntervals() { return window.storage.set(FIVL_KEY, FORGET_INTERVALS); }

  // ---------- study notes (persisted via window.storage — covered by full backup) ----------
  // notes are grouped by "subject" (e.g. شیمی) so studying can be organized per topic.
  function loadNotes() {
    return window.storage.get(NOTES_KEY).then(function (r) {
      notesCache = (r && r.value) ? r.value : [];
    }).catch(function () { notesCache = []; });
  }
  function saveNotes() { return window.storage.set(NOTES_KEY, notesCache); }
  function addNote(subject, text) {
    if (!text || !text.trim()) return Promise.resolve();
    notesCache.unshift({ id: "note-" + Date.now() + Math.random().toString(36).slice(2, 7), subject: subject || "عمومی", text: text.trim(), createdAt: new Date().toISOString() });
    return saveNotes();
  }
  function deleteNote(id) {
    notesCache = notesCache.filter(function (n) { return n.id !== id; });
    return saveNotes();
  }

  // ---------- note subjects (e.g. شیمی) ----------
  var NOTESUBJ_KEY = "sdw-note-subjects"; // window.storage key, JSON array of subject name strings
  var noteSubjects = [];
  var selectedNoteSubject = null;
  function loadNoteSubjects() {
    return window.storage.get(NOTESUBJ_KEY).then(function (r) {
      noteSubjects = (r && r.value) ? r.value : [];
    }).catch(function () { noteSubjects = []; }).then(function () {
      notesCache.forEach(function (n) {
        var s = n.subject || "عمومی";
        if (noteSubjects.indexOf(s) === -1) noteSubjects.push(s);
      });
      if (!selectedNoteSubject && noteSubjects.length) selectedNoteSubject = noteSubjects[0];
    });
  }
  function saveNoteSubjects() { return window.storage.set(NOTESUBJ_KEY, noteSubjects); }
  function addNoteSubject(name) {
    name = (name || "").trim();
    if (!name || noteSubjects.indexOf(name) !== -1) { if (name) selectedNoteSubject = name; return Promise.resolve(); }
    noteSubjects.push(name);
    selectedNoteSubject = name;
    return saveNoteSubjects();
  }
  function deleteNoteSubject(name) {
    if (!window.confirm('موضوع «' + name + '» و همه‌ی یادداشت‌های زیرش حذف بشه؟')) return Promise.resolve();
    noteSubjects = noteSubjects.filter(function (s) { return s !== name; });
    notesCache = notesCache.filter(function (n) { return (n.subject || "عمومی") !== name; });
    if (selectedNoteSubject === name) selectedNoteSubject = noteSubjects.length ? noteSubjects[0] : null;
    return Promise.all([saveNoteSubjects(), saveNotes()]);
  }

  // ---------- backup / restore just for this section (study assistant) ----------
  // Covers every window.storage key prefixed "sdw-" (daily study-minute logs, notes,
  // forgetting-curve subjects/intervals, the day/week/month study time-block planner)
  // plus the small localStorage settings (pomodoro durations, sound, tick). Nothing
  // from the rest of the bullet journal (tasks, habits, goals, ...) is touched.
  var SDW_LOCAL_KEYS = [SETTINGS_KEY, SOUND_KEY, TICK_KEY, "sdwBreathePattern"];

  // ---------- Jalali (Shamsi) calendar helpers, just for the range-backup date pickers ----------
  var SDW_JA_MONTH_NAMES = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
  var SDW_JA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  function sdwJaNum(n) { return String(n).split("").map(function (c) { return SDW_JA_DIGITS[c] !== undefined ? SDW_JA_DIGITS[c] : c; }).join(""); }
  function sdwPad2(n) { return String(n).padStart(2, "0"); }
  function sdwGDateStr(d) { return d.getFullYear() + "-" + sdwPad2(d.getMonth() + 1) + "-" + sdwPad2(d.getDate()); }
  function sdwJaParts(d) {
    var parts = new Intl.DateTimeFormat("en-US-u-ca-persian", { year: "numeric", month: "numeric", day: "numeric" }).formatToParts(d);
    var o = {};
    parts.forEach(function (x) { if (x.type !== "literal") o[x.type] = parseInt(x.value, 10); });
    return { jy: o.year, jm: o.month, jd: o.day };
  }
  function sdwJaFirstOfYear(jy) {
    var base = new Date(jy + 621, 1, 10);
    for (var i = 0; i < 70; i++) {
      var d = new Date(base); d.setDate(d.getDate() + i);
      var p = sdwJaParts(d);
      if (p.jy === jy && p.jm === 1 && p.jd === 1) return d;
    }
    return base;
  }
  function sdwJaMonthLen(jy, jm) {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    var y0 = sdwJaFirstOfYear(jy), y1 = sdwJaFirstOfYear(jy + 1);
    var total = Math.round((y1 - y0) / 86400000);
    return total - 336;
  }
  function sdwJaFirstOfMonth(jy, jm) {
    if (jm === 1) return sdwJaFirstOfYear(jy);
    var d = sdwJaFirstOfYear(jy);
    for (var k = 1; k < jm; k++) { d = new Date(d); d.setDate(d.getDate() + sdwJaMonthLen(jy, k)); }
    return d;
  }
  function sdwJalaliToGregorianStr(jy, jm, jd) {
    var d = new Date(sdwJaFirstOfMonth(jy, jm));
    d.setDate(d.getDate() + (jd - 1));
    return sdwGDateStr(d);
  }

  // "dated" keys are the ones tied to a specific calendar day (daily study-minute log
  // and the day/week/month time-block plan) — these are what a date-range backup filters.
  // Everything else in the section (notes, forgetting-curve subjects/intervals, pomodoro
  // settings) isn't tied to a day, so it's always included in full either way.
  function sdwDatedKeyDate(key) {
    var m = /^sdw-(?:log|plan)-(\d{4}-\d{2}-\d{2})$/.exec(key);
    return m ? m[1] : null;
  }
  function sdwGatherBackupData(range) {
    // range: null for everything, or { from: "YYYY-MM-DD", to: "YYYY-MM-DD" } to only
    // include dated entries (study log + plan) inside that window.
    return window.storage.list("sdw-").catch(function () { return []; }).then(function (keys) {
      var list = (keys || []).filter(function (k) {
        if (!range) return true;
        var d = sdwDatedKeyDate(k);
        if (!d) return true; // non-dated data always comes along in full
        return d >= range.from && d <= range.to;
      });
      return Promise.all(list.map(function (k) {
        return window.storage.get(k).then(function (r) {
          return [k, (r && r.value !== undefined) ? r.value : null];
        }).catch(function () { return [k, null]; });
      }));
    }).then(function (pairs) {
      var data = {};
      pairs.forEach(function (p) { if (p[1] !== null) data[p[0]] = p[1]; });
      var localData = {};
      SDW_LOCAL_KEYS.forEach(function (k) {
        try { var v = localStorage.getItem(k); if (v !== null) localData[k] = v; } catch (e) {}
      });
      return { __sdwBackup: true, version: 1, exportedAt: new Date().toISOString(), range: range || null, data: data, localStorage: localData };
    });
  }
  function sdwSetBackupStatus(msg) {
    var el = document.getElementById("sdw-backup-status");
    if (el) el.textContent = msg;
  }
  function sdwDownloadBackup(range) {
    sdwSetBackupStatus("در حال آماده‌سازی فایل پشتیبان...");
    sdwGatherBackupData(range).then(function (payload) {
      var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      var dateStr = new Date().toISOString().slice(0, 10);
      var fname = range
        ? "study-assistant-backup-" + range.from + "-to-" + range.to + ".json"
        : "study-assistant-backup-" + dateStr + ".json";
      a.href = url; a.download = fname;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      sdwSetBackupStatus(range
        ? "فایل پشتیبان بازه‌ی " + range.from + " تا " + range.to + " دانلود شد."
        : "فایل پشتیبان بخش درسی دانلود شد.");
    }).catch(function (e) {
      console.error("sdw backup export failed", e);
      sdwSetBackupStatus("دانلود فایل پشتیبان با خطا مواجه شد.");
    });
  }
  function sdwRefreshAfterRestore() {
    settings = loadSettings();
    if (state.phase === "idle") state.remaining = settings.work * 60;
    try { tickEnabled = localStorage.getItem(TICK_KEY) === "1"; } catch (e) {}
    try { currentSound = localStorage.getItem(SOUND_KEY) || "white"; } catch (e) {}
    return Promise.all([loadSubjects(), loadForgetIntervals(), loadNotes()]).then(function () {
      return loadNoteSubjects();
    }).then(function () {
      renderSettingsInputs();
      renderTimer();
      renderStats();
      renderSubjectsList();
      renderForgetIntervalsList();
      renderPlanSection();
      renderNoteSubjectChips();
      renderNotesCurrent();
    });
  }
  function sdwRestoreBackup(file, replaceMode) {
    var reader = new FileReader();
    reader.onload = function () {
      var parsed;
      try {
        parsed = JSON.parse(reader.result);
        if (!parsed || typeof parsed !== "object" || !parsed.data || typeof parsed.data !== "object") throw new Error("bad-shape");
      } catch (e) {
        sdwSetBackupStatus("این فایل، فایل پشتیبان معتبر بخش درسی نیست.");
        return;
      }
      var incomingKeys = Object.keys(parsed.data).filter(function (k) { return k.indexOf("sdw-") === 0; });
      var backupRange = (parsed.range && parsed.range.from && parsed.range.to) ? parsed.range : null;
      var writeAll = function () {
        return Promise.all(incomingKeys.map(function (k) {
          return window.storage.set(k, parsed.data[k]).catch(function () {});
        })).then(function () {
          if (parsed.localStorage && typeof parsed.localStorage === "object") {
            SDW_LOCAL_KEYS.forEach(function (k) {
              if (Object.prototype.hasOwnProperty.call(parsed.localStorage, k)) {
                try { localStorage.setItem(k, parsed.localStorage[k]); } catch (e) {}
              }
            });
          }
        });
      };
      sdwSetBackupStatus("در حال بازیابی فایل پشتیبان...");
      // In replace mode, only clear what the backup actually covers: if it's a date-range
      // backup, only dated entries (log/plan) inside that same window get removed when
      // missing from the file — older days outside the range are left untouched. A full
      // (non-ranged) backup keeps replacing everything, as before.
      var chain = replaceMode
        ? window.storage.list("sdw-").catch(function () { return []; }).then(function (existing) {
            var toDelete = (existing || []).filter(function (k) {
              if (incomingKeys.indexOf(k) !== -1) return false;
              if (!backupRange) return true;
              var d = sdwDatedKeyDate(k);
              if (!d) return true; // non-dated data: backup always carries the full current set
              return d >= backupRange.from && d <= backupRange.to;
            });
            return Promise.all(toDelete.map(function (k) { return window.storage.delete(k).catch(function () {}); }));
          }).then(writeAll)
        : writeAll();
      chain.then(sdwRefreshAfterRestore).then(function () {
        sdwSetBackupStatus(replaceMode
          ? (backupRange
              ? "بازیابی انجام شد؛ بازه‌ی " + backupRange.from + " تا " + backupRange.to + " به‌طور کامل جایگزین شد (روزهای بیرون این بازه دست‌نخورده موندن)."
              : "بازیابی انجام شد و اطلاعات قبلی این بخش به‌طور کامل جایگزین شد.")
          : "بازیابی با موفقیت انجام شد (روی اطلاعات فعلی اضافه/به‌روزرسانی شد).");
      }).catch(function (e) {
        console.error("sdw restore failed", e);
        sdwSetBackupStatus("بازیابی فایل پشتیبان با خطا مواجه شد.");
      });
    };
    reader.onerror = function () { sdwSetBackupStatus("خواندن فایل با خطا مواجه شد."); };
    reader.readAsText(file);
  }
  function fmtNoteDate(iso) {
    try { return new Date(iso).toLocaleDateString("fa-IR", { month: "short", day: "numeric" }) + " - " + new Date(iso).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }); }
    catch (e) { return ""; }
  }
  function renderNoteSubjectChips() {
    var wrap = document.getElementById("sdw-notesubj-chips");
    if (!wrap) return;
    if (noteSubjects.length === 0) {
      wrap.innerHTML = '<div class="sdw-subj-empty" style="padding:6px 0;">هنوز موضوعی نساختی — یکی بساز (مثلاً «شیمی») و یادداشت‌هات رو زیرش بنویس.</div>';
      return;
    }
    var html = "";
    noteSubjects.forEach(function (s) {
      var cnt = notesCache.filter(function (n) { return (n.subject || "عمومی") === s; }).length;
      var esc = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      html += '<div class="sdw-notesubj-chip' + (s === selectedNoteSubject ? " active" : "") + '" data-notesubj="' + esc + '">' +
        '<span>' + esc + (cnt ? (" (" + faNum(cnt) + ")") : "") + '</span>' +
        '<span class="del" data-delnotesubj="' + esc + '">✕</span>' +
      '</div>';
    });
    wrap.innerHTML = html;
    wrap.querySelectorAll("[data-notesubj]").forEach(function (chip) {
      chip.addEventListener("click", function (ev) {
        if (ev.target && ev.target.hasAttribute("data-delnotesubj")) return;
        selectedNoteSubject = chip.getAttribute("data-notesubj");
        renderNoteSubjectChips();
        renderNotesCurrent();
      });
    });
    wrap.querySelectorAll("[data-delnotesubj]").forEach(function (btn) {
      btn.addEventListener("click", function (ev) {
        ev.stopPropagation();
        deleteNoteSubject(btn.getAttribute("data-delnotesubj")).then(function () {
          renderNoteSubjectChips();
          renderNotesCurrent();
        });
      });
    });
  }
  function renderNotesCurrent() {
    var wrap = document.getElementById("sdw-notes-current");
    if (!wrap) return;
    if (!selectedNoteSubject) { wrap.innerHTML = ""; return; }
    var subj = selectedNoteSubject;
    var subjEsc = subj.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    var list = notesCache.filter(function (n) { return (n.subject || "عمومی") === subj; });
    wrap.innerHTML =
      '<h3>یادداشت‌های «' + subjEsc + '»</h3>' +
      '<textarea id="sdw-note-input" rows="3" placeholder="یادداشت جدید..." style="width:100%; resize:vertical; background:var(--bg3); border:1px solid var(--border); border-radius:8px; padding:9px 10px; color:var(--text); font-size:12.5px; font-family:inherit; box-sizing:border-box; margin-bottom:8px;"></textarea>' +
      '<button class="sdw-save-settings" id="sdw-note-add-btn">+ افزودن یادداشت</button>' +
      '<div id="sdw-notes-list" style="margin-top:10px;"></div>';
    document.getElementById("sdw-note-add-btn").addEventListener("click", function () {
      var ta = document.getElementById("sdw-note-input");
      if (!ta.value.trim()) return;
      addNote(subj, ta.value).then(function () { ta.value = ""; renderNoteSubjectChips(); renderNotesCurrent(); });
    });
    var listWrap = document.getElementById("sdw-notes-list");
    if (list.length === 0) {
      listWrap.innerHTML = '<div class="sdw-subj-empty" style="padding:10px 0;">هنوز یادداشتی زیر این موضوع ثبت نشده.</div>';
      return;
    }
    var html = "";
    list.forEach(function (n) {
      html += '<div style="background:var(--bg3); border:1px solid var(--border); border-radius:10px; padding:9px 10px; margin-bottom:8px;">' +
        '<div style="display:flex; align-items:flex-start; justify-content:space-between; gap:8px;">' +
          '<div style="flex:1; min-width:0; font-size:12.5px; color:var(--text); white-space:pre-wrap; line-height:1.7;">' + n.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") + '</div>' +
          '<button data-delnote="' + n.id + '" title="حذف" style="background:none; border:none; color:var(--muted); cursor:pointer; font-size:14px; flex-shrink:0; padding:0;">✕</button>' +
        '</div>' +
        '<div style="font-size:10px; color:var(--muted2); margin-top:5px;">' + fmtNoteDate(n.createdAt) + '</div>' +
      '</div>';
    });
    listWrap.innerHTML = html;
    listWrap.querySelectorAll("[data-delnote]").forEach(function (btn) {
      btn.onclick = function () {
        deleteNote(btn.getAttribute("data-delnote")).then(function () { renderNoteSubjectChips(); renderNotesCurrent(); });
      };
    });
  }

  function reviewDateTime(subject, review) {
    var d = new Date(subject.createdAt + "T00:00:00");
    d.setDate(d.getDate() + review.days);
    d.setHours(subject.hour, subject.minute, 0, 0);
    return d;
  }
  function nextPendingIndex(subject) {
    for (var i = 0; i < subject.reviews.length; i++) if (!subject.reviews[i].done) return i;
    return -1;
  }
  function requestNotifyPermission() {
    try { if (window.Notification && Notification.permission === "default") Notification.requestPermission(); } catch (e) {}
    try { window.requestRealAlarmPermission && window.requestRealAlarmPermission(); } catch (e) {}
  }
  // آلارم واقعی سیستم‌عامل برای همه‌ی مرورهای دوره‌ایِ هنوز سررسیدنشده (پشتیبان
  // برای وقتی اپ بسته/پس‌زمینه‌ست). صدا زدنش بی‌خطره و می‌شه چندبار تکرار زد،
  // چون هر آلارم با همون آی‌دی دوباره‌نویسی می‌شه.
  function scheduleReviewRealAlarms() {
    if (!window.scheduleRealAlarm) return;
    var now = Date.now();
    subjects.forEach(function (s) {
      s.reviews.forEach(function (r) {
        if (r.done) return;
        var dt = reviewDateTime(s, r);
        if (dt.getTime() <= now) return;
        window.scheduleRealAlarm("sdw-review-" + s.id + "-" + r.days, "⏰ وقت مرور رسید", s.name + " — وقتشه دوباره مرورش کنی.", dt);
      });
    });
  }
  function addSubject(name, hh, mm, baseDate) {
    var reviews = FORGET_INTERVALS.map(function (d) { return { days: d, done: false, notified: false }; });
    subjects.push({
      id: "subj-" + Date.now() + Math.random().toString(36).slice(2, 7),
      name: name, hour: hh, minute: mm,
      createdAt: toISODateStr(baseDate || new Date()),
      reviews: reviews
    });
    scheduleReviewRealAlarms();
    return saveSubjects();
  }
  function addExtraReview(id, days) {
    var s = subjects.filter(function (x) { return x.id === id; })[0];
    if (!s || !days || days < 1) return Promise.resolve();
    // اگه یادآوری با همون تعداد روز از قبل هست، دوباره اضافه نکن
    var exists = s.reviews.some(function (r) { return r.days === days; });
    if (exists) return Promise.resolve();
    s.reviews.push({ days: days, done: false, notified: false });
    s.reviews.sort(function (a, b) { return a.days - b.days; });
    return saveSubjects();
  }
  function deleteReview(id, days) {
    var s = subjects.filter(function (x) { return x.id === id; })[0];
    if (!s) return Promise.resolve();
    s.reviews = s.reviews.filter(function (r) { return r.days !== days; });
    return saveSubjects();
  }
  function resetSubjectToDefault(id) {
    var s = subjects.filter(function (x) { return x.id === id; })[0];
    if (!s) return Promise.resolve();
    s.reviews = FORGET_INTERVALS.map(function (d) { return { days: d, done: false, notified: false }; });
    return saveSubjects();
  }
  function markNextReviewDone(id) {
    var s = subjects.filter(function (x) { return x.id === id; })[0];
    if (!s) return;
    var idx = nextPendingIndex(s);
    if (idx === -1) return;
    s.reviews[idx].done = true;
    saveSubjects().then(renderSubjectsList);
  }
  function deleteSubject(id) {
    subjects = subjects.filter(function (x) { return x.id !== id; });
    saveSubjects().then(renderSubjectsList);
  }

  function renderForgetIntervalsList() {
    var wrap = document.getElementById("sdw-fivl-list");
    if (!wrap) return;
    var html = "";
    FORGET_INTERVALS.forEach(function (d, i) {
      html += '<div class="sdw-revchip"><span>روز ' + faNum(d) + '</span>' +
        '<button class="sdw-revchip-x" data-delfivl="' + i + '" title="حذف">✕</button></div>';
    });
    if (FORGET_INTERVALS.length === 0) html = '<div class="sdw-subj-empty" style="padding:6px 0;">هیچ فاصله‌ای نمونده</div>';
    wrap.innerHTML = html;
    wrap.querySelectorAll("[data-delfivl]").forEach(function (btn) {
      btn.onclick = function () {
        var i = parseInt(btn.getAttribute("data-delfivl"), 10);
        FORGET_INTERVALS.splice(i, 1);
        saveForgetIntervals().then(renderForgetIntervalsList);
      };
    });
  }

  // ---------- study plan blocks: storage ----------
  function planKey(d) { return PLAN_KEY_PREFIX + toISODateStr(d); }
  function loadPlanDay(d) {
    return window.storage.get(planKey(d)).then(function (r) { return (r && r.value) ? r.value : []; }).catch(function () { return []; });
  }
  function savePlanDay(d, arr) { return window.storage.set(planKey(d), arr); }
  function sortBlocks(arr) {
    return arr.slice().sort(function (a, b) { return a.start < b.start ? -1 : (a.start > b.start ? 1 : 0); });
  }
  function addPlanBlock(d, subject, start, end) {
    return loadPlanDay(d).then(function (arr) {
      arr.push({ id: "pb-" + Date.now() + Math.random().toString(36).slice(2, 7), subject: subject, start: start, end: end, done: false });
      return savePlanDay(d, sortBlocks(arr));
    });
  }
  function togglePlanBlock(d, id) {
    return loadPlanDay(d).then(function (arr) {
      var target = null;
      arr.forEach(function (b) { if (b.id === id) { b.done = !b.done; target = b; } });
      var p = savePlanDay(d, arr);
      // اگه این بلوک از یه یادآوریِ مرور دوره‌ای اومده، تیک زدنش وضعیت همون مرور رو هم به‌روز کنه
      if (target && target.reviewRef) {
        var s = subjects.filter(function (x) { return x.id === target.reviewRef.subjectId; })[0];
        if (s) {
          var rv = s.reviews.filter(function (x) { return x.days === target.reviewRef.days; })[0];
          if (rv) {
            rv.done = target.done;
            p = p.then(function () { return saveSubjects(); }).then(function () { renderSubjectsList(); });
          }
        }
      }
      return p;
    });
  }
  function deletePlanBlock(d, id) {
    return loadPlanDay(d).then(function (arr) {
      return savePlanDay(d, arr.filter(function (b) { return b.id !== id; }));
    });
  }
  // ---------- ستاره‌زدن درسِ تمام‌شده: مستقیم به برنامه‌ی مرور دوره‌ای (یادآوری) اضافه می‌شه ----------
  function starPlanBlock(d, id) {
    return loadPlanDay(d).then(function (arr) {
      var b = arr.filter(function (x) { return x.id === id; })[0];
      if (!b || !b.done || b.starred) return Promise.resolve();
      b.starred = true;
      var parts = (b.start || "20:00").split(":");
      var hh = parseInt(parts[0], 10), mm = parseInt(parts[1], 10);
      return savePlanDay(d, arr).then(function () {
        requestNotifyPermission();
        return addSubject(b.subject, hh, mm, d);
      }).then(function () {
        renderSubjectsList();
      });
    });
  }
  // ---------- همگام‌سازیِ خودکار: یادآوری‌های دوره‌ایِ سررسیدشده‌ی همون روز، مستقیم توی برنامه‌ی همون روز نشون داده بشن ----------
  var AUTOSYNC_KEY = "sdw-auto-plan-sync";
  var autoSyncReviews = false;
  function loadAutoSync() {
    return window.storage.get(AUTOSYNC_KEY).then(function (r) {
      autoSyncReviews = !!(r && r.value);
    }).catch(function () { autoSyncReviews = false; });
  }
  function saveAutoSync() { return window.storage.set(AUTOSYNC_KEY, autoSyncReviews); }
  function syncDueReviewsIntoPlan(d) {
    if (!autoSyncReviews) return Promise.resolve();
    var dayStr = toISODateStr(d);
    var due = [];
    subjects.forEach(function (s) {
      s.reviews.forEach(function (r) {
        if (r.done) return;
        if (toISODateStr(reviewDateTime(s, r)) === dayStr) due.push({ s: s, r: r });
      });
    });
    if (due.length === 0) return Promise.resolve();
    return loadPlanDay(d).then(function (arr) {
      var changed = false;
      due.forEach(function (item) {
        var exists = arr.some(function (b) { return b.reviewRef && b.reviewRef.subjectId === item.s.id && b.reviewRef.days === item.r.days; });
        if (exists) return;
        var startStr = sdwPad2(item.s.hour) + ":" + sdwPad2(item.s.minute);
        var endD = new Date(); endD.setHours(item.s.hour, item.s.minute + 30, 0, 0);
        var endStr = sdwPad2(endD.getHours()) + ":" + sdwPad2(endD.getMinutes());
        arr.push({
          id: "pb-" + Date.now() + Math.random().toString(36).slice(2, 7),
          subject: "🔁 مرور: " + item.s.name, start: startStr, end: endStr, done: false,
          reviewRef: { subjectId: item.s.id, days: item.r.days }
        });
        changed = true;
      });
      if (!changed) return Promise.resolve();
      return savePlanDay(d, sortBlocks(arr));
    });
  }
  function notifySubjectReview(name) {
    try {
      if (window.Notification && Notification.permission === "granted") {
        new Notification("⏰ وقت مرور رسید", { body: name + " — وقتشه دوباره مرورش کنی." });
      }
    } catch (e) {}
    beep();
  }
  function checkDueReviews() {
    var now = new Date(), changed = false;
    scheduleReviewRealAlarms();
    subjects.forEach(function (s) {
      s.reviews.forEach(function (r) {
        if (!r.done && !r.notified && reviewDateTime(s, r) <= now) {
          r.notified = true; changed = true;
          notifySubjectReview(s.name);
        }
      });
    });
    if (changed) saveSubjects();
  }
  function renderSubjectsList() {
    var wrap = document.getElementById("sdw-subj-list");
    if (!wrap) return;
    if (subjects.length === 0) {
      wrap.innerHTML = '<div class="sdw-subj-empty">هنوز درسی برای مرور دوره‌ای ثبت نکردی.</div>';
      return;
    }
    var sorted = subjects.slice().sort(function (a, b) {
      var ia = nextPendingIndex(a), ib = nextPendingIndex(b);
      var da = ia === -1 ? Infinity : reviewDateTime(a, a.reviews[ia]).getTime();
      var db = ib === -1 ? Infinity : reviewDateTime(b, b.reviews[ib]).getTime();
      return da - db;
    });
    var html = "";
    sorted.forEach(function (s) {
      var idx = nextPendingIndex(s);
      var nextHtml, markBtn = "";
      if (idx === -1) {
        nextHtml = '<div class="sdw-subj-next done">✅ چرخه مرور کامل شد</div>';
      } else if (s.reviews.length === 0) {
        nextHtml = '<div class="sdw-subj-next done">هیچ مروری تعریف نشده</div>';
      } else {
        var dt = reviewDateTime(s, s.reviews[idx]);
        var overdue = dt <= new Date();
        nextHtml = '<div class="sdw-subj-next">' + (overdue ? "🔔 الان وقت مروره — " : "مرور بعدی: ") +
          fmtDateFa(dt) + ' ساعت ' + fmtHM(s.hour, s.minute) + '</div>';
        markBtn = '<button class="sdw-subj-markdone" data-mark="' + s.id + '">✔ این مرور رو انجام دادم</button>';
      }
      var revChips = "";
      var now = new Date();
      s.reviews.forEach(function (r) {
        var dt2 = reviewDateTime(s, r);
        var cls = r.done ? "done" : (dt2 <= now ? "overdue" : "");
        revChips += '<div class="sdw-revchip' + (cls ? " " + cls : "") + '">' +
          '<span>روز ' + faNum(r.days) + (r.done ? " ✔" : "") + '</span>' +
          '<button class="sdw-revchip-x" data-delrev="' + s.id + '" data-delday="' + r.days + '" title="حذف این مرور">✕</button>' +
          '</div>';
      });
      if (s.reviews.length === 0) revChips = '<div class="sdw-subj-empty" style="padding:6px 0;">مروری باقی نمونده</div>';
      html += '<div class="sdw-subj-card">' +
        '<div class="sdw-subj-top"><div class="sdw-subj-name">' + s.name + '</div>' +
        '<button class="sdw-subj-del" data-del="' + s.id + '">🗑</button></div>' +
        nextHtml + markBtn +
        '<div class="sdw-revlist-label">روزهای مرور (می‌تونی هرکدوم رو حذف کنی):</div>' +
        '<div class="sdw-revlist">' + revChips + '</div>' +
        '<div class="sdw-addrev-row">' +
          '<input type="number" min="1" placeholder="مثلاً ۲۰" id="sdw-addrev-input-' + s.id + '">' +
          '<button data-addrev="' + s.id + '">+ افزودن مرور جدید (روز بعد)</button>' +
        '</div>' +
        '<div class="sdw-reset-row"><button class="sdw-reset-btn" data-reset="' + s.id + '">↺ بازگشت به فاصله‌های پیش‌فرض فعلی (' + FORGET_INTERVALS.map(faNum).join('، ') + ')</button></div>' +
        '</div>';
    });
    wrap.innerHTML = html;
    wrap.querySelectorAll("[data-mark]").forEach(function (btn) {
      btn.onclick = function () { markNextReviewDone(btn.getAttribute("data-mark")); };
    });
    wrap.querySelectorAll("[data-del]").forEach(function (btn) {
      btn.onclick = function () { deleteSubject(btn.getAttribute("data-del")); };
    });
    wrap.querySelectorAll("[data-addrev]").forEach(function (btn) {
      btn.onclick = function () {
        var id = btn.getAttribute("data-addrev");
        var input = document.getElementById("sdw-addrev-input-" + id);
        var n = parseInt(input.value, 10);
        if (!n || n < 1) return;
        requestNotifyPermission();
        addExtraReview(id, n).then(renderSubjectsList);
      };
    });
    wrap.querySelectorAll("[data-delrev]").forEach(function (btn) {
      btn.onclick = function () {
        var id = btn.getAttribute("data-delrev");
        var days = parseInt(btn.getAttribute("data-delday"), 10);
        deleteReview(id, days).then(renderSubjectsList);
      };
    });
    wrap.querySelectorAll("[data-reset]").forEach(function (btn) {
      btn.onclick = function () {
        resetSubjectToDefault(btn.getAttribute("data-reset")).then(renderSubjectsList);
      };
    });
  }

  // ---------- study plan: rendering (day / week / month) ----------
  function renderPlanSection() {
    var root = document.getElementById("sdw-plan-section");
    if (!root) return;
    root.innerHTML =
      '<div class="sdw-plan-tabs">' +
        '<button class="sdw-plan-tab' + (planView === "day" ? " active" : "") + '" data-pview="day">روز</button>' +
        '<button class="sdw-plan-tab' + (planView === "week" ? " active" : "") + '" data-pview="week">هفته</button>' +
        '<button class="sdw-plan-tab' + (planView === "month" ? " active" : "") + '" data-pview="month">ماه</button>' +
      '</div>' +
      '<div id="sdw-plan-body"></div>';
    root.querySelectorAll("[data-pview]").forEach(function (btn) {
      btn.onclick = function () { planView = btn.getAttribute("data-pview"); renderPlanSection(); };
    });
    if (planView === "day") renderPlanDayView();
    else if (planView === "week") renderPlanWeekView();
    else renderPlanMonthView();
  }

  function renderPlanDayView() {
    var body = document.getElementById("sdw-plan-body");
    if (!body) return;
    var label = planDate.toLocaleDateString("fa-IR", { weekday: "long", day: "numeric", month: "long" });
    var isToday = toISODateStr(planDate) === toISODateStr(new Date());
    body.innerHTML =
      '<div class="sdw-plan-nav">' +
        '<button class="sdw-plan-navbtn" id="sdw-plan-prev">‹</button>' +
        '<div class="sdw-plan-daylabel">' + label + (isToday ? ' <span class="sdw-plan-today-badge">امروز</span>' : '') + '</div>' +
        '<button class="sdw-plan-navbtn" id="sdw-plan-next">›</button>' +
      '</div>' +
      '<div class="sdw-plan-add-row">' +
        '<input type="text" id="sdw-plan-subj" placeholder="اسم درس یا مبحث">' +
        '<div class="sdw-plan-time-row">' +
          '<input type="time" id="sdw-plan-start" value="17:00">' +
          '<span class="sdw-plan-time-sep">تا</span>' +
          '<input type="time" id="sdw-plan-end" value="18:00">' +
        '</div>' +
        '<button class="sdw-save-settings" id="sdw-plan-add-btn">+ افزودن به برنامه این روز</button>' +
      '</div>' +
      '<div id="sdw-plan-list"></div>';

    document.getElementById("sdw-plan-prev").addEventListener("click", function () { planDate = addDays(planDate, -1); renderPlanDayView(); });
    document.getElementById("sdw-plan-next").addEventListener("click", function () { planDate = addDays(planDate, 1); renderPlanDayView(); });
    document.getElementById("sdw-plan-add-btn").addEventListener("click", function () {
      var subjEl = document.getElementById("sdw-plan-subj");
      var startEl = document.getElementById("sdw-plan-start");
      var endEl = document.getElementById("sdw-plan-end");
      var subject = subjEl.value.trim();
      if (!subject) return;
      var start = startEl.value || "17:00";
      var end = endEl.value || "18:00";
      if (end <= start) end = start;
      addPlanBlock(planDate, subject, start, end).then(function () {
        subjEl.value = "";
        renderPlanList();
      });
    });
    renderPlanList();
  }

  function renderPlanList() {
    var wrap = document.getElementById("sdw-plan-list");
    if (!wrap) return;
    syncDueReviewsIntoPlan(planDate).then(function () {
      return loadPlanDay(planDate);
    }).then(function (arr) {
      if (!arr.length) {
        wrap.innerHTML = '<div class="sdw-plan-empty">برای این روز هنوز درسی برنامه‌ریزی نشده.</div>';
        return;
      }
      var html = "";
      sortBlocks(arr).forEach(function (b) {
        var starBtn = "";
        if (b.reviewRef) {
          starBtn = ""; // بلوکِ خودِ یادآوریه، ستاره لازم نداره
        } else if (b.starred) {
          starBtn = '<button class="sdw-plan-block-star starred" title="به برنامه مرور دوره‌ای اضافه شد" disabled>⭐</button>';
        } else if (b.done) {
          starBtn = '<button class="sdw-plan-block-star" data-pstar="' + b.id + '" title="ستاره بزن تا به برنامه مرور دوره‌ای (یادآوری) اضافه بشه">☆</button>';
        }
        html += '<div class="sdw-plan-block' + (b.done ? " done" : "") + (b.reviewRef ? " is-review" : "") + '">' +
          '<button class="sdw-plan-block-check" data-ptoggle="' + b.id + '">' + (b.done ? "✔" : "") + '</button>' +
          '<div class="sdw-plan-block-main">' +
            '<div class="sdw-plan-block-time">' + faNum(b.start) + ' – ' + faNum(b.end) + '</div>' +
            '<div class="sdw-plan-block-name">' + b.subject + '</div>' +
          '</div>' +
          '<button class="sdw-plan-block-transfer" data-ptransfer="' + b.id + '" title="این مورد را به بخش روزانه اضافه کن">➕ روزانه</button>' +
          starBtn +
          '<button class="sdw-plan-block-del" data-pdel="' + b.id + '">🗑</button>' +
        '</div>';
      });
      wrap.innerHTML = html;
      wrap.querySelectorAll("[data-ptoggle]").forEach(function (btn) {
        btn.onclick = function () { togglePlanBlock(planDate, btn.getAttribute("data-ptoggle")).then(renderPlanList); };
      });
      wrap.querySelectorAll("[data-pdel]").forEach(function (btn) {
        btn.onclick = function () { deletePlanBlock(planDate, btn.getAttribute("data-pdel")).then(renderPlanList); };
      });
      wrap.querySelectorAll("[data-pstar]").forEach(function (btn) {
        btn.onclick = function () { starPlanBlock(planDate, btn.getAttribute("data-pstar")).then(renderPlanList); };
      });
      wrap.querySelectorAll("[data-ptransfer]").forEach(function (btn) {
        btn.onclick = function () {
          var bid = btn.getAttribute("data-ptransfer");
          var blk = arr.filter(function (x) { return x.id === bid; })[0];
          if (!blk) return;
          if (!window.bjAddTaskToDay) { window.alert("امکان انتقال به روزانه در دسترس نیست."); return; }
          window.bjAddTaskToDay(toISODateStr(planDate), "iu", blk.subject, { time: blk.start });
          btn.textContent = "✔ اضافه شد";
          btn.disabled = true;
        };
      });
    });
  }

  function renderPlanWeekView() {
    var body = document.getElementById("sdw-plan-body");
    if (!body) return;
    var startOfWeek = addDays(planDate, -planDate.getDay());
    var endOfWeek = addDays(startOfWeek, 6);
    var todayKeyStr = toISODateStr(new Date());
    var label = startOfWeek.toLocaleDateString("fa-IR", { day: "numeric", month: "long" }) + ' تا ' +
      endOfWeek.toLocaleDateString("fa-IR", { day: "numeric", month: "long" });
    body.innerHTML =
      '<div class="sdw-plan-nav">' +
        '<button class="sdw-plan-navbtn" id="sdw-plan-wprev">‹</button>' +
        '<div class="sdw-plan-daylabel">' + label + '</div>' +
        '<button class="sdw-plan-navbtn" id="sdw-plan-wnext">›</button>' +
      '</div>' +
      '<div id="sdw-plan-week-list"></div>';
    document.getElementById("sdw-plan-wprev").addEventListener("click", function () { planDate = addDays(planDate, -7); renderPlanWeekView(); });
    document.getElementById("sdw-plan-wnext").addEventListener("click", function () { planDate = addDays(planDate, 7); renderPlanWeekView(); });

    var days = [];
    for (var i = 0; i < 7; i++) days.push(addDays(startOfWeek, i));
    Promise.all(days.map(loadPlanDay)).then(function (results) {
      var listEl = document.getElementById("sdw-plan-week-list");
      if (!listEl) return;
      var html = "";
      days.forEach(function (d, idx) {
        var arr = sortBlocks(results[idx]);
        var isToday = toISODateStr(d) === todayKeyStr;
        var wLabel = d.toLocaleDateString("fa-IR", { weekday: "long", day: "numeric" });
        var itemsHtml = arr.length
          ? arr.map(function (b) {
              return '<div class="sdw-plan-week-item' + (b.done ? " done" : "") + '">' +
                '<span class="sdw-plan-week-time">' + faNum(b.start) + '</span><span>' + b.subject + '</span></div>';
            }).join("")
          : '<div class="sdw-plan-week-empty">برنامه‌ای ثبت نشده</div>';
        html += '<div class="sdw-plan-week-day' + (isToday ? " today" : "") + '" data-pweekday="' + toISODateStr(d) + '">' +
          '<div class="sdw-plan-week-daylabel">' + wLabel + (isToday ? ' <span class="sdw-plan-today-badge">امروز</span>' : '') + '</div>' +
          itemsHtml +
        '</div>';
      });
      listEl.innerHTML = html;
      listEl.querySelectorAll("[data-pweekday]").forEach(function (card) {
        card.addEventListener("click", function () {
          planDate = new Date(card.getAttribute("data-pweekday") + "T00:00:00");
          planView = "day";
          renderPlanSection();
        });
      });
    });
  }

  function renderPlanMonthView() {
    var body = document.getElementById("sdw-plan-body");
    if (!body) return;
    if (!planMonth) planMonth = jaParts(new Date());
    var jy = planMonth.jy, jm = planMonth.jm;
    var first = jaFirstOfMonth(jy, jm);
    var offset = first.getDay();
    var len = jaMonthLen(jy, jm);
    var cells = [];
    for (var i = 0; i < offset; i++) cells.push(null);
    for (var day = 1; day <= len; day++) cells.push(day);

    body.innerHTML =
      '<div class="sdw-plan-nav">' +
        '<button class="sdw-plan-navbtn" id="sdw-plan-mprev">‹</button>' +
        '<div class="sdw-plan-daylabel">' + jaMonthNames[jm - 1] + ' ' + faNum(jy) + '</div>' +
        '<button class="sdw-plan-navbtn" id="sdw-plan-mnext">›</button>' +
      '</div>' +
      '<div class="sdw-plan-month-head">' +
        ["ی","د","س","چ","پ","ج","ش"].map(function (s) { return '<div class="sdw-plan-month-hcell">' + s + '</div>'; }).join("") +
      '</div>' +
      '<div class="sdw-plan-month-grid" id="sdw-plan-month-grid"></div>';

    document.getElementById("sdw-plan-mprev").addEventListener("click", function () {
      planMonth = planMonth.jm === 1 ? { jy: planMonth.jy - 1, jm: 12 } : { jy: planMonth.jy, jm: planMonth.jm - 1 };
      renderPlanMonthView();
    });
    document.getElementById("sdw-plan-mnext").addEventListener("click", function () {
      planMonth = planMonth.jm === 12 ? { jy: planMonth.jy + 1, jm: 1 } : { jy: planMonth.jy, jm: planMonth.jm + 1 };
      renderPlanMonthView();
    });

    var dateForCell = cells.map(function (day) {
      if (day === null) return null;
      var d = new Date(first); d.setDate(first.getDate() + (day - 1));
      return d;
    });
    var todayKeyStr = toISODateStr(new Date());
    Promise.all(dateForCell.map(function (d) { return d ? loadPlanDay(d) : Promise.resolve([]); })).then(function (results) {
      var gridEl = document.getElementById("sdw-plan-month-grid");
      if (!gridEl) return;
      var html = "";
      cells.forEach(function (day, idx) {
        if (day === null) { html += '<div class="sdw-plan-month-cell empty"></div>'; return; }
        var d = dateForCell[idx];
        var count = results[idx].length;
        var isToday = toISODateStr(d) === todayKeyStr;
        html += '<div class="sdw-plan-month-cell' + (isToday ? " today" : "") + (count > 0 ? " has-plan" : "") + '" data-pmonthday="' + toISODateStr(d) + '">' +
          '<div class="sdw-plan-month-num">' + faNum(day) + '</div>' +
          (count > 0 ? '<div class="sdw-plan-month-count">' + faNum(count) + '</div>' : '') +
        '</div>';
      });
      gridEl.innerHTML = html;
      gridEl.querySelectorAll("[data-pmonthday]").forEach(function (cell) {
        cell.addEventListener("click", function () {
          planDate = new Date(cell.getAttribute("data-pmonthday") + "T00:00:00");
          planView = "day";
          renderPlanSection();
        });
      });
    });
  }

  // ---------- alert beep on phase change ----------
  function beep() {
    try {
      var ctx = ensureCtx();
      if (ctx.state === "suspended") ctx.resume();
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = 880;
      g.gain.value = 0.0001;
      o.connect(g); g.connect(ctx.destination);
      var now = ctx.currentTime;
      g.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
      o.start(now); o.stop(now + 0.55);
    } catch (e) {}
  }

  // ---------- timer engine ----------
  function phaseLabel(p) {
    if (p === "work") return "کار متمرکز";
    if (p === "short_break") return "استراحت کوتاه";
    if (p === "long_break") return "استراحت بلند";
    return "آماده شروع";
  }
  // ---- alarm when a pomodoro (or the break after it) finishes: vibration + OS
  // notification, on top of the in-app beep(), so it's noticeable even if the
  // phone's screen is off or the tab isn't in focus. Falls back silently to
  // just the beep if the browser has no vibration/Notification support or the
  // user never granted notification permission.
  function sdwAlarm(title, body) {
    try { if (navigator.vibrate) navigator.vibrate([160, 90, 160, 90, 160]); } catch (e) {}
    try {
      if (window.Notification && Notification.permission === "granted") new Notification(title, { body: body, tag: "sdw-pomodoro" });
    } catch (e) {}
  }
  // آلارم واقعی سیستم‌عامل برای پایان فاز فعلی پومودورو (کار یا استراحت)، برای
  // وقتی اپ بسته یا صفحه خاموشه. با هر بار صدا زدن، آلارم قبلی جایگزین می‌شه.
  function sdwScheduleRealAlarm() {
    try {
      window.cancelRealAlarm && window.cancelRealAlarm("sdw-pomodoro");
      if (!window.scheduleRealAlarm || !state.running) return;
      var endsAt = Date.now() + state.remaining * 1000;
      var title, body;
      if (state.phase === "work") {
        var isLong = (state.cyclesDone + 1) % settings.longEvery === 0;
        title = "⏰ پومودورو تموم شد!";
        body = "وقت " + (isLong ? "استراحت بلند" : "استراحت کوتاه") + " رسید — یه نفس بکش.";
      } else {
        title = "⏰ استراحت تموم شد";
        body = "وقت شروع پومودورو بعدیه.";
      }
      window.scheduleRealAlarm("sdw-pomodoro", title, body, endsAt);
    } catch (e) {}
  }
  function tick() {
    if (tickEnabled) playTick();
    if (state.phase === "work") state.unsavedWorkSeconds++;
    if (state.unsavedWorkSeconds >= 30) flushUnsaved();
    state.remaining--;
    if (state.remaining <= 0) {
      beep();
      if (state.phase === "work") {
        flushUnsaved();
        state.cyclesDone++;
        var isLong = state.cyclesDone % settings.longEvery === 0;
        state.phase = isLong ? "long_break" : "short_break";
        state.remaining = (isLong ? settings.long : settings.short) * 60;
        sdwAlarm("⏰ پومودورو تموم شد!", "وقت " + (isLong ? "استراحت بلند" : "استراحت کوتاه") + " رسید — یه نفس بکش.");
      } else {
        state.phase = "work";
        state.remaining = settings.work * 60;
        sdwAlarm("⏰ استراحت تموم شد", "وقت شروع پومودورو بعدیه.");
      }
      sdwScheduleRealAlarm();
      renderTips();
    }
    renderTimer();
  }
  function startTimer() {
    if (state.running) return;
    if (state.phase === "idle") { state.phase = "work"; state.remaining = settings.work * 60; renderTips(); }
    state.running = true;
    state.timerId = setInterval(tick, 1000);
    try { window.requestRealAlarmPermission && window.requestRealAlarmPermission(); } catch (e) {}
    sdwScheduleRealAlarm();
    renderTimer();
  }
  function pauseTimer() {
    state.running = false;
    if (state.timerId) clearInterval(state.timerId);
    state.timerId = null;
    try { window.cancelRealAlarm && window.cancelRealAlarm("sdw-pomodoro"); } catch (e) {}
    flushUnsaved();
    renderTimer();
  }
  function resetTimer() {
    pauseTimer();
    state.phase = "idle";
    state.cyclesDone = 0;
    state.remaining = settings.work * 60;
    renderTimer(); renderTips();
  }

  function renderTimer() {
    var clock = document.getElementById("sdw-clock");
    var label = document.getElementById("sdw-phase-label");
    var startBtn = document.getElementById("sdw-start-btn");
    var dotsWrap = document.getElementById("sdw-dots");
    if (!clock) return;
    clock.classList.toggle("ticking", tickEnabled && state.running);
    clock.textContent = fmtClock(Math.max(0, state.remaining));
    label.textContent = phaseLabel(state.phase);
    label.className = "sdw-phase-label " + state.phase;
    startBtn.textContent = state.running ? "⏸ مکث" : (state.phase === "idle" ? "▶ شروع" : "▶ ادامه");
    var doneInCycle = state.cyclesDone % settings.longEvery;
    if (doneInCycle === 0 && state.cyclesDone > 0 && state.phase === "long_break") doneInCycle = settings.longEvery;
    var dots = "";
    for (var i = 0; i < settings.longEvery; i++) {
      dots += '<div class="sdw-dot' + (i < doneInCycle ? " done" : "") + '"></div>';
    }
    dotsWrap.innerHTML = dots;
  }
  function renderTips() {
    var box = document.getElementById("sdw-tip-box");
    if (!box) return;
    var isRest = state.phase === "short_break" || state.phase === "long_break";
    var list = isRest ? REST_TIPS : WORK_TIPS;
    box.className = "sdw-tip-box " + (isRest ? "rest" : "work");
    box.textContent = list[Math.floor(Math.random() * list.length)];
  }

  function renderSettingsInputs() {
    document.getElementById("sdw-set-work").value = settings.work;
    document.getElementById("sdw-set-short").value = settings.short;
    document.getElementById("sdw-set-long").value = settings.long;
    document.getElementById("sdw-set-every").value = settings.longEvery;
  }

  // ---------- breathing focus mode (حالت تمرکز با تنفس) ----------
  var BREATHE_LS_KEY = "sdwBreathePattern"; // localStorage — last chosen breathing pattern
  var BREATH_PATTERNS = {
    box: { label: "جعبه‌ای ۴-۴-۴-۴", stages: [
      { name: "دم (از بینی)", sec: 4, cls: "grow" },
      { name: "نگه‌دار", sec: 4, cls: "hold" },
      { name: "بازدم (از دهان)", sec: 4, cls: "shrink" },
      { name: "نگه‌دار", sec: 4, cls: "hold" }
    ] },
    relax: { label: "آرامش‌بخش ۴-۷-۸", stages: [
      { name: "دم (از بینی)", sec: 4, cls: "grow" },
      { name: "نگه‌دار", sec: 7, cls: "hold" },
      { name: "بازدم (از دهان)", sec: 8, cls: "shrink" }
    ] }
  };
  var breathePattern = (function () {
    try { var v = localStorage.getItem(BREATHE_LS_KEY); return BREATH_PATTERNS[v] ? v : "box"; } catch (e) { return "box"; }
  })();
  var breatheRunning = false, breatheTimerId = null, breatheStageIdx = 0, breatheRemaining = 0, breatheCyclesDone = 0;

  function breatheChime() {
    try {
      var ctx = ensureCtx();
      if (ctx.state === "suspended") ctx.resume();
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = 523.25; // C5 — soft, calming
      g.gain.value = 0.0001;
      o.connect(g); g.connect(ctx.destination);
      var now = ctx.currentTime;
      g.gain.exponentialRampToValueAtTime(0.09, now + 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
      o.start(now); o.stop(now + 0.75);
    } catch (e) {}
  }
  function markActiveBreathePattern() {
    var row = document.getElementById("sdw-breathe-pattern-row");
    if (!row) return;
    row.querySelectorAll(".sdw-breathe-pattern-btn").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-pattern") === breathePattern);
    });
  }
  function startBreatheStage() {
    var stages = BREATH_PATTERNS[breathePattern].stages;
    var st = stages[breatheStageIdx];
    breatheRemaining = st.sec;
    var circle = document.getElementById("sdw-breathe-circle");
    var phaseEl = document.getElementById("sdw-breathe-phase");
    var countEl = document.getElementById("sdw-breathe-count");
    var cyclesEl = document.getElementById("sdw-breathe-cycles");
    if (circle) circle.className = "sdw-breathe-circle " + st.cls;
    if (phaseEl) phaseEl.textContent = st.name;
    if (countEl) countEl.textContent = faNum(st.sec);
    if (cyclesEl) cyclesEl.textContent = "دور تکمیل‌شده: " + faNum(breatheCyclesDone);
    breatheChime();
  }
  function breatheTick() {
    breatheRemaining--;
    var countEl = document.getElementById("sdw-breathe-count");
    if (countEl) countEl.textContent = faNum(Math.max(0, breatheRemaining));
    if (breatheRemaining <= 0) {
      var stages = BREATH_PATTERNS[breathePattern].stages;
      breatheStageIdx = (breatheStageIdx + 1) % stages.length;
      if (breatheStageIdx === 0) breatheCyclesDone++;
      startBreatheStage();
    }
  }
  function startBreathing() {
    if (breatheRunning) return;
    breatheRunning = true;
    breatheStageIdx = 0;
    breatheCyclesDone = 0;
    startBreatheStage();
    breatheTimerId = setInterval(breatheTick, 1000);
    var startBtn = document.getElementById("sdw-breathe-start-btn");
    if (startBtn) startBtn.textContent = "⏸ در حال تنفس…";
  }
  function stopBreathing() {
    breatheRunning = false;
    if (breatheTimerId) clearInterval(breatheTimerId);
    breatheTimerId = null;
    var circle = document.getElementById("sdw-breathe-circle");
    var phaseEl = document.getElementById("sdw-breathe-phase");
    var countEl = document.getElementById("sdw-breathe-count");
    var cyclesEl = document.getElementById("sdw-breathe-cycles");
    var startBtn = document.getElementById("sdw-breathe-start-btn");
    if (circle) circle.className = "sdw-breathe-circle";
    if (phaseEl) phaseEl.textContent = "آماده‌ای؟";
    if (countEl) countEl.textContent = "۴";
    if (cyclesEl) cyclesEl.textContent = breatheCyclesDone > 0 ? ("دور تکمیل‌شده: " + faNum(breatheCyclesDone)) : "هنوز شروع نشده";
    if (startBtn) startBtn.textContent = "▶ شروع تنفس";
  }

  function buildBody() {
    var body = document.getElementById("sdw-body");
    body.innerHTML =
      '<div class="sdw-tabbar">' +
        '<button class="sdw-tabbtn active" data-sdwtab="timer"><span class="ic">⏱️</span>تایمر</button>' +
        '<button class="sdw-tabbtn" data-sdwtab="plan"><span class="ic">🗓️</span>برنامه</button>' +
        '<button class="sdw-tabbtn" data-sdwtab="review"><span class="ic">🔁</span>یادآوری</button>' +
        '<button class="sdw-tabbtn" data-sdwtab="notes"><span class="ic">📝</span>یادداشت</button>' +
        '<button class="sdw-tabbtn" data-sdwtab="backup"><span class="ic">💾</span>پشتیبان</button>' +
      '</div>' +

      '<div class="sdw-tabpanel active" id="sdw-tabpanel-timer">' +
        '<div class="sdw-stats-row">' +
          '<div class="sdw-stat-card"><div class="sdw-stat-big" id="sdw-stat-today">۰ دقیقه</div><div class="sdw-stat-sub">مطالعه امروز</div></div>' +
          '<div class="sdw-stat-card"><div class="sdw-stat-big" id="sdw-stat-week">۰ دقیقه</div><div class="sdw-stat-sub">۷ روز اخیر</div></div>' +
        '</div>' +
        '<div class="sdw-timer-card">' +
          '<div class="sdw-phase-label" id="sdw-phase-label">آماده شروع</div>' +
          '<div class="sdw-clock" id="sdw-clock">' + fmtClock(state.remaining) + '</div>' +
          '<div class="sdw-dots" id="sdw-dots"></div>' +
          '<div class="sdw-timer-btns">' +
            '<button class="sdw-btn-primary" id="sdw-start-btn">▶ شروع</button>' +
            '<button class="sdw-btn-secondary" id="sdw-reset-btn">↺ ریست</button>' +
          '</div>' +
          '<label class="sdw-tick-row"><input type="checkbox" id="sdw-tick-check"' + (tickEnabled ? " checked" : "") + ' /> 🕐 صدای تیک‌تاک ثانیه‌شمار (تایمر قابل‌مشاهده)</label>' +
        '</div>' +
        '<h3>پلیر تمرکز (نویز/صدای پس‌زمینه)</h3>' +
        '<div class="sdw-player-row">' +
          '<div class="sdw-sound-btns">' +
            '<button data-snd="white" id="sdw-snd-white">نویز سفید</button>' +
            '<button data-snd="brown" id="sdw-snd-brown">نویز قهوه‌ای</button>' +
            '<button data-snd="drone" id="sdw-snd-drone">امواج آرام</button>' +
          '</div>' +
          '<button class="sdw-play-btn" id="sdw-play-btn">▶</button>' +
        '</div>' +
        '<div class="sdw-vol-row"><span>🔈</span><input type="range" id="sdw-vol" min="0" max="100" value="35"><span>🔊</span></div>' +
        '<details class="sdw-drawer">' +
          '<summary>⏱️ مدت‌زمان‌ها (تنظیم زمان‌بندی پومودورو) <span class="arw">▾</span></summary>' +
          '<div class="sdw-drawer-body">' +
            '<div class="sdw-settings-row">' +
              '<div class="sdw-settings-field"><label>کار</label><input type="number" id="sdw-set-work" min="1"></div>' +
              '<div class="sdw-settings-field"><label>استراحت کوتاه</label><input type="number" id="sdw-set-short" min="1"></div>' +
              '<div class="sdw-settings-field"><label>استراحت بلند</label><input type="number" id="sdw-set-long" min="1"></div>' +
              '<div class="sdw-settings-field"><label>هر چند دور</label><input type="number" id="sdw-set-every" min="1"></div>' +
            '</div>' +
            '<button class="sdw-save-settings" id="sdw-save-settings-btn">ذخیره تنظیمات زمان‌بندی</button>' +
          '</div>' +
        '</details>' +
        '<details class="sdw-drawer">' +
          '<summary>🌬️ تکنیک‌های تنفسی <span class="arw">▾</span></summary>' +
          '<div class="sdw-drawer-body">' +
            '<div class="sdw-breathe-card" style="margin-top:0; border:none; padding:0; background:none;">' +
              '<div class="sdw-breathe-hint">قبل از شروع درس، چند دقیقه دنبال دایره‌ی زیر نفس بکش تا ذهنت آماده‌ی تمرکز بشه. یه الگو انتخاب کن و بزن شروع؛ دایره خودش بزرگ و کوچیک می‌شه، فقط همراهش نفس بکش.</div>' +
              '<div class="sdw-breathe-pattern-row" id="sdw-breathe-pattern-row">' +
                '<button type="button" class="sdw-breathe-pattern-btn" data-pattern="box">جعبه‌ای ۴-۴-۴-۴</button>' +
                '<button type="button" class="sdw-breathe-pattern-btn" data-pattern="relax">آرامش‌بخش ۴-۷-۸</button>' +
              '</div>' +
              '<div class="sdw-breathe-stage">' +
                '<div class="sdw-breathe-ring"></div>' +
                '<div class="sdw-breathe-circle" id="sdw-breathe-circle"><span class="sdw-breathe-count" id="sdw-breathe-count">۴</span></div>' +
              '</div>' +
              '<div class="sdw-breathe-phase" id="sdw-breathe-phase">آماده‌ای؟</div>' +
              '<div class="sdw-breathe-cycles" id="sdw-breathe-cycles">هنوز شروع نشده</div>' +
              '<div class="sdw-breathe-btns">' +
                '<button class="sdw-breathe-start" id="sdw-breathe-start-btn">▶ شروع تنفس</button>' +
                '<button class="sdw-breathe-stop" id="sdw-breathe-stop-btn">■ توقف</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</details>' +
      '</div>' +

      '<div class="sdw-tabpanel" id="sdw-tabpanel-plan">' +
        '<div class="sdw-sched-hint">مشخص کن امروز (یا هر روز دیگه) چه ساعتی چه درسی رو می‌خونی — جدا از کارهای روزانه‌ی معمولی. نمای روز، هفته و ماه هم داره.</div>' +
        '<label class="sdw-tick-row" style="margin-bottom:10px;"><input type="checkbox" id="sdw-autosync-check"' + (autoSyncReviews ? " checked" : "") + ' /> 🔁 یادآوری‌های مرور دوره‌ای که امروز سررسیدن، خودکار توی برنامه‌ی همون روز نشون داده بشن</label>' +
        '<div id="sdw-plan-section"></div>' +
      '</div>' +

      '<div class="sdw-tabpanel" id="sdw-tabpanel-review">' +
        '<div class="sdw-sched-hint">اسم درس/مبحث رو بنویس و ساعتی که دوست داری یادآوری بشه رو انتخاب کن. مرورهای بعدی خودکار طبق فاصله‌های زیر (پیش‌فرض علمی: ۱، ۳، ۷، ۱۶ و ۳۰ روز بعد) توی همون ساعت یادآوری می‌شن. بعداً هم می‌تونی برای هر درس، مرور دلخواه دیگه‌ای به همون‌هایی که هست اضافه کنی.</div>' +
        '<details class="sdw-drawer">' +
          '<summary>🎚️ فاصله‌های پیش‌فرض مرور <span class="arw">▾</span></summary>' +
          '<div class="sdw-drawer-body">' +
            '<div class="sdw-sched-hint" style="margin-top:10px;">این روزها همون فاصله‌هاییه که هر درسِ تازه ازشون استفاده می‌کنه — بر پایه‌ی منحنی علمی فراموشی (۱، ۳، ۷، ۱۶، ۳۰ روز). می‌تونی هرکدوم رو حذف کنی، جدید اضافه کنی، یا برگردونی به همین پیش‌فرض علمی. برای درسی که از قبل ساختی، از دکمه‌های زیر خودش استفاده کن.</div>' +
            '<div class="sdw-revlist" id="sdw-fivl-list"></div>' +
            '<div class="sdw-addrev-row">' +
              '<input type="number" min="1" id="sdw-fivl-add-input" placeholder="مثلاً ۲۰">' +
              '<button id="sdw-fivl-add-btn">+ افزودن فاصله</button>' +
            '</div>' +
            '<div class="sdw-reset-row"><button class="sdw-reset-btn" id="sdw-fivl-reset-btn">↺ بازگشت به پیش‌فرض علمی (۱، ۳، ۷، ۱۶، ۳۰)</button></div>' +
          '</div>' +
        '</details>' +
        '<div class="sdw-sched-row" style="margin-top:14px;">' +
          '<input type="text" id="sdw-subj-name" placeholder="اسم درس یا مبحث">' +
          '<input type="time" id="sdw-subj-time" value="20:00">' +
        '</div>' +
        '<button class="sdw-save-settings" id="sdw-subj-add-btn">+ افزودن به برنامه مرور</button>' +
        '<div id="sdw-subj-list" style="margin-top:10px;"></div>' +
      '</div>' +

      '<div class="sdw-tabpanel" id="sdw-tabpanel-notes">' +
        '<div class="sdw-sched-hint">یه موضوع (مثلاً شیمی) انتخاب کن یا بساز، بعد چند تا یادداشت زیرش اضافه کن. همراه با بقیه‌ی اطلاعات این بخش، توی تب «پشتیبان» ذخیره می‌شن.</div>' +
        '<div class="sdw-subj-chip-row" id="sdw-notesubj-chips"></div>' +
        '<div class="sdw-notesubj-addrow">' +
          '<input type="text" id="sdw-notesubj-new" placeholder="موضوع جدید (مثلاً شیمی)">' +
          '<button class="sdw-save-settings" id="sdw-notesubj-add-btn" style="width:auto; padding:0 16px;">+ افزودن</button>' +
        '</div>' +
        '<div id="sdw-notes-current"></div>' +
      '</div>' +

      '<div class="sdw-tabpanel" id="sdw-tabpanel-backup">' +
        '<div class="sdw-sched-hint">این پشتیبان فقط شامل اطلاعات همین بخش (دستیار درس) می‌شه — زمان مطالعه، برنامه مرور دوره‌ای، برنامه زمان‌بندی مطالعه و یادداشت‌های درسی — و کاری به بقیه‌ی بخش‌های بولت ژورنال نداره.</div>' +
        '<div class="sdw-sched-hint" style="margin-top:-4px;">می‌تونی یه بازه‌ی تاریخ هم مشخص کنی تا فقط برنامه/زمانِ همون بازه (مثلاً سه هفته‌ی آینده) توی فایل باشه؛ اگه خالی بذاری، کل تاریخچه دانلود می‌شه.</div>' +
        '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; margin-top:12px;">' +
          '<span style="font-size:10.5px; color:var(--muted2);">تقویم:</span>' +
          '<div style="display:flex; gap:4px; background:var(--bg3); border-radius:7px; padding:2px;">' +
            '<button type="button" id="sdw-backup-mode-j" style="border:none; border-radius:5px; padding:4px 9px; font-size:11px; cursor:pointer; font-family:inherit;">شمسی</button>' +
            '<button type="button" id="sdw-backup-mode-g" style="border:none; border-radius:5px; padding:4px 9px; font-size:11px; cursor:pointer; font-family:inherit;">میلادی</button>' +
          '</div>' +
        '</div>' +
        '<div id="sdw-backup-jalali-wrap" style="display:none; flex-direction:column; gap:6px; margin-bottom:6px;">' +
          '<div style="font-size:10px; color:var(--muted2);">از تاریخ</div>' +
          '<div style="display:flex; gap:6px;">' +
            '<select id="sdw-backup-jfrom-y" style="flex:1.1; min-width:0; background:var(--bg3); border:1px solid var(--border); color:var(--text); border-radius:7px; padding:7px 4px; font-size:11.5px; font-family:inherit;"></select>' +
            '<select id="sdw-backup-jfrom-m" style="flex:1.5; min-width:0; background:var(--bg3); border:1px solid var(--border); color:var(--text); border-radius:7px; padding:7px 4px; font-size:11.5px; font-family:inherit;"></select>' +
            '<select id="sdw-backup-jfrom-d" style="flex:1; min-width:0; background:var(--bg3); border:1px solid var(--border); color:var(--text); border-radius:7px; padding:7px 4px; font-size:11.5px; font-family:inherit;"></select>' +
          '</div>' +
          '<div style="font-size:10px; color:var(--muted2);">تا تاریخ</div>' +
          '<div style="display:flex; gap:6px;">' +
            '<select id="sdw-backup-jto-y" style="flex:1.1; min-width:0; background:var(--bg3); border:1px solid var(--border); color:var(--text); border-radius:7px; padding:7px 4px; font-size:11.5px; font-family:inherit;"></select>' +
            '<select id="sdw-backup-jto-m" style="flex:1.5; min-width:0; background:var(--bg3); border:1px solid var(--border); color:var(--text); border-radius:7px; padding:7px 4px; font-size:11.5px; font-family:inherit;"></select>' +
            '<select id="sdw-backup-jto-d" style="flex:1; min-width:0; background:var(--bg3); border:1px solid var(--border); color:var(--text); border-radius:7px; padding:7px 4px; font-size:11.5px; font-family:inherit;"></select>' +
          '</div>' +
        '</div>' +
        '<div class="sdw-sched-row" id="sdw-backup-gregorian-wrap" style="margin-bottom:6px;">' +
          '<input type="date" id="sdw-backup-from" style="flex:1; min-width:0; background:var(--bg3); border:1px solid var(--border); color:var(--text); border-radius:8px; padding:8px; font-size:12px; font-family:inherit;">' +
          '<input type="date" id="sdw-backup-to" style="flex:1; min-width:0; background:var(--bg3); border:1px solid var(--border); color:var(--text); border-radius:8px; padding:8px; font-size:12px; font-family:inherit;">' +
        '</div>' +
        '<button class="sdw-save-settings" id="sdw-backup-download-btn">⬇️ دانلود فایل پشتیبان</button>' +
        '<button class="sdw-save-settings" id="sdw-backup-upload-btn" style="margin-top:8px;">⬆️ بارگذاری فایل پشتیبان</button>' +
        '<input type="file" id="sdw-backup-file-input" accept="application/json" style="display:none;">' +
        '<label style="display:flex; align-items:flex-start; gap:8px; margin-top:10px; font-size:11px; color:var(--muted2); line-height:1.7; cursor:pointer;">' +
          '<input type="checkbox" id="sdw-backup-replace-check" class="sdw-backup-check" style="margin-top:2px;">' +
          '<span>جایگزینی کامل: اگه روشن باشه، بارگذاری فایل پشتیبان به‌جای اضافه‌کردن، جای اطلاعات فعلی این بخش رو کامل می‌گیره (مثلاً برنامه‌ی چند هفته‌ی آینده‌ی خودت با برنامه‌ی داخل فایل جایگزین می‌شه). اگه خاموش باشه، فقط روی اطلاعات فعلی اضافه/به‌روزرسانی می‌شه.</span>' +
        '</label>' +
        '<div id="sdw-backup-status" style="font-size:11px; color:#4FA86A; margin-top:8px;"></div>' +
      '</div>';

    body.querySelectorAll(".sdw-tabbtn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        body.querySelectorAll(".sdw-tabbtn").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        body.querySelectorAll(".sdw-tabpanel").forEach(function (p) { p.classList.remove("active"); });
        var panel = document.getElementById("sdw-tabpanel-" + btn.getAttribute("data-sdwtab"));
        if (panel) panel.classList.add("active");
      });
    });

    renderSettingsInputs();
    renderTimer();
    renderStats();
    renderSubjectsList();
    renderForgetIntervalsList();
    renderPlanSection();
    renderNoteSubjectChips();
    renderNotesCurrent();
    document.getElementById("sdw-notesubj-add-btn").addEventListener("click", function () {
      var inp = document.getElementById("sdw-notesubj-new");
      var name = inp.value.trim();
      if (!name) return;
      addNoteSubject(name).then(function () {
        inp.value = "";
        renderNoteSubjectChips();
        renderNotesCurrent();
      });
    });

    document.getElementById("sdw-fivl-add-btn").addEventListener("click", function () {
      var input = document.getElementById("sdw-fivl-add-input");
      var n = parseInt(input.value, 10);
      if (!n || n < 1) return;
      if (FORGET_INTERVALS.indexOf(n) === -1) {
        FORGET_INTERVALS.push(n);
        FORGET_INTERVALS.sort(function (a, b) { return a - b; });
        saveForgetIntervals().then(function () { renderForgetIntervalsList(); renderSubjectsList(); });
      }
      input.value = "";
    });
    document.getElementById("sdw-fivl-reset-btn").addEventListener("click", function () {
      FORGET_INTERVALS = DEFAULT_FORGET_INTERVALS.slice();
      saveForgetIntervals().then(function () { renderForgetIntervalsList(); renderSubjectsList(); });
    });
    document.getElementById("sdw-subj-add-btn").addEventListener("click", function () {
      var nameEl = document.getElementById("sdw-subj-name");
      var timeEl = document.getElementById("sdw-subj-time");
      var name = nameEl.value.trim();
      if (!name) return;
      var tv = (timeEl.value || "20:00").split(":");
      var hh = Math.min(23, Math.max(0, parseInt(tv[0], 10) || 20));
      var mm = Math.min(59, Math.max(0, parseInt(tv[1], 10) || 0));
      requestNotifyPermission();
      addSubject(name, hh, mm).then(renderSubjectsList);
      nameEl.value = "";
    });

    markActiveBreathePattern();
    document.getElementById("sdw-breathe-pattern-row").querySelectorAll(".sdw-breathe-pattern-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        breathePattern = btn.getAttribute("data-pattern");
        try { localStorage.setItem(BREATHE_LS_KEY, breathePattern); } catch (e) {}
        markActiveBreathePattern();
        if (breatheRunning) startBreathing();
      });
    });
    document.getElementById("sdw-breathe-start-btn").addEventListener("click", function () {
      breatheRunning ? stopBreathing() : startBreathing();
    });
    document.getElementById("sdw-breathe-stop-btn").addEventListener("click", stopBreathing);

    document.getElementById("sdw-start-btn").addEventListener("click", function () {
      requestNotifyPermission();
      state.running ? pauseTimer() : startTimer();
    });
    document.getElementById("sdw-reset-btn").addEventListener("click", resetTimer);
    document.getElementById("sdw-tick-check").addEventListener("change", function (ev) {
      tickEnabled = ev.target.checked;
      try { localStorage.setItem(TICK_KEY, tickEnabled ? "1" : "0"); } catch (e) {}
      renderTimer();
    });
    document.getElementById("sdw-autosync-check").addEventListener("change", function (ev) {
      autoSyncReviews = ev.target.checked;
      saveAutoSync().then(function () { renderPlanList(); });
    });
    document.getElementById("sdw-save-settings-btn").addEventListener("click", function () {
      var w = Math.max(1, Number(document.getElementById("sdw-set-work").value) || settings.work);
      var sh = Math.max(1, Number(document.getElementById("sdw-set-short").value) || settings.short);
      var lg = Math.max(1, Number(document.getElementById("sdw-set-long").value) || settings.long);
      var ev = Math.max(1, Number(document.getElementById("sdw-set-every").value) || settings.longEvery);
      settings = { work: w, short: sh, long: lg, longEvery: ev };
      saveSettings(settings);
      if (state.phase === "idle") state.remaining = settings.work * 60;
      renderTimer();
    });

    var soundBtns = { white: document.getElementById("sdw-snd-white"), brown: document.getElementById("sdw-snd-brown"), drone: document.getElementById("sdw-snd-drone") };
    function markActiveSound() {
      Object.keys(soundBtns).forEach(function (k) { soundBtns[k].classList.toggle("active", k === currentSound); });
    }
    markActiveSound();
    var playBtn = document.getElementById("sdw-play-btn");
    playBtn.textContent = isPlaying ? "⏸" : "▶";
    var volSlider = document.getElementById("sdw-vol");
    Object.keys(soundBtns).forEach(function (k) {
      soundBtns[k].addEventListener("click", function () {
        currentSound = k;
        try { localStorage.setItem(SOUND_KEY, k); } catch (e) {}
        markActiveSound();
        if (isPlaying) startPlayer(currentSound, volSlider.value / 100);
      });
    });
    playBtn.addEventListener("click", function () {
      isPlaying = !isPlaying;
      if (isPlaying) { startPlayer(currentSound, volSlider.value / 100); playBtn.textContent = "⏸"; }
      else { stopPlayer(); playBtn.textContent = "▶"; }
    });
    volSlider.addEventListener("input", function () { setPlayerVolume(volSlider.value / 100); });

    (function () {
      var fileInput = document.getElementById("sdw-backup-file-input");
      var replaceCheck = document.getElementById("sdw-backup-replace-check");

      // ---- شمسی / میلادی toggle for the range-backup date pickers ----
      (function () {
        var modeJBtn = document.getElementById("sdw-backup-mode-j");
        var modeGBtn = document.getElementById("sdw-backup-mode-g");
        var jalaliWrap = document.getElementById("sdw-backup-jalali-wrap");
        var gregWrap = document.getElementById("sdw-backup-gregorian-wrap");
        var fromEl = document.getElementById("sdw-backup-from");
        var toEl = document.getElementById("sdw-backup-to");
        var todayJ = sdwJaParts(new Date());
        var jYears = []; for (var yi = 0; yi < 7; yi++) jYears.push(todayJ.jy - 1 + yi);

        function fillSelect(sel, items, getVal, getLabel) {
          sel.innerHTML = items.map(function (it) {
            return '<option value="' + getVal(it) + '">' + getLabel(it) + '</option>';
          }).join("");
        }
        function fillDaySelect(sel, jy, jm, keepDay) {
          var len = sdwJaMonthLen(jy, jm);
          var days = []; for (var di = 1; di <= len; di++) days.push(di);
          fillSelect(sel, days, function (d) { return d; }, function (d) { return sdwJaNum(d); });
          var d = Math.min(keepDay || 1, len);
          sel.value = String(d);
        }
        function setupPicker(prefix, initJ) {
          var yS = document.getElementById(prefix + "-y");
          var mS = document.getElementById(prefix + "-m");
          var dS = document.getElementById(prefix + "-d");
          fillSelect(yS, jYears, function (y) { return y; }, function (y) { return sdwJaNum(y); });
          mS.innerHTML = SDW_JA_MONTH_NAMES.map(function (n, idx) { return '<option value="' + (idx + 1) + '">' + n + '</option>'; }).join("");
          yS.value = String(initJ.jy);
          mS.value = String(initJ.jm);
          fillDaySelect(dS, initJ.jy, initJ.jm, initJ.jd);
          return { y: yS, m: mS, d: dS };
        }
        var fromPk = setupPicker("sdw-backup-jfrom", todayJ);
        var toPk = setupPicker("sdw-backup-jto", todayJ);

        function syncPicker(pk) {
          fillDaySelect(pk.d, Number(pk.y.value), Number(pk.m.value), Number(pk.d.value));
        }
        function syncToHidden() {
          var fromStr = sdwJalaliToGregorianStr(Number(fromPk.y.value), Number(fromPk.m.value), Number(fromPk.d.value));
          var toStr = sdwJalaliToGregorianStr(Number(toPk.y.value), Number(toPk.m.value), Number(toPk.d.value));
          fromEl.value = fromStr;
          toEl.value = toStr;
        }
        [fromPk, toPk].forEach(function (pk) {
          pk.y.addEventListener("change", function () { syncPicker(pk); syncToHidden(); });
          pk.m.addEventListener("change", function () { syncPicker(pk); syncToHidden(); });
          pk.d.addEventListener("change", syncToHidden);
        });

        function setMode(mode) {
          var isJ = mode === "j";
          jalaliWrap.style.display = isJ ? "flex" : "none";
          gregWrap.style.display = isJ ? "none" : "flex";
          modeJBtn.style.background = isJ ? "#C9A24B" : "transparent";
          modeJBtn.style.color = isJ ? "var(--bg0)" : "var(--text)";
          modeJBtn.style.fontWeight = isJ ? "700" : "400";
          modeGBtn.style.background = !isJ ? "#C9A24B" : "transparent";
          modeGBtn.style.color = !isJ ? "var(--bg0)" : "var(--text)";
          modeGBtn.style.fontWeight = !isJ ? "700" : "400";
        }
        modeJBtn.addEventListener("click", function () { setMode("j"); });
        modeGBtn.addEventListener("click", function () { setMode("g"); });
        setMode("j");
      })();

      document.getElementById("sdw-backup-download-btn").addEventListener("click", function () {
        var fromEl = document.getElementById("sdw-backup-from");
        var toEl = document.getElementById("sdw-backup-to");
        var from = fromEl.value, to = toEl.value;
        if (from && to) {
          if (from > to) { sdwSetBackupStatus("تاریخ «از» باید قبل از تاریخ «تا» باشه."); return; }
          sdwDownloadBackup({ from: from, to: to });
        } else if (from || to) {
          sdwSetBackupStatus("برای بازه‌ی زمانی، هم «از تاریخ» و هم «تا تاریخ» رو پر کن — یا هر دو رو خالی بذار برای دانلود کامل.");
        } else {
          sdwDownloadBackup(null);
        }
      });
      document.getElementById("sdw-backup-upload-btn").addEventListener("click", function () { fileInput.click(); });
      fileInput.addEventListener("change", function (ev) {
        var f = ev.target.files && ev.target.files[0];
        if (f) sdwRestoreBackup(f, !!replaceCheck.checked);
        ev.target.value = "";
      });
    })();
  }

  var fab = document.getElementById("sdw-fab");
  var overlay = document.getElementById("sdw-overlay");
  var panel = document.getElementById("sdw-panel");
  var closeBtn = document.getElementById("sdw-close");
  function openPanel() {
    buildBody();
    overlay.style.display = "block"; panel.style.display = "block";
  }
  function closePanel() {
    overlay.style.display = "none"; panel.style.display = "none";
  }
  fab.addEventListener("click", openPanel);
  overlay.addEventListener("click", closePanel);
  closeBtn.addEventListener("click", closePanel);
  window.addEventListener("beforeunload", flushUnsaved);
  document.addEventListener("visibilitychange", function () { if (document.hidden) flushUnsaved(); });

  Promise.all([loadForgetIntervals(), loadSubjects(), loadNotes(), loadAutoSync()]).then(function () {
    return loadNoteSubjects();
  }).then(function () {
    renderSubjectsList();
    renderNoteSubjectChips();
    renderNotesCurrent();
    checkDueReviews();
    setInterval(checkDueReviews, 30000);
  });
})();
