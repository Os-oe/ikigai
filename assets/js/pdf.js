/* PDF-Report — Premium-Workbook. Hybrid: jsPDF-Vektor-Text (Shippori Mincho
 * eingebettet, selektierbar, < 1 MB) + wenige wiederverwendete Canvas-Kunstebenen
 * (Washi-Textur als JPEG, Hanko als PNG, Venn als hochauflösendes Canvas-Bild).
 * Editorial/Ma: asymmetrischer Satzspiegel, 3-Stimmen-Typo, Haarlinien, Hashira-
 * Marginalie, Kintsugi-Faden, Mon-Signet-Fußzeile. Keine halbleeren Seiten.
 * jsPDF + Fonts lazy beim ersten Klick (Erst-Load unberührt). */
(function () {
  "use strict";

  var A = window.IKIGAI_ART, P = A.P;
  function rgb(hex) { var n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  var PAPER = rgb(P.paper), INK = rgb(P.sumi), SOFT = rgb(P.ink || "#5b5347"),
      FAINT = rgb(P.grau), ACCENT = rgb(P.accent), LINE = rgb(P.line), GOLD = rgb(P.markt);
  SOFT = [91, 83, 71];
  var PW = 210, PH = 297;
  /* asymmetrischer Satzspiegel: außen/oben großzügig, innen knapper */
  var MX = 30, MX_IN = 22, MTOP = 32, MBOT = 28;

  /* ---------- lazy Vendor + Fonts ---------- */
  var vendorPromise = null;
  function loadVendor() {
    if (window.jspdf && window.IKIGAI_PDF_FONTS) return Promise.resolve();
    if (vendorPromise) return vendorPromise;
    function loadScript(src) {
      return new Promise(function (res, rej) {
        var s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    var jobs = [];
    if (!window.jspdf) jobs.push(loadScript("assets/vendor/jspdf.umd.min.js"));
    if (!window.IKIGAI_PDF_FONTS) jobs.push(loadScript("assets/vendor/shippori-pdf-fonts.js"));
    vendorPromise = Promise.all(jobs);
    return vendorPromise;
  }

  function logoDataUrl() {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        var c = document.createElement("canvas");
        c.width = img.width; c.height = img.height;
        c.getContext("2d").drawImage(img, 0, 0);
        resolve({ url: c.toDataURL("image/png"), ratio: img.height / img.width });
      };
      img.onerror = function () { resolve(null); };
      img.src = "assets/img/logo-mark.png";
    });
  }

  /* ---------- Canvas-Kunstebenen (wenige, wiederverwendet) ---------- */
  /* Washi-Textur als EINE JPEG-Kachel (PNG würde Noise katastrophal aufblähen) */
  var washiCache = null;
  function washiDataUrl() {
    if (washiCache) return washiCache;
    var w = 760, h = 1074; // ~A4-Verhältnis, moderate Auflösung
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    var ctx = c.getContext("2d");
    ctx.fillStyle = P.paper; ctx.fillRect(0, 0, w, h);
    /* warmer Lichtverlauf oben rechts */
    var g = ctx.createRadialGradient(w * 0.8, h * 0.06, w * 0.05, w * 0.5, h * 0.4, h * 0.9);
    g.addColorStop(0, "rgba(255,251,243,0.55)"); g.addColorStop(1, "rgba(150,132,102,0.06)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    /* feine Faser (horizontale Striche) + Korn */
    ctx.globalAlpha = 0.04; ctx.strokeStyle = "#6b6052";
    for (var i = 0; i < 420; i++) {
      var y = Math.random() * h, x = Math.random() * w, len = 6 + Math.random() * 40;
      ctx.lineWidth = Math.random() < 0.5 ? 0.5 : 1;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y + (Math.random() - 0.5) * 2); ctx.stroke();
    }
    ctx.globalAlpha = 0.05;
    for (var k = 0; k < 2600; k++) {
      ctx.fillStyle = Math.random() < 0.5 ? "#5a5044" : "#fffdf8";
      ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
    }
    ctx.globalAlpha = 1;
    washiCache = c.toDataURL("image/jpeg", 0.82);
    return washiCache;
  }

  /* Hanko-Siegel (rundlicher Blob mit Stempel-Unregelmäßigkeit) als kleines PNG */
  function hankoDataUrl(initials) {
    var s = 240, c = document.createElement("canvas"); c.width = s; c.height = s;
    var ctx = c.getContext("2d");
    var rand = A.rng("hanko-" + initials);
    /* blobiger Stempel */
    var n = 10, pts = [], cx = s / 2, cy = s / 2, r = s * 0.4;
    for (var i = 0; i < n; i++) {
      var ang = (i / n) * Math.PI * 2;
      var rr = r * (1 + (rand() * 2 - 1) * 0.05);
      pts.push([cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr]);
    }
    ctx.beginPath();
    for (var j = 0; j < n; j++) {
      var p0 = pts[(j - 1 + n) % n], p1 = pts[j], p2 = pts[(j + 1) % n], p3 = pts[(j + 2) % n];
      if (j === 0) ctx.moveTo(p1[0], p1[1]);
      ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
        p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
    }
    ctx.closePath();
    ctx.fillStyle = P.accent; ctx.fill();
    /* Stempel-Lücken (ungleichmäßige Deckung) */
    ctx.globalCompositeOperation = "destination-out";
    for (var g2 = 0; g2 < 60; g2++) {
      ctx.globalAlpha = 0.06 + rand() * 0.12;
      ctx.beginPath(); ctx.arc(rand() * s, rand() * s, 2 + rand() * 6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    /* Initialen negativ */
    ctx.fillStyle = P.paper; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "700 " + Math.round(s * 0.34) + "px Inter, sans-serif";
    ctx.fillText(String(initials), cx, cy + s * 0.02);
    return c.toDataURL("image/png");
  }

  /* Venn als hochauflösendes Canvas-Bild (nur Diagramm, ohne Satz — Satz steht im PDF als Text) */
  function vennDataUrl(erg, name) {
    var c = document.createElement("canvas");
    c.width = 1300; c.height = 1300;
    var ctx = c.getContext("2d");
    ctx.fillStyle = P.paper; ctx.fillRect(0, 0, 1300, 1300);
    window.IKIGAI_DRAW_DIAGRAM(ctx, erg, 650, 640, 1180, { name: name });
    return c.toDataURL("image/png");
  }

  /* großer Cover-Ensō (variable Breite, Faserkante) als PNG mit Transparenz */
  function ensoDataUrl(opts) {
    opts = opts || {};
    var s = 560, c = document.createElement("canvas"); c.width = s; c.height = s;
    var ctx = c.getContext("2d");
    var rand = A.rng(opts.seed || "enso");
    var cx = s / 2, cy = s / 2, r = s * 0.38, steps = 80;
    var start = -0.5 * Math.PI, sweep = Math.PI * 2 * (1 - (opts.gap || 0.3));
    ctx.fillStyle = A.hexA(opts.color || P.sumi, opts.alpha == null ? 0.9 : opts.alpha);
    var outer = [], inner = [];
    for (var i = 0; i <= steps; i++) {
      var t = i / steps, ang = start + sweep * t;
      var taper = Math.sin(Math.PI * t), wob = 1 + (rand() * 2 - 1) * 0.2;
      var w = r * 0.08 * (0.35 + 0.95 * taper) * wob;
      var rr = r * (1 + (rand() * 2 - 1) * 0.02);
      outer.push([cx + Math.cos(ang) * (rr + w), cy + Math.sin(ang) * (rr + w)]);
      inner.push([cx + Math.cos(ang) * (rr - w), cy + Math.sin(ang) * (rr - w)]);
    }
    ctx.beginPath(); ctx.moveTo(outer[0][0], outer[0][1]);
    for (var a = 1; a < outer.length; a++) ctx.lineTo(outer[a][0], outer[a][1]);
    for (var b = inner.length - 1; b >= 0; b--) ctx.lineTo(inner[b][0], inner[b][1]);
    ctx.closePath(); ctx.fill();
    return c.toDataURL("image/png");
  }

  /* ---------- Doc-Helfer ---------- */
  function Doc(jsPDF, fonts) {
    this.doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
    var d = this.doc;
    /* Mincho einbetten */
    d.addFileToVFS("Mincho-Regular.ttf", fonts.mincho500);
    d.addFont("Mincho-Regular.ttf", "Mincho", "normal");
    d.addFileToVFS("Mincho-Bold.ttf", fonts.mincho700);
    d.addFont("Mincho-Bold.ttf", "Mincho", "bold");
    this.washi = washiDataUrl();
    this.page = 1;
    this.y = MTOP;
    this.dims = null;   // 4 Scores fürs Mon-Signet (gesetzt in build)
    this.bg();
  }
  Doc.prototype.bg = function () {
    this.doc.addImage(this.washi, "JPEG", 0, 0, PW, PH, undefined, "FAST");
    /* Kintsugi-Faden: feine Goldlinie an der Außenkante, je Seite alternierend oben/unten */
    var d = this.doc;
    d.setDrawColor(GOLD[0], GOLD[1], GOLD[2]); d.setLineWidth(0.35);
    if (this.page % 2 === 1) d.line(PW - 12, 0, PW - 12, 80);
    else d.line(12, PH - 80, 12, PH);
  };
  Doc.prototype.hashira = function () {
    var d = this.doc;
    d.setFont("helvetica", "normal"); d.setFontSize(6.5);
    d.setTextColor(FAINT[0], FAINT[1], FAINT[2]);
    /* ganz nach außen in den Margin (x = PW-4): die rotierte Marginalie kollidierte
     * sonst mit dem rechten Rand langer Fließtext-/Zitat-Zeilen (Review-P2-A,
     * S2/S8/S10). Der Body-Satzspiegel endet jetzt garantiert links davon. */
    d.text("ikigAI · Persönlicher Report · 2026", PW - 4, PH / 2, { angle: 90, align: "center", charSpace: 0.4 });
  };
  /* rechte Grenze des Body-Satzspiegels: lässt einen sicheren Gutter zur Hashira-
   * Marginalie. Alle width-basierten Helfer clampen hierauf. */
  var BODY_RIGHT = PW - 16;   /* = 194 mm — Hashira-Glyphe sitzt bei ~199-203 */
  Doc.prototype.monSignet = function () {
    /* kleines rundes Wappen aus den 4 Dimensions-Scores (4 Bogen, Dicke = Score) */
    var d = this.doc, cx = MX, cy = PH - MBOT + 6, r = 4.2;
    var dims = this.dims || { liebe: 1, staerke: 1, welt: 1, markt: 1 };
    var keys = ["liebe", "staerke", "welt", "markt"];
    var cols = [P.liebe, P.staerke, P.welt, P.markt];
    keys.forEach(function (k, i) {
      var a0 = -Math.PI / 2 + i * Math.PI / 2 + 0.08, a1 = a0 + Math.PI / 2 - 0.16;
      var lw = 0.5 + (dims[k] || 0) / 9 * 1.6;
      d.setDrawColor.apply(d, rgb(cols[i])); d.setLineWidth(lw);
      /* Bogen über Polylinie nähern */
      var pts = [];
      for (var t = 0; t <= 8; t++) { var a = a0 + (a1 - a0) * t / 8; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
      for (var p = 1; p < pts.length; p++) d.line(pts[p - 1][0], pts[p - 1][1], pts[p][0], pts[p][1]);
    });
  };
  Doc.prototype.footer = function () {
    this.hashira();
    this.monSignet();
    var d = this.doc;
    d.setFont("helvetica", "normal"); d.setFontSize(7);
    d.setTextColor(FAINT[0], FAINT[1], FAINT[2]);
    d.text(String(this.page), PW - MX, PH - MBOT + 7, { align: "right" });
  };
  Doc.prototype.newPage = function () {
    this.footer();
    this.doc.addPage();
    this.page++;
    this.bg();
    this.y = MTOP;
  };
  Doc.prototype.need = function (h, bottom) {
    if (this.y + h > (bottom || (PH - MBOT - 4))) this.newPage();
  };
  /* Haarlinie — kurz (20–30 mm), nie volle Breite, Text nicht berührend */
  Doc.prototype.hairline = function (len) {
    var d = this.doc;
    d.setDrawColor(LINE[0], LINE[1], LINE[2]); d.setLineWidth(0.25);
    d.line(MX, this.y, MX + (len || 24), this.y);
    this.y += 5;
  };
  /* Marginalie/Label — 6.5–7.5 pt, gesperrt, Versalien, Ginnezumi */
  Doc.prototype.label = function (t) {
    var d = this.doc;
    d.setFont("helvetica", "bold"); d.setFontSize(7);
    d.setTextColor(FAINT[0], FAINT[1], FAINT[2]);
    d.text(t.toUpperCase(), MX, this.y, { charSpace: 0.7 });
    this.y += 6;
  };
  /* Display — 22–34 pt Mincho, 1–3 Wörter. Baseline-korrekt: y rückt erst um
   * die Versalhöhe nach unten, sonst läuft die Schrift in das Label darüber. */
  Doc.prototype.display = function (t, size) {
    var d = this.doc; size = size || 26;
    d.setFont("Mincho", "bold"); d.setFontSize(size);
    d.setTextColor(INK[0], INK[1], INK[2]);
    var lines = d.splitTextToSize(t, PW - MX - MX_IN);
    var lh = size * 0.42;
    this.y += size * 0.34;                 /* Versalhöhe als Vorlauf */
    d.text(lines, MX, this.y);
    this.y += (lines.length - 1) * lh + size * 0.14 + 3;
  };
  /* Lauftext — 9.5–10.5 pt, schmale Satzbreite */
  Doc.prototype.body = function (t, opts) {
    opts = opts || {};
    var d = this.doc;
    d.setFont(opts.font || "helvetica", opts.style || "normal");
    var size = opts.size || 10;
    d.setFontSize(size);
    var col = opts.color || SOFT;
    d.setTextColor(col[0], col[1], col[2]);
    var x = opts.x || MX;
    var w = opts.width || 100; /* schmale Satzbreite ~55-65 Zeichen */
    /* harte Clamp auf den Body-Satzspiegel: kein Überlauf in die Hashira (P2-A) */
    if (x + w > BODY_RIGHT) w = BODY_RIGHT - x;
    var lines = d.splitTextToSize(t, w);
    var lh = size * 0.5 * (opts.lh || 1.0);
    this.need(lines.length * lh + (opts.after == null ? 4 : opts.after));
    d.text(lines, x, this.y);
    this.y += lines.length * lh + (opts.after == null ? 4 : opts.after);
    return lines.length * lh;
  };
  function measure(d, t, font, style, size, w) {
    d.setFont(font, style); d.setFontSize(size);
    return d.splitTextToSize(t, w).length * size * 0.5;
  }

  /* ---------- Aufbau ---------- */
  function build(jsPDF, fonts, erg, ctx, logo) {
    var D = new Doc(jsPDF, fonts), d = D.doc;
    var name = (ctx.profil && ctx.profil.name || "").trim();
    var inits = A.initials(name);
    var F = window.IKIGAI_FRAGEN;
    var hanko = hankoDataUrl(inits);

    /* Scores fürs Mon-Signet aus den 4 Venn-Dimensionen (Anzahl Begriffe als Proxy → konstant) */
    D.dims = { liebe: 7, staerke: 7, welt: 7, markt: 7 };

    /* ════════ S1 · Cover — Hinomaru-Logik, ~70 % Ma ════════ */
    /* Ensō leicht aus der Mitte */
    var ec = 58, ecx = PW * 0.56, ecy = 120;
    d.addImage(ensoDataUrl({ seed: name || "ikigai", color: P.sumi, alpha: 0.88, gap: 0.3 }), "PNG", ecx - ec / 2, ecy - ec / 2, ec, ec);
    /* Geister-Kreis oben rechts, angeschnitten */
    d.addImage(ensoDataUrl({ seed: "ghost", color: P.markt, alpha: 0.08, gap: 0.25 }), "PNG", PW - 30, -25, 70, 70);
    /* Titel-Marginalie oberes Drittel, linksbündig */
    d.setFont("helvetica", "bold"); d.setFontSize(7); d.setTextColor(FAINT[0], FAINT[1], FAINT[2]);
    d.text("DER IKIGAI-REPORT", MX, 44, { charSpace: 0.9 });
    d.setFont("helvetica", "normal"); d.setFontSize(7.5);
    d.text(new Date().toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" }), MX, 50);
    /* Name GROSS in Mincho, im Ensō-Bereich */
    d.setFont("Mincho", "bold"); d.setFontSize(34); d.setTextColor(INK[0], INK[1], INK[2]);
    var titel = name ? name + "s" : "Dein";
    d.text(titel, MX, 168);
    d.text("Ikigai", MX, 184);
    /* Untertitel */
    d.setFont("Mincho", "normal"); d.setFontSize(11); d.setTextColor(SOFT[0], SOFT[1], SOFT[2]);
    d.text("Zwei Ebenen. Ein Bild. Dein Satz.", MX, 198);
    /* Logo unten links + Datum */
    if (logo) {
      var lw = 9, lh = lw * logo.ratio;
      d.addImage(logo.url, "PNG", MX, PH - 42, lw, lh);
      d.setFont("helvetica", "normal"); d.setFontSize(7.5); d.setTextColor(FAINT[0], FAINT[1], FAINT[2]);
      d.text("ikigAI — der Ikigai-Generator von OsAI", MX + lw + 4, PH - 42 + lh / 2 + 1.5);
    }
    /* Hanko unten rechts, leicht gedreht */
    d.addImage(hanko, "PNG", PW - MX - 18, PH - 44, 18, 18);
    D.footer();

    /* ════════ S2 · Der Satz — ~80 % Ma ════════ */
    D.newPage();
    /* blasser Ensō dahinter */
    d.addImage(ensoDataUrl({ seed: "satz", color: P.sumi, alpha: 0.07, gap: 0.3 }), "PNG", PW / 2 - 55, 90, 110, 110);
    D.y = 70;
    D.label("Dein Ikigai in einem Satz");
    D.y = 120;
    /* vertikale Haarlinie neben dem Satz */
    d.setDrawColor(ACCENT[0], ACCENT[1], ACCENT[2]); d.setLineWidth(1.1);
    d.line(MX, 118, MX, 118 + 70);
    /* Satz wie Gedicht: Umbruch nach Sinneinheiten, dann width-clamp gegen Überlauf.
     * Satzgröße nach Länge staffeln, damit lange Sätze nicht über den Rand laufen. */
    var satz = "„" + erg.zentrum + "“";
    var satzSize = erg.zentrum.length > 95 ? 17 : (erg.zentrum.length > 70 ? 19 : 22);
    var poemW = PW - (MX + 8) - MX_IN;            /* nutzbare Breite ab Texteinzug */
    d.setFont("Mincho", "bold"); d.setFontSize(satzSize); d.setTextColor(INK[0], INK[1], INK[2]);
    var poem = poemBreak(d, satz, poemW);
    var poemLh = satzSize * 0.62;
    poem.forEach(function (ln, i) { d.text(ln, MX + 8, 132 + i * poemLh); });
    D.footer();

    /* ════════ S3 · Venn ganzseitig — ~50 % Ma ════════ */
    D.newPage();
    D.y = MTOP;
    D.label("Dein Ikigai-Bild");
    D.display("Vier Kreise, deine vier.", 24);
    D.y += 2;
    /* Venn leicht aus der Mitte (Spalten 6–11 → rechts) */
    var vs = 130, vx = (PW - vs) / 2 + 8, vy = D.y;
    d.addImage(vennDataUrl(erg, name), "PNG", vx, vy, vs, vs);
    D.y = vy + vs + 4;
    D.body("Vier Lasuren, übereinandergelegt: Akabeni (was du liebst), Ruri (worin du gut bist), Byakuroku (was die Welt braucht), Kincha (wofür man dich bezahlt). Wo alle vier sich treffen, sitzt dein Siegel.",
      { size: 8.5, color: FAINT, width: 150 });
    D.footer();

    /* ════════ S4–S7 · je EINE Dimension ════════ */
    /* tintAlpha pro Pigment: ein einheitliches 0.16 ließ den DUNKLEN Ruri-Blau-Kreis
     * (S5 „Können“) über dem warmen Washi fast neutral-grau erscheinen (Review-P2.1:
     * Hue kippte auf den Papier-Ton, Sättigung ~1 %). Dunkle, niedrig-luminante
     * Pigmente brauchen mehr Deckung, um als Lasur zu LESEN. Warme/helle Pigmente
     * (Akabeni/Kincha/Byakuroku) bleiben bei 0.16 — sie tönen dort schon klar. */
    var DIMS = [
      { key: "liebe", wort: "Lieben", farbe: P.liebe, name: "Akabeni — Rotlack", block: "A", zitatKey: "a1", tintAlpha: 0.16 },
      { key: "staerke", wort: "Können", farbe: P.staerke, name: "Ruri — Lapislazuli", block: "B", zitatKey: "b1", tintAlpha: 0.34 },
      { key: "welt", wort: "Wirken", farbe: P.welt, name: "Byakuroku — Grünspan", block: "C", zitatKey: "c1", tintAlpha: 0.20 },
      { key: "markt", wort: "Wert", farbe: P.markt, name: "Kincha — Goldbraun", block: "D", zitatKey: "d1", tintAlpha: 0.16 }
    ];
    var kreisTexte = dimensionTexte(erg);
    DIMS.forEach(function (dim, di) {
      D.newPage();
      /* Vollkomposition statt halbleerer Seite (AUDIT #1):
       * großer Lasur-Blob füllt die untere Bildhälfte, riesiger Kanji-Wasserzeichen,
       * Inhalt sitzt mittig-oben — die Seite ist als Bühne bewusst komponiert. */
      var rand = A.rng(dim.key + "-pdf");
      var tA = dim.tintAlpha == null ? 0.16 : dim.tintAlpha;
      /* großer halbtransparenter Blob unten rechts (Bildgewicht) — Deckung pro Pigment */
      drawBlob(d, PW * 0.74, PH * 0.66, 52, A.rng(dim.key + "-big"), dim.farbe, tA);
      /* Kanji-Wasserzeichen groß, sehr blass — dunkle Pigmente etwas kräftiger,
       * damit das Wasserzeichen auf der Blau-Seite nicht ebenfalls verschwindet. */
      d.setFont("Mincho", "normal"); d.setFontSize(150);
      d.setTextColor.apply(d, rgb(dim.farbe));
      var kanjiOp = Math.min(0.16, 0.10 + (tA - 0.16) * 0.4);
      if (d.GState && d.setGState) { try { d.setGState(new d.GState({ opacity: kanjiOp })); } catch (e) {} }
      d.text(A.KANJI[dim.key], PW * 0.62, PH * 0.5);
      if (d.setGState) { try { d.setGState(new d.GState({ opacity: 1 })); } catch (e) {} }

      D.y = 64;
      D.label("Kreis " + (di + 1) + " von 4");
      D.y += 4;
      d.setFont("Mincho", "bold"); d.setFontSize(40); d.setTextColor(INK[0], INK[1], INK[2]);
      d.text(dim.wort, MX, D.y + 12); D.y += 20;
      d.setFont("helvetica", "normal"); d.setFontSize(7); d.setTextColor(FAINT[0], FAINT[1], FAINT[2]);
      d.text(dim.name.toUpperCase(), MX, D.y, { charSpace: 0.6 }); D.y += 12;
      /* Begriffe */
      var terms = (erg.kreise && erg.kreise[dim.key] || []).join(" · ");
      d.setFont("Mincho", "normal"); d.setFontSize(14); d.setTextColor.apply(d, rgb(dim.farbe));
      d.text(d.splitTextToSize(terms, 110), MX, D.y); D.y += 13;
      D.hairline(24); D.y += 2;
      /* 2 kurze Absätze */
      kreisTexte[dim.key].forEach(function (p) {
        D.body(p, { size: 10.5, color: SOFT, width: 100, lh: 1.1, after: 6 });
      });
      /* wörtliches User-Zitat im roten Zitat-Block (3-4 mm Block links) */
      var zitat = pickZitat(erg, ctx, dim);
      if (zitat) {
        D.y += 4;
        var zw = 98;
        var zh = measure(d, "„" + zitat + "“", "Mincho", "normal", 12, zw - 6) + 4;
        d.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
        d.rect(MX, D.y - 4, 3.5, zh, "F"); /* 3-4 mm Siegelrot-Block */
        D.body("„" + zitat + "“", { font: "Mincho", style: "normal", size: 12, color: INK, x: MX + 7, width: zw - 6, after: 4 });
      }
      D.footer();
    });

    /* ════════ S8 · Synthese + Score + nächste Schritte ════════ */
    D.newPage();
    D.y = MTOP;
    D.label("Standortbestimmung");
    D.display("Wo du gerade stehst", 24);
    /* Score als gezeichneter Ring (nicht nackte Zahl) */
    var vals = (ctx.ikigai9 || []).map(function (v) { return v || 0; });
    var sum = vals.reduce(function (a, b) { return a + b; }, 0);
    var band = F.scoreBands.filter(function (b) { return sum >= b.min && sum <= b.max; })[0] || F.scoreBands[1];
    var dimScore = { e: 0, z: 0, b: 0 };
    F.ikigai9.forEach(function (item, i) { dimScore[item.dim] += vals[i]; });
    var ringX = MX + 16, ringY = D.y + 16, ringR = 14;
    /* Track */
    d.setDrawColor(LINE[0], LINE[1], LINE[2]); d.setLineWidth(2.6);
    arc(d, ringX, ringY, ringR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2);
    /* Fill (Anteil) in Siegelrot */
    d.setDrawColor(ACCENT[0], ACCENT[1], ACCENT[2]); d.setLineWidth(2.6);
    arc(d, ringX, ringY, ringR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (sum / 45));
    d.setFont("Mincho", "bold"); d.setFontSize(15); d.setTextColor(INK[0], INK[1], INK[2]);
    d.text(String(sum), ringX, ringY + 1, { align: "center" });
    d.setFont("helvetica", "normal"); d.setFontSize(6); d.setTextColor(FAINT[0], FAINT[1], FAINT[2]);
    d.text("von 45", ringX, ringY + 5, { align: "center" });
    /* Einordnung als Satz mit Bedeutung */
    d.setFont("helvetica", "bold"); d.setFontSize(10); d.setTextColor(INK[0], INK[1], INK[2]);
    d.text(band.label, ringX + 22, D.y + 6);
    d.setFont("helvetica", "normal"); d.setFontSize(8.5); d.setTextColor(SOFT[0], SOFT[1], SOFT[2]);
    d.text(d.splitTextToSize(band.text, PW - (ringX + 22) - MX_IN), ringX + 22, D.y + 11);
    D.y = ringY + ringR + 10;
    d.setFont("helvetica", "normal"); d.setFontSize(8); d.setTextColor(FAINT[0], FAINT[1], FAINT[2]);
    d.text("Lebensgefühl " + dimScore.e + "/15   ·   Blick nach vorn " + dimScore.z + "/15   ·   Eigene Bedeutung " + dimScore.b + "/15", MX, D.y);
    D.y += 7;
    if (erg.score_kommentar) D.body(erg.score_kommentar, { size: 9, width: 150, after: 5 });

    /* Alltags-Ebene als 2×2-Karten (wie Web) */
    D.need(70);
    D.hairline(24);
    D.label("Ebene 2 · Die japanische Alltags-Ebene");
    D.display("Dein Ikigai im Kleinen", 18);
    var alltag = (erg.alltag || []).slice(0, 4);
    var cardW = (PW - MX - MX_IN - 6) / 2, cardH = 30;
    var startY = D.y;
    alltag.forEach(function (a, i) {
      var col = i % 2, row = Math.floor(i / 2);
      var cxp = MX + col * (cardW + 6), cyp = startY + row * (cardH + 5);
      var s = F.saeulen[(a.saeule || 1) - 1] || F.saeulen[0];
      d.setDrawColor(LINE[0], LINE[1], LINE[2]); d.setFillColor(248, 241, 228);
      d.roundedRect(cxp, cyp, cardW, cardH, 2, 2, "FD");
      d.setFont("helvetica", "bold"); d.setFontSize(6); d.setTextColor(FAINT[0], FAINT[1], FAINT[2]);
      d.text("SÄULE " + s.nr + " · " + s.name.toUpperCase(), cxp + 3, cyp + 5, { charSpace: 0.3 });
      d.setFont("Mincho", "normal"); d.setFontSize(8.5); d.setTextColor(INK[0], INK[1], INK[2]);
      var ml = d.splitTextToSize("„" + a.moment + "“", cardW - 6);
      d.text(ml.slice(0, 3), cxp + 3, cyp + 11);
    });
    D.y = startY + Math.ceil(alltag.length / 2) * (cardH + 5) + 4;
    D.footer();

    /* ════════ S9 · Nächste Schritte + Kaizen-Plan (eine volle Seite) ════════ */
    D.newPage();
    D.y = 30;
    D.label("Deine nächsten drei Schritte");
    D.y += 2;
    (erg.ideen || []).slice(0, 3).forEach(function (idee, i) {
      d.setFont("Mincho", "bold"); d.setFontSize(11); d.setTextColor.apply(d, ACCENT);
      d.text(String(i + 1), MX, D.y);
      d.setFont("Mincho", "bold"); d.setFontSize(10); d.setTextColor(INK[0], INK[1], INK[2]);
      d.text(d.splitTextToSize(idee.titel, PW - MX - MX_IN - 8), MX + 7, D.y);
      D.y += 4.6;
      D.body("Erster Schritt: " + idee.erster_schritt, { size: 8, color: SOFT, x: MX + 7, width: 142, lh: 0.95, after: 3.5 });
    });
    D.y += 2;
    D.hairline(24);
    D.label("Dein 30-Tage-Kaizen-Plan");
    D.body("Links dein Schritt, rechts wie dir KI dabei konkret hilft. Kaizen heißt: klein, aber konsequent.", { size: 8, width: 150, after: 4 });
    var colW = (PW - MX - MX_IN - 6) / 2;
    (erg.kaizen || []).forEach(function (wk) {
      d.setFont("helvetica", "bold"); d.setFontSize(7.5); d.setTextColor.apply(d, ACCENT);
      d.text("WOCHE " + wk.woche, MX, D.y);
      d.setFont("Mincho", "bold"); d.setFontSize(10.5); d.setTextColor(INK[0], INK[1], INK[2]);
      d.text(wk.fokus, MX + 21, D.y);
      D.y += 5;
      (wk.schritte || []).forEach(function (s) {
        var hL = measure(d, s.schritt, "helvetica", "normal", 8, colW - 6);
        var hR = measure(d, s.ki_hilfe, "helvetica", "normal", 7.5, colW - 6) + 3.5;
        var rh = Math.max(hL, hR) + 5.5;
        /* linke Spalte Papier, rechte Spalte Sumi-Tonfläche ~8 % + Akzent-Tick (echter Kontrast) */
        d.setDrawColor(LINE[0], LINE[1], LINE[2]); d.setFillColor(250, 246, 238);
        d.roundedRect(MX, D.y - 4, colW, rh, 2, 2, "FD");
        d.setFillColor(235, 230, 222);
        d.roundedRect(MX + colW + 6, D.y - 4, colW, rh, 2, 2, "F");
        d.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
        d.rect(MX + colW + 6, D.y - 4, 1.5, rh, "F");
        d.setFont("helvetica", "normal"); d.setFontSize(8); d.setTextColor(INK[0], INK[1], INK[2]);
        d.text(d.splitTextToSize(s.schritt, colW - 6), MX + 3, D.y + 1);
        d.setFont("helvetica", "bold"); d.setFontSize(5.5); d.setTextColor.apply(d, ACCENT);
        d.text("SO HILFT DIR KI", MX + colW + 11, D.y, { charSpace: 0.3 });
        d.setFont("helvetica", "normal"); d.setFontSize(7.5); d.setTextColor(SOFT[0], SOFT[1], SOFT[2]);
        d.text(d.splitTextToSize(s.ki_hilfe, colW - 9), MX + colW + 11, D.y + 3.5);
        D.y += rh + 1.6;
      });
      D.y += 3.5;
    });
    D.footer();

    /* ════════ S10 · Die wahre Geschichte (Vollkomposition: Text oben, großer
     * Schluss-Satz als Bühne, blasser Ensō als Bildgewicht unten) ════════ */
    D.newPage();
    /* großer blasser Ensō im unteren Drittel als Bildgewicht (gegen Halbleere) */
    d.addImage(ensoDataUrl({ seed: "story", color: P.sumi, alpha: 0.06, gap: 0.3 }), "PNG", PW * 0.5 - 48, PH * 0.62, 96, 96);
    D.y = 36;
    D.label("Ehrlichkeit statt Mythos");
    D.display("Die wahre Geschichte des Diagramms", 22);
    D.y += 2;
    [
      "Das 4-Kreise-Diagramm stammt nicht aus Japan. 2011 zeichnete der spanische Astrologe Andrés Zuzunaga es als „Propósito“ — ein Purpose-Diagramm ohne Japan-Bezug. 2014 ersetzte der Blogger Marc Winn ein einziges Wort: „Purpose“ wurde „Ikigai“. Das Bild ging viral — in Japan erkennt man darin das eigene Ikigai allerdings nicht wieder.",
      "Das echte Ikigai ist ein Alltagswort: der Morgenkaffee, das Enkelkind, der kleine Blog. Mieko Kamiya beschrieb 1966 den Unterschied zwischen der Quelle des Ikigai und dem Ikigai-Gefühl; Ken Mogi fasst es so: „Ikigai wohnt im Reich der kleinen Dinge.“ Es muss kein Geld bringen, niemand muss darin gut sein, und die Welt muss es nicht brauchen.",
      "Warum zeigen wir das Diagramm trotzdem? Weil es als Karriere-Werkzeug ehrlich nützlich ist — solange man es nicht für japanische Weisheit hält. Deshalb dieser Report mit beiden Ebenen. Und der wichtigste Satz zum Schluss:"
    ].forEach(function (p) { D.body(p, { size: 10, width: 150, lh: 1.1, after: 6 }); });
    D.y += 8;
    /* Schluss-Satz als Bühne: roter Block + großer Mincho-Satz */
    d.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]); d.rect(MX, D.y - 4, 3.5, 13, "F");
    d.setFont("Mincho", "bold"); d.setFontSize(19); d.setTextColor(INK[0], INK[1], INK[2]);
    d.text("Dein Ikigai muss kein Beruf sein.", MX + 7, D.y + 5); D.y += 18;
    D.body("Quellen: Ikigai-9 — Imai et al. 2012; Fido, Kotera & Asano 2019 · Ken Mogi, The Little Book of Ikigai (2017) · Mieko Kamiya, Ikigai ni tsuite (1966) · Diagramm: Zuzunaga 2011 / Winn 2014.",
      { size: 7, color: FAINT, width: 150, after: 0 });
    D.footer();

    /* ════════ S11 · Okuzuke-Kolophon — ~85 % Ma ════════ */
    D.newPage();
    D.y = 60;
    D.label("Okuzuke · Echtheitszertifikat");
    D.y = 90;
    d.setFont("Mincho", "normal"); d.setFontSize(12); d.setTextColor(INK[0], INK[1], INK[2]);
    d.text("Dieser Report wurde erstellt für", MX, D.y); D.y += 9;
    d.setFont("Mincho", "bold"); d.setFontSize(20);
    d.text(name || "dich", MX, D.y); D.y += 12;
    d.setFont("helvetica", "normal"); d.setFontSize(8.5); d.setTextColor(SOFT[0], SOFT[1], SOFT[2]);
    d.text("am " + new Date().toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" }), MX, D.y); D.y += 16;
    d.setFont("helvetica", "normal"); d.setFontSize(8); d.setTextColor(FAINT[0], FAINT[1], FAINT[2]);
    d.text("ikigAI — der Ikigai-Generator von OsAI", MX, D.y); D.y += 5;
    d.text("ikigai.demo.osai.solutions · osai.solutions", MX, D.y); D.y += 5;
    d.text("Version 2 · Redesign 2026", MX, D.y); D.y += 18;
    /* rotes Hanko als Signatur, leicht gedreht (über Re-Render mit Offset) */
    d.addImage(hanko, "PNG", MX, D.y, 24, 24);
    D.footer();

    return D.doc;
  }

  /* ---------- Inhalts-Helfer ---------- */
  function poemBreak(d, satz, maxW) {
    /* Umbruch nach Sinneinheiten (Satzzeichen), aber jede Zeile width-geclamped
     * gegen den rechten Rand (Font + Größe müssen vorher gesetzt sein). */
    var parts = satz.split(/(?<=[,;—–])\s+/);
    var lines = [], cur = "";
    function fits(s) { return d.getTextWidth(s) <= maxW; }
    parts.forEach(function (p) {
      var test = (cur + " " + p).trim();
      if (cur && !fits(test)) { lines.push(cur.trim()); cur = p; }
      else cur = test;
    });
    if (cur) lines.push(cur.trim());
    /* Wort-Hardwrap für Zeilen, die trotzdem zu breit sind (sehr lange Sätze) */
    var clamped = [];
    lines.forEach(function (ln) {
      if (fits(ln)) { clamped.push(ln); return; }
      d.splitTextToSize(ln, maxW).forEach(function (sub) { clamped.push(sub); });
    });
    return clamped.slice(0, 7);
  }

  function dimensionTexte(erg) {
    /* 2 kurze Absätze je Dimension, aus dem Ergebnis verdichtet (keine Erfindung:
       nimmt die Schnittmengen + Begriffe als Grundlage) */
    var sm = erg.schnittmengen || {};
    return {
      liebe: [
        "Das hier zieht dich von innen — nicht, weil du es können musst, sondern weil du dabei die Zeit vergisst.",
        sm.passion ? "Wo dieser Kreis dein Können trifft, entsteht " + sm.passion + "." : "Es ist der Ausgangspunkt, nicht das Ziel."
      ],
      staerke: [
        "Das fällt dir leicht — oft so leicht, dass du es selbst übersiehst. Genau das macht es zur Stärke, nicht nur zum Skill.",
        sm.beruf ? "Mit dem Markt verbunden wird daraus " + sm.beruf + "." : "Andere bitten dich genau hierfür um Hilfe."
      ],
      welt: [
        "Dein Beitrag. „Welt“ darf klein sein — deine Straße, dein Team, die Menschen vor dir zählen schon.",
        sm.mission ? "Wo dieser Kreis deine Liebe trifft, liegt deine " + sm.mission + "." : "Was dich stört, zeigt dir, wo du gebraucht wirst."
      ],
      markt: [
        "Der Markt hat schon Ja gesagt — auch informelle Beweise zählen. Hier wird aus Richtung Tragfähigkeit.",
        sm.berufung ? "Mit dem Beitrag verbunden entsteht deine " + sm.berufung + "." : "Auch der kleinste Gegenwert ist ein Signal."
      ]
    };
  }

  function pickZitat(erg, ctx, dim) {
    /* nimmt das wörtliche Zitat aus den Erkenntnissen, das am besten passt, sonst erstes */
    var erk = erg.erkenntnisse || [];
    if (erk[0]) {
      var idx = { liebe: 0, staerke: 1, welt: 2, markt: 0 }[dim.key];
      return (erk[idx] || erk[0]).zitat || "";
    }
    return "";
  }

  function drawBlob(d, cx, cy, r, rand, hex, alpha) {
    var n = 8, pts = [];
    var phase = rand() * Math.PI * 2;
    for (var i = 0; i < n; i++) {
      var ang = phase + (i / n) * Math.PI * 2;
      var rr = r * (1 + (rand() * 2 - 1) * 0.06);
      pts.push([cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr]);
    }
    var c = rgb(hex);
    d.setFillColor(c[0], c[1], c[2]);
    /* GState für Transparenz, falls verfügbar */
    if (d.GState && d.setGState) { try { d.setGState(new d.GState({ opacity: alpha })); } catch (e) {} }
    d.lines(toLines(pts), pts[0][0], pts[0][1], [1, 1], "F", true);
    if (d.setGState) { try { d.setGState(new d.GState({ opacity: 1 })); } catch (e) {} }
  }
  function toLines(pts) {
    /* jsPDF d.lines: relative Bézier-Segmente — Catmull-Rom→Bézier */
    var n = pts.length, segs = [];
    for (var i = 0; i < n; i++) {
      var p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      var c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      var c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      segs.push([c1x - p1[0], c1y - p1[1], c2x - p1[0], c2y - p1[1], p2[0] - p1[0], p2[1] - p1[1]]);
    }
    return segs;
  }

  function arc(d, cx, cy, r, a0, a1) {
    var steps = Math.max(2, Math.round(Math.abs(a1 - a0) / 0.25));
    var px = cx + Math.cos(a0) * r, py = cy + Math.sin(a0) * r;
    for (var i = 1; i <= steps; i++) {
      var a = a0 + (a1 - a0) * i / steps;
      var nx = cx + Math.cos(a) * r, ny = cy + Math.sin(a) * r;
      d.line(px, py, nx, ny); px = nx; py = ny;
    }
  }

  window.IKIGAI_PDF = {
    download: function (erg, ctx) {
      var btn = document.getElementById("btn-pdf");
      if (btn) { btn.disabled = true; btn.textContent = "PDF wird gebaut …"; }
      Promise.all([loadVendor(), logoDataUrl(), document.fonts.ready]).then(function (r) {
        var doc = build(window.jspdf.jsPDF, window.IKIGAI_PDF_FONTS, erg, ctx, r[1]);
        var name = (ctx.profil && ctx.profil.name || "").trim();
        doc.save("ikigai-report" + (name ? "-" + name.toLowerCase().replace(/[^a-zäöüß]/g, "") : "") + ".pdf");
      }).catch(function (e) {
        console.error("pdf-error", e);
        alert("Das PDF konnte gerade nicht gebaut werden — bitte noch einmal versuchen.");
      }).finally(function () {
        if (btn) { btn.disabled = false; btn.textContent = "PDF-Report herunterladen"; }
      });
    },
    _build: function (erg, ctx) {
      return Promise.all([loadVendor(), logoDataUrl(), document.fonts.ready]).then(function (r) {
        return build(window.jspdf.jsPDF, window.IKIGAI_PDF_FONTS, erg, ctx, r[1]);
      });
    }
  };
})();
