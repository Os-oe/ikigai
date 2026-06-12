/* /api/synthesize — EIN Gemini-Flash-Call: Wizard-Antworten → Ikigai-Synthese-JSON.
 *
 * Schutzschicht (erprobtes Muster aus projekt-akte/angebots-blitz):
 *  - Origin/Referer-Lock auf eigene Domains (sonst 403)
 *  - Caps: global/Tag + pro IP (In-Memory pro Function-Instanz — dokumentierter
 *    Kompromiss; der Gemini-Key hat zusätzlich ein niedriges Quota als zweite Leine)
 *  - Serverseitige Input-Limits (Feld-Whitelist, Längen-Caps); nichts wird gespeichert
 *  - Cap/Fehler → {ok:false, fallback:true} → Client zeigt gestagtes Beispiel (Lena)
 *
 * Anti-Generik serverseitig erzwungen:
 *  - jedes erkenntnisse[].zitat muss wörtlich in den User-Antworten vorkommen;
 *    sonst deterministischer Ersatz durch die am besten passende Original-Antwort
 *  - leere/unsinnige Antworten → strukturierter error_user, nie erfinden
 *
 * Gemini-Falle: Request-Felder camelCase (responseMimeType etc.).
 */

const ALLOWED_HOSTS = ["ikigai.demo.osai.solutions", "localhost", "127.0.0.1"];
const VERCEL_RE = /^ikigai[a-z0-9-]*\.vercel\.app$/;
const MODELS = ["gemini-3.5-flash", "gemini-2.5-flash"];
const DAILY_CAP = Number(process.env.IKIGAI_DAILY_CAP || 40);
const IP_CAP = Number(process.env.IKIGAI_IP_CAP || 5);

const state = { day: "", count: 0, perIp: new Map() };

/* erlaubte Antwort-Felder + Block-Zuordnung */
const TEXT_KEYS = ["a1", "a3", "b1", "b2", "c1", "c2", "d1", "d2", "e1", "e2", "e3", "e4"];
const CHIP_KEYS = ["a2", "b3"];
const LABELS = {
  a1: "Wobei vergisst du die Zeit? (Ich vergesse die Zeit, wenn ich …)",
  a2: "Wonach fühlst du dich energiegeladen statt leer? (Auswahl)",
  a3: "Was hast du als Kind geliebt — und nie ganz losgelassen?",
  b1: "Wofür bitten dich Menschen um Hilfe?",
  b2: "Was fällt dir leicht, das andere schwer finden?",
  b3: "Welches Kompliment bekommst du öfter — und tust es ab? (Auswahl)",
  c1: "Was macht dich wütend oder unruhig, wenn du es siehst?",
  c2: "Wem möchtest du konkret helfen?",
  d1: "Wofür wurdest du schon bezahlt — auch informell?",
  d2: "Was könntest du anderen schon morgen beibringen?",
  e1: "Welchen kleinen Alltagsmoment genießt du wirklich?",
  e2: "Welches Ritual gibt dir Energie?",
  e3: "Wer oder was ist heute schon dein Ikigai?",
  e4: "Worauf freust du dich in den nächsten zwölf Monaten?"
};

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    error: { type: "STRING", description: "Leer wenn ok. Sonst kurze deutsche Erklärung, warum keine ehrliche Synthese möglich ist." },
    zentrum: { type: "STRING" },
    kreise: {
      type: "OBJECT",
      properties: {
        liebe: { type: "ARRAY", items: { type: "STRING" } },
        staerke: { type: "ARRAY", items: { type: "STRING" } },
        welt: { type: "ARRAY", items: { type: "STRING" } },
        markt: { type: "ARRAY", items: { type: "STRING" } }
      },
      required: ["liebe", "staerke", "welt", "markt"]
    },
    schnittmengen: {
      type: "OBJECT",
      properties: {
        passion: { type: "STRING" }, mission: { type: "STRING" },
        beruf: { type: "STRING" }, berufung: { type: "STRING" }
      },
      required: ["passion", "mission", "beruf", "berufung"]
    },
    erkenntnisse: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { titel: { type: "STRING" }, zitat: { type: "STRING" }, text: { type: "STRING" } },
        required: ["titel", "zitat", "text"]
      }
    },
    ideen: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          typ: { type: "STRING" }, titel: { type: "STRING" },
          begruendung: { type: "STRING" }, erster_schritt: { type: "STRING" }
        },
        required: ["typ", "titel", "begruendung", "erster_schritt"]
      }
    },
    alltag: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          moment: { type: "STRING" },
          saeule: { type: "INTEGER" },
          kommentar: { type: "STRING" }
        },
        required: ["moment", "saeule", "kommentar"]
      }
    },
    kaizen: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          woche: { type: "INTEGER" }, fokus: { type: "STRING" },
          schritte: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: { schritt: { type: "STRING" }, ki_hilfe: { type: "STRING" } },
              required: ["schritt", "ki_hilfe"]
            }
          }
        },
        required: ["woche", "fokus", "schritte"]
      }
    },
    score_kommentar: { type: "STRING" }
  },
  required: ["error", "zentrum", "kreise", "schnittmengen", "erkenntnisse", "ideen", "alltag", "kaizen", "score_kommentar"]
};

