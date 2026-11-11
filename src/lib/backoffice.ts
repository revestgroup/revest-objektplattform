/**
 * Backoffice — der zentrale Posteingang, ersetzt das Trello-Board.
 *
 * Alles, was reinkommt (Briefe, Scans, Rechnungen, To-dos), wird eine Karte
 * im Posteingang. Von dort wandert sie über Besprechung und In Arbeit nach
 * Erledigt — oder wird weitergeleitet: an Qonto, an ein Projekt, in die
 * Ablage einer Gesellschaft. Ziel: Posteingang abends leer.
 *
 * Grundregel (SAMMLUNG 4): Nichts verschwindet, bis die Übergabe bestätigt
 * ist. Eine weitergeleitete Karte bleibt sichtbar — wartet → übertragen →
 * bestätigt oder fehlgeschlagen. Erst „bestätigt“ (mit Link/Nachweis) legt
 * sie ins Archiv. Bis Phase 2 setzt man den Status von Hand; dann melden
 * Qonto-API und Drive ihn selbst.
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

export type Uebergabestatus = "wartet" | "uebertragen" | "bestaetigt" | "fehlgeschlagen";

export const UEBERGABESTATUS: Record<
  Uebergabestatus,
  { titel: string; weich: string; tief: string }
> = {
  wartet: { titel: "wartet", weich: "#FBEBD1", tief: "#8A5A08" },
  uebertragen: { titel: "übertragen", weich: "#E4EAF2", tief: "#38506E" },
  bestaetigt: { titel: "bestätigt", weich: "#DBF2E6", tief: "#0C5E3A" },
  fehlgeschlagen: { titel: "fehlgeschlagen", weich: "#FBE2E2", tief: "#9A2727" },
};

export interface Uebergabe {
  ziel: Weiterleitung;
  /** Ältere Stände kennen noch „erledigt“ — gilt wie „bestätigt“. */
  status: Uebergabestatus | "erledigt";
  /** Wann weitergeleitet wurde. */
  am: string;
  /** Letzter Statuswechsel — daran misst die 2-Tage-Regel. Fehlt bei älteren Ständen. */
  geaendertAm?: string;
  /** Was bei der Übergabe gewählt wurde, lesbar: „Revest Projekt / 05_Finanzen & Steuer“. */
  details: string;
  /** Link zum Ziel (Qonto-Transaktion, Drive-Datei) bzw. Nachweis. Pflicht für „bestätigt“. */
  link?: string | null;
  /** Bei „fehlgeschlagen“: warum. */
  grund?: string | null;
  /** Phase 2: ID beim Ziel (Qonto-Beleg, Drive-Datei-ID). */
  externeId?: string | null;
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
  /** Im Archiv seit — gesetzt erst mit bestätigter Übergabe bzw. bestätigtem „Erledigt“. */
  archiviertAm?: string | null;
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

const zielTitel = (ziel: Weiterleitung) =>
  WEITERLEITUNGEN.find((w) => w.id === ziel)!.titel.replace("→ ", "");

function mitVermerk(k: Backofficekarte, text: string, am: string): Backofficekarte {
  return { ...k, verlauf: [...k.verlauf, { zeitpunkt: am, text }] };
}

/** Status einer Übergabe, ältere „erledigt“ als „bestätigt“ gelesen. */
export function uebergabestatus(u: Uebergabe): Uebergabestatus {
  return u.status === "erledigt" ? "bestaetigt" : u.status;
}

/**
 * Weiterleiten: die Übergabe beginnt mit „wartet“. Die Karte bleibt sichtbar
 * — in der Spalte ihres Ziels —, bis die Übergabe bestätigt ist.
 */
export function weiterleiten(
  k: Backofficekarte,
  ziel: Weiterleitung,
  details: string,
  jetzt = new Date(),
): Backofficekarte {
  const am = jetzt.toISOString();
  return mitVermerk(
    { ...k, uebergabe: { ziel, status: "wartet", am, geaendertAm: am, details } },
    `An ${zielTitel(ziel)} weitergeleitet${details ? `: ${details}` : ""} — wartet`,
    am,
  );
}

export class Uebergabefehler extends Error {}

/**
 * Status der Übergabe setzen. „bestätigt“ nur mit Link/Nachweis und legt die
 * Karte ins Archiv, „fehlgeschlagen“ nur mit Grund.
 */
