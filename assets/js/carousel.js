/* carousel.js — Spotify-Wrapped-Karussell: 6 Slides @1080×1350 (4:5), reine
 * Typografie + Ensō + Washi-Textur, 0 € Renderkosten. EINE Pipeline, drei
 * Ausspielungen: 6 PNGs (IG), LinkedIn-PDF (slides-to-pdf-Logik via jsPDF),
 * 2 Story-Crops 1080×1920. Slide 3 (der Satz, invertiert) = Default-Einzel-Share.
 *
 * Privacy: feiert (kuratiert), zeigt NIE Roh-Antworten/Geld/Defizit — nutzt das
 * optionale Synthese-Feld `carousel` mit Fallback auf das normale Ergebnis. */
(function () {
  "use strict";

  var A = window.IKIGAI_ART, P = A.P;
  var SERIF = '"Shippori Mincho", Georgia, serif';
  var SANS = "Inter, sans-serif";
  var W = 1080, H = 1350;
  var logoImg = null;

  function loadLogo() {
    return new Promise(function (resolve) {
      if (logoImg) return resolve(logoImg);
      var img = new Image();
      img.onload = function () { logoImg = img; resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = "assets/img/logo-mark.png";
    });
  }

  /* ---------- Inhalt aus Ergebnis ableiten (carousel-Feld bevorzugt) ---------- */
  function content(erg, ctx) {
    var c = erg.carousel || {};
    var name = (ctx.profil && ctx.profil.name || "").trim();
    /* 4 kuratierte Dimensions-Stichworte */
    var dims = c.stichworte || {
      liebe: (erg.kreise && erg.kreise.liebe || [])[0] || "",
      staerke: (erg.kreise && erg.kreise.staerke || [])[0] || "",
      welt: (erg.kreise && erg.kreise.welt || [])[0] || "",
      markt: (erg.kreise && erg.kreise.markt || [])[0] || ""
    };
    /* Erkenntnis als Beobachtung (kein Defizit) */
    var erk = c.erkenntnis || ((erg.erkenntnisse || [])[0] || {}).text || "";
    /* 3 Freuden aus Alltag (nahbar, risikolos) — auf einen kuratierten Halbsatz
     * verdichtet. WICHTIG: den Artikel NICHT abschneiden — „der erste Kaffee“ ohne
     * „der“ liest als kaputt, nicht als kuratiert. Nur an erster Sinngrenze
     * (Komma/Gedankenstrich) kürzen, auf max. 7 Wörter, ersten Buchstaben groß. */
    var freuden = c.freuden || (erg.alltag || []).slice(0, 3).map(function (a) {
      var t = String(a.moment || "").trim();
      t = t.split(/\s*[—–,]\s+/)[0].trim();
      var w = t.split(/\s+/);
      if (w.length > 7) t = w.slice(0, 7).join(" ");
      if (t) t = t.charAt(0).toUpperCase() + t.slice(1);
      return t;
    });
    var schritt = c.schritt || (((erg.ideen || [])[0] || {}).erster_schritt) || "";
    return {
      name: name, dims: dims, satz: erg.zentrum || "",
      erkenntnis: erk, freuden: freuden.slice(0, 3), schritt: schritt
    };
  }

  /* ---------- Hilfen ---------- */
  function paper(ctx, w, h, dark) {
    ctx.fillStyle = dark ? P.kon : P.paper;
    ctx.fillRect(0, 0, w, h);
    /* Washi-Korn */
    grain(ctx, w, h, dark ? 0.10 : 0.05);
    /* warmer Lichtverlauf */
    var g = ctx.createRadialGradient(w * 0.78, h * 0.12, w * 0.05, w * 0.5, h * 0.5, Math.max(w, h) * 0.85);
    if (dark) { g.addColorStop(0, "rgba(60,76,110,.35)"); g.addColorStop(1, "rgba(10,14,24,.4)"); }
    else { g.addColorStop(0, "rgba(255,251,243,.6)"); g.addColorStop(1, "rgba(160,142,112,.10)"); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }
  var grainCache = {};
  function grain(ctx, w, h, alpha) {
    var key = w + "x" + h + (alpha > 0.07 ? "d" : "l");
    if (!grainCache[key]) {
      var c = document.createElement("canvas"); c.width = w; c.height = h;
      var g = c.getContext("2d");
      var img = g.createImageData(w, h), d = img.data, base = alpha > 0.07 ? 70 : 150;
      for (var i = 0; i < d.length; i += 4) {
        var n = (Math.random() * 255) | 0;
        d[i] = d[i + 1] = d[i + 2] = base; d[i + 3] = (n < 32 ? alpha * 255 : 0) | 0;
      }
      g.putImageData(img, 0, 0); grainCache[key] = c;
    }
    ctx.drawImage(grainCache[key], 0, 0);
  }

  function ensoStroke(ctx, cx, cy, r, lw, color, alpha, closed) {
    ctx.save();
    ctx.strokeStyle = A.hexA(color, alpha);
    ctx.lineWidth = lw; ctx.lineCap = "round";
    ctx.beginPath();
    var end = closed ? 1.62 * Math.PI : 1.34 * Math.PI;
    ctx.arc(cx, cy, r, -0.42 * Math.PI, end);
    ctx.stroke();
    /* Kasure-Borste am Ende */
    ctx.lineWidth = lw * 0.4;
    ctx.beginPath();
    ctx.arc(cx, cy, r, end, end + 0.12 * Math.PI);
    ctx.stroke();
    ctx.restore();
  }

  function wordmark(ctx, x, y, sizePx, dark) {
    ctx.textAlign = "left";
    ctx.font = "700 " + sizePx + "px " + SERIF;
    var w1 = ctx.measureText("ikig").width;
    var total = w1 + ctx.measureText("AI").width;
    var sx = x - total / 2;
    ctx.fillStyle = dark ? P.paper : P.sumi;
    ctx.fillText("ikig", sx, y);
    ctx.fillStyle = P.accent;
    ctx.fillText("AI", sx + w1, y);
    ctx.textAlign = "center";
  }

  function ls(ctx, px) { if ("letterSpacing" in ctx) { try { ctx.letterSpacing = px + "px"; } catch (e) {} } }

  /* Bricht Text in <=maxLines Zeilen; letzte Zeile ggf. mit „…“ statt hartem Schnitt. */
  function wrapLines(ctx, text, maxW, font, maxLines) {
    ctx.font = font;
    var words = String(text).split(/\s+/), line = "", lines = [];
    for (var i = 0; i < words.length; i++) {
      var test = (line + " " + words[i]).trim();
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line); line = words[i];
        if (lines.length === maxLines - 1) {
          /* Rest in die letzte Zeile, bei Überlänge sauber kürzen */
          var rest = words.slice(i).join(" ");
          while (rest && ctx.measureText(rest + "…").width > maxW) rest = rest.replace(/\s*\S+$/, "");
          lines.push((rest || words[i]) + (words.slice(i).join(" ") !== rest ? "…" : ""));
          return lines;
        }
      } else line = test;
    }
    if (line) lines.push(line);
    return lines.slice(0, maxLines);
  }

  /* Zentrierter Text, der bei Überlänge horizontal gestaucht wird — verhindert,
   * dass einzelne unbrechbare Wörter über die maxW-Grenze hinauslaufen. */
  function fitLine(ctx, text, x, y, maxW) {
    var w = ctx.measureText(text).width;
    if (w <= maxW || w <= 0) { ctx.fillText(text, x, y); return; }
    var s = maxW / w;
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, 1); ctx.translate(-x, -y);
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  /* Wortumbruch mit echter Breitenmessung + Hard-Break unbrechbarer Wörter +
   * stufenweiser Schrift-Verkleinerung (NIE horizontal stauchen — Review-P1-B:
   * „Interdisziplinäre“ lief sonst zu unleserlich kondensierten Buchstaben zusammen).
   * font = "<weight> <px>px <family>" — die px werden als Basisgröße verwendet,
   * der Familienteil bleibt erhalten. */
  function wrapDraw(ctx, text, x, y, maxW, lh, font, color, align, maxLines) {
    var m = /(\d+(?:\.\d+)?)px/.exec(font);
    var basePx = m ? parseFloat(m[1]) : 40;
    var pre = font.slice(0, m ? m.index : 0);
    var post = font.slice(m ? m.index + m[0].length : 0);
    function makeFont(s) { return pre + Math.round(s) + "px" + post; }
    var fit = A.fitWrap(ctx, text, maxW, maxLines || 6, makeFont, basePx, Math.max(20, Math.round(basePx * 0.5)));
    ctx.font = makeFont(fit.size); ctx.fillStyle = color; ctx.textAlign = align || "center";
    /* Zeilenhöhe proportional mitskalieren, wenn die Schrift geschrumpft wurde */
    var scaledLh = lh * (fit.size / basePx);
    var startY = y - ((fit.lines.length - 1) * scaledLh) / 2;
    fit.lines.forEach(function (l, i) { ctx.fillText(l, x, startY + i * scaledLh); });
    return fit.lines.length;
  }

  /* beim Story-Export Paginierung weglassen: ein Einzel-Asset erbt sonst „03 — 06“,
   * obwohl es kein 6er-Deck ist (P3). Flag wird im Story-Render gesetzt. */
  var SUPPRESS_PAGINATION = false;
  function progress(ctx, n, dark) {
    if (SUPPRESS_PAGINATION) return;
    ctx.textAlign = "center";
    ctx.fillStyle = dark ? A.hexA(P.paper, 0.6) : P.grau;
    ctx.font = "600 24px " + SANS;
    ls(ctx, 6);
    ctx.fillText("0" + n + " — 06", W / 2, H - 70);
    ls(ctx, 0);
  }
  function nameTag(ctx, name, dark) {
    if (!name) return;
    ctx.textAlign = "center";
    ctx.fillStyle = dark ? A.hexA(P.paper, 0.55) : P.grau;
    ctx.font = "500 26px " + SANS;
    ctx.fillText(name + "s Ikigai", W / 2, 90);
  }

  /* ---------- die 6 Slides ---------- */
  /* Jede Slide-Funktion zeichnet in ctx (W×H bereits gesetzt). */
  var SLIDES = {
    1: function (ctx, d, logo) { // Cover/Hook — großer Ensō, kein Ergebnis
      paper(ctx, W, H, false);
      nameTag(ctx, d.name, false);
      ensoStroke(ctx, W / 2, 560, 300, 24, P.accent, 0.9, false);
      ctx.fillStyle = P.sumi;
      ctx.textAlign = "center";
      ctx.font = "700 92px " + SERIF;
      ctx.fillText("Mein Ikigai", W / 2, 590);
      ctx.fillStyle = P.grau; ctx.font = "500 30px " + SANS;
      ctx.fillText(new Date().toLocaleDateString("de-DE", { month: "long", year: "numeric" }), W / 2, 1180);
      progress(ctx, 1, false);
    },
    2: function (ctx, d) { // Vier Dimensionen ums geisterhafte Venn (Backdrop)
      paper(ctx, W, H, false);
      nameTag(ctx, d.name, false);
      ctx.fillStyle = P.sumi; ctx.textAlign = "center";
      ctx.font = "600 46px " + SERIF;
      ctx.fillText("Vier Kreise. Deine vier.", W / 2, 220);
      /* sehr blasses Geister-Venn als Backdrop, ohne Labels */
      ctx.save(); ctx.globalAlpha = 0.5;
      window.IKIGAI_DRAW_DIAGRAM(ctx, { kreise: {} }, W / 2, 700, 620, { ghost: true, noCenter: true, noLabels: true });
      ctx.restore();
      var quad = [
        { l: "WAS DU LIEBST", w: d.dims.liebe, x: W * 0.27, y: 470 },
        { l: "WAS DIE WELT BRAUCHT", w: d.dims.welt, x: W * 0.73, y: 470 },
        { l: "WORIN DU GUT BIST", w: d.dims.staerke, x: W * 0.27, y: 850 },
        { l: "WOFÜR MAN ZAHLT", w: d.dims.markt, x: W * 0.73, y: 850 }
      ];
      /* überraschendstes Wort (liebe) in Siegelrot. Breiteres Wort-Budget (430 px)
       * + bis zu 3 Zeilen + tieferes Schrift-Minimum, damit lange Begriffe an
       * Wortgrenzen umbrechen statt mitten im Wort hart zu trennen (Review-P1-B). */
      quad.forEach(function (q, i) {
        ctx.textAlign = "center";
        ctx.fillStyle = P.grau; ctx.font = "600 22px " + SANS; ls(ctx, 3);
        ctx.fillText(q.l, q.x, q.y); ls(ctx, 0);
        wrapDraw(ctx, q.w || "—", q.x, q.y + 52, 430, 46, "600 40px " + SERIF, i === 0 ? P.accent : P.sumi, "center", 3);
      });
      progress(ctx, 2, false);
    },
    3: function (ctx, d) { // DER Satz — invertiert dunkel (Hero, Default-Share)
      paper(ctx, W, H, true);
      nameTag(ctx, d.name, true);
      ctx.fillStyle = A.hexA(P.paper, 0.5); ctx.textAlign = "center";
      ctx.font = "600 26px " + SANS; ls(ctx, 5);
      ctx.fillText("DEIN IKIGAI IN EINEM SATZ", W / 2, 230); ls(ctx, 0);
      /* Satzgröße nach Länge staffeln, damit lange Sätze nicht das Hanko + die
       * Paginierung an den unteren Rand quetschen (harter Mindest-Footer-Abstand). */
      var len = String(d.satz || "").length;
      var sz = len <= 90 ? 64 : len <= 150 ? 54 : len <= 220 ? 46 : 40;
      var maxW = 880, maxLines = 7;
      /* fitWrap: echtes Wort-Wrap + Hard-Break unbrechbarer Wörter + Schrift-Shrink,
       * NIE horizontal stauchen (Review-P1-B). */
      var fit = A.fitWrap(ctx, "„" + (d.satz || "") + "“", maxW, maxLines,
        function (s) { return "600 " + Math.round(s) + "px " + SERIF; }, sz, Math.round(sz * 0.62));
      var lines = fit.lines; sz = fit.size;
      var lh = Math.round(sz * 1.34);
      /* Bottom-up-Layout mit garantierten Abständen:
       *   Footer (progress) bei H-70 · Hanko darüber (Gap >=70) · Satz darüber (Gap >=64) */
      var FOOTER_Y = H - 70, HANKO_R = 46;
      var hy = FOOTER_Y - 64 - HANKO_R;                  // Hanko-Mitte, >=64 px über dem Footer-Text
      var satzBottom = hy - HANKO_R - 70;                // Satz-Unterkante, >=70 px über dem Hanko
      var blockH = (lines.length - 1) * lh;
      var topRegion = 300;                               // unter dem Kicker
      var startY = Math.min(satzBottom - blockH, (topRegion + satzBottom - blockH) / 2);
      startY = Math.max(startY, topRegion);              // nie ins Kicker-Feld
      ctx.textAlign = "center"; ctx.fillStyle = P.paper; ctx.font = "600 " + sz + "px " + SERIF;
      lines.forEach(function (l, i) { ctx.fillText(l, W / 2, startY + i * lh); });
      /* kleines Hanko als Beglaubigung */
      var inits = A.initials(d.name);
      ctx.save();
      ctx.beginPath(); ctx.arc(W / 2, hy, HANKO_R, 0, Math.PI * 2);
      ctx.fillStyle = A.hexA(P.accent, 0.92); ctx.fill();
      ctx.fillStyle = P.paper; ctx.font = "700 38px " + SANS; ctx.textAlign = "center";
      ctx.fillText(inits, W / 2, hy + 14);
      ctx.restore();
      progress(ctx, 3, true);
    },
    4: function (ctx, d) { // Erkenntnis (Twist)
      paper(ctx, W, H, false);
      nameTag(ctx, d.name, false);
      ctx.fillStyle = P.accent; ctx.textAlign = "center";
      ctx.font = "700 170px " + SERIF;
      ctx.fillText("“", W / 2, 410);
      ctx.fillStyle = P.grau; ctx.font = "600 30px " + SANS; ls(ctx, 4);
      ctx.fillText("WAS AUFFÄLLT", W / 2, 470); ls(ctx, 0);
      wrapDraw(ctx, d.erkenntnis, W / 2, 720, 840, 56, "500 42px " + SERIF, P.sumi, "center");
      progress(ctx, 4, false);
    },
    5: function (ctx, d) { // Kleine Freuden (Wärme)
      paper(ctx, W, H, false);
      nameTag(ctx, d.name, false);
      ctx.fillStyle = P.sumi; ctx.textAlign = "center";
      ctx.font = "600 52px " + SERIF;
      ctx.fillText("Kleine Freuden", W / 2, 280);
      ctx.fillStyle = P.grau; ctx.font = "italic 400 28px " + SERIF;
      ctx.fillText("die dich schon heute tragen", W / 2, 330);
      /* Tick links, Text rechts — mit garantiertem Abstand dazwischen, damit der
       * Pinsel-Tick NIE über/in den Text läuft. Tick-Ende + Gap < Text-Anfang. */
      var BASE5 = 38;
      var tickX = W * 0.16, tickLen = W * 0.07;   // Tick-Band: 0.16W .. 0.23W
      var textX = W * 0.27;                         // Text startet sicher rechts vom Tick
      var maxW = W - textX - 110;                   // rechter Sicherheits-Rand
      var y = 500;
      d.freuden.forEach(function (f) {
        /* fitWrap: max. 2 Zeilen, unbrechbare lange Wörter werden hart gebrochen +
         * die Schrift schrumpft, statt über den rechten Rand zu laufen (Review-P1). */
        var fit = A.fitWrap(ctx, String(f), maxW, 2,
          function (s) { return "500 " + Math.round(s) + "px " + SANS; }, BASE5, 26);
        var lines = fit.lines, LH5 = Math.round(fit.size * 1.26);
        /* roter Pinsel-Tick: auf der optischen Mitte der ERSTEN Textzeile (≈ y - 12),
         * waagerecht links neben dem Text, kein Überlappen mehr. */
        var tickY = y - 12;
        ctx.save();
        ctx.strokeStyle = A.hexA(P.accent, 0.85); ctx.lineWidth = 8; ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(tickX, tickY + 2);
        ctx.quadraticCurveTo(tickX + tickLen * 0.5, tickY - 7, tickX + tickLen, tickY);
        ctx.stroke(); ctx.restore();
        /* Text */
        ctx.textAlign = "left"; ctx.fillStyle = P.sumi; ctx.font = "500 " + Math.round(fit.size) + "px " + SANS;
        lines.forEach(function (ln, li) { ctx.fillText(ln, textX, y + li * LH5); });
        y += (lines.length === 2 ? 200 : 150);
      });
      progress(ctx, 5, false);
    },
    6: function (ctx, d, logo) { // Erster Schritt + CTA — Ensō schließt sich
      paper(ctx, W, H, false);
      nameTag(ctx, d.name, false);
      ctx.fillStyle = P.grau; ctx.textAlign = "center"; ctx.font = "600 28px " + SANS; ls(ctx, 4);
      ctx.fillText("MEIN ERSTER SCHRITT", W / 2, 220); ls(ctx, 0);
      wrapDraw(ctx, d.schritt, W / 2, 420, 840, 54, "600 42px " + SERIF, P.sumi, "center");
      /* Trennlinie */
      ctx.strokeStyle = A.hexA(P.line, 1); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(W / 2 - 60, 700); ctx.lineTo(W / 2 + 60, 700); ctx.stroke();
      /* geschlossener Ensō = Ende der Erzählung */
      ensoStroke(ctx, W / 2, 920, 130, 16, P.sumi, 0.85, true);
      ctx.fillStyle = P.sumi; ctx.font = "italic 400 32px " + SERIF; ctx.textAlign = "center";
      ctx.fillText("Finde dein Ikigai", W / 2, 1140);
      ctx.fillStyle = P.accent; ctx.font = "600 32px " + SANS;
      ctx.fillText("ikigai.demo.osai.solutions", W / 2, 1190);
      if (logo) {
        var lw = 42, lh = lw * (logo.height / logo.width);
        var txtW = ctx.measureText("OsAI") ? 0 : 0;
        ctx.font = "600 26px " + SANS;
        var ow = ctx.measureText("OsAI").width, gap = 12, totalW = lw + gap + ow;
        var startX = W / 2 - totalW / 2;
        ctx.drawImage(logo, startX, 1238, lw, lh);
        ctx.textAlign = "left"; ctx.fillStyle = P.grau;
        ctx.fillText("OsAI", startX + lw + gap, 1238 + lh / 2 + 9);
        ctx.textAlign = "center";
      }
      progress(ctx, 6, false);
    },
    /* Slide 7 nur LinkedIn-PDF — reine CTA */
    7: function (ctx, d, logo) {
      paper(ctx, W, H, true);
      wrapDraw(ctx, "Jede Antwort formt einen anderen Kreis.", W / 2, 560, 860, 78, "600 58px " + SERIF, P.paper, "center");
      ensoStroke(ctx, W / 2, 880, 110, 14, P.accent, 0.9, true);
      ctx.fillStyle = P.paper; ctx.font = "600 34px " + SANS; ctx.textAlign = "center";
      ctx.fillText("ikigai.demo.osai.solutions", W / 2, 1110);
      if (logo) {
        var lw = 48, lh = lw * (logo.height / logo.width);
        ctx.drawImage(logo, W / 2 - 70, 1160, lw, lh);
        ctx.textAlign = "left"; ctx.fillStyle = A.hexA(P.paper, 0.7); ctx.font = "600 28px " + SANS;
        ctx.fillText("OsAI", W / 2 - 12, 1160 + lh / 2 + 10); ctx.textAlign = "center";
      }
    }
  };

  /* Eine Slide in ein Canvas rendern */
  function renderSlide(canvas, n, erg, ctx2, logo, format) {
    var w = W, h = format === "story" ? 1920 : H;
    canvas.width = w; canvas.height = h;
    var ctx = canvas.getContext("2d");
    var d = content(erg, ctx2);
    if (format === "story") {
      /* Story-Crop: Slide auf 1080×1350 zeichnen, dann mittig in 1080×1920 betten */
      var tmp = document.createElement("canvas"); tmp.width = W; tmp.height = H;
      var tctx = tmp.getContext("2d");
      var dark = (n === 3);
      paper(tctx, W, H, dark);
      SUPPRESS_PAGINATION = true;
      try { SLIDES[n](tctx, d, logo); } finally { SUPPRESS_PAGINATION = false; }
      paper(ctx, w, h, dark);
      ctx.drawImage(tmp, 0, (h - H) / 2);
    } else {
      SLIDES[n](ctx, d, logo);
    }
  }

  /* ---------- minimaler ZIP-Writer (store, kein deflate) ---------- */
  function crc32(buf) {
    var c, table = crc32.t || (crc32.t = (function () {
      var t = [];
      for (var n = 0; n < 256; n++) { c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
      return t;
    })());
    var crc = 0xFFFFFFFF;
    for (var i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  function zip(files) { /* files: [{name, data:Uint8Array}] */
    var enc = new TextEncoder(), parts = [], central = [], offset = 0;
    function u16(n) { return [n & 255, (n >> 8) & 255]; }
    function u32(n) { return [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >> 24) & 255]; }
    files.forEach(function (f) {
      var name = enc.encode(f.name), crc = crc32(f.data), sz = f.data.length;
      var local = [].concat([0x50, 0x4b, 0x03, 0x04], u16(20), u16(0), u16(0), u16(0), u16(0),
        u32(crc), u32(sz), u32(sz), u16(name.length), u16(0));
      parts.push(new Uint8Array(local), name, f.data);
      central.push({ name: name, crc: crc, sz: sz, off: offset });
      offset += local.length + name.length + sz;
    });
    var cstart = offset, cdir = [];
    central.forEach(function (c) {
      var h = [].concat([0x50, 0x4b, 0x01, 0x02], u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
        u32(c.crc), u32(c.sz), u32(c.sz), u16(c.name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(c.off));
      cdir.push(new Uint8Array(h), c.name); offset += h.length + c.name.length;
    });
    var end = new Uint8Array([].concat([0x50, 0x4b, 0x05, 0x06], u16(0), u16(0),
      u16(files.length), u16(files.length), u32(offset - cstart), u32(cstart), u16(0)));
    return new Blob(parts.concat(cdir, [end]), { type: "application/zip" });
  }

  function canvasToBytes(canvas) {
    return new Promise(function (resolve) {
      canvas.toBlob(function (b) { b.arrayBuffer().then(function (ab) { resolve(new Uint8Array(ab)); }); }, "image/png");
    });
  }

  window.IKIGAI_CAROUSEL = {
    renderSlide: renderSlide,
    /* Slide 3 (der Satz) = Default-Einzel-Share, plus Story-Crop. Gibt Promise zurück. */
    renderShareInto: function (canvas, erg, ctx2, format) {
      return loadLogo().then(function (logo) {
        return document.fonts.ready.then(function () {
          renderSlide(canvas, 3, erg, ctx2, logo, format === "story" ? "story" : "card");
        });
      });
    },
    downloadZip: function (erg, ctx2, btn) {
      if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = "Karussell wird gebaut …"; }
      loadLogo().then(function (logo) {
        return document.fonts.ready.then(function () {
          var name = (ctx2.profil && ctx2.profil.name || "").trim().toLowerCase().replace(/[^a-zäöüß]/g, "") || "ikigai";
          var slidePngs = [];
          /* 6 IG-Slides */
          var jobs = [];
          for (var i = 1; i <= 6; i++) {
            (function (n) {
              var c = document.createElement("canvas");
              renderSlide(c, n, erg, ctx2, logo, "card");
              jobs.push(canvasToBytes(c).then(function (b) { slidePngs[n - 1] = b; }));
            })(i);
          }
          /* 1 Story-Crop (Slide 3) */
          var storyC = document.createElement("canvas");
          renderSlide(storyC, 3, erg, ctx2, logo, "story");
          var storyBytes;
          jobs.push(canvasToBytes(storyC).then(function (b) { storyBytes = b; }));
          return Promise.all(jobs).then(function () {
            var files = [];
            slidePngs.forEach(function (b, i) { files.push({ name: "ikigai-slide-" + (i + 1) + ".png", data: b }); });
            files.push({ name: "ikigai-story.png", data: storyBytes });
            /* LinkedIn-PDF aus den 6 Slides + CTA-Slide 7 via jsPDF (bündelt PNGs) */
            return buildLinkedInPdf(erg, ctx2, logo, slidePngs).then(function (pdfBytes) {
              if (pdfBytes) files.push({ name: "ikigai-linkedin.pdf", data: pdfBytes });
              var blob = zip(files);
              var a = document.createElement("a");
              a.href = URL.createObjectURL(blob); a.download = "ikigai-karussell-" + name + ".zip";
              document.body.appendChild(a); a.click(); a.remove();
              setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
            });
          });
        });
      }).catch(function (e) {
        console.error("carousel-zip-error", e);
        alert("Das Karussell konnte gerade nicht gebaut werden — bitte noch einmal versuchen.");
      }).finally(function () {
        if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || "Als Karussell teilen (ZIP)"; }
      });
    }
  };

  /* jsPDF lazy laden (geteilt mit pdf.js, aber eigenständig) */
  var jspdfPromise = null;
  function loadJsPDF() {
    if (window.jspdf) return Promise.resolve();
    if (jspdfPromise) return jspdfPromise;
    jspdfPromise = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = "assets/vendor/jspdf.umd.min.js";
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
    return jspdfPromise;
  }

  /* LinkedIn-PDF: 4:5-Seiten, je eine Slide als Bild (echtes Swipe-Dokument).
   * Slide 7 wird frisch gerendert (nur fürs PDF, nicht auf IG). */
  function buildLinkedInPdf(erg, ctx2, logo, slidePngs) {
    return doPdf();
    function doPdf() {
      return loadJsPDF().then(function () {
        if (!window.jspdf) return null;
        var jsPDF = window.jspdf.jsPDF;
        /* 4:5 → 240×300 mm Seiten */
        var pw = 240, ph = 300;
        var doc = new jsPDF({ unit: "mm", format: [pw, ph], compress: true });
        function addImg(bytes, first) {
          if (!first) doc.addPage([pw, ph], "portrait");
          var url = bytesToDataUrl(bytes);
          doc.addImage(url, "PNG", 0, 0, pw, ph, undefined, "FAST");
        }
        slidePngs.forEach(function (b, i) { addImg(b, i === 0); });
        /* CTA-Slide 7 */
        var c7 = document.createElement("canvas");
        window.IKIGAI_CAROUSEL.renderSlide(c7, 7, erg, ctx2, logo, "card");
        var url7 = c7.toDataURL("image/png");
        doc.addPage([pw, ph], "portrait");
        doc.addImage(url7, "PNG", 0, 0, pw, ph, undefined, "FAST");
        var ab = doc.output("arraybuffer");
        return new Uint8Array(ab);
      });
    }
  }
  function bytesToDataUrl(bytes) {
    var bin = ""; for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return "data:image/png;base64," + btoa(bin);
  }
})();
