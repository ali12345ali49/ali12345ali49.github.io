(function () {
  var CATEGORIES = {
    know: { title: "خودشناسی", defaultSections: ["باورها و ارزش‌ها", "نقاط قوت و ضعف", "علایق و اهداف"] },
    change: { title: "تغییراتی که می‌خوام انجام بدم", defaultSections: ["تغییرات کوتاه‌مدت", "تغییرات بلندمدت"] },
    mistake: { title: "اشتباهاتی که دوست ندارم دیگه تکرار کنم", defaultSections: ["اشتباهات و درس‌هایی که گرفتم"] }
  };
  var LEGACY_KEYS = { know: "skw:knowledge", change: "skw:changes", mistake: "skw:mistakes" };
  var CUSTOM_CATS_KEY = "skw:customCats";
  var customCats = [];

  var currentCat = null;
  var currentSection = null;
  var saveTimer = null;

  function sectionsKey(cat) { return "skw:sections:" + cat; }
  function textKey(cat, section) { return "skw:text:" + cat + ":" + section; }

  function titleOf(cat) {
    if (CATEGORIES[cat]) return CATEGORIES[cat].title;
    var found = customCats.filter(function (c) { return c.id === cat; })[0];
    return found ? found.title : "";
  }

  function loadCustomCats() {
    return window.storage.get(CUSTOM_CATS_KEY).then(function (r) { return r.value || []; }).catch(function () { return []; });
  }
  function saveCustomCats() { return window.storage.set(CUSTOM_CATS_KEY, customCats); }

  function ensureSections(cat) {
    return window.storage.get(sectionsKey(cat)).then(function (r) {
      return r.value;
    }).catch(function () {
      var defaults = CATEGORIES[cat] ? CATEGORIES[cat].defaultSections.slice() : [];
      return window.storage.set(sectionsKey(cat), defaults).then(function () {
        if (!LEGACY_KEYS[cat]) return defaults;
        return window.storage.get(LEGACY_KEYS[cat]).then(function (r) {
          if (r && typeof r.value === "string" && r.value) {
            return window.storage.set(textKey(cat, defaults[0]), r.value).then(function () { return defaults; });
          }
          return defaults;
        }).catch(function () { return defaults; });
      });
    });
  }

  var fab = document.getElementById("skw-fab");
  var overlay = document.getElementById("skw-overlay");
  var panel = document.getElementById("skw-panel");
  var closeBtn = document.getElementById("skw-close");
  var catPage = document.getElementById("skw-cat-page");
  var catTitleEl = document.getElementById("skw-cat-title");
  var catBack = document.getElementById("skw-cat-back");
  var sectionList = document.getElementById("skw-section-list");
  var editorPage = document.getElementById("skw-editor-page");
  var editorTitleEl = document.getElementById("skw-editor-title");
  var editorBack = document.getElementById("skw-editor-back");
  var editorTextarea = document.getElementById("skw-editor-textarea");
  var editorSaved = document.getElementById("skw-editor-saved");

  var customCatsWrap = document.getElementById("skw-custom-cats");
  var addCatBtn = document.getElementById("skw-add-cat");

  // ---- in-app replacement for window.prompt() ----
  var tpOverlay = document.getElementById("skw-tp-overlay");
  var tpTitle = document.getElementById("skw-tp-title");
  var tpInput = document.getElementById("skw-tp-input");
  var tpCancel = document.getElementById("skw-tp-cancel");
  var tpConfirm = document.getElementById("skw-tp-confirm");
  var tpResolve = null;
  function skwPrompt(title, placeholder) {
    return new Promise(function (resolve) {
      tpResolve = resolve;
      tpTitle.textContent = title;
      tpInput.value = "";
      tpInput.placeholder = placeholder || "";
      tpOverlay.style.display = "flex";
      setTimeout(function () { tpInput.focus(); }, 30);
    });
  }
  function tpFinish(value) {
    tpOverlay.style.display = "none";
    var r = tpResolve;
    tpResolve = null;
    if (r) r(value);
  }
  tpCancel.addEventListener("click", function () { tpFinish(null); });
  tpOverlay.addEventListener("click", function (e) { if (e.target === tpOverlay) tpFinish(null); });
  tpConfirm.addEventListener("click", function () { tpFinish(tpInput.value); });
  tpInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); tpFinish(tpInput.value); }
    else if (e.key === "Escape") { tpFinish(null); }
  });

  function renderCustomCatsList() {
    customCatsWrap.innerHTML = "";
    customCats.forEach(function (c) {
      var row = document.createElement("div");
      row.className = "skw-cat";
      row.innerHTML =
        '<span class="skw-cat-title"></span>' +
        '<span style="display:flex;align-items:center;">' +
        '<button class="skw-cat-del" data-delcat="' + c.id + '">✕</button>' +
        '<span class="skw-cat-icon">‹</span></span>';
      row.querySelector(".skw-cat-title").textContent = c.title;
      row.addEventListener("click", function () { openCategory(c.id); });
      var delBtn = row.querySelector(".skw-cat-del");
      delBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        window.bjConfirm("این دسته و همه‌ی نوشته‌های توش پاک بشه؟", function () {
          window.storage.get(sectionsKey(c.id)).then(function (r) { return r.value || []; }).catch(function () { return []; })
            .then(function (sections) {
              var dels = sections.map(function (s) { return window.storage.delete(textKey(c.id, s)).catch(function () {}); });
              return Promise.all(dels);
            }).then(function () {
              return window.storage.delete(sectionsKey(c.id)).catch(function () {});
            }).then(function () {
              customCats = customCats.filter(function (x) { return x.id !== c.id; });
              saveCustomCats().then(renderCustomCatsList);
            });
        });
      });
      customCatsWrap.appendChild(row);
    });
  }

  addCatBtn.addEventListener("click", function () {
    skwPrompt("اسم دسته‌ی جدید رو بنویس:", "مثلاً عادت‌های خوب").then(function (name) {
      if (!name) return;
      name = name.trim();
      if (!name) return;
      var id = "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      customCats.push({ id: id, title: name });
      saveCustomCats().then(renderCustomCatsList);
    });
  });

  function openPanel() {
    overlay.style.display = "block"; panel.style.display = "block";
    loadCustomCats().then(function (list) { customCats = list; renderCustomCatsList(); });
  }
  function closePanel() { overlay.style.display = "none"; panel.style.display = "none"; }
  fab.addEventListener("click", openPanel);
  overlay.addEventListener("click", closePanel);
  closeBtn.addEventListener("click", closePanel);

  function renderSections(cat) {
    sectionList.innerHTML = "<div style=\"text-align:center;color:#6B7280;font-size:12px;padding:20px 0;\">در حال بارگذاری...</div>";
    ensureSections(cat).then(function (sections) {
      sectionList.innerHTML = "";
      sections.forEach(function (name) {
        var row = document.createElement("div");
        row.className = "skw-section-row";

        var title = document.createElement("div");
        title.className = "skw-section-name";
        title.textContent = name;

        var preview = document.createElement("div");
        preview.className = "skw-section-preview";
        preview.textContent = "بارگذاری...";

        row.appendChild(title);
        row.appendChild(preview);
        row.addEventListener("click", function () { openEditor(cat, name); });
        sectionList.appendChild(row);

        window.storage.get(textKey(cat, name)).then(function (r) {
          var val = (r && typeof r.value === "string") ? r.value : "";
          preview.textContent = val ? val.replace(/\s+/g, " ").slice(0, 60) : "هنوز چیزی ننوشتی";
        }).catch(function () {
          preview.textContent = "هنوز چیزی ننوشتی";
        });
      });

      var addBtn = document.createElement("button");
      addBtn.className = "skw-add-section-btn";
      addBtn.textContent = "+ افزودن بخش جدید";
      addBtn.addEventListener("click", function () {
        skwPrompt("اسم بخش جدید رو بنویس:").then(function (name) {
          if (!name) return;
          name = name.trim();
          if (!name) return;
          window.storage.get(sectionsKey(cat)).then(function (r) {
            var list = r.value || [];
            if (list.indexOf(name) === -1) list.push(name);
            return window.storage.set(sectionsKey(cat), list);
          }).then(function () { renderSections(cat); });
        });
      });
      sectionList.appendChild(addBtn);
    });
  }

  function openCategory(cat) {
    currentCat = cat;
    catTitleEl.textContent = titleOf(cat);
    renderSections(cat);
    panel.style.display = "none";
    overlay.style.display = "none";
    catPage.style.display = "flex";
  }
  function closeCatPage() { catPage.style.display = "none"; }
  catBack.addEventListener("click", closeCatPage);

  function openEditor(cat, section) {
    currentSection = section;
    editorTitleEl.textContent = section;
    editorTextarea.value = "";
    editorSaved.textContent = "\u00A0";
    window.storage.get(textKey(cat, section)).then(function (r) {
      if (r && typeof r.value === "string") editorTextarea.value = r.value;
    }).catch(function () {});
    catPage.style.display = "none";
    editorPage.style.display = "flex";
    setTimeout(function () { editorTextarea.focus(); }, 50);
  }
  function closeEditor() {
    editorPage.style.display = "none";
    catPage.style.display = "flex";
    renderSections(currentCat);
  }
  editorBack.addEventListener("click", closeEditor);

  editorTextarea.addEventListener("input", function () {
    clearTimeout(saveTimer);
    var cat = currentCat, section = currentSection, val = editorTextarea.value;
    saveTimer = setTimeout(function () {
      window.storage.set(textKey(cat, section), val).then(function () {
        editorSaved.textContent = "ذخیره شد";
        clearTimeout(editorSaved._t);
        editorSaved._t = setTimeout(function () { editorSaved.textContent = "\u00A0"; }, 1500);
      });
    }, 600);
  });

  Array.prototype.forEach.call(document.querySelectorAll(".skw-cat"), function (el) {
    el.addEventListener("click", function () { openCategory(el.getAttribute("data-cat")); });
  });
})();
