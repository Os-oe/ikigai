/* ikigai-art.js — gemeinsame Kunst-Grundlage für SVG (venn.js), Canvas
 * (visual-canvas.js / share / pdf) und Karussell. EINE Quelle für:
 *   - die traditionelle japanische Palette (verbindliche Hex aus dem Design-Brief)
 *   - seeded RNG (jeder User ein Unikat, aber SVG + Canvas identisch)
 *   - organische Blob-Pfade (Catmull-Rom → Bézier)
 *   - unvollkommener Ensō-Pfad (variable Strichbreite, Lücke rechts unten)
 *   - Geometrie des 4-Kreise-Venn (Positionen, Center, Label-Anker)
 *
 * Reine Mathematik + Strings — kein DOM, kein Canvas hier. */
(function () {
  "use strict";

  /* ───────── Palette (verbindlich, §2.1 Design-Brief) ───────── */
  var P = {
    accent:   "#F6303A", // Siegelrot — einziger UI-Akzent, Hanko, Zentrum
    liebe:    "#C3272B", // Akabeni
    liebeDeep:"#8F1D21", // Shinshu (Saum)
    staerke:  "#1F4788", // Ruri-iro (Lapislazuli)
    welt:     "#A5BA93", // Byakuroku
    markt:    "#C66B27", // Kincha (Goldbraun)
    sumi:     "#27221F", // Sumi-iro — Text/Tiefton, nie #000
    paper:    "#F3EBDD", // Washi-Grund (Torinoko aufgehellt)
    paperWarm:"#E2BE9F", // Torinoko-iro (Plaketten-Ton)
    paperCool:"#EBF6F7", // Aijiro (optionaler Sektions-Wechsel)
    grau:     "#97867C", // Ginnezumi — Labels, Datum, Fußzeile
    kon:      "#192236", // Kon — Dark-Edition BG
    gold:     "#FFA400", // Yamabuki (Kintsugi-Spitze)
    line:     "#D8C9B2"  // helle Hairline auf Washi
  };

  /* Farbnamen sind Content (§2.1): Mikro-Legende je Dimension */
  var FARBNAMEN = {
    liebe:   "Akabeni — Rotlack",
    staerke: "Ruri — Lapislazuli",
    welt:    "Byakuroku — Grünspan",
    markt:   "Kincha — Goldbraun"
  };

  /* Kanji-Marker (funktional, §2.3) — nie erfundene Kalligrafie */
  var KANJI = { liebe: "愛", staerke: "技", welt: "世", markt: "価" };

  /* ───────── Geometrie des Venn ───────── */
  var GEO = {
    vb: 600, r: 150, off: 86,
    /* Reihenfolge fixiert: Lieben · Können · Welt · Bezahlt (Brief §3.3) */
    circles: [
      { key: "liebe",   label: "Was du liebst",          dx:  0, dy: -1, color: P.liebe,   deep: P.liebeDeep },
      { key: "staerke", label: "Worin du gut bist",       dx: -1, dy:  0, color: P.staerke, deep: "#143264" },
      { key: "welt",    label: "Was die Welt braucht",    dx:  1, dy:  0, color: P.welt,    deep: "#7C9468" },
      { key: "markt",   label: "Wofür man dich bezahlt",  dx:  0, dy:  1, color: P.markt,   deep: "#9A4E18" }
    ]
  };

  /* ───────── seeded RNG (mulberry32) ───────── */
  function hashStr(s) {
    var h = 2166136261 >>> 0;
    s = String(s || "ikigai");
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    var a = (typeof seed === "number" ? seed : hashStr(seed)) >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Seed aus den Antworten ableiten → jeder User ein Unikat, deterministisch */
  function seedFromData(data) {
    var parts = [];
    if (data && data.zentrum) parts.push(data.zentrum);
    if (data && data.kreise) ["liebe", "staerke", "welt", "markt"].forEach(function (k) {
      (data.kreise[k] || []).forEach(function (t) { parts.push(t); });
    });
    return hashStr(parts.join("|") || "ikigai");
  }

  /* ───────── organischer Blob-Pfad (Catmull-Rom → Bézier) ───────── */
  /* gibt SVG-Pfad-String relativ zu (cx,cy). points = 8, jitter ±≤7 % */
  function blobPath(cx, cy, r, rand, jitterFrac) {
    var n = 8, jf = jitterFrac == null ? 0.07 : jitterFrac;
    var pts = [];
    var phase = rand() * Math.PI * 2;
    for (var i = 0; i < n; i++) {
      var ang = phase + (i / n) * Math.PI * 2;
      var rr = r * (1 + (rand() * 2 - 1) * jf);
      pts.push([cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr]);
    }
    return catmullRom(pts);
  }

  /* geschlossener Catmull-Rom-Spline als kubische Béziers */
  function catmullRom(pts) {
    var n = pts.length, d = "";
    for (var i = 0; i < n; i++) {
      var p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      if (i === 0) d += "M" + fmt(p1[0]) + "," + fmt(p1[1]);
      var c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      var c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += "C" + fmt(c1x) + "," + fmt(c1y) + " " + fmt(c2x) + "," + fmt(c2y) + " " + fmt(p2[0]) + "," + fmt(p2[1]);
    }
    return d + "Z";
  }
  function fmt(x) { return Math.round(x * 100) / 100; }

  /* Misregistration: seeded Offset pro Platte (1.5–2.5 px in eigene Richtung) */
  function misreg(rand, scale) {
    var ang = rand() * Math.PI * 2;
    var mag = (1.5 + rand()) * (scale || 1);
    return { dx: Math.cos(ang) * mag, dy: Math.sin(ang) * mag, rot: (rand() * 0.6 - 0.3) };
  }

  /* ───────── unvollkommener Ensō ───────── */
  /* Liste von [x,y] Außen-/Innenpunkten → gefüllter Pfad mit variabler Breite.
   * gap: Lücke (Bogenanteil ausgespart, default rechts unten). */
  function ensoFillPath(cx, cy, r, rand, opts) {
    opts = opts || {};
    var gap = opts.gap == null ? 0.32 : opts.gap;          // Lücken-Anteil
    var start = opts.start == null ? -0.55 * Math.PI : opts.start;
    var sweep = Math.PI * 2 * (1 - gap);
    var steps = opts.steps || 64;
    var baseW = opts.width || r * 0.085;
    var outer = [], inner = [];
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var ang = start + sweep * t;
      // Strichbreite schwillt in der Mitte an, dünn an den Enden (Pinseldruck)
      var taper = Math.sin(Math.PI * t);
      var wob = 1 + (rand() * 2 - 1) * 0.18;
      var w = baseW * (0.35 + 0.9 * taper) * wob;
      // leichte Radius-Unruhe (Hand)
      var rr = r * (1 + (rand() * 2 - 1) * 0.025);
      var ca = Math.cos(ang), sa = Math.sin(ang);
      outer.push([cx + ca * (rr + w), cy + sa * (rr + w)]);
      inner.push([cx + ca * (rr - w), cy + sa * (rr - w)]);
    }
    var d = "M" + fmt(outer[0][0]) + "," + fmt(outer[0][1]);
    for (var a = 1; a < outer.length; a++) d += "L" + fmt(outer[a][0]) + "," + fmt(outer[a][1]);
    for (var b = inner.length - 1; b >= 0; b--) d += "L" + fmt(inner[b][0]) + "," + fmt(inner[b][1]);
    return d + "Z";
  }

  /* Initialen aus Namen (für Hanko) */
  function initials(name) {
    var parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "私"; // "ich" — neutraler Fallback, kein erfundener Name
    var s = parts[0][0];
    if (parts.length > 1) s += parts[parts.length - 1][0];
    return s.toUpperCase().slice(0, 2);
  }

  /* Zeilen-Umbruch (geteilt mit altem GEO.wrap). Bricht zusätzlich EINZELNE
   * unbrechbar lange Wörter hart auf (sonst läuft „Interdisziplinäre“ über jede
   * Grenze — das war die Wurzel der Venn-/Karussell-Overflows). */
  function wrap(text, maxChars, maxLines) {
    var raw = String(text).split(/\s+/), words = [];
    raw.forEach(function (w) {
      while (w.length > maxChars) { words.push(w.slice(0, Math.max(1, maxChars - 1)) + "­"); w = w.slice(Math.max(1, maxChars - 1)); }
      words.push(w);
    });
    var lines = [], cur = "";
    words.forEach(function (w) {
      var glue = (cur && cur.charAt(cur.length - 1) === "­") ? "" : " ";
      if ((cur + glue + w).trim().length > maxChars && cur) { lines.push(cur); cur = w; }
      else cur = (cur + glue + w).replace(/^\s+/, "");
    });
    if (cur) lines.push(cur);
    if (maxLines && lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      lines[maxLines - 1] = lines[maxLines - 1].replace(/[\s­]*.$/, "") + "…";
    }
    /* sichtbares Soft-Hyphen am Zeilenende → echter Bindestrich */
    return lines.map(function (l) { return l.replace(/­$/, "-").replace(/­/g, ""); });
  }

  /* Canvas-Wortumbruch mit echter Breitenmessung + Hard-Break unbrechbarer Wörter.
   * Gibt {lines, font} zurück: schrumpft die Schrift stufenweise, bis ALLE Zeilen
   * in maxW passen UND die Zeilenzahl <= maxLines bleibt. NIE horizontal stauchen. */
  function fitWrap(ctx, text, maxW, maxLines, makeFont, basePx, minPx) {
    minPx = minPx || Math.max(9, Math.round(basePx * 0.55));
    var size = basePx, lines;
    for (;;) {
      ctx.font = makeFont(size);
      lines = wrapMeasured(ctx, text, maxW);
      var widest = 0;
      lines.forEach(function (l) { widest = Math.max(widest, ctx.measureText(l).width); });
      if ((lines.length <= maxLines && widest <= maxW + 0.5) || size <= minPx) break;
      size -= 1;
    }
    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      var last = lines[maxLines - 1];
      while (last && ctx.measureText(last + "…").width > maxW) last = last.replace(/[\s-]*\S$/, "").replace(/-$/, "");
      lines[maxLines - 1] = (last || lines[maxLines - 1]) + "…";
    }
    return { lines: lines, size: size };
  }

  /* Wortumbruch per gemessener Breite; lange Einzelwörter werden zeichenweise hart
   * gebrochen, damit keine Zeile maxW überschreitet. */
  function wrapMeasured(ctx, text, maxW) {
    var words = String(text).split(/\s+/), lines = [], line = "";
    function pushBroken(w) {
      var chunk = "";
      for (var i = 0; i < w.length; i++) {
        var t = chunk + w[i];
        if (ctx.measureText(t + "-").width > maxW && chunk) { lines.push(chunk + "-"); chunk = w[i]; }
        else chunk = t;
      }
      return chunk;
    }
    words.forEach(function (w) {
      var test = (line ? line + " " : "") + w;
      if (ctx.measureText(test).width <= maxW) { line = test; return; }
      if (line) { lines.push(line); line = ""; }
      if (ctx.measureText(w).width > maxW) { line = pushBroken(w); }
      else line = w;
    });
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  }

  window.IKIGAI_ART = {
    P: P, FARBNAMEN: FARBNAMEN, KANJI: KANJI, GEO: GEO,
    rng: rng, hashStr: hashStr, seedFromData: seedFromData,
    blobPath: blobPath, catmullRom: catmullRom, misreg: misreg,
    ensoFillPath: ensoFillPath, initials: initials, wrap: wrap,
    fitWrap: fitWrap, wrapMeasured: wrapMeasured,
    hexA: function (hex, a) {
      var n = parseInt(hex.slice(1), 16);
      return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
    }
  };
})();