export function uebergabeSetzen(
  k: Backofficekarte,
  status: Uebergabestatus,
  angaben: { link?: string | null; grund?: string | null } = {},
  jetzt = new Date(),
  wer?: string | null,
): Backofficekarte {
  if (!k.uebergabe) throw new Uebergabefehler("Karte wurde nicht weitergeleitet.");
  const link = angaben.link?.trim() || k.uebergabe.link || null;
  const grund = angaben.grund?.trim() || null;
  if (status === "bestaetigt" && !link)
    throw new Uebergabefehler("Bestätigen braucht einen Link oder Nachweis.");
  if (status === "fehlgeschlagen" && !grund) throw new Uebergabefehler("Bitte den Grund angeben.");
  const am = jetzt.toISOString();
  const text =
    status === "bestaetigt"
      ? `Übergabe an ${zielTitel(k.uebergabe.ziel)} bestätigt (${link}) — ins Archiv`
      : status === "fehlgeschlagen"
        ? `Übergabe an ${zielTitel(k.uebergabe.ziel)} fehlgeschlagen: ${grund}`
        : `Übergabe an ${zielTitel(k.uebergabe.ziel)}: ${UEBERGABESTATUS[status].titel}`;
  return mitVermerk(
    {
      ...k,
      uebergabe: {
        ...k.uebergabe,
        status,
        geaendertAm: am,
        link,
        grund: status === "fehlgeschlagen" ? grund : null,
      },
      archiviertAm: status === "bestaetigt" ? am : (k.archiviertAm ?? null),
    },
    wer ? `${text} · ${wer}` : text,
    am,
  );
}

/** Erledigt ohne Weiterleitung: bestätigt ins Archiv legen. */
export function archivieren(
  k: Backofficekarte,
  jetzt = new Date(),
  wer?: string | null,
): Backofficekarte {
  const am = jetzt.toISOString();
  return mitVermerk(
    { ...k, spalte: "erledigt", archiviertAm: am },
    `Ins Archiv${wer ? ` · ${wer}` : ""}`,
    am,
  );
}

/** Zurück in den Posteingang. Die Übergabe endet, ihr Verlauf bleibt. */
export function zurueckholen(k: Backofficekarte, jetzt = new Date()): Backofficekarte {
  const am = jetzt.toISOString();
  return mitVermerk(
    { ...k, spalte: "posteingang", archiviertAm: null, uebergabe: null },
    "Zurückgeholt in den Posteingang",
    am,
  );
}

/** Wo die Karte steht: Archiv, Spalte eines Ziels (offene Übergabe) oder Board-Spalte. */
export function ortVon(k: Backofficekarte): "archiv" | Weiterleitung | Spalte {
  if (k.archiviertAm) return "archiv";
  if (k.uebergabe) return k.uebergabe.ziel;
  return k.spalte;
}

/** Länger als 2 Tage nicht bestätigt — oder fehlgeschlagen. */
export function haengtFest(k: Backofficekarte, jetzt = new Date()): boolean {
  if (!k.uebergabe || k.archiviertAm) return false;
  const s = uebergabestatus(k.uebergabe);
  if (s === "fehlgeschlagen") return true;
  if (s === "bestaetigt") return false;
  const seit = new Date(k.uebergabe.geaendertAm ?? k.uebergabe.am).getTime();
  return jetzt.getTime() - seit > 2 * 86_400_000;
}

export interface Archivfilter {
  suche?: string;
  ziel?: Weiterleitung | "erledigt" | "";
  gesellschaft?: string;
  objektId?: string;
  von?: string;
  bis?: string;
}

/** Ziel im Archiv: das der Übergabe, sonst „Erledigt“. */
export function archivZiel(k: Backofficekarte): Weiterleitung | "erledigt" {
  return k.uebergabe?.ziel ?? "erledigt";
}

export function archivFiltern(karten: Backofficekarte[], f: Archivfilter): Backofficekarte[] {
  const b = f.suche?.trim().toLowerCase() ?? "";
  return karten
    .filter((k) => k.archiviertAm)
    .filter((k) => !f.ziel || archivZiel(k) === f.ziel)
    .filter((k) => !f.gesellschaft || k.gesellschaft === f.gesellschaft)
    .filter((k) => !f.objektId || k.objektId === f.objektId)
    .filter((k) => !f.von || k.archiviertAm!.slice(0, 10) >= f.von)
    .filter((k) => !f.bis || k.archiviertAm!.slice(0, 10) <= f.bis)
    .filter(
      (k) =>
        !b ||
        [k.titel, k.datei?.name, k.notizen, k.uebergabe?.details, k.uebergabe?.link]
          .join(" ")
          .toLowerCase()
          .includes(b),
    )
    .sort((a, c) => c.archiviertAm!.localeCompare(a.archiviertAm!));
}
