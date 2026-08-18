
(function () {
  var overlay = document.getElementById("ccp-overlay");
  var panel = document.getElementById("ccp-panel");
  var svCanvas = document.getElementById("ccp-sv");
  var svWrap = document.getElementById("ccp-sv-wrap");
  var svThumb = document.getElementById("ccp-sv-thumb");
  var hueTrack = document.getElementById("ccp-hue-track");
  var hueThumb = document.getElementById("ccp-hue-thumb");
  var preview = document.getElementById("ccp-preview");
  var hexInput = document.getElementById("ccp-hex");
  var cancelBtn = document.getElementById("ccp-cancel");
  var applyBtn = document.getElementById("ccp-apply");
  var ctx = svCanvas.getContext("2d");

  var state = { h: 45, s: 1, v: 1 };
  var onApplyCb = null;

  function hsvToRgb(h, s, v) {
    var c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c, r, g, b;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  }
  function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(function (n) { return n.toString(16).padStart(2, "0"); }).join("");
  }
  function hexToRgb(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec((hex || "").trim());
    if (!m) return null;
    var n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, h = 0;
    if (d !== 0) {
      if (max === r) h = 60 * (((g - b) / d) % 6);
      else if (max === g) h = 60 * ((b - r) / d + 2);
      else h = 60 * ((r - g) / d + 4);
    }
    if (h < 0) h += 360;
    var s = max === 0 ? 0 : d / max;
    return { h: h, s: s, v: max };
  }
  function currentHex() {
    var rgb = hsvToRgb(state.h, state.s, state.v);
    return rgbToHex(rgb[0], rgb[1], rgb[2]);
  }
  function drawSV() {
    var w = svCanvas.width, h = svCanvas.height;
    var rgb = hsvToRgb(state.h, 1, 1);
    ctx.fillStyle = "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")";
    ctx.fillRect(0, 0, w, h);
    var gw = ctx.createLinearGradient(0, 0, w, 0);
    gw.addColorStop(0, "rgba(255,255,255,1)");
    gw.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gw;
    ctx.fillRect(0, 0, w, h);
    var gb = ctx.createLinearGradient(0, 0, 0, h);
    gb.addColorStop(0, "rgba(0,0,0,0)");
    gb.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = gb;
    ctx.fillRect(0, 0, w, h);
  }
  function positionThumbs() {
    var svRect = svWrap.getBoundingClientRect();
    svThumb.style.left = (state.s * svRect.width) + "px";
    svThumb.style.top = ((1 - state.v) * svRect.height) + "px";
    var hueRect = hueTrack.getBoundingClientRect();
    hueThumb.style.left = ((state.h / 360) * hueRect.width) + "px";
  }
  function updatePreview() {
    var hex = currentHex();
    preview.style.background = hex;
    hexInput.value = hex;
  }
  function refresh() {
    drawSV();
    positionThumbs();
    updatePreview();
  }
  function setFromHex(hex) {
    var rgb = hexToRgb(hex);
    if (!rgb) return false;
    var hsv = rgbToHsv(rgb[0], rgb[1], rgb[2]);
    state.h = hsv.h; state.s = hsv.s; state.v = hsv.v || 1;
    refresh();
    return true;
  }

  function pointFromEvent(ev) {
    if (ev.touches && ev.touches.length) return { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
    return { x: ev.clientX, y: ev.clientY };
  }
  function handleSvDrag(ev) {
    ev.preventDefault();
    var pt = pointFromEvent(ev);
    var rect = svWrap.getBoundingClientRect();
    var x = Math.min(Math.max(pt.x - rect.left, 0), rect.width);
    var y = Math.min(Math.max(pt.y - rect.top, 0), rect.height);
    state.s = rect.width ? x / rect.width : 0;
    state.v = rect.height ? 1 - y / rect.height : 0;
    positionThumbs();
    updatePreview();
  }
  function handleHueDrag(ev) {
    ev.preventDefault();
    var pt = pointFromEvent(ev);
    var rect = hueTrack.getBoundingClientRect();
    var x = Math.min(Math.max(pt.x - rect.left, 0), rect.width);
    state.h = rect.width ? (x / rect.width) * 360 : 0;
    if (state.h >= 360) state.h = 359.999;
    refresh();
  }

  var draggingSv = false, draggingHue = false;
  svWrap.addEventListener("mousedown", function (ev) { draggingSv = true; handleSvDrag(ev); });
  svWrap.addEventListener("touchstart", function (ev) { draggingSv = true; handleSvDrag(ev); }, { passive: false });
  hueTrack.addEventListener("mousedown", function (ev) { draggingHue = true; handleHueDrag(ev); });
  hueTrack.addEventListener("touchstart", function (ev) { draggingHue = true; handleHueDrag(ev); }, { passive: false });
  window.addEventListener("mousemove", function (ev) { if (draggingSv) handleSvDrag(ev); else if (draggingHue) handleHueDrag(ev); });
  window.addEventListener("touchmove", function (ev) { if (draggingSv) handleSvDrag(ev); else if (draggingHue) handleHueDrag(ev); }, { passive: false });
  window.addEventListener("mouseup", function () { draggingSv = false; draggingHue = false; });
  window.addEventListener("touchend", function () { draggingSv = false; draggingHue = false; });

  hexInput.addEventListener("change", function () {
    var v = hexInput.value.trim();
    if (v[0] !== "#") v = "#" + v;
    if (!setFromHex(v)) hexInput.value = currentHex();
  });

  function closePanel() {
    overlay.style.display = "none";
    panel.style.display = "none";
    onApplyCb = null;
  }
  overlay.addEventListener("click", closePanel);
  cancelBtn.addEventListener("click", closePanel);
  applyBtn.addEventListener("click", function () {
    var hex = currentHex();
    if (typeof onApplyCb === "function") onApplyCb(hex);
    closePanel();
  });

  window.bjOpenColorPicker = function (initialHex, onApply) {
    onApplyCb = onApply;
    overlay.style.display = "block";
    panel.style.display = "block";
    setFromHex(initialHex || "#F2B807") || refresh();
    setTimeout(refresh, 0);
  };
  window.addEventListener("resize", function () { if (panel.style.display === "block") positionThumbs(); });
})();
