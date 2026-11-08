/**
 * Datenmodell der Objektplattform.
 *
 * Zwei Ebenen, weil das Geschäft zweistufig ist:
 *   1. Ankauf   — auf Ebene des GEBÄUDES (Objekt)
 *   2. Vertrieb — auf Ebene der EINHEIT, entsteht erst nach dem Ankauf
 */

export type Ankaufsstufe =
  | "neu"
  | "unterlagen"
  | "qualifiziert"
  | "besichtigt"
  | "angebot"
  | "nachfassen"
  | "angekauft"
  | "watchlist"
  | "unqualifiziert"
  | "abgesagt";

/**
 * Reihenfolge = Timos Ablauf, links nach rechts. Bestimmt zugleich die
 * Position in Legende und Pipeline. Die Ablage steht bewusst hinten.
 *
 * „angekauft“ und „abgesagt“ heißen intern weiter so (angezeigt: „Gekauft“,
 * „No Deal“) — an ihnen hängen Projekte, Karte und Deal-Dialog.
 */
export const STUFEN_REIHENFOLGE: Ankaufsstufe[] = [
  "neu",
  "unterlagen",
  "qualifiziert",
  "besichtigt",
  "angebot",
  "nachfassen",
  "angekauft",
  "watchlist",
  "unqualifiziert",
  "abgesagt",
];

/** Aktiv = läuft noch, Abschluss = gekauft, Ablage = liegt beiseite. */
export type Stufenbereich = "aktiv" | "abschluss" | "ablage";

/**
 * Ampel statt Graustufen.
 *
 *   GELB  — interessant, läuft noch
 *   GRÜN  — gekauft
 *   ROT   — kein Deal
 *
 * Innerhalb von Gelb wächst die Tiefe mit dem Fortschritt — so sieht Timo
 * auch innerhalb der Pipeline, welches Objekt am weitesten ist. Die Ablage
 * ist kühl (Watchlist blaugrau, Unqualifiziert grau), damit sie neben dem
 * Gelb nicht nach Arbeit aussieht.
 *
 * `weich` ist die Flächenvariante für Plaketten auf hellem Grund,
 * `tief` die Textvariante darauf — beide mit genug Kontrast für AA.
 */
export const STUFEN: Record<
  Ankaufsstufe,
  { titel: string; farbe: string; weich: string; tief: string; kurz: string; bereich: Stufenbereich }
> = {
  neu: { titel: "Neu", farbe: "#F2CC70", weich: "#FDF5E1", tief: "#8A6410", kurz: "NEU", bereich: "aktiv" },
  unterlagen: {
    titel: "Unterlagen angefordert",
    farbe: "#EAB44A",
    weich: "#FCEFD7",
    tief: "#8A600C",
    kurz: "UNT",
    bereich: "aktiv",
  },
  qualifiziert: {
    titel: "Qualifiziert",
    farbe: "#E0992A",
    weich: "#FAE8CD",
    tief: "#8A5608",
    kurz: "QUA",
    bereich: "aktiv",
  },
  besichtigt: {
    titel: "Terminiert/Besichtigt",
    farbe: "#CE8206",
    weich: "#F9E2C4",
    tief: "#7A4D04",
    kurz: "BES",
    bereich: "aktiv",
  },
  angebot: {
    titel: "Angebot abgegeben",
    farbe: "#B46E06",
    weich: "#F4DDBD",
    tief: "#6B4003",
    kurz: "ANB",
    bereich: "aktiv",
  },
  nachfassen: {
    titel: "Nachfassen",
    farbe: "#8F5404",
    weich: "#EFD6B4",
    tief: "#5A3402",
    kurz: "NAC",
    bereich: "aktiv",
  },
  angekauft: {
    titel: "Gekauft",
    farbe: "#17935C",
    weich: "#DBF2E6",
    tief: "#0C5E3A",
    kurz: "GEK",
    bereich: "abschluss",
  },
  watchlist: {
    titel: "Watchlist",
    farbe: "#6F8AA6",
    weich: "#E3EAF2",
    tief: "#3A5068",
    kurz: "WAT",
    bereich: "ablage",
  },
  unqualifiziert: {
    titel: "Unqualifiziert",
    farbe: "#9A9A9A",
    weich: "#EDEDED",
    tief: "#555555",
    kurz: "UNQ",
    bereich: "ablage",
  },
  abgesagt: {
    titel: "No Deal",
    farbe: "#CF4848",
    weich: "#FBE2E2",
    tief: "#9A2727",
    kurz: "NOD",
    bereich: "ablage",
  },
};

