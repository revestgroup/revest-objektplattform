/**
 * Datenmodell der Objektplattform.
 *
 * Zwei Ebenen, weil das Geschäft zweistufig ist:
 *   1. Ankauf   — auf Ebene des GEBÄUDES (Objekt)
 *   2. Vertrieb — auf Ebene der EINHEIT, entsteht erst nach dem Ankauf
 */

export type Ankaufsstufe =
  | "beobachtung"
  | "kontakt"
  | "pruefung"
  | "verhandlung"
  | "angekauft"
  | "abgesagt";

/** Reihenfolge = Fortschritt. Bestimmt zugleich die Position in der Legende. */
export const STUFEN_REIHENFOLGE: Ankaufsstufe[] = [
  "beobachtung",
  "kontakt",
  "pruefung",
  "verhandlung",
  "angekauft",
  "abgesagt",
];

/**
 * Ampel statt Graustufen.
 *
 * Drei Zustände, die ohne Legende lesbar sind:
 *   GELB  — interessant, läuft noch
 *   GRÜN  — gekauft
 *   ROT   — kein Deal
 *
 * Innerhalb von Gelb bleibt das alte Prinzip erhalten: derselbe Farbton,
 * nur die Tiefe wächst mit dem Fortschritt. So sieht Timo auch innerhalb
 * der Pipeline, welches Objekt am weitesten ist.
 *
 * `weich` ist die Flächenvariante für Plaketten auf hellem Grund,
 * `tief` die Textvariante darauf — beide mit genug Kontrast für AA.
 */
export const STUFEN: Record<
  Ankaufsstufe,
  { titel: string; farbe: string; weich: string; tief: string; kurz: string; aktiv: boolean }
> = {
  beobachtung: {
    titel: "Beobachtung",
    farbe: "#EFC063",
    weich: "#FDF3DF",
    tief: "#8A6410",
    kurz: "BEO",
    aktiv: true,
  },
  kontakt: {
    titel: "Kontakt",
    farbe: "#E5A32E",
    weich: "#FBEBD1",
    tief: "#8A5A08",
    kurz: "KON",
    aktiv: true,
  },
  pruefung: {
    titel: "Prüfung",
    farbe: "#CE8206",
    weich: "#F9E2C4",
    tief: "#7A4D04",
    kurz: "PRÜ",
    aktiv: true,
  },
  verhandlung: {
    titel: "Verhandlung",
    farbe: "#A66305",
    weich: "#F2DAB9",
    tief: "#663C02",
    kurz: "VER",
    aktiv: true,
  },
  angekauft: {
    titel: "Angekauft",
    farbe: "#17935C",
    weich: "#DBF2E6",
    tief: "#0C5E3A",
    kurz: "ANG",
    aktiv: false,
  },
  abgesagt: {
    titel: "Kein Deal",
    farbe: "#CF4848",
    weich: "#FBE2E2",
    tief: "#9A2727",
    kurz: "ABG",
    aktiv: false,
  },
};

export type Objektart = "mfh" | "etw" | "whg_geschaeftshaus" | "grundstueck";

export const OBJEKTARTEN: Record<Objektart, string> = {
  mfh: "Mehrfamilienhaus",
  etw: "Eigentumswohnung",
  whg_geschaeftshaus: "Wohn- & Geschäftshaus",
  grundstueck: "Grundstück",
};

/** Direkt aus dem Ankaufsprofil auf revest-projekt.de. */
export type Zustand = "vermietet" | "leerstand" | "sanierungsbedarf";

export const ZUSTAENDE: Record<Zustand, string> = {
  vermietet: "Vermietet",
  leerstand: "Leerstand",
  sanierungsbedarf: "Sanierungsbedarf",
};

export type Einheitsstatus =
  | "geplant"
  | "in_sanierung"
  | "im_vertrieb"
  | "reserviert"
  | "verkauft"
  | "eigenbestand";

/** Eigene Skala: grau (nichts passiert) → gelb (Baustelle) → blau (am Markt) → grün (verkauft). */
export const EINHEITSSTATUS: Record<
  Einheitsstatus,
  { titel: string; farbe: string; weich: string; tief: string }
