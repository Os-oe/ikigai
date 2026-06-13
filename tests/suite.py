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
        check("Visual: Zentrum-Satz als Held gerendert", "Ordnung" in svg)
        # Lasur-Venn: Multiply-Blobs statt Outlines, saubere Center-Plakette + Hanko (Initialen)
        check("Venn: Lasur-Blobs via mix-blend-mode multiply", "multiply" in svg)
        check("Venn: saubere Center-Plakette + Hanko (Initiale L)", 'class="venn-center"' in svg and ">L<" in svg)
        check("Venn: Kanji-Marker außen (愛 技 世 価)", "愛" in svg and "技" in svg)
        check("Venn: Farbnamen sind Content (Ruri/Akabeni)", "Ruri" in svg or "Akabeni" in svg)
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
        check(f"PDF > 200 KB ({len(data)//1024} KB)", len(data) > 200 * 1024)
        check(f"PDF < 1 MB ({len(data)//1024} KB, Brief-Cap)", len(data) < 1024 * 1024)
        pages = len(re.findall(rb"/Type\s*/Page\b(?!s)", data))
        check(f"PDF Premium-Workbook 9-12 Seiten ({pages})", 9 <= pages <= 12)
        # Mincho eingebettet (selektierbarer Vektor-Text, nicht Times/Canvas-Screenshot)
        check("PDF: Shippori Mincho als TTF eingebettet (kein Times)",
              b"Mincho" in data and b"FontFile2" in data)
        check("PDF-Dateiname personalisiert", "lena" in dl.value.suggested_filename)

        def png_dims(b):
            return int.from_bytes(b[16:20], "big"), int.from_bytes(b[20:24], "big")
        # Default-Einzel-Share = Satz-Slide im 4:5-Format (1080×1350) — der Satz ist der Held
        with pg.expect_download(timeout=20000) as dl:
            pg.click("#btn-share-sq")
        b = open(dl.value.path(), "rb").read()
        check(f"Share-Karte = 1080×1350 (4:5) ({png_dims(b)})", png_dims(b) == (1080, 1350))
        check("Share-Karte ist substanzielles PNG", b[:8] == b"\x89PNG\r\n\x1a\n" and len(b) > 60 * 1024)
        with pg.expect_download(timeout=20000) as dl:
            pg.click("#btn-share-story")
        b = open(dl.value.path(), "rb").read()
        check(f"Share 9:16 = 1080×1920 ({png_dims(b)})", png_dims(b) == (1080, 1920))
        # Vorschau-Canvases tatsächlich bemalt?
        painted = pg.evaluate("""(() => {
          const c = document.getElementById('share-sq');
          const d = c.getContext('2d').getImageData(540, 675, 1, 1).data;
          return d[3] > 0; })()""")
        check("Share-Vorschau gerendert (Pixel im Zentrum)", painted)

        # ── Karussell-ZIP: 6 Slides + Story + LinkedIn-PDF ──
        with pg.expect_download(timeout=40000) as dl:
            pg.click("#btn-carousel")
        zpath = dl.value.path()
        check("Karussell-ZIP lädt (.zip)", dl.value.suggested_filename.endswith(".zip"))
        import zipfile
        with zipfile.ZipFile(zpath) as z:
            names = z.namelist()
            slides = [n for n in names if n.startswith("ikigai-slide-")]
            check(f"ZIP: 6 IG-Slides ({len(slides)})", len(slides) == 6)
            check("ZIP: Story-PNG enthalten", any("story" in n for n in names))
            check("ZIP: LinkedIn-PDF enthalten", any(n.endswith(".pdf") for n in names))
            # ein Slide-PNG hat 1080×1350
            sb = z.read(sorted(slides)[0])
            check(f"ZIP-Slide = 1080×1350 ({png_dims(sb)})", png_dims(sb) == (1080, 1350))

        # ── Design-Review-Robustheit: Karussell + Venn überstehen lange/unbrechbare Texte ──
        # (P1 + P2 aus dem externen Review: Slide-5-Ticks, Venn-Label-Overflow, Share-Footer)
        LONG = {
            "name": "Wolfgang-Maximilian",
            "freuden": ["der erste Kaffee am Samstagmorgen, bevor wirklich alle wach sind und Lärm machen",
                        "zehn ungestörte Minuten auf dem Balkon mit frischem Pfefferminztee, bevor ich anfange",
                        "meine jüngere Schwester und mein kleiner privater Fotoblog mit genau zwölf Lesern"],
            "kreise": {"liebe": ["Donaudampfschifffahrtsgesellschaftskapitän", "Bilder & Geschichten", "Erklären"],
                       "staerke": ["Arbeitsablauforganisationsstrukturierung", "Ruhe im Chaos", "Verständlich machen"],
                       "welt": ["Telekommunikationsüberwachungsverordnung", "Echtes Zuhören", "Gute Arbeit sichtbar"],
                       "markt": ["Nahrungsmittelunverträglichkeitsberatung", "Foto-Reportagen", "Planungs-Wissen"]},
            "zentrum": ("Du bringst eine fast schon übermenschliche Ordnung in jedes erdenkliche Chaos und machst "
                        "dabei konsequent sichtbar, was den allermeisten anderen Menschen im Alltag vollständig entgeht.")}

        # P1: Slide 5 — Pinsel-Tick liegt links neben dem Text, kein Layout-Bruch
        s5 = pg.evaluate("""async (long) => {
          await document.fonts.ready;
          const erg = JSON.parse(JSON.stringify(window.LENA.ergebnis));
          erg.carousel = { freuden: long.freuden };
          const ctx2 = { profil: { name: long.name } };
          const c = document.createElement('canvas');
          window.IKIGAI_CAROUSEL.renderSlide(c, 5, erg, ctx2, null, 'card');
          // Tick-Band liegt links (x<0.25W), Text startet rechts (>=0.27W) → kein Überlapp:
          // wir prüfen, dass in der linken Tick-Spalte (x 170..250, y 480..520) rote Pixel sind
          // und in derselben Höhe rechts davon (x 300..) dunkler Text — d.h. getrennte Zonen.
          const g = c.getContext('2d');
          const tick = g.getImageData(180, 486, 80, 8).data;   // Tick-Band, erste Zeile
          let red = 0; for (let i=0;i<tick.length;i+=4){ if(tick[i]>180 && tick[i+1]<90 && tick[i+2]<90) red++; }
          return { w: c.width, h: c.height, redInTickBand: red };
        }""", LONG)
        check(f"P1 Slide 5: roter Tick liegt im linken Tick-Band ({s5['redInTickBand']} px)", s5["redInTickBand"] > 0)
        check("P1 Slide 5: Canvas-Maße 1080×1350 (kein Layout-Bruch)", (s5["w"], s5["h"]) == (1080, 1350))

        # P2.3: Share-Slide 3 mit SEHR langem Satz — Hanko + Paginierung kollidieren NICHT.
        # Footer (Paginierung) sitzt bei H-70=1280, Hanko-Mitte = 1280-64-46 = 1170, Unterkante 1216.
        # Zwischen Hanko-Unterkante und Paginierung muss ein leerer Gurt liegen.
        sq = pg.evaluate("""async (long) => {
          await document.fonts.ready;
          const W = 1080;
          const erg = JSON.parse(JSON.stringify(window.LENA.ergebnis));
          erg.zentrum = long.zentrum;
          const ctx2 = { profil: { name: long.name } };
          const c = document.createElement('canvas');
          window.IKIGAI_CAROUSEL.renderSlide(c, 3, erg, ctx2, null, 'card');
          const g = c.getContext('2d');
          const band = g.getImageData(W/2-120, 1232, 240, 16).data;
          let gapInk = 0; for (let i=0;i<band.length;i+=4){ if (band[i+3]>20 && (Math.abs(band[i]-25)>34||Math.abs(band[i+1]-34)>34||Math.abs(band[i+2]-54)>34)) gapInk++; }
          const pag = g.getImageData(W/2-90, 1262, 180, 22).data;
          let pagInk = 0; for (let i=0;i<pag.length;i+=4){ if (pag[i+3]>20 && (Math.abs(pag[i]-25)>20||Math.abs(pag[i+1]-34)>20||Math.abs(pag[i+2]-54)>20)) pagInk++; }
          return { gapInk: gapInk, pagInk: pagInk };
        }""", LONG)
        check(f"P2.3 Share-Footer: Leergurt zwischen Hanko und Paginierung ({sq['gapInk']} ink-px)", sq["gapInk"] < 40)
        check(f"P2.3 Share-Footer: Paginierung sichtbar & frei ({sq['pagInk']} ink-px)", sq["pagInk"] > 5)

        # P2.1 + P2.2: Venn-SVG-Labels klippen die viewBox NIE — normal UND lange Wörter
        lena_kreise = pg.evaluate("({ kreise: window.LENA.ergebnis.kreise, zentrum: window.LENA.ergebnis.zentrum })")
        for tag, payload in [("normal", lena_kreise),
                             ("lange Wörter", {"kreise": LONG["kreise"], "zentrum": LONG["zentrum"]})]:
            clip = pg.evaluate("""(args) => {
              const [data, name] = args;
              const host = document.createElement('div'); host.style.position='absolute'; host.style.left='-9999px';
              host.innerHTML = window.IKIGAI_VENN(data, { name });
              document.body.appendChild(host);
              const svg = host.querySelector('svg');
              const vb = svg.getAttribute('viewBox').split(/\\s+/).map(Number);
              const L = vb[0], R = vb[0]+vb[2];
              let worst = 0;
              svg.querySelectorAll('text.v-label, text.v-term, text.v-cap').forEach(t => {
                const bb = t.getBBox();
                worst = Math.max(worst, (L+4) - bb.x, (bb.x+bb.width) - (R-4));
              });
              host.remove();
              return Math.round(worst);
            }""", [payload, "Lena"])
            check(f"P2.1/2.2 Venn-Labels innerhalb viewBox ({tag}, Überstand {clip}px)", clip <= 0)
        pg.close()

        # ── 2c · Permalink (#r=…) — Ergebnis komprimiert ins URL-Fragment ──
        print("\n■ 2c · Permalink #r= (kein Backend, Fragment geht nie zum Server)")
        with open(os.path.join(ROOT, "assets/js/lena.js"), encoding="utf-8") as fh:
            lena_js = fh.read()
        lena_erg = json.loads(subprocess.run(["node", "-e",
            "global.window={};" + lena_js + ";console.log(JSON.stringify(window.LENA.ergebnis))"],
            capture_output=True, text=True).stdout)
        pg = browser.new_page()
        pg.route("**/api/synthesize", lambda route: route.fulfill(
            status=200, content_type="application/json",
            body=json.dumps({"ok": True, "ergebnis": lena_erg})))
        perr = []; pg.on("pageerror", lambda e: perr.append(str(e)))
        pg.goto("http://127.0.0.1:8982/?demo=1&fast=1")
        pg.wait_for_load_state("networkidle")
        pg.click("#nav-next")
        pg.wait_for_selector("#screen-result:not([hidden])", timeout=15000)
        pg.wait_for_timeout(300)
        h = pg.evaluate("location.hash")
        check("Permalink ins URL-Fragment geschrieben (#r=)", h.startswith("#r=") and len(h) > 100)
        permalink = pg.evaluate("window.IKIGAI_PERMALINK(window.__ikig.lastResult, {profil: window.LENA.profil, ikigai9: window.LENA.ikigai9})")
        pg.close()
        # frische Seite NUR mit dem Fragment → Ergebnis muss direkt erscheinen
        frag = permalink[permalink.index("#"):]
        pg = browser.new_page()
        perr2 = []; pg.on("pageerror", lambda e: perr2.append(str(e)))
        pg.goto("http://127.0.0.1:8982/?fast=1" + frag)
        pg.wait_for_load_state("networkidle")
        check("Permalink öffnet Ergebnis direkt (ohne Wizard)", pg.locator("#screen-result:not([hidden])").count() == 1)
        check("Permalink-Ergebnis zeigt den Satz", "Ordnung" in pg.locator("#result-root").inner_text())
        check("Permalink: keine JS-Fehler", not perr and not perr2, extra="; ".join((perr + perr2)[:2]))
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
        check(f"Erst-Load < 400 KB ({total//1024} KB, {len(sizes)} Requests, Brief-Cap)", total < 400 * 1024)
        check("jsPDF NICHT im Erst-Load", not any("jspdf" in u for u, _ in sizes))
        check("PDF-Mincho-Fonts NICHT im Erst-Load (lazy)", not any("shippori-pdf-fonts" in u for u, _ in sizes))
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