export function istAktiv(stufe: Ankaufsstufe): boolean {
  return STUFEN[stufe].bereich === "aktiv";
}

/**
 * Stufen aus der ersten Fassung. Gespeicherte Objekte tragen sie noch —
 * beim Laden werden sie hierüber umgestellt.
 */
const ALTE_STUFEN: Record<string, Ankaufsstufe> = {
  beobachtung: "watchlist",
  kontakt: "neu",
  pruefung: "qualifiziert",
  verhandlung: "angebot",
};

/** Alte oder unbekannte Stufe → gültige. Unbekanntes landet auf „Neu“. */
export function stufeUmstellen(stufe: string): Ankaufsstufe {
  if (stufe in STUFEN) return stufe as Ankaufsstufe;
  return ALTE_STUFEN[stufe] ?? "neu";
}

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

  /** Ab `verkauft` gesetzt. Vorher weiß niemand, wer kauft. */
  kaeufer: string | null;
  /** E-Mail oder Telefon. Der Weg, auf dem der Käufer später angeschrieben wird. */
  kaeuferKontakt: string | null;
  verkaufspreis: number | null;
  /** Tag der Beurkundung. Startpunkt jeder Frist, die am Verkauf hängt. */
  verkauftAm: string | null;
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

/* ------------------------------------------------------------------ */
/* Ankaufsabschluss                                                     */
/* ------------------------------------------------------------------ */

/**
 * Wie die Einheiten nach der Sanierung verwertet werden.
 *
 * Die Zahlen stehen am Objekt und nicht an der Einheit, weil die Entscheidung
 * beim Deal fällt — und da gibt es noch keine Einheiten, nur eine Absicht.
 * Die Teilungserklärung macht später konkrete Wohnungen daraus.
 */
export interface Aufteilung {
  /** Einheiten, die als Eigentumswohnung in den Vertrieb gehen. */
  etw: number;
  /** Einheiten, die als WG vermietet und im Bestand gehalten werden. */
  wg: number;
}

/**
 * Der Weg der Teilungserklärung — vier Stationen, die jeder MFH-Ankauf
 * durchläuft, wenn er in Einzeleigentum aufgeteilt wird.
 */
export type Teilungsstatus = "vorbereitung" | "beim_notar" | "beim_amt" | "eingetragen";

/**
 * Ohne Farbe, anders als die Ankaufsstufen. Die Stufe eines Objekts muss man
 * in einer Liste von dreißig auf einen Blick erkennen — die Station einer
 * Teilungserklärung steht immer allein in ihrem eigenen Reiter. Dort trägt die
 * Reihenfolge die Aussage, und vier bunte Kästen wären nur Dekoration.
 */
export const TEILUNGSSTATUS: Record<Teilungsstatus, { titel: string; hinweis: string }> = {
  vorbereitung: {
    titel: "In Vorbereitung",
    hinweis: "Aufteilungsplan und Abgeschlossenheitsbescheinigung werden erstellt.",
  },
  beim_notar: {
    titel: "Beim Notar",
    hinweis: "Der Entwurf liegt zur Beurkundung.",
  },
  beim_amt: {
    titel: "Beim Grundbuchamt",
    hinweis: "Eingereicht — jetzt entscheidet die Laufzeit des Amts.",
  },
  eingetragen: {
    titel: "Eingetragen",
    hinweis: "Die Wohnungsgrundbücher sind angelegt. Ab jetzt ist jede Einheit verkäuflich.",
  },
};

export const TEILUNGSSTATUS_REIHENFOLGE: Teilungsstatus[] = [
  "vorbereitung",
  "beim_notar",
  "beim_amt",
  "eingetragen",
];

/**
 * Die Aufteilung eines Hauses in Wohnungseigentum.
 *
 * Existiert nur, wenn sie beim Deal ausdrücklich angestoßen wurde. Ein Haus,
 * das als Ganzes gehalten oder weiterverkauft wird, braucht keine — und dann
 * ist ein leerer Reiter mit Ablage schlimmer als gar keiner.
 */
