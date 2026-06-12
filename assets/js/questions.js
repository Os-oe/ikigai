/* Fragen-Katalog ikigAI — kuratiert aus RESEARCH.md §5 (12.06.2026).
 * Quellen: Ikigai-9 (Imai et al. 2012; Fido/Kotera/Asano 2019, dt. Übertragung),
 * Venn-Dimensionen A–D, japanische Alltags-Ebene E (Mogi 2017, Nakanishi 1999). */

window.IKIGAI_FRAGEN = {

  likertLabels: [
    "trifft gar nicht zu",
    "trifft eher nicht zu",
    "teils-teils",
    "trifft eher zu",
    "trifft voll zu"
  ],

  /* Ikigai-9 — validierte Skala, 3 Dimensionen à 3 Items.
   * dim: e = optimistische Emotionen · z = aktive Zukunftshaltung · b = eigene Bedeutung */
  ikigai9: [
    { id: "k1", dim: "b", dimName: "Eigene Bedeutung",      text: "Ich glaube, dass ich auf jemanden einen Einfluss habe." },
    { id: "k2", dim: "e", dimName: "Lebensgefühl",          text: "Mein Leben fühlt sich innerlich reich und erfüllt an." },
    { id: "k3", dim: "z", dimName: "Blick nach vorn",       text: "Ich interessiere mich für viele Dinge." },
    { id: "k4", dim: "b", dimName: "Eigene Bedeutung",      text: "Ich habe das Gefühl, zu jemandem oder zur Gesellschaft beizutragen." },
    { id: "k5", dim: "z", dimName: "Blick nach vorn",       text: "Ich möchte mich weiterentwickeln." },
    { id: "k6", dim: "e", dimName: "Lebensgefühl",          text: "Ich fühle mich oft glücklich." },
    { id: "k7", dim: "b", dimName: "Eigene Bedeutung",      text: "Ich denke, dass meine Existenz von etwas oder jemandem gebraucht wird." },
    { id: "k8", dim: "z", dimName: "Blick nach vorn",       text: "Ich möchte etwas Neues lernen oder anfangen." },
    { id: "k9", dim: "e", dimName: "Lebensgefühl",          text: "Ich habe innerlich Raum und Gelassenheit." }
  ],

  /* Score-Einordnung (Summe 9–45). Bewusst kein Zeugnis-Ton. */
  scoreBands: [
    { min: 9,  max: 18, label: "Leise Phase",
      text: "Dein Ikigai-Gefühl ist gerade leise. Das ist kein Urteil — eher ein Hinweis, dass die kleinen Quellen mehr Platz brauchen." },
    { min: 19, max: 27, label: "Grundrauschen",
      text: "Es gibt ein Grundrauschen an Sinn und Freude — aber Luft nach oben. Die Alltags-Ebene unten ist dein Hebel." },
    { min: 28, max: 36, label: "Solide Basis",
      text: "Du hast eine solide Ikigai-Basis. Jetzt geht es um Richtung: wohin mit der Energie?" },
    { min: 37, max: 45, label: "Stark ausgeprägt",
      text: "Dein Ikigai-Gefühl ist stark ausgeprägt — der Plan unten hilft dir, es bewusst zu pflegen statt es dem Zufall zu überlassen." }
  ],

  /* Profil — ein Screen, zwei Felder */
  profil: {
    intro: "Kurz vorweg",
    fields: [
      { id: "name",  label: "Wie dürfen wir dich nennen?", placeholder: "Vorname genügt", optional: true, maxLen: 40 },
      { id: "beruf", label: "Was machst du gerade beruflich — in einem Satz?", placeholder: "z. B. Projektmanagerin in einer Agentur", optional: false, maxLen: 120 }
    ]
  },

  /* Blöcke A–E — eine Frage pro Screen */
  bloecke: [
    {
      id: "A", name: "Was du liebst", kanji: "好",
      intro: "Erster Kreis: das, was dich von innen zieht — nicht, was du können musst.",
      fragen: [
        { id: "a1", type: "text", prefix: "Ich vergesse die Zeit, wenn ich …",
          prompt: "Wobei vergisst du die Zeit?",
          placeholder: "… z. B. an etwas baue, fotografiere, ein Problem knacke",
          minLen: 8, maxLen: 280 },
        { id: "a2", type: "chips", multi: true, min: 1, max: 3,
          prompt: "Wonach fühlst du dich energiegeladen statt leer?",
          hint: "Wähle bis zu drei — oder schreib dein eigenes.",
          options: [
            "Etwas mit den Händen schaffen", "Schreiben & Worte finden",
            "Fotografieren & Gestalten", "Menschen etwas erklären",
            "Anderen helfen", "Neues lernen & verstehen",
            "Draußen sein & Bewegung", "Musik & Klang",
            "Ordnung & Struktur schaffen", "Tüfteln, bis es läuft"
          ],
          customAllowed: true, customLabel: "Eigenes …", maxLen: 80 },
        { id: "a3", type: "text",
          prompt: "Was hast du als Kind geliebt — und nie ganz losgelassen?",
          placeholder: "… ehrlich, auch wenn es klein klingt",
          minLen: 5, maxLen: 280 }
      ]
    },
    {
      id: "B", name: "Worin du gut bist", kanji: "才",
      intro: "Zweiter Kreis: das, was dir leichtfällt — oft so leicht, dass du es übersiehst.",
      fragen: [
        { id: "b1", type: "text",
          prompt: "Wofür bitten dich Menschen um Hilfe?",
          placeholder: "… was rufen Leute bei dir ab, wenn es brennt?",
          minLen: 8, maxLen: 280 },
        { id: "b2", type: "text",
          prompt: "Was fällt dir leicht, das andere schwer finden?",
          placeholder: "… das, wofür du nie üben musstest",
          minLen: 5, maxLen: 280 },
        { id: "b3", type: "chips", multi: true, min: 1, max: 3,
          prompt: "Welches Kompliment bekommst du öfter — und tust es ab?",
          hint: "Komplimente, die man abtut, zeigen oft die echten Stärken.",
          options: [
            "„Du erklärst das so, dass man es versteht“",
            "„Du bist unglaublich strukturiert“",
            "„Du bleibst ruhig, wenn alles brennt“",
            "„Du siehst Details, die andere übersehen“",
            "„Du bringst Menschen zusammen“",
            "„Du denkst dich so schnell ein“",
            "„Bei dir fühlt man sich gehört“"
          ],
          customAllowed: true, customLabel: "Anderes …", maxLen: 80 }
      ]
    },
    {
      id: "C", name: "Was die Welt braucht", kanji: "需",
      intro: "Dritter Kreis: dein Beitrag. „Welt“ darf klein sein — deine Straße zählt.",
      fragen: [
        { id: "c1", type: "text",
          prompt: "Was macht dich wütend oder unruhig, wenn du es siehst?",
          hint: "Wut ist ein Kompass — sie zeigt, was dir wichtig ist.",
          placeholder: "… ein Zustand, ein Umgang, eine Lücke",
          minLen: 8, maxLen: 280 },
        { id: "c2", type: "text",
          prompt: "Wem möchtest du konkret helfen — welche Menschen, welche Gruppe?",
          placeholder: "… so konkret wie möglich",
          minLen: 5, maxLen: 280 }
      ]
    },
    {
      id: "D", name: "Wofür man dich bezahlen kann", kanji: "職",
      intro: "Vierter Kreis: der Markt. Auch informelle Beweise zählen.",
      fragen: [
        { id: "d1", type: "text",
          prompt: "Wofür wurdest du schon bezahlt — auch informell?",
          hint: "Auch der Kuchen gegen Nachhilfe zählt.",
          placeholder: "… Jobs, Aufträge, Gefälligkeiten mit Gegenwert",
          minLen: 5, maxLen: 280 },
        { id: "d2", type: "text",
          prompt: "Was könntest du anderen schon morgen beibringen?",
          placeholder: "… ohne weitere Vorbereitung",
          minLen: 5, maxLen: 280 }
      ]
    },
    {
      id: "E", name: "Dein Ikigai im Kleinen", kanji: "生",
      intro: "Ebenenwechsel: In Japan ist Ikigai ein Alltagswort. Jetzt geht es nicht um Beruf — sondern um das, was deinen Tag trägt.",
      fragen: [
        { id: "e1", type: "text",
          prompt: "Welchen kleinen Alltagsmoment genießt du wirklich?",
          placeholder: "… z. B. der erste Kaffee, bevor alle wach sind",
          minLen: 5, maxLen: 280 },
        { id: "e2", type: "text",
          prompt: "Welches Ritual gibt dir Energie — morgens oder abends?",
          placeholder: "… auch fünf Minuten zählen",
          minLen: 5, maxLen: 280 },
        { id: "e3", type: "text",
          prompt: "Wer oder was ist heute schon dein Ikigai — auch wenn du es nie so genannt hast?",
          placeholder: "… ein Mensch, ein Ort, ein Projekt",
          minLen: 5, maxLen: 280 },
        { id: "e4", type: "text",
          prompt: "Worauf freust du dich in den nächsten zwölf Monaten?",
          hint: "Vorfreude ist Teil des Ikigai — auch in schweren Phasen.",
          placeholder: "… groß oder klein",
          minLen: 5, maxLen: 280 }
      ]
    }
  ],

  /* Mogis 5 Säulen — für die Alltags-Karten */
  saeulen: [
    { nr: 1, name: "Klein anfangen" },
    { nr: 2, name: "Sich selbst loslassen" },
    { nr: 3, name: "Harmonie & Nachhaltigkeit" },
    { nr: 4, name: "Freude an kleinen Dingen" },
    { nr: 5, name: "Im Hier und Jetzt sein" }
  ],

  /* Warte-Screen — rotierende Mini-Fakten */
  warteFakten: [
    "Ikigai ist in Japan ein Alltagswort — „der Morgenkaffee ist mein Ikigai“ ist ein normaler Satz.",
    "生き甲斐 = iki (leben) + gai (Wert): das, was das Leben wert macht, gelebt zu werden.",
    "Das berühmte 4-Kreise-Diagramm stammt nicht aus Japan — die Geschichte dazu kommt gleich.",
    "Die Forscherin Mieko Kamiya unterschied schon 1966 die Quelle des Ikigai vom Ikigai-Gefühl.",
    "Ken Mogi: „Ikigai wohnt im Reich der kleinen Dinge.“",
    "Ikigai wird nicht gefunden, sondern durch kleine, konsistente Entscheidungen gebaut."
  ]
};
