/**
 * Einstellungen.
 *
 * Zwei Sorten Schalter, und der Unterschied wird in der Oberfläche benannt:
 *
 *   wirkt   — ändert sofort etwas an dieser Vorschau
 *   phase2  — braucht Server, Drive oder E-Mail und ist heute nur vorgemerkt
 *
 * Ein Schalter, der nichts tut und so aussieht als täte er etwas, ist
 * schlimmer als kein Schalter. Deshalb trägt jede Option ihren Stand mit.
 */

export interface Einstellungen {
  /* ----- Darstellung ----- */
  karteLuftbild: boolean;
  teilorteZeigen: boolean;
  vorschaublatt: boolean;
  punktBeschriftung: boolean;

  /* ----- Erinnerungen (Phase 2) ----- */
  mailBeiLead: boolean;
  mailFrist: boolean;
  mailGarantieEnde: boolean;
  mailLeerstand: boolean;

  /* ----- Automatik (Phase 2) ----- */
  driveOrdner: boolean;
  uebergabeAuvero: boolean;
  exposeAutomatisch: boolean;
}

export const STANDARD: Einstellungen = {
  karteLuftbild: true,
  teilorteZeigen: false,
  vorschaublatt: true,
  punktBeschriftung: true,

  mailBeiLead: true,
  mailFrist: true,
  mailGarantieEnde: true,
  mailLeerstand: false,

  driveOrdner: true,
  uebergabeAuvero: true,
  exposeAutomatisch: false,
};

export type Schluessel = keyof Einstellungen;

interface Eintrag {
  schluessel: Schluessel;
  titel: string;
  hinweis: string;
  /** Falsch heißt: vorgemerkt für Phase 2, heute ohne Wirkung. */
  wirkt: boolean;
}

export interface Gruppe {
  titel: string;
  beschreibung: string;
  eintraege: Eintrag[];
}

export const GRUPPEN: Gruppe[] = [
  {
    titel: "Darstellung",
    beschreibung: "Wie die Plattform startet. Diese Schalter wirken sofort.",
    eintraege: [
      {
        schluessel: "karteLuftbild",
        titel: "Karte startet im Luftbild",
        hinweis: "Dächer und Grundstücke statt Straßenplan. Umschalten geht jederzeit auf der Karte.",
        wirkt: true,
      },
      {
        schluessel: "teilorteZeigen",
        titel: "Teilorte einblenden",
        hinweis: "Stadtteilnamen liegen von Anfang an über der Karte.",
        wirkt: true,
      },
      {
        schluessel: "vorschaublatt",
        titel: "Vorschau am Telefon",
        hinweis:
          "Ein Tippen auf einen Punkt zeigt erst eine kurze Vorschau. Aus heißt: das Objekt öffnet sofort ganzseitig.",
        wirkt: true,
      },
      {
        schluessel: "punktBeschriftung",
        titel: "Punkte beschriften",
        hinweis:
          "Ab mittlerem Zoom stehen Straße und Kaufpreis am Punkt. Aus heißt: nur Farbe und Position, die Karte bleibt ruhiger.",
        wirkt: true,
      },
    ],
  },
  {
    titel: "Erinnerungen",
    beschreibung:
      "Was die Plattform von sich aus melden soll, sobald sie in Phase 2 einen Server und ein Postfach hat.",
    eintraege: [
      {
        schluessel: "mailBeiLead",
        titel: "Neue Anfrage von der Leadseite",
        hinweis: "Sofort eine E-Mail, solange der Lead noch warm ist.",
        wirkt: false,
      },
      {
        schluessel: "mailFrist",
        titel: "48-Stunden-Frist läuft ab",
        hinweis: "Erinnerung zwölf Stunden vor Ablauf einer Rückmeldefrist.",
        wirkt: false,
      },
      {
        schluessel: "mailGarantieEnde",
        titel: "Mietgarantie läuft aus",
        hinweis: "Drei Monate vor Ende, damit die Anschlussvermietung steht.",
        wirkt: false,
      },
      {
        schluessel: "mailLeerstand",
        titel: "Zimmer oder Wohnung wird frei",
        hinweis: "Meldung, sobald eine garantierte Einheit unbelegt ist.",
        wirkt: false,
      },
    ],
  },
  {
    titel: "Automatik",
    beschreibung: "Handgriffe, die Phase 2 übernimmt, sobald Drive und Datenbank hängen.",
    eintraege: [
      {
        schluessel: "driveOrdner",
        titel: "Ordner im Drive anlegen",
        hinweis: "Jedes neue Objekt bekommt die zehn Ordner im Shared Drive.",
        wirkt: false,
      },
      {
        schluessel: "uebergabeAuvero",
        titel: "Übergabe an AUVERO",
        hinweis: "Einheiten werden weitergereicht, sobald sie auf „Im Vertrieb\u2009“ stehen.",
        wirkt: false,
      },
      {
        schluessel: "exposeAutomatisch",
        titel: "Exposé erzeugen",
        hinweis: "Entwurf aus Objektdaten und Bildern, sobald ein Ankauf beurkundet ist.",
        wirkt: false,
      },
    ],
  },
];