export interface Teilungserklaerung {
  gestartetAm: string;
  status: Teilungsstatus;
  /** Wer beurkundet. Oft derselbe Notar wie beim Kaufvertrag, aber nicht immer. */
  notar: string | null;
  /** Geplante Zahl der Wohnungsgrundbücher. */
  einheiten: number | null;
  /** Wann die Eintragung erwartet wird. */
  erwartetAm: string | null;
  notiz: string | null;
}

/** Läuft die Teilung für dieses Objekt? Entscheidet über den Reiter im Detail. */
export function hatTeilung(o: Objekt): boolean {
  return Boolean(o.teilung);
}

/**
 * Eine einzelne Wohnung oder ein ganzes Haus? Entscheidet, welche Frage beim
 * Deal gestellt wird: bei einer Wohnung „ETW oder WG?", bei einem Haus
 * „wie viele wovon?".
 */
export function istEinzelwohnung(o: Objekt): boolean {
  return o.objektart === "etw";
}

/**
 * Die Aufteilung als Satz. Null, wenn beim Deal nichts hinterlegt wurde —
 * dann ist Schweigen ehrlicher als „0 ETW, 0 WG".
 */
export function aufteilungText(o: Objekt): string | null {
  if (istEinzelwohnung(o)) {
    if (!o.vertriebsweg) return null;
    return o.vertriebsweg === "wg"
      ? `WG-Vermietung${o.wgZimmer ? ` · ${o.wgZimmer} Zimmer` : ""}`
      : "Eigentumswohnung";
  }
  const a = o.aufteilung;
  if (!a || a.etw + a.wg === 0) return null;
  const teile: string[] = [];
  if (a.etw > 0) teile.push(`${a.etw} × ETW`);
  if (a.wg > 0) teile.push(`${a.wg} × WG`);
  return teile.join(" · ");
}

/* ------------------------------------------------------------------ */
/* Kontakte                                                             */
/* ------------------------------------------------------------------ */

export type Kontaktrolle =
  | "eigentuemer"
  | "makler"
  | "verwalter"
  | "notar"
  | "handwerker"
  | "sonst";

export const KONTAKTROLLEN: Record<Kontaktrolle, string> = {
  eigentuemer: "Eigentümer",
  makler: "Makler",
  verwalter: "Verwalter",
  notar: "Notar",
  handwerker: "Handwerker",
  sonst: "Sonstige",
};

/**
 * Reihenfolge = wer zuerst gefragt wird. Der Eigentümer entscheidet, der
 * Makler vermittelt, der Rest kommt später dazu.
 */
export const KONTAKTROLLEN_REIHENFOLGE: Kontaktrolle[] = [
  "eigentuemer",
  "makler",
  "verwalter",
  "notar",
  "handwerker",
  "sonst",
];

export interface Kontakt {
  id: string;
  rolle: Kontaktrolle;
  name: string;
  telefon: string | null;
  email: string | null;
  /**
   * Was im Gespräch gesagt wurde. Getrennt von `Objekt.notiz`, weil die eine
   * dem Objekt gehört und die andere dem Menschen: ein Objekt kann abgesagt
   * sein, während der Kontakt weiterläuft — und dann ist diese Zeile das
   * Einzige, was vom Vorgang übrig bleibt.
   */
  notiz: string | null;
}

/** Der Eigentümer, falls einer hinterlegt ist. Für Liste, Suche und Übersicht. */
export function eigentuemerVon(o: Objekt): Kontakt | null {
  return o.kontakte.find((k) => k.rolle === "eigentuemer" && k.name.trim() !== "") ?? null;
}

/**
 * Wen man anruft: der Makler, wenn es einen gibt, sonst der Eigentümer,
 * sonst wer eben eingetragen ist. Für die Pipeline-Karte.
 */
export function ansprechpartnerVon(o: Objekt): Kontakt | null {
  const benannt = o.kontakte.filter((k) => k.name.trim() !== "");
  return (
    benannt.find((k) => k.rolle === "makler") ??
    benannt.find((k) => k.rolle === "eigentuemer") ??
    benannt[0] ??
    null
  );
}

/**
 * Seit wann ein Objekt gekauft ist: die Beurkundung, ersatzweise der letzte
 * Stufenwechsel — wer per Drag & Drop auf „Gekauft“ schiebt, trägt kein
 * Beurkundungsdatum ein.
 */
