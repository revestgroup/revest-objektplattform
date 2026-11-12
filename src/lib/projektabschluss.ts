/**
 * Projektabschluss (SAMMLUNG 2): Verkaufsunterlagen für den Datenraum,
 * Nachkalkulation (Soll gegen Ist) und die Abschluss-Checkliste.
 *
 * Phase 2: Ist-Kosten kommen über das Objektkürzel aus Qonto, der Datenraum
 * wird im Drive freigegeben. Die Felder hier sind dafür schon da.
 */
import { berechneEtw, etwEingabe, type EtwVorgaben } from "./kalkulationEtw";
import { aufteilen, stichtagFuer } from "./nachberechnung";
import {
  berechneKennzahlen,
  berechneVerkaufsplan,
  liegtIn,
  type Dokument,
  type Objekt,
} from "./objekte";
import { sichtbareUmmeldungen } from "./ummeldungen";

const klein = (n: string) =>
  n.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");

/* ------------------------------------------------------------------ */
/* 24. Verkaufsunterlagen / Datenraum                                   */
/* ------------------------------------------------------------------ */

export const VERKAUFSUNTERLAGEN: { id: string; titel: string; muster: RegExp }[] = [
  { id: "lageplan", titel: "Lageplan", muster: /lageplan|kataster|flurkarte/ },
  {
    id: "plaene_alt",
    titel: "Ansichten / Schnitte / Grundrisse alt",
    muster: /ansicht|schnitt|grundriss.*alt|bestand/,
  },
  {
    id: "grundrisse_neu",
    titel: "Verkaufsgrundrisse neu",
    muster: /verkaufsgrundriss|grundriss.*neu/,
  },
  { id: "wohnflaeche_neu", titel: "Wohnflächenberechnung neu", muster: /wohnflaeche|wfl/ },
  { id: "versicherung", titel: "Wohngebäudeversicherung", muster: /versicherung/ },
  { id: "grundbuch", titel: "Grundbuchauszug (nach Eintragung)", muster: /grundbuch/ },
  { id: "umbauter_raum", titel: "Berechnung umbauter Raum", muster: /umbauter|kubatur/ },
  {
    id: "baubeschreibung",
    titel: "Baubeschreibung (bei Sanierungspaket)",
    muster: /baubeschreibung/,
  },
  { id: "energieausweis", titel: "Energieausweis", muster: /energieausweis/ },
  { id: "fotos", titel: "Profi-Objektfotos", muster: /foto|bild/ },
  { id: "wirtschaftsplan", titel: "Wirtschaftsplan", muster: /wirtschaftsplan/ },
  { id: "mietvertrag", titel: "Mietvertrag", muster: /mietvertrag/ },
  {
    id: "protokolle",
    titel: "Protokolle Eigentümerversammlungen",
    muster: /protokoll|eigentuemerversammlung/,
  },
];

export const DATENRAUM_ORDNER = "05_Verkauf/00_Vertrieb";

export type Datenraumstand = "liegt_vor" | "fehlt" | "entfaellt";

/** Datei je Unterlage: von Hand gewählt, sonst passend benannt — Vertriebsordner zuerst. */
export function datenraumDatei(o: Objekt, id: string): Dokument | null {
  const gesetzt = o.datenraum?.[id];
  if (gesetzt && gesetzt.dokumentId !== undefined)
    return o.dokumente.find((d) => d.id === gesetzt.dokumentId) ?? null;
  const u = VERKAUFSUNTERLAGEN.find((x) => x.id === id);
  if (!u) return null;
  const passend = o.dokumente.filter((d) => u.muster.test(klein(d.name)));
  return passend.find((d) => liegtIn(d.ordner, DATENRAUM_ORDNER)) ?? passend[0] ?? null;
}

export function datenraumStand(o: Objekt, id: string): Datenraumstand {
  if (o.datenraum?.[id]?.entfaellt) return "entfaellt";
  return datenraumDatei(o, id) ? "liegt_vor" : "fehlt";
}

export function datenraumVollstaendig(o: Objekt): {
  da: number;
  gesamt: number;
  vollstaendig: boolean;
} {
  const zaehlen = VERKAUFSUNTERLAGEN.filter((u) => datenraumStand(o, u.id) !== "entfaellt");
  const da = zaehlen.filter((u) => datenraumStand(o, u.id) === "liegt_vor").length;
  return { da, gesamt: zaehlen.length, vollstaendig: da === zaehlen.length };
}

/* ------------------------------------------------------------------ */
/* 25. Nachkalkulation                                                  */
/* ------------------------------------------------------------------ */

export type Kalkposition =
  "kaufpreis" | "nebenkosten" | "aufwertung" | "bewirtschaftung" | "finanzierung" | "vermarktung";

