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

import { gewinnImZeitraum, trichter, zeitraumFuer, type Ziele } from "./auswertung";
import type { Angebotseingang } from "./eingang";
import type { EtwVorgaben } from "./kalkulationEtw";
import type { Objekt } from "./objekte";

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

/* ------------------------------------------------------------------ */
/* Datum                                                                */
/* ------------------------------------------------------------------ */

const TAG = 86_400_000;
const zwei = (n: number) => String(n).padStart(2, "0");

/** Lokales Kalenderdatum „JJJJ-MM-TT“ — nicht UTC, sonst springt der Tag um Mitternacht. */
export function tagIso(d: Date): string {
  return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;
}

/** Lokale Mitternacht des Tages. */
export function tagesbeginn(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** „HH:MM“ an einem lokalen Tag; null bei Unsinn. */
export function uhrzeitAm(tag: Date, hhmm: string): Date | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m || +m[1] > 24 || +m[2] > 59) return null;
  return new Date(tag.getFullYear(), tag.getMonth(), tag.getDate(), +m[1], +m[2]);
}

export function uhrzeitText(d: Date): string {
  return `${zwei(d.getHours())}:${zwei(d.getMinutes())}`;
}

/** ISO-Woche nach DIN 1355. */
export function kalenderwoche(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const wt = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - wt + 3);
  const erster = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  return (
    1 +
    Math.round(((t.getTime() - erster.getTime()) / TAG - 3 + ((erster.getUTCDay() + 6) % 7)) / 7)
  );
}

export function montagVon(d: Date): Date {
  const b = tagesbeginn(d);
  return new Date(b.getFullYear(), b.getMonth(), b.getDate() - ((b.getDay() + 6) % 7));
}

/* ------------------------------------------------------------------ */
/* Gedanken, Fragen, Sprint-Punkte                                      */
/* ------------------------------------------------------------------ */

export type Gedankenziel = "aufgabe" | "backoffice" | "idee" | "verworfen";

export const GEDANKENZIELE: Record<Gedankenziel, string> = {
  aufgabe: "→ Aufgabe (GF)",
  backoffice: "→ Backoffice",
  idee: "→ Ideen",
  verworfen: "verworfen",
};

export interface Gedanke {
  id: string;
  text: string;
  angelegtAm: string;
  /** Null heißt: unsortiert. */
  ziel: Gedankenziel | null;
  sortiertAm: string | null;
  /** Aufgabe bzw. Backoffice-Karte, die daraus wurde. */
  verweisId: string | null;
  zustaendig: Zustaendig;
  /** Phase 2: vom Handy (Teilen, Sprachnotiz) oder per Mail „Gedanke:“. */
  quelle: "hand" | "handy" | "mail";
  externeId: string | null;
  /** Phase 2: Vorschlag der KI, wohin der Gedanke gehört. */
  kiVorschlag: Gedankenziel | null;
}

/** Was im Eingang steht: alles Unsortierte, dazu was heute sortiert wurde. */
export function sichtbareGedanken(liste: Gedanke[], heute: Date = new Date()): Gedanke[] {
  const t = tagIso(heute);
  return liste.filter((g) => !g.ziel || (g.sortiertAm && tagIso(new Date(g.sortiertAm)) === t));
}

/** Rückfrage aus der Backoffice-Rolle an die Geschäftsführung. */
export interface Frage {
  id: string;
  text: string;
  gestelltAm: string;
  von: Zustaendig;
  /** Worum es geht: eine Backoffice-Karte, eine Mail oder frei. */
  bezug: { art: "karte" | "mail" | "frei"; id: string | null; titel: string } | null;
  objektId: string | null;
  /** Die zwei Antwortknöpfe, z. B. „Ja“ / „Nein“ oder „Freigeben“ / „Rückfrage“. */
  antworten: [string, string];
  antwort: string | null;
  beantwortetAm: string | null;
}

export const ANTWORTEN_STANDARD: [string, string] = ["Ja", "Nein"];

export interface Sprintpunkt {
  id: string;
  bereich: string;
  titel: string;
  /** Lokal „JJJJ-MM-TTTHH:MM“. */
  von: string;
  bis: string;
}

export const STANDARD_BEREICHE = [
  "Ankauf",
  "Projekte",
  "Finanzierung",
  "Backoffice",
  "Notar / Recht",
  "Plattform",
];

/* ------------------------------------------------------------------ */
/* Sprint-Zeitleiste                                                    */
/* ------------------------------------------------------------------ */

export type Sprintansicht = "tag" | "woche" | "monat";

