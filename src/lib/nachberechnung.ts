/**
 * Nachberechnung (SAMMLUNG 8): Kostenabgrenzung zum Stichtag.
 *
 * Nach dem Verkauf kommen noch Rechnungen — Grundsteuer, Hausgeld,
 * Versicherung, Versorger. Ein Teil gehört dem Käufer. Je Rechnung eine Zeile
 * mit Zeitraum; die Plattform teilt taggenau: bis zum Tag vor dem Stichtag
 * Revest, ab dem Stichtag die Gegenseite. Beim Ankauf umgekehrt (bis zum
 * Stichtag der Verkäufer). Welche Kosten ab wann wer trägt, regelt der
 * Kaufvertrag — die Plattform übernimmt nur den Stichtag.
 *
 * Phase 2: `zahlungseingang`/`externeId` füllt die Qonto-Zuordnung über das
 * Kürzel im Verwendungszweck.
 */
import type { Objekt } from "./objekte";

export type Nachberechnungsart =
  | "grundsteuer"
  | "grundbesitzabgaben"
  | "hausgeld"
  | "hausgeldabrechnung"
  | "versicherung"
  | "versorger"
  | "schornsteinfeger"
  | "sonst";

export const NACHBERECHNUNGSARTEN: Record<Nachberechnungsart, string> = {
  grundsteuer: "Grundsteuer",
  grundbesitzabgaben: "Grundbesitzabgaben",
  hausgeld: "Hausgeld",
  hausgeldabrechnung: "Hausgeldabrechnung",
  versicherung: "Versicherung",
  versorger: "Versorger",
  schornsteinfeger: "Schornsteinfeger",
  sonst: "Sonstiges",
};

export type Nachberechnungsstatus = "offen" | "gemeldet" | "bezahlt" | "erledigt";
export const NACHBERECHNUNGSSTATUS: Record<Nachberechnungsstatus, string> = {
  offen: "offen",
  gemeldet: "gemeldet",
  bezahlt: "bezahlt",
  erledigt: "erledigt",
};

export interface Nachberechnungszeile {
  id: string;
  /** Ankauf: gegenüber dem Verkäufer. Verkauf: gegenüber dem Käufer einer Einheit. */
  seite: "ankauf" | "verkauf";
  einheitId: string | null;
  art: Nachberechnungsart;
  titel: string | null;
  /** Rechnungsbetrag gesamt. Null bei Platzhaltern, bis die Rechnung da ist. */
  betrag: number | null;
  von: string | null;
  bis: string | null;
  beleg: { name: string } | null;
  status: Nachberechnungsstatus;
  /** Sonderfall (z. B. Abrechnungsspitze): Revest-Anteil von Hand, Rest Gegenseite. */
  manuellRevest: number | null;
  /** Beim Verkauf automatisch angelegt — „was noch kommt“. */
  platzhalter?: boolean;
  abgerechnetAm?: string | null;
  /** Phase 2: Zahlungseingang aus Qonto. */
  zahlungseingang?: string | null;
  externeId?: string | null;
}

/* ------------------------------------------------------------------ */
/* Taggenaue Aufteilung                                                 */
/* ------------------------------------------------------------------ */

const TAG = 86_400_000;
const tagNr = (iso: string) =>
  Math.round(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / TAG);

export interface Aufteilung {
  revest: number;
  gegenseite: number;
  tageRevest: number;
  tageGesamt: number;
}

/**
 * Teilt den Betrag taggenau (von und bis eingeschlossen). Der Stichtag selbst
 * zählt zur neuen Seite: beim Verkauf zum Käufer, beim Ankauf zu Revest.
 * Gerundet wird der Revest-Anteil auf Cent, die Gegenseite ist der Rest —
 * so ergeben beide immer genau den Betrag.
 */
