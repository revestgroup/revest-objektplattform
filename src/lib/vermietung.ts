/**
 * Mietgarantie.
 *
 * Revest verkauft keine nackten Wohnungen, sondern eine gesicherte Rendite:
 * Nach dem Verkauf garantiert Revest dem Käufer für eine feste Laufzeit eine
 * feste Kaltmiete — unabhängig davon, ob die Einheit gerade vermietet ist.
 *
 * Daraus ergeben sich zwei Fälle, die unterschiedlich verwaltet werden:
 *
 *   wohnung — ein Mietverhältnis, eine Miete. Steht die Wohnung leer, zahlt
 *             Revest die volle Garantie aus eigener Tasche.
 *   wg      — mehrere Zimmer, jedes einzeln vermietet. Die Garantie bezieht
 *             sich auf die Summe; ein leeres Zimmer reißt nur ein Loch,
 *             keinen Krater. Dafür ist die Verwaltung aufwendiger.
 *
 * Die eine Zahl, die zählt, ist die Deckung: Ist-Miete minus Garantiemiete.
 * Negativ heißt, Revest legt jeden Monat Geld drauf.
 */

export type Garantieart = "wohnung" | "wg";

export const GARANTIEARTEN: Record<Garantieart, { titel: string; kurz: string }> = {
  wohnung: { titel: "Wohnung", kurz: "WHG" },
  wg: { titel: "WG-Vermietung", kurz: "WG" },
};

export type Garantiestatus = "aktiv" | "auslaufend" | "beendet";

export const GARANTIESTATUS: Record<
  Garantiestatus,
  { titel: string; farbe: string; weich: string; tief: string }
> = {
  aktiv: { titel: "Aktiv", farbe: "#17935C", weich: "#DBF2E6", tief: "#0C5E3A" },
  auslaufend: { titel: "Läuft aus", farbe: "#E5A32E", weich: "#FBEBD1", tief: "#8A5A08" },
  beendet: { titel: "Beendet", farbe: "#A3ABB8", weich: "#EEF0F4", tief: "#525C6B" },
};

/** Ein einzelnes WG-Zimmer. Leer stehende Zimmer haben `mieter: null`. */
export interface Zimmer {
  id: string;
  bezeichnung: string;
  flaeche: number | null;
  /** Monatliche Kaltmiete laut Vertrag. */
  miete: number;
  mieter: string | null;
  einzugAm: string | null;
}

export interface Mietgarantie {
  id: string;
  /** Verknüpfung in den Bestand. Die Bezeichnung liegt redundant daneben,
   *  damit die Liste ohne Nachschlagen lesbar bleibt — und damit Garantien
   *  aus abgeschlossenen Projekten bestehen bleiben, wenn das Objekt nicht
   *  mehr in der Pipeline geführt wird. */
  objektId: string | null;
  einheitId: string | null;
  adresse: string;
  einheitTitel: string;

  art: Garantieart;

  /** Der Käufer, dem die Miete garantiert wird. */
  kaeufer: string;
  kaeuferKontakt: string | null;
  verkauftAm: string | null;
  verkaufspreis: number | null;

  beginn: string;
  laufzeitMonate: number;
  /** Monatlich garantierte Kaltmiete. Das ist die Verpflichtung. */
  garantiemiete: number;

  /** Nur bei `art: "wohnung"` — bei WG stehen die Werte in `zimmer`. */
  mieter: string | null;
  istMiete: number | null;

  /** Nur bei `art: "wg"`. */
  zimmer: Zimmer[];

  notiz: string | null;
}

/* ------------------------------------------------------------------ */
/* Abgeleitete Werte                                                    */
/* ------------------------------------------------------------------ */

export interface Garantiekennzahlen {
  /** Letzter Tag der Garantie, aus Beginn und Laufzeit gerechnet. */
  ende: Date;
  /** Volle Monate bis zum Ende. Negativ, wenn die Garantie vorbei ist. */
  restMonate: number;
  status: Garantiestatus;
  /** Tatsächlich eingehende Kaltmiete pro Monat. */
  istMiete: number;
  /** Ist minus Garantie. Negativ = Revest zahlt zu. */
  deckung: number;
  /** Belegte und gesamte Zimmer — bei Wohnungen 1 bzw. 0/1. */
  belegt: number;
  plaetze: number;
  /** Was bis zum Ende der Laufzeit noch garantiert ist. */
  restverpflichtung: number;
}

export function ende(g: Mietgarantie): Date {
  const d = new Date(g.beginn);
  d.setMonth(d.getMonth() + g.laufzeitMonate);
  return d;
}

/** Ist-Miete: bei der WG zählen nur belegte Zimmer. */
export function istMiete(g: Mietgarantie): number {
  if (g.art === "wg") {
    return g.zimmer.reduce((s, z) => s + (z.mieter ? z.miete : 0), 0);
  }
  return g.mieter ? (g.istMiete ?? 0) : 0;
}

export function berechneGarantie(g: Mietgarantie, heute = new Date()): Garantiekennzahlen {
  const bis = ende(g);
  const restMonate = Math.max(
    0,
    (bis.getFullYear() - heute.getFullYear()) * 12 + (bis.getMonth() - heute.getMonth()),
  );
  const vorbei = bis.getTime() <= heute.getTime();

  const ist = istMiete(g);
  const plaetze = g.art === "wg" ? g.zimmer.length : 1;
  const belegt = g.art === "wg" ? g.zimmer.filter((z) => z.mieter).length : g.mieter ? 1 : 0;

  return {
    ende: bis,
    restMonate,
    // Drei Monate Vorlauf: so lange braucht eine Nachvermietung in Ulm.
    status: vorbei ? "beendet" : restMonate <= 3 ? "auslaufend" : "aktiv",
    istMiete: ist,
    deckung: ist - g.garantiemiete,
    belegt,
    plaetze,
    restverpflichtung: vorbei ? 0 : restMonate * g.garantiemiete,
  };
}