export interface Sprintfenster {
  von: number;
  bis: number;
  titel: string;
  /** Beschriftung der Achse mit Lage 0…1. */
  achse: { text: string; lage: number }[];
}

/** Tagesansicht von 7 bis 20 Uhr — davor und danach wird abgeschnitten. */
export const TAG_VON = 7;
export const TAG_BIS = 20;

export function sprintfenster(ansicht: Sprintansicht, tag: Date): Sprintfenster {
  if (ansicht === "tag") {
    const b = tagesbeginn(tag);
    const von = new Date(b.getFullYear(), b.getMonth(), b.getDate(), TAG_VON).getTime();
    const bis = new Date(b.getFullYear(), b.getMonth(), b.getDate(), TAG_BIS).getTime();
    const achse = [];
    for (let h = TAG_VON; h <= TAG_BIS; h++)
      achse.push({ text: zwei(h), lage: (h - TAG_VON) / (TAG_BIS - TAG_VON) });
    const titel = b.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
    return { von, bis, titel, achse };
  }
  if (ansicht === "woche") {
    const mo = montagVon(tag);
    const von = mo.getTime();
    const bis = new Date(mo.getFullYear(), mo.getMonth(), mo.getDate() + 7).getTime();
    const achse = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mo.getFullYear(), mo.getMonth(), mo.getDate() + i);
      return {
        text: `${d.toLocaleDateString("de-DE", { weekday: "short" }).replace(".", "")} ${d.getDate()}.`,
        lage: (i + 0.5) / 7,
      };
    });
    return { von, bis, titel: `KW ${kalenderwoche(mo)}`, achse };
  }
  const erster = new Date(tag.getFullYear(), tag.getMonth(), 1);
  const naechster = new Date(tag.getFullYear(), tag.getMonth() + 1, 1);
  const von = erster.getTime();
  const bis = naechster.getTime();
  const achse: { text: string; lage: number }[] = [];
  // Je Woche eine Marke: am 1. und an jedem Montag danach.
  for (
    let d = new Date(erster);
    d < naechster;
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
  ) {
    // Der 1. nur, wenn bis zum nächsten Montag Platz für die Beschriftung bleibt.
    const ersterMitPlatz = d.getTime() === von && [1, 2, 3, 4].includes(d.getDay());
    if (ersterMitPlatz || d.getDay() === 1)
      achse.push({ text: `KW ${kalenderwoche(d)}`, lage: (d.getTime() - von) / (bis - von) });
  }
  return {
    von,
    bis,
    titel: erster.toLocaleDateString("de-DE", { month: "long", year: "numeric" }),
    achse,
  };
}

export type Sprintziel =
  { art: "aufgabe"; id: string; objektId: string | null } | { art: "sprint"; id: string };

export interface Sprinteintrag {
  bereich: string;
  titel: string;
  start: number;
  ende: number;
  /** Termin ohne Uhrzeit: in der Tagesansicht ausgeblendet. */
  ganztag: boolean;
  farbe: "dunkel" | "gold" | "gruen" | "blau" | "grau";
  ziel: Sprintziel;
}

export interface Sprintbalken extends Sprinteintrag {
  links: number;
  breite: number;
  unter: string;
  /** Spur in der Zeile (0 oben), wenn sich Balken überschneiden. */
  spur: number;
}

const terminart = (art: string) => art === "termin" || art === "besichtigung";

interface AufgabeFuerSprint {
  id: string;
  titel: string;
  art: string;
  objektId: string | null;
  faelligAm: string | null;
  erledigtAm: string | null;
  zeitblock?: Zeitblock | null;
  bereich?: string | null;
  zustaendig?: Zustaendig | null;
}

export interface Zeitblock {
  /** „HH:MM“ */
  von: string;
  bis: string;
}

/** Bereich einer Aufgabe, wenn keiner gesetzt ist: aus Objekt, Art und Zuständigkeit. */
export function bereichFuer(
  a: AufgabeFuerSprint,
  objektStufe: (id: string) => string | null,
): string {
  if (a.bereich) return a.bereich;
  if (a.zustaendig === "backoffice") return "Backoffice";
  const stufe = a.objektId ? objektStufe(a.objektId) : null;
  if (stufe === "angekauft") return "Projekte";
  if (stufe || a.art === "besichtigung") return "Ankauf";
  return "Sonstiges";
}

const FARBE_JE_BEREICH: Record<string, Sprinteintrag["farbe"]> = {
  Ankauf: "gold",
  Projekte: "dunkel",
  Finanzierung: "blau",
  Backoffice: "gruen",
};

export function farbeFuer(bereich: string): Sprinteintrag["farbe"] {
  return FARBE_JE_BEREICH[bereich] ?? "grau";
}