export function aufteilen(
  z: Pick<Nachberechnungszeile, "betrag" | "von" | "bis" | "seite" | "manuellRevest">,
  stichtag: string | null,
): Aufteilung | null {
  if (z.betrag === null) return null;
  if (z.manuellRevest !== null) {
    const revest = Math.round(z.manuellRevest * 100) / 100;
    return {
      revest,
      gegenseite: Math.round((z.betrag - revest) * 100) / 100,
      tageRevest: 0,
      tageGesamt: 0,
    };
  }
  if (!z.von || !z.bis || !stichtag) return null;
  const von = tagNr(z.von);
  const bis = tagNr(z.bis);
  const tageGesamt = bis - von + 1;
  if (tageGesamt <= 0) return null;
  // Tage vor dem Stichtag, auf den Zeitraum begrenzt.
  const vorher = Math.min(Math.max(tagNr(stichtag) - von, 0), tageGesamt);
  const tageRevest = z.seite === "verkauf" ? vorher : tageGesamt - vorher;
  const revest = Math.round(((z.betrag * tageRevest) / tageGesamt) * 100) / 100;
  return {
    revest,
    gegenseite: Math.round((z.betrag - revest) * 100) / 100,
    tageRevest,
    tageGesamt,
  };
}

/* ------------------------------------------------------------------ */
/* Stichtag, Platzhalter, Abschluss                                     */
/* ------------------------------------------------------------------ */

/** Ankauf: Besitzübergang. Verkauf: Übergabe der Einheit, sonst Verkaufstag. Überschreibbar. */
export function stichtagFuer(o: Objekt, einheitId: string | null): string | null {
  const schluessel = einheitId ?? "ankauf";
  const gesetzt = o.nachberechnungStichtag?.[schluessel];
  if (gesetzt) return gesetzt;
  if (!einheitId) return o.besitzuebergangAm ?? null;
  const e = o.einheiten.find((x) => x.id === einheitId);
  return e?.uebergabeAm ?? e?.verkauftAm ?? null;
}

/** Was nach einem Verkauf noch kommt — ohne Betrag, bis die Rechnung da ist. */
export function platzhalterFuer(einheitId: string, stichtag: string): Nachberechnungszeile[] {
  const jahr = +stichtag.slice(0, 4);
  const z = (
    art: Nachberechnungsart,
    titel: string,
    von: string | null,
    bis: string | null,
  ): Nachberechnungszeile => ({
    id: `nb-${einheitId}-${art}`,
    seite: "verkauf",
    einheitId,
    art,
    titel,
    betrag: null,
    von,
    bis,
    beleg: null,
    status: "offen",
    manuellRevest: null,
    platzhalter: true,
  });
  return [
    z("grundsteuer", `Grundsteuer ${jahr} bis Jahresende`, `${jahr}-01-01`, `${jahr}-12-31`),
    z(
      "hausgeldabrechnung",
      `Hausgeldabrechnung ${jahr} (kommt ${jahr + 1})`,
      `${jahr}-01-01`,
      `${jahr}-12-31`,
    ),
    z("versicherung", "Versicherung bis Umschreibung", `${jahr}-01-01`, `${jahr}-12-31`),
    z("versorger", "Versorger-Schlussrechnung", null, stichtag),
  ];
}

/** Platzhalter für eine verkaufte Einheit anlegen — nur einmal. */
export function mitPlatzhaltern(o: Objekt, einheitId: string): Objekt {
  const liste = o.nachberechnung ?? [];
  if (liste.some((z) => z.einheitId === einheitId)) return o;
  const tag = stichtagFuer(o, einheitId);
  if (!tag) return o;
  return { ...o, nachberechnung: [...liste, ...platzhalterFuer(einheitId, tag)] };
}

/** Verkauf zurückgenommen: unberührte Platzhalter verschwinden. */
export function ohnePlatzhalter(o: Objekt, einheitId: string): Objekt {
  const liste = o.nachberechnung ?? [];
  const neu = liste.filter(
    (z) =>
      !(z.einheitId === einheitId && z.platzhalter && z.betrag === null && z.status === "offen"),
  );
  return neu.length === liste.length ? o : { ...o, nachberechnung: neu };
}

/** Eine verkaufte Einheit ist abgeschlossen, wenn alle ihre Zeilen erledigt sind. */
export function abgeschlossen(o: Objekt, einheitId: string): boolean {
  const zeilen = (o.nachberechnung ?? []).filter((z) => z.einheitId === einheitId);
  return zeilen.length > 0 && zeilen.every((z) => z.status === "erledigt");
}