> = {
  geplant: { titel: "Geplant", farbe: "#A3ABB8", weich: "#EEF0F4", tief: "#525C6B" },
  in_sanierung: { titel: "In Sanierung", farbe: "#E5A32E", weich: "#FBEBD1", tief: "#8A5A08" },
  im_vertrieb: { titel: "Im Vertrieb", farbe: "#3E7BD6", weich: "#E0EAFA", tief: "#1F4E92" },
  reserviert: { titel: "Reserviert", farbe: "#1F539E", weich: "#DCE6F5", tief: "#153A70" },
  verkauft: { titel: "Verkauft", farbe: "#17935C", weich: "#DBF2E6", tief: "#0C5E3A" },
  eigenbestand: { titel: "Eigenbestand", farbe: "#5B6574", weich: "#E9EBEF", tief: "#3A4350" },
};

export type Bundesland = "BW" | "BY" | "HE" | "RP" | "BAY_SONST";

/**
 * Grunderwerbsteuer ist Ländersache. Ulm und Stuttgart liegen in
 * Baden-Württemberg (5,0 %), Augsburg in Bayern (3,5 %) — das macht bei
 * einem MFH schnell einen fünfstelligen Unterschied und gehört deshalb
 * automatisch in die Kalkulation.
 */
export const GRUNDERWERBSTEUER: Record<string, number> = {
  BW: 5.0,
  BY: 3.5,
  HE: 6.0,
  RP: 5.0,
};

export const BUNDESLAND_NAMEN: Record<string, string> = {
  BW: "Baden-Württemberg",
  BY: "Bayern",
  HE: "Hessen",
  RP: "Rheinland-Pfalz",
};

export interface Einheit {
  id: string;
  bezeichnung: string;
  geschoss: string;
  wohnflaeche: number;
  zimmer: number;
  kaltmiete: number | null;
  status: Einheitsstatus;
  kaeufer: string | null;
  verkaufspreis: number | null;
}

/* ------------------------------------------------------------------ */
/* Preisgeschichte                                                      */
/* ------------------------------------------------------------------ */

/**
 * Jede Preisnennung wird festgehalten — auch die, die zu nichts geführt hat.
 *
 * Grund: Objekte kommen in Ulm regelmäßig ein zweites und drittes Mal auf
 * den Markt. Wenn ein Haus 2024 für 1,4 Mio angeboten wurde und 2026 wieder
 * auftaucht, muss sofort sichtbar sein, was damals verlangt wurde, was Revest
 * geboten hat und warum es nicht zustande kam.
 */
export type Angebotsart = "forderung" | "gebot" | "notarpreis";

export const ANGEBOTSARTEN: Record<Angebotsart, string> = {
  forderung: "Forderung Verkäufer",
  gebot: "Unser Gebot",
  notarpreis: "Beurkundeter Preis",
};

export type Angebotsergebnis =
  | "offen"
  | "angenommen"
  | "abgelehnt"
  | "zu_teuer"
  | "zurueckgezogen";

export const ANGEBOTSERGEBNISSE: Record<Angebotsergebnis, string> = {
  offen: "Offen",
  angenommen: "Angenommen",
  abgelehnt: "Abgelehnt",
  zu_teuer: "Zu teuer",
  zurueckgezogen: "Zurückgezogen",
};

export interface Angebot {
  id: string;
  datum: string;
  art: Angebotsart;
  preis: number;
  /** Makler, Off-Market-Kontakt, Portal — damit die Quelle nachvollziehbar bleibt. */
  quelle: string | null;
  ergebnis: Angebotsergebnis;
  notiz: string | null;
}

/* ------------------------------------------------------------------ */
/* Sanierung                                                            */
/* ------------------------------------------------------------------ */

export type Gewerk =
  | "abbruch"
  | "rohbau"
  | "dach"
  | "fassade"
  | "fenster"
  | "elektro"
  | "sanitaer"
  | "heizung"
  | "trockenbau"
  | "estrich"
  | "fliesen"
  | "boden"
  | "maler"
  | "tueren"
  | "aussenanlagen"
  | "baunebenkosten"
  | "unvorhergesehen";