const PROMPT_KOPF = `Du bist die Synthese-Engine von ikigAI, einem deutschen Ikigai-Generator. Du bekommst die Antworten EINER Person aus einem geführten Fragebogen und verdichtest sie zu einer persönlichen Ikigai-Auswertung als JSON.

EISERNE REGELN — Verstöße machen das Produkt wertlos:
1. Verwende AUSSCHLIESSLICH die Antworten der Person. NIEMALS etwas erfinden, ergänzen oder aus Allgemeinwissen raten.
2. Jedes "zitat" in erkenntnisse ist eine WÖRTLICH KOPIERTE Teilpassage aus einer Antwort (4-18 Wörter, exakt wie geschrieben, nicht umformuliert, ohne Anführungszeichen drumherum).
3. Jede "begruendung" in ideen beginnt mit "Weil du" und zitiert mindestens eine Antwort wörtlich in „…“-Anführungszeichen. Die Kette ist: weil du X gesagt hast → darum diese Idee.
4. VERBOTEN: Floskeln und Affirmationen ("Du bist großartig", "Folge deinem Herzen", "Alles ist möglich", "Glaub an dich"), Esoterik- und Schicksals-Sprache, generische Karriere-Tipps ohne wörtlichen Antwort-Bezug.
5. "ki_hilfe" im kaizen-Plan: immer eine KONKRETE Alltags-KI-Anwendung — was genau die Person der KI gibt, was sie zurückbekommt, was es spart ("Diktiere …, lass dir … strukturieren — aus 45 Minuten werden 10"). NIE nur "Nutze KI dafür". Genau 1 Schritt im ganzen Plan darf bewusst ohne KI sein: dann ki_hilfe = "Keine. Manche Schritte gehören dir allein."
6. Sind die Antworten überwiegend leer, unsinnig oder Spam (z. B. "asdf", nur Emojis, beleidigend), setze "error" auf eine kurze, freundliche deutsche Erklärung und lasse alle anderen Felder leer ([] bzw. ""). NIE aus dünnen Antworten etwas herbeireden.
7. Sprache: Deutsch, Du-Form, warm und bodenständig. Design-Thinking-Ton ("kleine Experimente", "erster Schritt"), keine Pathos-Sätze.

FORM:
- zentrum: EIN Satz, max 110 Zeichen, der die stärkste Verbindung über alle vier Dimensionen benennt. Konkret, kein Pathos.
- kreise: je GENAU 3 kurze Begriffe (je max 20 Zeichen) pro Dimension, verdichtet aus den Antworten: liebe (Block A), staerke (Block B), welt (Block C), markt (Block D).
- schnittmengen: je 2-3 Wörter — passion (liebe+staerke), mission (liebe+welt), beruf (staerke+markt), berufung (welt+markt).
- erkenntnisse: GENAU 3. titel = prägnante These (max 60 Zeichen), zitat = wörtlich (Regel 2), text = 1-3 Sätze, was das Muster bedeutet.
- ideen: GENAU 3, typ je einmal "Projekt", "Beruf", "Side-Project". erster_schritt = machbar innerhalb einer Woche, konkret.
- alltag: 3-4 Einträge. moment = wörtliche Passage aus den E-Antworten (e1-e4). saeule = Mogi-Säule 1-5 (1 Klein anfangen, 2 Sich selbst loslassen, 3 Harmonie & Nachhaltigkeit, 4 Freude an kleinen Dingen, 5 Im Hier und Jetzt sein). kommentar = 1-2 Sätze, entlastend, nie "mach mehr daraus"-Druck.
- kaizen: GENAU 4 Wochen (woche 1-4), je GENAU 2 schritte. fokus = 2-4 Wörter. Schritte bauen aufeinander auf, Woche 1 ist die kleinste. Die Schritte müssen direkt aus den Ideen/Antworten folgen.
- score_kommentar: 1-2 Sätze zum Ikigai-9-Ergebnis, benenne konkret das stärkste und schwächste Item. Der Wert ist ein Foto, kein Urteil.

DIE PERSON:
`;

