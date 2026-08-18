
(function () {
  var DB_NAME = "bulletjournal-db";
  var STORE = "kv";

  function openKvDb() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () { req.result.createObjectStore(STORE); };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function readAllKv() {
    return openKvDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readonly");
        var store = tx.objectStore(STORE);
        var keysReq = store.getAllKeys();
        keysReq.onerror = function () { reject(keysReq.error); };
        keysReq.onsuccess = function () {
          var keys = keysReq.result;
          var valsReq = store.getAll();
          valsReq.onerror = function () { reject(valsReq.error); };
          valsReq.onsuccess = function () {
            var vals = valsReq.result;
            var out = {};
            keys.forEach(function (k, i) { out[k] = vals[i]; });
            resolve(out);
          };
        };
      });
    });
  }

  function writeAllKv(data) {
    return openKvDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readwrite");
        var store = tx.objectStore(STORE);
        Object.keys(data).forEach(function (k) { store.put(data[k], k); });
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function blobToDataURL(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  }
  function encodeBlobsForExport(allData) {
    var keys = Object.keys(allData);
    var i = 0;
    function next() {
      if (i >= keys.length) return Promise.resolve(allData);
      var k = keys[i++];
      var v = allData[k];
      if (v instanceof Blob) {
        return blobToDataURL(v).then(function (b64) {
          allData[k] = { __bjBlob: true, type: v.type, b64: b64 };
          return next();
        });
      }
      return next();
    }
    return next();
  }
  function decodeBlobsForImport(data) {
    var keys = Object.keys(data);
    var i = 0;
    function next() {
      if (i >= keys.length) return Promise.resolve(data);
      var k = keys[i++];
      var v = data[k];
      if (v && typeof v === "object" && v.__bjBlob) {
        return fetch(v.b64).then(function (r) { return r.blob(); }).then(function (blob) {
          data[k] = blob;
          return next();
        }).catch(function () { return next(); });
      }
      return next();
    }
    return next();
  }
  // localStorage isn't part of the IndexedDB "kv" store, so it's captured separately
  // here and folded into the same backup file. This is what carries settings like the
  // study-assistant's pomodoro durations/sound/breathing-pattern choice (سدو) and every
  // other localStorage-based preference through a full backup/restore.
  function readAllLocalStorage() {
    var out = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        out[k] = localStorage.getItem(k);
      }
    } catch (e) {}
    return out;
  }
  function writeAllLocalStorage(data) {
    if (!data || typeof data !== "object") return;
    Object.keys(data).forEach(function (k) {
      try { localStorage.setItem(k, data[k]); } catch (e) {}
    });
  }
  function buildBackupFile() {
    return readAllKv().then(function (allData) {
      return encodeBlobsForExport(allData);
    }).then(function (allData) {
      var payload = { __full: true, version: 3, exportedAt: new Date().toISOString(), data: allData, localStorage: readAllLocalStorage() };
      var json = JSON.stringify(payload, null, 2);
      var dateStr = new Date().toISOString().slice(0, 10);
      var filename = "bullet-journal-backup-" + dateStr + ".json";
      return new File([json], filename, { type: "application/json" });
    });
  }

  function setStatus(msg) {
    var el = document.getElementById("cbk-status");
    if (el) el.textContent = msg || "";
  }

  var fab = document.getElementById("cbk-fab");
  var overlay = document.getElementById("cbk-overlay");
  var panel = document.getElementById("cbk-panel");
  var closeBtn = document.getElementById("cbk-close");
  function openPanel() { overlay.style.display = "block"; panel.style.display = "block"; setStatus(""); }
  function closePanel() { overlay.style.display = "none"; panel.style.display = "none"; }
  fab.addEventListener("click", openPanel);
  overlay.addEventListener("click", closePanel);
  closeBtn.addEventListener("click", closePanel);

  document.getElementById("cbk-send").addEventListener("click", function () {
    setStatus("در حال آماده‌سازی فایل...");
    buildBackupFile().then(function (file) {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
          files: [file],
          title: "پشتیبان بولت ژورنال",
          text: "فایل پشتیبان بولت ژورنال"
        }).then(function () {
          setStatus("ارسال شد ✓");
        }).catch(function (err) {
          if (err && err.name === "AbortError") { setStatus(""); return; }
          setStatus("اشتراک‌گذاری لغو شد، در حال دانلود عادی...");
          downloadFallback(file);
        });
      } else {
        setStatus("اشتراک‌گذاری مستقیم پشتیبانی نمی‌شه؛ فایل دانلود شد، خودت به فضای ابری منتقلش کن.");
        downloadFallback(file);
      }
    }).catch(function (err) {
      console.error("backup build failed", err);
      setStatus("خطا در ساخت فایل پشتیبان.");
    });
  });

  function downloadFallback(file) {
    var url = URL.createObjectURL(file);
    var a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  var restoreBtn = document.getElementById("cbk-restore-btn");
  var restoreInput = document.getElementById("cbk-restore-input");
  restoreBtn.addEventListener("click", function () { restoreInput.click(); });
  restoreInput.addEventListener("change", function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    setStatus("در حال بازیابی...");
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(reader.result);
        var dataToWritePromise = null;
        if (parsed && parsed.__full && parsed.data) {
          dataToWritePromise = decodeBlobsForImport(parsed.data);
        } else if (parsed && ("days" in parsed || "habits" in parsed || "goals" in parsed)) {
          dataToWritePromise = Promise.resolve({ "bj-state": JSON.stringify(parsed) });
        } else {
          throw new Error("bad-shape");
        }
        dataToWritePromise.then(function (dataToWrite) {
          return writeAllKv(dataToWrite);
        }).then(function () {
          if (parsed && parsed.localStorage && typeof parsed.localStorage === "object") {
            writeAllLocalStorage(parsed.localStorage);
          }
          setStatus("بازیابی موفق بود. صفحه در حال بارگذاری مجدده...");
          setTimeout(function () { window.location.reload(); }, 800);
        }).catch(function (err) {
          console.error("restore write failed", err);
          setStatus("خطا در ذخیره‌سازی داده‌های بازیابی‌شده.");
        });
      } catch (err) {
        console.error("restore parse failed", err);
        setStatus("این فایل، فایل پشتیبان معتبری نیست.");
      }
    };
    reader.onerror = function () { setStatus("خواندن فایل با خطا مواجه شد."); };
    reader.readAsText(file);
    restoreInput.value = "";
  });
})();