/** Reihenfolge entspricht dem Bauablauf — so liest sich die Liste wie der Bauplan. */
export const GEWERKE: { schluessel: Gewerk; titel: string }[] = [
  { schluessel: "abbruch", titel: "Abbruch & Entkernung" },
  { schluessel: "rohbau", titel: "Rohbau & Statik" },
  { schluessel: "dach", titel: "Dach & Spengler" },
  { schluessel: "fassade", titel: "Fassade & Dämmung" },
  { schluessel: "fenster", titel: "Fenster" },
  { schluessel: "elektro", titel: "Elektro" },
  { schluessel: "sanitaer", titel: "Sanitär" },
  { schluessel: "heizung", titel: "Heizung & Lüftung" },
  { schluessel: "trockenbau", titel: "Trockenbau" },
  { schluessel: "estrich", titel: "Estrich" },
  { schluessel: "fliesen", titel: "Fliesen" },
  { schluessel: "boden", titel: "Bodenbeläge" },
  { schluessel: "maler", titel: "Maler" },
  { schluessel: "tueren", titel: "Türen & Schreiner" },
  { schluessel: "aussenanlagen", titel: "Außenanlagen" },
  { schluessel: "baunebenkosten", titel: "Baunebenkosten" },
  { schluessel: "unvorhergesehen", titel: "Unvorhergesehenes" },
];

export const GEWERK_TITEL: Record<string, string> = Object.fromEntries(
  GEWERKE.map((g) => [g.schluessel, g.titel]),
);

export type Gewerkstatus = "offen" | "ausgeschrieben" | "beauftragt" | "laufend" | "abgenommen";

export const GEWERKSTATUS: Record<Gewerkstatus, string> = {
  offen: "Offen",
  ausgeschrieben: "Ausgeschrieben",
  beauftragt: "Beauftragt",
  laufend: "Laufend",
  abgenommen: "Abgenommen",
};

export interface Sanierungsposten {
  id: string;
  gewerk: Gewerk;
  /** Budget aus der Ankaufskalkulation. */
  geplant: number | null;
  /** Was tatsächlich abgerechnet wurde. Null = noch keine Rechnung. */
  tatsaechlich: number | null;
  firma: string | null;
  status: Gewerkstatus;
  notiz: string | null;
}

/* ------------------------------------------------------------------ */
/* Verkaufsplanung                                                      */
/* ------------------------------------------------------------------ */

/**
 * Die Wunschrechnung, bevor verkauft wird.
 *
 * Bewusst getrennt von `Einheit`: eine Einheit entsteht erst mit der
 * Teilungserklärung und hat einen Käufer. Ein Verkaufsposten ist eine
 * Überlegung — „die beiden Zweizimmer im Erdgeschoss könnte man als WG
 * laufen lassen“ — und darf falsch sein, ohne den Bestand zu verfälschen.
 *
 * Deshalb steht die Planung auch nicht in der Anlagemaske. Beim Anlegen weiß
 * niemand, wie die Aufteilung aussieht; wer da nach Wunschpreisen fragt,
 * bekommt geratene Zahlen, die später als Wahrheit gelesen werden.
 */
export interface Verkaufsposten {
  id: string;
  /** „1. OG links“ oder „WG Souterrain“ — frei, weil die Aufteilung frei ist. */
  bezeichnung: string;
  flaeche: number | null;
  zimmer: number | null;
  /** Was wir dafür haben wollen. */
  wunschpreis: number | null;
  /** Erwartete Kaltmiete im Monat, nach Sanierung. */
  monatsmiete: number | null;
  /** Einzelzimmer statt ganzer Wohnung — bringt mehr Miete, mehr Aufwand. */
  alsWg: boolean;
}

export interface Verkaufsplan {
  posten: Verkaufsposten[];
  /**
   * Grobe Sanierungssumme für diese Rechnung. Die Gewerkeliste unter „Kosten“
   * ist genauer, existiert aber erst nach dem Ankauf — solange sie leer ist,
   * trägt dieser Wert die Kalkulation.
   */
  sanierungsschaetzung: number | null;
  /** Provision, die beim Weiterverkauf abgeht. */
  verkaufsprovision: number | null;
  notiz: string | null;
  /** Wann die Planung zuletzt gespeichert wurde — eine alte Rechnung lügt leise. */
  stand: string | null;
}