function hostOf(value) {
  try { return new URL(value).hostname; } catch (e) { return ""; }
}
function originAllowed(req) {
  const src = req.headers.origin || req.headers.referer || "";
  const host = hostOf(src);
  return ALLOWED_HOSTS.includes(host) || VERCEL_RE.test(host);
}
function capExceeded(req) {
  const today = new Date().toISOString().slice(0, 10);
  if (state.day !== today) { state.day = today; state.count = 0; state.perIp.clear(); }
  const ip = (req.headers["x-forwarded-for"] || "?").split(",")[0].trim();
  const ipCount = state.perIp.get(ip) || 0;
  if (state.count >= DAILY_CAP || ipCount >= IP_CAP) return true;
  state.count += 1;
  state.perIp.set(ip, ipCount + 1);
  return false;
}

/* ---------- Input-Validierung ---------- */
function clean(v, max) {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
}
function validateInput(body) {
  if (!body || typeof body !== "object") return { err: "Kein Inhalt empfangen." };
  const profil = {
    name: clean(body.profil && body.profil.name, 40),
    beruf: clean(body.profil && body.profil.beruf, 130)
  };
  const ik = Array.isArray(body.ikigai9) ? body.ikigai9.map(Number) : [];
  if (ik.length !== 9 || ik.some(v => !Number.isInteger(v) || v < 1 || v > 5)) {
    return { err: "Der Ikigai-9-Teil ist unvollständig — bitte alle neun Aussagen bewerten." };
  }
  const a = body.antworten || {};
  const antworten = {};
  let filled = 0;
  for (const k of TEXT_KEYS) {
    antworten[k] = clean(a[k], 300);
    if (antworten[k].length >= 3) filled++;
  }
  for (const k of CHIP_KEYS) {
    const arr = Array.isArray(a[k]) ? a[k].slice(0, 4).map(v => clean(v, 90)).filter(Boolean) : [];
    antworten[k] = arr;
    if (arr.length) filled++;
  }
  if (filled < 10) {
    return { err: "Ein paar Antworten fehlen noch — ohne deine Worte kann die Auswertung nichts spiegeln." };
  }
  if (!profil.beruf) return { err: "Der Satz zu deiner aktuellen Tätigkeit fehlt." };
  return { profil, ikigai9: ik, antworten };
}

