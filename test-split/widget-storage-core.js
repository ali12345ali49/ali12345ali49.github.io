
// ---------- IndexedDB-backed storage shim (same pattern as Lord) ----------
window.storage = (function () {
  const DB_NAME = "bulletjournal-db";
  const STORE = "kv";
  let dbPromise = null;

  function openDB() {
    if (!window.indexedDB) return Promise.reject(new Error("indexedDB unavailable"));
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return dbPromise;
  }

  function withStore(mode, fn) {
    return openDB().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      const result = fn(store);
      tx.oncomplete = () => resolve(result && result.__req ? result.__req.result : result);
      tx.onerror = () => reject(tx.error);
    }));
  }

  return {
    async get(key) {
      const val = await withStore("readonly", (store) => {
        let out;
        const req = store.get(key);
        req.onsuccess = () => { out = req.result; };
        return { __req: { get result() { return out; } } };
      });
      if (val === undefined) throw new Error("not found");
      return { key, value: val };
    },
    async set(key, value) {
      await withStore("readwrite", (store) => store.put(value, key));
      return { key, value };
    },
    async delete(key) {
      await withStore("readwrite", (store) => store.delete(key));
      return { key, deleted: true };
    },
    // Writes multiple key/value pairs inside a single IndexedDB transaction.
    // Either all puts succeed or (on any error) none are committed — used for
    // operations like moving a task between two days, where a partial write
    // would otherwise be able to leave the task duplicated or lost.
    async setMany(pairs) {
      await withStore("readwrite", (store) => {
        pairs.forEach(([key, value]) => store.put(value, key));
      });
      return { ok: true };
    },
    async list(prefix) {
      const keys = await withStore("readonly", (store) => {
        let out;
        const req = store.getAllKeys();
        req.onsuccess = () => { out = req.result; };
        return { __req: { get result() { return out; } } };
      });
      const all = keys || [];
      return prefix ? all.filter((k) => typeof k === "string" && k.indexOf(prefix) === 0) : all;
    },
  };
})();

// ---------- Image compression helper (used before storing photos as separate blobs) ----------
window.bjCompressImage = function (file, maxDim, quality) {
  maxDim = maxDim || 1280;
  quality = quality || 0.72;
  return new Promise(function (resolve, reject) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      var w = img.naturalWidth, h = img.naturalHeight;
      var scale = Math.min(1, maxDim / Math.max(w, h));
      var cw = Math.max(1, Math.round(w * scale));
      var ch = Math.max(1, Math.round(h * scale));
      var canvas = document.createElement("canvas");
      canvas.width = cw; canvas.height = ch;
      var ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, cw, ch);
      URL.revokeObjectURL(url);
      canvas.toBlob(function (blob) {
        if (blob) resolve(blob); else reject(new Error("toBlob failed"));
      }, "image/jpeg", quality);
    };
    img.onerror = function (e) { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
};