export const KALKPOSITIONEN: { id: Kalkposition; titel: string }[] = [
  { id: "kaufpreis", titel: "Kaufpreis" },
  { id: "nebenkosten", titel: "Ankaufsnebenkosten" },
  { id: "aufwertung", titel: "Aufwertung / Sanierung" },
  { id: "bewirtschaftung", titel: "Bewirtschaftung" },
  { id: "finanzierung", titel: "Finanzierung" },
  { id: "vermarktung", titel: "Vermarktung" },
];

export interface Nachkalkulation {
  /** Von Hand eingetragene Ist-Werte (Phase 2: aus Qonto). */
  ist?: Partial<Record<Kalkposition, number | null>>;
  /** Tatsächlicher Verkaufspreis, überschreibt die Summe der verkauften Einheiten. */
  verkaufspreis?: number | null;
}

export interface Soll {
  werte: Record<Kalkposition, number>;
  verkauf: number | null;
  quelle: string;
}

/** Soll aus der Kalkulation: ETW-Kalkulation (Mid-Case), sonst Verkaufsplanung/Kennzahlen. */
export function sollWerte(o: Objekt, vorgaben: EtwVorgaben): Soll {
  if (o.objektart === "etw" && o.kalkulationEtw) {
    const ein = etwEingabe(o, vorgaben);
    const e = berechneEtw(ein);
    return {
      werte: {
        kaufpreis: ein.kaufpreis,
        nebenkosten: e.ankaufsnebenkosten,
        aufwertung: e.aufwertung,
        bewirtschaftung: e.bewirtschaftung,
        finanzierung: e.finanzierungskosten,
        vermarktung: e.szenarien.mid.vermarktung,
      },
      verkauf: e.szenarien.mid.gesamtverkaufspreis,
      quelle: "Kalkulation ETW, Mid-Case",
    };
  }
  const k = berechneKennzahlen(o);
  const p = berechneVerkaufsplan(o, k);
  return {
    werte: {
      kaufpreis: o.kaufpreis ?? 0,
      nebenkosten: k.kaufnebenkosten ?? 0,
      aufwertung:
        k.sanierungGeplant > 0 ? k.sanierungGeplant : (o.verkaufsplan?.sanierungsschaetzung ?? 0),
      bewirtschaftung: 0,
      finanzierung: 0,
      vermarktung: p.provisionEuro,
    },
    // Ohne Verkaufsplanung: die Preisliste der Einheiten als Soll.
    verkauf:
      p.erloes > 0 ? p.erloes : o.einheiten.reduce((x, e) => x + (e.verkaufspreis ?? 0), 0) || null,
    quelle: p.erloes > 0 ? "Verkaufsplanung" : "Verkaufsplanung / Preisliste der Einheiten",
  };
}

/** Was sich als Ist schon aus der Plattform ergibt (Kaufpreis, Gewerke, Nachberechnung). */
export function istVorschlag(
  o: Objekt,
): Partial<Record<Kalkposition, number>> & { verkauf?: number } {
  const k = berechneKennzahlen(o);
  const revestNachberechnung = (o.nachberechnung ?? []).reduce((s, z) => {
    const a = aufteilen(z, stichtagFuer(o, z.einheitId));
    return a ? s + a.revest : s;
  }, 0);
  const verkauf = o.einheiten.reduce((s, e) => s + (e.verkauftAm ? (e.verkaufspreis ?? 0) : 0), 0);
  return {
    ...(o.kaufpreis !== null ? { kaufpreis: o.kaufpreis } : {}),
    ...(k.sanierungTatsaechlich > 0 ? { aufwertung: k.sanierungTatsaechlich } : {}),
    ...(revestNachberechnung > 0
      ? { bewirtschaftung: Math.round(revestNachberechnung * 100) / 100 }
      : {}),
    ...(verkauf > 0 ? { verkauf } : {}),
  };
}

export interface Nachkalkzeile {
  id: Kalkposition | "verkauf" | "gewinn";
  titel: string;
  soll: number | null;
  ist: number | null;
  abweichung: number | null;
  prozent: number | null;
}