/* ---------- Prompt-Korpus ---------- */
function korpus(input) {
  const p = [];
  p.push("Name: " + (input.profil.name || "(nicht angegeben)"));
  p.push("Aktuelle Tätigkeit: " + input.profil.beruf);
  p.push("Ikigai-9 (je 1-5): " + input.ikigai9.join(", ") +
    " — Items: 1 Einfluss auf jemanden · 2 Leben innerlich reich · 3 Viele Interessen · 4 Beitrag zu Gesellschaft · 5 Will mich entwickeln · 6 Oft glücklich · 7 Existenz wird gebraucht · 8 Will Neues lernen/anfangen · 9 Innerer Raum/Gelassenheit. Summe: " +
    input.ikigai9.reduce((x, y) => x + y, 0) + " von 45.");
  p.push("");
  const blocks = { a: "BLOCK A — Was sie liebt", b: "BLOCK B — Worin sie gut ist", c: "BLOCK C — Was die Welt braucht", d: "BLOCK D — Wofür man sie bezahlen kann", e: "BLOCK E — Alltags-Ebene (japanisches Ikigai)" };
  let cur = "";
  for (const k of ["a1", "a2", "a3", "b1", "b2", "b3", "c1", "c2", "d1", "d2", "e1", "e2", "e3", "e4"]) {
    const b = k[0];
    if (b !== cur) { cur = b; p.push(blocks[b] + ":"); }
    const v = input.antworten[k];
    p.push("- " + LABELS[k] + "\n  Antwort: " + (Array.isArray(v) ? v.join(" · ") : v));
  }
  return p.join("\n");
}