/** Termine, Aufgaben mit Zeitblock und eigene Sprint-Punkte als Einträge. */
export function sprintEintraege(
  aufgaben: AufgabeFuerSprint[],
  punkte: Sprintpunkt[],
  objektStufe: (id: string) => string | null,
): Sprinteintrag[] {
  const liste: Sprinteintrag[] = [];
  for (const a of aufgaben) {
    if (a.erledigtAm || !a.faelligAm) continue;
    if (!a.zeitblock && !terminart(a.art)) continue;
    const tag = tagesbeginn(new Date(a.faelligAm));
    if (Number.isNaN(tag.getTime())) continue;
    const bereich = bereichFuer(a, objektStufe);
    const ziel: Sprintziel = { art: "aufgabe", id: a.id, objektId: a.objektId };
    const s = a.zeitblock ? uhrzeitAm(tag, a.zeitblock.von) : null;
    const e = a.zeitblock ? uhrzeitAm(tag, a.zeitblock.bis) : null;
    if (s && e && e > s) {
      liste.push({
        bereich,
        titel: a.titel,
        start: +s,
        ende: +e,
        ganztag: false,
        farbe: farbeFuer(bereich),
        ziel,
      });
    } else {
      liste.push({
        bereich,
        titel: a.titel,
        start: +tag,
        ende: +tag + TAG,
        ganztag: true,
        farbe: farbeFuer(bereich),
        ziel,
      });
    }
  }
  for (const p of punkte) {
    const s = new Date(p.von).getTime();
    const e = new Date(p.bis).getTime();
    if (!(e > s)) continue;
    liste.push({
      bereich: p.bereich,
      titel: p.titel,
      start: s,
      ende: e,
      ganztag: false,
      farbe: farbeFuer(p.bereich),
      ziel: { art: "sprint", id: p.id },
    });
  }
  return liste;
}

function unterText(e: Sprinteintrag, ansicht: Sprintansicht): string {
  const s = new Date(e.start);
  const en = new Date(e.ende);
  if (ansicht === "tag") return `${uhrzeitText(s)} – ${uhrzeitText(en)}`;
  const tagText = (d: Date) => d.toLocaleDateString("de-DE", { day: "numeric", month: "numeric" });
  const letzter = new Date(e.ende - 1);
  const zeit = e.ganztag ? "" : ` ${uhrzeitText(s)}`;
  return tagIso(s) === tagIso(letzter)
    ? `${tagText(s)}${zeit}`
    : `${tagText(s)} – ${tagText(letzter)}`;
}

/** Einträge im Fenster, auf das Fenster geschnitten, in Zeilen je Bereich. */
export function sprintZeilen(
  eintraege: Sprinteintrag[],
  fenster: Sprintfenster,
  ansicht: Sprintansicht,
  bereiche: string[],
): { bereich: string; spuren: number; balken: Sprintbalken[] }[] {
  const spanne = fenster.bis - fenster.von;
  // In Woche und Monat zählt der Tag, nicht die Stunde: ganze Tage belegen.
  const aufTage = (e: Sprinteintrag): Sprinteintrag => {
    if (ansicht === "tag") return e;
    const a = tagesbeginn(new Date(e.start));
    const z = tagesbeginn(new Date(e.ende - 1));
    return { ...e, start: +a, ende: +new Date(z.getFullYear(), z.getMonth(), z.getDate() + 1) };
  };
  const sichtbar = eintraege.filter(
    (e) => e.ende > fenster.von && e.start < fenster.bis && !(ansicht === "tag" && e.ganztag),
  );
  const namen = [...bereiche];
  for (const e of sichtbar) if (!namen.includes(e.bereich)) namen.push(e.bereich);
  return namen.map((bereich) => {
    const enden: number[] = [];
    const balken = sichtbar
      .filter((e) => e.bereich === bereich)
      .sort((a, b) => a.start - b.start)
      .map((roh) => {
        const e = aufTage(roh);
        const s = Math.max(e.start, fenster.von);
        const en = Math.min(e.ende, fenster.bis);
        // Erste Spur, die bis zum Beginn wieder frei ist.
        let spur = enden.findIndex((x) => x <= s);
        if (spur === -1) spur = enden.length;
        enden[spur] = en;
        return {
          ...roh,
          links: (s - fenster.von) / spanne,
          breite: (en - s) / spanne,
          unter: unterText(roh, ansicht),
          spur,
        };
      });
    return { bereich, spuren: Math.max(1, enden.length), balken };
  });
}