export function leererVerkaufsplan(): Verkaufsplan {
  return {
    posten: [],
    sanierungsschaetzung: null,
    verkaufsprovision: null,
    notiz: null,
    stand: null,
  };
}

export interface Verkaufsrechnung {
  anzahl: number;
  flaeche: number;
  erloes: number;
  jahresmiete: number;
  /** Verkaufspreis je Quadratmeter — die Zahl, die der Markt vergleicht. */
  preisJeQm: number | null;
  /** Monatsmiete je Quadratmeter. */
  mieteJeQm: number | null;
  /** Was der Käufer an Bruttorendite bekommt. Entscheidet, ob es verkäuflich ist. */
  kaeuferrendite: number | null;
  kaeuferfaktor: number | null;
  provisionEuro: number;
  /** Ankauf inklusive Nebenkosten plus Sanierung. */
  gesamtkosten: number | null;
  rohgewinn: number | null;
  margeProzent: number | null;
  /** Nur Posten mit Preis zählen in den Erlös — der Rest ist noch nicht gedacht. */
  ohnePreis: number;
}

/**
 * Rechnet die Planung durch. Eigene Funktion statt Teil von
 * `berechneKennzahlen`, weil hier Wunschwerte stehen: die beiden Rechnungen
 * dürfen sich nie vermischen.
 */
export function berechneVerkaufsplan(o: Objekt, k: Kennzahlen): Verkaufsrechnung {
  const plan = o.verkaufsplan ?? leererVerkaufsplan();
  const posten = plan.posten;

  const erloes = posten.reduce((s, p) => s + (p.wunschpreis ?? 0), 0);
  const flaeche = posten.reduce((s, p) => s + (p.flaeche ?? 0), 0);
  const monatsmiete = posten.reduce((s, p) => s + (p.monatsmiete ?? 0), 0);
  const jahresmiete = monatsmiete * 12;

  const provisionEuro = plan.verkaufsprovision ? (erloes * plan.verkaufsprovision) / 100 : 0;

  // Die gepflegte Gewerkeliste schlägt die Schätzung — sobald sie existiert,
  // ist sie die bessere Zahl.
  const sanierung =
    k.sanierungGeplant > 0 ? k.sanierungGeplant : (plan.sanierungsschaetzung ?? 0);

  const gesamtkosten =
    k.gesamtinvestition !== null ? k.gesamtinvestition + sanierung : null;

  const rohgewinn =
    gesamtkosten !== null && erloes > 0 ? erloes - gesamtkosten - provisionEuro : null;

  return {
    anzahl: posten.length,
    flaeche,
    erloes,
    jahresmiete,
    preisJeQm: flaeche > 0 && erloes > 0 ? erloes / flaeche : null,
    mieteJeQm: flaeche > 0 && monatsmiete > 0 ? monatsmiete / flaeche : null,
    kaeuferrendite: erloes > 0 && jahresmiete > 0 ? (jahresmiete / erloes) * 100 : null,
    kaeuferfaktor: jahresmiete > 0 && erloes > 0 ? erloes / jahresmiete : null,
    provisionEuro,
    gesamtkosten,
    rohgewinn,
    margeProzent:
      rohgewinn !== null && gesamtkosten !== null && gesamtkosten > 0
        ? (rohgewinn / gesamtkosten) * 100
        : null,
    ohnePreis: posten.filter((p) => p.wunschpreis === null).length,
  };
}

export interface Dokument {
  id: string;
  name: string;
  ordner: string;
  groesseKb: number;
  hochgeladenAm: string;
}

export interface Verlaufseintrag {
  id: string;
  zeitpunkt: string;
  text: string;
  art: "status" | "notiz" | "dokument" | "anlage";
}

export interface Objekt {
  id: string;
  /** Eigene Koordinate — NICHT die OSM-Gebäude-ID. Die ist nicht stabil. */
  laenge: number;
  breite: number;
  /** Umriss als Snapshot zum Zeitpunkt der Anlage. Bleibt gültig, auch wenn OSM sich ändert. */
  umriss: [number, number][] | null;

