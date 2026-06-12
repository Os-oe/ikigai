#!/usr/bin/env python3
"""Visuelle QA — Screenshots (Hero, Wizard, Ergebnis, Mobile) + PDF-Seiten + Share-Bilder.
Erwartet laufenden Server: node dev-server.mjs 8982"""
import base64, os, sys
from playwright.sync_api import sync_playwright

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots")
os.makedirs(OUT, exist_ok=True)
BASE = "http://127.0.0.1:8982"

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)

    # Desktop
    pg = b.new_page(viewport={"width": 1280, "height": 900})
    pg.goto(BASE + "/?fast=1"); pg.wait_for_load_state("networkidle")
    pg.wait_for_timeout(400)
    pg.screenshot(path=f"{OUT}/01-hero.png")
    pg.click("#start-btn"); pg.wait_for_timeout(200)
    pg.screenshot(path=f"{OUT}/02-profil.png")
    pg.fill('input[data-field="name"]', "Lena")
    pg.fill('input[data-field="beruf"]', "Projektmanagerin in einer Agentur")
    pg.click("#nav-next"); pg.wait_for_timeout(200)
    pg.screenshot(path=f"{OUT}/03-likert.png")
    # zu einer Chips- und einer Text-Frage springen
    pg.evaluate("window.__ikig.prefillLena()")
    pg.evaluate("window.__ikig.goto(11)")  # Interstitial A
    pg.wait_for_timeout(150); pg.screenshot(path=f"{OUT}/04-interstitial.png")
    pg.evaluate("window.__ikig.goto(13)")  # a2 chips
    pg.wait_for_timeout(150); pg.screenshot(path=f"{OUT}/05-chips.png")
    pg.close()

    # Ergebnis (Desktop, volle Seite)
    pg = b.new_page(viewport={"width": 1280, "height": 900})
    pg.goto(BASE + "/?demo=1&mock=1&fast=1"); pg.wait_for_load_state("networkidle")
    pg.click("#nav-next")
    pg.wait_for_selector("#screen-result:not([hidden])", timeout=15000)
    pg.wait_for_timeout(900)
    pg.screenshot(path=f"{OUT}/06-result-full.png", full_page=True)

    # Share-Canvases als PNG sichern
    for cid, name in [("share-sq", "07-share-sq"), ("share-story", "08-share-story")]:
        data = pg.evaluate(f"document.getElementById('{cid}').toDataURL('image/png')")
        open(f"{OUT}/{name}.png", "wb").write(base64.b64decode(data.split(",")[1]))

    # PDF bauen + Seiten rendern
    with pg.expect_download(timeout=30000) as dl:
        pg.click("#btn-pdf")
    pdf_path = dl.value.path()
    import fitz
    doc = fitz.open(pdf_path)
    for i, page in enumerate(doc):
        pix = page.get_pixmap(dpi=80)
        pix.save(f"{OUT}/pdf-{i+1}.png")
    print("PDF Seiten:", len(doc))
    pg.close()

    # Mobile 390×844
    pg = b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    pg.goto(BASE + "/?fast=1"); pg.wait_for_load_state("networkidle")
    pg.wait_for_timeout(300); pg.screenshot(path=f"{OUT}/09-mobile-hero.png")
    pg.goto(BASE + "/?demo=1&mock=1&fast=1"); pg.wait_for_load_state("networkidle")
    pg.click("#nav-next")
    pg.wait_for_selector("#screen-result:not([hidden])", timeout=15000)
    pg.wait_for_timeout(900)
    pg.screenshot(path=f"{OUT}/10-mobile-result.png", full_page=True)
    pg.close()
    b.close()
print("Shots →", OUT)
