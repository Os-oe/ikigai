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

## Redesign (13.06.2026) — Premium-Workbook + Karussell + Permalink

- **jsPDF `d.text(lines, x, y)` setzt y als BASELINE**, nicht als Oberkante. Nach einem kleinen Label direkt eine große
  Mincho-Display-Zeile mit demselben y → die Versalien laufen NACH OBEN ins Label. Fix: vor dem Zeichnen `y += size*0.34`
  (Versalhöhe als Vorlauf). Trat an 3 Seiten gleichzeitig auf (S3/S8/S10) — ein Helfer-Bug, drei Symptome.
- **Poem-Break im PDF MUSS width-clampen, nicht nur Zeichen zählen.** Sinneinheiten-Umbruch (Komma/Gedankenstrich) reicht
  nicht — eine lange erste Sinneinheit läuft über den rechten Rand. `d.getTextWidth()` pro Zeile prüfen + Wort-Hardwrap
  via `splitTextToSize` als Fallback. Zusätzlich Satzgröße nach Länge staffeln (22/19/17 pt).
- **„Eine Idee pro Seite" + „keine halbleeren Seiten" sind im PDF ein Widerspruch — gewinnt: keine Halbleere.** Eine
  Dimension mit 2 Absätzen + Zitat füllt keine A4-Seite. Lösung: die Seite zur Vollkomposition machen — großer
  halbtransparenter Lasur-Blob (Bildgewicht unten) + riesiges blasses Kanji-Wasserzeichen. Aus „läuft ins Nichts" wird
  „bewusst inszenierte Bühne". Lieber 11 volle Seiten als 9 mit Dead-Zones.
- **Canvas-Text sauber kürzen statt hart `.slice(33)+"…"`.** Wrapped-Karussell-Listen: auf max. N Zeilen umbrechen, die
  letzte Zeile per `measureText` schrittweise kürzen bis sie + „…" passt. Hartes Slice mitten im Wort liest als kaputt,
  nicht als kuratiert. Quell-Content vorher an erster Sinngrenze (Komma/—) auf ~7 Wörter verdichten.
- **Permalink ohne Backend = lz-string `compressToEncodedURIComponent` ins `#fragment`.** Das Fragment geht NIE zum
  Server (HTTP lässt es weg) → das „nichts wird gespeichert"-Versprechen bleibt wörtlich wahr. Ergebnis-JSON (~4,4 KB
  komprimiert) gut unter URL-Limits. Boot-Pfad liest `#r=` mit Vorrang vor localStorage/Demo. URL-safe-Subset reicht
  (keine `%`-Escapes → sauber teilbar).
- **Neues optionales LLM-Feld immer abwärtskompatibel einführen:** Schema-Property NICHT in `required`, im Prompt
  beschreiben, im Cleanup defensiv mappen, und der Client braucht einen Fallback (hier: `carousel.js` leitet die Slides
  aus dem Normal-Ergebnis ab, wenn `erg.carousel` fehlt). So bricht kein alter Permalink/Cache.
- **Bei einem Redesign zuerst den IST-Stand rendern und ansehen, nicht den Code raten.** Die Vorsession hatte 80 %
  gebaut; die echten Restarbeiten (PDF-Bugs, fehlender Permalink, stale Tests) fand erst der Screenshot-Durchlauf.
  Tests waren auf das ALTE Design geeicht (PDF==6 Seiten, Share 1080×1080) und hätten grün-trügerisch falsche Zahlen
  zementiert — Test-Update gehört zwingend zum Redesign.

## R4 — Long-Text-Gate (13.06.2026)

- **Eine kurze Demo-Persona verdeckt Layout-Mängel systematisch.** „Lena" (`?demo=1`) hatte
  kurze Antworten — die Venn-/Karussell-/PDF-Overflows traten NUR bei langen, mehrwortigen
  + unbrechbar langen Begriffen auf. 3 Auto-Fix-Runden liefen am Mangel vorbei, weil sie immer
  gegen die kurze Demo testeten. **Lehre: ein Long-Text-Fixture (`?demo=long`) gehört zum
  Standard-Visual-Gate jedes Generators** — lange + bewusst unbrechbare Begriffe
  („Interdisziplinäre Systemarchitektur") als feste Stress-Persona neben der schönen Demo.
- **Horizontales Stauchen ist nie der richtige Overflow-Fallback.** `textLength="…"
  lengthAdjust="spacingAndGlyphs"` (SVG) und `ctx.scale(s,1)` (Canvas) lassen ein langes Wort
  zu unleserlich kondensierten Buchstaben zusammenlaufen — liest als kaputt. Richtige Kette:
  **(1) Wort-Wrap → (2) bei unbrechbaren Einzelwörtern Schrift stufenweise verkleinern → (3)
  erst als letzte Stufe Hard-Break per Zeichen (mit Bindestrich) → (4) ggf. kuratierte Ellipse.**
  Ein gemeinsamer `fitWrap`-Helfer in `ikigai-art.js` für SVG/Canvas/Karussell hält das konsistent.
- **Mehrzeilige Labels brauchen einen Block-Höhen-Plan, sonst spillt der obere Kreis raus.**
  Beim 4-Kreise-Venn wächst der Top-Lobe-Block nach OBEN (viewBox-Kopfraum reservieren), der
  Bottom nach unten, die Seiten zentriert — sonst stößt der Top-Block an die viewBox-Oberkante.
- **Rotierte PDF-Marginalie + langer Fließtext = Kollision.** Hashira ganz in den Margin (PW-4)
  UND den Body-Satzspiegel hart auf eine `BODY_RIGHT`-Konstante clampen — `splitTextToSize` ist
  ein Ziel, keine harte Grenze; der Gutter muss geometrisch garantiert sein, nicht gehofft.
- **„Komponiert" schlägt „voll-zentriert" auf Desktop.** Ein 660px-Wizard mit `min-height:100dvh`
  + vertikal zentrierter Stage liest auf 1440px als leer/unfertig (riesige Leerflächen, tief
  schwebende Nav). Fix: gerahmtes, schmaleres Panel das seinen Inhalt hugt (`flex:0 0 auto`) —
  Head/Frage/Nav gruppiert. Die alte R3-„voll-zentriert"-Regel war ein lokales Optimum; der
  Layout-Test musste auf das neue Gruppierungs-Intent umgeschrieben werden.

## Kosten (Ist)

| Posten | Menge | Ist |
|---|---|---|
| Gemini Flash Synthese (Tests + Live-E2E, ~10 Calls) | ~10 | ~0,02 € |
| Bild-/Audio-Assets | 0 (alles SVG/Canvas/Code) | 0,00 € |
| **Gesamt** | | **~0,02 €** (Budget 10 €, Konzept-Schätzung ≤1 € Build) |
