/* Canvas-Renderer des Ikigai-Visuals — für Share-Bild + PDF.
 * (SVG-in-<img> lädt keine Seiten-Fonts, darum eigener Renderer.) */
(function () {
  "use strict";

  var SERIF = '"Shippori Mincho", Georgia, serif';
  var SANS = "Inter, sans-serif";

  /* zeichnet das Venn in ctx, zentriert auf (cx0, cy0), Gesamtdurchmesser ~size */
  window.IKIGAI_DRAW_VENN = function (ctx, data, cx0, cy0, size, opts) {
    opts = opts || {};
    var GEO = window.IKIGAI_GEO;
    var k = size / GEO.vb;
    var r = GEO.r * k, off = GEO.off * k;
    var ink = "#211d18", soft = "#5b5347";

    GEO.circles.forEach(function (ci) {
      var cx = cx0 + ci.dx * off, cy = cy0 + ci.dy * off;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = hexA(ci.color, 0.16);
      ctx.fill();
      ctx.strokeStyle = hexA(ci.color, 0.55);
      ctx.lineWidth = Math.max(1.2, 1.5 * k);
      ctx.stroke();
    });

    ctx.textAlign = "center";

    /* Labels + Begriffe */
    GEO.circles.forEach(function (ci) {
      var cx = cx0 + ci.dx * off, cy = cy0 + ci.dy * off;
      var lx = cx + ci.dx * (r * 0.42), ly = cy + ci.dy * (r * 0.46);
      var terms = (data.kreise && data.kreise[ci.key]) || [];
      var lines = [{ t: ci.label.toUpperCase(), f: "600 " + Math.round(12 * k) + "px " + SANS, c: ci.color, sp: 1.2 }];
      terms.slice(0, 3).forEach(function (t) {
        lines.push({ t: t, f: "italic 500 " + Math.round(15.5 * k) + "px " + SERIF, c: ink });
      });
      var lh = 20 * k, startY = ly - ((lines.length - 1) * lh) / 2;
      lines.forEach(function (ln, i) {
        ctx.font = ln.f; ctx.fillStyle = ln.c;
        ctx.fillText(ln.t, lx, startY + i * lh);
      });
    });

    /* Schnittmengen */
    if (data.schnittmengen) {
      ctx.font = "italic 500 " + Math.round(12.5 * k) + "px " + SERIF;
      ctx.fillStyle = soft;
      GEO.overlaps.forEach(function (ov) {
        var t = data.schnittmengen[ov.key];
        if (!t) return;
        var rad = (ov.angle * Math.PI) / 180, d = off * 1.62;
        ctx.fillText(t, cx0 + Math.cos(rad) * d, cy0 + Math.sin(rad) * d);
      });
    }

    /* Zentrum */
    var zl = GEO.wrap(data.zentrum || "", 24, 4);
    var zlh = 22 * k, zy = cy0 - ((zl.length - 1) * zlh) / 2 - 6 * k;
    ctx.font = "600 " + Math.round(11 * k) + "px " + SANS;
    ctx.fillStyle = "#f6303a";
    ctx.fillText("I K I G A I", cx0, zy - 28 * k);
    ctx.font = "600 " + Math.round(17 * k) + "px " + SERIF;
    ctx.fillStyle = ink;
    zl.forEach(function (ln, i) { ctx.fillText(ln, cx0, zy + i * zlh); });
  };

  function hexA(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }
})();