  strasse: string;
  plz: string;
  stadt: string;
  /** Name des Stadtteils. Verknüpft das Objekt mit der Umriss-Ebene der Karte. */
  stadtteil: string;
  bundesland: string;

  objektart: Objektart;
  zustand: Zustand;
  stufe: Ankaufsstufe;

  kaufpreis: number | null;
  /**
   * Höchstpreis, den Revest für dieses Objekt zahlen würde. Aus dem
   * Zielfaktor abgeleitet und von Hand nachjustiert. Liegt die Forderung
   * darüber, markiert die Plattform das Objekt als „zu teuer“ — das ist
   * die Information, die Timo beim Wiederauftauchen eines Objekts braucht.
   */
  ankaufslimit: number | null;
  wohnflaeche: number | null;
  gewerbeflaeche: number | null;
  grundstuecksflaeche: number | null;
  anzahlEinheiten: number | null;
  baujahr: number | null;
  letzteSanierung: number | null;
  jahresNettokaltmiete: number | null;
  potenzialMiete: number | null;
  nichtUmlagefaehig: number | null;
  instandhaltungsruecklage: number | null;
  maklerprovision: number | null;
  energieklasse: string | null;
  energiekennwert: number | null;

  denkmalschutz: boolean;
  erbbaurecht: boolean;

  eigentuemer: string | null;
  eigentuemerKontakt: string | null;
  quelle: string | null;

  /**
   * Nur bei Wohnungen: Geht die Einheit als klassische ETW in den Vertrieb
   * oder als WG-Vermietung? Entscheidung fällt nach der Prüfung — optional,
   * damit Bestandsdaten ohne das Feld gültig bleiben.
   */
  vertriebsweg?: "etw" | "wg" | null;
  /** Zimmerzahl bei WG-Vermietung. */
  wgZimmer?: number | null;

  notiz: string | null;
  bilder: string[];
  dokumente: Dokument[];
  einheiten: Einheit[];
  /**
   * Wunschrechnung für den Weiterverkauf. Optional, damit gespeicherte
   * Bestände ohne das Feld gültig bleiben — und weil ein frisch angelegtes
   * Objekt noch keine Planung hat.
   */
  verkaufsplan?: Verkaufsplan | null;
  angebote: Angebot[];
  sanierung: Sanierungsposten[];
  verlauf: Verlaufseintrag[];

  angelegtAm: string;
  /** Revest verspricht öffentlich eine verbindliche Prüfung in 48 Stunden. */
  fristBis: string | null;
}

/* ------------------------------------------------------------------ */
/* Dokumentenstruktur                                                   */
/* ------------------------------------------------------------------ */

/**
 * Diese Struktur wird später 1:1 als Ordner im Google Drive angelegt.
 * Deshalb steht sie schon jetzt fest — damit später nichts umziehen muss.
 */
export const DOKUMENT_ORDNER = [
  { schluessel: "01_expose", titel: "Exposé & Angebot" },
  { schluessel: "02_grundbuch", titel: "Grundbuch & Recht" },
  { schluessel: "03_kaufvertrag", titel: "Kaufvertrag & Notar" },
  { schluessel: "04_plaene", titel: "Pläne & Bau" },
  { schluessel: "05_miete", titel: "Mietverhältnisse" },
  { schluessel: "06_hausverwaltung", titel: "Hausverwaltung" },
  { schluessel: "07_energie", titel: "Energie & Technik" },
  { schluessel: "08_sanierung", titel: "Sanierung" },
  { schluessel: "09_fotos", titel: "Fotos" },
  { schluessel: "10_vertrieb", titel: "Vertrieb" },
] as const;

