/* PDF-Report — jsPDF direkt (Vektor-Text, gestaltet, kein Screenshot).
 * jsPDF wird erst beim ersten Klick geladen (365 KB gespart beim Erst-Load). */
(function () {
  "use strict";

  var PAPER = [245, 240, 230], INK = [33, 29, 24], SOFT = [91, 83, 71],
      FAINT = [141, 131, 116], ACCENT = [246, 48, 58], LINE = [221, 211, 192];
  var M = 22, PW = 210, PH = 297, BOTTOM = PH - 24;

  var vendorPromise = null;
  function loadVendor() {
    if (window.jspdf) return Promise.resolve();
    if (vendorPromise) return vendorPromise;
    vendorPromise = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = "assets/vendor/jspdf.umd.min.js";
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
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

  function vennDataUrl(erg) {
    var c = document.createElement("canvas");
    c.width = 1300; c.height = 1300;
    var ctx = c.getContext("2d");
    ctx.fillStyle = "rgb(245,240,230)";
    ctx.fillRect(0, 0, 1300, 1300);
    window.IKIGAI_DRAW_VENN(ctx, erg, 650, 650, 1160);
    return c.toDataURL("image/png");
  }

  function ensoDataUrl() {
    var c = document.createElement("canvas");
    c.width = 400; c.height = 400;
    var ctx = c.getContext("2d");
    ctx.strokeStyle = "rgba(33,29,24,.85)";
    ctx.lineWidth = 14; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(200, 200, 160, -0.42 * Math.PI, 1.34 * Math.PI);
    ctx.stroke();
    return c.toDataURL("image/png");
  }

  function Doc(jsPDF) {
    this.doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
    this.page = 1;
    this.y = M;
    this.bg();
  }
  Doc.prototype.bg = function () {
    this.doc.setFillColor(PAPER[0], PAPER[1], PAPER[2]);
    this.doc.rect(0, 0, PW, PH, "F");
  };
  Doc.prototype.footer = function () {
    var d = this.doc;
    d.setFont("helvetica", "normal"); d.setFontSize(7.5);
    d.setTextColor(FAINT[0], FAINT[1], FAINT[2]);
    d.text("ikigAI · ikigai.demo.osai.solutions — powered by OsAI", M, PH - 12);
    d.text(String(this.page), PW - M, PH - 12, { align: "right" });
  };
  Doc.prototype.newPage = function () {
    this.footer();
    this.doc.addPage();
    this.page++;
    this.bg();
    this.y = M;
  };
  Doc.prototype.need = function (h) { if (this.y + h > BOTTOM) this.newPage(); };
  Doc.prototype.kicker = function (t) {
    var d = this.doc;
    this.need(16);
    d.setFont("helvetica", "bold"); d.setFontSize(7.5);
    d.setTextColor(FAINT[0], FAINT[1], FAINT[2]);
    d.text(t.toUpperCase().split("").join(" "), M, this.y);
    this.y += 6;
  };
  Doc.prototype.h2 = function (t) {
    var d = this.doc;
    d.setFont("times", "bold"); d.setFontSize(17);
    d.setTextColor(INK[0], INK[1], INK[2]);
    var lines = d.splitTextToSize(t, PW - 2 * M);
    this.need(lines.length * 7 + 4);
    d.text(lines, M, this.y);
    this.y += lines.length * 7 + 3;
  };
  Doc.prototype.body = function (t, opts) {
    opts = opts || {};
    var d = this.doc;
    d.setFont(opts.font || "helvetica", opts.style || "normal");
    d.setFontSize(opts.size || 9.5);
    var col = opts.color || SOFT;
    d.setTextColor(col[0], col[1], col[2]);
    var w = opts.width || PW - 2 * M;
    var lines = d.splitTextToSize(t, w);
    var lh = (opts.size || 9.5) * 0.48;
    this.need(lines.length * lh + (opts.after || 3));
    d.text(lines, opts.x || M, this.y);
    this.y += lines.length * lh + (opts.after || 3);
    return lines.length * lh;
  };

  function measure(d, t, size, w) {
    d.setFontSize(size);
    return d.splitTextToSize(t, w).length * size * 0.48;
  }

  function build(jsPDF, erg, ctx, logo) {
    var D = new Doc(jsPDF), d = D.doc;
    var name = (ctx.profil && ctx.profil.name || "").trim();
    var F = window.IKIGAI_FRAGEN;

    /* ---------- Seite 1 · Cover ---------- */
    d.addImage(ensoDataUrl(), "PNG", PW / 2 - 24, 26, 48, 48);
    d.setFont("times", "bold"); d.setFontSize(30);
    d.setTextColor(INK[0], INK[1], INK[2]);
    var w1 = d.getTextWidth("ikig"), wAll = w1 + d.getTextWidth("AI");
    d.text("ikig", PW / 2 - wAll / 2, 92);
    d.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    d.text("AI", PW / 2 - wAll / 2 + w1, 92);
    d.setFont("helvetica", "normal"); d.setFontSize(10);
    d.setTextColor(SOFT[0], SOFT[1], SOFT[2]);
    d.text("Dein Ikigai-Report" + (name ? " — für " + name : ""), PW / 2, 102, { align: "center" });
    d.setFontSize(8); d.setTextColor(FAINT[0], FAINT[1], FAINT[2]);
    d.text(new Date().toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" }), PW / 2, 108, { align: "center" });

    d.addImage(vennDataUrl(erg), "PNG", PW / 2 - 75, 116, 150, 150);

    d.setFont("times", "italic"); d.setFontSize(13);
    d.setTextColor(INK[0], INK[1], INK[2]);
    var zl = d.splitTextToSize("„" + erg.zentrum + "“", 150);
    d.text(zl, PW / 2, 277 - zl.length * 6, { align: "center" });
    D.footer();

    /* ---------- Seite 2 · Erkenntnisse + Score ---------- */
    D.newPage();
    D.kicker("Muster in deinen Antworten");
    D.h2("Drei Dinge, die auffallen");
    (erg.erkenntnisse || []).forEach(function (e) {
      var h = 8 + measure(d, "„" + e.zitat + "“", 10, PW - 2 * M - 10) + measure(d, e.text, 9.5, PW - 2 * M) + 10;
      D.need(h);
      d.setFont("times", "bold"); d.setFontSize(12);
      d.setTextColor(INK[0], INK[1], INK[2]);
      d.text(e.titel, M, D.y); D.y += 6;
      d.setFont("times", "italic"); /* korrekte Metrik für die Balken-Höhe */
      var qh = measure(d, "Du hast geschrieben: „" + e.zitat + "“", 10, PW - 2 * M - 10);
      d.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
      d.rect(M, D.y - 3.6, 1, qh + 2, "F");
      D.body("Du hast geschrieben: „" + e.zitat + "“", { font: "times", style: "italic", size: 10, x: M + 4, width: PW - 2 * M - 10, after: 2 });
      D.body(e.text, { after: 7 });
    });

    D.y += 2;
    D.kicker("Standortbestimmung");
    D.h2("Dein Ikigai-9-Wert");
    var vals = (ctx.ikigai9 || []).map(function (v) { return v || 0; });
    var sum = vals.reduce(function (a, b) { return a + b; }, 0);
    var band = F.scoreBands.filter(function (b) { return sum >= b.min && sum <= b.max; })[0] || F.scoreBands[1];
    var dims = { e: 0, z: 0, b: 0 };
    F.ikigai9.forEach(function (item, i) { dims[item.dim] += vals[i]; });
    D.need(30);
    d.setFont("times", "bold"); d.setFontSize(26);
    d.setTextColor(INK[0], INK[1], INK[2]);
    d.text(sum + " / 45", M, D.y + 6);
    d.setFont("helvetica", "bold"); d.setFontSize(10);
    d.text(band.label, M + 42, D.y + 1);
    d.setFont("helvetica", "normal"); d.setFontSize(8.5);
    d.setTextColor(SOFT[0], SOFT[1], SOFT[2]);
    d.text(d.splitTextToSize(band.text, PW - M - (M + 42)), M + 42, D.y + 6);
    D.y += 22;
    D.body("Lebensgefühl " + dims.e + "/15   ·   Blick nach vorn " + dims.z + "/15   ·   Eigene Bedeutung " + dims.b + "/15", { size: 8.5, after: 3 });
    if (erg.score_kommentar) D.body(erg.score_kommentar, { after: 3 });
    D.body("Skala: Ikigai-9 (Imai et al. 2012; Fido, Kotera & Asano 2019). Kein diagnostisches Instrument — miss in 30 Tagen erneut.", { size: 7.5, color: FAINT, after: 0 });

    /* ---------- Seite 3 · Ideen ---------- */
    D.newPage();
    D.kicker("Konkret werden");
    D.h2("Drei Ideen — abgeleitet aus deinen Worten");
    (erg.ideen || []).forEach(function (i) {
      var h = 14 + measure(d, i.begruendung, 9.5, PW - 2 * M - 12) + measure(d, i.erster_schritt, 9.5, PW - 2 * M - 12) + 14;
      D.need(h);
      var top = D.y - 4;
      d.setFont("helvetica", "bold"); d.setFontSize(7);
      d.setTextColor(FAINT[0], FAINT[1], FAINT[2]);
      d.text(i.typ.toUpperCase(), M + 6, D.y); D.y += 5;
      d.setFont("times", "bold"); d.setFontSize(12.5);
      d.setTextColor(INK[0], INK[1], INK[2]);
      var tl = d.splitTextToSize(i.titel, PW - 2 * M - 12);
      d.text(tl, M + 6, D.y); D.y += tl.length * 6 + 1;
      D.body(i.begruendung, { x: M + 6, width: PW - 2 * M - 12, after: 2.5 });
      d.setFont("helvetica", "bold");
      D.body("Erster Schritt: " + i.erster_schritt, { x: M + 6, width: PW - 2 * M - 12, style: "bold", color: INK, after: 4 });
      d.setDrawColor(LINE[0], LINE[1], LINE[2]);
      d.roundedRect(M, top - 2, PW - 2 * M, D.y - top - 2, 2.5, 2.5, "S");
      D.y += 6;
    });

    /* ---------- Seite 4 · Alltags-Ebene ---------- */
    D.newPage();
    D.kicker("Ebene 2 · Die japanische Alltags-Ebene");
    D.h2("Dein Ikigai im Kleinen");
    D.body("In Japan ist Ikigai kein Karriereziel, sondern das, was den Tag trägt. Das hier hast du schon — sortiert nach Ken Mogis fünf Säulen:", { after: 6 });
    (erg.alltag || []).forEach(function (a) {
      var s = F.saeulen[(a.saeule || 1) - 1] || F.saeulen[0];
      var h = 6 + measure(d, "„" + a.moment + "“", 10.5, PW - 2 * M) + measure(d, a.kommentar, 9, PW - 2 * M) + 8;
      D.need(h);
      d.setFont("helvetica", "bold"); d.setFontSize(7);
      d.setTextColor(FAINT[0], FAINT[1], FAINT[2]);
      d.text("SÄULE " + s.nr + " · " + s.name.toUpperCase(), M, D.y); D.y += 4.5;
      D.body("„" + a.moment + "“", { font: "times", style: "italic", size: 10.5, color: INK, after: 1.5 });
      D.body(a.kommentar, { size: 9, after: 6 });
    });

    /* ---------- Seite 5 · Kaizen ---------- */
    D.newPage();
    D.kicker("Dein 30-Tage-Kaizen-Plan");
    D.h2("Vier Wochen, kleine Schritte");
    D.body("Links dein Schritt, rechts wie dir KI dabei konkret hilft. Kaizen heißt: klein, aber konsequent.", { after: 6 });
    var colW = (PW - 2 * M) / 2 - 3;
    (erg.kaizen || []).forEach(function (w) {
      /* Block-Höhe messen — Wochen nicht über Seiten reißen */
      var bh = 8;
      (w.schritte || []).forEach(function (s) {
        bh += Math.max(measure(d, s.schritt, 9, colW - 6), measure(d, "So hilft dir KI: " + s.ki_hilfe, 8.5, colW - 6)) + 8;
      });
      D.need(bh + 4);
      d.setFont("helvetica", "bold"); d.setFontSize(8);
      d.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
      d.text("WOCHE " + w.woche, M, D.y);
      d.setFont("times", "bold"); d.setFontSize(11.5);
      d.setTextColor(INK[0], INK[1], INK[2]);
      d.text(w.fokus, M + 22, D.y);
      D.y += 6;
      (w.schritte || []).forEach(function (s) {
        var hL = measure(d, s.schritt, 9, colW - 6);
        var hR = measure(d, s.ki_hilfe, 8.5, colW - 6) + 4;
        var rh = Math.max(hL, hR) + 6;
        D.need(rh + 2);
        d.setDrawColor(LINE[0], LINE[1], LINE[2]);
        d.setFillColor(250, 246, 238);
        d.roundedRect(M, D.y - 4, colW, rh, 2, 2, "FD");
        d.setFillColor(239, 232, 218);
        d.roundedRect(M + colW + 6, D.y - 4, colW, rh, 2, 2, "FD");
        d.setFont("helvetica", "normal"); d.setFontSize(9);
        d.setTextColor(INK[0], INK[1], INK[2]);
        d.text(d.splitTextToSize(s.schritt, colW - 6), M + 3, D.y + 1);
        d.setFont("helvetica", "bold"); d.setFontSize(6.5);
        d.setTextColor(FAINT[0], FAINT[1], FAINT[2]);
        d.text("SO HILFT DIR KI", M + colW + 9, D.y);
        d.setFont("helvetica", "normal"); d.setFontSize(8.5);
        d.setTextColor(SOFT[0], SOFT[1], SOFT[2]);
        d.text(d.splitTextToSize(s.ki_hilfe, colW - 6), M + colW + 9, D.y + 4);
        D.y += rh + 2;
      });
      D.y += 5;
    });

    /* ---------- Seite 6 · Wahre Geschichte + CTA ---------- */
    D.newPage();
    D.kicker("Ehrlichkeit statt Mythos");
    D.h2("Die wahre Geschichte des Diagramms");
    [
      "Das 4-Kreise-Diagramm stammt nicht aus Japan. 2011 zeichnete der spanische Astrologe Andrés Zuzunaga es als „Propósito“ — ein Purpose-Diagramm ohne Japan-Bezug. 2014 ersetzte der Blogger Marc Winn ein einziges Wort: „Purpose“ wurde „Ikigai“. Das Bild ging viral — in Japan erkennt man darin das eigene Ikigai allerdings nicht wieder.",
      "Das echte Ikigai ist ein Alltagswort: der Morgenkaffee, das Enkelkind, der kleine Blog. Mieko Kamiya beschrieb 1966 den Unterschied zwischen der Quelle des Ikigai und dem Ikigai-Gefühl; Ken Mogi fasst es so: „Ikigai wohnt im Reich der kleinen Dinge.“ Es muss kein Geld bringen, niemand muss darin gut sein, und die Welt muss es nicht brauchen.",
      "Warum zeigen wir das Diagramm trotzdem? Weil es als Karriere-Werkzeug ehrlich nützlich ist — solange man es nicht für japanische Weisheit hält. Deshalb dieser Report mit beiden Ebenen. Und der wichtigste Satz zum Schluss: Dein Ikigai muss kein Beruf sein."
    ].forEach(function (p) { D.body(p, { size: 9.5, after: 5 }); });

    D.y += 6;
    D.body("Quellen: Ikigai-9 — Imai et al. 2012; Fido, Kotera & Asano 2019 · Ken Mogi, The Little Book of Ikigai (2017) · Mieko Kamiya, Ikigai ni tsuite (1966) · Diagramm: Zuzunaga 2011 / Winn 2014.", { size: 7.5, color: FAINT, after: 10 });

    /* CTA-Box */
    D.need(52);
    var ctaTop = D.y;
    d.setDrawColor(LINE[0], LINE[1], LINE[2]);
    d.setFillColor(250, 246, 238);
    d.roundedRect(M, ctaTop, PW - 2 * M, 44, 3, 3, "FD");
    d.setFont("times", "bold"); d.setFontSize(13);
    d.setTextColor(INK[0], INK[1], INK[2]);
    d.text("Dieses Tool hat eine KI an einem Abend gebaut.", PW / 2, ctaTop + 12, { align: "center" });
    d.text("So etwas für dein Business?", PW / 2, ctaTop + 19, { align: "center" });
    d.setFont("helvetica", "normal"); d.setFontSize(9);
    d.setTextColor(SOFT[0], SOFT[1], SOFT[2]);
    d.text("15 Minuten, unverbindlich:", PW / 2, ctaTop + 28, { align: "center" });
    d.setFont("helvetica", "bold");
    d.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    d.textWithLink("cal.com/osai-solutions/brand-analyse", PW / 2 - d.getTextWidth("cal.com/osai-solutions/brand-analyse") / 2, ctaTop + 34, { url: "https://cal.com/osai-solutions/brand-analyse" });
    if (logo) {
      var lw = 7, lh = lw * logo.ratio;
      d.addImage(logo.url, "PNG", PW / 2 - 16, ctaTop + 37.5, lw, lh);
      d.setFont("helvetica", "normal"); d.setFontSize(7.5);
      d.setTextColor(FAINT[0], FAINT[1], FAINT[2]);
      d.text("powered by OsAI", PW / 2 - 7, ctaTop + 41.5);
    }
    D.footer();

    return D.doc;
  }

  window.IKIGAI_PDF = {
    download: function (erg, ctx) {
      var btn = document.getElementById("btn-pdf");
      if (btn) { btn.disabled = true; btn.textContent = "PDF wird gebaut …"; }
      Promise.all([loadVendor(), logoDataUrl(), document.fonts.ready]).then(function (r) {
        var doc = build(window.jspdf.jsPDF, erg, ctx, r[1]);
        var name = (ctx.profil && ctx.profil.name || "").trim();
        doc.save("ikigai-report" + (name ? "-" + name.toLowerCase().replace(/[^a-zäöüß]/g, "") : "") + ".pdf");
      }).catch(function (e) {
        console.error("pdf-error", e);
        alert("Das PDF konnte gerade nicht gebaut werden — bitte noch einmal versuchen.");
      }).finally(function () {
        if (btn) { btn.disabled = false; btn.textContent = "PDF-Report herunterladen"; }
      });
    },
    _build: function (erg, ctx) { /* Test-Hook: gibt jsPDF-Doc zurück */
      return Promise.all([loadVendor(), logoDataUrl(), document.fonts.ready]).then(function (r) {
        return build(window.jspdf.jsPDF, erg, ctx, r[1]);
      });
    }
  };
})();
