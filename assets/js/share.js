/* Share-Bild — der teilbare Satz ist der Held (Karussell-Slide 3, invertiert/dunkel).
 * Default-Einzel-Share = "card" (1080×1350), plus Story-Crop (1080×1920).
 * Delegiert an IKIGAI_CAROUSEL.renderSlide — ein Design, mehrere Ausspielungen. */
(function () {
  "use strict";

  function draw(canvas, erg, ctx2, format) {
    window.IKIGAI_CAROUSEL.renderShareInto(canvas, erg, ctx2, format === "story" ? "story" : "card");
  }

  window.IKIGAI_SHARE = {
    renderInto: function (canvas, erg, ctx2, format) {
      draw(canvas, erg, ctx2, format);
    },
    download: function (erg, ctx2, format) {
      var fmt = format === "story" ? "story" : "card";
      var canvas = document.createElement("canvas");
      window.IKIGAI_CAROUSEL.renderShareInto(canvas, erg, ctx2, fmt).then(function () {
        canvas.toBlob(function (blob) {
          if (!blob) return;
          var fname = "ikigai-satz" + (fmt === "story" ? "-story" : "") + ".png";
          var file = new File([blob], fname, { type: "image/png" });
          if (navigator.canShare && navigator.canShare({ files: [file] }) && /iPhone|iPad/.test(navigator.userAgent)) {
            navigator.share({ files: [file], title: "Mein Ikigai" }).catch(function () { fallback(blob, fname); });
          } else fallback(blob, fname);
        }, "image/png");
      });
      function fallback(b, fname) {
        var a = document.createElement("a");
        a.href = URL.createObjectURL(b); a.download = fname;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      }
    }
  };
})();
