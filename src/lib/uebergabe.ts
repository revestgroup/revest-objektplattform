/**
 * Übergabeprotokoll: Ankauf und Verkauf getrennt (SAMMLUNG 9).
 *
 * - Beim Verkauf werden Zähler (Art, Nummer, MaLo-ID) und Schlüssel aus dem
 *   Ankaufsprotokoll übernommen — nur Stände, Datum und Fotos sind neu.
 * - Die Zählerdaten erscheinen in den Ab-/Ummeldungen von Strom, Gas, Wasser.
 */
import type { Objekt, Uebergabeprotokoll, Zaehler, Zaehlerart } from "./objekte";
import type { Ummeldung } from "./ummeldungen";

let nr = 0;
const neueId = (p: string) => `${p}-${Date.now().toString(36)}-${(nr += 1)}`;

export function leeresProtokoll(
  richtung: "an" | "ab",
  einheitId: string | null,
): Uebergabeprotokoll {
  return {
    id: `ue-${richtung}-${einheitId ?? "objekt"}`,
    richtung,
    einheitId,
    pdf: null,
    anwesende: [],
    schluessel: [],
    maengel: [],
    bemerkungen: null,
  };
}

export function protokollVon(
  o: Objekt,
  richtung: "an" | "ab",
  einheitId: string | null,
): Uebergabeprotokoll {
  return (
    (o.uebergaben ?? []).find(
      (p) => p.richtung === richtung && (p.einheitId ?? null) === einheitId,
    ) ?? leeresProtokoll(richtung, einheitId)
  );
}

/** Protokoll ersetzen oder anlegen — gibt die neue Liste zurück. */
export function mitProtokoll(o: Objekt, p: Uebergabeprotokoll): Uebergabeprotokoll[] {
  const liste = o.uebergaben ?? [];
  return liste.some((x) => x.id === p.id)
    ? liste.map((x) => (x.id === p.id ? p : x))
    : [...liste, p];
}

/**
 * Vorlage für den Verkauf einer Einheit: Zähler und Schlüssel aus dem
 * Ankauf. Nummern und MaLo-IDs bleiben, Stände, Datum und Fotos sind leer.
 * Zähler, die die Einheit schon hat (gleiche Art und Nummer), kommen nicht doppelt.
 */
export function ausAnkaufUebernehmen(
  o: Objekt,
  einheitId: string,
): Pick<Objekt, "zaehler" | "uebergaben"> {
  const alle = o.zaehler ?? [];
  const vorhanden = alle.filter((z) => z.richtung === "ab" && z.einheitId === einheitId);
  const quelle = alle.filter(
    (z) => z.richtung === "an" && (z.einheitId === null || z.einheitId === einheitId),
  );
  const neu: Zaehler[] = quelle
    .filter((q) => !vorhanden.some((v) => v.art === q.art && v.nummer === q.nummer))
    .map((q) => ({
      ...q,
      id: neueId("z"),
      richtung: "ab",
      einheitId,
      stand: null,
      datum: null,
      foto: null,
    }));
  const ankauf = protokollVon(o, "an", null);
  const ziel = protokollVon(o, "ab", einheitId);
  const schluessel = [
    ...ziel.schluessel,
    ...ankauf.schluessel
      .filter((s) => !ziel.schluessel.some((x) => x.art === s.art))
      .map((s) => ({ ...s, id: neueId("s") })),
  ];
  return {
    zaehler: [...alle, ...neu],
    uebergaben: mitProtokoll(o, { ...ziel, schluessel }),
  };
}

const ZAEHLER_ZU_UMMELDUNG: Partial<Record<Ummeldung["art"], Zaehlerart[]>> = {
  strom: ["strom"],
  gas: ["gas"],
  wasser: ["wasser_kalt", "wasser_warm"],
};

/** Zähler aus dem Protokoll für eine Ab-/Ummeldung (Strom, Gas, Wasser). */
export function zaehlerFuer(o: Objekt, u: Ummeldung): Zaehler | null {
  const arten = ZAEHLER_ZU_UMMELDUNG[u.art];
  if (!arten) return null;
  return (
    (o.zaehler ?? []).find(
      (z) =>
        z.richtung === u.richtung &&
        (z.einheitId ?? null) === (u.einheitId ?? null) &&
        arten.includes(z.art),
    ) ?? null
  );
}

/** Hinweis zu einem Zähler — Stand 0, Nummer fehlt, MaLo-ID beim Strom fehlt. */
export function zaehlerHinweis(z: Zaehler): string | null {
  if (z.stand === "0") return "Stand 0 — bitte prüfen";
  if (!z.nummer) return "Zählernummer fehlt";
  if (z.art === "strom" && !z.maloId) return "MaLo-ID fehlt (Strom-Ummeldung braucht sie)";
  return null;
}