/** Typische Unterlagen je Ordner — als Hinweis in der Upload-Maske. */
export const ORDNER_BEISPIELE: Record<string, string> = {
  "01_expose": "Exposé, Angebotsschreiben, Objektbeschreibung",
  "02_grundbuch": "Grundbuchauszug, Teilungserklärung, Baulastenverzeichnis, Flurkarte",
  "03_kaufvertrag": "Kaufvertragsentwurf, Notartermin, Auflassungsvormerkung",
  "04_plaene": "Grundrisse, Schnitte, Baupläne, Statik, Baugenehmigung",
  "05_miete": "Mietverträge, Mieterliste, Mietaufstellung, Kündigungen",
  "06_hausverwaltung":
    "WEG-Protokolle, Hausgeldabrechnung, Wirtschaftsplan, Verwaltervertrag, Rücklagennachweis",
  "07_energie": "Energieausweis, Heizungsprotokoll, Schornsteinfeger, Wartungsverträge",
  "08_sanierung": "Kostenvoranschläge, Handwerkerangebote, Baufortschritt, Abnahmen",
  "09_fotos": "Außenaufnahmen, Innenaufnahmen, Drohne, Bestandsdoku",
  "10_vertrieb": "Verkaufsexposé, Reservierungen, Übergabe an AUVERO",
};

/* ------------------------------------------------------------------ */
/* Kennzahlen                                                           */
/* ------------------------------------------------------------------ */

export interface Kennzahlen {
  kaufpreisJeQm: number | null;
  bruttoMietrendite: number | null;
  faktor: number | null;
  grestSatz: number | null;
  grestEuro: number | null;
  notarEuro: number | null;
  maklerEuro: number | null;
  kaufnebenkosten: number | null;
  gesamtinvestition: number | null;
  nettoMietrendite: number | null;
  mietePotenzialDelta: number | null;
  leerstandsquote: number | null;

  /* Sanierung */
  sanierungGeplant: number;
  sanierungTatsaechlich: number;
  /** Ist minus Plan. Positiv = teurer als kalkuliert. */
  sanierungAbweichung: number;
  sanierungJeQm: number | null;
  /** Anteil der Gewerke, die abgenommen sind. */
  sanierungFortschritt: number | null;

  /* Projektrechnung */
  gesamtkostenPlan: number | null;
  gesamtkostenIst: number | null;
  gesamtkostenJeQm: number | null;
  /** Summe der Verkaufspreise aller Einheiten, die einen Preis tragen. */
  verkaufserloes: number;
  /** Erlös minus Gesamtkosten. Die eine Zahl, auf die es am Ende ankommt. */
  rohertrag: number | null;
  margeProzent: number | null;

  /* Preisgeschichte */
  letzteForderung: Angebot | null;
  letztesGebot: Angebot | null;
  /** Forderung minus Ankaufslimit. Positiv = zu teuer. */
  preisAbstand: number | null;
  zuTeuer: boolean;
}

/** Notar und Grundbuch liegen in der Praxis zusammen bei rund 1,5 %. */
const NOTAR_SATZ = 1.5;

