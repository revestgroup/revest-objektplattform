/**
 * Posteingang vorsortiert (Ausbau 4, P4).
 *
 * Bis Phase 2 werden Mails von Hand angelegt, der Vorschlag (Kategorie,
 * Objekt, Aktion, zuständig) wird von Hand gesetzt. Phase 2: Gmail der drei
 * Konten, Vorschlag per KI — die KI schlägt nur vor, sendet nie, löscht nie.
 */
import type { Zustaendig } from "./cockpit";

export const POSTFAECHER = ["ankauf@", "info@", "timo.birk@"] as const;
export type Postfach = (typeof POSTFAECHER)[number];

export const MAILKATEGORIEN = [
  "Angebot / Lead",
  "Rechnung / Beleg",
  "Bank / Behörde / Notar",
  "Hausverwaltung / Mieter",
  "Handwerker / Sanierung",
  "Termin",
  "Käufer / Vertrieb",
  "Newsletter / Werbung",
  "Privat",
] as const;

export type Mailaktion = "eingang" | "qonto" | "karte" | "aufgabe" | "antwort" | "ablage";

export const MAILAKTIONEN: Record<Mailaktion, string> = {
  eingang: "→ Ankauf-Eingang",
  qonto: "→ Qonto",
  karte: "→ Backoffice-Karte",
  aufgabe: "→ Aufgabe mit Frist",
  antwort: "→ Antwort-Entwurf",
  ablage: "→ Ablage / Archiv",
};

export interface Mailvorschlag {
  kategorie: string;
  objektId: string | null;
  aktion: Mailaktion;
  zustaendig: Zustaendig;
  /** Nur bei „Aufgabe mit Frist“: JJJJ-MM-TT. */
  frist: string | null;
}

export interface Posteingangsmail {
  id: string;
  postfach: Postfach;
  absender: string;
  absenderEmail: string | null;
  betreff: string;
  text: string;
  eingangAm: string;
  vorschlag: Mailvorschlag;
  status: "offen" | "uebernommen";
  erledigtAm: string | null;
  /** Was daraus wurde: Karte, Aufgabe, Eingang. */
  verweis: string | null;
  /** Phase 2: Gmail. */
  quelle: "hand" | "gmail";
  externeId: string | null;
}

/** Erster Vorschlag aus dem Postfach — mehr weiß die Plattform bis Phase 2 nicht. */
export function vorschlagFuer(postfach: Postfach, objektId: string | null = null): Mailvorschlag {
  if (postfach === "ankauf@")
    return {
      kategorie: "Angebot / Lead",
      objektId,
      aktion: "eingang",
      zustaendig: "backoffice",
      frist: null,
    };
  if (postfach === "timo.birk@")
    return {
      kategorie: "Bank / Behörde / Notar",
      objektId,
      aktion: "aufgabe",
      zustaendig: "gf",
      frist: null,
    };
  return {
    kategorie: "Rechnung / Beleg",
    objektId,
    aktion: "karte",
    zustaendig: "backoffice",
    frist: null,
  };
}

/** Name und Adresse aus „Name <mail@x.de>“ oder nur einer Adresse. */
export function absenderLesen(roh: string): { name: string; email: string | null } {
  const t = roh.trim();
  const m = /^(.*?)\s*<([^>]+@[^>]+)>$/.exec(t);
  if (m) return { name: m[1].replace(/^"|"$/g, "").trim() || m[2], email: m[2].trim() };
  if (/^\S+@\S+\.\S+$/.test(t)) return { name: t, email: t };
  return { name: t, email: null };
}

/** Gmail-Entwurf als Antwort — öffnet nur, sendet nichts. */
export function antwortAdresse(m: Posteingangsmail): string {
  const q = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: m.absenderEmail ?? "",
    su: /^re:/i.test(m.betreff) ? m.betreff : `Re: ${m.betreff}`,
  });
  return `https://mail.google.com/mail/?${q.toString()}`;
}