export function gekauftSeit(o: Objekt): string | null {
  if (o.stufe !== "angekauft") return null;
  if (o.angekauftAm) return o.angekauftAm;
  const wechsel = o.verlauf.filter((v) => v.art === "status").at(-1);
  return wechsel?.zeitpunkt ?? null;
}

/** Alles, wonach man einen Kontakt suchen würde — als eine Zeile. */
export function kontakteAlsText(o: Objekt): string {
  return o.kontakte
    .map((k) => [k.name, k.telefon ?? "", k.email ?? "", KONTAKTROLLEN[k.rolle]].join(" "))
    .join(" ");
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
  /**
   * `false` heißt: die Plattform hat das selbst notiert („Objektdaten
   * bearbeitet“). Solche Einträge gehören in den Verlauf, aber nicht in den
   * Notizverlauf der Übersicht. Fehlt bei älteren Einträgen.
   */
  vonHand?: boolean;
  /** Wer die Notiz geschrieben hat — kommt mit echter Anmeldung in Phase 2. */
  verfasser?: string | null;
}

/** Systemtexte aus der Zeit vor `vonHand` — damit alte Stände sauber bleiben. */
const ALTE_SYSTEMNOTIZEN = /^(Objektdaten bearbeitet|Kontakte gepflegt|Kürzel [A-Z0-9]+ vergeben)$/;

/** Die Notizen, die ein Mensch geschrieben hat, neueste zuerst. */
export function notizverlauf(o: Objekt): Verlaufseintrag[] {
  return o.verlauf
    .filter((v) => v.art === "notiz" && v.vonHand !== false && !ALTE_SYSTEMNOTIZEN.test(v.text))
    .sort((a, b) => b.zeitpunkt.localeCompare(a.zeitpunkt));
}

export interface Objekt {
  id: string;
  /** Eigene Koordinate — NICHT die OSM-Gebäude-ID. Die ist nicht stabil. */
  laenge: number;
  breite: number;
  /** Umriss als Snapshot zum Zeitpunkt der Anlage. Bleibt gültig, auch wenn OSM sich ändert. */
  umriss: [number, number][] | null;

  /** Kurzer Titel für die Pipeline, z. B. „WHG – 2Z – Eselsberg“. Ohne ihn steht die Straße. */
  bezeichnung?: string | null;
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

  /* Steckbrief — optional, damit gespeicherte Bestände gültig bleiben. */
  zimmer?: number | null;
  /** Freitext, weil „2. OG“, „DG“ und „EG + Keller“ alle vorkommen. */
  etage?: string | null;
  /** Monatliches Hausgeld in Euro. */
  hausgeld?: number | null;
  /** Freitext, z. B. „TG-Stellplatz, eigenes Grundbuch“. */
  stellplatz?: string | null;
  /**
   * Das Wesentliche in einer Zeile, oben in der Übersicht: „18k für TG
   * locker, eigenes Grundbuch TG?“. Anders als `notiz` (die Beschreibung)
   * wird sie überschrieben, nicht fortgeschrieben.
   */
  kurznotiz?: string | null;

  /**
   * Alle Beteiligten an diesem Objekt — Eigentümer, Makler, Verwalter, Notar.
   *
   * Eine Liste statt fester Felder, weil die Besetzung je Objekt anders ist:
   * bei einer Direktansprache gibt es keinen Makler, bei einer
   * Erbengemeinschaft zwei Anwälte, und nach dem Ankauf kommt der Notar dazu.
   * Feste Felder hätten für jeden dieser Fälle die falsche Zahl von Zeilen.
   */
  kontakte: Kontakt[];
  quelle: string | null;

  /**
   * Nur bei Wohnungen: Geht die Einheit als klassische ETW in den Vertrieb
   * oder als WG-Vermietung? Entscheidung fällt beim Deal — optional,
   * damit Bestandsdaten ohne das Feld gültig bleiben.
   */
  vertriebsweg?: "etw" | "wg" | null;
  /** Zimmerzahl bei WG-Vermietung. */
  wgZimmer?: number | null;
  /**
   * Bei Häusern: wie viele der Einheiten verkauft und wie viele als WG
   * gehalten werden. Wird beim Deal festgelegt, weil ab da Geld daran hängt —
   * eine ETW braucht einen Vertrieb, eine WG eine Mietgarantie.
   */
  aufteilung?: Aufteilung | null;

