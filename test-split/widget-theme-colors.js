
(function () {
  function hexToRgb(hex) {
    hex = String(hex || "").replace("#", "");
    if (hex.length === 3) hex = hex.split("").map(function (c) { return c + c; }).join("");
    var num = parseInt(hex, 16) || 0;
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }
  function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(function (x) {
      x = Math.max(0, Math.min(255, Math.round(x)));
      var s = x.toString(16);
      return s.length === 1 ? "0" + s : s;
    }).join("");
  }
  function mix(hex1, hex2, pct) {
    var c1 = hexToRgb(hex1), c2 = hexToRgb(hex2);
    return rgbToHex(c1.r + (c2.r - c1.r) * pct, c1.g + (c2.g - c1.g) * pct, c1.b + (c2.b - c1.b) * pct);
  }
  function luminance(hex) {
    var c = hexToRgb(hex);
    return 0.2126 * (c.r / 255) + 0.7152 * (c.g / 255) + 0.0722 * (c.b / 255);
  }
  function paletteFromColors(bgHex, textHex) {
    var isDark = luminance(bgHex) < 0.5;
    return {
      bg0: bgHex,
      bg1: mix(bgHex, textHex, isDark ? 0.06 : 0.08),
      bg2: mix(bgHex, textHex, 0.10),
      bg3: mix(bgHex, textHex, isDark ? 0.08 : 0.09),
      border: mix(bgHex, textHex, isDark ? 0.18 : 0.20),
      text: textHex,
      textDim: mix(textHex, bgHex, 0.30),
      muted: mix(textHex, bgHex, 0.45),
      muted2: mix(textHex, bgHex, 0.58),
      colorScheme: isDark ? "dark" : "light"
    };
  }
  function applyPaletteVars(pal) {
    var r = document.documentElement.style;
    r.setProperty("--bg0", pal.bg0);
    r.setProperty("--bg1", pal.bg1);
    r.setProperty("--bg2", pal.bg2);
    r.setProperty("--bg3", pal.bg3);
    r.setProperty("--border", pal.border);
    r.setProperty("--text", pal.text);
    r.setProperty("--text-dim", pal.textDim);
    r.setProperty("--muted", pal.muted);
    r.setProperty("--muted2", pal.muted2);
    r.setProperty("color-scheme", pal.colorScheme);
  }
  function clearPaletteVars() {
    var r = document.documentElement.style;
    ["--bg0","--bg1","--bg2","--bg3","--border","--text","--text-dim","--muted","--muted2","color-scheme"].forEach(function (p) { r.removeProperty(p); });
  }
  window.bjPaletteFromColors = paletteFromColors;
  window.bjApplyPaletteVars = applyPaletteVars;
  window.bjClearPaletteVars = clearPaletteVars;

  try {
    var v = localStorage.getItem("bjDayNight");
    var known = { dark: 1, light: 1, sepia: 1, midnight: 1, custom: 1 };
    if (!known[v]) {
      v = (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) ? "light" : "dark";
    }
    if (v === "custom") {
      var raw = localStorage.getItem("bjCustomTheme");
      if (raw) {
        var c = JSON.parse(raw);
        if (c && c.bg && c.text) {
          document.documentElement.setAttribute("data-theme", "custom");
          applyPaletteVars(paletteFromColors(c.bg, c.text));
        }
      }
    } else if (v !== "dark") {
      document.documentElement.setAttribute("data-theme", v);
    }
  } catch (e) {}
  try {
    var ov = localStorage.getItem("bjOutline");
    if (ov === "soft" || ov === "strong") {
      document.documentElement.setAttribute("data-outline", ov);
    }
  } catch (e) {}
})();
