
(function () {
  var ICONS = {
    "dhw-fab": {
      emoji: "\ud83c\udf82",
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7"/><path d="M4 16.5c1 -1 2 -1 3 0s2 1 3 0 2 -1 3 0 2 1 3 0 2 -1 3 0"/><path d="M2 21h20"/><path d="M7 8v3"/><path d="M12 8v3"/><path d="M17 8v3"/><path d="M7 4c0 .6.4 1 1 1s1 -.4 1 -1 -.4 -1.3 -1 -1.8C7.4 2.7 7 3 7 4Z"/><path d="M17 4c0 .6.4 1 1 1s1 -.4 1 -1 -.4 -1.3 -1 -1.8c-.6.3 -1 .6 -1 1.8Z"/></svg>'
    },
    "skw-fab": {
      emoji: "\ud83d\udcd6",
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2Z"/><path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7Z"/></svg>'
    },
    "sww-fab": {
      emoji: "\ud83c\udf19",
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>'
    },
    "gtw-fab": {
      emoji: "\ud83d\udce5",
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.9A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.1Z"/></svg>'
    },
    "rvw-fab": {
      emoji: "\ud83e\udded",
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.2 7.8 14.1 14.1 7.8 16.2 9.9 9.9 16.2 7.8"/></svg>'
    },
    "cbk-fab": {
      emoji: "\u2601\ufe0f",
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.7-9h.8a4.5 4.5 0 1 1 0 9Z"/></svg>'
    },
    "alw-fab": {
      emoji: "\u2b50",
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2.5 15.09 8.76 22 9.77 17 14.64 18.18 21.52 12 18.27 5.82 21.52 7 14.64 2 9.77 8.91 8.76 12 2.5"/></svg>'
    },
    "prw-fab": {
      emoji: "\ud83d\udda8\ufe0f",
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V3h12v6"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="7"/></svg>'
    },
    "pnd-fab": {
      emoji: "\ud83d\udd50",
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>'
    },
    "sdw-fab": {
      emoji: "\ud83c\udf93",
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12.5V17c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5"/><path d="M22 10v6"/></svg>'
    },
    "pjw-fab": {
      emoji: "\ud83c\udfaf",
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="2"/></svg>'
    },
    "adhd-fab": {
      emoji: "\ud83e\udde0",
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c1 3-2.5 4-2.5 7a2.5 2.5 0 0 0 5 0c0-1-0.5-1.7-0.5-1.7S16 10 16 13a4 4 0 0 1-8 0c0-4.5 4-5.5 4-10z"/></svg>'
    },
    "lang-fab": {
      emoji: "\ud83d\udde3\ufe0f",
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 12a8.5 8.5 0 1 1 17 0 8.5 8.5 0 0 1-17 0z"/><path d="M3.5 12h17M12 3.5c2.2 2.3 3.3 5.4 3.3 8.5s-1.1 6.2-3.3 8.5c-2.2-2.3-3.3-5.4-3.3-8.5S9.8 5.8 12 3.5z"/></svg>'
    },
    "fin-fab": {
      emoji: "\ud83d\udcb0",
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>'
    }
  };

  var SVG_STYLES = { line: 1, "line-theme": 1, soft: 1, duotone: 1 };

  function apply(style) {
    try { localStorage.setItem("bjIconStyle", style); } catch (e) {}
    var isSvg = !!SVG_STYLES[style];
    document.body.classList.toggle("bj-icon-line", style === "line");
    document.body.classList.toggle("bj-icon-line-theme", style === "line-theme");
    document.body.classList.toggle("bj-icon-soft", style === "soft");
    document.body.classList.toggle("bj-icon-duotone", style === "duotone");
    Object.keys(ICONS).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var d = ICONS[id];
      el.innerHTML = isSvg ? d.svg : d.emoji;
    });
  }
  window.bjSetIconStyle = apply;
  window.bjIconsMap = ICONS;

  function getSaved() {
    var s = "color";
    try { s = localStorage.getItem("bjIconStyle") || "color"; } catch (e) {}
    if (s !== "color" && !SVG_STYLES[s]) s = "color";
    return s;
  }
  window.bjGetIconStyle = getSaved;
  function init() { apply(getSaved()); }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  setTimeout(init, 300);
})();
