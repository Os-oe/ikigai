#!/usr/bin/env python3
"""ikigAI — Phase-1/2-Testsuite.

Startet eigene Dev-Server (ausgefallene Ports, Stray-Server-Lektion):
  A :8982  ohne Key            → UI-Flow (mock), Fallback-Pfad, Resume
  B :8984  IKIGAI_DAILY_CAP=0  → Cap-Simulation liefert Fallback
  C :8986  mit Key             → EIN echter Gemini-Call (nur mit --live)

Aufruf:  python3 tests/suite.py [--live]
"""
import json, os, re, subprocess, sys, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIVE = "--live" in sys.argv

PASS = 0; FAIL = 0; FAILED = []
def check(name, cond, extra=""):
    global PASS, FAIL
    if cond: PASS += 1; print(f"  ✓ {name}")
    else:
        FAIL += 1; FAILED.append(name)
        print(f"  ✗ {name}" + (f" — {extra}" if extra else ""))

def wait_port(port, timeout=15):
    t0 = time.time()
    while time.time() - t0 < timeout:
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{port}/", timeout=1)
            return True
        except Exception:
            time.sleep(0.25)
    return False

def start_server(port, env_extra):
    env = dict(os.environ)
    env.pop("GOOGLE_AI_STUDIO", None); env.pop("GOOGLE_AI_STUDIO_KEY", None)
    env.update(env_extra)
    p = subprocess.Popen(["node", "dev-server.mjs", str(port)], cwd=ROOT, env=env,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    assert wait_port(port), f"Server :{port} startet nicht"
    return p

def post(port, payload, origin="http://localhost"):
    req = urllib.request.Request(
        f"http://127.0.0.1:{port}/api/synthesize",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "Origin": origin}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

def lena_payload():
    js = open(os.path.join(ROOT, "assets/js/lena.js"), encoding="utf-8").read()
    # window.LENA = {...}; — Objekt extrahieren via node
    out = subprocess.run(["node", "-e",
        "global.window={};" + js + ";console.log(JSON.stringify({profil:window.LENA.profil,ikigai9:window.LENA.ikigai9,antworten:window.LENA.antworten}))"],
        capture_output=True, text=True)
    return json.loads(out.stdout)

def norm(s):
    s = re.sub(r'[„“”"‚‘’\'»«]', "", str(s).lower())
    s = re.sub(r"[—–]", "-", s)
    return re.sub(r"\s+", " ", s).strip()

def validate_schema(erg, payload, label):
    check(f"{label}: zentrum vorhanden (<=140)", isinstance(erg.get("zentrum"), str) and 10 < len(erg["zentrum"]) <= 140)
    k = erg.get("kreise", {})
    check(f"{label}: kreise 4x>=2 Begriffe", all(len(k.get(x, [])) >= 2 for x in ["liebe", "staerke", "welt", "markt"]))
    check(f"{label}: 3 Erkenntnisse", len(erg.get("erkenntnisse", [])) >= 3)
    check(f"{label}: 3 Ideen", len(erg.get("ideen", [])) == 3)
    check(f"{label}: kaizen 4 Wochen à >=2 Schritte",
          len(erg.get("kaizen", [])) == 4 and all(len(w.get("schritte", [])) >= 2 for w in erg["kaizen"]))
    check(f"{label}: alltag >=3 mit Säule 1-5",
          len(erg.get("alltag", [])) >= 3 and all(1 <= a.get("saeule", 0) <= 5 for a in erg["alltag"]))
    # Anti-Generik: Zitate wörtlich in den Antworten
    corpus = norm(" ## ".join(
        [payload["profil"]["beruf"]] +
        [v for v in payload["antworten"].values() if isinstance(v, str)] +
        [x for v in payload["antworten"].values() if isinstance(v, list) for x in v]))
    for i, e in enumerate(erg.get("erkenntnisse", [])[:4]):
        check(f"{label}: Zitat {i+1} wörtlich in Antworten", norm(e.get("zitat", "")) in corpus,
              extra=e.get("zitat", "")[:60])
    for i, idea in enumerate(erg.get("ideen", [])):
        check(f"{label}: Idee {i+1} Begründungskette (Weil du + „Zitat“)",
              idea.get("begruendung", "").strip().lower().startswith("weil du") and "„" in idea.get("begruendung", ""))

# ──────────────────────────────────────────────────────────────────
from playwright.sync_api import sync_playwright

LENA = lena_payload()
servers = []
try:
    servers.append(start_server(8982, {}))

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)

        # ── 1 · Voller Wizard-Flow (echtes Tippen, mock-Ergebnis) ──
        print("\n■ 1 · Wizard-Flow end-to-end (Lena tippt, ?mock=1&fast=1)")
        pg = browser.new_page(viewport={"width": 1280, "height": 900})
        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.goto("http://127.0.0.1:8982/?mock=1&fast=1")
        pg.wait_for_load_state("networkidle")
        check("Hero sichtbar, Wortmarke ikigAI", pg.locator(".wordmark").inner_text().strip() == "ikigAI")
        pg.click("#start-btn")
        pg.wait_for_selector("#screen-wizard:not([hidden])")

        antw = LENA["antworten"]
        guard = 0
        while guard < 60:
            guard += 1
            info = pg.evaluate("window.__ikig.stepInfo()")
            kind, qid = info["kind"], info["id"]
            if kind == "profil":
                pg.fill('input[data-field="name"]', LENA["profil"]["name"])
                pg.fill('input[data-field="beruf"]', LENA["profil"]["beruf"])
                pg.click("#nav-next")
            elif kind == "likert":
                idx = int(qid[1]) - 1
                val = LENA["ikigai9"][idx]
                pg.locator(f'.likert button[data-v="{val}"]').click()
                pg.wait_for_timeout(60)  # Auto-Advance
            elif kind == "interstitial":
                pg.click("#nav-next")
            elif kind == "frage":
                v = antw[qid]
                if info["type"] == "chips":
                    for choice in v:
                        pg.locator(".chip", has_text=choice.replace("„", "").replace("“", "")[:24]).first.click()
                else:
                    pg.fill(".q-textarea", v)
                last = pg.evaluate("window.__ikig.state.step === window.__ikig.steps - 1")
                pg.click("#nav-next")
                if last: break
            pg.wait_for_timeout(30)
        pg.wait_for_selector("#screen-result:not([hidden])", timeout=15000)
        check("Flow komplett durchklickbar bis Ergebnis", True)
        check("Keine JS-Fehler im Flow", not errors, extra="; ".join(errors[:2]))

        svg = pg.locator("#venn-wrap svg").inner_html()
        check("Visual zeigt User-Begriff (Fotografie)", "Fotografie" in svg)
        check("Visual zeigt User-Begriff (Markt-Kreis)", "Projektmanagement" in svg)
        check("Visual: Zentrum-Satz gerendert", "Ordnung" in svg)
        body_txt = pg.locator("#result-root").inner_text()
        check("Erkenntnis zitiert wörtlich", "Hochzeitsreportage mit meiner Kamera" in body_txt)
        check("Ideen mit Begründungskette sichtbar", "Weil du" in body_txt)
        check("Kaizen-Plan 4 Wochen sichtbar", body_txt.count("WOCHE") >= 4)
        check("Wahre-Geschichte-Sektion da (Zuzunaga + Winn)", "Zuzunaga" in body_txt and "Winn" in body_txt)
        check("Entlastungs-Satz da", "muss kein Beruf sein" in body_txt)
        check("Score 30/45 gerendert", re.search(r"\b30\b", pg.locator(".sr-num").inner_text()) is not None)
        check("Mogi-Säulen gemappt", "Säule" in body_txt)
        check("CTA Cal.com-Link", pg.locator('a[href*="cal.com/osai-solutions"]').count() >= 1)
        check("OsAI-Logo als Datei im Ergebnis", pg.locator('#result-root img[src*="logo-mark.png"]').count() >= 1)
        check("Kein Beispiel-Badge im mock-Pfad", pg.locator(".beispiel-badge").count() == 0)
        pg.close()

        # ── 2 · Fallback-Pfad (Server ohne Key → Beispiel-Ergebnis) ──
        print("\n■ 2 · Fallback ohne Key (?demo=1)")
        pg = browser.new_page()
        pg.goto("http://127.0.0.1:8982/?demo=1&fast=1")
        pg.wait_for_load_state("networkidle")
        pg.click("#nav-next")  # letzter Schritt vorbefüllt → Auswerten
        pg.wait_for_selector("#screen-result:not([hidden])", timeout=15000)
        check("Fallback rendert Ergebnis statt Fehler", pg.locator("#venn-wrap svg").count() == 1)
        check("Beispiel-Badge sichtbar", pg.locator(".beispiel-badge").count() == 1)
        check("Badge sagt: Antworten nicht ausgewertet", "nicht" in pg.locator(".beispiel-badge").inner_text())
        pg.close()

        # ── 2b · Downloads: PDF + Share-Bilder ──
        print("\n■ 2b · PDF + Share-Bild")
        pg = browser.new_page()
        pg.goto("http://127.0.0.1:8982/?demo=1&mock=1&fast=1")
        pg.wait_for_load_state("networkidle")
        pg.click("#nav-next")
        pg.wait_for_selector("#screen-result:not([hidden])", timeout=15000)

        with pg.expect_download(timeout=30000) as dl:
            pg.click("#btn-pdf")
        f = dl.value.path()
        data = open(f, "rb").read()
        check("PDF lädt herunter, beginnt mit %PDF", data[:4] == b"%PDF")
        check(f"PDF > 80 KB ({len(data)//1024} KB)", len(data) > 80 * 1024)
        pages = len(re.findall(rb"/Type\s*/Page\b(?!s)", data))
        check(f"PDF hat 6 Seiten ({pages})", pages == 6)
        check("PDF-Dateiname personalisiert", "lena" in dl.value.suggested_filename)

        def png_dims(b):
            return int.from_bytes(b[16:20], "big"), int.from_bytes(b[20:24], "big")
        with pg.expect_download(timeout=20000) as dl:
            pg.click("#btn-share-sq")
        b = open(dl.value.path(), "rb").read()
        check(f"Share 1:1 = 1080×1080 ({png_dims(b)})", png_dims(b) == (1080, 1080))
        check("Share 1:1 ist substanzielles PNG", b[:8] == b"\x89PNG\r\n\x1a\n" and len(b) > 60 * 1024)
        with pg.expect_download(timeout=20000) as dl:
            pg.click("#btn-share-story")
        b = open(dl.value.path(), "rb").read()
        check(f"Share 9:16 = 1080×1920 ({png_dims(b)})", png_dims(b) == (1080, 1920))
        # Vorschau-Canvases tatsächlich bemalt?
        painted = pg.evaluate("""(() => {
          const c = document.getElementById('share-sq');
          const d = c.getContext('2d').getImageData(540, 540, 1, 1).data;
          return d[3] > 0; })()""")
        check("Share-Vorschau gerendert (Pixel im Zentrum)", painted)
        pg.close()

        # ── 3 · localStorage-Resume ──
        print("\n■ 3 · localStorage-Resume")
        pg = browser.new_page()
        pg.goto("http://127.0.0.1:8982/?fast=1")
        pg.wait_for_load_state("networkidle")
        pg.click("#start-btn")
        pg.fill('input[data-field="beruf"]', "Testerin im Resume-Test")
        pg.click("#nav-next")
        pg.locator('.likert button[data-v="4"]').click()
        pg.wait_for_timeout(120)
        step_before = pg.evaluate("window.__ikig.state.step")
        pg.reload(); pg.wait_for_load_state("networkidle")
        check("Resume-Banner erscheint", pg.locator("#resume-banner:not([hidden])").count() == 1)
        pg.click("#resume-yes")
        pg.wait_for_selector("#screen-wizard:not([hidden])")
        check("Resume stellt Schritt wieder her", pg.evaluate("window.__ikig.state.step") == step_before)
        check("Resume behält Antwort", pg.evaluate("window.__ikig.state.profil.beruf") == "Testerin im Resume-Test")
        pg.close()

        # ── 3b · Mobile-Parität 390×844 ──
        print("\n■ 3b · Mobile-Parität (390×844)")
        mob = browser.new_page(viewport={"width": 390, "height": 844},
                               device_scale_factor=2, is_mobile=True, has_touch=True)
        mob.goto("http://127.0.0.1:8982/?mock=1&fast=1")
        mob.wait_for_load_state("networkidle")
        check("Mobile: kein horizontales Scrollen (Hero)",
              mob.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"))
        mob.tap("#start-btn")
        mob.fill('input[data-field="name"]', "Lena")
        mob.fill('input[data-field="beruf"]', "Projektmanagerin in einer Agentur")
        mob.tap("#nav-next")
        bb = mob.locator('.likert button[data-v="3"]').bounding_box()
        check(f"Mobile: Likert-Tap-Target >= 44px ({bb['height']:.0f})", bb and bb["height"] >= 44)
        mob.tap('.likert button[data-v="3"]')
        mob.wait_for_timeout(120)
        check("Mobile: Likert Auto-Advance", mob.evaluate("window.__ikig.stepInfo().id") == "k2")
        mob.evaluate("window.__ikig.prefillLena()")
        mob.tap("#nav-next")
        mob.wait_for_selector("#screen-result:not([hidden])", timeout=15000)
        check("Mobile: Ergebnis rendert", mob.locator("#venn-wrap svg").count() == 1)
        check("Mobile: kein horizontales Scrollen (Ergebnis)",
              mob.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"))
        check("Mobile: Kaizen-Spalten gestapelt",
              mob.evaluate("getComputedStyle(document.querySelector('.kaizen-step')).gridTemplateColumns.split(' ').length") == 1)
        mob.close()

        # ── 3c · error_user-Pfad (Inhalts-Fehler → zurück in den Wizard) ──
        print("\n■ 3c · error_user-Pfad")
        pg = browser.new_page()
        pg.route("**/api/synthesize", lambda route: route.fulfill(
            status=422, content_type="application/json",
            body=json.dumps({"ok": False, "error_user": "Ein paar Antworten sind zu knapp für eine ehrliche Auswertung."})))
        pg.goto("http://127.0.0.1:8982/?demo=1&fast=1")
        pg.wait_for_load_state("networkidle")
        pg.click("#nav-next")
        pg.wait_for_selector("#screen-wizard:not([hidden])", timeout=15000)
        check("error_user: zurück im Wizard statt Fehlerbildschirm", pg.locator("#screen-result").is_hidden())
        check("error_user: Hinweis sichtbar", "ehrliche Auswertung" in pg.locator(".q-error").inner_text())
        pg.close()

        # ── 3e · Ergebnis-Persistenz (wieder öffnen nach Reload) ──
        print("\n■ 3e · Ergebnis wieder öffnen")
        lena_erg = json.loads(subprocess.run(["node", "-e",
            "global.window={};" + open(os.path.join(ROOT, "assets/js/lena.js"), encoding="utf-8").read() +
            ";console.log(JSON.stringify(window.LENA.ergebnis))"], capture_output=True, text=True).stdout)
        pg = browser.new_page()
        pg.route("**/api/synthesize", lambda route: route.fulfill(
            status=200, content_type="application/json",
            body=json.dumps({"ok": True, "ergebnis": lena_erg})))
        pg.goto("http://127.0.0.1:8982/?demo=1&fast=1")
        pg.wait_for_load_state("networkidle")
        pg.click("#nav-next")
        pg.wait_for_selector("#screen-result:not([hidden])", timeout=15000)
        pg.goto("http://127.0.0.1:8982/?fast=1")  # Reload ohne demo-Param
        pg.wait_for_load_state("networkidle")
        check("Reopen-Banner nach Reload", pg.locator("#resume-banner:not([hidden])").count() == 1
              and "wieder öffnen" in pg.locator("#resume-banner span").first.inner_text())
        pg.click("#resume-yes")
        pg.wait_for_selector("#screen-result:not([hidden])", timeout=8000)
        check("Ergebnis wieder geöffnet (Visual da)", pg.locator("#venn-wrap svg").count() == 1)
        pg.close()

        # ── 3d · Erst-Load-Gewicht ──
        print("\n■ 3d · Ladegewicht")
        pg = browser.new_page()
        sizes = []
        pg.on("response", lambda r: sizes.append((r.url.split("/")[-1] or r.url, len(r.body()) if r.ok else 0)))
        pg.goto("http://127.0.0.1:8982/?fast=1")
        pg.wait_for_load_state("networkidle")
        total = sum(s for _, s in sizes)
        check(f"Erst-Load < 350 KB ({total//1024} KB, {len(sizes)} Requests)", total < 350 * 1024)
        check("jsPDF NICHT im Erst-Load", not any("jspdf" in u for u, _ in sizes))
        pg.close()

        browser.close()

    # ── 4 · API-Schutzschicht (ohne LLM-Verbrauch) ──
    print("\n■ 4 · Schutzschicht")
    s, j = post(8982, lena_payload(), origin="https://boese-seite.example")
    check("Origin-Lock: fremde Origin → 403", s == 403)
    bad = lena_payload(); bad["antworten"] = {k: "" for k in bad["antworten"]}
    s, j = post(8982, bad)
    check("Leere Antworten → 400 + error_user (nie erfinden)", s == 400 and "error_user" in j)
    s, j = post(8982, lena_payload())
    check("Ohne Key → 503 + fallback:true", s == 503 and j.get("fallback") is True)

    # Cap-Simulation (eigener Server, CAP=0)
    servers.append(start_server(8984, {"GOOGLE_AI_STUDIO": "dummy", "IKIGAI_DAILY_CAP": "0"}))
    s, j = post(8984, lena_payload())
    check("Tages-Cap → 429 + fallback:true (graceful)", s == 429 and j.get("fallback") is True)

    # ── 5 · Live-Synthese (1 echter Gemini-Call) ──
    if LIVE:
        print("\n■ 5 · Live-Synthese (echter Gemini-Call)")
        key = os.environ.get("GOOGLE_AI_STUDIO_KEY") or os.environ.get("GOOGLE_AI_STUDIO")
        if not key:
            for line in open("/Users/Osman/Desktop/APPS/agent-studio/.env"):
                if line.startswith("GOOGLE_AI_STUDIO_KEY="):
                    key = line.split("=", 1)[1].strip()
        check("Key gefunden", bool(key))
        servers.append(start_server(8986, {"GOOGLE_AI_STUDIO": key}))
        t0 = time.time()
        s, j = post(8986, lena_payload())
        dt = time.time() - t0
        check(f"Live-Call ok ({dt:.1f}s, Modell {j.get('meta',{}).get('model','?')})", s == 200 and j.get("ok"))
        if s == 200:
            validate_schema(j["ergebnis"], lena_payload(), "Live")
            print(f"    repaired_quotes: {j.get('meta',{}).get('repaired_quotes')}")
            json.dump(j, open("/tmp/ikigai-live-result.json", "w"), ensure_ascii=False, indent=1)

    # ── lokales Schema gegen gestagtes Lena-Ergebnis ──
    print("\n■ 6 · Gestagtes Lena-Ergebnis erfüllt das Schema")
    js = open(os.path.join(ROOT, "assets/js/lena.js"), encoding="utf-8").read()
    out = subprocess.run(["node", "-e", "global.window={};" + js + ";console.log(JSON.stringify(window.LENA.ergebnis))"],
                         capture_output=True, text=True)
    validate_schema(json.loads(out.stdout), lena_payload(), "Lena-Fixture")

finally:
    for p in servers: p.terminate()

print(f"\n══ Ergebnis: {PASS} PASS · {FAIL} FAIL ══")
if FAILED: print("Fehlgeschlagen:", *FAILED, sep="\n  - ")
sys.exit(1 if FAIL else 0)
