# Lessons — ikigAI Build (2026-06-12)

Erkenntnisse aus dem autonomen one-prompt-Lauf (Station ② op-build),
wiederverwendbar für künftige Wizard-/Live-KI-Projekte.

## Gemini-Synthese (große strukturierte Outputs)

- **Thinking-Tokens zählen gegen `maxOutputTokens`.** 4096 reichte für ein ~2.500-Token-JSON
  NICHT — Gemini 3.5 Flash verbrennt erst Thinking-Budget, das JSON wird mittendrin
  abgeschnitten („Expected double-quoted property name") → 16384 setzen.
- **Latenz einplanen, nicht wegoptimieren:** 26–35 s pro Synthese-Call sind bei
  3.5-Flash-Thinking normal. Lösung ist UX, nicht Modell-Gefummel: Ensō-Loop +
  rotierende Fakten + **zweistufiges Warte-Feedback** (nach 18 s „dauert gerade länger…").
- **Anti-Generik dreistufig:** (1) Prompt-Eiserne-Regeln (wörtliche Zitate, „Weil du"-Ketten,
  Floskel-Verbotsliste), (2) `responseSchema`, (3) **serverseitige Zitat-Validierung**
  (normalisierter Substring-Check gegen die Antworten + deterministischer Fuzzy-Ersatz).
  Ergebnis: 0 reparierte Zitate über alle Live-Läufe — der Prompt hält, aber erst die
  Server-Validierung macht es garantierbar.
- **Reihenfolge im Handler:** Input-Validierung VOR Key-Check — sonst testet die
  No-Key-Umgebung 503 statt 400 und der error_user-Pfad ist unprüfbar.

## Schutzschicht (3. Wiederverwendung des Patterns)

- projekt-akte/angebots-blitz-Muster portiert sich in ~30 Min: Origin-Lock → 403,
  In-Memory-Caps global+IP, `fallback:true` → Client zeigt gestagtes Beispiel.
- **Das gestagte Fallback-Ergebnis doppelt nutzen:** dieselbe Persona (Lena) ist
  (a) Cap-Fallback, (b) ?demo=1-Vorbefüllung für Tests/Capture, (c) Qualitäts-Messlatte
  für den Prompt — eine Datei (`lena.js`), drei Jobs.

## Frontend

- **`[hidden]` verliert gegen `display:flex`.** Jede Komponente mit eigener display-Regel
  braucht explizit `.komponente[hidden]{display:none}` — der Resume-Banner war sonst
  permanent sichtbar, obwohl JS nie `hidden` entfernt hat.
- **SVG-in-`<img>` lädt keine Seiten-Fonts** → fürs Share-Bild/PDF einen zweiten
  Canvas-Renderer mit geteilter Geometrie (`IKIGAI_GEO`) bauen statt SVG zu serialisieren.
- **4-Kreise-Venn-Typo:** Zentrum-Satz nach Länge staffeln (`zentrumFit`: 3 Stufen
  Größe/Zeilenbreite/Zeilenzahl), Schnittmengen-Labels bei `1.19 × offset` diagonal
  (Lens-Mitte der Zweier-Schnittmenge — 1.62 lag außerhalb der Kreise).
- **Ergebnis in localStorage persistieren** war der billigste große UX-Fix des
  Excellence-Passes: Reload nach 10 Minuten Fragebogen darf das Ergebnis nie wegwerfen.

## jsPDF (direktes Zeichnen statt html2canvas)

- Standard-14-Fonts (WinAnsi) können deutsche Umlaute UND „"-Anführungen + Gedankenstrich —
  kein Font-Embedding nötig. Kanji nicht → 生き甲斐 nur im Web-UI.
- `splitTextToSize` misst mit der AKTUELL gesetzten Font — vor jeder Höhen-Messung
  Font+Style setzen, sonst stimmen Balken/Boxen nicht (Zitat-Balken-Bug).
- times (Serif) + helvetica (Sans) + Washi-Hintergrund-Rect pro Seite + Keep-together-Messung
  pro Block ergibt ein „gestaltet, nicht Screenshot"-PDF in ~250 Zeilen.
- jsPDF lazy laden (erst beim Klick): Erst-Load blieb bei 243 KB inkl. 4 Fonts.

## Sonstiges

- Logo-Master 318 px / 179 KB → fürs Web auf 160 px / 15 KB resizen (gleiche Datei für
  Share-Canvas + PDF reicht völlig).
- `vercel domains add <domain>` hängt die Subdomain direkt ans Projekt (Wildcard-CNAME
  existiert) — der „domain_fetch_failed"-Error danach ist kosmetisch, Domain war live.
- „OsAI-Orange" gibt es nicht: Brand-Akzent ist Siegelrot `#F6303A` (logo-mark.png /
  brand-card.json) — passt als Hanko-Akzent perfekt zu Washi/Tusche.

## Kosten (Ist)

| Posten | Menge | Ist |
|---|---|---|
| Gemini Flash Synthese (Tests + Live-E2E, ~10 Calls) | ~10 | ~0,02 € |
| Bild-/Audio-Assets | 0 (alles SVG/Canvas/Code) | 0,00 € |
| **Gesamt** | | **~0,02 €** (Budget 10 €, Konzept-Schätzung ≤1 € Build) |