/** Summe der Käuferanteile, die noch nicht bezahlt oder erledigt sind. */
export function offeneKaeuferanteile(objekte: Objekt[]): { summe: number; objekte: Objekt[] } {
  let summe = 0;
  const betroffen: Objekt[] = [];
  for (const o of objekte) {
    let teil = 0;
    for (const z of o.nachberechnung ?? []) {
      if (z.seite !== "verkauf" || z.status === "bezahlt" || z.status === "erledigt") continue;
      const a = aufteilen(z, stichtagFuer(o, z.einheitId));
      if (a && a.gegenseite > 0) teil += a.gegenseite;
    }
    if (teil > 0) {
      summe += teil;
      betroffen.push(o);
    }
  }
  return { summe: Math.round(summe * 100) / 100, objekte: betroffen };
}

/**
 * Abgleich mit der Abwicklung (Block J): Sind alle Grundsteuer-Zeilen eines
 * Abschnitts erledigt, gilt „Grundsteuer anteilig abrechnen“ als bestätigt;
 * ebenso „Abrechnung Versicherung“.
 */
export function mitAbgleich(o: Objekt, heute = new Date().toISOString().slice(0, 10)): Objekt {
  const liste = o.ummeldungen ?? [];
  if (!liste.length) return o;
  let geaendert = false;
  const neu = liste.map((u) => {
    const arten =
      u.art === "grundsteuer_anteilig"
        ? ["grundsteuer", "grundbesitzabgaben"]
        : u.art === "versicherung_abrechnung"
          ? ["versicherung"]
          : null;
    if (!arten || u.status === "bestaetigt" || u.status === "entfaellt") return u;
    const seite = u.richtung === "an" ? "ankauf" : "verkauf";
    const zeilen = (o.nachberechnung ?? []).filter(
      (z) =>
        z.seite === seite &&
        (z.einheitId ?? null) === (u.einheitId ?? null) &&
        arten.includes(z.art),
    );
    if (!zeilen.length || !zeilen.every((z) => z.status === "erledigt")) return u;
    geaendert = true;
    return {
      ...u,
      status: "bestaetigt" as const,
      bestaetigtAm: heute,
      gemeldetAm: u.gemeldetAm ?? heute,
      notiz: u.notiz ?? "Über die Nachberechnung erledigt",
    };
  });
  return geaendert ? { ...o, ummeldungen: neu } : o;
}

/** Aufstellung für den Käufer: Zeilen, Summe, Text für Mail und Druck. */
export function abrechnungstext(
  o: Objekt,
  zeilen: Nachberechnungszeile[],
  bank: { iban: string; inhaber: string },
  absender: string,
): { summe: number; betreff: string; text: string } {
  const stichtag = zeilen[0] ? stichtagFuer(o, zeilen[0].einheitId) : null;
  const posten = zeilen.map((z) => {
    const a = aufteilen(z, stichtag)!;
    return { z, anteil: a.gegenseite, a };
  });
  const summe = Math.round(posten.reduce((s, p) => s + p.anteil, 0) * 100) / 100;
  const eur = (n: number) =>
    n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  const datum = (iso: string | null) => (iso ? iso.split("-").reverse().join(".") : "—");
  const kennung = o.kuerzel ? `[${o.kuerzel}] ` : "";
  const text = [
    "Guten Tag,",
    "",
    `zum Übergang am ${datum(stichtag)} rechnen wir die folgenden Kosten anteilig ab (${o.strasse}, ${o.plz} ${o.stadt}):`,
    "",
    ...posten.map(
      (p) =>
        `- ${p.z.titel ?? NACHBERECHNUNGSARTEN[p.z.art]} (${datum(p.z.von)}–${datum(p.z.bis)}): ${eur(p.z.betrag!)} gesamt, Ihr Anteil ${eur(p.anteil)}`,
    ),
    "",
    `Summe Ihres Anteils: ${eur(summe)}`,
    "",
    `Bitte überweisen Sie den Betrag innerhalb von 14 Tagen auf ${bank.inhaber || "unser Konto"}, IBAN ${bank.iban || "—"}, Verwendungszweck „${kennung}Nachberechnung“.`,
    "",
    "Viele Grüße",
    absender,
    "Revest Projekt GmbH",
  ].join("\n");
  return { summe, betreff: `${kennung}Nachberechnung ${o.strasse}`, text };
}
