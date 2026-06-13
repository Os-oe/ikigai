/* ikigAI Wizard — Single-Page-State-Machine.
 * Eine Frage pro Screen · localStorage-Resume · Fortschritts-Ensō ·
 * Test-Modi: ?fast=1 (Animationen aus) · ?demo=1 (Lena vorbefüllt) · ?mock=1 (kein API-Call) */
(function () {
  "use strict";

  var F = window.IKIGAI_FRAGEN;
  var LS_KEY = "ikigai-state-v1";
  var params = new URLSearchParams(location.search);
  var FAST = params.get("fast") === "1";
  var DEMO_KIND = params.get("demo");                 // "1" = Lena · "long" = Stress-Variante
  var DEMO = DEMO_KIND === "1" || DEMO_KIND === "long";
  var LONG = DEMO_KIND === "long";
  /* Long-Demo immer ohne API-Call (deterministisches Stress-Fixture) */
  var MOCK = params.get("mock") === "1" || LONG;
  /* aktive Persona für Demo/Mock/Fallback (Long-Variante überschreibt Lena) */
  function PERSONA() { return LONG ? window.LENA_LONG : window.LENA; }
  if (FAST) document.documentElement.classList.add("fast");

  /* ---------- Schritt-Liste bauen ---------- */
  var steps = [];
  steps.push({ kind: "profil" });
  F.ikigai9.forEach(function (item, i) {
    steps.push({ kind: "likert", item: item, idx: i, nr: i + 1 });
  });
  F.bloecke.forEach(function (block) {
    steps.push({ kind: "interstitial", block: block });
    block.fragen.forEach(function (frage) {
      steps.push({ kind: "frage", block: block, frage: frage });
    });
  });
  var ANSWER_STEPS = steps.filter(function (s) { return s.kind !== "interstitial"; }).length;

  /* ---------- State ---------- */
  function freshState() {
    return {
      profil: { name: "", beruf: "" },
      ikigai9: F.ikigai9.map(function () { return null; }),
      antworten: {},
      step: 0,
      started: false,
      done: false
    };
  }
  var state = freshState();

  function save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function load() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || typeof s.step !== "number") return null;
      return s;
    } catch (e) { return null; }
  }
  function clearSaved() { try { localStorage.removeItem(LS_KEY); localStorage.removeItem(LS_RESULT); } catch (e) {} }

  var LS_RESULT = "ikigai-result-v1";
  function saveResult(ergebnis, ctx) {
    try {
      localStorage.setItem(LS_RESULT, JSON.stringify({
        ergebnis: ergebnis, beispiel: !!ctx.beispiel,
        profil: ctx.profil, ikigai9: ctx.ikigai9, ts: Date.now()
      }));
    } catch (e) {}
  }
  function loadResult() {
    try {
      var r = JSON.parse(localStorage.getItem(LS_RESULT) || "null");
      return r && r.ergebnis ? r : null;
    } catch (e) { return null; }
  }

  /* ---------- Permalink (#r=…) — Ergebnis komprimiert ins URL-Fragment.
   * Das Fragment geht NIE zum Server → das Datenschutz-Versprechen bleibt wahr. ---------- */
  function buildPermalink(ergebnis, ctx) {
    if (!window.LZString) return "";
    try {
      var payload = { e: ergebnis, p: ctx.profil, i: ctx.ikigai9 };
      return "#r=" + window.LZString.compressToEncodedURIComponent(JSON.stringify(payload));
    } catch (e) { return ""; }
  }
  function writePermalink(ergebnis, ctx) {
    var frag = buildPermalink(ergebnis, ctx);
    if (frag) { try { history.replaceState(null, "", location.pathname + location.search + frag); } catch (e) {} }
  }
  function readPermalink() {
    if (!window.LZString) return null;
    var h = location.hash || "";
    if (h.indexOf("#r=") !== 0) return null;
    try {
      var json = window.LZString.decompressFromEncodedURIComponent(h.slice(3));
      if (!json) return null;
      var o = JSON.parse(json);
      if (!o || !o.e || !o.e.zentrum || !o.e.kreise) return null;
      return { ergebnis: o.e, profil: o.p || {}, ikigai9: o.i || [] };
    } catch (e) { return null; }
  }
  /* öffentlicher Hook für den „Link kopieren“-Button auf der Ergebnis-Seite */
  window.IKIGAI_PERMALINK = function (ergebnis, ctx) {
    return location.origin + location.pathname + buildPermalink(ergebnis, ctx);
  };

  /* ---------- DOM ---------- */
  var $ = function (sel) { return document.querySelector(sel); };
  var elHero = $("#screen-hero"), elWiz = $("#screen-wizard"),
      elWait = $("#screen-wait"), elResult = $("#screen-result"),
      stage = $("#wizard-stage"),
      btnBack = $("#nav-back"), btnNext = $("#nav-next"),
      progCircle = $("#progress-circle"), progLabel = $("#progress-label"),
      blockLabel = $("#wizard-block-label"), stepLabel = $("#wizard-step-label"),
      banner = $("#resume-banner");

  function show(el) {
    [elHero, elWiz, elWait, elResult].forEach(function (s) {
      if (s === el) { s.hidden = false; s.classList.add("is-active"); }
      else { s.hidden = true; s.classList.remove("is-active"); }
    });
    window.scrollTo(0, 0);
  }

  /* ---------- Fortschritt ---------- */
  function answeredCount() {
    var n = 0;
    if (state.profil.beruf && state.profil.beruf.trim().length > 1) n++;
    state.ikigai9.forEach(function (v) { if (v) n++; });
    Object.keys(state.antworten).forEach(function (k) {
      var v = state.antworten[k];
      if (Array.isArray(v) ? v.length : (v && v.trim().length)) n++;
    });
    return n;
  }
  function updateProgress() {
    var frac = Math.min(1, answeredCount() / ANSWER_STEPS);
    var C = 125.6;
    progCircle.style.strokeDashoffset = String(C * (1 - frac));
    progLabel.textContent = Math.round(frac * 100) + "%";
  }

  /* ---------- Screens rendern ---------- */
  var enterDir = "fwd";

  function render() {
    var st = steps[state.step];
    stage.innerHTML = "";
    var card = document.createElement("div");
    card.className = "q-card " + (enterDir === "back" ? "q-enter-back" : "q-enter");

    if (st.kind === "profil") renderProfil(card);
    else if (st.kind === "likert") renderLikert(card, st);
    else if (st.kind === "interstitial") renderInterstitial(card, st);
    else renderFrage(card, st);

    stage.appendChild(card);

    /* Kopfzeile */
    if (st.kind === "profil") {
      blockLabel.textContent = "Kurz vorweg";
      stepLabel.textContent = "Dein Name bleibt im Browser";
    } else if (st.kind === "likert") {
      blockLabel.textContent = "Standort: Ikigai-9";
      stepLabel.textContent = "Frage " + st.nr + " von 9 · " + st.item.dimName;
    } else {
      blockLabel.textContent = st.block.name;
      var fi = st.kind === "frage" ? st.block.fragen.indexOf(st.frage) + 1 : 0;
      stepLabel.textContent = st.kind === "frage"
        ? "Frage " + fi + " von " + st.block.fragen.length
        : "Kreis " + st.block.id;
    }

    btnBack.style.visibility = state.step === 0 ? "hidden" : "visible";
    btnNext.textContent = state.step === steps.length - 1 ? "Auswerten" : "Weiter";
    updateProgress();

    var input = card.querySelector("textarea, input");
    if (input && !("ontouchstart" in window)) input.focus();
  }

  function err(card, msg) {
    var e = card.querySelector(".q-error");
    if (e) { e.setAttribute("role", "status"); e.textContent = msg || ""; }
  }

  /* Profil */
  function renderProfil(card) {
    var html = '<p class="q-dim">' + F.profil.intro + "</p>";
    F.profil.fields.forEach(function (f) {
      var val = state.profil[f.id] || "";
      html += '<div class="q-field"><label>' + f.label +
        (f.optional ? '<span class="opt">optional</span>' : "") + "</label>" +
        '<input class="q-input" data-field="' + f.id + '" maxlength="' + f.maxLen +
        '" placeholder="' + f.placeholder + '" value="' + escapeAttr(val) + '"></div>';
    });
    html += '<p class="q-error"></p>';
    card.innerHTML = html;
    card.querySelectorAll("input").forEach(function (inp) {
      inp.addEventListener("input", function () {
        state.profil[inp.dataset.field] = inp.value;
        err(card, ""); save(); updateProgress();
      });
    });
  }

  /* Likert */
  function renderLikert(card, st) {
    var html = '<p class="q-dim">' + st.item.dimName + "</p>" +
      '<p class="q-prompt">' + st.item.text + "</p>" + '<div class="likert">';
    F.likertLabels.forEach(function (label, i) {
      var isSel = state.ikigai9[st.idx] === i + 1;
      html += '<button type="button" class="' + (isSel ? "sel" : "") + '" data-v="' + (i + 1) +
        '" aria-pressed="' + isSel + '">' + '<span class="dot"></span>' + label + "</button>";
    });
    html += "</div>" + '<p class="q-error"></p>';
    card.innerHTML = html;
    card.querySelectorAll(".likert button").forEach(function (b) {
      b.addEventListener("click", function () {
        card.querySelectorAll(".likert button").forEach(function (x) { x.classList.remove("sel"); x.setAttribute("aria-pressed", "false"); });
        b.classList.add("sel"); b.setAttribute("aria-pressed", "true");
        state.ikigai9[st.idx] = Number(b.dataset.v);
        save(); updateProgress();
        setTimeout(next, FAST ? 10 : 280); /* Auto-Advance */
      });
    });
  }

  /* Interstitial */
  function renderInterstitial(card, st) {
    card.innerHTML = '<div class="interstitial">' +
      '<span class="int-kanji" lang="ja">' + st.block.kanji + "</span>" +
      "<h2>" + st.block.name + "</h2><p>" + st.block.intro + "</p></div>";
  }

  /* Wizard-Piping (P2): an späteren Fragen eine frühere Antwort WÖRTLICH aufgreifen
   * (bevor die KI es tut). Clientseitig, 0 €. Greift nur, wenn die Quell-Antwort
   * substanziell ist; sonst still ausgelassen. */
  var PIPING = {
    b1: { src: "a1", line: function (w) { return "Du hast vorhin „" + w + "“ erwähnt — jetzt drehen wir den Blick auf deine Stärken."; } },
    c1: { src: "a3", line: function (w) { return "Behalte „" + w + "“ im Hinterkopf — was dich heute bewegt, hat oft dieselbe Wurzel."; } },
    e3: { src: "a1", line: function (w) { return "Erinnerst du dich an „" + w + "“? Manchmal ist das eigene Ikigai näher, als man denkt."; } }
  };
  function pipingLine(fid) {
    var cfg = PIPING[fid]; if (!cfg) return "";
    var src = state.antworten[cfg.src];
    if (typeof src !== "string" || src.trim().length < 8) return "";
    /* ein prägnantes Wort aus der Quell-Antwort ziehen (längstes Wort > 4 Zeichen) */
    var words = src.trim().split(/\s+/).filter(function (x) { return x.replace(/[^\wäöüÄÖÜß-]/g, "").length > 4; });
    if (!words.length) return "";
    var word = words.sort(function (a, b) { return b.length - a.length; })[0].replace(/[^\wäöüÄÖÜß-]/g, "");
    return '<p class="q-piping">' + escapeHtml(cfg.line(word)) + "</p>";
  }

  /* Frage (text / chips) */
  function renderFrage(card, st) {
    var f = st.frage;
    var html = "";
    if (f.type === "text") {
      html += '<p class="q-prompt">' + f.prompt + "</p>";
      html += pipingLine(f.id);
      if (f.hint) html += '<p class="q-hint">' + f.hint + "</p>";
      if (f.prefix) html += '<p class="q-prefix">' + f.prefix + "</p>";
      var val = state.antworten[f.id] || "";
      html += '<textarea class="q-textarea" maxlength="' + f.maxLen + '" placeholder="' +
        escapeAttr(f.placeholder || "") + '">' + escapeHtml(val) + "</textarea>" +
        '<p class="q-count"><span>' + val.length + "</span>/" + f.maxLen + "</p>" +
        '<p class="q-error"></p>';
      card.innerHTML = html;
      var ta = card.querySelector("textarea");
      ta.addEventListener("input", function () {
        state.antworten[f.id] = ta.value;
        card.querySelector(".q-count span").textContent = ta.value.length;
        err(card, ""); save(); updateProgress();
      });
    } else if (f.type === "chips") {
      html += '<p class="q-prompt">' + f.prompt + "</p>";
      html += pipingLine(f.id);
      if (f.hint) html += '<p class="q-hint">' + f.hint + "</p>";
      var selVals = state.antworten[f.id] || [];
      html += '<div class="chips">';
      f.options.forEach(function (opt) {
        var isSel = selVals.indexOf(opt) >= 0;
        html += '<button type="button" class="chip' + (isSel ? " sel" : "") +
          '" aria-pressed="' + isSel + '">' + opt + "</button>";
      });
      html += "</div>";
      if (f.customAllowed) {
        var custom = selVals.filter(function (v) { return f.options.indexOf(v) < 0; })[0] || "";
        html += '<div class="chip-custom-row"><input class="q-input" maxlength="' + f.maxLen +
          '" placeholder="' + f.customLabel + '" value="' + escapeAttr(custom) + '"></div>';
      }
      html += '<p class="q-error"></p>';
      card.innerHTML = html;

      function current() {
        var sel = [];
        card.querySelectorAll(".chip.sel").forEach(function (c) { sel.push(c.textContent); });
        var ci = card.querySelector(".chip-custom-row input");
        if (ci && ci.value.trim()) sel.push(ci.value.trim());
        return sel.slice(0, f.max || 5);
      }
      card.querySelectorAll(".chip").forEach(function (c) {
        c.addEventListener("click", function () {
          if (!c.classList.contains("sel")) {
            var selCount = card.querySelectorAll(".chip.sel").length;
            if (f.max && selCount >= f.max) {
              err(card, "Maximal " + f.max + " — wähle bewusst."); return;
            }
          }
          c.classList.toggle("sel");
          c.setAttribute("aria-pressed", c.classList.contains("sel") ? "true" : "false");
          state.antworten[f.id] = current();
          err(card, ""); save(); updateProgress();
        });
      });
      var ci = card.querySelector(".chip-custom-row input");
      if (ci) ci.addEventListener("input", function () {
        state.antworten[f.id] = current(); save(); updateProgress();
      });
    }
  }

  /* ---------- Validierung ---------- */
  function validate() {
    var st = steps[state.step];
    var card = stage.firstChild;
    if (st.kind === "interstitial") return true;
    if (st.kind === "profil") {
      if (!state.profil.beruf || state.profil.beruf.trim().length < 3) {
        err(card, "Ein kurzer Satz zu deiner Tätigkeit hilft der Auswertung sehr."); return false;
      }
      return true;
    }
    if (st.kind === "likert") {
      if (!state.ikigai9[st.idx]) { err(card, "Wähle, was am ehesten passt — Bauchgefühl reicht."); return false; }
      return true;
    }
    var f = st.frage;
    if (f.type === "text") {
      var v = (state.antworten[f.id] || "").trim();
      if (v.length < (f.minLen || 3)) {
        err(card, v.length === 0
          ? "Ohne deine Worte kann die Auswertung nichts spiegeln — ein ehrlicher Halbsatz genügt."
          : "Noch ein paar Worte mehr — je konkreter, desto persönlicher das Ergebnis.");
        return false;
      }
    } else if (f.type === "chips") {
      var sel = state.antworten[f.id] || [];
      if (sel.length < (f.min || 1)) { err(card, "Wähle mindestens eins — oder schreib dein eigenes."); return false; }
    }
    return true;
  }

  /* ---------- Navigation ---------- */
  function next() {
    if (!validate()) return;
    if (state.step >= steps.length - 1) { startSynthese(); return; }
    enterDir = "fwd";
    state.step++;
    save(); render();
  }
  function back() {
    if (state.step === 0) return;
    enterDir = "back";
    state.step--;
    save(); render();
  }
  btnNext.addEventListener("click", next);
  btnBack.addEventListener("click", back);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey && elWiz && !elWiz.hidden) {
      var tag = (document.activeElement || {}).tagName;
      if (tag === "TEXTAREA") return;
      e.preventDefault(); next();
    }
  });

  /* ---------- Synthese-Warte-Dramaturgie (inszenierter Höhepunkt) ---------- */
  var waitTimer = null, stageTimers = [];
  function startWaitFacts() {
    var i = 0, el = $("#wait-fact");
    el.textContent = F.warteFakten[0];
    waitTimer = setInterval(function () {
      i = (i + 1) % F.warteFakten.length;
      el.style.opacity = 0;
      setTimeout(function () { el.textContent = F.warteFakten[i]; el.style.opacity = 1; }, FAST ? 10 : 450);
    }, FAST ? 300 : 4200);
  }
  function stopWaitFacts() {
    if (waitTimer) clearInterval(waitTimer); waitTimer = null;
    stageTimers.forEach(clearTimeout); stageTimers = [];
  }

  /* echte User-Worte für die Wartesequenz ziehen (nie generische Fake-Steps) */
  function realWords() {
    var pool = [];
    ["a1", "a3", "b1", "b2", "c1", "c2", "d2", "e1", "e3"].forEach(function (k) {
      var v = state.antworten[k];
      if (typeof v === "string" && v.trim().length > 6) {
        var w = v.trim().split(/\s+/).filter(function (x) { return x.length > 4; });
        if (w.length) pool.push(w.sort(function (a, b) { return b.length - a.length; })[0].replace(/[^\wäöüÄÖÜß-]/g, ""));
      }
    });
    (state.antworten.a2 || []).concat(state.antworten.b3 || []).forEach(function (c) {
      var t = String(c).replace(/[„“"]/g, "").trim();
      if (t) pool.push(t.split(/\s+/)[0]);
    });
    return pool.filter(Boolean);
  }
  function realFragments() {
    var frags = [];
    ["a1", "b1", "c1", "e1", "e3"].forEach(function (k) {
      var v = state.antworten[k];
      if (typeof v === "string" && v.trim().length > 10) frags.push("„" + v.trim().slice(0, 70) + (v.length > 70 ? "…" : "") + "“");
    });
    return frags;
  }

  /* getimete Status-Sequenz — läuft unabhängig vom echten API-Call */
  function runWaitStory() {
    var title = $(".wait-title"), fragEl = $("#wait-fragment");
    var words = realWords(), frags = realFragments();
    var nAnsw = answeredCount();
    function w(i) { return words.length ? words[i % words.length] : "deinen Worten"; }
    var steps = [
      { t: "Lese deine " + nAnsw + " Antworten …", frag: frags[0] },
      { t: "Suche das Muster zwischen „" + w(0) + "“ und „" + w(1) + "“ …", frag: frags[1] },
      { t: "Lege „" + w(2) + "“ neben „" + w(3) + "“ …", frag: frags[2] },
      { t: "Verdichte deinen Satz …", frag: null }
    ];
    var delays = FAST ? [0, 60, 120, 180] : [200, 3200, 6400, 9200]; // Beschleunigung gegen Ende
    steps.forEach(function (s, i) {
      stageTimers.push(setTimeout(function () {
        title.textContent = s.t;
        if (s.frag && fragEl) {
          fragEl.textContent = s.frag;
          fragEl.classList.remove("fly"); void fragEl.offsetWidth; fragEl.classList.add("fly");
        }
      }, delays[i]));
    });
  }

  function payload() {
    return { profil: state.profil, ikigai9: state.ikigai9, antworten: state.antworten };
  }

  function startSynthese() {
    document.body.classList.add("wait-mode");
    show(elWait); startWaitFacts(); runWaitStory();
    var t0 = Date.now();
    var minWait = FAST ? 0 : 9800; /* die ganze Sequenz darf laufen */
    var waitTitle = $(".wait-title");
    var longTimer = setTimeout(function () {
      waitTitle.textContent = "Dauert gerade etwas länger — die KI liest deine Antworten gründlich.";
    }, 19000);

    function finish(ergebnis, istBeispiel) {
      var rest = Math.max(0, minWait - (Date.now() - t0));
      clearTimeout(longTimer);
      setTimeout(function () {
        stopWaitFacts();
        document.body.classList.remove("wait-mode");
        state.done = true; save();
        window.__ikig.lastResult = ergebnis;
        var ctx = {
          beispiel: istBeispiel,
          profil: istBeispiel ? PERSONA().profil : state.profil,
          ikigai9: istBeispiel ? PERSONA().ikigai9 : state.ikigai9,
          fast: FAST,
          reveal: true /* Typewriter-Reveal + Scroll-Lock beim ersten Anzeigen */
        };
        if (!istBeispiel && !MOCK) { saveResult(ergebnis, ctx); writePermalink(ergebnis, ctx); }
        window.IKIGAI_RESULT.render(ergebnis, ctx);
        show(elResult);
      }, rest);
    }

    if (MOCK) { finish(PERSONA().ergebnis, false); return; }

    fetch("/api/synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload())
    }).then(function (res) { return res.json().then(function (j) { return { s: res.status, j: j }; }); })
      .then(function (r) {
        if (r.j && r.j.ok && r.j.ergebnis) { finish(r.j.ergebnis, false); return; }
        if (r.j && r.j.error_user) {
          clearTimeout(longTimer); stopWaitFacts();
          document.body.classList.remove("wait-mode"); show(elWiz);
          var card = stage.firstChild;
          if (card) err(card, r.j.error_user);
          return;
        }
        finish(PERSONA().ergebnis, true); /* Cap/Server-Fehler → Beispiel-Ergebnis */
      })
      .catch(function () { finish(PERSONA().ergebnis, true); });
  }

  /* ---------- Demo-Vorbefüllung ---------- */
  function prefillLena() {
    state = freshState();
    state.profil = JSON.parse(JSON.stringify(PERSONA().profil));
    state.ikigai9 = PERSONA().ikigai9.slice();
    state.antworten = JSON.parse(JSON.stringify(PERSONA().antworten));
    state.step = steps.length - 1;
    state.started = true;
  }

  /* ---------- Boot ---------- */
  function startWizard() {
    state.started = true; save();
    show(elWiz); render();
  }
  $("#start-btn").addEventListener("click", startWizard);

  /* Permalink hat Vorrang: ein geteiltes/gespeichertes Ergebnis direkt öffnen */
  var permaResult = !DEMO && readPermalink();
  var saved = !DEMO && load();
  var savedResult = !DEMO && !MOCK && loadResult();
  if (permaResult) {
    window.IKIGAI_RESULT.render(permaResult.ergebnis, {
      beispiel: false, profil: permaResult.profil,
      ikigai9: permaResult.ikigai9, fast: FAST
    });
    show(elResult);
  } else if (DEMO) {
    prefillLena();
    show(elWiz); render();
  } else if (savedResult && saved && saved.done) {
    /* fertiges Ergebnis liegt vor → wieder öffnen anbieten */
    banner.hidden = false;
    banner.querySelector("span").textContent = "Dein Ergebnis ist noch da — wieder öffnen?";
    $("#resume-yes").textContent = "Ergebnis öffnen";
    $("#resume-yes").addEventListener("click", function () {
      banner.hidden = true;
      window.IKIGAI_RESULT.render(savedResult.ergebnis, {
        beispiel: savedResult.beispiel, profil: savedResult.profil,
        ikigai9: savedResult.ikigai9, fast: FAST
      });
      show(elResult);
    });
    $("#resume-no").addEventListener("click", function () {
      clearSaved(); state = freshState(); banner.hidden = true;
    });
  } else if (saved && saved.started && !saved.done && (saved.step > 0 || answeredOf(saved) > 0)) {
    banner.hidden = false;
    $("#resume-yes").addEventListener("click", function () {
      state = saved; banner.hidden = true; show(elWiz); render();
    });
    $("#resume-no").addEventListener("click", function () {
      clearSaved(); state = freshState(); banner.hidden = true;
    });
  }

  function answeredOf(s) {
    var n = 0;
    if (s.profil && s.profil.beruf) n++;
    (s.ikigai9 || []).forEach(function (v) { if (v) n++; });
    Object.keys(s.antworten || {}).forEach(function (k) {
      var v = s.antworten[k];
      if (Array.isArray(v) ? v.length : (v && v.trim && v.trim().length)) n++;
    });
    return n;
  }

  /* ---------- Utils ---------- */
  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function escapeAttr(s) { return escapeHtml(s).replace(/"/g, "&quot;"); }

  /* Test-Hook */
  window.__ikig = {
    get state() { return state; },
    steps: steps.length,
    answerSteps: ANSWER_STEPS,
    next: next, back: back,
    goto: function (i) { state.step = Math.max(0, Math.min(steps.length - 1, i)); render(); },
    stepInfo: function () {
      var st = steps[state.step];
      return { i: state.step, kind: st.kind, id: st.frage ? st.frage.id : (st.item ? st.item.id : (st.block ? st.block.id : "")), type: st.frage ? st.frage.type : "" };
    },
    start: startWizard,
    synthese: startSynthese,
    prefillLena: function () { prefillLena(); show(elWiz); render(); },
    lastResult: null
  };
})();
