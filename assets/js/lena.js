/* Beispiel-Persona „Lena, 34, Projektmanagerin" — drei Aufgaben:
 * 1. ?demo=1 — Wizard-Vorbefüllung für Tests & Capture
 * 2. Cap-/Fehler-Fallback — gestagtes Ergebnis statt Fehlerbildschirm
 * 3. Qualitäts-Messlatte für den Synthese-Prompt (so konkret muss es klingen) */

window.LENA = {

  profil: { name: "Lena", beruf: "Projektmanagerin in einer Agentur" },

  ikigai9: [3, 3, 4, 3, 4, 3, 3, 5, 2], // Summe 30 — solide Basis

  antworten: {
    a1: "alte Fotos sortiere und bearbeite, bis aus einem Schnappschuss ein richtiges Bild wird",
    a2: ["Fotografieren & Gestalten", "Menschen etwas erklären", "Ordnung & Struktur schaffen"],
    a3: "Fotoalben kleben und mir zu jedem Bild eine Geschichte ausdenken",
    b1: "wenn ein Projekt im Chaos versinkt — ich sortiere die Lage und mache einen Plan, dem alle folgen können",
    b2: "aus einem wirren Haufen Anforderungen eine klare Struktur machen",
    b3: ["„Du erklärst das so, dass man es versteht“", "„Du bist unglaublich strukturiert“"],
    c1: "wenn Menschen in Meetings aneinander vorbeireden und niemand wirklich zuhört",
    c2: "kleinen Teams, die gute Arbeit machen, aber im Organisationschaos untergehen",
    d1: "fürs Projektmanagement — und einmal für eine Hochzeitsreportage mit meiner Kamera",
    d2: "wie man ein Projekt so plant, dass es nicht am dritten Tag explodiert",
    e1: "der erste Kaffee am Samstagmorgen, bevor alle wach sind",
    e2: "zehn Minuten auf dem Balkon mit Tee, bevor ich den Laptop aufklappe",
    e3: "meine Schwester — und mein kleiner Fotoblog, den nur zwölf Leute lesen",
    e4: "auf eine Fotoreise nach Island, die ich seit drei Jahren vor mir herschiebe"
  },

  /* Gestagtes Synthese-Ergebnis — exakt das Schema von /api/synthesize */
  ergebnis: {
    error: "",
    zentrum: "Du bringst Ordnung ins Chaos und machst sichtbar, was anderen entgeht — mit Plan und mit Kamera.",
    kreise: {
      liebe:   ["Fotografie", "Bilder & Geschichten", "Erklären"],
      staerke: ["Struktur schaffen", "Ruhe im Chaos", "Verständlich machen"],
      welt:    ["Teams im Chaos", "Echtes Zuhören", "Gute Arbeit sichtbar"],
      markt:   ["Projektmanagement", "Foto-Reportagen", "Planungs-Wissen"]
    },
    schnittmengen: {
      passion: "Geschichten strukturieren",
      mission: "Klarheit stiften",
      beruf: "Projekte führen",
      berufung: "Teams entwirren"
    },
    erkenntnisse: [
      {
        titel: "Deine Kamera ist kein Hobby mehr",
        zitat: "einmal für eine Hochzeitsreportage mit meiner Kamera",
        text: "Du wurdest dafür schon bezahlt — der Markt hat also längst Ja gesagt. Du führst die Fotografie nur noch als Hobby in deiner eigenen Buchhaltung."
      },
      {
        titel: "Struktur ist deine Form von Fürsorge",
        zitat: "ich sortiere die Lage und mache einen Plan, dem alle folgen können",
        text: "Du beschreibst Planung nicht als Pflicht, sondern als Hilfe für andere. Das ist der Unterschied zwischen einem Skill und einer Stärke, die trägt."
      },
      {
        titel: "Dein Kompass zeigt auf Kommunikation",
        zitat: "wenn Menschen in Meetings aneinander vorbeireden und niemand wirklich zuhört",
        text: "Deine Wut sitzt genau dort, wo deine Stärke sitzt: Verständlichkeit. Was dich stört, ist exakt das Problem, das du lösen kannst."
      }
    ],
    ideen: [
      {
        typ: "Side-Project",
        titel: "Foto-Essays über kleine Teams, die gute Arbeit machen",
        begruendung: "Weil du „kleinen Teams, die gute Arbeit machen, aber im Organisationschaos untergehen“ helfen willst — und weil du Fotos bearbeitest, „bis aus einem Schnappschuss ein richtiges Bild wird“. Beides zusammen ist ein Format: du machst diese Teams sichtbar.",
        erster_schritt: "Frag diese Woche ein Team aus deinem Umfeld, ob du es einen Tag mit der Kamera begleiten darfst."
      },
      {
        typ: "Beruf",
        titel: "Von der Projektmanagerin zur Projekt-Klärerin",
        begruendung: "Weil du sagst, du könntest schon morgen beibringen, „wie man ein Projekt so plant, dass es nicht am dritten Tag explodiert“ — das ist ein Workshop-Titel, kein Wunschtraum. Dein Kompliment „Du erklärst das so, dass man es versteht“ ist die Bestätigung von außen.",
        erster_schritt: "Schreib die fünf häufigsten Projekt-Explosionen auf, die du erlebt hast — das ist dein Curriculum."
      },
      {
        typ: "Projekt",
        titel: "Der Fotoblog bekommt eine Aufgabe",
        begruendung: "Weil „mein kleiner Fotoblog, den nur zwölf Leute lesen“ in deiner Antwort auf die Ikigai-Frage auftaucht — er trägt dich also schon. Er braucht kein Publikum, er braucht eine Richtung: deine Island-Reise, die du „seit drei Jahren vor dir herschiebst“, wäre Kapitel eins.",
        erster_schritt: "Blocke dir noch heute ein Wochenende im Kalender — nicht für Island, für die Recherche dazu."
      }
    ],
    alltag: [
      { moment: "der erste Kaffee am Samstagmorgen, bevor alle wach sind", saeule: 4,
        kommentar: "Ein geschützter Moment, der niemandem etwas beweisen muss — genau das meint Mogi mit Freude an kleinen Dingen." },
      { moment: "zehn Minuten auf dem Balkon mit Tee, bevor ich den Laptop aufklappe", saeule: 5,
        kommentar: "Du hast bereits ein Ankommens-Ritual. Verteidige es wie einen Termin." },
      { moment: "meine Schwester — und mein kleiner Fotoblog, den nur zwölf Leute lesen", saeule: 3,
        kommentar: "Beziehungen und ein stilles Projekt — zwei Ikigai-Quellen, die schon da sind. Nichts davon muss größer werden, um zu zählen." },
      { moment: "eine Fotoreise nach Island, die ich seit drei Jahren vor mir herschiebe", saeule: 1,
        kommentar: "Drei Jahre Aufschub heißt meist: Der erste Schritt ist zu groß gedacht. Klein anfangen — ein Wochenende, eine Region, ein Thema." }
    ],
    kaizen: [
      { woche: 1, fokus: "Sichtbar machen, was da ist",
        schritte: [
          { schritt: "Wähle deine zehn besten Fotos aus und leg sie in einen Ordner „Portfolio“.",
            ki_hilfe: "Lass eine Bild-KI Bildunterschriften-Rohfassungen vorschlagen — du kuratierst nur noch, statt bei null zu starten." },
          { schritt: "Schreib die fünf Projekt-Explosionen auf, die du am häufigsten gesehen hast.",
            ki_hilfe: "Diktiere sie als Sprachnotiz und lass dir daraus eine saubere Liste mit je einem Gegenmittel strukturieren." }
        ] },
      { woche: 2, fokus: "Zeit freiräumen",
        schritte: [
          { schritt: "Identifiziere deinen nervigsten wöchentlichen Report — und baue ihn einmal mit KI-Hilfe.",
            ki_hilfe: "Aus Stichpunkten den Report-Text generieren lassen: aus 45 Minuten Excel-Prosa werden 10 Minuten Kontrolle." },
          { schritt: "Verteidige die zehn Balkon-Minuten an drei Arbeitstagen — Kalenderblocker.",
            ki_hilfe: "Keine. Manche Schritte gehören dir allein." }
        ] },
      { woche: 3, fokus: "Erster Kontakt",
        schritte: [
          { schritt: "Frag ein kleines Team, ob du es einen Tag fotografisch begleiten darfst.",
            ki_hilfe: "Lass dir drei Varianten der Anfrage schreiben — eine herzliche, eine knappe, eine mutige — und schick die, die nach dir klingt." },
          { schritt: "Skizziere den Workshop „Projekte, die nicht explodieren“ auf einer Seite.",
            ki_hilfe: "Gib der KI deine fünf Explosionen und lass dir eine 90-Minuten-Agenda mit Übungen vorschlagen." }
        ] },
      { woche: 4, fokus: "Klein veröffentlichen",
        schritte: [
          { schritt: "Stell den ersten Foto-Essay auf deinen Blog — zwölf Leser reichen.",
            ki_hilfe: "Nutze KI als Lektorat: Rechtschreibung, Längen, ein Titel-Vorschlag. Die Stimme bleibt deine." },
          { schritt: "Buch das Recherche-Wochenende für Island — nicht die Reise, den Anfang.",
            ki_hilfe: "Lass dir eine 3-Tages-Route für eine einzige Region planen — klein anfangen, nicht alles auf einmal." }
        ] }
    ],
    score_kommentar: "30 von 45 Punkten — eine solide Basis. Auffällig: Dein stärkster Wert liegt bei „Ich möchte etwas Neues lernen oder anfangen“ (5/5), dein schwächster bei innerer Gelassenheit (2/5). Übersetzt: Die Energie ist da, ihr fehlt nur ein geschützter Raum."
  }
};
