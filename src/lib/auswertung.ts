/**
 * Auswertung (SAMMLUNG 3): alles aus der Pipeline-Historie, nichts von Hand.
 *
 * Grundlage sind die Stufenwechsel im Verlauf (`art: "status"`, seit Block M
 * mit `stufe`; ältere Einträge werden aus dem Text gelesen) und der
 * Ankauf-Eingang. Eine übersprungene Stufe zählt mit: wer direkt aufs Angebot
 * springt, war auch besichtigt.
 */
import type { Angebotseingang } from "./eingang";
import { nachkalkulation } from "./projektabschluss";
import type { EtwVorgaben } from "./kalkulationEtw";
import { STUFEN, STUFEN_REIHENFOLGE, istAktiv, type Ankaufsstufe, type Objekt } from "./objekte";

const TAG = 86_400_000;

/* ------------------------------------------------------------------ */
/* Zeitraum                                                             */
/* ------------------------------------------------------------------ */

export type Zeitraumart = "woche" | "monat" | "quartal" | "jahr" | "frei";
export interface Zeitraum {
  von: string; // ISO-Datum, eingeschlossen
  bis: string; // ISO-Datum, eingeschlossen
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Laufender Zeitraum, in dem `heute` liegt (Woche ab Montag). */
export function zeitraumFuer(art: Exclude<Zeitraumart, "frei">, heute: Date): Zeitraum {
  const j = heute.getUTCFullYear();
  const m = heute.getUTCMonth();
  if (art === "jahr") return { von: `${j}-01-01`, bis: `${j}-12-31` };
  if (art === "quartal") {
    const q = Math.floor(m / 3) * 3;
    return { von: iso(new Date(Date.UTC(j, q, 1))), bis: iso(new Date(Date.UTC(j, q + 3, 0))) };
  }
  if (art === "monat")
    return { von: iso(new Date(Date.UTC(j, m, 1))), bis: iso(new Date(Date.UTC(j, m + 1, 0))) };
  const tag = (heute.getUTCDay() + 6) % 7; // Montag = 0
  const montag = new Date(Date.UTC(j, m, heute.getUTCDate() - tag));
  return { von: iso(montag), bis: iso(new Date(montag.getTime() + 6 * TAG)) };
}

export function vorjahr(z: Zeitraum): Zeitraum {
  const minus = (s: string) => `${+s.slice(0, 4) - 1}${s.slice(4)}`.replace("-02-29", "-02-28");
  return { von: minus(z.von), bis: minus(z.bis) };
}

export function tageIm(z: Zeitraum): number {
  return Math.round((Date.parse(z.bis) - Date.parse(z.von)) / TAG) + 1;
}

const imZeitraum = (zeitpunkt: string | null | undefined, z: Zeitraum) =>
  !!zeitpunkt && zeitpunkt.slice(0, 10) >= z.von && zeitpunkt.slice(0, 10) <= z.bis;

/* ------------------------------------------------------------------ */
/* Stufenwechsel lesen                                                  */
/* ------------------------------------------------------------------ */

/** Ältere Texte kannten andere Namen für dieselben Stufen. */
const ALTE_NAMEN: Record<string, Ankaufsstufe> = {
  kontakt: "unterlagen",
  pruefung: "qualifiziert",
  verhandlung: "angebot",
  angekauft: "angekauft",
  gekauft: "angekauft",
};

const normal = (t: string) =>
  t.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/\u200b/g, "");

function stufeAusText(text: string): Ankaufsstufe | null {
  const n = normal(text);
  const m = n.match(/^stufe auf (.+?) gesetzt/);
  const name = m ? m[1] : n.match(/^(angekauft|gekauft)\b/)?.[1];
  if (!name) return null;
  const treffer = STUFEN_REIHENFOLGE.find((s) => normal(STUFEN[s].titel) === name);
  return treffer ?? ALTE_NAMEN[name] ?? null;
}

export interface Wechsel {
  stufe: Ankaufsstufe;
  am: string;
}

/** Alle Stufenwechsel eines Objekts, ältester zuerst — „Neu“ mit dem Anlagetag. */
export function stufenwechsel(o: Objekt): Wechsel[] {
  const liste: Wechsel[] = [{ stufe: "neu", am: o.angelegtAm }];
  for (const v of o.verlauf) {
    if (v.art !== "status") continue;
    const s = v.stufe ?? stufeAusText(v.text);
    if (s) liste.push({ stufe: s, am: v.zeitpunkt });
  }
  if (o.angekauftAm && !liste.some((w) => w.stufe === "angekauft"))
    liste.push({ stufe: "angekauft", am: o.angekauftAm });
  return liste.sort((a, b) => a.am.localeCompare(b.am));
}