export function berechneKennzahlen(o: Objekt): Kennzahlen {
  const kp = o.kaufpreis;
  const miete = o.jahresNettokaltmiete;

  const grestSatz = GRUNDERWERBSTEUER[o.bundesland] ?? null;
  const grestEuro = kp !== null && grestSatz !== null ? (kp * grestSatz) / 100 : null;
  const notarEuro = kp !== null ? (kp * NOTAR_SATZ) / 100 : null;
  const maklerEuro = kp !== null && o.maklerprovision ? (kp * o.maklerprovision) / 100 : 0;

  const kaufnebenkosten =
    grestEuro !== null && notarEuro !== null ? grestEuro + notarEuro + (maklerEuro ?? 0) : null;

  const gesamtinvestition = kp !== null && kaufnebenkosten !== null ? kp + kaufnebenkosten : null;

  const nettoMiete = miete !== null ? miete - (o.nichtUmlagefaehig ?? 0) : null;

  const leere = o.einheiten.filter((e) => e.kaltmiete === null || e.kaltmiete === 0).length;

  /* --- Sanierung --- */
  const posten = o.sanierung;
  const sanierungGeplant = posten.reduce((s, p) => s + (p.geplant ?? 0), 0);
  const sanierungTatsaechlich = posten.reduce((s, p) => s + (p.tatsaechlich ?? 0), 0);
  // Nur dort vergleichen, wo schon abgerechnet wurde — sonst sähe jedes
  // frisch angekaufte Objekt so aus, als läge es massiv unter Budget.
  const abgerechnet = posten.filter((p) => p.tatsaechlich !== null);
  const sanierungAbweichung =
    abgerechnet.reduce((s, p) => s + (p.tatsaechlich ?? 0), 0) -
    abgerechnet.reduce((s, p) => s + (p.geplant ?? 0), 0);
  const fertige = posten.filter((p) => p.status === "abgenommen").length;

  /* --- Projektrechnung --- */
  const sanierungAnsatz = sanierungTatsaechlich > 0 ? sanierungTatsaechlich : sanierungGeplant;
  const gesamtkostenPlan =
    gesamtinvestition !== null ? gesamtinvestition + sanierungGeplant : null;
  const gesamtkostenIst = gesamtinvestition !== null ? gesamtinvestition + sanierungAnsatz : null;

  const verkaufserloes = o.einheiten.reduce((s, e) => s + (e.verkaufspreis ?? 0), 0);
  const rohertrag =
    gesamtkostenIst !== null && verkaufserloes > 0 ? verkaufserloes - gesamtkostenIst : null;

  /* --- Preisgeschichte --- */
  const nachDatum = [...o.angebote].sort((a, b) => b.datum.localeCompare(a.datum));
  const letzteForderung = nachDatum.find((a) => a.art === "forderung") ?? null;
  const letztesGebot = nachDatum.find((a) => a.art === "gebot") ?? null;
  const preisAbstand =
    letzteForderung !== null && o.ankaufslimit !== null
      ? letzteForderung.preis - o.ankaufslimit
      : null;
  // „Zu teuer“ ist eine Aussage über laufende Verhandlungen. Ein gekauftes
  // Objekt hat seinen Preis hinter sich, ein abgesagtes ist ohnehin raus.
  const zuTeuer = STUFEN[o.stufe].aktiv && preisAbstand !== null && preisAbstand > 0;

  return {
    kaufpreisJeQm: kp !== null && o.wohnflaeche ? kp / o.wohnflaeche : null,
    bruttoMietrendite: kp !== null && miete !== null && kp > 0 ? (miete / kp) * 100 : null,
    faktor: kp !== null && miete !== null && miete > 0 ? kp / miete : null,
    grestSatz,
    grestEuro,
    notarEuro,
    maklerEuro,
    kaufnebenkosten,
    gesamtinvestition,
    nettoMietrendite:
      nettoMiete !== null && gesamtinvestition !== null && gesamtinvestition > 0
        ? (nettoMiete / gesamtinvestition) * 100
        : null,
    mietePotenzialDelta:
      o.potenzialMiete !== null && miete !== null ? o.potenzialMiete - miete : null,
    leerstandsquote: o.einheiten.length > 0 ? (leere / o.einheiten.length) * 100 : null,

    sanierungGeplant,
    sanierungTatsaechlich,
    sanierungAbweichung,
    sanierungJeQm: o.wohnflaeche ? sanierungAnsatz / o.wohnflaeche : null,
    sanierungFortschritt: posten.length > 0 ? (fertige / posten.length) * 100 : null,

    gesamtkostenPlan,
    gesamtkostenIst,
    gesamtkostenJeQm:
      gesamtkostenIst !== null && o.wohnflaeche ? gesamtkostenIst / o.wohnflaeche : null,
    verkaufserloes,
    rohertrag,
    margeProzent:
      rohertrag !== null && gesamtkostenIst !== null && gesamtkostenIst > 0
        ? (rohertrag / gesamtkostenIst) * 100
        : null,

    letzteForderung,
    letztesGebot,
    preisAbstand,
    zuTeuer,
  };
}

/* ------------------------------------------------------------------ */
/* Formatierung                                                         */
/* ------------------------------------------------------------------ */

const eur = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const eurGenau = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});
const zahl = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
const zahl1 = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const zahl2 = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });

