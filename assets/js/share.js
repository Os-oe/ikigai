/* Share-Bild — Canvas-Render in 1080×1080 + 1080×1920, Washi-Look, OsAI-Logo als Datei. */
(function () {
  "use strict";

  var SERIF = '"Shippori Mincho", Georgia, serif';
  var SANS = "Inter, sans-serif";
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

  function paper(ctx, w, h) {
    ctx.fillStyle = "#f5f0e6";
    ctx.fillRect(0, 0, w, h);
    /* dezente Vignette */
    var g = ctx.createRadialGradient(w / 2, h * 0.35, w * 0.1, w / 2, h / 2, Math.max(w, h) * 0.75);
    g.addColorStop(0, "rgba(255,255,255,.5)");
    g.addColorStop(1, "rgba(190,178,152,.18)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  function wordmark(ctx, x, y, sizePx) {
    ctx.textAlign = "left";
    ctx.font = "700 " + sizePx + "px " + SERIF;
    var w1 = ctx.measureText("ikig").width;
    var total = w1 + ctx.measureText("AI").width;
    var startX = x - total / 2;
    ctx.fillStyle = "#211d18";
    ctx.fillText("ikig", startX, y);
    ctx.fillStyle = "#f6303a";
    ctx.fillText("AI", startX + w1, y);
    ctx.textAlign = "center";
  }

  function enso(ctx, cx, cy, r, lw, alpha) {
    ctx.save();
    ctx.strokeStyle = "rgba(33,29,24," + (alpha || 0.9) + ")";
    ctx.lineWidth = lw;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(cx, cy, r, -0.42 * Math.PI, 1.34 * Math.PI);
    ctx.stroke();
    ctx.restore();
  }

  function zentrumLines(ctx, erg, cx, y, maxW, baseSize) {
    var text = "„" + (erg.zentrum || "") + "“";
    var size = baseSize;
    if (text.length > 110) size = Math.round(baseSize * 0.86);
    if (text.length > 150) size = Math.round(baseSize * 0.74);
    ctx.font = "600 " + size + "px " + SERIF;
    var lines = window.IKIGAI_GEO.wrap(text, Math.floor(maxW / (size * 0.52)), 4);
    var lh = size * 1.4;
    ctx.fillStyle = "#211d18";
    lines.forEach(function (ln, i) { ctx.fillText(ln, cx, y + i * lh); });
    return y + lines.length * lh;
  }

  function draw(canvas, erg, ctx2, format, logo) {
    var W = 1080, H = format === "story" ? 1920 : 1080;
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext("2d");
    paper(ctx, W, H);
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    var name = (ctx2.profil && ctx2.profil.name || "").trim();

    if (format === "sq") {
      enso(ctx, W / 2, 470, 392, 10, 0.16);
      wordmark(ctx, W / 2, 110, 64);
      ctx.font = "500 28px " + SANS;
      ctx.fillStyle = "#5b5347";
      ctx.fillText(name ? name + "s Ikigai" : "Mein Ikigai", W / 2, 158);
      window.IKIGAI_DRAW_VENN(ctx, erg, W / 2, 470, 560);
      var yEnd = zentrumLines(ctx, erg, W / 2, 868, 880, 34);
      ctx.font = "500 24px " + SANS;
      ctx.fillStyle = "#8d8374";
      ctx.fillText("ikigai.demo.osai.solutions", W / 2, 1006);
      if (logo) {
        var lw = 40, lh = lw * (logo.height / logo.width);
        ctx.drawImage(logo, W / 2 - 150, 1030 - lh / 2 - 8, lw, lh);
        ctx.textAlign = "left";
        ctx.font = "600 22px " + SANS;
        ctx.fillStyle = "#5b5347";
        ctx.fillText("powered by OsAI", W / 2 - 100, 1032);
        ctx.textAlign = "center";
      }
    } else {
      enso(ctx, W / 2, 760, 420, 11, 0.14);
      wordmark(ctx, W / 2, 200, 78);
      ctx.font = "500 30px " + SANS;
      ctx.fillStyle = "#5b5347";
      ctx.fillText(name ? name + "s Ikigai" : "Mein Ikigai", W / 2, 258);
      window.IKIGAI_DRAW_VENN(ctx, erg, W / 2, 760, 620);
      zentrumLines(ctx, erg, W / 2, 1250, 900, 40);
      ctx.font = "italic 500 28px " + SERIF;
      ctx.fillStyle = "#5b5347";
      ctx.fillText("Dein Ikigai muss kein Beruf sein.", W / 2, 1560);
      ctx.font = "500 26px " + SANS;
      ctx.fillStyle = "#8d8374";
      ctx.fillText("ikigai.demo.osai.solutions", W / 2, 1780);
      if (logo) {
        var lw2 = 44, lh2 = lw2 * (logo.height / logo.width);
        ctx.drawImage(logo, W / 2 - 160, 1816 - lh2 / 2, lw2, lh2);
        ctx.textAlign = "left";
        ctx.font = "600 24px " + SANS;
        ctx.fillStyle = "#5b5347";
        ctx.fillText("powered by OsAI", W / 2 - 104, 1842);
        ctx.textAlign = "center";
      }
    }
  }

  window.IKIGAI_SHARE = {
    renderInto: function (canvas, erg, ctx2, format) {
      loadLogo().then(function (logo) { draw(canvas, erg, ctx2, format, logo); });
    },
    download: function (erg, ctx2, format) {
      var canvas = document.createElement("canvas");
      loadLogo().then(function (logo) {
        return document.fonts.ready.then(function () {
          draw(canvas, erg, ctx2, format, logo);
          canvas.toBlob(function (blob) {
            if (!blob) return;
            var file = new File([blob], "ikigai-" + format + ".png", { type: "image/png" });
            /* iOS: Web-Share mit Datei, sonst klassischer Download */
            if (navigator.canShare && navigator.canShare({ files: [file] }) && /iPhone|iPad/.test(navigator.userAgent)) {
              navigator.share({ files: [file], title: "Mein Ikigai" }).catch(function () { fallback(blob); });
            } else fallback(blob);
            function fallback(b) {
              var a = document.createElement("a");
              a.href = URL.createObjectURL(b);
              a.download = "ikigai-" + format + ".png";
              document.body.appendChild(a); a.click(); a.remove();
              setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
            }
          }, "image/png");
        });
      });
    }
  };
})();
