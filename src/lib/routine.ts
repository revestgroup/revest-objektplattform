/**
 * Backoffice-Routine und Zeit (Ausbau 4, P4).
 *
 * Tagesroutine als Checkliste mit Minuten, täglich frisch; Wochenroutine an
 * einem festen Wochentag. Abgehakt wird ins Protokoll (`Routinehaken`) — das
 * ist zugleich die Zeiterfassung: Minuten je erledigtem Punkt, dazu ein
 * Schätzwert je erledigter Backoffice-Karte und übernommener Mail. Daraus
 * Stunden je Woche und Kategorie und eine Hochrechnung pro Monat — Grundlage
 * für Stellenumfang und Stellenbeschreibung.
 */
import { montagVon, tagIso } from "./cockpit";
import type { Backofficekarte, Kartenart } from "./backoffice";

export const ZEITKATEGORIEN = [
  "Posteingang & Mails",
  "Ankauf-Eingang",
  "Belege & Qonto",
  "Ablage & Drive",
  "Ummeldungen & Nachberechnung",
  "Fristen & Aufgaben",
] as const;

export interface Routinepunkt {
  id: string;
  titel: string;
  hinweis: string;
  minuten: number;
  kategorie: string;
  /** Nur Wochenroutine: 1 = Montag … 5 = Freitag. */
  wochentag?: number;
}

export interface Routinen {
  tag: Routinepunkt[];
  woche: Routinepunkt[];
}

/** Abgehakter Punkt — Minuten und Kategorie werden beim Haken festgeschrieben. */
export interface Routinehaken {
  punktId: string;
  datum: string;
  minuten: number;
  kategorie: string;
}

export const STANDARD_ROUTINEN: Routinen = {
  tag: [
    {
      id: "r-postfaecher",
      titel: "Postfächer vorsortieren",
      hinweis: "ankauf@ · info@ · timo.birk@",
      minuten: 15,
      kategorie: "Posteingang & Mails",
    },
    {
      id: "r-eingang",
      titel: "Ankauf-Eingang vorsichten",
      hinweis: "Profil-Treffer markieren, Rest aussortieren",
      minuten: 20,
      kategorie: "Ankauf-Eingang",
    },
    {
      id: "r-belege",
      titel: "Belege an Qonto, Bestätigungen prüfen",
      hinweis: "Archiv: nichts länger als 2 Tage offen",
      minuten: 15,
      kategorie: "Belege & Qonto",
    },
    {
      id: "r-posteingang",
      titel: "Backoffice-Posteingang leeren",
      hinweis: "Scans, Briefe, To-dos",
      minuten: 30,
      kategorie: "Ablage & Drive",
    },
    {
      id: "r-ummeldungen",
      titel: "Ummeldungen und Abmeldungen prüfen",
      hinweis: "offene Bestätigungen nachfassen",
      minuten: 10,
      kategorie: "Ummeldungen & Nachberechnung",
    },
    {
      id: "r-nachberechnung",
      titel: "Nachberechnungen: Zahlungen prüfen",
      hinweis: "Erinnerung nach 14 Tagen",
      minuten: 10,
      kategorie: "Ummeldungen & Nachberechnung",
    },
    {
      id: "r-fristen",
      titel: "Wiedervorlagen und Fristen",
      hinweis: "Aufgaben mit Frist heute/morgen",
      minuten: 10,
      kategorie: "Fristen & Aufgaben",
    },
  ],
  woche: [
    {
      id: "w-qonto",
      titel: "Qonto-Abgleich und offene Bestätigungen",
      hinweis: "Belege ohne Bestätigung nachfassen",
      minuten: 120,
      kategorie: "Belege & Qonto",
      wochentag: 4,
    },
  ],
};

export const WOCHENTAGE = ["", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];

/** Heute abgehakt (Tagesroutine) bzw. in dieser Woche (Wochenroutine)? */
export function abgehakt(
  haken: Routinehaken[],
  punktId: string,
  art: "tag" | "woche",
  heute: Date = new Date(),
): Routinehaken | undefined {
  if (art === "tag") {
    const t = tagIso(heute);
    return haken.find((h) => h.punktId === punktId && h.datum === t);
  }
  const mo = tagIso(montagVon(heute));
  const so = tagIso(new Date(montagVon(heute).getTime() + 6 * 86_400_000));
  return haken.find((h) => h.punktId === punktId && h.datum >= mo && h.datum <= so);
}