export const f = {
  eur: (v: number | null | undefined) => (v === null || v === undefined ? "—" : eur.format(v)),
  /**
   * Gekürzter Betrag für Kennzahlenkacheln. „1,38 Mio €" statt „1.375.000 €":
   * In der Projektentwicklung wird ohnehin so gesprochen, und nur so passt die
   * Zahl in eine schmale Spalte, ohne abgeschnitten zu werden.
   */
  eurKurz: (v: number | null | undefined) => {
    if (v === null || v === undefined) return "—";
    const betrag = Math.abs(v);
    if (betrag >= 1_000_000) return `${zahl2.format(v / 1_000_000)} Mio €`;
    if (betrag >= 10_000) return `${zahl.format(v / 1000)} T€`;
    return eur.format(v);
  },
  eurGenau: (v: number | null | undefined) =>
    v === null || v === undefined ? "—" : eurGenau.format(v),
  zahl: (v: number | null | undefined) => (v === null || v === undefined ? "—" : zahl.format(v)),
  prozent: (v: number | null | undefined) =>
    v === null || v === undefined ? "—" : `${zahl1.format(v)} %`,
  faktor: (v: number | null | undefined) =>
    v === null || v === undefined ? "—" : `${zahl1.format(v)}×`,
  qm: (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${zahl.format(v)} m²`),
  datum: (iso: string) =>
    new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }),
  datumZeit: (iso: string) =>
    new Date(iso).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
};

export function adresse(o: Objekt): string {
  return `${o.strasse}, ${o.plz} ${o.stadt}`;
}

/* ------------------------------------------------------------------ */
/* 48-Stunden-Frist                                                     */
/* ------------------------------------------------------------------ */

export interface Fristinfo {
  laeuft: boolean;
  gerissen: boolean;
  stundenRest: number;
  text: string;
}

/**
 * Revest verspricht auf der Website eine verbindliche Prüfung binnen 48 Stunden.
 * Daraus wird hier ein Arbeitswerkzeug: solange ein Objekt noch nicht geprüft
 * ist, läuft die Uhr sichtbar mit.
 */
export function fristinfo(o: Objekt, jetzt: Date = new Date()): Fristinfo | null {
  if (!o.fristBis) return null;
  if (o.stufe === "angekauft" || o.stufe === "abgesagt") return null;
  if (o.stufe === "verhandlung") return null;

  const ziel = new Date(o.fristBis).getTime();
  const diffStunden = (ziel - jetzt.getTime()) / 3_600_000;

  if (diffStunden < 0) {
    const h = Math.abs(Math.round(diffStunden));
    return {
      laeuft: false,
      gerissen: true,
      stundenRest: diffStunden,
      text: h >= 48 ? `${Math.round(h / 24)} Tage überfällig` : `${h} Std überfällig`,
    };
  }

  return {
    laeuft: true,
    gerissen: false,
    stundenRest: diffStunden,
    text: diffStunden < 1 ? "unter 1 Std" : `${Math.round(diffStunden)} Std`,
  };
}

/* ------------------------------------------------------------------ */
/* Umriss-Hilfen                                                        */
/* ------------------------------------------------------------------ */

/**
 * Erzeugt einen rechteckigen Gebäudeumriss um eine Koordinate.
 * Wird für Mock-Daten und für neu angelegte Objekte genutzt, solange kein
 * echter Umriss aus der Karte übernommen wurde.
 */
export function umrissAusMitte(
  laenge: number,
  breite: number,
  breiteM = 22,
  tiefeM = 14,
  drehungGrad = 0,
): [number, number][] {
  const mProGradBreite = 111_320;
  const mProGradLaenge = 111_320 * Math.cos((breite * Math.PI) / 180);

  const halbB = breiteM / 2;
  const halbT = tiefeM / 2;
  const rad = (drehungGrad * Math.PI) / 180;

  const ecken: [number, number][] = [
    [-halbB, -halbT],
    [halbB, -halbT],
    [halbB, halbT],
    [-halbB, halbT],
  ];

  const gedreht = ecken.map(([x, y]) => {
    const xr = x * Math.cos(rad) - y * Math.sin(rad);
    const yr = x * Math.sin(rad) + y * Math.cos(rad);
    return [laenge + xr / mProGradLaenge, breite + yr / mProGradBreite] as [number, number];
  });

  return [...gedreht, gedreht[0]];
}
