/* Canvas-Renderer des Ikigai-Visuals — für Share-Bild, Karussell + PDF.
 * Pixel-nah identisch zum SVG (venn.js): Lasur-Blobs via globalCompositeOperation
 * 'multiply', Aquarell-Saum (Radialgradient), seeded Misregistration, saubere
 * Zentrum-Plakette + Hanko, Labels + Kanji außen, großer Satz als Held.
 * (SVG-in-<img> lädt keine Seiten-Fonts → eigener Renderer.) */
(function () {
  "use strict";

  var A = window.IKIGAI_ART, P = A.P, GEO = A.GEO;
  var SERIF = '"Shippori Mincho", Georgia, serif';
  var SANS = "Inter, sans-serif";

  /* zeichnet einen organischen Blob-Pfad in ctx */
  function blobToPath(ctx, cx, cy, r, rand, jf) {
    var n = 8, jitter = jf == null ? 0.06 : jf, pts = [];
    var phase = rand() * Math.PI * 2;
    for (var i = 0; i < n; i++) {
      var ang = phase + (i / n) * Math.PI * 2;
      var rr = r * (1 + (rand() * 2 - 1) * jitter);
      pts.push([cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr]);
    }
    ctx.beginPath();
    for (var k = 0; k < n; k++) {
      var p0 = pts[(k - 1 + n) % n], p1 = pts[k], p2 = pts[(k + 1) % n], p3 = pts[(k + 2) % n];
      if (k === 0) ctx.moveTo(p1[0], p1[1]);
      ctx.bezierCurveTo(
        p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
        p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6,
        p2[0], p2[1]);
    }
    ctx.closePath();
  }

  /* Zentrierter Text, der bei Überlänge horizontal gestaucht wird (statt über die
   * Kreis-Grenzen / aus dem Bild zu laufen). budget = max. Breite in px. Sehr lange
   * unbrechbare Wörter werden so eng gesetzt, aber bleiben innerhalb der Grenze. */
  function fitText(ctx, text, x, y, budget) {
    var w = ctx.measureText(text).width;
    if (w <= budget || w <= 0) { ctx.fillText(text, x, y); return; }
    var s = budget / w;
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, 1); ctx.translate(-x, -y);
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  /* Nur das Diagramm (Blobs + Plakette + Hanko + Labels), zentriert auf (cx0,cy0).
   * opts.ghost = blasses Geister-Venn (Karussell-Slide 2), opts.noCenter = ohne Plakette. */
  window.IKIGAI_DRAW_DIAGRAM = function (ctx, data, cx0, cy0, size, opts) {
    opts = opts || {};
    var k = size / GEO.vb;
    var r = GEO.r * k, off = GEO.off * k;
    var seed = A.seedFromData(data);
    var rand = A.rng(seed);
    var ghost = !!opts.ghost;

    /* ── Lasur-Blobs (multiply) ── */
    ctx.save();
    ctx.globalCompositeOperation = ghost ? "source-over" : "multiply";
    GEO.circles.forEach(function (ci, i) {
      var cx = cx0 + ci.dx * off, cy = cy0 + ci.dy * off;
      var mr = A.misreg(rand, k);
      var cr = A.rng(seed + i * 131);
      ctx.save();
      ctx.translate(cx + mr.dx, cy + mr.dy);
      ctx.rotate((ci.key === "liebe" ? mr.rot + 0.3 : mr.rot) * Math.PI / 180);
      blobToPath(ctx, 0, 0, r, cr, 0.06);
      var grad = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r * 1.02);
      var aMul = ghost ? 0.4 : 1;
      grad.addColorStop(0, A.hexA(ci.color, 0.30 * aMul));
      grad.addColorStop(0.62, A.hexA(ci.color, 0.42 * aMul));
      grad.addColorStop(0.90, A.hexA(ci.deep, 0.60 * aMul));
      grad.addColorStop(1, A.hexA(ci.deep, 0.16 * aMul));
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
    });
    ctx.restore();

    /* ── Zentrum-Plakette + Hanko ── */
    if (!opts.noCenter && !ghost) {
      var inits = A.initials(opts.name);
      var plW = 96 * k, plH = 96 * k, rx = 9 * k;
      roundRect(ctx, cx0 - plW / 2, cy0 - plH / 2, plW, plH, rx);
      ctx.fillStyle = A.hexA(P.paperWarm, 0.94); ctx.fill();
      ctx.lineWidth = 1 * k; ctx.strokeStyle = A.hexA(P.line, 0.6); ctx.stroke();
      /* Hanko */
      blobToPath(ctx, cx0, cy0 - 8 * k, 26 * k, A.rng(seed + 7), 0.04);
      ctx.fillStyle = A.hexA(P.accent, 0.9); ctx.fill();
      ctx.textAlign = "center";
      ctx.fillStyle = P.paper;
      ctx.font = "700 " + Math.round(20 * k) + "px " + SANS;
      ctx.fillText(inits, cx0, cy0 - 1 * k + 7 * k);
      ctx.fillStyle = P.grau;
      ctx.font = "600 " + Math.round(8 * k) + "px " + SANS;
      setLS(ctx, 0.3 * 8 * k);
      ctx.fillText("IKIGAI", cx0, cy0 + 32 * k);
      setLS(ctx, 0);
    }

    /* ── Labels außen + Kanji + Begriffe ── */
    if (opts.noLabels || ghost) return;
    ctx.textAlign = "center";
    /* Breiten-Budget je Label-Block (zentriert): die schmalste Hälfte zwischen
     * Anker und nächstem harten Rand (Cluster-Außenkante bzw. Zentrum-Plakette).
     * Lange/unbrechbare Wörter werden gestaucht statt über die Kreise zu laufen. */
    /* Identische Schranken wie venn.js budget() (Brief §2: SVG + Canvas pixel-nah
     * gleich). Ein Label gehört zu EINEM Kreis und wird auf dessen Fußabdruck
     * begrenzt — nie auf die Clusterbreite (sonst liefen lange Wörter wie im
     * Review weit über ihren Kreis hinaus). KEIN großzügiger Floor. */
    var plHalf = 56 * k;                                  // Plaketten-Sperrzone (halb)
    var FOOT = 2 * r * 0.92;                              // Kreis-Fußabdruck (≈ Durchmesser)
    function labelBudget(ci, ax) {
      if (ci.dx === 0) return FOOT;                        // oben/unten: auf den Kreis begrenzt
      var outerHalf = (r + off) * 0.98;                    // bis Cluster-Außenkante
      var half = ci.dx < 0
        ? Math.min(ax - (cx0 - outerHalf), (cx0 - plHalf) - ax)
        : Math.min((cx0 + outerHalf) - ax, ax - (cx0 + plHalf));
      /* Seiten-Labels am äußeren Flank → engere Schranke r·1.5 (wie SVG) */
      return Math.min(2 * half, r * 1.5);
    }
    GEO.circles.forEach(function (ci) {
      var cx = cx0 + ci.dx * off, cy = cy0 + ci.dy * off;
      var ax = cx + ci.dx * (r * 0.74), ay = cy + ci.dy * (r * 0.78);
      var bud = labelBudget(ci, ax);
      var terms = (data.kreise && data.kreise[ci.key]) || [];

      /* Label + Begriffe mehrzeilig umbrechen + schrumpfen (NIE horizontal stauchen).
       * fitWrap misst echte Breiten + bricht unbrechbare Wörter hart (Review-P1). */
      var labFit = A.fitWrap(ctx, ci.label.toUpperCase(), bud, 2,
        function (s) { return "600 " + Math.round(s) + "px " + SANS; }, 13 * k, 10 * k);
      var termFits = terms.slice(0, 3).map(function (t) {
        return A.fitWrap(ctx, t, bud, 2, function (s) { return "500 " + Math.round(s) + "px " + SANS; }, 13 * k, 10 * k);
      });
      var labLh = labFit.size * 1.18, capH = 15 * k, gap = 7 * k;
      var labH = labFit.lines.length * labLh;
      var termsH = 0; termFits.forEach(function (f) { termsH += f.lines.length * f.size * 1.18 + 5 * k; });
      var contentH = labH + gap + termsH + capH;
      /* Block-Oberkante: oben wächst nach oben, unten nach unten, Seiten zentriert */
      var top;
      if (ci.dy < 0) top = ay - 28 * k - contentH;
      else if (ci.dy > 0) top = ay + 14 * k;
      else top = ay - contentH / 2;

      /* Kanji über dem Block */
      ctx.fillStyle = A.hexA(P.sumi, 0.5);
      ctx.font = "400 " + Math.round(26 * k) + "px " + SERIF;
      ctx.fillText(A.KANJI[ci.key], ax, top - gap);
      /* Backing-Pill hinter dem Versal-Label (Kontrast über Lasur-Fläche, P2-B) */
      var pillW = bud + 12 * k, pillH = labH + 8 * k;
      ctx.fillStyle = A.hexA(P.paper, 0.82);
      roundRect(ctx, ax - pillW / 2, top - labFit.size, pillW, pillH, 5 * k); ctx.fill();
      /* Versal-Label: dunkle Sumi-Tinte (P2-B) */
      ctx.fillStyle = P.sumi;
      ctx.font = "600 " + Math.round(labFit.size) + "px " + SANS;
      setLS(ctx, 0.24 * labFit.size);
      var ly = top;
      labFit.lines.forEach(function (ln) { ctx.fillText(ln, ax, ly); ly += labLh; });
      setLS(ctx, 0);
      ly = top + labH + gap;
      ctx.fillStyle = P.sumi;
      termFits.forEach(function (f) {
        ctx.font = "500 " + Math.round(f.size) + "px " + SANS;
        f.lines.forEach(function (ln) { ctx.fillText(ln, ax, ly); ly += f.size * 1.18; });
        ly += 5 * k;
      });
      ctx.fillStyle = P.grau;
      ctx.font = "italic 400 " + Math.round(11 * k) + "px " + SERIF;
      ctx.fillText(A.FARBNAMEN[ci.key], ax, ly + 2 * k);
    });
  };

  /* Volles Venn-Artefakt mit großem Satz darunter — für PDF S3 + (optional) Fallbacks.
   * Erwartet ctx mit bereits gefülltem Hintergrund. cx0/topY in px. */
  window.IKIGAI_DRAW_VENN = function (ctx, data, cx0, cy0, size, opts) {
    opts = opts || {};
    window.IKIGAI_DRAW_DIAGRAM(ctx, data, cx0, cy0, size, opts);
  };

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function setLS(ctx, px) {
    if ("letterSpacing" in ctx) { try { ctx.letterSpacing = px + "px"; } catch (e) {} }
  }
})();