/** Soll gegen Ist je Position, dazu Verkauf und Gewinn. */
export function nachkalkulation(
  o: Objekt,
  vorgaben: EtwVorgaben,
): {
  zeilen: Nachkalkzeile[];
  quelle: string;
  vollstaendig: boolean;
} {
  const soll = sollWerte(o, vorgaben);
  const vorschlag = istVorschlag(o);
  const gesetzt = o.nachkalkulation?.ist ?? {};
  const ist = (p: Kalkposition) => gesetzt[p] ?? vorschlag[p] ?? null;
  const zeile = (
    id: Nachkalkzeile["id"],
    titel: string,
    s: number | null,
    i: number | null,
  ): Nachkalkzeile => {
    const abweichung = s !== null && i !== null ? i - s : null;
    return {
      id,
      titel,
      soll: s,
      ist: i,
      abweichung,
      prozent: abweichung !== null && s ? (abweichung / s) * 100 : null,
    };
  };
  const kosten = KALKPOSITIONEN.map((p) => zeile(p.id, p.titel, soll.werte[p.id], ist(p.id)));
  const verkaufIst = o.nachkalkulation?.verkaufspreis ?? vorschlag.verkauf ?? null;
  const summe = (w: (z: Nachkalkzeile) => number | null) =>
    kosten.every((z) => w(z) !== null) ? kosten.reduce((s, z) => s + (w(z) ?? 0), 0) : null;
  const kostenSoll = summe((z) => z.soll);
  const kostenIst = summe((z) => z.ist);
  const gewinnSoll =
    soll.verkauf !== null && kostenSoll !== null ? soll.verkauf - kostenSoll : null;
  const gewinnIst = verkaufIst !== null && kostenIst !== null ? verkaufIst - kostenIst : null;
  return {
    zeilen: [
      ...kosten,
      zeile("verkauf", "Verkaufspreis", soll.verkauf, verkaufIst),
      zeile("gewinn", "Gewinn vor Steuer", gewinnSoll, gewinnIst),
    ],
    quelle: soll.quelle,
    vollstaendig: kostenIst !== null && verkaufIst !== null,
  };
}

/* ------------------------------------------------------------------ */
/* 26. Abschluss-Checkliste                                             */
/* ------------------------------------------------------------------ */

export interface Abschlusspunkt {
  id: string;
  titel: string;
  /** Erkennt die Plattform selbst, wann es erledigt ist? */
  automatisch?: (o: Objekt, vorgaben: EtwVorgaben) => boolean;
}

const hatDatei = (o: Objekt, muster: RegExp, ordner?: string) =>
  o.dokumente.some((d) => muster.test(klein(d.name)) && (!ordner || liegtIn(d.ordner, ordner)));

export const ABSCHLUSSPUNKTE: Abschlusspunkt[] = [
  {
    id: "kv",
    titel: "KV Verkauf ablegen",
    automatisch: (o) => hatDatei(o, /kaufvertrag|urkunde|\bkv\b/, "05_Verkauf/01_Notar"),
  },
  { id: "versicherung", titel: "Mitteilung an Versicherung" },
  {
    id: "protokoll",
    titel: "Übergabeprotokoll ablegen",
    automatisch: (o) => hatDatei(o, /uebergabeprotokoll|protokoll.*uebergabe/),
  },
  {
    id: "abmeldungen",
    titel: "Abmeldungen erledigt",
    automatisch: (o) => {
      const einheiten = o.einheiten.filter((e) => e.verkauftAm);
      if (!einheiten.length) return false;
      return einheiten.every((e) =>
        sichtbareUmmeldungen(o, "ab", e.id).every(
          (u) => u.status === "bestaetigt" || u.status === "entfaellt",
        ),
      );
    },
  },
  {
    id: "nachberechnung",
    titel: "Nachberechnung abgeschlossen",
    automatisch: (o) => {
      const z = (o.nachberechnung ?? []).filter((x) => x.seite === "verkauf");
      return z.length > 0 && z.every((x) => x.status === "erledigt");
    },
  },
  {
    id: "nachkalkulation",
    titel: "Nachkalkulation erstellt",
    automatisch: (o, v) => nachkalkulation(o, v).vollstaendig,
  },
  { id: "notar", titel: "Bestätigung Kaufpreiseingang an Notar" },
];

export interface Abschlussstand {
  punkte: { punkt: Abschlusspunkt; erledigt: boolean; automatisch: boolean; am: string | null }[];
  abgeschlossen: boolean;
  /** Spätester von Hand gesetzter Tag, wenn alles erledigt ist. */
  abgeschlossenAm: string | null;
}

export function abschlussstand(o: Objekt, vorgaben: EtwVorgaben): Abschlussstand {
  const punkte = ABSCHLUSSPUNKTE.map((p) => {
    const hand = o.abschluss?.[p.id]?.erledigtAm ?? null;
    const auto = p.automatisch?.(o, vorgaben) ?? false;
    return { punkt: p, erledigt: Boolean(hand) || auto, automatisch: auto && !hand, am: hand };
  });
  const abgeschlossen = punkte.every((p) => p.erledigt);
  const tage = punkte
    .map((p) => p.am)
    .filter((x): x is string => Boolean(x))
    .sort();
  return { punkte, abgeschlossen, abgeschlossenAm: abgeschlossen ? (tage.at(-1) ?? null) : null };
}
