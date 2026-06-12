/* ikigAI Wizard — Single-Page-State-Machine.
 * Eine Frage pro Screen · localStorage-Resume · Fortschritts-Ensō ·
 * Test-Modi: ?fast=1 (Animationen aus) · ?demo=1 (Lena vorbefüllt) · ?mock=1 (kein API-Call) */
(function () {
  "use strict";

  var F = window.IKIGAI_FRAGEN;
  var LS_KEY = "ikigai-state-v1";
  var params = new URLSearchParams(location.search);
  var FAST = params.get("fast") === "1";
  var DEMO = params.get("demo") === "1";
  var MOCK = params.get("mock") === "1";
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

  /* Frage (text / chips) */
  function renderFrage(card, st) {
    var f = st.frage;
    var html = "";
    if (f.type === "text") {
      html += '<p class="q-prompt">' + f.prompt + "</p>";
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

  /* ---------- Synthese ---------- */
  var waitTimer = null;
  function startWaitFacts() {
    var i = 0, el = $("#wait-fact");
    el.textContent = F.warteFakten[0];
    waitTimer = setInterval(function () {
      i = (i + 1) % F.warteFakten.length;
      el.style.opacity = 0;
      setTimeout(function () { el.textContent = F.warteFakten[i]; el.style.opacity = 1; }, FAST ? 10 : 450);
    }, FAST ? 300 : 4200);
  }
  function stopWaitFacts() { if (waitTimer) clearInterval(waitTimer); waitTimer = null; }

  function payload() {
    return { profil: state.profil, ikigai9: state.ikigai9, antworten: state.antworten };
  }

  function startSynthese() {
    show(elWait); startWaitFacts();
    var t0 = Date.now();
    var minWait = FAST ? 0 : 2600;
    var waitTitle = $(".wait-title");
    waitTitle.textContent = "Deine Antworten werden verdichtet …";
    var longTimer = setTimeout(function () {
      waitTitle.textContent = "Dauert gerade etwas länger — die KI liest deine Antworten gründlich.";
    }, 18000);

    function finish(ergebnis, istBeispiel) {
      var rest = Math.max(0, minWait - (Date.now() - t0));
      clearTimeout(longTimer);
      setTimeout(function () {
        stopWaitFacts();
        state.done = true; save();
        window.__ikig.lastResult = ergebnis;
        var ctx = {
          beispiel: istBeispiel,
          profil: istBeispiel ? window.LENA.profil : state.profil,
          ikigai9: istBeispiel ? window.LENA.ikigai9 : state.ikigai9,
          fast: FAST
        };
        if (!istBeispiel && !MOCK) saveResult(ergebnis, ctx);
        window.IKIGAI_RESULT.render(ergebnis, ctx);
        show(elResult);
      }, rest);
    }

    if (MOCK) { finish(window.LENA.ergebnis, false); return; }

    fetch("/api/synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload())
    }).then(function (res) { return res.json().then(function (j) { return { s: res.status, j: j }; }); })
      .then(function (r) {
        if (r.j && r.j.ok && r.j.ergebnis) { finish(r.j.ergebnis, false); return; }
        if (r.j && r.j.error_user) {
          /* strukturierter Inhalts-Fehler: zurück in den Wizard, sanfter Hinweis */
          clearTimeout(longTimer); stopWaitFacts(); show(elWiz);
          var card = stage.firstChild;
          if (card) err(card, r.j.error_user);
          return;
        }
        finish(window.LENA.ergebnis, true); /* Cap/Server-Fehler → Beispiel-Ergebnis */
      })
      .catch(function () { finish(window.LENA.ergebnis, true); });
  }

  /* ---------- Demo-Vorbefüllung ---------- */
  function prefillLena() {
    state = freshState();
    state.profil = JSON.parse(JSON.stringify(window.LENA.profil));
    state.ikigai9 = window.LENA.ikigai9.slice();
    state.antworten = JSON.parse(JSON.stringify(window.LENA.antworten));
    state.step = steps.length - 1;
    state.started = true;
  }

  /* ---------- Boot ---------- */
  function startWizard() {
    state.started = true; save();
    show(elWiz); render();
  }
  $("#start-btn").addEventListener("click", startWizard);

  var saved = !DEMO && load();
  var savedResult = !DEMO && !MOCK && loadResult();
  if (DEMO) {
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