/** Trichterstufen (ohne Eingang). */
export const TRICHTER: Ankaufsstufe[] = ["neu", "besichtigt", "angebot", "angekauft"];
const rang = (s: Ankaufsstufe) => STUFEN_REIHENFOLGE.indexOf(s);

/** Wann hat das Objekt eine Stufe (oder eine spätere im Ablauf) zum ersten Mal erreicht? */
export function erreichtAm(o: Objekt, stufe: Ankaufsstufe): string | null {
  const ziel = rang(stufe);
  return stufenwechsel(o).find((w) => rang(w.stufe) >= ziel)?.am ?? null;
}

/* ------------------------------------------------------------------ */
/* 27. Trichter                                                         */
/* ------------------------------------------------------------------ */

export interface Trichterstufe {
  id: "eingang" | Ankaufsstufe;
  titel: string;
  anzahl: number;
  /** Quote zur Vorstufe in Prozent. */
  quote: number | null;
  vorjahr: number;
}

export function trichter(
  objekte: Objekt[],
  eingaenge: Angebotseingang[],
  z: Zeitraum,
): Trichterstufe[] {
  const zaehle = (zr: Zeitraum) => [
    eingaenge.filter((e) => imZeitraum(e.eingangAm, zr)).length,
    ...TRICHTER.map((s) => objekte.filter((o) => imZeitraum(erreichtAm(o, s), zr)).length),
  ];
  const jetzt = zaehle(z);
  const vor = zaehle(vorjahr(z));
  const titel = [
    "Eingang",
    ...TRICHTER.map((s) =>
      s === "besichtigt" ? "Besichtigt" : s === "angebot" ? "Angebot" : STUFEN[s].titel,
    ),
  ];
  return jetzt.map((anzahl, i) => ({
    id: i === 0 ? "eingang" : TRICHTER[i - 1],
    titel: titel[i],
    anzahl,
    quote: i > 0 && jetzt[i - 1] > 0 ? (anzahl / jetzt[i - 1]) * 100 : null,
    vorjahr: vor[i],
  }));
}

/* ------------------------------------------------------------------ */
/* 28. Ziele                                                            */
/* ------------------------------------------------------------------ */

export interface Ziele {
  leadsWoche: number | null;
  besichtigungenMonat: number | null;
  angeboteMonat: number | null;
  ankaeufeJahr: number | null;
  jahresgewinn: number | null;
  /** Ab so vielen Tagen ohne Stufenwechsel gilt ein Lead als hängend. */
  haengtNachTagen: number;
}

export const STANDARD_ZIELE: Ziele = {
  leadsWoche: null,
  besichtigungenMonat: null,
  angeboteMonat: null,
  ankaeufeJahr: null,
  jahresgewinn: 200_000,
  haengtNachTagen: 21,
};

/** Ein Ziel je Woche/Monat/Jahr auf den gewählten Zeitraum umgerechnet. */
export function zielImZeitraum(ziel: number, je: "woche" | "monat" | "jahr", z: Zeitraum): number {
  const tage = tageIm(z);
  const proTag = je === "woche" ? ziel / 7 : je === "monat" ? (ziel * 12) / 365 : ziel / 365;
  return proTag * tage;
}

/** Gewinn Ist aus der Nachkalkulation der Projekte, deren letzter Verkauf im Zeitraum liegt. */
export function gewinnImZeitraum(
  objekte: Objekt[],
  vorgaben: EtwVorgaben,
  z: Zeitraum,
): { summe: number; jeGesellschaft: Record<string, number>; objekte: number } {
  const jeGesellschaft: Record<string, number> = {};
  let summe = 0;
  let anzahl = 0;
  for (const o of objekte) {
    const verkauft = o.einheiten
      .map((e) => e.verkauftAm)
      .filter((x): x is string => Boolean(x))
      .sort();
    if (!verkauft.length || !imZeitraum(verkauft.at(-1), z)) continue;
    const g = nachkalkulation(o, vorgaben).zeilen.find((x) => x.id === "gewinn")?.ist;
    if (g === null || g === undefined) continue;
    summe += g;
    anzahl += 1;
    const ges = o.gesellschaft ?? "ohne Gesellschaft";
    jeGesellschaft[ges] = (jeGesellschaft[ges] ?? 0) + g;
  }
  return { summe, jeGesellschaft, objekte: anzahl };
}

/* ------------------------------------------------------------------ */
/* 29. Quellen, Durchlaufzeit, hängende Leads, Notartermine             */
/* ------------------------------------------------------------------ */

