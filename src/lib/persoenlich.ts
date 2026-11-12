/**
 * Cockpit · Persönlich · Visionboard (Ausbau 4, P3). Nur für die
 * Geschäftsführung — bis es eine echte Anmeldung gibt, liegt alles nur in
 * diesem Browser (`revest.persoenlich.v1`).
 *
 * Keine Beispielinhalte: Das Board startet mit leeren Kacheln je
 * Startkategorie, Ziele und Ideen leer.
 */
import { tagIso, montagVon, type Sprintpunkt, type Zeitblock } from "./cockpit";

export const STARTKATEGORIEN = [
  "Unternehmen",
  "Familie",
  "Gesundheit",
  "Finanzen",
  "Freiheit / Reisen",
  "Lernen",
];

/** Ruhige Flächen je Kategorie; unbekannte Kategorien bekommen eine neutrale. */
const FLAECHEN: Record<string, string> = {
  Unternehmen: "#E9E2D3",
  Familie: "#DFE7DF",
  Gesundheit: "#DDE6EF",
  Finanzen: "#ECE3D6",
  "Freiheit / Reisen": "#E3E0EC",
  Lernen: "#E6EBE1",
};

export function flaecheFuer(kategorie: string): string {
  return FLAECHEN[kategorie] ?? "#EFEAE1";
}

export interface Kachel {
  id: string;
  kategorie: string;
  satz: string;
  /** Verkleinertes Bild als data:-URL (bis Phase 2 nur lokal). */
  bild: string | null;
}

export interface PrivatesZiel {
  id: string;
  name: string;
  /** Freitext, z. B. „3 von 12 Läufen“. */
  stand: string;
  /** 0…100 */
  fortschritt: number;
  quartale: [boolean, boolean, boolean, boolean];
}

export interface Idee {
  id: string;
  text: string;
  angelegtAm: string;
}

export interface Persoenlich {
  /** Tagesfokus je Datum „JJJJ-MM-TT“. */
  fokus: Record<string, string>;
  warum: string;
  board: Kachel[];
  /** Blättern im täglichen Impuls: Versatz zum Tageswert, gilt nur am Tag `am`. */
  impuls: { am: string; versatz: number };
  /** Abgehakte Quartale der Geschäftsziele, Schlüssel z. B. „2026:ankaeufe“. */
  geschaeftQuartale: Record<string, [boolean, boolean, boolean, boolean]>;
  privateZiele: PrivatesZiel[];
  ideen: Idee[];
}

export function startstand(neueId: (p: string) => string): Persoenlich {
  return {
    fokus: {},
    warum: "",
    board: STARTKATEGORIEN.map((kategorie) => ({
      id: neueId("kac"),
      kategorie,
      satz: "",
      bild: null,
    })),
    impuls: { am: "", versatz: 0 },
    geschaeftQuartale: {},
    privateZiele: [],
    ideen: [],
  };
}

/* ------------------------------------------------------------------ */
/* Heute zählt                                                          */
/* ------------------------------------------------------------------ */

/**
 * Tage in Folge mit gesetztem Fokus. Zählt bis heute; ist heute noch leer,
 * ab gestern — die Serie reißt erst, wenn ein ganzer Tag fehlt.
 */
export function fokusSerie(fokus: Record<string, string>, heute: Date = new Date()): number {
  const gesetzt = (d: Date) => !!fokus[tagIso(d)]?.trim();
  const d = new Date(heute.getFullYear(), heute.getMonth(), heute.getDate());
  if (!gesetzt(d)) d.setDate(d.getDate() - 1);
  let n = 0;
  while (gesetzt(d)) {
    n += 1;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

interface AufgabeFuerWoche {
  art: string;
  faelligAm: string | null;
  erledigtAm: string | null;
  zeitblock?: Zeitblock | null;
}

/**
 * Wochenstand Sprint: Termine/Zeitblöcke und Sprint-Punkte der laufenden
 * Woche. Erledigt ist eine abgehakte Aufgabe oder ein Sprint-Punkt, dessen
 * Ende vorbei ist.
 */
export function wochenstand(
  aufgaben: AufgabeFuerWoche[],
  punkte: Sprintpunkt[],
  jetzt: Date = new Date(),
): { erledigt: number; gesamt: number } {
  const mo = montagVon(jetzt);
  const von = mo.getTime();
  const bis = new Date(mo.getFullYear(), mo.getMonth(), mo.getDate() + 7).getTime();
  const inWoche = (t: number) => t >= von && t < bis;
  let erledigt = 0;
  let gesamt = 0;
  for (const a of aufgaben) {
    if (!a.faelligAm || !(a.zeitblock || a.art === "termin" || a.art === "besichtigung")) continue;
    if (!inWoche(new Date(a.faelligAm).getTime())) continue;
    gesamt += 1;
    if (a.erledigtAm) erledigt += 1;
  }
  for (const p of punkte) {
    if (!inWoche(new Date(p.von).getTime())) continue;
    gesamt += 1;
    if (new Date(p.bis).getTime() <= jetzt.getTime()) erledigt += 1;
  }
  return { erledigt, gesamt };
}

/* ------------------------------------------------------------------ */
/* Täglicher Impuls                                                     */
/* ------------------------------------------------------------------ */

/** Tage seit 1970 nach lokalem Kalender — wechselt um Mitternacht. */
function tagesnummer(d: Date): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}

/** Die Kachel des Tages; nur Kacheln mit Satz oder Bild. Null bei leerem Board. */
export function impulsFuer(
  board: Kachel[],
  impuls: Persoenlich["impuls"],
  heute: Date = new Date(),
): Kachel | null {
  const gefuellt = board.filter((k) => k.satz.trim() || k.bild);
  if (!gefuellt.length) return null;
  const versatz = impuls.am === tagIso(heute) ? impuls.versatz : 0;
  return gefuellt[(tagesnummer(heute) + versatz) % gefuellt.length];
}

/* ------------------------------------------------------------------ */
/* Board sortieren                                                      */
/* ------------------------------------------------------------------ */

/** Kachel `id` an die Stelle von `zielId` schieben (davor beim Ziehen nach vorn, sonst dahinter). */
export function verschieben(board: Kachel[], id: string, zielId: string): Kachel[] {
  const von = board.findIndex((k) => k.id === id);
  const nach = board.findIndex((k) => k.id === zielId);
  if (von === -1 || nach === -1 || von === nach) return board;
  const neu = [...board];
  const [k] = neu.splice(von, 1);
  neu.splice(nach, 0, k);
  return neu;
}

/** Um eine Stelle nach vorn (-1) oder hinten (+1) — für Tastatur und Telefon. */
export function schieben(board: Kachel[], id: string, richtung: -1 | 1): Kachel[] {
  const i = board.findIndex((k) => k.id === id);
  const j = i + richtung;
  if (i === -1 || j < 0 || j >= board.length) return board;
  return verschieben(board, id, board[j].id);
}