  /** Wann der Deal beurkundet wurde. Null, solange nicht gekauft. */
  angekauftAm?: string | null;
  /**
   * Übergang von Besitz, Nutzen und Lasten — meist Wochen nach der
   * Beurkundung, wenn der Kaufpreis bezahlt ist. Ab hier laufen Ummeldungen.
   */
  besitzuebergangAm?: string | null;

  /**
   * Objektkürzel wie „RAV134“: Schlüssel für Drive-Dateinamen und Qonto-Labels.
   * Pflicht ab „Gekauft“ und eindeutig über alle Objekte (siehe `kuerzelVorschlag`).
   */
  kuerzel?: string | null;
  /** Welche Gesellschaft kauft. Optional, damit gespeicherte Bestände gültig bleiben. */
  gesellschaft?: Gesellschaft | null;
  /** Link zum Objektordner im Google Drive. */
  driveOrdnerUrl?: string | null;
  /**
   * Warum kein Deal zustande kam. Bleibt stehen, denn Objekte in Ulm kommen
   * ein zweites Mal — und dann ist die alte Begründung die erste Frage.
   */
  absagegrund?: string | null;
  /**
   * Die Aufteilung in Wohnungseigentum. Null heißt: nicht angestoßen. Dann
   * bleibt der Reiter im Objekt grau, statt eine leere Ablage anzubieten.
   */
  teilung?: Teilungserklaerung | null;

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
/* Gesellschaft und Kürzel                                              */
/* ------------------------------------------------------------------ */

export type Gesellschaft = "revest_projekt" | "revest_asset" | "gt_projekt";

export const GESELLSCHAFTEN: Record<Gesellschaft, string> = {
  revest_projekt: "Revest Projekt GmbH",
  revest_asset: "Revest Asset GmbH",
  gt_projekt: "GT Projekt GmbH",
};

export const STANDARD_GESELLSCHAFT: Gesellschaft = "revest_projekt";

/** Erlaubte Form: Großbuchstaben und Ziffern, 2 bis 12 Zeichen. */
export const KUERZEL_MUSTER = /^[A-Z0-9]{2,12}$/;

/** Eingabe in Kürzelform bringen: groß, ohne Umlautpunkte, nur A–Z und 0–9. */
export function kuerzelSaeubern(roh: string): string {
  return roh
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "SS")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/**
 * Vorschlag aus Straße und Hausnummer: „Ravensburger Straße 134“ → „RAV134“.
 * Ist er schon vergeben, kommt ein Buchstabe dazu („RAV134B“) — das Kürzel
 * muss eindeutig sein, sonst landen zwei Objekte im selben Qonto-Label.
 */
export function kuerzelVorschlag(strasse: string, vergeben: Iterable<string>): string {
  const belegt = new Set(Array.from(vergeben, (k) => k.toUpperCase()));
  const nummer = strasse.match(/\d+\s*[a-zA-Z]?\s*$/)?.[0] ?? "";
  const name = strasse.slice(0, strasse.length - nummer.length);
  const basis = (kuerzelSaeubern(name).slice(0, 3) || "OBJ") + kuerzelSaeubern(nummer);
  if (!belegt.has(basis)) return basis;
  for (const zusatz of "BCDEFGHIJKLMNOPQRSTUVWXYZ") {
    if (!belegt.has(basis + zusatz)) return basis + zusatz;
  }
  return basis + belegt.size;
}

/** Alle Kürzel außer dem des Objekts selbst — für Eindeutigkeit beim Bearbeiten. */
export function andereKuerzel(objekte: Objekt[], eigeneId: string | null): string[] {
  return objekte.flatMap((o) => (o.id !== eigeneId && o.kuerzel ? [o.kuerzel] : []));
}

/**
 * Name des Objektordners nach Drive-Konvention: „JJJJ-MM_Ort_Straße Nr“.
 * Der Monat ist der Ankauf (Beurkundung oder Stufenwechsel auf „Gekauft“),
 * ersatzweise die Anlage.
 */
export function driveOrdnerName(o: Objekt): string {
  const monat = (gekauftSeit(o) ?? o.angelegtAm).slice(0, 7);
  return `${monat}_${o.stadt}_${o.strasse}`;
}

/* ------------------------------------------------------------------ */
/* Dokumentenstruktur                                                   */
/* ------------------------------------------------------------------ */

/**
 * Die Ablage ist die bestehende Google-Drive-Struktur — die Plattform passt
 * sich an, nicht umgekehrt. Namen stehen exakt so wie im Drive, damit der
 * Schlüssel eines Ordners (sein Pfad) später direkt dort auffindbar ist.
 */
interface OrdnerKnoten {
  name: string;
  unterordner?: readonly OrdnerKnoten[];
}

const ORDNER_BAUM: readonly OrdnerKnoten[] = [
  {
    name: "01_Unterlagen",
    unterordner: [
      { name: "01_Unterlagen zum Objekt" },
      {
        name: "02_Bewirtschaftung",
        unterordner: [
          { name: "00_Hausverwaltung" },
          { name: "01_Gas" },
          { name: "02_Strom" },
          { name: "03_Wasser_Stadtwerke" },
          { name: "04_Versicherung" },
          { name: "05_Schornsteinfeger" },
          { name: "06_Grundbesitzabgaben_Stadt" },
        ],
      },
      { name: "03_Notar_Grundbuchsachen" },
      { name: "04_Finanzierung_Bank" },
    ],
  },
  { name: "02_Kalkulation" },
  { name: "03_Renovierung" },
  {
    name: "04_Bilder",
    unterordner: [
      { name: "01_Ankauf - vor Renovierung" },
      { name: "02_Renovierungsphase" },
      { name: "03_nach Staging" },
    ],
  },
  {
    name: "05_Verkauf",
    unterordner: [{ name: "00_Vertrieb" }, { name: "01_Notar" }],
  },
];

export interface Dokumentordner {
  /** Drive-Pfad, z. B. "01_Unterlagen/02_Bewirtschaftung/01_Gas". Steht in `Dokument.ordner`. */
  schluessel: string;
  /** Nummer aus dem Drive-Namen: "01". */
  nummer: string;
  /** Lesbarer Name ohne Nummer: "Wasser Stadtwerke". */
  titel: string;
  /** 0 = Hauptordner. */
  tiefe: number;
  eltern: string | null;
  hatUnterordner: boolean;
}

function abflachen(knoten: readonly OrdnerKnoten[], eltern: string | null, tiefe: number): Dokumentordner[] {
  return knoten.flatMap((k) => {
    const schluessel = eltern ? `${eltern}/${k.name}` : k.name;
    const [nummer, ...rest] = k.name.split("_");
    return [
      {
        schluessel,
        nummer,
        titel: rest.join(" "),
        tiefe,
        eltern,
        hatUnterordner: !!k.unterordner?.length,
      },
      ...abflachen(k.unterordner ?? [], schluessel, tiefe + 1),
    ];
  });
}

/** Alle Ordner in Drive-Reihenfolge, jeder Unterordner direkt unter seinem Elternordner. */
export const DOKUMENT_ORDNER: readonly Dokumentordner[] = abflachen(ORDNER_BAUM, null, 0);

/** Wohin eine Datei ohne bewusste Wahl wandert. */
export const STANDARD_ORDNER = "01_Unterlagen/01_Unterlagen zum Objekt";

export function ordnerVon(schluessel: string): Dokumentordner | undefined {
  return DOKUMENT_ORDNER.find((o) => o.schluessel === schluessel);
}

/** Liegt `schluessel` in `vorfahr` (oder ist es selbst)? */
export function liegtIn(schluessel: string, vorfahr: string): boolean {
  return schluessel === vorfahr || schluessel.startsWith(`${vorfahr}/`);
}

/**
 * Die zehn flachen Ordner aus der ersten Fassung. Gespeicherte Dokumente
 * tragen sie noch — beim Laden werden sie hierüber umgezogen.
 */
const ALTE_ORDNER: Record<string, string> = {
  "01_expose": "01_Unterlagen/01_Unterlagen zum Objekt",
  "02_grundbuch": "01_Unterlagen/03_Notar_Grundbuchsachen",
  "03_kaufvertrag": "01_Unterlagen/03_Notar_Grundbuchsachen",
  "04_plaene": "01_Unterlagen/01_Unterlagen zum Objekt",
  "05_miete": "01_Unterlagen/01_Unterlagen zum Objekt",
  "06_hausverwaltung": "01_Unterlagen/02_Bewirtschaftung/00_Hausverwaltung",
  "07_energie": "01_Unterlagen/01_Unterlagen zum Objekt",
  "08_sanierung": "03_Renovierung",
  "09_fotos": "04_Bilder/01_Ankauf - vor Renovierung",
  "10_vertrieb": "05_Verkauf/00_Vertrieb",
};

/** Alter oder unbekannter Ordner → gültiger Pfad. Unbekanntes landet im Standardordner. */
export function ordnerUmziehen(schluessel: string): string {
  if (schluessel === UNSORTIERT || ordnerVon(schluessel)) return schluessel;
  return ALTE_ORDNER[schluessel] ?? STANDARD_ORDNER;
}

/**
 * Im Ankauf gibt es keine Unterordner: alles liegt in einem Ordner
 * `01 Ankauf/[Bezeichnung]`. Solche Dateien tragen diesen leeren Schlüssel
 * und werden beim Kauf in die Projektstruktur einsortiert.
 */
export const UNSORTIERT = "";

export function istUnsortiert(d: Dokument): boolean {
  return d.ordner === UNSORTIERT;
}

/** Der Drive-Ordner eines Objekts im Ankauf. Abgelegte bleiben im Archiv, gelöscht wird nichts. */
export function ankaufsOrdner(o: Objekt): string {
  const name = o.bezeichnung?.trim() || o.strasse;
  const archiv = o.stufe === "abgesagt" || o.stufe === "unqualifiziert";
  return archiv ? `01 Ankauf/_Archiv/${name}` : `01 Ankauf/${name}`;
}

/**
 * Stichwörter im Dateinamen → Projektordner. Reihenfolge zählt: das erste
 * Muster, das passt, gewinnt — „Angebot_Versicherung“ ist eine Versicherung,
 * kein Handwerkerangebot.
 */
const ORDNER_STICHWORTE: [RegExp, string][] = [
  [/versicherung|police/, "01_Unterlagen/02_Bewirtschaftung/04_Versicherung"],
  [/finanzierung|darlehen|bank|grundschuld/, "01_Unterlagen/04_Finanzierung_Bank"],
  [/schornstein|feuerstaett/, "01_Unterlagen/02_Bewirtschaftung/05_Schornsteinfeger"],
  [/grundsteuer|grundbesitzabgab|abgabenbescheid/, "01_Unterlagen/02_Bewirtschaftung/06_Grundbesitzabgaben_Stadt"],
  [/(^|_)gas(_|\.|$)|gasvertrag/, "01_Unterlagen/02_Bewirtschaftung/01_Gas"],
  [/strom/, "01_Unterlagen/02_Bewirtschaftung/02_Strom"],
  [/wasser|stadtwerke|abwasser/, "01_Unterlagen/02_Bewirtschaftung/03_Wasser_Stadtwerke"],
  [/grundbuch|kaufvertrag|notar|auflassung|teilungserkl|urkunde|eintragung/, "01_Unterlagen/03_Notar_Grundbuchsachen"],
  [/(^|_)weg(_|\.|$)|protokoll|wirtschaftsplan|hausgeld|verwalter|ruecklage|jahresabrechnung/, "01_Unterlagen/02_Bewirtschaftung/00_Hausverwaltung"],
  [/kalkulation|wirtschaftlichkeit|rechnung_ankauf/, "02_Kalkulation"],
  [/angebot|kostenvoranschlag|handwerk|sanierung|renovierung|baufortschritt|abnahme/, "03_Renovierung"],
  [/\.(jpe?g|png|heic|webp|gif)$|foto|bild/, "04_Bilder/01_Ankauf - vor Renovierung"],
  [/expose|grundriss|energieausweis|mieterliste|mietvertrag|mietaufstellung|plan|lageplan|flurkarte/, STANDARD_ORDNER],
];

/** Vorschlag, in welchen Projektordner eine Datei aus dem Ankauf gehört. */
export function ordnerVorschlag(dateiname: string): string {
  const name = dateiname
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[\s-]+/g, "_");
  return ORDNER_STICHWORTE.find(([muster]) => muster.test(name))?.[1] ?? STANDARD_ORDNER;
}

