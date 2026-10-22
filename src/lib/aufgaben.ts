/**
 * Aufgaben.
 *
 * Eine Aufgabe ist das, was zwischen zwei Stufen passieren muss: anrufen,
 * nachrechnen, Unterlagen anfordern, Termin machen. Sie hängt fast immer an
 * einem Objekt — deshalb ist `objektId` auch kein Pflichtfeld, aber die
 * Oberfläche fragt danach, bevor sie nach allem anderen fragt.
 *
 * Bewusst klein gehalten: kein Zuweisen an Personen, keine Teilaufgaben, keine
 * Abhängigkeiten. Timo arbeitet allein an dieser Liste, und jedes Feld, das
 * niemand füllt, macht die drei wichtigen schwerer zu finden.
 */

export type Dringlichkeit = "hoch" | "normal" | "niedrig";

export const DRINGLICHKEITEN: Record<
  Dringlichkeit,
  { titel: string; farbe: string; reihe: number }
> = {
  hoch: { titel: "Hoch", farbe: "#CF4848", reihe: 0 },
  normal: { titel: "Normal", farbe: "#C79A3C", reihe: 1 },
  niedrig: { titel: "Niedrig", farbe: "#9BA3AE", reihe: 2 },
};

export const DRINGLICHKEIT_REIHENFOLGE: Dringlichkeit[] = ["hoch", "normal", "niedrig"];

/**
 * Wofür die Aufgabe steht. Keine Pflicht, aber sie erlaubt, eine Liste von
 * vierzig Zeilen auf „alles, was Telefonieren ist“ zu verkürzen.
 */
export type Aufgabenart = "anruf" | "unterlagen" | "besichtigung" | "rechnen" | "termin" | "sonst";

export const AUFGABENARTEN: Record<Aufgabenart, string> = {
  anruf: "Anruf",
  unterlagen: "Unterlagen",
  besichtigung: "Besichtigung",
  rechnen: "Kalkulation",
  termin: "Termin",
  sonst: "Sonstiges",
};

export const AUFGABENART_REIHENFOLGE: Aufgabenart[] = [
  "anruf",
  "unterlagen",
  "besichtigung",
  "rechnen",
  "termin",
  "sonst",
];

export interface Aufgabe {
  id: string;
  titel: string;
  /** Was genau zu tun ist, wenn der Titel nicht reicht. */
  beschreibung: string | null;
  /** Das Objekt, zu dem die Aufgabe gehört. Null heißt: allgemein. */
  objektId: string | null;
  art: Aufgabenart;
  dringlichkeit: Dringlichkeit;
  /** ISO-Datum. Null heißt: irgendwann — und landet entsprechend hinten. */
  faelligAm: string | null;
  /** ISO-Zeitpunkt des Hakens. Null heißt: offen. */
  erledigtAm: string | null;
  angelegtAm: string;
}

export type AufgabenEntwurf = Omit<Aufgabe, "id" | "erledigtAm" | "angelegtAm">;

/* ------------------------------------------------------------------ */
/* Fälligkeit                                                           */
/* ------------------------------------------------------------------ */

/**
 * Tage bis zur Fälligkeit, auf den Kalendertag gerechnet.
 *
 * Auf Mitternacht normiert, weil „heute 23 Uhr“ und „heute 7 Uhr“ für eine
 * Aufgabenliste derselbe Tag sind. Ohne das wäre eine Aufgabe am Nachmittag
 * plötzlich „morgen“.
 */
export function tageBis(faelligAm: string | null, jetzt: Date = new Date()): number | null {
  if (!faelligAm) return null;
  const ziel = new Date(faelligAm);
  if (Number.isNaN(ziel.getTime())) return null;
  const a = new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate()).getTime();
  const b = new Date(ziel.getFullYear(), ziel.getMonth(), ziel.getDate()).getTime();
  return Math.round((b - a) / 86_400_000);
}

export type Faelligkeit = "ueberfaellig" | "heute" | "bald" | "spaeter" | "ohne";

export function faelligkeit(aufgabe: Aufgabe, jetzt: Date = new Date()): Faelligkeit {
  const t = tageBis(aufgabe.faelligAm, jetzt);
  if (t === null) return "ohne";
  if (t < 0) return "ueberfaellig";
  if (t === 0) return "heute";
  if (t <= 7) return "bald";
  return "spaeter";
}

/** Wie die Frist im Text erscheint — relativ, solange das genauer trifft. */
export function fristText(faelligAm: string | null, jetzt: Date = new Date()): string {
  const t = tageBis(faelligAm, jetzt);
  if (t === null) return "ohne Frist";
  if (t === 0) return "heute";
  if (t === 1) return "morgen";
  if (t === -1) return "gestern";
  if (t < 0) return `${Math.abs(t)} Tage überfällig`;
  if (t <= 14) return `in ${t} Tagen`;
  return new Date(faelligAm!).toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
}

/**
 * Sortierung der offenen Liste.
 *
 * Erst die Frist, dann die Dringlichkeit — nicht umgekehrt. Eine überfällige
 * Nebensache blockiert echte Arbeit; eine wichtige Aufgabe in drei Wochen
 * nicht. Aufgaben ohne Frist stehen hinten, weil „irgendwann“ keine
 * Entscheidung erzwingt.
 */
export function sortiereOffen(a: Aufgabe, b: Aufgabe): number {
  const ta = tageBis(a.faelligAm);
  const tb = tageBis(b.faelligAm);
  if (ta === null && tb !== null) return 1;
  if (tb === null && ta !== null) return -1;
  if (ta !== null && tb !== null && ta !== tb) return ta - tb;
  const da = DRINGLICHKEITEN[a.dringlichkeit].reihe;
  const db = DRINGLICHKEITEN[b.dringlichkeit].reihe;
  if (da !== db) return da - db;
  return a.angelegtAm.localeCompare(b.angelegtAm);
}
