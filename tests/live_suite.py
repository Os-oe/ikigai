#!/usr/bin/env python3
"""E2E gegen die Live-URL — inkl. EINEM echten Synthese-Call (Gemini).
Aufruf: python3 tests/live_suite.py"""
import json, os, re, subprocess, sys, urllib.request

BASE = "https://ikigai.demo.osai.solutions"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PASS = 0; FAIL = 0; FAILED = []
def check(name, cond, extra=""):
    global PASS, FAIL
    if cond: PASS += 1; print(f"  ✓ {name}")
    else:
        FAIL += 1; FAILED.append(name)
        print(f"  ✗ {name}" + (f" — {extra}" if extra else ""))

def get(path):
    try:
        with urllib.request.urlopen(BASE + path, timeout=30) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()

def post_api(payload, origin):
    req = urllib.request.Request(BASE + "/api/synthesize",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "Origin": origin}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

def norm(s):
    s = re.sub(r'[„“”"‚‘’\'»«]', "", str(s).lower())
    s = re.sub(r"[—–]", "-", s)
    return re.sub(r"\s+", " ", s).strip()

js = open(os.path.join(ROOT, "assets/js/lena.js"), encoding="utf-8").read()
out = subprocess.run(["node", "-e", "global.window={};" + js +
    ";console.log(JSON.stringify({profil:window.LENA.profil,ikigai9:window.LENA.ikigai9,antworten:window.LENA.antworten}))"],
    capture_output=True, text=True)
LENA = json.loads(out.stdout)
CORPUS = norm(" ## ".join([LENA["profil"]["beruf"]] +
    [v for v in LENA["antworten"].values() if isinstance(v, str)] +
    [x for v in LENA["antworten"].values() if isinstance(v, list) for x in v]))

print("■ Statische Auslieferung")
s, b = get("/")
check("/ → 200 + Titel", s == 200 and b"ikigAI" in b)
for p in ["/impressum.html", "/datenschutz.html", "/assets/img/og.png",
          "/assets/fonts/shippori-600.woff2", "/assets/vendor/jspdf.umd.min.js",
          "/assets/vendor/shippori-pdf-fonts.js", "/assets/vendor/lz-string.min.js",
          "/assets/js/ikigai-art.js", "/assets/js/carousel.js",
          "/assets/img/logo-mark.png"]:
    s, b = get(p)
    check(f"{p} → 200", s == 200 and len(b) > 500)

print("\n■ API-Schutzschicht (live)")
s, j = post_api(LENA, "https://boese-seite.example")
check("Origin-Lock live: fremde Origin → 403", s == 403)
bad = dict(LENA); bad = json.loads(json.dumps(LENA)); bad["antworten"] = {k: "" for k in bad["antworten"]}
s, j = post_api(bad, BASE)
check("Leere Antworten live → 400 error_user", s == 400 and "error_user" in j)

print("\n■ Voller Browser-Flow mit ECHTEM Synthese-Call")
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    pg = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(BASE + "/?demo=1&fast=1")
    pg.wait_for_load_state("networkidle")
    pg.click("#nav-next")  # Auswerten → echter Call
    pg.wait_for_selector("#screen-result:not([hidden])", timeout=90000)
    check("Live-Synthese rendert Ergebnis", pg.locator("#venn-wrap svg").count() == 1)
    check("KEIN Beispiel-Badge (echte Auswertung lief)", pg.locator(".beispiel-badge").count() == 0)
    check("Keine JS-Fehler", not errors, "; ".join(errors[:2]))

    zitate = pg.locator(".r-zitat").all_inner_texts()
    check(f"{len(zitate)} Erkenntnis-Zitate gerendert", len(zitate) >= 3)
    ok_quotes = 0
    for z in zitate:
        inner = re.sub(r"^Du hast geschrieben: ", "", z.strip())
        if norm(inner.strip("„“ ")) in CORPUS: ok_quotes += 1
    check(f"Zitate wörtlich aus Lenas Antworten ({ok_quotes}/{len(zitate)})", ok_quotes == len(zitate))
    body = pg.locator("#result-root").inner_text()
    check("Begründungskette „Weil du …“ da", "Weil du" in body)
    check("Kaizen 4 Wochen da", body.count("WOCHE") >= 4)
    check("Wahre Geschichte da", "Zuzunaga" in body)

    # Permalink wurde nach echter Synthese ins Fragment geschrieben
    h = pg.evaluate("location.hash")
    check("Permalink #r= nach Live-Synthese geschrieben", h.startswith("#r=") and len(h) > 100)

    with pg.expect_download(timeout=60000) as dl:
        pg.click("#btn-pdf")
    data = open(dl.value.path(), "rb").read()
    check(f"PDF live baubar, Mincho, < 1 MB ({len(data)//1024} KB)",
          data[:4] == b"%PDF" and 200 * 1024 < len(data) < 1024 * 1024 and b"Mincho" in data)

    # Karussell-ZIP live
    with pg.expect_download(timeout=60000) as dl:
        pg.click("#btn-carousel")
    check("Karussell-ZIP live baubar", dl.value.suggested_filename.endswith(".zip"))
    pg.close()
    browser.close()

print(f"\n══ Live-Ergebnis: {PASS} PASS · {FAIL} FAIL ══")
if FAILED: print("Fehlgeschlagen:", *FAILED, sep="\n  - ")
sys.exit(1 if FAIL else 0)