/** Quelle eines Objekts: der Makler (Kontakt), sonst das Quellenfeld — ohne Kanal-Vorsatz. */
export function quelleVon(o: Objekt): string {
  const makler = o.kontakte.find((k) => k.rolle === "makler" && k.name.trim());
  if (makler) return makler.name.split(",")[0].trim();
  const q = o.quelle?.split("·").pop()?.trim();
  return q || "ohne Quelle";
}

export interface Quellenzeile {
  quelle: string;
  neu: number;
  besichtigt: number;
  angebot: number;
  gekauft: number;
}

/** Objekte, die im Zeitraum neu wurden — und wie weit sie (bis heute) gekommen sind. */
export function quellen(objekte: Objekt[], z: Zeitraum): Quellenzeile[] {
  const tabelle = new Map<string, Quellenzeile>();
  for (const o of objekte) {
    if (!imZeitraum(o.angelegtAm, z)) continue;
    const q = quelleVon(o);
    const zeile = tabelle.get(q) ?? { quelle: q, neu: 0, besichtigt: 0, angebot: 0, gekauft: 0 };
    zeile.neu += 1;
    if (erreichtAm(o, "besichtigt")) zeile.besichtigt += 1;
    if (erreichtAm(o, "angebot")) zeile.angebot += 1;
    if (erreichtAm(o, "angekauft")) zeile.gekauft += 1;
    tabelle.set(q, zeile);
  }
  return [...tabelle.values()].sort(
    (a, b) => b.gekauft - a.gekauft || b.angebot - a.angebot || b.neu - a.neu,
  );
}

/** Ø Tage zwischen den Trichterstufen und von Neu bis Angebot. */
export function durchlaufzeiten(
  objekte: Objekt[],
): { von: string; bis: string; tage: number | null; anzahl: number }[] {
  const paare: [Ankaufsstufe, Ankaufsstufe][] = [
    ["neu", "besichtigt"],
    ["besichtigt", "angebot"],
    ["angebot", "angekauft"],
    ["neu", "angebot"],
  ];
  return paare.map(([a, b]) => {
    const werte = objekte
      .map((o) => {
        const x = erreichtAm(o, a);
        const y = erreichtAm(o, b);
        return x && y ? (Date.parse(y) - Date.parse(x)) / TAG : null;
      })
      .filter((v): v is number => v !== null && v >= 0);
    return {
      von: STUFEN[a].titel,
      bis: STUFEN[b].titel,
      tage: werte.length ? Math.round(werte.reduce((s, v) => s + v, 0) / werte.length) : null,
      anzahl: werte.length,
    };
  });
}

/** Aktive Objekte ohne Stufenwechsel seit `tage` Tagen. */
export function haengendeLeads(
  objekte: Objekt[],
  tage: number,
  heute = new Date(),
): { objekt: Objekt; seitTagen: number }[] {
  return objekte
    .filter((o) => istAktiv(o.stufe))
    .map((o) => {
      const letzter = stufenwechsel(o).at(-1)!.am;
      return { objekt: o, seitTagen: Math.floor((heute.getTime() - Date.parse(letzter)) / TAG) };
    })
    .filter((x) => x.seitTagen > tage)
    .sort((a, b) => b.seitTagen - a.seitTagen);
}

export interface Notartermin {
  am: string;
  titel: string;
  objekt: Objekt | null;
}

/** Notartermine im Zeitraum: Termine mit „Notar“ und Beurkundungen der Verkäufe. */
export function notartermine(
  objekte: Objekt[],
  aufgaben: {
    titel: string;
    faelligAm: string | null;
    objektId: string | null;
    erledigtAm: string | null;
  }[],
  z: Zeitraum,
): Notartermin[] {
  const ausAufgaben = aufgaben
    .filter((a) => /notar/i.test(a.titel) && imZeitraum(a.faelligAm, z))
    .map((a) => ({
      am: a.faelligAm!,
      titel: a.titel,
      objekt: objekte.find((o) => o.id === a.objektId) ?? null,
    }));
  const beurkundungen = objekte.flatMap((o) =>
    o.einheiten
      .filter((e) => imZeitraum(e.verkauftAm, z))
      .map((e) => ({
        am: e.verkauftAm!,
        titel: `Beurkundung ${e.bezeichnung}${e.kaeufer ? ` · ${e.kaeufer}` : ""}`,
        objekt: o,
      })),
  );
  return [...ausAufgaben, ...beurkundungen].sort((a, b) => a.am.localeCompare(b.am));
}
