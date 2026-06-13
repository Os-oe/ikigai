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

  /* Satz-Größe nach Länge staffeln (großer Held unter dem Diagramm). maxLines
   * großzügig, damit lange Sätze vollständig stehen statt mit „…“ abgeschnitten
   * zu werden (Review-Long-Text-Gate). */
  function satzFit(text) {
    var n = String(text || "").length;
    if (n <= 70) return { size: 26, chars: 26, lh: 34, maxLines: 4 };
    if (n <= 110) return { size: 22, chars: 30, lh: 29, maxLines: 5 };
    if (n <= 170) return { size: 19, chars: 34, lh: 25, maxLines: 6 };
    return { size: 17, chars: 38, lh: 23, maxLines: 7 };
  }

  /* SVG bauen. data = ergebnis (kreise, schnittmengen, zentrum) */
  window.IKIGAI_VENN = function (data, opts) {
    opts = opts || {};
    var name = opts.name || "";
    var cx = GEO.vb / 2, r = GEO.r, off = GEO.off;
    /* Diagramm-Mittelpunkt: genug Kopfraum, damit das obere Label (愛 + Begriffe)
     * nicht an die viewBox-Oberkante stößt. */
    var cy = 290;
    var seed = A.seedFromData(data);
    var rand = A.rng(seed);
    var inits = A.initials(name);

    /* Unterkante des Diagramm-Clusters inkl. Bottom-Label-Block. Der Bottom-Block
     * kann jetzt mehrzeilig sein (Label bis 2 Zeilen + 3 Begriffe à bis 2 Zeilen +
     * Legende). Konservativer Worst-Case, damit der Satz darunter nie kollidiert. */
    var fit = satzFit(data.zentrum);
    var satzLines = A.wrap("„" + (data.zentrum || "") + "“", fit.chars, fit.maxLines);
    var bottomAnchorY = cy + off + r * 0.82;
    var bottomLabelEnd = bottomAnchorY + 2 * 16 + 7 + 3 * (2 * 16 + 5) + 18; /* Label + 3×2-zeilig + Legende */
    var satzTop = bottomLabelEnd + 50;
    var vh = satzTop + satzLines.length * fit.lh + 28;

    /* Horizontale Sicherheits-Gutter: die seitlichen Kapitälchen-Labels
     * („WORIN DU GUT BIST“ / „WAS DIE WELT BRAUCHT“) sind breiter als die Kreise
     * und liefen sonst links/rechts aus der viewBox (auf Mobile sichtbar
     * abgeschnitten). viewBox links/rechts um padX erweitern → garantierter
     * Innenabstand, Diagramm bleibt zentriert. */
    var padX = 60;
    var vbw = GEO.vb + padX * 2;

    /* Kopfraum oben: das obere Label (Kanji + Versal-Label + bis zu 3 mehrzeilige
     * Begriffe + Farb-Legende) wächst vom Anker NACH OBEN. Genug Luft lassen,
     * sonst stößt der Block an die viewBox-Oberkante (Review-P1: obere Lobe spillte
     * komplett aus dem Diagramm). vTop = wie weit der höchste Block über y=0 ragen
     * dürfte — wir verschieben das ganze SVG um vTop nach unten. */
    var vTop = 124;
    var svg = '<svg viewBox="' + (-padX) + ' ' + (-vTop) + ' ' + vbw + ' ' + Math.round(vh + vTop) +
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
      /* P2-B: Achsen-Label dunkle Sumi-Tinte statt hellgrau + Backing-Pill (unten) —
       * über den gesättigten Lasur-Flächen war Ginnezumi fast unlesbar. */
      '.v-label{font:600 13px Inter,sans-serif;letter-spacing:.28em;text-transform:uppercase;fill:' + P.sumi + '}' +
      '.v-kanji{font:400 26px "Shippori Mincho",serif;fill:' + P.sumi + ';opacity:.5}' +
      '.v-cap{font:italic 400 11px "Shippori Mincho",serif;fill:' + P.grau + '}' +
      '.v-term{font:500 13px Inter,sans-serif;fill:' + P.sumi + '}' +
      '.v-pill{fill:' + P.paper + ';fill-opacity:.82}' +
      '.v-satz{font:600 ' + fit.size + 'px "Shippori Mincho",Georgia,serif;fill:' + P.sumi + '}' +
      '</style>';

    /* Label-Anker je Kreis: außen, aber Bottom-Block nach unten, Top-Block nach oben,
     * Seiten weit genug raus, dass nichts ins Zentrum läuft. */
    function anchor(ci) {
      var bx = cx + ci.dx * off, by = cy + ci.dy * off;
      return { x: bx + ci.dx * (r * 0.72), y: by + ci.dy * (r * 0.82) };
    }

    /* Breiten-Budget je Label-Block (zentriert). Zwei harte Schranken, kleinere gewinnt:
     *  (a) FUSSABDRUCK des eigenen Kreises — ein Label gehört zu EINEM Kreis und darf
     *      optisch nie breiter werden als dieser Kreis (Review-P1: lange Wörter liefen
     *      bis fast an die Canvas-Kante, weil das alte Budget bis zur viewBox reichte).
     *  (b) Abstand zu den harten Rändern (viewBox-Gutter bzw. Zentrum-Plakette), damit
     *      seitliche Labels weder ins Zentrum noch aus dem Bild laufen.
     * KEIN großzügiger Floor mehr — der Floor war das eigentliche Leck. */
    var FOOT = 2 * r * 0.92;                             // Kreis-Fußabdruck (≈ Durchmesser)
    function budget(ci, ax) {
      if (ci.dx === 0) return FOOT;                      // oben/unten: auf den Kreis begrenzt
      var leftEdge = -padX + 24, rightEdge = GEO.vb + padX - 24;
      var plL = cx - 56, plR = cx + 56;                  // Plaketten-Sperrzone
      var half = ci.dx < 0
        ? Math.min(ax - leftEdge, plL - ax)              // links
        : Math.min(rightEdge - ax, ax - plR);            // rechts
      /* Seiten-Labels sitzen am äußeren Kreis-Flank (Anker um r·0.72 nach außen
       * versetzt) → sie würden bei vollem FOOT nach außen über den Kreis ragen.
       * Engere Schranke: 1.5·r (≈ sichtbarer Kreis-Abschnitt am Anker). */
      return Math.min(2 * half, r * 1.5);
    }
    /* Breiten-Schätzung (px) je Zeichen, konservativ HOCH (breite Glyphen W/M/ß +
     * Versalien-Tracking). Statt horizontal zu stauchen (Review-P1: „Interdisziplinäre“
     * lief unleserlich zusammen) → mehrzeilig umbrechen (Wort-Wrap + Hard-Break für
     * unbrechbare Wörter) UND die Schrift bei Bedarf stufenweise verkleinern. */
    function estW(text, perChar) { return String(text).length * perChar; }
    /* zerlegt Text in Zeilen, die in budgetW passen (geschätzt). maxLines begrenzt;
     * verkleinert perChar nicht — die Größenstaffel liegt in der Aufruf-Schicht. */
    function fitLines(text, perChar, budgetW, maxLines) {
      var maxChars = Math.max(3, Math.floor(budgetW / perChar));
      return A.wrap(text, maxChars, maxLines || 3);
    }
    /* SVG-<text> mit gestaffelter Schriftgröße: passt der Text in 1 Zeile, große
     * Größe; sonst kleiner + mehrzeilig. Gibt {lines, size, lh} zurück. */
    function sizeFit(text, perCharAtBase, budgetW, baseSize, minSize, maxLines) {
      var size = baseSize;
      for (;;) {
        var pc = perCharAtBase * (size / baseSize);
        var maxChars = Math.max(3, Math.floor(budgetW / pc));
        var lines = A.wrap(text, maxChars, maxLines);
        if (lines.length <= maxLines || size <= minSize) {
          return { lines: A.wrap(text, maxChars, maxLines), size: size, lh: Math.round(size * 1.18) };
        }
        size -= 1;
      }
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

    /* ── Labels außen + Kanji-Marker + Begriffe ──
     * Layout pro Kreis: Kanji · Versal-Label (mit Backing-Pill für Kontrast) ·
     * bis zu 3 Begriffe (jeder mehrzeilig umbrochen + größen-gestaffelt) · Farb-Legende.
     * Top-Kreis: Block wächst NACH OBEN (sonst läuft er in die Kreise). Bottom: nach
     * unten. Seiten: vertikal um den Anker zentriert. KEIN horizontales Stauchen mehr. */
    GEO.circles.forEach(function (ci) {
      var a = anchor(ci);
      var bud = budget(ci, a.x);
      var terms = (data.kreise && data.kreise[ci.key]) || [];
      /* Versal-Label umbrechen/staffeln (12 px/Char @13 px inkl. Tracking) */
      var labFit = sizeFit(ci.label.toUpperCase(), 11.5, bud, 13, 10, 2);
      /* Begriffe einzeln umbrechen/staffeln (7.6 px/Char @13 px) */
      var termBlocks = terms.slice(0, 3).map(function (t) { return sizeFit(t, 7.8, bud, 13, 10, 2); });
      var cap = A.FARBNAMEN[ci.key];

      /* Block-Höhen berechnen (für Top-nach-oben-Layout) */
      var KANJI_H = 26, GAP = 6, LAB_GAP = 7, TERM_GAP = 5, CAP_H = 14;
      var labH = labFit.lines.length * labFit.lh;
      var termsH = 0;
      termBlocks.forEach(function (b) { termsH += b.lines.length * b.lh + TERM_GAP; });
      var contentH = labH + LAB_GAP + termsH + CAP_H;        // Label + Begriffe + Legende
      var top;                                                // y der Label-Oberkante (1. Label-Baseline ohne Kanji)
      if (ci.dy < 0) top = a.y - contentH;                    // oben: ganzer Block über dem Anker
      else if (ci.dy > 0) top = a.y - 4;                      // unten: knapp unter dem Anker
      else top = a.y - contentH / 2 + 6;                      // Seiten: vertikal zentriert

      svg += '<g class="venn-t" text-anchor="middle">';
      /* Kanji über dem Block */
      svg += '<text class="v-kanji" x="' + a.x + '" y="' + (top - GAP) + '">' + A.KANJI[ci.key] + '</text>';
      /* Backing-Pill hinter dem Versal-Label (Kontrast über Lasur-Fläche, P2-B) */
      var pillW = bud + 12, pillH = labH + 8;
      svg += '<rect class="v-pill" x="' + (a.x - pillW / 2) + '" y="' + (top - labFit.size + 1) +
        '" width="' + pillW + '" height="' + pillH + '" rx="5"/>';
      var ly = top;
      labFit.lines.forEach(function (ln, i) {
        svg += '<text class="v-label" x="' + a.x + '" y="' + ly + '" style="font-size:' + labFit.size + 'px">' + esc(ln) + '</text>';
        ly += labFit.lh;
      });
      ly += LAB_GAP - labFit.lh + (labFit.lh - labFit.size) /* visuelle Korrektur */;
      ly = top + labH + LAB_GAP;
      termBlocks.forEach(function (b) {
        b.lines.forEach(function (ln) {
          svg += '<text class="v-term" x="' + a.x + '" y="' + ly + '" style="font-size:' + b.size + 'px">' + esc(ln) + '</text>';
          ly += b.lh;
        });
        ly += TERM_GAP;
      });
      svg += '<text class="v-cap" x="' + a.x + '" y="' + (ly + 4) + '">' + esc(cap) + '</text>';
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
