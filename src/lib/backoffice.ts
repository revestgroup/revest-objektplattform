/**
 * Backoffice — der zentrale Posteingang, ersetzt das Trello-Board.
 *
 * Alles, was reinkommt (Briefe, Scans, Rechnungen, To-dos), wird eine Karte
 * im Posteingang. Von dort wandert sie über Besprechung und In Arbeit nach
 * Erledigt — oder wird weitergeleitet: an Qonto, an ein Projekt, in die
 * Ablage einer Gesellschaft. Ziel: Posteingang abends leer.
 *
 * Bis Phase 2 werden die Weiterleitungen nur vermerkt („wartet auf
 * Übergabe“), damit der Ablauf schon jetzt geübt werden kann.
 */

export type Spalte = "posteingang" | "besprechung" | "in_arbeit" | "erledigt";
export type Weiterleitung = "qonto" | "projekt" | "ablage";

export const SPALTEN: { id: Spalte; titel: string }[] = [
  { id: "posteingang", titel: "Posteingang" },
  { id: "besprechung", titel: "Besprechung" },
  { id: "in_arbeit", titel: "In Arbeit" },
  { id: "erledigt", titel: "Erledigt" },
];

export const WEITERLEITUNGEN: {
  id: Weiterleitung;
  titel: string;
  farbe: string;
  weich: string;
  tief: string;
}[] = [
  { id: "qonto", titel: "→ Qonto", farbe: "#6F86A6", weich: "#E4EAF2", tief: "#38506E" },
  { id: "projekt", titel: "→ Projekt", farbe: "#5E8F7A", weich: "#E2EFE9", tief: "#2D5646" },
  { id: "ablage", titel: "→ Ablage", farbe: "#9A8F7A", weich: "#EFEBE4", tief: "#5A5240" },
];

export type Kartenart = "rechnung" | "brief" | "vertrag" | "behoerde" | "todo" | "sonstiges";

export const KARTENARTEN: Record<Kartenart, string> = {
  rechnung: "Rechnung",
  brief: "Brief",
  vertrag: "Vertrag",
  behoerde: "Behörde",
  todo: "To-do",
  sonstiges: "Sonstiges",
};

export type Kartenquelle = "scan" | "upload" | "mail" | "hand";

export const KARTENQUELLEN: Record<Kartenquelle, string> = {
  scan: "Scan",
  upload: "Upload",
  mail: "Mail",
  hand: "von Hand",
};

/** Die Gesellschaften der Ablage — breiter als die Ankaufs-Gesellschaften am Objekt. */
export const ABLAGE_GESELLSCHAFTEN = [
  "Revest Projekt",
  "Revest Asset",
  "Sanero",
  "IMPERA",
  "AUVERO",
  "GT Projekt",
  "Privat",
] as const;

/** Ordner je Gesellschaft. Entsteht in Phase 2 genau so im Drive. */
export const ABLAGE_ORDNER = [
  "01_Eingangsrechnungen",
  "02_Ausgangsrechnungen",
  "03_Verträge",
  "04_Behörden",
  "05_Finanzen & Steuer",
  "06_Unternehmen",
  "07_Personal",
  "08_Versicherungen",
  "09_Sonstiges",
] as const;

export interface Kartendatei {
  name: string;
  typ: string;
  groesseKb: number;
  /** Nur in der laufenden Sitzung (blob:) — ein Reload verliert die Vorschau, nicht die Karte. */
  vorschau?: string | null;
}

export interface Checkpunkt {
  id: string;
  text: string;
  erledigt: boolean;
}

export interface Uebergabe {
  ziel: Weiterleitung;
  /** Bis Phase 2 immer „wartet“: vermerkt, aber noch nicht wirklich übergeben. */
  status: "wartet" | "erledigt";
  am: string;
  /** Was bei der Übergabe gewählt wurde, lesbar: „Revest Projekt / 05_Finanzen & Steuer“. */
  details: string;
}

export interface Backofficekarte {
  id: string;
  titel: string;
  spalte: Spalte;
  art: Kartenart;
  quelle: Kartenquelle;
  eingangAm: string;
  datei: Kartendatei | null;
  objektId: string | null;
  gesellschaft: string | null;
  faelligAm: string | null;
  notizen: string | null;
  checkliste: Checkpunkt[];
  /** Für später mit der Halbtagskraft: wer sich kümmert. */
  zugewiesen: string | null;
  uebergabe: Uebergabe | null;
  verlauf: { zeitpunkt: string; text: string }[];
}

/* ------------------------------------------------------------------ */
/* Aus einer Datei eine Karte                                           */
/* ------------------------------------------------------------------ */

/** Dateiname → Art. Nur eine erste Schätzung, im Fenster änderbar. */
export function artAusName(name: string): Kartenart {
  const n = name.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue");
  if (/rechnung|invoice|\bre[-_ ]?\d|beleg|quittung/.test(n)) return "rechnung";
  if (/vertrag|vereinbarung|police/.test(n)) return "vertrag";
  if (/finanzamt|bescheid|stadt|amt|behoerde|grundsteuer/.test(n)) return "behoerde";
  if (/brief|schreiben|mahnung/.test(n)) return "brief";
  return "sonstiges";
}

/** „2026-11-03_Rechnung_Kessler.pdf“ → „Rechnung Kessler“. */
export function titelAusName(name: string): string {
  return (
    name
      .replace(/\.[a-z0-9]{2,5}$/i, "")
      .replace(/^\d{4}-\d{2}-\d{2}[_ -]*/, "")
      .replace(/[_]+/g, " ")
      .trim() || name
  );
}

/** Welcher Ablage-Ordner zur Art passt — Vorschlag für „→ Ablage“. */
export function ablageOrdnerVorschlag(art: Kartenart): (typeof ABLAGE_ORDNER)[number] {
  switch (art) {
    case "rechnung":
      return "01_Eingangsrechnungen";
    case "vertrag":
      return "03_Verträge";
    case "behoerde":
      return "04_Behörden";
    default:
      return "09_Sonstiges";
  }
}

export function istUeberfaellig(k: Backofficekarte, jetzt = new Date()): boolean {
  return (
    k.spalte !== "erledigt" &&
    !!k.faelligAm &&
    new Date(k.faelligAm) < new Date(jetzt.toDateString())
  );
}

/**
 * Weiterleiten: Karte nach „Erledigt“, Übergabe vermerkt. Die eigentliche
 * Übergabe (Qonto-Beleg, Drive-Ablage) kommt mit Phase 2.
 */
export function weiterleiten(
  k: Backofficekarte,
  ziel: Weiterleitung,
  details: string,
  jetzt = new Date(),
): Backofficekarte {
  const titel = WEITERLEITUNGEN.find((w) => w.id === ziel)!.titel.replace("→ ", "");
  const am = jetzt.toISOString();
  return {
    ...k,
    spalte: "erledigt",
    uebergabe: { ziel, status: "wartet", am, details },
    verlauf: [
      ...k.verlauf,
      {
        zeitpunkt: am,
        text: `An ${titel} übergeben${details ? `: ${details}` : ""} — wartet auf Übergabe`,
      },
    ],
  };
}
