/**
 * Cockpit (Ausbau 4): die Startseite für zwei Rollen.
 *
 * Bis Phase 2 gibt es keine echten Rechte — nur einen Umschalter „Ich arbeite
 * gerade als …“. Timo übernimmt beide Rollen. Das Datenmodell trägt trotzdem
 * schon `zustaendig` an Aufgaben, Backoffice-Karten, Mails und Gedanken, damit
 * später nur noch die Anmeldung dazukommt.
 *
 * Wer nichts gesetzt hat, bekommt den Standard: Backoffice-Karten liegen beim
 * Backoffice, Aufgaben bei der Geschäftsführung (sie stammen aus der Zeit, in
 * der Timo allein an der Liste gearbeitet hat).
 */

export type Rolle = "gf" | "backoffice";
/** Gleiche Werte wie die Rolle: wer sich kümmert. */
export type Zustaendig = Rolle;

export const ROLLEN: Record<Rolle, { titel: string; kurz: string }> = {
  gf: { titel: "Geschäftsführung", kurz: "GF" },
  backoffice: { titel: "Backoffice", kurz: "Backoffice" },
};

export const ROLLEN_REIHENFOLGE: Rolle[] = ["gf", "backoffice"];

/** Gelesener Wert aus dem Speicher; alles Unbekannte wird zur Geschäftsführung. */
export function rolleLesen(roh: string | null | undefined): Rolle {
  return roh === "backoffice" ? "backoffice" : "gf";
}

export type Cockpitreiter = "alltag" | "persoenlich" | "backoffice";

export const REITER: Record<Cockpitreiter, string> = {
  alltag: "Alltag",
  persoenlich: "Persönlich · Visionboard",
  backoffice: "Backoffice",
};

/** Welche Reiter eine Rolle sieht. Das Backoffice sieht „Persönlich“ nie. */
export function reiterFuer(rolle: Rolle): Cockpitreiter[] {
  return rolle === "gf" ? ["alltag", "persoenlich"] : ["backoffice"];
}

/** Der gewünschte Reiter, falls die Rolle ihn sehen darf — sonst ihr erster. */
export function reiterWaehlen(rolle: Rolle, gewuenscht: string | null | undefined): Cockpitreiter {
  const erlaubt = reiterFuer(rolle);
  return erlaubt.find((r) => r === gewuenscht) ?? erlaubt[0];
}

export function zustaendigAufgabe(a: { zustaendig?: Zustaendig | null }): Zustaendig {
  return a.zustaendig ?? "gf";
}

export function zustaendigKarte(k: { zustaendig?: Zustaendig | null }): Zustaendig {
  return k.zustaendig ?? "backoffice";
}

/** Begrüßung nach Tageszeit. */
export function gruss(jetzt: Date = new Date()): string {
  const h = jetzt.getHours();
  if (h < 11) return "Guten Morgen";
  if (h < 18) return "Hallo";
  return "Guten Abend";
}