/* ------------------------------------------------------------------ */
/* Zeit                                                                 */
/* ------------------------------------------------------------------ */

/** Schätzwert je erledigter Karte, nach Art. */
export const KARTENMINUTEN: Record<Kartenart, number> = {
  rechnung: 5,
  brief: 5,
  vertrag: 15,
  behoerde: 10,
  todo: 10,
  sonstiges: 5,
};

export const KARTENKATEGORIE: Record<Kartenart, string> = {
  rechnung: "Belege & Qonto",
  brief: "Ablage & Drive",
  vertrag: "Ablage & Drive",
  behoerde: "Ablage & Drive",
  todo: "Fristen & Aufgaben",
  sonstiges: "Ablage & Drive",
};

/** Schätzwert je übernommener Mail. */
export const MAILMINUTEN = 3;

/** Wann gilt eine Karte als erledigt? Archiv, sonst Weiterleitung, sonst Spalte „Erledigt“. */
export function karteErledigtAm(k: Backofficekarte): string | null {
  if (k.archiviertAm) return k.archiviertAm;
  if (k.uebergabe) return k.uebergabe.am;
  if (k.spalte === "erledigt") return k.verlauf.at(-1)?.zeitpunkt ?? k.eingangAm;
  return null;
}

export interface Zeitposten {
  datum: string;
  minuten: number;
  kategorie: string;
}

export function zeitposten(
  haken: Routinehaken[],
  karten: Backofficekarte[],
  mailsErledigt: string[],
): Zeitposten[] {
  const liste: Zeitposten[] = haken.map((h) => ({
    datum: h.datum,
    minuten: h.minuten,
    kategorie: h.kategorie,
  }));
  for (const k of karten) {
    const am = karteErledigtAm(k);
    if (!am) continue;
    liste.push({
      datum: tagIso(new Date(am)),
      minuten: KARTENMINUTEN[k.art],
      kategorie: KARTENKATEGORIE[k.art],
    });
  }
  for (const am of mailsErledigt)
    liste.push({
      datum: tagIso(new Date(am)),
      minuten: MAILMINUTEN,
      kategorie: "Posteingang & Mails",
    });
  return liste;
}

export interface Wochenzeit {
  /** Minuten je Kategorie in der Woche von `heute`. */
  jeKategorie: { kategorie: string; minuten: number }[];
  summe: number;
  /** Ø Stunden je Woche über die letzten vier Wochen mit Einträgen, × 52/12. */
  monatStunden: number;
  /** Wie viele Wochen in die Hochrechnung eingingen. */
  wochen: number;
}

export function wochenzeit(posten: Zeitposten[], heute: Date = new Date()): Wochenzeit {
  const mo = montagVon(heute);
  const woche = (n: number) => {
    const von = new Date(mo.getFullYear(), mo.getMonth(), mo.getDate() - 7 * n);
    const bis = new Date(von.getFullYear(), von.getMonth(), von.getDate() + 6);
    return { von: tagIso(von), bis: tagIso(bis) };
  };
  const inWoche = (p: Zeitposten, w: { von: string; bis: string }) =>
    p.datum >= w.von && p.datum <= w.bis;

  const diese = woche(0);
  const summen = new Map<string, number>();
  for (const p of posten.filter((x) => inWoche(x, diese)))
    summen.set(p.kategorie, (summen.get(p.kategorie) ?? 0) + p.minuten);
  const jeKategorie = [...summen.entries()]
    .map(([kategorie, minuten]) => ({ kategorie, minuten }))
    .sort((a, b) => b.minuten - a.minuten);
  const summe = jeKategorie.reduce((s, x) => s + x.minuten, 0);

  const wochensummen = [0, 1, 2, 3]
    .map((n) => posten.filter((x) => inWoche(x, woche(n))).reduce((s, x) => s + x.minuten, 0))
    .filter((m) => m > 0);
  const schnitt = wochensummen.length
    ? wochensummen.reduce((s, m) => s + m, 0) / wochensummen.length
    : 0;
  return {
    jeKategorie,
    summe,
    monatStunden: ((schnitt / 60) * 52) / 12,
    wochen: wochensummen.length,
  };
}

export function stundenText(minuten: number): string {
  return `${(minuten / 60).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Std.`;
}
