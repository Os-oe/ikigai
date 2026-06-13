/* Ergebnis-Seite — rendert das Synthese-JSON in scrollbare Sektionen mit Reveals. */
(function () {
  "use strict";

  var F = window.IKIGAI_FRAGEN;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  var GESCHICHTE = [
    "Das 4-Kreise-Diagramm oben stammt nicht aus Japan. <em>2011</em> zeichnete der spanische Astrologe Andrés Zuzunaga es als „Propósito“ — ein Purpose-Diagramm, ganz ohne Japan-Bezug. <em>2014</em> ersetzte der Blogger Marc Winn ein einziges Wort: „Purpose“ wurde „Ikigai“. Sein eigener Kommentar dazu: „All I did was change one word on a diagram.“ Das Bild ging viral — Japanerinnen und Japaner erkennen darin ihr Ikigai allerdings nicht wieder.",
    "Das echte 生き甲斐 ist ein Alltagswort: der Morgenkaffee, das Enkelkind, der kleine Blog, das Beet vor dem Haus. Die Forscherin Mieko Kamiya beschrieb schon 1966, dass die <em>Quelle</em> des Ikigai und das <em>Ikigai-Gefühl</em> zwei verschiedene Dinge sind — und der Neurowissenschaftler Ken Mogi fasst es so: „Ikigai wohnt im Reich der kleinen Dinge.“ Es muss kein Geld bringen, niemand muss darin gut sein, und die Welt muss es nicht brauchen.",
    "Warum zeigen wir das Diagramm trotzdem? Weil es als <em>Karriere-Werkzeug</em> ehrlich nützlich ist — solange man es nicht für japanische Weisheit hält. Deshalb bekommst du hier beide Ebenen: das Werkzeug für die Richtung, die Alltags-Ebene für das, was dich heute schon trägt. <em>Dein Ikigai muss kein Beruf sein.</em>"
  ];

  function section(kicker, h2, inner, cls) {
    return '<section class="r-section reveal ' + (cls || "") + '">' +
      (kicker ? '<p class="r-kicker">' + kicker + "</p>" : "") +
      (h2 ? '<h2 class="r-h2">' + h2 + "</h2>" : "") + inner + "</section>";
  }

  window.IKIGAI_RESULT = {
    current: null,

    render: function (erg, ctx) {
      this.current = { ergebnis: erg, ctx: ctx };
      var root = document.getElementById("result-root");
      var name = (ctx.profil && ctx.profil.name || "").trim();
      var anrede = name ? esc(name) + ", hier" : "Hier";
      var html = "";

      if (ctx.beispiel) {
        html += '<div class="beispiel-badge reveal">Beispiel-Ergebnis (Persona „Lena“) — die Live-Auswertung ist gerade ausgelastet. ' +
          "Deine Antworten wurden <strong>nicht</strong> ausgewertet und nicht gespeichert. Versuch es später noch einmal.</div>";
      }

      /* 1 · Visual — der Satz lebt jetzt IM Diagramm (Held unter den Kreisen) */
      html += section("Dein Ergebnis", anrede + " ist dein Ikigai — auf beiden Ebenen.",
        '<div class="venn-wrap" id="venn-wrap">' + window.IKIGAI_VENN(erg, { name: name }) + "</div>");

      /* 2 · Alltags-Ebene */
      var alltagHtml = '<div class="alltag-grid">';
      (erg.alltag || []).forEach(function (a) {
        var s = F.saeulen[(a.saeule || 1) - 1] || F.saeulen[0];
        alltagHtml += '<div class="alltag-card">' +
          '<p class="saeule">Säule ' + s.nr + " · " + esc(s.name) + "</p>" +
          '<p class="moment">„' + esc(a.moment) + '“</p>' +
          "<p>" + esc(a.kommentar) + "</p></div>";
      });
      alltagHtml += "</div>";
      html += section("Ebene 2 · Die japanische Alltags-Ebene", "Dein Ikigai im Kleinen",
        '<p class="r-intro">In Japan ist Ikigai kein Karriereziel, sondern das, was den Tag trägt. Das hier hast du schon — sortiert nach Ken Mogis fünf Säulen:</p>' + alltagHtml);

      /* 3 · Erkenntnisse */
      var erkHtml = "";
      (erg.erkenntnisse || []).forEach(function (e) {
        erkHtml += '<div class="r-card"><h3>' + esc(e.titel) + "</h3>" +
          '<p class="r-zitat">Du hast geschrieben: „' + esc(e.zitat) + '“</p>' +
          "<p>" + esc(e.text) + "</p></div>";
      });
      html += section("Muster in deinen Antworten", "Drei Dinge, die auffallen", erkHtml);

      /* 4 · Ideen */
      var ideenHtml = "";
      (erg.ideen || []).forEach(function (i) {
        ideenHtml += '<div class="r-card"><span class="typ-tag">' + esc(i.typ) + "</span>" +
          "<h3>" + esc(i.titel) + "</h3>" +
          "<p>" + esc(i.begruendung) + "</p>" +
          '<p class="erster-schritt"><strong>Erster Schritt:</strong> ' + esc(i.erster_schritt) + "</p></div>";
      });
      html += section("Konkret werden", "Drei Ideen — abgeleitet aus deinen Worten", ideenHtml);

      /* 5 · Kaizen-Plan */
      var kzHtml = '<p class="r-intro">Kaizen heißt: kleine Schritte, konsequent. Links dein Schritt, rechts wie dir KI dabei konkret Zeit oder Anlauf abnimmt.</p>';
      (erg.kaizen || []).forEach(function (w) {
        kzHtml += '<div class="kaizen-week"><h3><span class="wk">WOCHE ' + esc(w.woche) + "</span> " + esc(w.fokus) + "</h3>";
        (w.schritte || []).forEach(function (s) {
          kzHtml += '<div class="kaizen-step"><div class="ks-do">' + esc(s.schritt) + "</div>" +
            '<div class="ks-ki">' + esc(s.ki_hilfe) + "</div></div>";
        });
        kzHtml += "</div>";
      });
      html += section("Dein 30-Tage-Kaizen-Plan", "Vier Wochen, kleine Schritte", kzHtml);

      /* 6 · Ikigai-9 Score */
      html += section("Standortbestimmung", "Dein Ikigai-9-Wert", this.scoreHtml(ctx.ikigai9, erg.score_kommentar));

      /* 7 · Wahre Geschichte */
      html += '<section class="r-section reveal"><div class="geschichte">' +
        '<p class="r-kicker">Ehrlichkeit statt Mythos</p>' +
        "<h2>Die wahre Geschichte des Diagramms</h2>" +
        GESCHICHTE.map(function (p) { return "<p>" + p + "</p>"; }).join("") +
        "</div></section>";

      /* 8 · Downloads */
      html += section("Mitnehmen", "Dein Report & dein Share-Bild",
        '<p class="r-intro">Sofort und ohne E-Mail-Adresse — versprochen ist versprochen.</p>' +
        '<div class="dl-row">' +
        '<button id="btn-pdf" class="btn btn-accent">PDF-Report herunterladen</button>' +
        '<button id="btn-share-sq" class="btn">Share-Bild 1:1</button>' +
        '<button id="btn-share-story" class="btn">Story-Format 9:16</button>' +
        "</div>" +
        '<div class="share-preview"><canvas id="share-sq" class="sq" width="1080" height="1080"></canvas>' +
        '<canvas id="share-story" class="story" width="1080" height="1920"></canvas></div>');

      /* 9 · CTA */
      html += '<section class="r-section reveal"><div class="r-cta">' +
        '<p class="cta-line">Dieses Tool hat eine KI an einem Abend gebaut.<br>So etwas für dein Business?</p>' +
        "<p>15 Minuten, unverbindlich — wir schauen, was KI dir abnehmen kann.</p>" +
        '<a class="btn btn-accent" href="https://cal.com/osai-solutions/brand-analyse" target="_blank" rel="noopener">15-Min-Gespräch buchen</a>' +
        '<p class="powered"><img src="assets/img/logo-mark.png" alt=""> powered by <strong>OsAI</strong> · osai.solutions</p>' +
        "</div></section>";

      html += '<p class="r-intro" style="font-size:.78rem;color:var(--ink-faint);text-align:center">Miss dich in 30 Tagen noch einmal — der Ikigai-9-Wert ist ein Foto, kein Urteil.</p>';

      root.innerHTML = html;

      /* Reveals */
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
        });
      }, { threshold: 0.12 });
      root.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
      if (ctx.fast) root.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });

      /* Score-Ring animieren */
      var ring = root.querySelector(".sr-fill");
      if (ring) requestAnimationFrame(function () {
        requestAnimationFrame(function () { ring.style.strokeDashoffset = ring.dataset.target; });
      });

      /* Venn-Kreise sanft einblenden */
      root.querySelectorAll(".venn-c").forEach(function (c2, i) {
        c2.style.opacity = "0";
        c2.style.transition = "opacity .9s ease " + (ctx.fast ? 0 : 0.15 + i * 0.18) + "s";
        requestAnimationFrame(function () { c2.style.opacity = "1"; });
      });

      /* Share-Canvas vorrendern + Buttons */
      var self = this;
      document.fonts.ready.then(function () {
        window.IKIGAI_SHARE.renderInto(document.getElementById("share-sq"), erg, ctx, "sq");
        window.IKIGAI_SHARE.renderInto(document.getElementById("share-story"), erg, ctx, "story");
      });
      document.getElementById("btn-share-sq").addEventListener("click", function () {
        window.IKIGAI_SHARE.download(erg, ctx, "sq");
      });
      document.getElementById("btn-share-story").addEventListener("click", function () {
        window.IKIGAI_SHARE.download(erg, ctx, "story");
      });
      document.getElementById("btn-pdf").addEventListener("click", function () {
        window.IKIGAI_PDF.download(erg, ctx);
      });
    },

    scoreHtml: function (ikigai9, kommentar) {
      var vals = (ikigai9 || []).map(function (v) { return v || 0; });
      var sum = vals.reduce(function (a, b) { return a + b; }, 0);
      var band = F.scoreBands.filter(function (b) { return sum >= b.min && sum <= b.max; })[0] || F.scoreBands[1];
      var dims = { e: 0, z: 0, b: 0 };
      F.ikigai9.forEach(function (item, i) { dims[item.dim] += vals[i]; });
      var C = 289, offTarget = C * (1 - sum / 45);
      return '<div class="score-row">' +
        '<div class="score-ring"><svg viewBox="0 0 100 100">' +
        '<circle class="sr-track" cx="50" cy="50" r="46"/>' +
        '<circle class="sr-fill" cx="50" cy="50" r="46" style="stroke-dashoffset:289" data-target="' + offTarget.toFixed(1) + '"/>' +
        '</svg><div class="sr-num">' + sum + '<small>von 45</small></div></div>' +
        '<div class="score-text"><p class="band">' + esc(band.label) + "</p>" +
        "<p>" + esc(band.text) + "</p>" +
        '<div class="score-dims">' +
        "<span>Lebensgefühl <b>" + dims.e + "/15</b></span>" +
        "<span>Blick nach vorn <b>" + dims.z + "/15</b></span>" +
        "<span>Eigene Bedeutung <b>" + dims.b + "/15</b></span>" +
        "</div>" +
        (kommentar ? '<p style="margin-top:.7rem">' + esc(kommentar) + "</p>" : "") +
        "</div></div>" +
        '<p style="font-size:.72rem;color:var(--ink-faint);margin-top:.8rem">Skala: Ikigai-9 (Imai et al. 2012; dt. Übertragung nach Fido, Kotera &amp; Asano 2019). Kein diagnostisches Instrument.</p>';
    }
  };
})();
