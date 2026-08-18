
window.bjSetDayNight = function (mode, customPalette) {
  try { localStorage.setItem("bjDayNight", mode); } catch (e) {}
  if (mode === "custom") {
    var pal = customPalette;
    if (!pal) {
      try {
        var raw = localStorage.getItem("bjCustomTheme");
        if (raw) {
          var c = JSON.parse(raw);
          if (c && c.bg && c.text && window.bjPaletteFromColors) pal = window.bjPaletteFromColors(c.bg, c.text);
        }
      } catch (e) {}
    }
    if (pal) {
      document.documentElement.setAttribute("data-theme", "custom");
      if (window.bjApplyPaletteVars) window.bjApplyPaletteVars(pal);
      var mc = document.getElementById("bj-theme-color-meta");
      if (mc) mc.setAttribute("content", pal.bg0);
      return;
    }
  }
  if (window.bjClearPaletteVars) window.bjClearPaletteVars();
  if (mode && mode !== "dark") document.documentElement.setAttribute("data-theme", mode);
  else document.documentElement.removeAttribute("data-theme");
  var colors = { dark: "#12141C", light: "#F5F1E7", sepia: "#F1E7D0", midnight: "#0B0F1A" };
  var m = document.getElementById("bj-theme-color-meta");
  if (m) m.setAttribute("content", colors[mode] || "#12141C");
};
window.bjApplyCustomDayNight = function (bgHex, textHex) {
  try { localStorage.setItem("bjCustomTheme", JSON.stringify({ bg: bgHex, text: textHex })); } catch (e) {}
  if (!window.bjPaletteFromColors) return;
  var pal = window.bjPaletteFromColors(bgHex, textHex);
  window.bjSetDayNight("custom", pal);
};