/** Lage der Jetzt-Linie (0…1) — nur, wenn jetzt im Fenster liegt. */
export function jetztLage(fenster: Sprintfenster, jetzt: Date = new Date()): number | null {
  const t = jetzt.getTime();
  if (t < fenster.von || t > fenster.bis) return null;
  return (t - fenster.von) / (fenster.bis - fenster.von);
}

/* ------------------------------------------------------------------ */
/* Heute auf dem Tisch                                                  */
/* ------------------------------------------------------------------ */

export type Tischwahl = "ich" | "backoffice" | "spaeter";

/** Was an einer Zeile entschieden wurde, und an welchem Tag. */
export interface Tischvermerk {
  wahl: Tischwahl;
  am: string;
}

/**
 * Gilt der Vermerk noch? „später“ gilt nur am Tag selbst — morgen liegt die
 * Zeile wieder auf dem Tisch. „Backoffice“ und „mache ich“ bleiben.
 */
export function vermerkGilt(
  v: Tischvermerk | undefined,
  heute: Date = new Date(),
): Tischwahl | null {
  if (!v) return null;
  if (v.wahl === "spaeter" && v.am !== tagIso(heute)) return null;
  return v.wahl;
}

/** Abgegebene oder verschobene Zeilen bleiben am selben Tag sichtbar, danach nicht mehr. */
export function zeileSichtbar(v: Tischvermerk | undefined, heute: Date = new Date()): boolean {
  const wahl = vermerkGilt(v, heute);
  if (wahl === "backoffice" || wahl === "spaeter") return v!.am === tagIso(heute);
  return true;
}

/* ------------------------------------------------------------------ */
/* Google Kalender                                                      */
/* ------------------------------------------------------------------ */

const googleZeit = (d: Date) =>
  `${d.getFullYear()}${zwei(d.getMonth() + 1)}${zwei(d.getDate())}T${zwei(d.getHours())}${zwei(d.getMinutes())}00`;

/**
 * Link „Termin anlegen“ in Google Kalender, vorausgefüllt. Bis Phase 2 der
 * Weg in den echten Kalender — gespeichert wird zusätzlich in der Plattform.
 */
export function googleTerminAdresse(t: {
  titel: string;
  start: Date;
  ende: Date;
  details?: string | null;
  ort?: string | null;
}): string {
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: t.titel,
    dates: `${googleZeit(t.start)}/${googleZeit(t.ende)}`,
    ctz: "Europe/Berlin",
  });
  if (t.details) q.set("details", t.details);
  if (t.ort) q.set("location", t.ort);
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

/* ------------------------------------------------------------------ */
/* Kennzahlen                                                           */
/* ------------------------------------------------------------------ */

export interface Kennzahl {
  titel: string;
  ist: number;
  /** Null: kein Ziel in den Einstellungen — dann nur der Ist-Wert. */
  ziel: number | null;
  geld: boolean;
  farbe: "gold" | "gruen";
}

/**
 * Die Leiste oben im Alltag: dieselben Zahlen wie in der Auswertung, je im
 * laufenden Zeitraum (Woche ab Montag, Monat, Jahr).
 */
export function kennzahlen(
  objekte: Objekt[],
  eingaenge: Angebotseingang[],
  vorgaben: EtwVorgaben,
  ziele: Ziele,
  heute: Date = new Date(),
): Kennzahl[] {
  const anzahl = (art: "woche" | "monat" | "jahr", stufe: string) =>
    trichter(objekte, eingaenge, zeitraumFuer(art, heute)).find((t) => t.id === stufe)?.anzahl ?? 0;
  const jahr = heute.getUTCFullYear();
  const monat = heute.toLocaleDateString("de-DE", { month: "short" });
  return [
    {
      titel: "Leads diese Woche",
      ist: anzahl("woche", "neu"),
      ziel: ziele.leadsWoche,
      geld: false,
      farbe: "gold",
    },
    {
      titel: `Besichtigungen ${monat}`,
      ist: anzahl("monat", "besichtigt"),
      ziel: ziele.besichtigungenMonat,
      geld: false,
      farbe: "gold",
    },
    {
      titel: `Angebote ${monat}`,
      ist: anzahl("monat", "angebot"),
      ziel: ziele.angeboteMonat,
      geld: false,
      farbe: "gold",
    },
    {
      titel: `Ankäufe ${jahr}`,
      ist: anzahl("jahr", "angekauft"),
      ziel: ziele.ankaeufeJahr,
      geld: false,
      farbe: "gruen",
    },
    {
      titel: `Gewinn ${jahr}`,
      ist: gewinnImZeitraum(objekte, vorgaben, zeitraumFuer("jahr", heute)).summe,
      ziel: ziele.jahresgewinn,
      geld: true,
      farbe: "gruen",
    },
  ];
}
