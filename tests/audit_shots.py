#!/usr/bin/env python3
"""Audit-Shots für den Redesign-IST-Audit — schreibt in agent-studio/.planning/.../redesign/shots."""
import base64, os
from playwright.sync_api import sync_playwright

OUT = "/Users/Osman/Desktop/APPS/agent-studio/.planning/one-prompt/ikigai/redesign/shots"
os.makedirs(OUT, exist_ok=True)
BASE = "http://127.0.0.1:8982"

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)

    # --- Hero + Wizard (Desktop, mit echten Animations-Endzuständen via fast=1) ---
    pg = b.new_page(viewport={"width": 1280, "height": 900})
    pg.goto(BASE + "/?fast=1"); pg.wait_for_load_state("networkidle")
    pg.wait_for_timeout(500)
    pg.screenshot(path=f"{OUT}/01-hero.png")
    pg.click("#start-btn"); pg.wait_for_timeout(250)
    pg.screenshot(path=f"{OUT}/02-wizard-profil.png")
    pg.fill('input[data-field="name"]', "Lena")
    pg.fill('input[data-field="beruf"]', "Projektmanagerin in einer Agentur")
    pg.click("#nav-next"); pg.wait_for_timeout(250)
    pg.screenshot(path=f"{OUT}/03-wizard-likert.png")
    pg.evaluate("window.__ikig.prefillLena()")
    pg.evaluate("window.__ikig.goto(11)")
    pg.wait_for_timeout(200); pg.screenshot(path=f"{OUT}/04-wizard-interstitial.png")
    pg.evaluate("window.__ikig.goto(13)")
    pg.wait_for_timeout(200); pg.screenshot(path=f"{OUT}/05-wizard-chips.png")
    # Textfrage
    pg.evaluate("window.__ikig.goto(14)")
    pg.wait_for_timeout(200); pg.screenshot(path=f"{OUT}/05b-wizard-text.png")
    pg.close()

    # --- Warte-Screen (ohne fast, damit Ensō-Loop sichtbar) ---
    pg = b.new_page(viewport={"width": 1280, "height": 900})
    pg.goto(BASE + "/?demo=1&mock=1"); pg.wait_for_load_state("networkidle")
    pg.click("#nav-next")
    pg.wait_for_timeout(800)
    try:
        pg.screenshot(path=f"{OUT}/06-wait.png")
    except Exception:
        pass
    pg.close()

    # --- Ergebnis Desktop, volle Seite + Abschnitte ---
    pg = b.new_page(viewport={"width": 1280, "height": 900})
    pg.goto(BASE + "/?demo=1&mock=1&fast=1"); pg.wait_for_load_state("networkidle")
    pg.click("#nav-next")
    pg.wait_for_selector("#screen-result:not([hidden])", timeout=15000)
    pg.wait_for_timeout(1000)
    pg.screenshot(path=f"{OUT}/07-result-full.png", full_page=True)
    # Abschnitte einzeln (Viewport-Scrolls)
    sections = pg.query_selector_all("#result-root > section")
    for i, sec in enumerate(sections):
        sec.scroll_into_view_if_needed()
        pg.wait_for_timeout(250)
        sec.screenshot(path=f"{OUT}/08-section-{i+1:02d}.png")

    # Share-Canvases als PNG (volle Auflösung)
    for cid, name in [("share-sq", "09-share-sq"), ("share-story", "10-share-story")]:
        data = pg.evaluate(f"document.getElementById('{cid}').toDataURL('image/png')")
        open(f"{OUT}/{name}.png", "wb").write(base64.b64decode(data.split(",")[1]))

    # PDF bauen + Seiten mit 130 dpi rendern
    with pg.expect_download(timeout=30000) as dl:
        pg.click("#btn-pdf")
    pdf_path = dl.value.path()
    import shutil, fitz
    shutil.copy(pdf_path, f"{OUT}/ikigai-report-lena.pdf")
    doc = fitz.open(pdf_path)
    for i, page in enumerate(doc):
        pix = page.get_pixmap(dpi=130)
        pix.save(f"{OUT}/pdf-{i+1}.png")
    print("PDF Seiten:", len(doc))
    pg.close()

    # Mobile Ergebnis
    pg = b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    pg.goto(BASE + "/?demo=1&mock=1&fast=1"); pg.wait_for_load_state("networkidle")
    pg.click("#nav-next")
    pg.wait_for_selector("#screen-result:not([hidden])", timeout=15000)
    pg.wait_for_timeout(900)
    pg.screenshot(path=f"{OUT}/11-mobile-result.png", full_page=True)
    pg.close()
    b.close()
print("Shots →", OUT)
