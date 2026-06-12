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
| 1 MVP-Kern | 🔨 in Arbeit | offen |
| 2 Features | ⬜ | offen |
| 3 Polish | ⬜ | offen |
| 4 Ship | ⬜ | offen |
| 5 Excellence | ⬜ | offen |

## Protokoll

- 2026-06-12 19:25 — Konzept + RESEARCH + op-build-SKILL + pixel-runner/LESSONS gelesen.
  Schutzschicht-Referenz identifiziert: `~/Desktop/APPS/projekt-akte/api/ask.js` + `dev-server.mjs`.
- 2026-06-12 19:29 — Repo init, Logo kopiert (`assets/img/logo-mark.png`), Fonts
  (Shippori Mincho 500/600/700 latin + Inter var) + jsPDF 2.5.2 self-hosted.
- 2026-06-12 19:35 — Architektur fixiert (siehe oben), Fragen-Katalog aus RESEARCH §5 kuratiert.

## Kosten (laufend)

| Posten | Schätzung | Ist |
|---|---|---|
| Gemini Flash Synthese (Tests + Live-E2E) | ~0,02 € | — |
| Bezahlte Bild-Assets | 0 € | 0 € |
