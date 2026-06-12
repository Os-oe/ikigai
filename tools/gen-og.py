#!/usr/bin/env python3
"""OG-Bild (1200×630) — Canvas-Render im Seiten-Kontext (Lena-Visual + Wortmarke).
Erwartet laufenden Server :8982."""
import base64
from playwright.sync_api import sync_playwright

JS = """async () => {
  await document.fonts.ready;
  const c = document.createElement('canvas');
  c.width = 1200; c.height = 630;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f5f0e6'; ctx.fillRect(0, 0, 1200, 630);
  const g = ctx.createRadialGradient(350, 280, 60, 600, 315, 800);
  g.addColorStop(0, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(190,178,152,.16)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1200, 630);

  // Ensō hinter dem Venn
  ctx.strokeStyle = 'rgba(33,29,24,.13)'; ctx.lineWidth = 8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(330, 315, 268, -0.42 * Math.PI, 1.34 * Math.PI); ctx.stroke();

  window.IKIGAI_DRAW_VENN(ctx, window.LENA.ergebnis, 330, 315, 470);

  // Rechte Seite: Wortmarke + Claim
  ctx.textAlign = 'left';
  ctx.font = '700 86px "Shippori Mincho", Georgia, serif';
  ctx.fillStyle = '#211d18';
  const w1 = ctx.measureText('ikig').width;
  ctx.fillText('ikig', 690, 220);
  ctx.fillStyle = '#f6303a'; ctx.fillText('AI', 690 + w1, 220);
  ctx.font = '600 33px "Shippori Mincho", Georgia, serif';
  ctx.fillStyle = '#211d18';
  ctx.fillText('Finde, was dein Leben trägt —', 690, 290);
  ctx.fillText('und lass KI dir den Weg', 690, 334);
  ctx.fillText('freiräumen.', 690, 378);
  ctx.font = '500 21px Inter, sans-serif';
  ctx.fillStyle = '#5b5347';
  ctx.fillText('~10 Minuten · kein Konto · PDF sofort', 690, 432);
  ctx.font = 'italic 500 20px "Shippori Mincho", Georgia, serif';
  ctx.fillStyle = '#8d8374';
  ctx.fillText('Das berühmte Diagramm ist gar nicht', 690, 488);
  ctx.fillText('japanisch — wir erzählen beide Wahrheiten.', 690, 514);
  ctx.font = '600 19px Inter, sans-serif';
  ctx.fillStyle = '#5b5347';
  ctx.fillText('powered by OsAI', 690, 570);
  return c.toDataURL('image/png');
}"""

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={"width": 1280, "height": 800})
    pg.goto("http://127.0.0.1:8982/?fast=1")
    pg.wait_for_load_state("networkidle")
    data = pg.evaluate(JS)
    open("assets/img/og.png", "wb").write(base64.b64decode(data.split(",")[1]))
    b.close()
print("og.png geschrieben")
