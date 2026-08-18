(function () {
  var currentDate = new Date();
  var dayData = { bed: "", wake: "", naps: [], blocks: [] };
  var settings = { targetHours: 8 };

  function fa(n) { return Number(n).toLocaleString("fa-IR"); }
  function pad2(n) { return n < 10 ? "0" + n : "" + n; }
  function dateKey(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function keyToDate(k) { var p = k.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function genId() { return "i" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function faDateLabel(d) {
    try { return d.toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric", weekday: "long" }); }
    catch (e) { return ""; }
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

  function storeKey(key) { return "sww:" + key; }
  function loadDay(key) {
    return window.storage.get(storeKey(key)).then(function (r) {
      return r.value || { bed: "", wake: "", naps: [], blocks: [] };
    }).catch(function () { return { bed: "", wake: "", naps: [], blocks: [] }; });
  }
  function persist() { return window.storage.set(storeKey(dateKey(currentDate)), dayData); }

  function settingsKey() { return "sww:settings"; }
  function loadSettings() {
    return window.storage.get(settingsKey()).then(function (r) {
      return (r && r.value) || { targetHours: 8 };
    }).catch(function () { return { targetHours: 8 }; });
  }
  function persistSettings() { return window.storage.set(settingsKey(), settings); }

  function renderNight() {
    var el = document.getElementById("sww-night-summary");
    if (dayData.bed && dayData.wake) {
      el.textContent = "مدت خواب شب: " + fmtDur(durMin(dayData.bed, dayData.wake));
    } else {
      el.textContent = "";
    }
  }

  function renderNaps() {
    var list = document.getElementById("sww-naps-list");
    list.innerHTML = "";
    if (!dayData.naps.length) {
      list.innerHTML = '<div class="sww-empty">چرتی ثبت نشده</div>';
    }
    dayData.naps.forEach(function (n) {
      var row = document.createElement("div");
      row.className = "sww-list-item";
      row.innerHTML =
        '<span class="sww-li-time">' + n.start + ' – ' + n.end + '</span>' +
        '<span class="sww-li-dur">' + fmtDur(durMin(n.start, n.end)) + '</span>' +
        '<button class="sww-del" data-nap="' + n.id + '">✕</button>';
      list.appendChild(row);
    });
  }

  var TAG_LABEL = { work: "کار کردم", notwork: "کار نکردم", waste: "هدررفت" };
  var TAG_CLASS = { work: "sww-tag-work", notwork: "sww-tag-notwork", waste: "sww-tag-waste" };

  function renderBlocks() {
    var list = document.getElementById("sww-blocks-list");
    list.innerHTML = "";
    if (!dayData.blocks.length) {
      list.innerHTML = '<div class="sww-empty">بازه‌ای ثبت نشده</div>';
    }
    dayData.blocks.forEach(function (b) {
      var row = document.createElement("div");
      row.className = "sww-list-item";
      row.innerHTML =
        '<span class="sww-li-time">' + b.start + ' – ' + b.end + '</span>' +
        '<span class="sww-li-tag ' + TAG_CLASS[b.type] + '">' + TAG_LABEL[b.type] + '</span>' +
        '<span class="sww-li-dur">' + fmtDur(durMin(b.start, b.end)) + '</span>' +
        '<button class="sww-del" data-block="' + b.id + '">✕</button>';
      list.appendChild(row);
    });
  }

  function sumByType(type) {
    return dayData.blocks.filter(function (b) { return b.type === type; })
      .reduce(function (s, b) { return s + durMin(b.start, b.end); }, 0);
  }

  function renderSummary() {
    var nightMin = (dayData.bed && dayData.wake) ? durMin(dayData.bed, dayData.wake) : 0;
    var napMin = dayData.naps.reduce(function (s, n) { return s + durMin(n.start, n.end); }, 0);
    var totalSleep = nightMin + napMin;
    var workMin = sumByType("work");
    var notworkMin = sumByType("notwork");
    var wasteMin = sumByType("waste");
    var targetMin = (settings.targetHours || 8) * 60;
    var hasSleep = !!(dayData.bed && dayData.wake);
    var sleepCls = hasSleep ? (totalSleep >= targetMin ? "sww-good" : "sww-bad") : "";
    var sleepVal = fmtDur(totalSleep) + (hasSleep ? (totalSleep >= targetMin ? " ✓" : " (کمتر از هدف)") : "");

    function row(label, val, cls) {
      return '<div class="sww-daysummary-row' + (cls ? " " + cls : "") + '"><span>' + label + '</span><span>' + val + '</span></div>';
    }
    document.getElementById("sww-daysummary").innerHTML =
      row("😴 مجموع خواب", sleepVal, sleepCls) +
      row("💼 مجموع کار", fmtDur(workMin)) +
      row("🚫 کار نکردن", fmtDur(notworkMin)) +
      row("⌛ هدررفت", fmtDur(wasteMin));
  }

  function renderWeekAvg() {
    var wrap = document.getElementById("sww-weekavg");
    var keys = [];
    for (var i = 6; i >= 0; i--) {
      var dd = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - i);
      keys.push(dateKey(dd));
    }
    Promise.all(keys.map(loadDay)).then(function (list) {
      var sleepVals = [], workVals = [];
      list.forEach(function (d) {
        if (d && d.bed && d.wake) {
          var t = durMin(d.bed, d.wake) + (d.naps || []).reduce(function (s, n) { return s + durMin(n.start, n.end); }, 0);
          sleepVals.push(t);
        }
        if (d && d.blocks && d.blocks.length) {
          var w = d.blocks.filter(function (b) { return b.type === "work"; })
            .reduce(function (s, b) { return s + durMin(b.start, b.end); }, 0);
          if (w > 0) workVals.push(w);
        }
      });
      var avgSleep = sleepVals.length ? sleepVals.reduce(function (a, b) { return a + b; }, 0) / sleepVals.length : null;
      var avgWork = workVals.length ? workVals.reduce(function (a, b) { return a + b; }, 0) / workVals.length : null;
      wrap.innerHTML =
        '<div class="sww-weekavg-title">میانگین ۷ روز اخیر</div>' +
        '<div class="sww-weekavg-row"><span>😴 میانگین خواب</span><span>' + (avgSleep === null ? "—" : fmtDur(avgSleep)) + '</span></div>' +
        '<div class="sww-weekavg-row"><span>💼 میانگین کار</span><span>' + (avgWork === null ? "—" : fmtDur(avgWork)) + '</span></div>';
    });
  }

  function renderAll() {
    document.getElementById("sww-bed").value = dayData.bed || "";
    document.getElementById("sww-wake").value = dayData.wake || "";
    renderNight();
    renderNaps();
    renderBlocks();
    renderSummary();
  }

  function loadAndRender() {
    document.getElementById("sww-date-input").value = dateKey(currentDate);
    document.getElementById("sww-jalali-label").textContent = faDateLabel(currentDate);
    loadDay(dateKey(currentDate)).then(function (d) {
      dayData = d;
      if (!dayData.naps) dayData.naps = [];
      if (!dayData.blocks) dayData.blocks = [];
      renderAll();
    });
    renderWeekAvg();
  }

  var fab = document.getElementById("sww-fab");
  var overlay = document.getElementById("sww-overlay2");
  var panel = document.getElementById("sww-panel");
  var closeBtn = document.getElementById("sww-close2");

  function openPanel() {
    overlay.style.display = "block"; panel.style.display = "block";
    loadSettings().then(function (s) {
      settings = s && s.targetHours ? s : { targetHours: 8 };
      document.getElementById("sww-target-input").value = settings.targetHours;
      loadAndRender();
    });
  }
  function closePanel() { overlay.style.display = "none"; panel.style.display = "none"; }
  fab.addEventListener("click", openPanel);
  overlay.addEventListener("click", closePanel);
  closeBtn.addEventListener("click", closePanel);

  document.getElementById("sww-prev").addEventListener("click", function () {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 1);
    loadAndRender();
  });
  document.getElementById("sww-next").addEventListener("click", function () {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1);
    loadAndRender();
  });
  document.getElementById("sww-today").addEventListener("click", function () {
    currentDate = new Date();
    loadAndRender();
  });
  document.getElementById("sww-date-input").addEventListener("change", function (e) {
    if (e.target.value) { currentDate = keyToDate(e.target.value); loadAndRender(); }
  });

  document.getElementById("sww-target-input").addEventListener("change", function (e) {
    var v = Number(e.target.value);
    if (!v || v <= 0) v = 8;
    settings.targetHours = v;
    persistSettings();
    renderSummary();
  });

  document.getElementById("sww-bed").addEventListener("change", function (e) {
    dayData.bed = e.target.value; persist(); renderNight(); renderSummary();
  });
  document.getElementById("sww-wake").addEventListener("change", function (e) {
    dayData.wake = e.target.value; persist(); renderNight(); renderSummary();
  });

  document.getElementById("sww-nap-add").addEventListener("click", function () {
    var s = document.getElementById("sww-nap-start").value;
    var e = document.getElementById("sww-nap-end").value;
    if (!s || !e) return;
    dayData.naps.push({ id: genId(), start: s, end: e });
    document.getElementById("sww-nap-start").value = "";
    document.getElementById("sww-nap-end").value = "";
    persist(); renderNaps(); renderSummary();
  });

  document.getElementById("sww-block-add").addEventListener("click", function () {
    var s = document.getElementById("sww-block-start").value;
    var e = document.getElementById("sww-block-end").value;
    var t = document.getElementById("sww-block-type").value;
    if (!s || !e) return;
    dayData.blocks.push({ id: genId(), start: s, end: e, type: t });
    document.getElementById("sww-block-start").value = "";
    document.getElementById("sww-block-end").value = "";
    persist(); renderBlocks(); renderSummary();
  });

  document.getElementById("sww-naps-list").addEventListener("click", function (e) {
    var id = e.target.getAttribute("data-nap");
    if (!id) return;
    dayData.naps = dayData.naps.filter(function (n) { return n.id !== id; });
    persist(); renderNaps(); renderSummary();
  });
  document.getElementById("sww-blocks-list").addEventListener("click", function (e) {
    var id = e.target.getAttribute("data-block");
    if (!id) return;
    dayData.blocks = dayData.blocks.filter(function (b) { return b.id !== id; });
    persist(); renderBlocks(); renderSummary();
  });
})();
