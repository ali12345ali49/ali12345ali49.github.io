
(function () {
  // Icons already on the page, each one a fixed-position circular button
  // (see their own <style> blocks earlier in this file). This script does
  // not move or recreate them — it only toggles visibility and overrides
  // their `left`/`top` inline style, so nothing about their existing click
  // handlers/panels changes. They open in the same spot they always did:
  // the top header row, right after the toggle button.
  //
  // Two modes, chosen from Settings (see the bjrow-settings script below,
  // which reads/writes the same localStorage keys):
  //  - "toggle": a small chevron button shows/hides a scrollable row; the
  //    order of icons in that row is customizable.
  //  - "fixed": no chevron button at all — a hand-picked subset of icons
  //    (checkboxes in Settings) is shown permanently, like the app used to
  //    work before the collapsible row existed.
  var ALL_IDS = ["dhw-fab", "skw-fab", "sww-fab", "gtw-fab", "rvw-fab", "alw-fab", "pnd-fab", "prw-fab", "sdw-fab", "pjw-fab", "adhd-fab", "lang-fab", "fin-fab"]; // cbk-fab stays excluded: it's permanently display:none in its own CSS. pnd-fab (ناتمام‌ها) is React-rendered and only exists in the DOM when the "محل دسترسی به ناتمام‌ها" setting is set to "بالا"; the layout() loop below already skips ids with no matching element, so it's safe to always keep it in this list.
  var MODE_KEY = "bjRowMode";       // "toggle" | "fixed"
  var ORDER_KEY = "bjRowOrder";     // JSON array of the 5 ids, custom order (toggle mode)
  var FIXED_KEY = "bjRowFixedIds";  // JSON array of ids to always show (fixed mode)
  var TOP = 10;
  var BASE_LEFT = 86;      // same spot they always opened at — right after the toggle button
  var FIXED_BASE_LEFT = 48; // fixed mode has no toggle button, so start right where IT sits (gear's neighbor), closing that gap
  var MAX_GAP = 38;        // normal spacing between icon centers
  var MIN_GAP = 30;        // never squeeze tighter than the icon's own width
  var ICON_W = 30;         // actual circular-button width
  var VISIBLE_COUNT = 4;   // always exactly 4 icons visible in toggle mode, rest reachable by scroll
  var MAX_FIXED = 5;      // hard cap enforced by the settings panel too — never more than 5 pinned at once
  var STORE_KEY = "bjRowOpen";

  function getMode() {
    try { return localStorage.getItem(MODE_KEY) === "fixed" ? "fixed" : "toggle"; } catch (e) { return "toggle"; }
  }
  function getOrder() {
    try {
      var raw = JSON.parse(localStorage.getItem(ORDER_KEY) || "null");
      if (Array.isArray(raw)) {
        var valid = raw.filter(function (id) { return ALL_IDS.indexOf(id) !== -1; });
        ALL_IDS.forEach(function (id) { if (valid.indexOf(id) === -1) valid.push(id); });
        if (valid.length === ALL_IDS.length) return valid;
      }
    } catch (e) {}
    return ALL_IDS.slice();
  }
  function getFixed() {
    try {
      var raw = JSON.parse(localStorage.getItem(FIXED_KEY) || "null");
      if (Array.isArray(raw)) return raw.filter(function (id) { return ALL_IDS.indexOf(id) !== -1; }).slice(0, MAX_FIXED);
    } catch (e) {}
    return ALL_IDS.slice(0, MAX_FIXED); // default: the 5 original icons; pnd-fab starts unchecked so a fresh install never silently exceeds the cap
  }

  var open = false;
  try { open = localStorage.getItem(STORE_KEY) === "1"; } catch (e) {}
  var scrollX = 0;

  function currentIds() {
    var mode = getMode();
    var arr;
    if (mode === "fixed") {
      // Same shared order used by the toggle row, filtered down to just the
      // hand-picked subset — so reordering in Settings (now available for
      // both modes) moves icons consistently everywhere.
      var fixedSet = getFixed();
      arr = getOrder().filter(function (id) { return fixedSet.indexOf(id) !== -1; });
    } else {
      arr = getOrder().slice();
    }
    // Only keep ids that actually have an element in the DOM right now.
    // pnd-fab in particular is React-rendered and only exists while the
    // "محل دسترسی به ناتمام‌ها" setting is set to "بالا" — if it's absent we
    // must not reserve a slot for it (that would leave a phantom gap in the
    // toggle row and throw off the "always show 4" math).
    return arr.filter(function (id) { return !!document.getElementById(id); });
  }

  // Finds the left edge of the "بولت ژورنال" title. Icon spacing is squeezed
  // (never below MIN_GAP) so the visible icons always fit before it.
  function titleLeftEdge() {
    var all = document.querySelectorAll("div");
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.children.length === 0 && el.textContent === "\u0628\u0648\u0644\u062A \u0698\u0648\u0631\u0646\u0627\u0644") {
        var r = el.getBoundingClientRect();
        if (r.width > 0) return r.left;
      }
    }
    return null;
  }

  function safeWindowWidth() {
    var titleLeft = titleLeftEdge();
    return titleLeft != null
      ? Math.max(ICON_W, titleLeft - 10 - BASE_LEFT)          // stop 10px short of the title
      : Math.max(ICON_W, window.innerWidth - BASE_LEFT - 170); // fallback if title not found yet
  }

  function layout() {
    var mode = getMode();
    var ids = currentIds();
    var safeWindow = safeWindowWidth();

    // Hide any managed icon that exists in the DOM but isn't part of the
    // current set (e.g. unchecked in "fixed" mode, or scrolled out of the
    // window's range check below doesn't cover this — that's handled per
    // mode further down). Without this, an icon someone just unchecked
    // would keep sitting wherever it last was instead of disappearing.
    ALL_IDS.forEach(function (id) {
      if (ids.indexOf(id) !== -1) return;
      var el = document.getElementById(id);
      if (el) el.style.display = "none";
    });

    if (mode === "fixed") {
      // No collapse, no scroll — and no stretching either: use the exact
      // same standard gap the toggle row uses for its slots, so a fixed
      // icon always sits in the same spot the toggle button / cake / book /
      // moon / GTD icon would occupy, regardless of how many of the (max 5)
      // icons are selected.
      var gapF = Math.min(MAX_GAP, Math.max(MIN_GAP, (safeWindow - ICON_W) / (VISIBLE_COUNT - 1)));
      ids.forEach(function (id, i) {
        var el = document.getElementById(id);
        if (!el) return;
        el.style.position = "fixed";
        el.style.top = TOP + "px";
        el.style.left = (FIXED_BASE_LEFT + i * gapF) + "px";
        el.style.display = "flex";
      });
      updateHelpBtn();
      return gapF;
    }

    // Toggle mode: fit exactly VISIBLE_COUNT icons into whatever room is
    // available, shrinking the gap between them (down to MIN_GAP).
    var gap = Math.min(MAX_GAP, Math.max(MIN_GAP, (safeWindow - ICON_W) / (VISIBLE_COUNT - 1)));
    var maxStartIndex = Math.max(0, ids.length - VISIBLE_COUNT);
    var maxScroll = maxStartIndex * gap;
    scrollX = Math.min(Math.max(scrollX, 0), maxScroll);
    // Which icon is "leading" the visible window is decided by the nearest
    // whole step, not by raw pixel overlap — that way exactly 4 full icons
    // are always shown, even while mid-drag between two steps (previously a
    // partially-scrolled position could leave both edge icons half-hidden,
    // showing only 3).
    var startIndex = Math.min(maxStartIndex, Math.max(0, Math.round(scrollX / gap)));

    ids.forEach(function (id, i) {
      var el = document.getElementById(id);
      if (!el) return;
      if (!open) { el.style.display = "none"; return; }
      var left = BASE_LEFT + i * gap - scrollX;
      el.style.position = "fixed";
      el.style.top = TOP + "px";
      el.style.left = left + "px";
      var visible = i >= startIndex && i < startIndex + VISIBLE_COUNT;
      el.style.display = visible ? "flex" : "none";
    });

    updateHelpBtn();
    return gap;
  }

  var toggleBtn = document.createElement("button");
  toggleBtn.id = "bjrow-toggle";
  toggleBtn.title = "نمایش/مخفی‌کردن آیکون‌ها";
  // A thin two-stroke chevron (not a filled triangle) — same style as the
  // app's own chevron icons (e.g. the calendar's prev/next month arrows).
  // Points right (›) when closed, points left (‹) when open.
  toggleBtn.innerHTML =
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<polyline points="9 6 15 12 9 18"></polyline></svg>';
  var chevronSvg = toggleBtn.querySelector("svg");
  function setToggleGlyph() {
    // بسته = پیکان رو به راست (›)، باز = پیکان رو به چپ (‹)
    chevronSvg.style.transform = open ? "rotate(180deg)" : "rotate(0deg)";
  }
  setToggleGlyph();
  function updateToggleVisibility() {
    toggleBtn.style.display = getMode() === "fixed" ? "none" : "flex";
  }
  toggleBtn.addEventListener("click", function () {
    open = !open;
    scrollX = 0;
    try { localStorage.setItem(STORE_KEY, open ? "1" : "0"); } catch (e) {}
    toggleBtn.classList.toggle("bjrow-active", open);
    setToggleGlyph();
    layout();
  });
  document.body.appendChild(toggleBtn);
  toggleBtn.classList.toggle("bjrow-active", open);
  updateToggleVisibility();

  // Shown up to twice per install: the person may miss or dismiss it once
  // without meaning to, so a single lifetime showing was too fragile. After
  // the second dismissal it's gone for good (localStorage counter), so it
  // never turns into a nag.
  var HELP_SEEN_KEY = "bjRowHelpShownCount";
  var HELP_MAX_SHOWS = 2;
  var HELP_LABELS = {
    "dhw-fab": "سن و شمارش معکوس",
    "skw-fab": "خودشناسی",
    "sww-fab": "خواب و کار",
    "gtw-fab": "مدیریت کارها (GTD)",
    "rvw-fab": "بازنگری",
    "alw-fab": "فعالیت‌های دلخواه",
    "pnd-fab": "ناتمام‌ها",
    "prw-fab": "چاپ / خروجی روزانه",
    "sdw-fab": "دستیار درس",
    "pjw-fab": "پروژه‌ها",
    "adhd-fab": "حالت تمرکز / ADHD",
    "lang-fab": "زبان‌آموز",
    "fin-fab": "مدیریت مالی"
  };
  function bjHelpIconEl(id) {
    var wrap = document.createElement("span");
    wrap.style.cssText =
      "display:flex;align-items:center;justify-content:center;width:24px;height:24px;" +
      "flex-shrink:0;font-size:15px;line-height:1;";
    var iconsMap = window.bjIconsMap || {};
    var d = iconsMap[id];
    if (!d) return wrap;
    var style = window.bjGetIconStyle ? window.bjGetIconStyle() : "color";
    var isSvg = (style === "line" || style === "line-theme" || style === "soft" || style === "duotone");
    if (isSvg) {
      wrap.innerHTML = d.svg;
      wrap.style.color = "var(--accent-fixed)";
      var svgEl = wrap.querySelector("svg");
      if (svgEl) { svgEl.setAttribute("width", "17"); svgEl.setAttribute("height", "17"); }
    } else {
      wrap.textContent = d.emoji;
    }
    return wrap;
  }

  function bjHelpRowEl(id, labels) {
    var row = document.createElement("div");
    row.style.cssText =
      "background:var(--bg2);border:1px solid var(--border);border-radius:9px;" +
      "padding:9px 10px;font-size:12.5px;display:flex;align-items:center;gap:9px;";
    row.appendChild(bjHelpIconEl(id));
    var label = document.createElement("span");
    label.textContent = labels[id] || id;
    row.appendChild(label);
    return row;
  }

  var helpShowCount = 0;
  try { helpShowCount = parseInt(localStorage.getItem(HELP_SEEN_KEY) || "0", 10) || 0; } catch (e) {}
  var helpSeen = helpShowCount >= HELP_MAX_SHOWS;
  var helpBtn = null;
  if (!helpSeen) {
    helpBtn = document.createElement("button");
    helpBtn.id = "bjrow-help";
    helpBtn.title = "این آیکون‌ها چی هستن؟";
    helpBtn.textContent = "؟";
    helpBtn.addEventListener("click", function (ev) {
      ev.stopPropagation();
      var ids = currentIds();

      // Build an in-app bottom-sheet instead of window.alert(): some webview
      // contexts (in-app browsers, certain mobile wrappers) silently swallow
      // native alert()/confirm() dialogs, which made this button look like it
      // did nothing when tapped. A DOM panel always renders regardless.
      var overlay = document.createElement("div");
      overlay.style.cssText =
        "position:fixed;inset:0;z-index:100000000;background:rgba(0,0,0,0.6);" +
        "display:flex;align-items:flex-end;justify-content:center;";

      var card = document.createElement("div");
      card.dir = "rtl";
      card.style.cssText =
        "width:100%;max-width:480px;background:var(--bg1);border:1px solid var(--border);" +
        "border-radius:16px 16px 0 0;padding:18px 16px 22px;box-shadow:0 -10px 30px rgba(0,0,0,0.4);" +
        "font-family:Vazirmatn,Tahoma,sans-serif;color:var(--text);box-sizing:border-box;";

      var handle = document.createElement("div");
      handle.style.cssText = "width:40px;height:4px;border-radius:2px;background:var(--border);margin:0 auto 14px;";
      card.appendChild(handle);

      var title = document.createElement("div");
      title.textContent = "این آیکون‌ها میان‌برهای بخش‌های مختلف برنامه‌ان";
      title.style.cssText = "font-size:14.5px;font-weight:700;margin-bottom:4px;";
      card.appendChild(title);

      var subtitle = document.createElement("div");
      subtitle.textContent = "هرکدوم رو بزنی همون بخش باز می‌شه:";
      subtitle.style.cssText = "font-size:11.5px;color:var(--muted);margin-bottom:12px;";
      card.appendChild(subtitle);

      var list = document.createElement("div");
      list.style.cssText = "display:flex;flex-direction:column;gap:8px;margin-bottom:14px;max-height:45vh;overflow-y:auto;";
      ids.forEach(function (id) {
        list.appendChild(bjHelpRowEl(id, HELP_LABELS));
      });
      card.appendChild(list);

      var scrollNote = document.createElement("div");
      scrollNote.textContent =
        "برای دیدن بقیه‌شون، روی همین ردیف بکش (اسکرول کن). توضیح کامل و با مثال هر بخش رو توی «راهنمای کامل» (از تنظیمات) می‌بینی؛ ترتیب و نوع نمایش این آیکون‌ها (ثابت یا تاشو، رنگی یا خطی و بقیه‌ی سبک‌ها) رو هم از تنظیمات، بخش «ردیف آیکون‌های شناور بالای صفحه» می‌تونی تغییر بدی.";
      scrollNote.style.cssText = "font-size:11px;color:var(--muted);margin-bottom:16px;line-height:1.8;";
      card.appendChild(scrollNote);

      var closeBtn = document.createElement("button");
      closeBtn.textContent = "متوجه شدم";
      closeBtn.style.cssText =
        "width:100%;background:var(--accent-fixed);border:none;border-radius:10px;" +
        "padding:11px;color:var(--on-accent);font-weight:700;cursor:pointer;font-size:13px;" +
        "font-family:inherit;";

      function dismiss() {
        var current = 0;
        try { current = parseInt(localStorage.getItem(HELP_SEEN_KEY) || "0", 10) || 0; } catch (e2) {}
        var next = current + 1;
        try { localStorage.setItem(HELP_SEEN_KEY, String(next)); } catch (e2) {}
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (next >= HELP_MAX_SHOWS) {
          if (helpBtn && helpBtn.parentNode) helpBtn.parentNode.removeChild(helpBtn);
          helpBtn = null;
        }
      }
      closeBtn.addEventListener("click", dismiss);
      overlay.addEventListener("click", function (e2) { if (e2.target === overlay) dismiss(); });
      card.appendChild(closeBtn);

      overlay.appendChild(card);
      document.body.appendChild(overlay);
    });
    document.body.appendChild(helpBtn);
  }
  function updateHelpBtn() {
    if (!helpBtn) return;
    var visible = getMode() === "toggle" && open;
    helpBtn.style.display = visible ? "flex" : "none";
    if (!visible) return;
    var gap = safeWindowWidthGapEstimate();
    var idsCount = Math.min(VISIBLE_COUNT, currentIds().length);
    var left = BASE_LEFT + idsCount * gap;
    var maxLeft = BASE_LEFT + safeWindowWidth() - 20;
    if (left > maxLeft) left = maxLeft;
    helpBtn.style.left = left + "px";
    helpBtn.style.top = TOP + "px";
  }

  // Drag-to-scroll (touch + mouse) over the icon strip area, only while
  // expanded and in toggle mode.
  var dragging = false, startX = 0, startScroll = 0, moved = false;
  function hitTest(x, y) {
    return getMode() === "toggle" && open && y >= TOP - 6 && y <= TOP + ICON_W + 6 && x >= BASE_LEFT - 6;
  }
  function down(x, y) {
    if (!hitTest(x, y)) return false;
    dragging = true; moved = false; startX = x; startScroll = scrollX;
    return true;
  }
  function move(x) {
    if (!dragging) return;
    var dx = startX - x;
    if (Math.abs(dx) > 3) moved = true;
    scrollX = startScroll + dx;
    layout();
  }
  function up() {
    if (dragging) {
      // Snap to the nearest full step so the row always rests showing
      // whole icons, never a half-scrolled one.
      var gap = safeWindowWidthGapEstimate();
      if (gap) scrollX = Math.round(scrollX / gap) * gap;
      layout();
    }
    dragging = false;
  }
  function safeWindowWidthGapEstimate() {
    var safeWindow = safeWindowWidth();
    return Math.min(MAX_GAP, Math.max(MIN_GAP, (safeWindow - ICON_W) / (VISIBLE_COUNT - 1)));
  }

  document.addEventListener("touchstart", function (e) {
    var t = e.touches[0];
    down(t.clientX, t.clientY);
  }, { passive: true });
  document.addEventListener("touchmove", function (e) {
    if (!dragging) return;
    move(e.touches[0].clientX);
  }, { passive: true });
  document.addEventListener("touchend", up);

  document.addEventListener("mousedown", function (e) { if (down(e.clientX, e.clientY)) e.preventDefault(); });
  document.addEventListener("mousemove", function (e) { move(e.clientX); });
  document.addEventListener("mouseup", up);

  window.addEventListener("resize", layout);

  // Called by the settings panel (bjrow-settings script) whenever the mode,
  // order, or fixed-icon selection changes, so the row updates immediately.
  window.bjRowApplySettings = function () {
    scrollX = 0;
    updateToggleVisibility();
    layout();
  };

  // pnd-fab is mounted/unmounted by React depending on a setting; a light poll
  // keeps the row correct without hooking into the app's own render cycle.
  setInterval(layout, 700);

  // Called by other features (e.g. the onboarding tour) that need to point
  // at one of these managed icons even though it might currently be
  // scrolled out of view or hidden behind the collapsed toggle. Opens the
  // row if needed and scrolls just enough to bring the icon into the
  // visible window, so callers can then measure/highlight it normally.
  // Returns true if the icon is now visible, false if it can't be shown
  // (e.g. it's excluded from the user's own "fixed" icon selection).
  window.bjRowRevealIcon = function (id) {
    if (ALL_IDS.indexOf(id) === -1) return false;
    if (getMode() === "fixed") {
      // Fixed mode has no toggle/scroll — an icon is either already
      // permanently on screen (part of the user's chosen subset) or
      // intentionally left out by their own settings, which we respect.
      return getFixed().indexOf(id) !== -1;
    }
    var ids = currentIds();
    var idx = ids.indexOf(id);
    if (idx === -1) return false;
    if (!open) {
      open = true;
      try { localStorage.setItem(STORE_KEY, "1"); } catch (e) {}
      toggleBtn.classList.add("bjrow-active");
      setToggleGlyph();
    }
    var gap = safeWindowWidthGapEstimate();
    var maxStartIndex = Math.max(0, ids.length - VISIBLE_COUNT);
    var startIndex = Math.round(scrollX / gap);
    if (idx < startIndex || idx >= startIndex + VISIBLE_COUNT) {
      var desiredStart = Math.min(maxStartIndex, Math.max(0, idx - (VISIBLE_COUNT - 1)));
      scrollX = desiredStart * gap;
    }
    layout();
    return true;
  };

  layout();
})();
