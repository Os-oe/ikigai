/* Venn-SVG — das personalisierte 4-Kreise-Visual (On-Page, animierbar).
 * Geometrie wird mit visual-canvas.js geteilt (window.IKIGAI_GEO). */
(function () {
  "use strict";

  var GEO = {
    vb: 600,
    r: 158,
    off: 88,
    circles: [
      { key: "liebe",   label: "Was du liebst",            dx: 0,  dy: -1, color: "#c2655a" },
      { key: "staerke", label: "Worin du gut bist",        dx: -1, dy: 0,  color: "#7a8b6f" },
      { key: "welt",    label: "Was die Welt braucht",     dx: 1,  dy: 0,  color: "#6f87a3" },
      { key: "markt",   label: "Wofür man dich bezahlt",   dx: 0,  dy: 1,  color: "#b8995e" }
    ],
    overlaps: [
      { key: "passion",  angle: -135 },
      { key: "mission",  angle: -45 },
      { key: "beruf",    angle: 135 },
      { key: "berufung", angle: 45 }
    ],
    overlapDist: 1.19, /* × off — Lens-Mitte der Zweier-Schnittmenge */
    /* Zentrum-Satz: Schriftgröße nach Länge staffeln (Kollisionschutz) */
    zentrumFit: function (text) {
      var n = String(text || "").length;
      if (n <= 70) return { size: 15, chars: 18, lh: 19, lines: 4 };
      if (n <= 100) return { size: 13.5, chars: 21, lh: 17, lines: 5 };
      return { size: 12.5, chars: 23, lh: 15.5, lines: 5 };
    }
  };
  window.IKIGAI_GEO = GEO;

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  window.IKIGAI_GEO.wrap = function wrap(text, maxChars, maxLines) {
    var words = String(text).split(/\s+/), lines = [], cur = "";
    words.forEach(function (w) {
      if ((cur + " " + w).trim().length > maxChars && cur) { lines.push(cur); cur = w; }
      else cur = (cur + " " + w).trim();
    });
    if (cur) lines.push(cur);
    if (maxLines && lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      lines[maxLines - 1] = lines[maxLines - 1].replace(/.{2}$/, "") + "…";
    }
    return lines;
  };

  /* SVG bauen. data = ergebnis (kreise, schnittmengen, zentrum) */
  window.IKIGAI_VENN = function (data) {
    var c = GEO.vb / 2, r = GEO.r, off = GEO.off;
    var svg = '<svg viewBox="0 0 600 640" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Dein persönliches Ikigai-Diagramm">';
    var fit = GEO.zentrumFit(data.zentrum);
    svg += '<style>' +
      '.vc{fill-opacity:.17;stroke-opacity:.5;stroke-width:1.5}' +
      '.v-label{font:600 11px Inter,sans-serif;letter-spacing:.08em;text-transform:uppercase}' +
      '.v-term{font:italic 500 14px "Shippori Mincho",Georgia,serif}' +
      '.v-overlap{font:italic 500 11.5px "Shippori Mincho",Georgia,serif;fill:#5b5347}' +
      '.v-zentrum{font:600 ' + fit.size + 'px "Shippori Mincho",Georgia,serif;fill:#211d18}' +
      '.v-ikigai{font:600 10px Inter,sans-serif;fill:#f6303a;letter-spacing:.18em}' +
      '</style>';

    /* Kreise */
    GEO.circles.forEach(function (ci, i) {
      var cx = c + ci.dx * off, cy = c + ci.dy * off;
      svg += '<circle class="vc venn-c" cx="' + cx + '" cy="' + cy + '" r="' + r +
        '" fill="' + ci.color + '" stroke="' + ci.color + '" style="animation-delay:' + (i * 0.18) + 's"/>';
    });

    /* Dimension-Labels + Begriffe (außen) */
    GEO.circles.forEach(function (ci) {
      var cx = c + ci.dx * off, cy = c + ci.dy * off;
      /* Anker am äußeren Rand des Kreises */
      var lx = cx + ci.dx * (r * 0.42), ly = cy + ci.dy * (r * 0.46);
      var terms = (data.kreise && data.kreise[ci.key]) || [];
      var lines = ['<tspan class="v-label" fill="' + ci.color + '">' + esc(ci.label) + "</tspan>"];
      terms.slice(0, 3).forEach(function (t) {
        lines.push('<tspan class="v-term" fill="#211d18">' + esc(t) + "</tspan>");
      });
      var lh = 19, startY = ly - ((lines.length - 1) * lh) / 2;
      svg += '<text text-anchor="middle" class="venn-t">';
      lines.forEach(function (ln, i2) {
        svg += ln.replace("<tspan", '<tspan x="' + lx + '" y="' + (startY + i2 * lh) + '"');
      });
      svg += "</text>";
    });

    /* Schnittmengen-Labels */
    if (data.schnittmengen) {
      GEO.overlaps.forEach(function (ov) {
        var t = data.schnittmengen[ov.key];
        if (!t) return;
        var rad = (ov.angle * Math.PI) / 180, d = off * GEO.overlapDist;
        var x = c + Math.cos(rad) * d, y = c + Math.sin(rad) * d;
        svg += '<text class="v-overlap venn-t" text-anchor="middle" x="' + x + '" y="' + y + '">' + esc(t) + "</text>";
      });
    }

    /* Zentrum */
    var zl = GEO.wrap(data.zentrum || "", fit.chars, fit.lines);
    var zlh = fit.lh, zy = c - ((zl.length - 1) * zlh) / 2 + 2;
    svg += '<text class="v-ikigai venn-t" text-anchor="middle" x="' + c + '" y="' + (zy - zlh - 8) + '">IKIGAI</text>';
    svg += '<text text-anchor="middle" class="venn-t">';
    zl.forEach(function (ln, i) {
      svg += '<tspan class="v-zentrum" x="' + c + '" y="' + (zy + i * zlh) + '">' + esc(ln) + "</tspan>";
    });
    svg += "</text>";

    /* Fußnote im Visual */
    svg += '<text x="' + c + '" y="628" text-anchor="middle" style="font:11px Inter,sans-serif;fill:#8d8374">Ebene 1 · das westliche 4-Kreise-Werkzeug — die echte japanische Ebene folgt unten</text>';
    svg += "</svg>";
    return svg;
  };
})();
