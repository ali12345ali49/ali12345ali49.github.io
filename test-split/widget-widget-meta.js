
(function () {
  var META = [
    { id: "dhw-fab", label: "سن و شمارش معکوس" },
    { id: "skw-fab", label: "خودشناسی" },
    { id: "sww-fab", label: "خواب و کار" },
    { id: "gtw-fab", label: "مدیریت کارها (GTD)" },
    { id: "rvw-fab", label: "بازنگری" },
    { id: "alw-fab", label: "فعالیت‌های دلخواه" },
    { id: "pnd-fab", label: "ناتمام‌ها (فقط اگه «محل دسترسی به ناتمام‌ها» روی بالا باشه)" },
    { id: "prw-fab", label: "چاپ / خروجی روزانه" },
    { id: "sdw-fab", label: "دستیار درس" },
    { id: "pjw-fab", label: "پروژه‌ها" },
    { id: "adhd-fab", label: "حالت تمرکز / ADHD" },
    { id: "lang-fab", label: "زبان‌آموز" },
    { id: "fin-fab", label: "مدیریت مالی" }
  ];
  var MODE_KEY = "bjRowMode";
  var ORDER_KEY = "bjRowOrder";
  var FIXED_KEY = "bjRowFixedIds";
  var MAX_FIXED = 5; // hard cap: never more than 5 icons pinned at once in "fixed" mode, whether or not pnd-fab is one of them

  function defaultOrder() { return META.map(function (m) { return m.id; }); }

  function getMode() {
    try { return localStorage.getItem(MODE_KEY) === "fixed" ? "fixed" : "toggle"; } catch (e) { return "toggle"; }
  }
  function setMode(m) { try { localStorage.setItem(MODE_KEY, m); } catch (e) {} }

  function getOrder() {
    try {
      var raw = JSON.parse(localStorage.getItem(ORDER_KEY) || "null");
      if (Array.isArray(raw)) {
        var valid = raw.filter(function (id) { return META.some(function (m) { return m.id === id; }); });
        defaultOrder().forEach(function (id) { if (valid.indexOf(id) === -1) valid.push(id); });
        if (valid.length === META.length) return valid;
      }
    } catch (e) {}
    return defaultOrder();
  }
  function setOrder(arr) { try { localStorage.setItem(ORDER_KEY, JSON.stringify(arr)); } catch (e) {} }

  function getFixed() {
    try {
      var raw = JSON.parse(localStorage.getItem(FIXED_KEY) || "null");
      if (Array.isArray(raw)) return raw.filter(function (id) { return META.some(function (m) { return m.id === id; }); }).slice(0, MAX_FIXED);
    } catch (e) {}
    return defaultOrder().slice(0, MAX_FIXED); // default: the 5 original icons; pnd-fab starts unchecked so a fresh install never silently exceeds the cap
  }
  function setFixed(arr) { try { localStorage.setItem(FIXED_KEY, JSON.stringify(arr)); } catch (e) {} }

  function notifyChange() {
    try { window.bjRowApplySettings && window.bjRowApplySettings(); } catch (e) {}
  }

  function render(container) {
    container.innerHTML = "";
    var mode = getMode();

    var headRow = document.createElement("div");
    headRow.className = "bjrs-head-row";

    var head = document.createElement("div");
    head.className = "bjrs-title";
    head.textContent = "ردیف آیکون‌های شناور بالای صفحه";
    headRow.appendChild(head);

    container.appendChild(headRow);

    var modeRow = document.createElement("div");
    modeRow.className = "bjrs-mode-row";
    [["toggle", "تاشو (با دکمه)"], ["fixed", "همیشه ثابت (بدون تاشو)"]].forEach(function (pair) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "bjrs-mode-btn" + (mode === pair[0] ? " bjrs-active" : "");
      btn.textContent = pair[1];
      btn.addEventListener("click", function () {
        setMode(pair[0]);
        notifyChange();
        render(container);
      });
      modeRow.appendChild(btn);
    });
    container.appendChild(modeRow);

    if (mode === "toggle") {
      var d2 = document.createElement("div");
      d2.className = "bjrs-desc";
      d2.style.marginTop = "10px";
      d2.textContent = "ترتیب نمایش آیکون‌ها رو با فلش‌ها تنظیم کن؛ همین ترتیب توی ردیف قابل‌اسکرول نشون داده می‌شه.";
      container.appendChild(d2);

      var order = getOrder();
      order.forEach(function (id, idx) {
        var meta = null;
        for (var mi = 0; mi < META.length; mi++) { if (META[mi].id === id) { meta = META[mi]; break; } }
        if (!meta) return;
        var row = document.createElement("div");
        row.className = "bjrs-item";

        var lab = document.createElement("div");
        lab.className = "bjrs-item-label";
        lab.textContent = meta.label;
        row.appendChild(lab);

        var up = document.createElement("button");
        up.type = "button";
        up.className = "bjrs-arrow-btn";
        up.textContent = "\u25B2";
        up.disabled = idx === 0;
        up.addEventListener("click", function () {
          var o = getOrder();
          if (idx === 0) return;
          var tmp = o[idx - 1]; o[idx - 1] = o[idx]; o[idx] = tmp;
          setOrder(o); notifyChange(); render(container);
        });
        row.appendChild(up);

        var down = document.createElement("button");
        down.type = "button";
        down.className = "bjrs-arrow-btn";
        down.textContent = "\u25BC";
        down.disabled = idx === order.length - 1;
        down.addEventListener("click", function () {
          var o = getOrder();
          if (idx === o.length - 1) return;
          var tmp = o[idx + 1]; o[idx + 1] = o[idx]; o[idx] = tmp;
          setOrder(o); notifyChange(); render(container);
        });
        row.appendChild(down);

        container.appendChild(row);
      });
    } else {
      var d3Row = document.createElement("div");
      d3Row.className = "bjrs-info-row";

      var d3Btn = document.createElement("button");
      d3Btn.type = "button";
      d3Btn.className = "bjrs-info-btn";
      d3Btn.title = "توضیحات";
      d3Btn.setAttribute("aria-label", "توضیحات");
      d3Btn.innerHTML = "<svg width=\"13\" height=\"13\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M9 18h6\"></path><path d=\"M10 21h4\"></path><path d=\"M12 3a6 6 0 0 0-6 6c0 2.2 1.2 3.6 2.1 4.6.6.7 1 1.2 1.1 1.9v.5h5.6v-.5c.1-.7.5-1.2 1.1-1.9.9-1 2.1-2.4 2.1-4.6a6 6 0 0 0-6-6z\"></path></svg>";
      d3Row.appendChild(d3Btn);

      var d3Label = document.createElement("div");
      d3Label.className = "bjrs-info-label";
      d3Label.textContent = "توضیحات این حالت";
      d3Row.appendChild(d3Label);

      container.appendChild(d3Row);

      var d3 = document.createElement("div");
      d3.className = "bjrs-desc";
      d3.style.marginTop = "-4px";
      d3.style.display = "none";
      d3.textContent = "هر کدوم از آیکون‌ها رو که می‌خوای همیشه (بدون نیاز به باز کردن) دیده بشه، تیک بزن — حداکثر " + MAX_FIXED + " تا هم‌زمان قابل انتخابه (اگه به سقف رسیده باشی، اول یکی رو خاموش کن تا بتونی یکی دیگه رو روشن کنی). آیکون «ناتمام‌ها» یه‌جوره: فقط وقتی که در بخش «محل دسترسی به ناتمام‌ها» گزینه‌ی «بالا» رو انتخاب کرده باشی روی صفحه ظاهر می‌شه — تیک‌خوردن یا نخوردنش هم مثل بقیه در همین سقف پنج‌تایی حساب می‌شه. با فلش‌ها هم می‌تونی ترتیب نمایش همه‌شون رو مشخص کنی؛ فاصله‌ی بین دکمه‌ها هم مثل حالت تاشو، استاندارد و یکسان می‌مونه.";
      container.appendChild(d3);

      d3Btn.addEventListener("click", function () {
        var isOpen = d3.style.display !== "none";
        d3.style.display = isOpen ? "none" : "block";
      });

      var order = getOrder();
      var fixed = getFixed();
      order.forEach(function (id, idx) {
        var meta = null;
        for (var mi = 0; mi < META.length; mi++) { if (META[mi].id === id) { meta = META[mi]; break; } }
        if (!meta) return;
        var row = document.createElement("div");
        row.className = "bjrs-item";

        var cb = document.createElement("input");
        cb.type = "checkbox";
        cb.className = "bjrs-checkbox";
        cb.checked = fixed.indexOf(meta.id) !== -1;
        cb.disabled = !cb.checked && fixed.length >= MAX_FIXED;
        cb.addEventListener("change", function () {
          var f = getFixed();
          var i = f.indexOf(meta.id);
          if (cb.checked && i === -1) {
            if (f.length >= MAX_FIXED) {
              cb.checked = false;
              window.alert("حداکثر " + MAX_FIXED + " دکمه رو می‌شه هم‌زمان ثابت نگه داشت. اول تیک یکی از بقیه رو بردار، بعد این رو فعال کن.");
              return;
            }
            f.push(meta.id);
          } else if (!cb.checked && i !== -1) {
            f.splice(i, 1);
          }
          setFixed(f); notifyChange(); render(container);
        });
        row.appendChild(cb);

        var lab = document.createElement("div");
        lab.className = "bjrs-item-label";
        lab.textContent = meta.label;
        row.appendChild(lab);

        var up = document.createElement("button");
        up.type = "button";
        up.className = "bjrs-arrow-btn";
        up.textContent = "\u25B2";
        up.disabled = idx === 0;
        up.addEventListener("click", function () {
          var o = getOrder();
          if (idx === 0) return;
          var tmp = o[idx - 1]; o[idx - 1] = o[idx]; o[idx] = tmp;
          setOrder(o); notifyChange(); render(container);
        });
        row.appendChild(up);

        var down = document.createElement("button");
        down.type = "button";
        down.className = "bjrs-arrow-btn";
        down.textContent = "\u25BC";
        down.disabled = idx === order.length - 1;
        down.addEventListener("click", function () {
          var o = getOrder();
          if (idx === o.length - 1) return;
          var tmp = o[idx + 1]; o[idx + 1] = o[idx]; o[idx] = tmp;
          setOrder(o); notifyChange(); render(container);
        });
        row.appendChild(down);

        container.appendChild(row);
      });
    }
  }

  function tryInject() {
    if (document.getElementById("bjrs-section")) return; // already injected while this settings sheet is open
    var anchor = document.getElementById("settings-icon-style-section");
    if (!anchor || !anchor.parentNode) return;
    var section = document.createElement("div");
    section.id = "bjrs-section";
    section.className = "bjrs-section";
    anchor.parentNode.insertBefore(section, anchor.nextSibling);
    render(section);
  }

  var mo = new MutationObserver(function () { tryInject(); });
  mo.observe(document.body, { childList: true, subtree: true });
  tryInject();
})();