/* ---------- Gemini ---------- */
async function callGemini(apiKey, model, input) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const body = {
    contents: [{ parts: [{ text: PROMPT_KOPF + korpus(input) }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.55,
      maxOutputTokens: 16384
    }
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    const err = new Error(`Gemini ${model} HTTP ${res.status}: ${errText.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini: leere Antwort");
  return JSON.parse(text);
}

/* ---------- Anti-Generik: Zitate gegen Antworten validieren ---------- */
function norm(s) {
  return String(s).toLowerCase()
    .replace(/[„“”"‚‘’'»«]/g, "")
    .replace(/[—–]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}
function allAnswerStrings(input) {
  const out = [input.profil.beruf];
  for (const k of TEXT_KEYS) if (input.antworten[k]) out.push(input.antworten[k]);
  for (const k of CHIP_KEYS) (input.antworten[k] || []).forEach(v => out.push(v));
  return out;
}
function bestMatch(zitat, answers) {
  const zw = new Set(norm(zitat).split(" "));
  let best = answers[0], bestScore = -1;
  for (const a of answers) {
    const aw = new Set(norm(a).split(" "));
    let score = 0;
    zw.forEach(w => { if (aw.has(w)) score++; });
    if (score > bestScore) { bestScore = score; best = a; }
  }
  return best.length > 140 ? best.slice(0, 120).replace(/\s\S*$/, "") + " …" : best;
}
function enforceQuotes(erg, input) {
  const answers = allAnswerStrings(input);
  const corpus = norm(answers.join(" ## "));
  let repaired = 0;
  (erg.erkenntnisse || []).forEach(e => {
    const z = norm(e.zitat || "");
    if (!z || corpus.indexOf(z) < 0) {
      e.zitat = bestMatch(e.zitat || e.text || "", answers);
      repaired++;
    }
  });
  (erg.alltag || []).forEach(a => {
    const m = norm(a.moment || "");
    if (!m || corpus.indexOf(m) < 0) {
      a.moment = bestMatch(a.moment || "", [input.antworten.e1, input.antworten.e2, input.antworten.e3, input.antworten.e4].filter(Boolean));
      repaired++;
    }
  });
  return repaired;
}

/* ---------- Struktur bereinigen ---------- */
function bereinige(erg, input) {
  if (!erg || typeof erg !== "object") return null;
  if (erg.error && String(erg.error).trim()) {
    return { contentError: String(erg.error).trim().slice(0, 240) };
  }
  if (!erg.zentrum || !erg.kreise || !Array.isArray(erg.erkenntnisse) || !Array.isArray(erg.ideen) || !Array.isArray(erg.kaizen)) return null;

  const cut = (s, n) => String(s || "").trim().slice(0, n);
  const out = {
    error: "",
    zentrum: cut(erg.zentrum, 140),
    kreise: {},
    schnittmengen: {
      passion: cut(erg.schnittmengen && erg.schnittmengen.passion, 30),
      mission: cut(erg.schnittmengen && erg.schnittmengen.mission, 30),
      beruf: cut(erg.schnittmengen && erg.schnittmengen.beruf, 30),
      berufung: cut(erg.schnittmengen && erg.schnittmengen.berufung, 30)
    },
    erkenntnisse: erg.erkenntnisse.slice(0, 4).map(e => ({
      titel: cut(e.titel, 80), zitat: cut(e.zitat, 200), text: cut(e.text, 450)
    })).filter(e => e.titel && e.zitat && e.text),
    ideen: erg.ideen.slice(0, 3).map(i => ({
      typ: cut(i.typ, 20) || "Idee", titel: cut(i.titel, 90),
      begruendung: cut(i.begruendung, 500), erster_schritt: cut(i.erster_schritt, 240)
    })).filter(i => i.titel && i.begruendung),
    alltag: (erg.alltag || []).slice(0, 4).map(a => ({
      moment: cut(a.moment, 200),
      saeule: Math.min(5, Math.max(1, Number(a.saeule) || 4)),
      kommentar: cut(a.kommentar, 300)
    })).filter(a => a.moment),
    kaizen: erg.kaizen.slice(0, 4).map((w, i) => ({
      woche: i + 1, fokus: cut(w.fokus, 50),
      schritte: (w.schritte || []).slice(0, 3).map(s => ({
        schritt: cut(s.schritt, 240), ki_hilfe: cut(s.ki_hilfe, 280)
      })).filter(s => s.schritt && s.ki_hilfe)
    })),
    score_kommentar: cut(erg.score_kommentar, 400)
  };
  for (const k of ["liebe", "staerke", "welt", "markt"]) {
    out.kreise[k] = (erg.kreise[k] || []).slice(0, 3).map(t => cut(t, 24)).filter(Boolean);
    if (out.kreise[k].length < 2) return null;
  }
  if (out.erkenntnisse.length < 3 || out.ideen.length < 3 || out.kaizen.length < 4) return null;
  if (out.kaizen.some(w => w.schritte.length < 2)) return null;
  if (out.alltag.length < 3) return null;
  out._repaired = enforceQuotes(out, input);
  return out;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Nur POST" });
  if (!originAllowed(req)) return res.status(403).json({ ok: false, error: "Zugriff nur über die Demo-Seite" });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = null; } }

  const input = validateInput(body);
  if (input.err) return res.status(400).json({ ok: false, error_user: input.err });

  const apiKey = process.env.GOOGLE_AI_STUDIO || process.env.GOOGLE_AI_STUDIO_KEY;
  if (!apiKey) return res.status(503).json({ ok: false, fallback: true, error: "Live-Funktion nicht konfiguriert" });

  if (capExceeded(req)) {
    return res.status(429).json({ ok: false, fallback: true, error: "Tages-Limit der Live-Demo erreicht" });
  }

  let lastErr = null;
  for (const model of MODELS) {
    try {
      const roh = await callGemini(apiKey, model, input);
      const erg = bereinige(roh, input);
      if (erg && erg.contentError) {
        return res.status(422).json({ ok: false, error_user: erg.contentError });
      }
      if (!erg) throw new Error("Gemini: unbrauchbares Antwort-Objekt");
      const repaired = erg._repaired; delete erg._repaired;
      return res.status(200).json({ ok: true, ergebnis: erg, meta: { model, repaired_quotes: repaired } });
    } catch (e) {
      lastErr = e;
      if (e.status && e.status < 500 && e.status !== 429 && e.status !== 404) break;
    }
  }
  console.error("synthesize-error:", lastErr && lastErr.message);
  return res.status(502).json({ ok: false, fallback: true, error: "Live-Funktion gerade nicht erreichbar" });
};
