#!/usr/bin/env python3
"""op-capture ikigAI — nimmt 6 Demo-Segmente gegen die Live-URL auf.

Deterministisch via ?demo=1&mock=1 (KEIN ?fast=1 — Animationen sollen sichtbar sein).
Jedes Segment = eigener Browser-Context = eigene .webm (sauber schneidbar).
Settle-Wiggle am Take-Ende (Screencast liefert keine Frames bei statischer Seite).

Usage: python3 record.py desktop|mobile
"""
import os, sys
from playwright.sync_api import sync_playwright

URL = "https://ikigai.demo.osai.solutions"
MODE = sys.argv[1] if len(sys.argv) > 1 else "desktop"
VP = {"desktop": (1920, 1080), "mobile": (540, 960)}[MODE]
RAW = os.path.join(os.path.dirname(os.path.abspath(__file__)), "raw", MODE)
os.makedirs(RAW, exist_ok=True)

LENA_A1 = "alte Fotos sortiere und bearbeite, bis aus einem Schnappschuss ein richtiges Bild wird"

# Warte-Fakt "Diagramm nicht japanisch" (Index 2) nach vorn rotieren — Staging, Produkt bleibt echt
ROTATE_FACT = "window.IKIGAI_FRAGEN.warteFakten.unshift(window.IKIGAI_FRAGEN.warteFakten.splice(2,1)[0]); 1"


def wiggle(page, x, y, ms=700):
    """Mini-Cursorbewegung, damit der Screencast bis zum Take-Ende Frames liefert."""
    steps = max(4, ms // 90)
    for i in range(steps):
        page.mouse.move(x + (4 if i % 2 else -4), y + (3 if i % 3 else -3), steps=2)
        page.wait_for_timeout(90)


def new_ctx(browser, name):
    ctx = browser.new_context(
        viewport={"width": VP[0], "height": VP[1]},
        record_video_dir=RAW,
        record_video_size={"width": VP[0], "height": VP[1]},
        accept_downloads=True,
        device_scale_factor=1,
    )
    page = ctx.new_page()
    return ctx, page


def save(ctx, page, name):
    video = page.video
    ctx.close()
    path = video.path()
    os.rename(path, os.path.join(RAW, f"{name}.webm"))
    print(f"  {name}: raw/{MODE}/{name}.webm")


def goto_ready(page, qs=""):
    page.goto(URL + qs, wait_until="networkidle")


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    cx, cy = VP[0] // 2, int(VP[1] * 0.62)

    # ── SEG A · Hero: Ensō zeichnet sich + Wortmarke + Rises ──────────────
    ctx, page = new_ctx(browser, "segA")
    goto_ready(page)                      # Animationen starten ab Load
    page.wait_for_timeout(3200)           # ensō-draw 1.6s@.25s + rises bis ~1.9s
    page.hover("#start-btn")              # Hover-State als Bewegung
    page.wait_for_timeout(800)
    wiggle(page, cx, cy, 1000)
    save(ctx, page, "segA")

    # ── SEG B · Likert-Rhythmus: 4 Taps mit Auto-Advance ──────────────────
    ctx, page = new_ctx(browser, "segB")
    goto_ready(page, "/?demo=1")
    page.evaluate("window.__ikig.goto(1); 1")     # k1
    page.wait_for_timeout(700)
    for v in (4, 5, 4, 5):                        # Klick → Auto-Advance 280ms → q-in 450ms
        page.click(f'.likert button[data-v="{v}"]')
        page.wait_for_timeout(950)
    page.wait_for_timeout(400)
    wiggle(page, cx, cy, 800)
    save(ctx, page, "segB")

    # ── SEG C · Freitext: "Wobei vergisst du die Zeit?" — echtes Tippen ───
    ctx, page = new_ctx(browser, "segC")
    goto_ready(page, "/?demo=1")
    page.evaluate("window.__ikig.state.antworten.a1=''; window.__ikig.goto(11); 1")
    page.wait_for_timeout(800)
    page.click(".q-textarea")
    page.type(".q-textarea", LENA_A1, delay=26)
    page.wait_for_timeout(700)
    wiggle(page, cx, cy, 800)
    save(ctx, page, "segC")

    # ── SEG D · Block-E-Interstitial: der Ebenenwechsel (USP) ──────────────
    ctx, page = new_ctx(browser, "segD")
    goto_ready(page, "/?demo=1")
    page.evaluate("window.__ikig.goto(24); 1")    # Interstitial E, q-in .45s
    page.wait_for_timeout(500)
    wiggle(page, cx, int(VP[1] * 0.8), 3200)      # ruhige Bewegung statt Standbild
    save(ctx, page, "segD")

    # ── SEG E · Warte-Screen (Ensō-Loop + Fakt) → Ergebnis-Reveal (Venn) ──
    ctx, page = new_ctx(browser, "segE")
    goto_ready(page, "/?demo=1&mock=1")
    page.evaluate(ROTATE_FACT)
    page.click("#nav-next")                       # "Auswerten"
    page.wait_for_timeout(2400)                   # Warte-Screen (minWait 2600ms, Loop animiert)
    page.wait_for_selector("#screen-result:not([hidden])", timeout=15000)
    page.wait_for_timeout(5200)                   # Reveal + Venn-Stagger (0.18s/Kreis) wirken lassen
    wiggle(page, cx, cy, 900)
    save(ctx, page, "segE")

    # ── SEG F · Scroll: wahre Geschichte (dunkel) → PDF/Share + CTA ───────
    ctx, page = new_ctx(browser, "segF")
    goto_ready(page, "/?demo=1&mock=1")
    page.click("#nav-next")
    page.wait_for_selector("#screen-result:not([hidden])", timeout=15000)
    page.wait_for_timeout(1400)
    page.evaluate("document.querySelector('.geschichte').scrollIntoView({behavior:'smooth',block:'center'}); 1")
    page.wait_for_timeout(3000)                   # dunkle Sektion + Reveal wirken lassen
    page.evaluate("document.getElementById('btn-pdf').scrollIntoView({behavior:'smooth',block:'center'}); 1")
    page.wait_for_timeout(1600)
    page.hover("#btn-pdf")
    page.wait_for_timeout(400)
    try:
        with page.expect_download(timeout=20000) as dl:
            page.click("#btn-pdf")
        print(f"  PDF-Download ok: {dl.value.suggested_filename}")
    except Exception as e:
        print(f"  PDF-Download übersprungen: {e}")
    page.wait_for_timeout(1200)
    wiggle(page, cx, cy, 900)
    save(ctx, page, "segF")

    browser.close()
print(f"done ({MODE})")
