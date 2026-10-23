/**
 * Backoffice — die schriftlichen Unterlagen der drei Firmen.
 *
 * Nicht zu verwechseln mit der Objektakte: dort liegt alles, was zu einem
 * Haus gehört (Grundbuch, Kaufvertrag, Pläne). Hier liegt alles, was zur
 * Firma gehört — Rechnungen, Verträge, Bescheide, Kontoauszüge.
 *
 * Der Weg eines Belegs ist immer derselbe: Der Scanner wirft ihn in den
 * Eingang, die Erkennung rät Firma, Ordner, Datum und Betrag, und ein Mensch
 * nickt das ab. Deshalb ist `bestaetigtAm` das wichtigste Feld der Datei —
 * es trennt „liegt im Posteingang" von „ist abgelegt".
 */

export type Firma = "revest" | "sanero" | "auvero";

export const FIRMEN: Record<Firma, { titel: string; kurz: string; zweck: string; farbe: string }> = {
  revest: { titel: "REVEST", kurz: "RV", zweck: "Ankauf & Bestand", farbe: "#2F6F4E" },
  sanero: { titel: "SANERO", kurz: "SA", zweck: "Sanierung & Bau", farbe: "#C79A3C" },
  auvero: { titel: "AUVERO", kurz: "AU", zweck: "Vertrieb", farbe: "#3B5C8F" },
};

export const FIRMEN_REIHENFOLGE: Firma[] = ["revest", "sanero", "auvero"];

/**
 * Die Ordner je Firma. Diese Struktur entsteht später 1:1 im Google Drive,
 * deshalb steht sie schon jetzt fest — damit später nichts umziehen muss.
 * Nummerierte Schlüssel, weil Drive alphabetisch sortiert.
 */
export const BACKOFFICE_ORDNER = [
  { schluessel: "01_eingangsrechnungen", titel: "Eingangsrechnungen" },
  { schluessel: "02_ausgangsrechnungen", titel: "Ausgangsrechnungen" },
  { schluessel: "03_vertraege", titel: "Verträge" },
  { schluessel: "04_steuern", titel: "Steuern & Behörden" },
  { schluessel: "05_bank", titel: "Bank" },
  { schluessel: "06_gesellschaft", titel: "Gesellschaft" },
  { schluessel: "07_personal", titel: "Personal" },
  { schluessel: "08_versicherungen", titel: "Versicherungen" },
  { schluessel: "09_sonstiges", titel: "Sonstiges" },
] as const;

/** Typische Unterlagen je Ordner — als Hinweis in der Erfassungsmaske. */
export const BACKOFFICE_BEISPIELE: Record<string, string> = {
  "01_eingangsrechnungen": "Handwerker, Makler, Gutachter, Material, Büro",
  "02_ausgangsrechnungen": "Gestellte Rechnungen, Gutschriften, Mahnungen",
  "03_vertraege": "Dienstleister, Miete Büro, Leasing, Wartung, Software",
  "04_steuern": "Steuerbescheide, Umsatzsteuervoranmeldung, Finanzamt, Gewerbeamt",
  "05_bank": "Kontoauszüge, Darlehensverträge, Tilgungspläne, Bürgschaften",
  "06_gesellschaft": "Handelsregister, Gesellschafterbeschlüsse, Jahresabschluss, Satzung",
  "07_personal": "Arbeitsverträge, Lohnabrechnungen, Krankmeldungen, Zeugnisse",
  "08_versicherungen": "Policen, Schadensmeldungen, Beitragsrechnungen",
  "09_sonstiges": "Alles, was in keinen anderen Ordner gehört",
};

export function ordnerTitel(schluessel: string | null): string {
  if (!schluessel) return "Nicht zugeordnet";
  return BACKOFFICE_ORDNER.find((o) => o.schluessel === schluessel)?.titel ?? schluessel;
}

export interface Beleg {
  id: string;
  /** Worum es geht, in Klartext — nicht der Dateiname. */
  titel: string;
  /** Null heißt: die Erkennung war sich nicht sicher. */
  firma: Firma | null;
  /** Schlüssel aus BACKOFFICE_ORDNER. Null heißt: noch nicht einsortiert. */
  ordner: string | null;
  /** Wer den Beleg geschickt hat. */
  absender: string | null;
  /** Belegdatum als ISO-Datum. Nicht das Scandatum. */
  datum: string | null;
  /** Bruttobetrag in Euro. Null bei Belegen ohne Betrag. */
  betrag: number | null;
  /**
   * Wie sicher die Erkennung war, 0 bis 1. Unter SCHWELLE_SICHER ist der
   * Beleg ein Fall für den Menschen, darüber reicht ein Blick.
   */
  sicherheit: number;
  /** ISO-Zeitpunkt der Abnahme. Null heißt: liegt im Posteingang. */
  bestaetigtAm: string | null;
  dateiname: string;
  seiten: number;
  gescanntAm: string;
  /** Link ins Google Drive. Steht erst, wenn die Ablage angebunden ist. */
  driveLink: string | null;
}

export type BelegEntwurf = Omit<Beleg, "id" | "bestaetigtAm" | "gescanntAm" | "driveLink">;

/**
 * Ab hier gilt die Erkennung als brauchbar. Darunter wird der Beleg im
 * Posteingang als unsicher markiert — nicht, um ihn zu sperren, sondern
 * damit der Blick zuerst dorthin geht.
 */
export const SCHWELLE_SICHER = 0.8;

/** Ein Beleg ist erst vollständig, wenn Firma und Ordner feststehen. */
export function istVollstaendig(b: Beleg): boolean {
  return b.firma !== null && b.ordner !== null;
}

/**
 * Was dem Beleg noch fehlt, als Liste von Feldnamen. Leer heißt: kann so
 * abgelegt werden.
 */
export function fehlendeFelder(b: Beleg): string[] {
  const fehlt: string[] = [];
  if (!b.firma) fehlt.push("Firma");
  if (!b.ordner) fehlt.push("Ordner");
  if (!b.datum) fehlt.push("Datum");
  return fehlt;
}

/**
 * Sortierung des Posteingangs: erst das Unsichere, dann das Unvollständige,
 * dann das Neueste. Was die Maschine nicht konnte, soll oben liegen.
 */
export function sortierePosteingang(a: Beleg, b: Beleg): number {
  const ua = a.sicherheit < SCHWELLE_SICHER ? 0 : 1;
  const ub = b.sicherheit < SCHWELLE_SICHER ? 0 : 1;
  if (ua !== ub) return ua - ub;
  const va = istVollstaendig(a) ? 1 : 0;
  const vb = istVollstaendig(b) ? 1 : 0;
  if (va !== vb) return va - vb;
  return b.gescanntAm.localeCompare(a.gescanntAm);
}

/** Ablage: das Neueste zuerst, nach Belegdatum. */
export function sortiereAblage(a: Beleg, b: Beleg): number {
  const da = a.datum ?? a.gescanntAm;
  const db = b.datum ?? b.gescanntAm;
  return db.localeCompare(da);
}

/**
 * Dateiname, wie ihn die Ablage später vergibt: Datum, Absender, Titel.
 * Sortiert sich im Drive von selbst und bleibt ohne Datenbank lesbar.
 */
export function ablageName(b: Beleg): string {
  const datum = (b.datum ?? b.gescanntAm).slice(0, 10);
  const teile = [datum, b.absender, b.titel].filter(Boolean) as string[];
  return `${teile.join("_").replace(/[^\w\-ÄÖÜäöüß ]+/g, "").replace(/\s+/g, "-")}.pdf`;
}
