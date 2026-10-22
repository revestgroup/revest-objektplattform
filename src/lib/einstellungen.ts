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
  /** Falsch heißt: vorgemerkt für Phase 2, heute ohne Wirkung. */
  wirkt: boolean;
}

export interface Gruppe {
  titel: string;
  eintraege: Eintrag[];
}

export const GRUPPEN: Gruppe[] = [
  {
    titel: "Darstellung",
    eintraege: [
      {
        schluessel: "karteLuftbild",
        titel: "Karte startet im Luftbild",
        wirkt: true,
      },
      {
        schluessel: "teilorteZeigen",
        titel: "Teilorte einblenden",
        wirkt: true,
      },
      {
        schluessel: "vorschaublatt",
        titel: "Vorschau auf der Karte",
        wirkt: true,
      },
      {
        schluessel: "punktBeschriftung",
        titel: "Punkte beschriften",
        wirkt: true,
      },
    ],
  },
  {
    titel: "Erinnerungen",
    eintraege: [
      {
        schluessel: "mailBeiLead",
        titel: "Neue Anfrage von der Leadseite",
        wirkt: false,
      },
      {
        schluessel: "mailFrist",
        titel: "48-Stunden-Frist läuft ab",
        wirkt: false,
      },
      {
        schluessel: "mailGarantieEnde",
        titel: "Mietgarantie läuft aus",
        wirkt: false,
      },
      {
        schluessel: "mailLeerstand",
        titel: "Zimmer oder Wohnung wird frei",
        wirkt: false,
      },
    ],
  },
  {
    titel: "Automatik",
    eintraege: [
      {
        schluessel: "driveOrdner",
        titel: "Ordner im Drive anlegen",
        wirkt: false,
      },
      {
        schluessel: "uebergabeAuvero",
        titel: "Übergabe an AUVERO",
        wirkt: false,
      },
      {
        schluessel: "exposeAutomatisch",
        titel: "Exposé erzeugen",
        wirkt: false,
      },
    ],
  },
];
