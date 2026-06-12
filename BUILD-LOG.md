# BUILD-LOG — ikigAI · Der Ikigai-Generator

> op-build-Session 12.06.2026 · Konzept: `agent-studio/.planning/one-prompt/ikigai/CONCEPT.md`
> Dieses Log ist der Wieder-Aufnahme-State: Fortsetzungs-Sessions lesen zuerst diese Datei.
> Behauptungen hier gelten nur mit Artefakt (Commit, Test-Output, Datei).

## Architektur-Entscheidungen (vor Phase 1, fixiert)

- **Stack: statisches Vanilla-JS ohne Build-Step** (kein Vite). ⚠️ Abweichung vom
  Konzept („Vite + Vanilla JS/TS"): bewusst, weil das erprobte Wave-3-5-Muster
  (projekt-akte/angebots-blitz) ohne Bundler läuft — identisches Verhalten
  lokal (dev-server.mjs) und auf Vercel, ein bewegliches Teil weniger. Funktional
  deckungsgleich (Vanilla JS, Single-Page-Wizard). Animationen handgerollt
  (CSS-Transitions + WAAPI + IntersectionObserver + SVG-stroke-Ensō) statt GSAP
  (Konzept sagt „GSAP o.ä." → o.ä.).
- **Schutzschicht:** Port von `projekt-akte/api/ask.js` (Origin-Lock 403,
  In-Memory-Caps global+IP, graceful `fallback:true`). Modell-Kette:
  `gemini-3.5-flash` → `gemini-2.5-flash` (Stand 06/2026, aus projekt-akte verifiziert).
- **Fallback-Ergebnis (Lena)** lebt clientseitig (`assets/js/lena.js`) — API bleibt
  schlank, Cap/Fehler → Client rendert das gestagte Beispiel mit Badge.
- **PDF:** jsPDF direkt (Vektor-Text, kein html2canvas-Screenshot). Kein Kanji im
  PDF (Standard-14-Fonts = WinAnsi); 生き甲斐 nur im Web-UI via System-JP-Serif-Fallback.
- **Visual doppelt gerendert:** On-Page = SVG (animierbar, crisp); Share-Bild + PDF =
  Canvas-Renderer (`visual-canvas.js`) — SVG-in-<img> lädt keine Seiten-Fonts.
- **Fonts self-hosted** (DSGVO): Shippori Mincho latin 500/600/700 + Inter variable.
- **Anti-Generik serverseitig erzwungen:** Zitate werden gegen die User-Antworten
  validiert; nicht auffindbares Zitat → Ersatz durch beste fuzzy-gematchte
  Original-Antwort (deterministisch, kein zweiter LLM-Call).
- **Test-Modi:** `?fast=1` (Animationen instant), `?demo=1` (Lena-Antworten vorbefüllt),
  `?mock=1` (kein API-Call, gestagtes Ergebnis) — Lessons aus projekt-akte.
- **Legal:** eigene `impressum.html`/`datenschutz.html` (Vorlage projekt-akte,
  KI-Verarbeitung erklärt) — geht über die Konzept-Minimallösung (nur Footer-Links)
  hinaus, erfüllt die op-build-Legal-Pflicht (§5 DDG/DSGVO).

## Phasen-Status

| Phase | Status | Gate |
|---|---|---|
| 1 MVP-Kern | ✅ | PASS — suite.py 2× grün (38/38), Live-Call validiert (52/52 mit --live, gemini-3.5-flash, repaired_quotes 0). Commit 6149383 |
| 2 Features | ✅ | PASS — Suite 2× grün (46/46): PDF 6 Seiten, Share beide Formate, Cap→Fallback+Badge, Resume, 403/400. Commit 852fe39 |
| 3 Polish | ✅ | PASS — Suite 2× grün (56/56), Mobile 390×844 ohne H-Scroll, Erst-Load 243 KB. Selbst-Urteil: ja, würde ich benutzen — Wortspiel leise (nur Logo-Akzent), Design ruhig, Flow ~10 Min. Commit 51133fc |
| 4 Ship | ✅ | PASS — live_suite 2× grün (18/18) gegen https://ikigai.demo.osai.solutions inkl. echtem Synthese-Call, Zitate 3/3 wörtlich. GitHub Os-oe/ikigai, Vercel git connect, Domain attached. Commit 9a9c612 |
| 5 Excellence | 🔨 in Arbeit | offen |

## Protokoll

- 2026-06-12 19:25 — Konzept + RESEARCH + op-build-SKILL + pixel-runner/LESSONS gelesen.
  Schutzschicht-Referenz identifiziert: `~/Desktop/APPS/projekt-akte/api/ask.js` + `dev-server.mjs`.
- 2026-06-12 19:29 — Repo init, Logo kopiert (`assets/img/logo-mark.png`), Fonts
  (Shippori Mincho 500/600/700 latin + Inter var) + jsPDF 2.5.2 self-hosted.
- 2026-06-12 19:35 — Architektur fixiert (siehe oben), Fragen-Katalog aus RESEARCH §5 kuratiert.
- 2026-06-12 ~20:15 — ⚠️ Fachliche Korrektur: „OsAI-Orange" existiert nicht — Brand-Akzent ist
  das Siegelrot `#F6303A` (logo-mark.png + brand-card.json). Als Akzent übernommen (passt
  zur Hanko-Siegel-Optik des Washi-Designs).
- 2026-06-12 ~20:45 — Phase 1 komplett. Lessons: (a) Gemini 3.5 Flash braucht maxOutputTokens
  16k (Thinking-Tokens zählen mit — 4k → abgeschnittenes JSON, 41 s Latenz; ok-Call ~35 s);
  (b) API-Reihenfolge: Input-Validierung VOR Key-Check, sonst testet der No-Key-Server 503
  statt 400. Live-Ergebnis-Fixture: /tmp/ikigai-live-result.json. Kosten bisher ~0,01 € (verbucht).

## Excellence-Pass — 10 Schwächen (Phase 5)

1. **Ergebnis nicht wieder öffenbar** — nach Reload landet man auf dem Hero, das Ergebnis
   ist weg (nicht persistiert). Größte echte UX-Lücke. → **FIX (Top 1)**
2. **Lange Synthese-Wartezeit ohne Eskalations-Feedback** — echter Call 26–35 s
   (Gemini-3.5-Thinking); nach ~18 s wirkt es wie hängen. → **FIX (Top 2)**:
   Warte-Titel wechselt nach 18 s („dauert gerade etwas länger — die KI liest gründlich").
3. **A11y**: Likert/Chips ohne `aria-pressed`, Fehlerzeile ohne `role=status`. → **FIX (Top 3)**
4. **PDF: rote Zitat-Balken-Höhe** wird mit falscher Font gemessen (times-bold statt
   times-italic) → Balken zu kurz bei mehrzeiligen Zitaten. → **FIX (Top 4)**
5. **og.png 330 KB** — Palette-Optimierung auf ~120 KB. → **FIX (Top 5)**
6. Synthese-Latenz selbst (Thinking nicht abschaltbar ohne Risiko in der Modell-Kette) —
   akzeptiert, durch Fix 2 + Ensō-Loop + Fakten abgefedert. NOTIERT
7. Share 9:16 hat ruhige Leerzone 1560–1780 px — bewusst japanisch-minimal belassen. NOTIERT
8. In-Memory-Caps pro Function-Instanz — dokumentierter Kompromiss (Pattern-Entscheid). NOTIERT
9. Score-Ring animiert auch unterhalb des Folds (rAF statt IO) — kosmetisch. NOTIERT
10. Wortspiel-Lautstärke geprüft: nur Logo-Akzent + ein Hero-Halbsatz + Kaizen-Spalte —
    leise genug, keine Änderung nötig. NOTIERT

## Kosten (laufend)

| Posten | Schätzung | Ist |
|---|---|---|
| Gemini Flash Synthese (Tests + Live-E2E) | ~0,02 € | — |
| Bezahlte Bild-Assets | 0 € | 0 € |
