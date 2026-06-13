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
| 5 Excellence | ✅ | PASS — 10 Schwächen dokumentiert, Top 5 gefixt, Re-Deploy, Suite 2× grün (58/58 lokal) + live_suite 2× grün (18/18) |
| 6 Redesign | ✅ | PASS — Design-Brief vollständig umgesetzt, suite.py 2× grün (74/74 lokal) + live_suite 2× grün (24/24), deployed. Commits 592fb16…52ef8a7 |

## Redesign-Abschnitt (13.06.2026 — visuelles Redesign nach DESIGN-BRIEF.md)

> Quelle: `agent-studio/.planning/one-prompt/ikigai/redesign/DESIGN-BRIEF.md` (verbindlich).
> Autonome Build-Session, keine Rückfragen. Vorarbeit der vorigen Session (Commits 592fb16 + 6fe1491:
> Lasur-Venn, Wrapped-Karussell, Held-Satz-Share, inszenierte Warte-Sequenz) wurde fortgesetzt.

**Umgesetzt — je Baustein:**

- **Venn-Visual (SVG + Canvas):** Lasur-Multiply-Venn (keine Outlines), organische seeded Blobs (jeder User ein Unikat),
  Aquarell-Saum (Radialgradient), Misregistration; saubere Center-Plakette + Hanko mit Initialen, Satz GROSS als Held
  darunter (Tuschlinie ans Siegel), 4 Labels außen + Kanji-Marker (愛技世価) + Farbnamen-Legende. Diagramm-Mittelpunkt
  tiefer gesetzt (cy 250→290), damit das obere Label nicht an die viewBox-Oberkante stößt. SVG (`venn.js`) + Canvas
  (`visual-canvas.js`) teilen die Geometrie/Palette aus `ikigai-art.js` → pixel-nah identisch. Mit kurzen UND langen
  Begriffen geprüft (Overflow-Stresstest „Maximiliana"-Persona): kein Überlauf.
- **PDF Premium-Workbook (`pdf.js`):** Hybrid jsPDF-Vektor-Text + Canvas-Kunstebenen. **Shippori Mincho als TTF
  eingebettet** (`assets/vendor/shippori-pdf-fonts.js`, lazy via loadVendor — kein Times mehr), Washi-JPEG-Textur,
  Hanko-PNG, Venn als hochauflösendes Canvas-Bild. 11 Seiten (Cover-Hinomaru, Satz-Seite, Venn, 4 Dimensionen,
  Score+Alltag, Kaizen, wahre Geschichte, Okuzuke-Kolophon). Editorial/Ma: asymmetrischer Satzspiegel, 3-Stimmen-Typo,
  Haarlinien, Hashira-Marginalie (90°), Kintsugi-Goldfaden, Mon-Signet-Fußzeile, 3–4 mm Siegelrot-Zitatblock. **674 KB
  (< 1 MB), Text selektierbar.** Bug-Fixes dieser Session: Label/Display-Baseline-Kollision (S3/S8/S10), Satz-Seite
  width-clamp gegen Überlauf, Dimensions-Seiten zu Vollkompositionen (großer Lasur-Blob + Kanji-Wasserzeichen statt
  halbleer — löst AUDIT #1), Kaizen auf eine Seite verdichtet (12→11 Seiten).
- **Share-Karussell (`carousel.js`):** 6 Slides @1080×1350 (Wrapped-Dramaturgie), Slide 3 (der Satz, invertiert dunkel +
  Hanko) = Default-Einzel-Share. Export-ZIP = 6 PNGs + Story-Crop + LinkedIn-PDF (eigener Mini-ZIP-Writer + jsPDF).
  HTML/Canvas-Render, 0 € Assets. Slide-5-Freuden: sauberer 2-Zeilen-Umbruch + auf ~7 Wörter verdichtet (statt hartem
  „…"-Abschnitt).
- **Ergebnis-Seite + Flow (`result.js`, `wizard.js`, `style.css`):** choreografierte Scroll-Erzählung mit Rhythmuswechseln
  (Aijiro-Kühlblock + dunkler Kon-Block brechen die Beige-Monotonie, AUDIT #18), differenziertes Karten-Vokabular
  (Zitat-/Ideen-/Alltags-/Kaizen-Karten, AUDIT #19), fühlbare Washi-Textur (mehrlagiges feTurbulence + Lichtverlauf,
  AUDIT #20), Score als dickerer Datengrafik-Ring + Vorher/Nachher-Delta, .ics-30-Tage-Wiedermessung. Warte-Screen:
  großer prominenter Ensō, echte User-Worte in der Status-Sequenz, Footer ausgeblendet (AUDIT #24), Typewriter-Reveal
  + Scroll-Lock. **Wizard-Piping (P2):** an 3 Fragen wird eine frühere Antwort wörtlich aufgegriffen.
- **Permalink `#r=` (P1):** Ergebnis via lz-string (`assets/vendor/lz-string.min.js`) komprimiert ins URL-Fragment
  (~4,4 KB), „Link kopieren"-Button, Boot-Pfad öffnet das Ergebnis direkt. **Fragment geht nie zum Server** →
  Datenschutz-Versprechen bleibt wörtlich wahr. Kein Backend.
- **API (`synthesize.js`):** optionales `carousel`-Feld (kuratierte teilbare Verdichtung, harter Privacy-Filter im
  Prompt: kein Geld/Defizit/Therapie-Ton) — **abwärtskompatibel**: fehlt es, leitet der Client die Slides aus dem
  normalen Ergebnis ab (Fallback in `carousel.js`). Schutzschicht/Caps unverändert.

**Bewusste Auslassungen:** P3 (Druck-Poster A3, Sound-Toggle) — Monetarisierungs-/Later-Items, risikoarm aber außerhalb
des Kern-Scopes; nicht gebaut. PDF blieb bei 11 Seiten statt 8–9 (Brief-Ziel): bewusst, weil die harte Brief-Regel
„keine halbleeren Seiten" Vorrang hat — 11 volle/bewusst-inszenierte Seiten schlagen 9 mit Dead-Zones.

**Gates:** Visuelle Gates je Baustein per Screenshot/Read geprüft (PDF-Seiten einzeln, alle 6 Karussell-Slides einzeln,
Venn kurz+lang, Mobile 390×844). suite.py **74/74 lokal 2× grün**, live_suite **24/24 2× grün** gegen
https://ikigai.demo.osai.solutions inkl. echtem Gemini-Call (Zitate 3/3 wörtlich). Erst-Load 314 KB (< 400 KB).
Kosten Redesign: ~0 € (alles Code/SVG/Canvas; nur 2 Live-Gemini-Calls der Suite ~0,01 €).

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
| Gemini Flash Synthese (Tests + Live-E2E, ~10 Calls) | ~0,02 € | ~0,02 € (budget-guard: 2× 0,01 € verbucht) |
| Bezahlte Bild-Assets | 0 € | 0 € |

## Abschluss (12.06.2026)

- LIVE: https://ikigai.demo.osai.solutions · Repo https://github.com/Os-oe/ikigai
- LESSONS.md geschrieben · Sales-Board Lead `lead-mqb92k04ejes` (Sprint `one-prompt-kit-ikigai`, delivered, Demo-Record)
- Lauf-Status: `agent-studio/.planning/one-prompt/ikigai/RUN-STATUS.md` (inkl. Capture-Hinweise)
- Alle lokalen Dev-Server beendet.

## R4 — Finale Fix-Session (13.06.2026): Long-Text-Mängel

Nach 3 Review-Runden blieben 2 P1- + 3 P2-Mängel offen, die die Auto-Fix-Runden NICHT
erwischten — **weil die Demo-Persona „Lena" (?demo=1) kurze Antworten hat und die Mängel
nur bei LANGEN, realistischen Begriffen auftreten.** Hebel dieser Session: ein
Long-Text-Fixture (`?demo=long`, Persona „Konstantin", LENA_LONG) mit mehrwortigen +
unbrechbar langen Begriffen („Interdisziplinäre Systemarchitektur", „Menschen in
Übergangsphasen begleiten"). Jeder Fix gegen dieses Fixture visuell verifiziert.

| Finding | Fix | Beleg |
|---|---|---|
| **P1-A** Venn bricht bei langen Begriffen (Text spillt aus Lobes, Top-Lobe komplett raus, Seiten-Labels in Nachbarzonen) | Begriffe mehrzeilig umbrechen + Schrift stufenweise schrumpfen (NIE horizontal stauchen), Hard-Break unbrechbarer Wörter; Block-Layout top-up/bottom-down/seiten-zentriert; viewBox-Kopfraum (`vTop`); langer Satz maxLines 4→7 (keine '…'-Trunkierung mehr). SVG (`venn.js`) **und** Canvas (`visual-canvas.js`). | `L3-venn-svg.png`, `L-pdf-page-03.png` |
| **P1-B** Karussell-Slide 2 quetscht lange Antworten horizontal unleserlich | `wrapDraw`→`fitWrap` auf allen Text-Slides: Wort-Wrap + Schrift-Shrink, kein `scale(s,1)`-Squeeze mehr; Slide-2-Wortbudget 330→430px + 3 Zeilen. | `L2-slide-2.png`, `L2-slide-3.png`, `L2-slide-5.png` |
| **P2-A** PDF-Laufkopf kollidiert mit Fließtext (S2/S8/S10) | Hashira PW-8→PW-4 (ganz in den Margin) + Body-Satzspiegel hart auf `BODY_RIGHT`=PW-16 geclamped → garantierter leerer Gutter. | `L-pdf-page-{02,08,10}.png` |
| **P2-B** Venn-Achsen-Labels zu kontrastarm (hellgrau auf Lasur) | Dunkle Sumi-Tinte + helle Backing-Pill hinter jedem Versal-Label. SVG + Canvas (Ergebnisseite + PDF). | `L3-venn-svg.png`, `L-pdf-page-03.png` |
| **P2-C** Desktop-Wizard wirkt auf breiten Screens leer | Auf ≥720px komponiertes, gerahmtes Washi-Panel (max-width 600, vertikal zentriert), Stage hugt Inhalt (flex:0 0 auto) → Head/Frage/Nav gruppiert. Mobile unverändert. | `D2-wizard-1440.png`, `M-wizard-390.png` (Mobile-Parität) |
| **P3** Story-Export erbt 6er-Deck-Paginierung „03 — 06" | `SUPPRESS_PAGINATION`-Flag beim Story-Render. | — |

P3 Font-Preload-Warnung **bewusst nicht** angefasst (kosmetisch; Preloads sind korrekt
gesetzt + helfen Hero-LCP, Entfernen wäre Regress). Hero-Desktop-Leerraum bewusst ruhig.

**Test:** `tests/suite.py` um R4-Long-Text-Gate erweitert (Venn ohne `textLength`-Stauchung,
Satz nicht trunkiert, Slide-2-Wort umgebrochen statt gestaucht, fitWrap-Hard-Break, alle 6
Long-Slides 1080×1350, PDF <1MB + Gutter Body↔Hashira leer via PyMuPDF-Pixel-Check). 99/99
lokal 2× grün. `live_suite` 2× grün gegen Live-URL. Keine bezahlten Calls.