/** Typische Unterlagen je Ordner — als Hinweis in der Upload-Maske. */
export const ORDNER_BEISPIELE: Record<string, string> = {
  "01_Unterlagen": "Sammelordner — besser direkt in einen der Unterordner",
  "01_Unterlagen/01_Unterlagen zum Objekt":
    "Exposé, Grundrisse, Energieausweis, Teilungserklärung, Mieterliste, Mietverträge",
  "01_Unterlagen/02_Bewirtschaftung": "Verträge und Abrechnungen rund um den laufenden Betrieb",
  "01_Unterlagen/02_Bewirtschaftung/00_Hausverwaltung":
    "Verwaltervertrag, WEG-Protokolle, Wirtschaftsplan, Hausgeldabrechnung, Rücklagennachweis",
  "01_Unterlagen/02_Bewirtschaftung/01_Gas": "Gasvertrag, Ummeldung, Zählerstände, Abrechnungen",
  "01_Unterlagen/02_Bewirtschaftung/02_Strom": "Stromvertrag, Ummeldung, Zählerstände, Abrechnungen",
  "01_Unterlagen/02_Bewirtschaftung/03_Wasser_Stadtwerke":
    "Wasser und Abwasser, Ummeldung, Zählerstände, Bescheide der Stadtwerke",
  "01_Unterlagen/02_Bewirtschaftung/04_Versicherung":
    "Gebäudeversicherung, Haftpflicht, Policen und Schadensmeldungen",
  "01_Unterlagen/02_Bewirtschaftung/05_Schornsteinfeger": "Feuerstättenbescheid, Messprotokolle",
  "01_Unterlagen/02_Bewirtschaftung/06_Grundbesitzabgaben_Stadt":
    "Grundsteuerbescheid, Abgabenbescheide der Stadt",
  "01_Unterlagen/03_Notar_Grundbuchsachen":
    "Grundbuchauszug, Kaufvertrag, Notartermin, Auflassungsvormerkung, Eintragungsnachricht",
  "01_Unterlagen/04_Finanzierung_Bank": "Finanzierungszusage, Darlehensvertrag, Grundschuld",
  "02_Kalkulation": "Ankaufskalkulation, Verkaufsplanung, Wirtschaftlichkeitsrechnung",
  "03_Renovierung": "Kostenvoranschläge, Handwerkerangebote, Baufortschritt, Abnahmen",
  "04_Bilder": "Sammelordner — besser direkt in einen der Unterordner",
  "04_Bilder/01_Ankauf - vor Renovierung": "Bestandsfotos bei Besichtigung und Übergabe",
  "04_Bilder/02_Renovierungsphase": "Baufortschritt, Gewerke, Mängel",
  "04_Bilder/03_nach Staging": "Vermarktungsfotos nach Fertigstellung und Staging",
  "05_Verkauf": "Sammelordner — besser direkt in einen der Unterordner",
  "05_Verkauf/00_Vertrieb": "Verkaufsexposé, Reservierungen, Übergabe an AUVERO",
  "05_Verkauf/01_Notar": "Kaufvertragsentwürfe und Urkunden für den Verkauf",
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
  // „Zu teuer“ ist eine Aussage über laufende Verhandlungen — und über die
  // Watchlist, die genau dafür da ist. Ein gekauftes Objekt hat seinen Preis
  // hinter sich, ein abgesagtes ist ohnehin raus.
  const zuTeuer =
    (istAktiv(o.stufe) || o.stufe === "watchlist") && preisAbstand !== null && preisAbstand > 0;

  return {
    kaufpreisJeQm: kp !== null && o.wohnflaeche ? kp / o.wohnflaeche : null,
    // Beide verlangen eine Miete über null. Ohne Miete gibt es keine Rendite,
    // und „0,0 %“ sähe aus wie eine gerechnete Aussage statt wie eine fehlende.
    bruttoMietrendite: kp !== null && miete !== null && kp > 0 && miete > 0 ? (miete / kp) * 100 : null,
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
  // Die Uhr läuft, solange noch geprüft wird: bis zur Besichtigung. Mit dem
  // Angebot ist die Prüfung erledigt, und in der Ablage gibt es nichts zu prüfen.
  if (!istAktiv(o.stufe) || o.stufe === "angebot" || o.stufe === "nachfassen") return null;

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
