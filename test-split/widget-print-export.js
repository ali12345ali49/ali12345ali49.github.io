(function () {
  function pad2(n) { return String(n).padStart(2, "0"); }
  function toISO(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function faDateLabel(iso) {
    try {
      return new Date(iso + "T00:00:00").toLocaleDateString("fa-IR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    } catch (e) { return iso; }
  }
  function jaParts(d) {
    var parts = new Intl.DateTimeFormat("en-US-u-ca-persian", { year: "numeric", month: "numeric", day: "numeric" }).formatToParts(d);
    var o = {};
    parts.forEach(function (x) { if (x.type !== "literal") o[x.type] = parseInt(x.value, 10); });
    return { jy: o.year, jm: o.month, jd: o.day };
  }
  function jaFirstOfYear(jy) {
    var base = new Date(jy + 621, 1, 10);
    for (var i = 0; i < 70; i++) {
      var d = new Date(base);
      d.setDate(d.getDate() + i);
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
    for (var k = 1; k < jm; k++) {
      d = new Date(d);
      d.setDate(d.getDate() + jaMonthLen(jy, k));
    }
    return d;
  }
  var jaMonthNames = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
  var jaDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  function jaNum(n) {
    return String(n).split("").map(function (c) { return jaDigits[c] !== undefined ? jaDigits[c] : c; }).join("");
  }
  function jToDate(jy, jm, jd) {
    var dd = new Date(jaFirstOfMonth(jy, jm));
    dd.setDate(dd.getDate() + (jd - 1));
    return dd;
  }
  function clampJd(jy, jm, jd) {
    return Math.min(jd, jaMonthLen(jy, jm));
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  var QCOLOR = { iu: "#C9A24B", un: "#5B8DBE", in: "#4FA88A", nn: "#5A6178" };
  var QLABEL = { iu: "مهم و ضروری", un: "ضروری، غیرمهم", in: "مهم، غیرضروری", nn: "غیرمهم و غیرضروری" };
  var QORDER = ["iu", "un", "in", "nn"];
  var MAX_DAYS = 31;

  function dateRange(fromIso, toIso) {
    var out = [];
    var a = new Date(fromIso + "T00:00:00"), b = new Date(toIso + "T00:00:00");
    if (isNaN(a) || isNaN(b) || a > b) return out;
    var cur = new Date(a);
    var guard = 0;
    while (cur <= b && guard < MAX_DAYS) {
      out.push(toISO(cur));
      cur.setDate(cur.getDate() + 1);
      guard++;
    }
    return out;
  }

  function loadDay(iso) {
    return window.storage.get("day-" + iso).then(function (rec) {
      if (!rec || !rec.value) return null;
      try { return JSON.parse(rec.value); } catch (e) { return null; }
    }).catch(function () { return null; });
  }

  function blobToDataURL(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  }

  function grayscaleDataURL(dataUrl) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        try {
          var canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          var ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          var data = ctx.getImageData(0, 0, canvas.width, canvas.height);
          var d = data.data;
          for (var i = 0; i < d.length; i += 4) {
            var g = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
            d[i] = d[i + 1] = d[i + 2] = g;
          }
          ctx.putImageData(data, 0, 0);
          resolve(canvas.toDataURL("image/jpeg", 0.9));
        } catch (e) { resolve(dataUrl); }
      };
      img.onerror = function () { resolve(dataUrl); };
      img.src = dataUrl;
    });
  }

  function getImageDataURL(imgMeta, bw) {
    var key = (imgMeta && (imgMeta.fullId || imgMeta.id)) || null;
    if (!key) return Promise.resolve(null);
    return window.storage.get(key).then(function (rec) {
      if (!rec || !rec.value) return null;
      return blobToDataURL(rec.value);
    }).then(function (dataUrl) {
      if (!dataUrl) return null;
      return bw ? grayscaleDataURL(dataUrl) : dataUrl;
    }).catch(function () { return null; });
  }

  function buildTasksHTML(tasks) {
    if (!tasks || !tasks.length) return "";
    var byQ = { iu: [], un: [], in: [], nn: [] };
    tasks.forEach(function (t) { (byQ[t.quadrant] || byQ.nn).push(t); });
    var html = '<div class="prw-section-title">کارها</div>';
    var any = false;
    QORDER.forEach(function (q) {
      if (!byQ[q].length) return;
      any = true;
      html += '<div style="font-size:11.5px;font-weight:700;color:' + QCOLOR[q] + ';margin:8px 0 3px;">' + QLABEL[q] + '</div>';
      byQ[q].forEach(function (t) {
        html += '<div class="prw-task"><span class="prw-dot" style="background:' + QCOLOR[q] + ';"></span>' +
          '<span class="' + (t.done ? "prw-done" : "") + '">' + esc(t.text) + '</span>' +
          (t.time ? '<span style="color:#999;font-size:11px;margin-inline-start:6px;">' + esc(t.time) + '</span>' : "") +
          (t.location ? '<span style="color:#999;font-size:11px;margin-inline-start:6px;">📍' + esc(t.location) + '</span>' : "") +
          '</div>';
      });
    });
    return any ? html : "";
  }

  function buildPageHTML(iso, day, opts, images) {
    var html = '<section class="prw-page">';
    html += '<div class="prw-date">' + faDateLabel(iso) + '</div>';
    if (opts.tasks) {
      var tHtml = buildTasksHTML(day.tasks);
      if (tHtml) html += tHtml;
    }
    if (opts.journal && day.journal && day.journal.trim()) {
      html += '<div class="prw-section-title">یادداشت روزانه</div>';
      html += '<div class="prw-journal">' + esc(day.journal) + '</div>';
    }
    if (opts.images && images && images.length) {
      html += '<div class="prw-section-title">عکس‌ها</div>';
      html += '<div class="prw-imgs">';
      images.forEach(function (src) {
        if (src) html += '<img src="' + src + '" />';
      });
      html += '</div>';
    }
    html += '</section>';
    return html;
  }

  function hasContent(day, opts) {
    if (!day) return false;
    if (opts.tasks && day.tasks && day.tasks.length) return true;
    if (opts.journal && day.journal && day.journal.trim()) return true;
    if (opts.images && day.images && day.images.length) return true;
    return false;
  }

  function setStatus(msg) {
    var el = document.getElementById("prw-status");
    if (el) el.textContent = msg;
  }

  var prwMode = "color";
  document.getElementById("prw-mode-row").addEventListener("click", function (e) {
    var btn = e.target.closest(".prw-mode-btn");
    if (!btn) return;
    prwMode = btn.getAttribute("data-mode");
    document.querySelectorAll("#prw-mode-row .prw-mode-btn").forEach(function (b) {
      b.classList.toggle("prw-mode-sel", b === btn);
    });
  });

  var prwDateMode = "j";
  var curJy = jaParts(new Date()).jy;
  var jYearsList = [];
  for (var yi = -1; yi <= 5; yi++) jYearsList.push(curJy + yi);

  function fillJYearSelect(sel) {
    sel.innerHTML = "";
    jYearsList.forEach(function (yv) {
      var o = document.createElement("option");
      o.value = yv; o.textContent = jaNum(yv);
      sel.appendChild(o);
    });
  }
  function fillJMonthSelect(sel) {
    sel.innerHTML = "";
    jaMonthNames.forEach(function (mn, mi) {
      var o = document.createElement("option");
      o.value = mi + 1; o.textContent = mn;
      sel.appendChild(o);
    });
  }
  function fillJDaySelect(sel, jy, jm) {
    var len = jaMonthLen(jy, jm);
    var cur = sel.value ? Number(sel.value) : null;
    sel.innerHTML = "";
    for (var d = 1; d <= len; d++) {
      var o = document.createElement("option");
      o.value = d; o.textContent = jaNum(d);
      sel.appendChild(o);
    }
    sel.value = cur && cur <= len ? cur : Math.min(cur || 1, len);
  }

  var jFromY = document.getElementById("prw-from-jy"), jFromM = document.getElementById("prw-from-jm"), jFromD = document.getElementById("prw-from-jd");
  var jToY = document.getElementById("prw-to-jy"), jToM = document.getElementById("prw-to-jm"), jToD = document.getElementById("prw-to-jd");

  [jFromY, jToY].forEach(fillJYearSelect);
  [jFromM, jToM].forEach(fillJMonthSelect);
  var todayJ = jaParts(new Date());
  jFromY.value = todayJ.jy; jFromM.value = todayJ.jm;
  jToY.value = todayJ.jy; jToM.value = todayJ.jm;
  fillJDaySelect(jFromD, todayJ.jy, todayJ.jm); jFromD.value = todayJ.jd;
  fillJDaySelect(jToD, todayJ.jy, todayJ.jm); jToD.value = todayJ.jd;

  function onJChange(ySel, mSel, dSel) {
    return function () {
      fillJDaySelect(dSel, Number(ySel.value), Number(mSel.value));
    };
  }
  jFromY.addEventListener("change", onJChange(jFromY, jFromM, jFromD));
  jFromM.addEventListener("change", onJChange(jFromY, jFromM, jFromD));
  jToY.addEventListener("change", onJChange(jToY, jToM, jToD));
  jToM.addEventListener("change", onJChange(jToY, jToM, jToD));

  document.getElementById("prw-date-mode-row").addEventListener("click", function (e) {
    var btn = e.target.closest(".prw-mode-btn");
    if (!btn) return;
    prwDateMode = btn.getAttribute("data-dmode");
    document.querySelectorAll("#prw-date-mode-row .prw-mode-btn").forEach(function (b) {
      b.classList.toggle("prw-mode-sel", b === btn);
    });
    document.getElementById("prw-date-j").style.display = prwDateMode === "j" ? "" : "none";
    document.getElementById("prw-date-g").style.display = prwDateMode === "g" ? "flex" : "none";
  });

  document.getElementById("prw-build").addEventListener("click", function () {
    var fromIso, toIso;
    if (prwDateMode === "j") {
      fromIso = toISO(jToDate(Number(jFromY.value), Number(jFromM.value), Number(jFromD.value)));
      toIso = toISO(jToDate(Number(jToY.value), Number(jToM.value), Number(jToD.value)));
    } else {
      fromIso = document.getElementById("prw-from").value;
      toIso = document.getElementById("prw-to").value;
    }
    if (!fromIso || !toIso) { setStatus("لطفاً بازه‌ی تاریخ رو انتخاب کن."); return; }
    var days = dateRange(fromIso, toIso);
    if (!days.length) { setStatus("بازه‌ی تاریخ نامعتبره."); return; }

    var opts = {
      journal: document.getElementById("prw-inc-journal").checked,
      tasks: document.getElementById("prw-inc-tasks").checked,
      images: document.getElementById("prw-inc-images").checked
    };
    var bw = prwMode === "bw";

    // Open the print window synchronously (inside the click handler) so
    // popup blockers don't interfere; we fill it in once data is ready.
    var printWin = window.open("", "_blank");
    if (!printWin) {
      setStatus("مرورگر اجازه‌ی باز کردن پنجره‌ی چاپ رو نداد. لطفاً پاپ‌آپ رو برای این صفحه فعال کن.");
      return;
    }
    printWin.document.write('<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>در حال آماده‌سازی...</title></head><body style="font-family:Tahoma,sans-serif;padding:40px;text-align:center;color:#555;">در حال آماده‌سازی صفحه‌ی چاپ...</body></html>');
    printWin.document.close();

    setStatus("در حال خواندن اطلاعات...");

    var pagesHTML = [];
    var idx = 0;

    function processNext() {
      if (idx >= days.length) return finish();
      var iso = days[idx];
      idx++;
      setStatus("در حال آماده‌سازی روز " + idx + " از " + days.length + "...");
      loadDay(iso).then(function (day) {
        if (!day || !hasContent(day, opts)) return processNext();
        var imgPromise = (opts.images && day.images && day.images.length)
          ? Promise.all(day.images.map(function (im) { return getImageDataURL(im, bw); }))
          : Promise.resolve([]);
        return imgPromise.then(function (images) {
          pagesHTML.push(buildPageHTML(iso, day, opts, images));
          return processNext();
        });
      }).catch(function () { return processNext(); });
    }

    function finish() {
      if (!pagesHTML.length) {
        setStatus("توی این بازه هیچ داده‌ای (یادداشت/کار/عکس) پیدا نشد.");
        try { printWin.close(); } catch (e) {}
        return;
      }
      var bwCss = bw ? "html{-webkit-print-color-adjust:exact;print-color-adjust:exact;} .prw-imgs img{filter:grayscale(1);}" : "";
      var fullHTML = '<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>چاپ روزانه - بولت ژورنال</title>' +
        '<style>' +
        '@page{size:A4;margin:14mm;}' +
        'html,body{margin:0;padding:0;background:#fff;}' +
        'body{font-family:"Vazirmatn",Tahoma,sans-serif;color:#1c1c1c;}' +
        '.prw-page{page-break-after:always;padding:2mm;}' +
        '.prw-page:last-child{page-break-after:auto;}' +
        '.prw-date{font-size:18px;font-weight:700;color:#8a5f1e;border-bottom:2px solid #C9A24B;padding-bottom:6px;margin-bottom:14px;}' +
        '.prw-section-title{font-size:13px;font-weight:700;margin:16px 0 6px;color:#333;}' +
        '.prw-journal{white-space:pre-wrap;line-height:2;font-size:13px;border:1px solid #ddd;border-radius:8px;padding:10px;min-height:30px;}' +
        '.prw-task{display:flex;align-items:center;gap:6px;font-size:12.5px;padding:4px 0;border-bottom:1px dashed #eee;}' +
        '.prw-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}' +
        '.prw-done{text-decoration:line-through;color:#888;}' +
        '.prw-imgs{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;}' +
        '.prw-imgs img{width:110px;height:110px;object-fit:cover;border-radius:8px;border:1px solid #ddd;}' +
        '.prw-toolbar{position:fixed;top:8px;left:8px;z-index:10;}' +
        '.prw-toolbar button{background:#2E6DA4;color:#fff;border:none;border-radius:8px;padding:9px 16px;font-size:13px;cursor:pointer;font-family:inherit;}' +
        '@media print{.prw-toolbar{display:none;}}' +
        bwCss +
        '</style></head><body>' +
        '<div class="prw-toolbar"><button onclick="window.print()">چاپ / ذخیره PDF</button></div>' +
        pagesHTML.join("") +
        '</body></html>';

      printWin.document.open();
      printWin.document.write(fullHTML);
      printWin.document.close();
      setStatus("آماده شد. از پنجره‌ی جدید، «چاپ / ذخیره PDF» رو بزن — از دیالوگ چاپ می‌تونی پرینتر یا «ذخیره به‌عنوان PDF» و همچنین رنگی/سیاه‌وسفید بودن چاپگر رو انتخاب کنی.");
      // Give images a moment to lay out, then invite print automatically.
      setTimeout(function () {
        try { printWin.focus(); printWin.print(); } catch (e) {}
      }, 500);
    }

    processNext();
  });

  var fab = document.getElementById("prw-fab");
  var overlay = document.getElementById("prw-overlay");
  var panel = document.getElementById("prw-panel");
  var closeBtn = document.getElementById("prw-close");
  function openPanel() {
    var todayIso = toISO(new Date());
    var fromEl = document.getElementById("prw-from"), toEl = document.getElementById("prw-to");
    if (!fromEl.value) fromEl.value = todayIso;
    if (!toEl.value) toEl.value = todayIso;
    setStatus("");
    overlay.style.display = "block"; panel.style.display = "block";
  }
  function closePanel() { overlay.style.display = "none"; panel.style.display = "none"; }
  fab.addEventListener("click", openPanel);
  overlay.addEventListener("click", closePanel);
  closeBtn.addEventListener("click", closePanel);
})();
