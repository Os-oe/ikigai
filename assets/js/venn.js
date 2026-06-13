/* Venn-SVG — das personalisierte 4-Kreise-Visual (On-Page, animierbar).
 * Lasur-Venn: 4 randlose halbtransparente Blobs, Überlappung via mix-blend-mode:multiply,
 * Aquarell-Saum, seeded Misregistration. Keine Outlines. Zentrum = saubere Papier-Plakette
 * + Hanko (Initialen). Der Ikigai-Satz steht GROSS unter dem Diagramm, mit Tuschlinie ans
 * Hanko gebunden. Labels + 4 Kanji-Marker außen. Geometrie aus IKIGAI_ART. */
(function () {
  "use strict";

  var A = window.IKIGAI_ART, P = A.P, GEO = A.GEO;

  /* Rückwärtskompatibel: alter Code/Tests greifen window.IKIGAI_GEO an */
  window.IKIGAI_GEO = {
    vb: GEO.vb, r: GEO.r, off: GEO.off, circles: GEO.circles,
    wrap: A.wrap
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* Satz-Größe nach Länge staffeln (großer Held unter dem Diagramm) */
  function satzFit(text) {
    var n = String(text || "").length;
    if (n <= 70) return { size: 26, chars: 26, lh: 34 };
    if (n <= 110) return { size: 22, chars: 30, lh: 29 };
    return { size: 19, chars: 34, lh: 25 };
  }

  /* SVG bauen. data = ergebnis (kreise, schnittmengen, zentrum) */
  window.IKIGAI_VENN = function (data, opts) {
    opts = opts || {};
    var name = opts.name || "";
    var cx = GEO.vb / 2, r = GEO.r, off = GEO.off;
    /* Diagramm-Mittelpunkt sitzt im oberen Bereich; darunter eine saubere Satz-Bühne. */
    var cy = 250;
    var seed = A.seedFromData(data);
    var rand = A.rng(seed);
    var inits = A.initials(name);

    /* Unterkante des Diagramm-Clusters inkl. Bottom-Label-Block */
    var fit = satzFit(data.zentrum);
    var satzLines = A.wrap("„" + (data.zentrum || "") + "“", fit.chars, 4);
    var bottomLabelEnd = cy + off + r * 0.78 + 12 + 3 * 17 + 10; /* Begriffe + Farb-Legende */
    var satzTop = bottomLabelEnd + 54;
    var vh = satzTop + satzLines.length * fit.lh + 28;

    var svg = '<svg viewBox="0 0 ' + GEO.vb + ' ' + Math.round(vh) +
      '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Dein persönliches Ikigai-Diagramm">';

    /* Filter: Faserkante (Tusche) + Saum-Gradienten je Kreis */
    svg += '<defs>';
    svg += '<filter id="ink" x="-12%" y="-12%" width="124%" height="124%">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.012 0.016" numOctaves="2" seed="' + (seed % 97) + '" result="n"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G"/>' +
      '</filter>';
    GEO.circles.forEach(function (ci) {
      svg += '<radialGradient id="lg-' + ci.key + '" cx="50%" cy="50%" r="52%">' +
        '<stop offset="0%" stop-color="' + ci.color + '" stop-opacity="0.30"/>' +
        '<stop offset="62%" stop-color="' + ci.color + '" stop-opacity="0.42"/>' +
        '<stop offset="90%" stop-color="' + ci.deep + '" stop-opacity="0.60"/>' +
        '<stop offset="100%" stop-color="' + ci.deep + '" stop-opacity="0.16"/>' +
        '</radialGradient>';
    });
    svg += '</defs>';

    svg += '<style>' +
      '.v-blob{mix-blend-mode:multiply}' +
      '.v-label{font:600 13px Inter,sans-serif;letter-spacing:.32em;text-transform:uppercase;fill:' + P.grau + '}' +
      '.v-kanji{font:400 26px "Shippori Mincho",serif;fill:' + P.grau + ';opacity:.55}' +
      '.v-cap{font:italic 400 11px "Shippori Mincho",serif;fill:' + P.grau + '}' +
      '.v-term{font:500 13px Inter,sans-serif;fill:' + P.sumi + '}' +
      '.v-satz{font:600 ' + fit.size + 'px "Shippori Mincho",Georgia,serif;fill:' + P.sumi + '}' +
      '</style>';

    /* Label-Anker je Kreis: außen, aber Bottom-Block nach unten, Top-Block nach oben,
     * Seiten weit genug raus, dass nichts ins Zentrum läuft. */
    function anchor(ci) {
      var bx = cx + ci.dx * off, by = cy + ci.dy * off;
      return { x: bx + ci.dx * (r * 0.72), y: by + ci.dy * (r * 0.82) };
    }

    /* ── Lasur-Blobs (Multiply, isoliert) ── */
    svg += '<g style="isolation:isolate">';
    GEO.circles.forEach(function (ci, i) {
      var bx = cx + ci.dx * off, by = cy + ci.dy * off;
      var mr = A.misreg(rand, 1);
      var cr = A.rng(seed + i * 131);            // eigener Blob-Seed je Kreis
      var rot = ci.key === "liebe" ? mr.rot + 0.3 : mr.rot; // rote Platte +Drehung
      var d = A.blobPath(0, 0, r, cr, 0.06);
      svg += '<g class="venn-c" transform="translate(' + (bx + mr.dx) + ',' + (by + mr.dy) +
        ') rotate(' + rot.toFixed(2) + ')" style="animation-delay:' + (i * 0.18) + 's">' +
        '<path class="v-blob" filter="url(#ink)" d="' + d + '" fill="url(#lg-' + ci.key + ')"/>' +
        '</g>';
    });
    svg += '</g>';

    /* ── Zentrum-Plakette + Hanko ── */
    var plW = 96, plH = 96;
    svg += '<g class="venn-center">';
    svg += '<rect x="' + (cx - plW / 2) + '" y="' + (cy - plH / 2) + '" width="' + plW + '" height="' + plH +
      '" rx="9" fill="' + P.paperWarm + '" fill-opacity="0.94" stroke="' + P.line + '" stroke-opacity="0.6"/>';
    /* Hanko: rundes Siegel mit Stempel-Unregelmäßigkeit, Initialen negativ */
    var hanko = A.blobPath(cx, cy - 8, 26, A.rng(seed + 7), 0.04);
    svg += '<path d="' + hanko + '" fill="' + P.accent + '" fill-opacity="0.9" filter="url(#ink)"/>';
    svg += '<text x="' + cx + '" y="' + (cy - 1) + '" text-anchor="middle" ' +
      'style="font:700 20px Inter,sans-serif;fill:' + P.paper + ';letter-spacing:.04em">' + esc(inits) + '</text>';
    svg += '<text x="' + cx + '" y="' + (cy + 32) + '" text-anchor="middle" ' +
      'style="font:600 8px Inter,sans-serif;fill:' + P.grau + ';letter-spacing:.3em">IKIGAI</text>';
    svg += '</g>';

    /* ── Labels außen + Kanji-Marker + Begriffe ── */
    GEO.circles.forEach(function (ci) {
      var a = anchor(ci);
      var terms = (data.kreise && data.kreise[ci.key]) || [];
      svg += '<g class="venn-t" text-anchor="middle">';
      svg += '<text class="v-kanji" x="' + a.x + '" y="' + (a.y - 30) + '">' + A.KANJI[ci.key] + '</text>';
      svg += '<text class="v-label" x="' + a.x + '" y="' + (a.y - 8) + '">' + esc(ci.label) + '</text>';
      terms.slice(0, 3).forEach(function (t, k) {
        svg += '<text class="v-term" x="' + a.x + '" y="' + (a.y + 12 + k * 17) + '">' + esc(t) + '</text>';
      });
      svg += '<text class="v-cap" x="' + a.x + '" y="' + (a.y + 12 + Math.min(terms.length, 3) * 17 + 4) + '">' +
        esc(A.FARBNAMEN[ci.key]) + '</text>';
      svg += '</g>';
    });

    /* ── Tuschlinie Hanko → Satz (startet seitlich, nicht durch das Bottom-Label) ── */
    var lr = A.rng(seed + 42);
    var ly1 = satzTop - 30;
    var lx0 = cx + 150, ly0 = cy;                 // rechts neben dem Zentrum ansetzen
    var lpath = 'M' + lx0 + ',' + ly0 +
      ' C' + (lx0 + 36) + ',' + (ly0 + 40) +
      ' ' + (cx + 60) + ',' + (ly1 - 20) +
      ' ' + cx + ',' + ly1;
    svg += '<path class="venn-line" d="' + lpath + '" fill="none" stroke="' + P.accent +
      '" stroke-width="1.6" stroke-linecap="round" filter="url(#ink)" opacity="0.7"/>';

    /* ── Der Ikigai-Satz GROSS (Held) ── */
    svg += '<text class="venn-satz" text-anchor="middle">';
    satzLines.forEach(function (ln, i) {
      svg += '<tspan class="v-satz" x="' + cx + '" y="' + (satzTop + i * fit.lh) + '">' + esc(ln) + '</tspan>';
    });
    svg += '</text>';

    svg += '</svg>';
    return svg;
  };
})();
